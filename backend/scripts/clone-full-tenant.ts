// default テナントの全カテゴリーを複製した新テナントを作成する（本番運用用の一回スクリプト）
//   DATABASE_URL=... npx ts-node scripts/clone-full-tenant.ts --name "名前" --slug "スラッグ"
import { PrismaClient } from '@prisma/client';
import { tenantService } from '../src/services/tenantService';

const prisma = new PrismaClient();

function argVal(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const name = argVal('--name') || 'コピー';
  const slug = argVal('--slug') || 'copy';

  // 既定テナント(default)を複製元にする
  const src = await prisma.tenant.findUnique({ where: { slug: 'default' } });
  if (!src) throw new Error('default テナントが見つかりません');

  const cats = await prisma.category.findMany({
    where: { tenantId: src.id },
    select: { id: true, name: true },
    orderBy: { order: 'asc' },
  });
  console.log(`複製元 default のカテゴリー: ${cats.length}件`);

  // 1) 空テナントを発行（最初のカテゴリーを複製元に指定）
  const first = cats[0];
  console.log(`テナント発行 + 1件目複製: ${first.name}`);
  const { tenant } = await tenantService.createTenant({
    name,
    slug,
    stockMode: 'perCategory',
    sourceCategoryId: first.id,
  });
  console.log(`✅ テナント作成: slug=${tenant.slug}, key=${tenant.licenseKey}`);

  // 2) 残りのカテゴリーを順次複製
  for (let i = 1; i < cats.length; i++) {
    const c = cats[i];
    process.stdout.write(`  複製 ${i + 1}/${cats.length}: ${c.name} ...`);
    const r = await tenantService.cloneCategoryInto(tenant.id, c.id, 'perCategory');
    console.log(` done (${r.parts} parts)`);
  }

  // 3) 結果サマリー
  const counts = {
    categories: await prisma.category.count({ where: { tenantId: tenant.id } }),
    genres: await prisma.genre.count({ where: { tenantId: tenant.id } }),
    units: await prisma.unit.count({ where: { tenantId: tenant.id } }),
    parts: await prisma.part.count({ where: { tenantId: tenant.id } }),
  };
  console.log('=== 複製完了 ===');
  console.log(JSON.stringify({ slug: tenant.slug, licenseKey: tenant.licenseKey, ...counts }, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
