// default テナントの全カテゴリーを「既存の」テナントへ複製する（本番運用用の一回スクリプト）
//   DATABASE_URL=... npx ts-node scripts/clone-into-existing-tenant.ts --target-slug "gainer-parts-list"
// 対象テナントは事前に作成・有効化済みで、カテゴリーが空であること（安全のためチェックする）。
import { PrismaClient } from '@prisma/client';
import { tenantService } from '../src/services/tenantService';

const prisma = new PrismaClient();

function argVal(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const targetSlug = argVal('--target-slug');
  if (!targetSlug) throw new Error('--target-slug は必須です');
  if (targetSlug === 'default') throw new Error('default には複製できません');

  // 複製先テナント（既存）
  const target = await prisma.tenant.findUnique({ where: { slug: targetSlug } });
  if (!target) throw new Error(`複製先テナントが見つかりません: ${targetSlug}`);

  // 安全ガード: 複製先が空であること（既存データへの二重複製を防ぐ）
  const existingCats = await prisma.category.count({ where: { tenantId: target.id } });
  if (existingCats > 0) {
    throw new Error(`複製先 ${targetSlug} は既に ${existingCats} 件のカテゴリーを持っています。空のテナントにのみ複製できます。`);
  }

  // 複製先の在庫モード（SystemSettingsが正）
  const ss = await prisma.systemSettings.findFirst({ where: { tenantId: target.id } });
  const stockMode = (ss?.stockMode as 'shared' | 'perCategory') || 'perCategory';
  console.log(`複製先: slug=${target.slug}, id=${target.id}, stockMode=${stockMode}`);

  // 複製元 default の全カテゴリー
  const src = await prisma.tenant.findUnique({ where: { slug: 'default' } });
  if (!src) throw new Error('default テナントが見つかりません');
  const cats = await prisma.category.findMany({
    where: { tenantId: src.id },
    select: { id: true, name: true },
    orderBy: { order: 'asc' },
  });
  console.log(`複製元 default のカテゴリー: ${cats.length}件`);

  // 順次複製
  let totalParts = 0;
  for (let i = 0; i < cats.length; i++) {
    const c = cats[i];
    process.stdout.write(`  複製 ${i + 1}/${cats.length}: ${c.name} ...`);
    const r = await tenantService.cloneCategoryInto(target.id, c.id, stockMode);
    totalParts += r.parts;
    console.log(` done (${r.parts} parts)`);
  }

  // 結果サマリー
  const counts = {
    categories: await prisma.category.count({ where: { tenantId: target.id } }),
    genres: await prisma.genre.count({ where: { tenantId: target.id } }),
    units: await prisma.unit.count({ where: { tenantId: target.id } }),
    parts: await prisma.part.count({ where: { tenantId: target.id } }),
  };
  console.log('=== 複製完了 ===');
  console.log(JSON.stringify({ slug: target.slug, insertedParts: totalParts, ...counts }, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
