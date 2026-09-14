// ============================================================
// GT3-049 重複ユニット（同一ジャンル+同一名）を1つに統合するスクリプト
// ============================================================
// 取り込み時に同名ユニットが二重登録された分を解消。
// 各重複グループで「パーツ数が多い方」を残し、他は削除（パーツはCascade）。
// パーツ数が同じなら先に作られた方を残す。
//
//   DATABASE_URL=... npx ts-node scripts/dedupe-gt3-units.ts --dry-run|--apply
// ============================================================
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const apply = process.argv.includes('--apply');
  console.log(apply ? '=== APPLY ===' : '=== DRY-RUN ===');
  const category = await prisma.category.findFirst({ where: { name: 'GT3-049' } });
  if (!category) throw new Error('no category');

  const units = await prisma.unit.findMany({
    where: { genre: { categoryId: category.id } },
    include: { genre: true, parts: true },
  });
  // group by genre||name
  const groups = new Map<string, typeof units>();
  for (const u of units) {
    const k = `${u.genre.name}||${u.unitName}`;
    if (!groups.has(k)) groups.set(k, [] as any);
    groups.get(k)!.push(u);
  }
  const toDelete: typeof units = [] as any;
  for (const [k, list] of groups) {
    if (list.length <= 1) continue;
    // 残す: パーツ数最大 → 同数ならcreatedAt昇順で先頭
    const sorted = [...list].sort(
      (a, b) => b.parts.length - a.parts.length || a.createdAt.getTime() - b.createdAt.getTime(),
    );
    const keep = sorted[0];
    const dels = sorted.slice(1);
    console.log(`[DUP] ${k}: ${list.length}個 → 残す(${keep.parts.length}件) / 削除${dels.length}個(${dels.map((d) => d.parts.length + '件').join(',')})`);
    toDelete.push(...dels);
  }
  console.log(`削除対象ユニット: ${toDelete.length}`);
  if (!apply) { await prisma.$disconnect(); return; }
  for (const u of toDelete) {
    await prisma.unit.delete({ where: { id: u.id } });
    console.log(`  ✅ DEL ${u.genre.name}/${u.unitName} (${u.parts.length}件)`);
  }
  await prisma.$disconnect();
  console.log('=== 完了 ===');
}
main().catch((e) => { console.error(e); process.exit(1); });
