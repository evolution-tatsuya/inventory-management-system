// FK2 数量更新: qty.json({code:{連結品番:数量}}) を読み、ABA-FK2の該当partのquantityをUPDATE。
// 品番はハイフン有無を無視して連結比較。マップに無い品番(在庫なし品等)は据え置き(変更なし)。
// unitNumber(code)でユニットを特定し、そのユニット内のpartのみ対象。
// 使い方: ts-node fk2-update-qty.ts <qty.json絶対パス>
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();
const cat = (s: string) => s.replace(/-/g, '');

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let i = 0; i < 6; i++) {
    try { return await fn(); }
    catch (e: any) {
      if (['P1017', 'P2028', 'P1001'].includes(e.code || '') && i < 5) {
        await new Promise((r) => setTimeout(r, 2000)); continue;
      }
      throw e;
    }
  }
  throw new Error('retry exhausted');
}

async function main() {
  const qtyPath = process.argv[2];
  const data: Record<string, Record<string, number>> = JSON.parse(fs.readFileSync(qtyPath, 'utf8'));

  // 第2引数に categoryId を渡せる(同名 LH/RH の取り違え防止)。無ければ名前でLHを掴む。
  const catId = process.argv[3];
  const category = catId
    ? await withRetry(() => prisma.category.findUnique({ where: { id: catId } }))
    : await withRetry(() => prisma.category.findFirst({ where: { name: 'ABA-FK2' } }));
  if (!category) throw new Error('category not found');

  let updated = 0, unchanged = 0, missUnit = 0;
  for (const [code, pnMap] of Object.entries(data)) {
    // 連結品番→数量 の逆引き(この数量マップ)
    const units = await withRetry(() => prisma.unit.findMany({
      where: { unitNumber: code, genre: { categoryId: category.id } },
      include: { parts: true },
    }));
    if (!units.length) { missUnit++; continue; }
    for (const u of units) {
      for (const p of u.parts) {
        const q = pnMap[cat(p.partNumber)];
        if (q === undefined) { unchanged++; continue; }
        if (p.quantity === q) { unchanged++; continue; }
        await withRetry(() => prisma.part.update({ where: { id: p.id }, data: { quantity: q } }));
        updated++;
      }
    }
  }
  console.log(`✅ 数量更新: 更新${updated} / 据え置き${unchanged} / ユニット未検出${missUnit}`);
}

main().catch((e) => { console.error('FATAL', e.code || e.message); process.exit(1); }).finally(() => prisma.$disconnect());
