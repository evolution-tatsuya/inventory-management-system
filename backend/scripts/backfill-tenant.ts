// ============================================================
// マルチテナント化 S1: 既定テナントへのバックフィル
// ============================================================
// 既定テナント(Tenant)を作成し、既存の全10テーブルの tenantId を埋める。
// Phase A(nullable tenantId追加)後に実行し、その後 Phase C(NOT NULL化)へ進む。
//
//   DATABASE_URL=... npx ts-node scripts/backfill-tenant.ts --name "GAINER" --slug "default" [--apply]
//
// - --apply なし = DRY-RUN（件数集計とadmin一覧のみ表示、書き込みなし）
// - 冪等: 既定Tenantは slug で再利用。各 updateMany は where:{tenantId:null} 限定で再実行可。
// - Neon対策: 巨大単一トランザクションを避け、Part/PartMaster はカーソルで500件チャンク更新。
// ============================================================
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function argVal(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

// 既存adminをmasterに昇格させる対象（テスト/本番のデフォルト管理者メール）
const MASTER_ADMIN_EMAIL = 'admin@inventory-system.local';
const CHUNK = 500;

// id昇順でカーソルページングしながら tenantId=null の行を chunk 更新する（Neonタイムアウト回避）
async function backfillLargeTable(
  model: 'part' | 'partMaster',
  tenantId: string,
): Promise<number> {
  const client: any = (prisma as any)[model];
  let updated = 0;
  // 未設定の行が無くなるまで、先頭 CHUNK 件の id を拾って updateMany を繰り返す
  // updateMany は where:{tenantId:null} 限定なので、更新済みは自然に対象外になり無限ループしない
  while (true) {
    const rows = await client.findMany({
      where: { tenantId: null },
      select: { id: true },
      take: CHUNK,
      orderBy: { id: 'asc' },
    });
    if (rows.length === 0) break;
    const ids = rows.map((r: { id: string }) => r.id);
    const res = await client.updateMany({
      where: { id: { in: ids }, tenantId: null },
      data: { tenantId },
    });
    updated += res.count;
    process.stdout.write(`\r  ${model}: ${updated} 件更新...`);
  }
  if (updated > 0) process.stdout.write('\n');
  return updated;
}

async function main() {
  const name = argVal('--name') || 'GAINER';
  const slug = argVal('--slug') || 'default';
  const apply = process.argv.includes('--apply');

  console.log(apply ? '=== APPLY ===' : '=== DRY-RUN (書き込みなし) ===');
  console.log(`既定テナント: name="${name}", slug="${slug}"\n`);

  // --- 現状の tenantId=null 件数を集計（全10テーブル） ---
  const nullCounts = {
    admins: await prisma.admin.count({ where: { tenantId: null } }),
    users: await prisma.user.count({ where: { tenantId: null } }),
    categories: await prisma.category.count({ where: { tenantId: null } }),
    genres: await prisma.genre.count({ where: { tenantId: null } }),
    units: await prisma.unit.count({ where: { tenantId: null } }),
    parts: await prisma.part.count({ where: { tenantId: null } }),
    part_masters: await prisma.partMaster.count({ where: { tenantId: null } }),
    diagram_images: await prisma.diagramImage.count({ where: { tenantId: null } }),
    system_settings: await prisma.systemSettings.count({ where: { tenantId: null } }),
    stock_count_logs: await prisma.stockCountLog.count({ where: { tenantId: null } }),
  };
  console.log('tenantId=null の件数（これらを既定テナントで埋める）:');
  console.table(nullCounts);

  // --- SystemSettings 単一性チェック（Phase Cの @@unique([tenantId]) のため） ---
  const settingsTotal = await prisma.systemSettings.count();
  console.log(`\nSystemSettings 総数: ${settingsTotal}`);
  if (settingsTotal > 1) {
    console.error(
      `⚠️  SystemSettings が ${settingsTotal} 件あります。テナントごと1レコード化(@@unique([tenantId]))できません。` +
        `\n   想定は1件（グローバル1レコード運用）。手動で確認・統合してから再実行してください。中断します。`,
    );
    await prisma.$disconnect();
    process.exit(1);
  }

  // --- admin 一覧（master昇格対象の確認） ---
  const admins = await prisma.admin.findMany({
    select: { id: true, email: true, role: true },
  });
  console.log('\n現在のadmin一覧:');
  console.table(admins);
  const masterTarget = admins.find((a) => a.email === MASTER_ADMIN_EMAIL);
  if (!masterTarget) {
    console.warn(
      `⚠️  master昇格対象 "${MASTER_ADMIN_EMAIL}" が見つかりません。` +
        `role=master への昇格はスキップされます（上の一覧から正しいメールを確認してください）。`,
    );
  }

  if (!apply) {
    console.log('\n--apply を付けると上記を実際に書き込みます。DRY-RUN終了。');
    await prisma.$disconnect();
    return;
  }

  // ===== ここから書き込み（--apply） =====

  // 1) 既定テナントを取得 or 作成（冪等）。stockMode は現行 SystemSettings の実値を写す
  let tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    const currentStockMode =
      (await prisma.systemSettings.findFirst())?.stockMode || 'shared';
    tenant = await prisma.tenant.create({
      data: { name, slug, status: 'active', stockMode: currentStockMode },
    });
    console.log(
      `\n✅ 既定テナント作成: id=${tenant.id}, slug=${slug}, stockMode=${currentStockMode}`,
    );
  } else {
    console.log(`\n♻️  既定テナント再利用: id=${tenant.id}, slug=${slug}`);
  }
  const tenantId = tenant.id;

  // 2) SystemSettings を埋める（0件なら既定用に1件作成）
  if (settingsTotal === 0) {
    await prisma.systemSettings.create({ data: { tenantId } });
    console.log('✅ SystemSettings が0件だったため既定レコードを1件作成');
  } else {
    const r = await prisma.systemSettings.updateMany({
      where: { tenantId: null },
      data: { tenantId },
    });
    console.log(`✅ system_settings: ${r.count} 件更新`);
  }

  // 3) 少量テーブルは単発 updateMany
  const simple: Array<[string, () => Promise<{ count: number }>]> = [
    ['admins', () => prisma.admin.updateMany({ where: { tenantId: null }, data: { tenantId } })],
    ['users', () => prisma.user.updateMany({ where: { tenantId: null }, data: { tenantId } })],
    ['categories', () => prisma.category.updateMany({ where: { tenantId: null }, data: { tenantId } })],
    ['genres', () => prisma.genre.updateMany({ where: { tenantId: null }, data: { tenantId } })],
    ['units', () => prisma.unit.updateMany({ where: { tenantId: null }, data: { tenantId } })],
    ['diagram_images', () => prisma.diagramImage.updateMany({ where: { tenantId: null }, data: { tenantId } })],
    ['stock_count_logs', () => prisma.stockCountLog.updateMany({ where: { tenantId: null }, data: { tenantId } })],
  ];
  for (const [label, fn] of simple) {
    const r = await fn();
    console.log(`✅ ${label}: ${r.count} 件更新`);
  }

  // 4) 大量テーブルはチャンク更新（Neonタイムアウト回避）
  const partsUpdated = await backfillLargeTable('part', tenantId);
  console.log(`✅ parts: ${partsUpdated} 件更新`);
  const pmUpdated = await backfillLargeTable('partMaster', tenantId);
  console.log(`✅ part_masters: ${pmUpdated} 件更新`);

  // 5) 既存adminを role=master に昇格
  if (masterTarget) {
    await prisma.admin.update({
      where: { id: masterTarget.id },
      data: { role: 'master' },
    });
    console.log(`✅ admin "${MASTER_ADMIN_EMAIL}" を role=master に昇格`);
  }

  // 6) 残NULL件数の再集計（すべて0であるべき）
  const remain = {
    admins: await prisma.admin.count({ where: { tenantId: null } }),
    users: await prisma.user.count({ where: { tenantId: null } }),
    categories: await prisma.category.count({ where: { tenantId: null } }),
    genres: await prisma.genre.count({ where: { tenantId: null } }),
    units: await prisma.unit.count({ where: { tenantId: null } }),
    parts: await prisma.part.count({ where: { tenantId: null } }),
    part_masters: await prisma.partMaster.count({ where: { tenantId: null } }),
    diagram_images: await prisma.diagramImage.count({ where: { tenantId: null } }),
    system_settings: await prisma.systemSettings.count({ where: { tenantId: null } }),
    stock_count_logs: await prisma.stockCountLog.count({ where: { tenantId: null } }),
  };
  console.log('\n=== 残 tenantId=null 件数（すべて0であるべき） ===');
  console.table(remain);
  const totalRemain = Object.values(remain).reduce((a, b) => a + b, 0);
  if (totalRemain === 0) {
    console.log('🎉 全行に既定テナントの tenantId を付与しました。Phase C(NOT NULL化)へ進めます。');
  } else {
    console.error(`⚠️  未設定が ${totalRemain} 件残っています。再実行するか原因を確認してください。`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
