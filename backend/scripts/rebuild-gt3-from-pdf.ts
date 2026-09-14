// ============================================================
// GT3-049 データをPDF完全版に合わせて是正するスクリプト（差分のみ）
// ============================================================
// FINAL_pdf_data.json（元PDFから抽出した正データ）を正とし:
//  - パーツ入替: 既存ユニットのパーツを全削除→PDF通りに再作成
//  - 新規作成: ユニット+パーツ+展開図を作成
//  - 削除: PDFに存在しないユニットを削除（統合元など）
// 一致している158ユニットは一切触らない。
// 価格は price_lookup（品番→価格）から引き継ぐ。数量はPDFのP/C（※→0）。
//
// 使い方:
//   DATABASE_URL=... npx ts-node scripts/rebuild-gt3-from-pdf.ts --dry-run
//   DATABASE_URL=... npx ts-node scripts/rebuild-gt3-from-pdf.ts --apply
// ============================================================

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();
const DATA_DIR =
  '/private/tmp/claude-501/-Users-gainertatsuya-Downloads-----/63e481a2-7904-43a1-8e7c-bc84efb57fb1/scratchpad/pdfaudit';

interface Part { no: string; partNumber: string; partName: string; quantity: number; }
interface PageUnit { page: number; code: string; unitName: string; genre: string; parts: Part[]; count: number; }

function loadFinal(): PageUnit[] {
  return JSON.parse(fs.readFileSync(`${DATA_DIR}/FINAL_pdf_data.json`, 'utf8'));
}
function loadPriceLookup(): Map<string, number> {
  const map = new Map<string, number>();
  for (const line of fs.readFileSync(`${DATA_DIR}/price_lookup.tsv`, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const [pn, price] = line.split('\t');
    if (pn && price) map.set(pn.trim(), parseFloat(price));
  }
  return map;
}
function loadPageDiagrams(): Map<number, string> {
  const map = new Map<number, string>();
  const p = `${DATA_DIR}/newdiagrams/page_urls.tsv`;
  if (fs.existsSync(p)) {
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      const [page, url] = line.split('\t');
      if (page && url && url.startsWith('http')) map.set(parseInt(page), url.trim());
    }
  }
  return map;
}

function norm(s: string): string {
  return s.normalize('NFKC').replace(/\s+/g, ' ').trim().replace(/\s*([()])\s*/g, '$1').toUpperCase();
}

async function ensurePartMaster(tx: any, partNumber: string) {
  const ex = await tx.partMaster.findUnique({ where: { partNumber } });
  if (!ex) await tx.partMaster.create({ data: { partNumber, stockQuantity: 0 } });
}

