// ELECTRICAL 49ユニットを「非トランザクション・1クエリずつ逐次」で対象DBへ冪等同期。
// Neon切断(P1017/P2028)に強い。既に正しい部品数のユニットはスキップ。
// 各クエリはリトライ付き(接続断で最大5回)。
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();
const SC = '/private/tmp/claude-501/-Users-gainertatsuya-Downloads-----/0523a2fa-5000-4b96-a4c6-0f46441a9469/scratchpad';

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  for (let i = 0; i < 6; i++) {
    try {
      return await fn();
    } catch (e: any) {
      const code = e.code || '';
      if (['P1017', 'P2028', 'P1001'].includes(code) && i < 5) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      throw e;
    }
  }
  throw new Error(`retry exhausted: ${label}`);
}

async function main() {
  const data = JSON.parse(fs.readFileSync(`${SC}/elec-final.json`, 'utf8'));
  const units = data.units;

  const category = await withRetry(() => prisma.category.findFirst({ where: { name: data.categoryName } }), 'cat');
  if (!category) throw new Error('ABA-FK2 not found');

  const genres = await withRetry(() => prisma.genre.findMany({ where: { categoryId: category.id } }), 'genres');
  const genreId: Record<string, string> = {};
  for (const g of genres) genreId[g.name] = g.id;

  let done = 0;
  for (let ui = 0; ui < units.length; ui++) {
    const u = units[ui];
    const gId = genreId[u.genre];
    if (!gId) { console.log(`ジャンル未作成: ${u.genre}`); continue; }

    const exist = await withRetry(
      () => prisma.unit.findFirst({ where: { genreId: gId, unitNumber: u.code }, include: { _count: { select: { parts: true, diagramImage: true } } } }),
      `find ${u.code}`,
    );
    if (exist && exist._count.parts === u.parts.length && exist._count.diagramImage === (u.diagramUrl ? 1 : 0)) {
      done++; continue;
    }
    // 不完全なら作り直し: 既存を削除(非トランザクション)
    const dups = await withRetry(() => prisma.unit.findMany({ where: { genreId: gId, unitNumber: u.code }, select: { id: true } }), `dups ${u.code}`);
    for (const d of dups) await withRetry(() => prisma.unit.delete({ where: { id: d.id } }), `del ${d.id}`);

    const unit = await withRetry(
      () => prisma.unit.create({ data: { genreId: gId, unitNumber: u.code, unitName: u.unitName, sortOrder: ui, partsCount: u.parts.length } }),
      `unit ${u.code}`,
    );
    if (u.diagramUrl) {
      await withRetry(() => prisma.diagramImage.create({ data: { unitId: unit.id, imageUrl: u.diagramUrl, imageType: 'diagram', isMain: true, sortOrder: 0 } }), `diag ${u.code}`);
    }
    for (const p of u.parts) {
      const master = await withRetry(() => prisma.partMaster.findUnique({ where: { categoryId_partNumber: { categoryId: category.id, partNumber: p.pn } } }), `pm ${p.pn}`);
      if (!master) await withRetry(() => prisma.partMaster.create({ data: { categoryId: category.id, partNumber: p.pn, stockQuantity: 0 } }), `pmc ${p.pn}`);
      await withRetry(
        () => prisma.part.create({
          data: { genreId: gId, unitId: unit.id, unitNumber: p.ref, partNumber: p.pn, partName: p.name, quantity: 1, currency: 'EUR', originalPrice: p.eur ?? undefined, sortOrder: p.sortOrder },
        }),
        `part ${p.pn}`,
      );
    }
    done++;
    console.log(`  ✓ ${u.code} ${u.unitName} parts=${u.parts.length}`);
  }
  console.log(`\n✅ 同期完了: ${done}/${units.length}`);
}

main().catch((e) => { console.error('FATAL', e.code || e.message); process.exit(1); }).finally(() => prisma.$disconnect());
