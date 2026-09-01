// ============================================================
// GT3-049 全ジャンル投入スクリプト
// ============================================================
// merged_parts.csv の全パーツを、UNIT番号→ジャンルのマッピングに従って
// カテゴリー GT3-049 配下に投入する。開発環境専用。
// 冪等: 対象カテゴリーのジャンル/ユニット/パーツを全消しして入れ直す。
// 使い方: FULL_CSV=/path GENRE_MAP=/path/genre_map.json npx ts-node scripts/import-gt3-full.ts
// ============================================================
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();
const CSV_PATH = process.env.FULL_CSV || '';
const MAP_PATH = process.env.GENRE_MAP || '';
const CATEGORY_NAME = 'GT3-049';
const CATEGORY_SUBTITLE = 'R35 GTR';

interface Row {
  unit_code: string; unit_name: string; loc: string;
  part_no: string; part_name: string; qty: string; price: string;
}

function parseCsv(path: string): Row[] {
  const text = fs.readFileSync(path, 'utf-8').replace(/^﻿/, '');
  const lines = text.split('\n').filter((l) => l.trim());
  const header = lines[0].split(',').map((h) => h.trim());
  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells: string[] = [];
    let cur = '', inQ = false;
    for (const ch of lines[i]) {
      if (ch === '"') inQ = !inQ;
      else if (ch === ',' && !inQ) { cells.push(cur); cur = ''; }
      else cur += ch;
    }
    cells.push(cur);
    const obj: any = {};
    header.forEach((h, idx) => (obj[h] = (cells[idx] || '').trim()));
    rows.push(obj as Row);
  }
  return rows;
}

// ユニット名を正規化（表記ゆれ吸収用）。
// (SERVICE)除去・スペース/括弧/ハイフン除去・大文字化。
// これで「BELT (SERVICE)」と「BELT」は同一、「FIA BOOST SENSOR」と「BOOST TANK(1)」は別と判定できる。
function normalizeName(name: string): string {
  return (name || '')
    .toUpperCase()
    .replace(/\(SERVICE\)/g, '')
    .replace(/[\s()\-_]/g, '');
}

// genre_map.json: { "unit_code_prefix_or_code": {"genre":"ENG","order":0}, ... }
// ここでは事前にPythonで生成した「unit_code -> {genre, order}」の完全対応表を読む
type GenreInfo = { genre: string; order: number };