async function main() {
  const apply = process.argv.includes('--apply');
  console.log(apply ? '=== APPLY ===' : '=== DRY-RUN ===');

  const final = loadFinal();
  const priceLookup = loadPriceLookup();
  const pageDiagrams = loadPageDiagrams();

  const category = await prisma.category.findFirst({ where: { name: 'GT3-049' } });
  if (!category) throw new Error('GT3-049 category not found');

  // 既存ジャンル: name -> id
  const genres = await prisma.genre.findMany({ where: { categoryId: category.id } });
  const genreByName = new Map(genres.map((g) => [g.name, g]));

  // 既存ユニット: (genre,normname) -> unit
  const units = await prisma.unit.findMany({
    where: { genre: { categoryId: category.id } },
    include: { genre: true, parts: true },
  });
  const unitByKey = new Map(units.map((u) => [`${u.genre.name}||${norm(u.unitName)}`, u]));

  const pdfKeys = new Set(final.map((f) => `${f.genre}||${norm(f.unitName)}`));

  const plan = { keep: 0, fixParts: [] as PageUnit[], create: [] as PageUnit[], del: [] as any[] };

  for (const f of final) {
    const key = `${f.genre}||${norm(f.unitName)}`;
    const u = unitByKey.get(key);
    if (u) {
      if (u.parts.length === f.count) plan.keep++;
      else plan.fixParts.push(f);
    } else {
      plan.create.push(f);
    }
  }
  for (const u of units) {
    if (!pdfKeys.has(`${u.genre.name}||${norm(u.unitName)}`)) plan.del.push(u);
  }

  console.log(`一致(維持): ${plan.keep}`);
  console.log(`パーツ入替: ${plan.fixParts.length}`);
  plan.fixParts.forEach((f) => console.log(`  [FIX] ${f.genre} / ${f.unitName}: →${f.count}件`));
  console.log(`新規作成: ${plan.create.length}`);
  plan.create.forEach((f) => console.log(`  [NEW] ${f.genre} / ${f.unitName}: ${f.count}件 (p${f.page})`));
  console.log(`削除: ${plan.del.length}`);
  plan.del.forEach((u) => console.log(`  [DEL] ${u.genre.name} / ${u.unitName} (${u.parts.length}件)`));

  if (!apply) { await prisma.$disconnect(); return; }

  const priceOf = (pn: string) => (priceLookup.has(pn) ? priceLookup.get(pn)! : null);

  // 1) パーツ入替
  for (const f of plan.fixParts) {
    const u = unitByKey.get(`${f.genre}||${norm(f.unitName)}`)!;
    await prisma.$transaction(async (tx) => {
      await tx.part.deleteMany({ where: { unitId: u.id } });
      let so = 0;
      for (const p of f.parts) {
        await ensurePartMaster(tx, p.partNumber);
        await tx.part.create({
          data: {
            genreId: u.genreId, unitId: u.id, unitNumber: p.no,
            partNumber: p.partNumber, partName: p.partName,
            quantity: p.quantity, price: priceOf(p.partNumber), sortOrder: so++,
          },
        });
      }
    });
    console.log(`  ✅ FIX ${f.unitName} (${f.parts.length}件)`);
  }

  // 2) 新規作成（ユニット+パーツ+展開図）
  for (const f of plan.create) {
    const genre = genreByName.get(f.genre);
    if (!genre) { console.log(`  ❌ ジャンル無し: ${f.genre} (${f.unitName})`); continue; }
    await prisma.$transaction(async (tx) => {
      // unitNumber(ユニット番号)はcodeを流用（一意制約 genreId+unitNumber 対策で名前も含める）
      const unitNumberVal = `${f.code}:${f.unitName}`.slice(0, 60);
      const maxSort = await tx.unit.aggregate({ where: { genreId: genre.id }, _max: { sortOrder: true } });
      const unit = await tx.unit.create({
        data: {
          genreId: genre.id, unitNumber: unitNumberVal, unitName: f.unitName,
          sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
        },
      });
      let so = 0;
      for (const p of f.parts) {
        await ensurePartMaster(tx, p.partNumber);
        await tx.part.create({
          data: {
            genreId: genre.id, unitId: unit.id, unitNumber: p.no,
            partNumber: p.partNumber, partName: p.partName,
            quantity: p.quantity, price: priceOf(p.partNumber), sortOrder: so++,
          },
        });
      }
      const durl = pageDiagrams.get(f.page);
      if (durl) {
        await tx.diagramImage.create({
          data: { unitId: unit.id, imageUrl: durl, imageType: 'diagram', isMain: true, sortOrder: 0 },
        });
      }
    });
    console.log(`  ✅ NEW ${f.unitName} (${f.parts.length}件)${pageDiagrams.get(f.page) ? ' +展開図' : ''}`);
  }

  // 3) 削除（PDFに無いユニット。パーツ・展開図はCascadeで消える）
  for (const u of plan.del) {
    await prisma.unit.delete({ where: { id: u.id } });
    console.log(`  ✅ DEL ${u.unitName}`);
  }

  await prisma.$disconnect();
  console.log('=== 完了 ===');
}

main().catch((e) => { console.error(e); process.exit(1); });
