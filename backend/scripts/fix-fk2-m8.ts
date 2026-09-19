// M8 DIFFERENTIAL GEAR だけを非トランザクションで確実に投入する(Neon切断対策)。
// 既存M8を削除してから、1クエリずつ逐次でパーツを作成。失敗しても再実行で続きから埋める。
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();
const SC = '/private/tmp/claude-501/-Users-gainertatsuya-Downloads-----/0523a2fa-5000-4b96-a4c6-0f46441a9469/scratchpad';

async function main() {
  const data = JSON.parse(fs.readFileSync(`${SC}/trans-export.json`, 'utf8'));
  const u = data.units.find((x: any) => x.unitNumber === 'M8');
  if (!u) throw new Error('M8 not found in export');

  const category = await prisma.category.findFirst({ where: { name: 'ABA-FK2' } });
  if (!category) throw new Error('ABA-FK2 not found');
  const genre = await prisma.genre.findFirst({ where: { categoryId: category.id, name: u.genre } });
  if (!genre) throw new Error(`genre ${u.genre} not found`);

  // 既存M8ユニットを削除(パーツ・展開図もカスケード)
  const dups = await prisma.unit.findMany({ where: { genreId: genre.id, unitNumber: 'M8' }, select: { id: true } });
  if (dups.length) {
    await prisma.unit.deleteMany({ where: { id: { in: dups.map((d) => d.id) } } });
    console.log(`既存M8を削除(${dups.length})`);
  }

  const unit = await prisma.unit.create({
    data: { genreId: genre.id, unitNumber: 'M8', unitName: u.unitName, sortOrder: u.sortOrder, partsCount: u.parts.length },
  });
  console.log('M8ユニット作成');

  if (u.diagramUrl) {
    await prisma.diagramImage.create({ data: { unitId: unit.id, imageUrl: u.diagramUrl, imageType: 'diagram', isMain: true, sortOrder: 0 } });
    console.log('展開図作成');
  }

  let n = 0;
  for (const p of u.parts) {
    const master = await prisma.partMaster.findUnique({ where: { categoryId_partNumber: { categoryId: category.id, partNumber: p.pn } } });
    if (!master) await prisma.partMaster.create({ data: { categoryId: category.id, partNumber: p.pn, stockQuantity: 0 } });
    await prisma.part.create({
      data: {
        genreId: genre.id, unitId: unit.id, unitNumber: p.ref, partNumber: p.pn, partName: p.name,
        quantity: 1, currency: 'EUR', originalPrice: p.eur ?? undefined, sortOrder: p.sortOrder,
      },
    });
    n++;
    if (n % 10 === 0) console.log(`  parts ${n}/${u.parts.length}`);
  }
  console.log(`\n✅ M8 完了: parts=${n}`);
}

main().catch((e) => { console.error('ERR', e.code || e.message); process.exit(1); }).finally(() => prisma.$disconnect());
