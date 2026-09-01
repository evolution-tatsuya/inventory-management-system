// ============================================================
// GT3-049 サンプル投入スクリプト（CLUTCHジャンル1つ分）
// ============================================================
// 開発環境専用。マージ済みCSV(merged_parts.csv)から
// カテゴリー GT3-049 > ジャンル CLUTCH > 各UNIT > パーツ を投入する。
// 冪等: 同名カテゴリー/ジャンル/ユニットは再利用し、パーツは一旦削除して入れ直す。
// 使い方: SAMPLE_CSV=/path/to/merged_parts.csv npx ts-node scripts/import-gt3-sample.ts
// ============================================================
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

const CSV_PATH = process.env.SAMPLE_CSV || '';
const CATEGORY_NAME = 'GT3-049';
const CATEGORY_SUBTITLE = 'R35 GTR';
const GENRE_NAME = 'CLUTCH';
// CLUTCHジャンルに含めるUNIT先頭番号
const CLUTCH_UNIT_PREFIXES = ['300', '304', '305'];

interface Row {
  unit_code: string;
  unit_name: string;
  loc: string;
  part_no: string;
  part_name: string;
  qty: string;
  price: string;
}

function parseCsv(path: string): Row[] {
  const text = fs.readFileSync(path, 'utf-8').replace(/^﻿/, '');
  const lines = text.split('\n').filter((l) => l.trim());
  const header = lines[0].split(',');
  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    // 簡易CSVパース（ダブルクオート対応）
    const cells: string[] = [];
    let cur = '';
    let inQ = false;
    for (const ch of lines[i]) {
      if (ch === '"') inQ = !inQ;
      else if (ch === ',' && !inQ) {
        cells.push(cur);
        cur = '';
      } else cur += ch;
    }
    cells.push(cur);
    const obj: any = {};
    header.forEach((h, idx) => (obj[h.trim()] = (cells[idx] || '').trim()));
    rows.push(obj as Row);
  }
  return rows;
}

async function main() {
  if (!CSV_PATH) throw new Error('SAMPLE_CSV 環境変数でCSVパスを指定してください');
  const all = parseCsv(CSV_PATH);
  const clutch = all.filter((r) =>
    CLUTCH_UNIT_PREFIXES.some((p) => (r.unit_code || '').startsWith(p))
  );
  console.log(`CLUTCH対象パーツ: ${clutch.length}件`);

  // 1) カテゴリー
  let category = await prisma.category.findFirst({ where: { name: CATEGORY_NAME } });
  if (!category) {
    category = await prisma.category.create({
      data: { name: CATEGORY_NAME, subtitle: CATEGORY_SUBTITLE, order: 999 },
    });
    console.log(`カテゴリー作成: ${category.name} (${category.id})`);
  } else {
    console.log(`カテゴリー既存: ${category.name} (${category.id})`);
  }

  // 2) ジャンル
  let genre = await prisma.genre.findFirst({
    where: { categoryId: category.id, name: GENRE_NAME },
  });
  if (!genre) {
    genre = await prisma.genre.create({
      data: { categoryId: category.id, name: GENRE_NAME, order: 0 },
    });
    console.log(`ジャンル作成: ${genre.name} (${genre.id})`);
  } else {
    console.log(`ジャンル既存: ${genre.name} (${genre.id})`);
  }

  // 3) UNITごとにグループ化
  const byUnit = new Map<string, Row[]>();
  for (const r of clutch) {
    const key = `${r.unit_code}|${r.unit_name}`;
    if (!byUnit.has(key)) byUnit.set(key, []);
    byUnit.get(key)!.push(r);
  }

  let unitOrder = 0;
  let totalParts = 0;
  for (const [key, parts] of byUnit) {
    const [unitCode, unitName] = key.split('|');
    let unit = await prisma.unit.findFirst({
      where: { genreId: genre.id, unitNumber: unitCode },
    });
    if (!unit) {
      unit = await prisma.unit.create({
        data: {
          genreId: genre.id,
          unitNumber: unitCode,
          unitName: unitName || unitCode,
          sortOrder: unitOrder++,
        },
      });
    }
    // 既存パーツを消して入れ直し（冪等）
    await prisma.part.deleteMany({ where: { unitId: unit.id } });

    let sort = 0;
    for (const p of parts) {
      const qty = p.qty ? parseInt(p.qty, 10) : null;
      const price = p.price ? parseFloat(p.price) : 0;
      // PartMaster（在庫マスター）を用意（在庫0）
      await prisma.partMaster.upsert({
        where: { partNumber: p.part_no },
        update: {},
        create: { partNumber: p.part_no, stockQuantity: 0 },
      });
      await prisma.part.create({
        data: {
          genreId: genre.id,
          unitId: unit.id,
          unitNumber: p.loc || '',
          partNumber: p.part_no,
          partName: p.part_name,
          quantity: isNaN(qty as any) ? null : qty,
          price: isNaN(price) ? 0 : price,
          sortOrder: sort++,
        },
      });
      totalParts++;
    }
    console.log(`  UNIT ${unitCode} (${unitName}): ${parts.length}パーツ投入`);
  }

  console.log(`\n完了: ${byUnit.size}ユニット / ${totalParts}パーツを投入しました`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
