// 汎用: 指定JSON(diagramUrl付き)のユニットを対象DBへ非トランザクション冪等同期。
// Neon切断に強い(各クエリ最大6回リトライ)。既に正しい部品数+展開図数のユニットはスキップ。
// 使い方: ts-node fk2-sync-generic.ts <final.json絶対パス>
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let i = 0; i < 6; i++) {
    try { return await fn(); }
    catch (e: any) {
      if (['P1017', 'P2028', 'P1001'].includes(e.code || '') && i < 5) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      throw e;
    }
  }
  throw new Error('retry exhausted');
}

async function main() {
  const jsonPath = process.argv[2];
  if (!jsonPath) throw new Error('usage: <json>');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const units = data.units;

  // categoryId は 第2引数 > JSON内 の順で優先(同名 LH/RH の取り違え防止, 開発/本番でid異なる)
  const catId = process.argv[3] || data.categoryId;
  const category = catId
    ? await withRetry(() => prisma.category.findUnique({ where: { id: catId } }))
    : await withRetry(() => prisma.category.findFirst({ where: { name: data.categoryName } }));
  if (!category) throw new Error(`category ${catId || data.categoryName} not found`);

  // ジャンル登場順で用意
  const genreOrder: string[] = [];
  for (const u of units) if (!genreOrder.includes(u.genre)) genreOrder.push(u.genre);
  const existing = await withRetry(() => prisma.genre.findMany({ where: { categoryId: category.id } }));
  const genreId: Record<string, string> = {};
  for (const g of existing) genreId[g.name] = g.id;
  let nextOrder = existing.reduce((m, g) => Math.max(m, g.order ?? 0), -1) + 1;
  for (const gName of genreOrder) {
    if (genreId[gName]) continue;
    const g = await withRetry(() => prisma.genre.create({ data: { categoryId: category.id, name: gName, order: nextOrder++ } }));
    genreId[gName] = g.id;
    console.log(`ジャンル作成: ${gName}`);
  }

  let done = 0;
  for (let ui = 0; ui < units.length; ui++) {
    const u = units[ui];
    const gId = genreId[u.genre];
    const exist = await withRetry(() => prisma.unit.findFirst({ where: { genreId: gId, unitNumber: u.code }, include: { _count: { select: { parts: true, diagramImage: true } } } }));
    if (exist && exist._count.parts === u.parts.length && exist._count.diagramImage === (u.diagramUrl ? 1 : 0)) { done++; continue; }
    const dups = await withRetry(() => prisma.unit.findMany({ where: { genreId: gId, unitNumber: u.code }, select: { id: true } }));
    for (const d of dups) await withRetry(() => prisma.unit.delete({ where: { id: d.id } }));

    const unit = await withRetry(() => prisma.unit.create({ data: { genreId: gId, unitNumber: u.code, unitName: u.unitName, sortOrder: ui, partsCount: u.parts.length } }));
    if (u.diagramUrl) await withRetry(() => prisma.diagramImage.create({ data: { unitId: unit.id, imageUrl: u.diagramUrl, imageType: 'diagram', isMain: true, sortOrder: 0 } }));
    for (const p of u.parts) {
      const master = await withRetry(() => prisma.partMaster.findUnique({ where: { categoryId_partNumber: { categoryId: category.id, partNumber: p.pn } } }));
      if (!master) await withRetry(() => prisma.partMaster.create({ data: { categoryId: category.id, partNumber: p.pn, stockQuantity: 0 } }));
      await withRetry(() => prisma.part.create({ data: { genreId: gId, unitId: unit.id, unitNumber: p.ref, partNumber: p.pn, partName: p.name, quantity: p.qty ?? 1, currency: 'EUR', originalPrice: p.eur ?? undefined, sortOrder: p.sortOrder } }));
    }
    done++;
    console.log(`  ✓ ${u.code} ${u.unitName} (${u.genre}) parts=${u.parts.length}`);
  }
  console.log(`\n✅ 同期完了: ${done}/${units.length}`);
}
main().catch((e) => { console.error('FATAL', e.code || e.message); process.exit(1); }).finally(() => prisma.$disconnect());
