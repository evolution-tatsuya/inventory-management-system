// FK2 PDFベース投入: ABA-FK2 を「エンジンのみ」で作り直す。
// - GT3体系ジャンル(機能別)
// - 474部品(EUR建て)、旧品番は備考に「（旧品番：XXX）」
// - 各ユニットに展開図(Cloudinary URL)を登録
// 実行前に ABA-FK2 配下(genre/unit/part/diagram)と partMaster を全削除して作り直す。
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();
const SC = '/private/tmp/claude-501/-Users-gainertatsuya-Downloads-----/bbdfa00c-ab9b-4580-ae14-4de1386747fa/scratchpad';

interface P { refNo: string; partNumber: string; partName: string; priceEur: number | null; oldNumbers: string[]; }
interface U { pdf: string; code: string; parts: P[]; diagramUrl?: string; }

async function main() {
  const data: U[] = JSON.parse(fs.readFileSync(`${SC}/fk2-final.json`, 'utf8')).filter((u: U) => u.code);
  const genreMap: Record<string, string> = JSON.parse(fs.readFileSync(`${SC}/genre-map.json`, 'utf8'));
  // ユニット表示名（unitTitle）を HTML由来データから借用（コード→タイトル）
  const htmlUnits = JSON.parse(fs.readFileSync(`${SC}/fk2-parsed.json`, 'utf8'));
  const titleByCode: Record<string, string> = {};
  for (const u of htmlUnits) if (u.code && u.unitTitle) titleByCode[u.code] = u.unitTitle;
  // 予備: fk2-units.json の name
  const listUnits = JSON.parse(fs.readFileSync(`${SC}/fk2-units.json`, 'utf8'));
  const nameByCode: Record<string, string> = {};
  for (const u of listUnits) nameByCode[u.code] = u.name;

  let category = await prisma.category.findFirst({ where: { name: 'ABA-FK2' } });
  if (!category) {
    category = await prisma.category.create({ data: { name: 'ABA-FK2', subtitle: 'Honda Civic Type R (FK2)', order: 1 } });
  }

  // 既存配下を全削除
  await prisma.genre.deleteMany({ where: { categoryId: category.id } });
  await prisma.partMaster.deleteMany({ where: { categoryId: category.id } });
  console.log('既存ABA-FK2配下を削除');

  // ジャンル登場順（PDFデータの並び順で初出順）
  const genreOrder: string[] = [];
  for (const u of data) {
    const g = genreMap[u.code];
    if (g && !genreOrder.includes(g)) genreOrder.push(g);
  }
  const genreId: Record<string, string> = {};
  for (let i = 0; i < genreOrder.length; i++) {
    const g = await prisma.genre.create({ data: { categoryId: category.id, name: genreOrder[i], order: i } });
    genreId[genreOrder[i]] = g.id;
  }
  console.log(`ジャンル ${genreOrder.length}件作成`);

  let unitCount = 0, partCount = 0, oldCount = 0, diagCount = 0;
  const masterDone = new Set<string>();

  for (let ui = 0; ui < data.length; ui++) {
    const u = data[ui];
    const gName = genreMap[u.code];
    const gId = genreId[gName];
    const unitName = titleByCode[u.code] || nameByCode[u.code] || u.code;

    const unit = await prisma.unit.create({
      data: { genreId: gId, unitNumber: u.code, unitName, sortOrder: ui, partsCount: u.parts.length },
    });
    unitCount++;

    // 展開図
    if (u.diagramUrl) {
      await prisma.diagramImage.create({
        data: { unitId: unit.id, imageUrl: u.diagramUrl, imageType: 'diagram', isMain: true, sortOrder: 0 },
      });
      diagCount++;
    }

    for (let pi = 0; pi < u.parts.length; pi++) {
      const p = u.parts[pi];
      if (!masterDone.has(p.partNumber)) {
        await prisma.partMaster.upsert({
          where: { categoryId_partNumber: { categoryId: category.id, partNumber: p.partNumber } },
          update: {},
          create: { categoryId: category.id, partNumber: p.partNumber, stockQuantity: 0 },
        });
        masterDone.add(p.partNumber);
      }
      // 旧品番があれば備考に付与
      let notes: string | undefined;
      if (p.oldNumbers && p.oldNumbers.length) {
        notes = `（旧品番：${p.oldNumbers.join('、')}）`;
        oldCount++;
      }
      await prisma.part.create({
        data: {
          genreId: gId,
          unitId: unit.id,
          unitNumber: p.refNo || String(pi + 1),
          partNumber: p.partNumber,
          partName: p.partName,
          quantity: 1,
          currency: 'EUR',
          originalPrice: p.priceEur ?? undefined,
          notes,
          sortOrder: pi,
        },
      });
      partCount++;
    }
  }

  console.log(`\n✅ 投入完了: ジャンル${genreOrder.length} / ユニット${unitCount} / 部品${partCount} / 旧品番備考${oldCount} / 展開図${diagCount}`);
  console.log(`   category=${category.id}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