async function main() {
  if (!CSV_PATH || !MAP_PATH) throw new Error('FULL_CSV と GENRE_MAP を指定してください');
  const rows = parseCsv(CSV_PATH);
  const unitGenre: Record<string, GenreInfo> = JSON.parse(fs.readFileSync(MAP_PATH, 'utf-8'));

  // カテゴリー取得/作成（既存の cmiiy4wqj を優先利用。無ければ作成）
  let category = await prisma.category.findFirst({ where: { name: CATEGORY_NAME } });
  if (!category) {
    category = await prisma.category.create({
      data: { name: CATEGORY_NAME, subtitle: CATEGORY_SUBTITLE, order: 3 },
    });
  }
  console.log(`カテゴリー: ${category.name} (${category.id})`);

  // 既存ジャンル配下を全消し（このカテゴリーのみ）
  const oldGenres = await prisma.genre.findMany({ where: { categoryId: category.id } });
  for (const g of oldGenres) {
    await prisma.part.deleteMany({ where: { genreId: g.id } });
    await prisma.unit.deleteMany({ where: { genreId: g.id } });
  }
  await prisma.genre.deleteMany({ where: { categoryId: category.id } });
  console.log(`既存ジャンル ${oldGenres.length}件をクリア`);

  // ジャンル → ユニット → パーツ の階層を構築
  // まずジャンルごとにまとめる
  const genreMap = new Map<string, { order: number; units: Map<string, Row[]> }>();
  for (const r of rows) {
    const gi = unitGenre[r.unit_code] || { genre: 'その他', order: 99 };
    if (!genreMap.has(gi.genre)) genreMap.set(gi.genre, { order: gi.order, units: new Map() });
    const g = genreMap.get(gi.genre)!;
    // ユニットは unit_code + 正規化した名前 でグルーピング。
    // 表記ゆれ((SERVICE)有無・スペース等)は正規化で吸収して統合、
    // 本当に別のユニット(FIA BOOST SENSOR vs BOOST TANK等)は分離する。
    const ukey = `${r.unit_code}|${normalizeName(r.unit_name)}`;
    if (!g.units.has(ukey)) g.units.set(ukey, []);
    g.units.get(ukey)!.push(r);
  }

  let totalGenres = 0, totalUnits = 0, totalParts = 0;
  // order順にジャンル作成
  const sortedGenres = [...genreMap.entries()].sort((a, b) => a[1].order - b[1].order);
  for (const [genreName, gdata] of sortedGenres) {
    const genre = await prisma.genre.create({
      data: { categoryId: category.id, name: genreName, order: gdata.order },
    });
    totalGenres++;
    let unitOrder = 0;
    // 同一ジャンル内で unitNumber が重複しないよう枝番を付ける。
    // ユニット名末尾の括弧内番号(例 (2-LHD), (3-1))を枝番に使い、名前と整合させる。
    const usedUnitNumbers = new Set<string>();
    let seqCounter = 2;
    for (const [ukey, parts] of gdata.units) {
      // ukey = "unit_code|正規化名" から unit_code を取り出す
      const unitCode = ukey.split('|')[0];
      // ユニット名は現行由来(origin=current)のパーツの名前を優先、無ければ先頭
      const currentPart = parts.find((p: any) => (p as any).origin === 'current');
      const unitName = (currentPart || parts[0]).unit_name;
      // ユニット名末尾の(番号)を枝番候補にする（例 FUEL SYSTEM (2-LHD) → (2-LHD)）
      const nameNum = (unitName.match(/\(([^)]+)\)\s*$/) || [])[1];
      // この unit_code のユニットが複数あるか（複数なら名前番号で明示的に区別）
      const codeCount = [...gdata.units.keys()].filter(
        (k) => k.split('|')[0] === unitCode
      ).length;
      let finalUnitNumber = unitCode;
      if (codeCount > 1 && nameNum && !usedUnitNumbers.has(`${unitCode}(${nameNum})`)) {
        // 複数ある場合は名前の番号を枝番にして名前と整合させる
        finalUnitNumber = `${unitCode}(${nameNum})`;
      }
      // それでも衝突（名前番号なし等）なら連番でフォールバック
      while (usedUnitNumbers.has(finalUnitNumber)) {
        finalUnitNumber = `${unitCode}(${seqCounter++})`;
      }
      usedUnitNumbers.add(finalUnitNumber);
      const unit = await prisma.unit.create({
        data: {
          genreId: genre.id,
          unitNumber: finalUnitNumber,
          unitName: unitName || unitCode,
          sortOrder: unitOrder++,
        },
      });
      totalUnits++;
      // LOC番号(個別番号)を数値順にソート（例: 3-1, 3-2, ... 3-10, 3-11）
      // 数字以外(M等)や空は末尾に。ハイフン区切りの各セグメントを数値比較。
      const locKey = (loc: string): number[] => {
        if (!loc) return [Number.MAX_SAFE_INTEGER];
        const segs = loc.split('-').map((s) => {
          const n = parseInt(s.replace(/[^0-9]/g, ''), 10);
          return isNaN(n) ? Number.MAX_SAFE_INTEGER : n;
        });
        return segs;
      };
      const sortedParts = [...parts].sort((a, b) => {
        const ka = locKey(a.loc), kb = locKey(b.loc);
        for (let i = 0; i < Math.max(ka.length, kb.length); i++) {
          const va = ka[i] ?? -1, vb = kb[i] ?? -1;
          if (va !== vb) return va - vb;
        }
        return 0;
      });
      let sort = 0;
      for (const p of sortedParts) {
        const qty = p.qty ? parseInt(p.qty, 10) : null;
        const price = p.price ? parseFloat(p.price) : 0;
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
            quantity: qty !== null && !isNaN(qty) ? qty : null,
            price: !isNaN(price) ? price : 0,
            sortOrder: sort++,
          },
        });
        totalParts++;
      }
    }
    console.log(`  [${gdata.order}] ${genreName}: ${gdata.units.size}ユニット`);
  }

  console.log(`\n完了: ${totalGenres}ジャンル / ${totalUnits}ユニット / ${totalParts}パーツ`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
