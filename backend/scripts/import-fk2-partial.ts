// FK2（ABA-FK2）取得済み33ユニット/578部品を投入するスクリプト（開発DB）
// - GT3体系に合わせた機能別ジャンルに振り分け
// - 元通貨=EUR / originalPrice=EUR価格 で登録（表示時に円換算）
// - 実行前に既存のABA-FK2配下(genre/unit/part/partMaster)を全削除して作り直す
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();
const SCRATCH = '/private/tmp/claude-501/-Users-gainertatsuya-Downloads-----/bbdfa00c-ab9b-4580-ae14-4de1386747fa/scratchpad';

interface ParsedPart { refNo: string; partNumber: string; partName: string; priceEur: number | null; }
interface ParsedUnit { section: string; code: string; name: string; unitTitle: string; parts: ParsedPart[]; }

async function main() {
  const units: ParsedUnit[] = JSON.parse(fs.readFileSync(`${SCRATCH}/fk2-parsed.json`, 'utf8'))
    .filter((u: ParsedUnit) => (u.parts || []).length > 0);
  const genreMap: Record<string, string> = JSON.parse(fs.readFileSync(`${SCRATCH}/genre-map.json`, 'utf8'));

  // カテゴリー
  let category = await prisma.category.findFirst({ where: { name: 'ABA-FK2' } });
  if (!category) {
    category = await prisma.category.create({ data: { name: 'ABA-FK2', subtitle: 'Honda Civic Type R (FK2)', order: 1 } });
    console.log('カテゴリー ABA-FK2 作成');
  }

  // 既存配下を全削除（genre cascade で unit/part も消える）
  const oldGenres = await prisma.genre.findMany({ where: { categoryId: category.id }, select: { id: true } });
  if (oldGenres.length) {
    await prisma.genre.deleteMany({ where: { categoryId: category.id } });
    console.log(`既存ジャンル ${oldGenres.length}件を削除（配下unit/partもcascade削除）`);
  }
  await prisma.partMaster.deleteMany({ where: { categoryId: category.id } });

  // ジャンルの登場順（unitsの並び順で初出順）を保つ
  const genreOrder: string[] = [];
  for (const u of units) {
    const g = genreMap[u.code];
    if (g && !genreOrder.includes(g)) genreOrder.push(g);
  }

  // ジャンル作成
  const genreByName = new Map<string, string>();
  for (let i = 0; i < genreOrder.length; i++) {
    const g = await prisma.genre.create({
      data: { categoryId: category.id, name: genreOrder[i], order: i },
    });
    genreByName.set(genreOrder[i], g.id);
  }
  console.log(`ジャンル ${genreOrder.length}件作成:`, genreOrder.join(' / '));

  let unitCount = 0, partCount = 0;
  const masterEnsured = new Set<string>();

  for (let ui = 0; ui < units.length; ui++) {
    const u = units[ui];
    const genreName = genreMap[u.code];
    if (!genreName) { console.log(`⚠️ ジャンル未定義: ${u.code}（スキップ）`); continue; }
    const genreId = genreByName.get(genreName)!;

    // ユニット作成（unitNumber=元サイトのコード, unitName=図タイトル）
    const unit = await prisma.unit.create({
      data: {
        genreId,
        unitNumber: u.code,
        unitName: u.unitTitle || u.name,
        sortOrder: ui,
        partsCount: u.parts.length,
      },
    });
    unitCount++;

    for (let pi = 0; pi < u.parts.length; pi++) {
      const p = u.parts[pi];
      // 在庫マスター（カテゴリー専用）を用意
      if (!masterEnsured.has(p.partNumber)) {
        await prisma.partMaster.upsert({
          where: { categoryId_partNumber: { categoryId: category.id, partNumber: p.partNumber } },
          update: {},
          create: { categoryId: category.id, partNumber: p.partNumber, stockQuantity: 0 },
        });
        masterEnsured.add(p.partNumber);
      }
      await prisma.part.create({
        data: {
          genreId,
          unitId: unit.id,
          unitNumber: p.refNo || String(pi + 1), // 図番号を個別番号に
          partNumber: p.partNumber,
          partName: p.partName,
          quantity: 1,
          currency: 'EUR',
          originalPrice: p.priceEur ?? undefined,
          sortOrder: pi,
        },
      });
      partCount++;
    }
  }

  console.log(`\n✅ 投入完了: ジャンル${genreOrder.length} / ユニット${unitCount} / 部品${partCount}`);
  console.log(`   category=${category.id}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
