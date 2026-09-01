// ============================================================
// 展開図画像 投入スクリプト（CLUTCHジャンルのサンプル）
// ============================================================
// 各ユニットの展開図画像(PNG)をCloudinaryにアップロードし、
// DiagramImageレコードを作成する。開発環境専用。冪等（既存の展開図は差し替え）。
// 使い方: DIAGRAM_DIR=/path npx ts-node scripts/import-diagrams.ts
// ============================================================
import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const prisma = new PrismaClient();
const DIR = process.env.DIAGRAM_DIR || '';
const GENRE_NAME = 'CLUTCH';

// ユニット番号 -> 画像ファイル名 の対応
const MAP: Record<string, string> = {
  '300': 'auto_300_1.png',   // CLUTCH DISC(1) の展開図（代表）
  '300S': 'auto_300S.png',
  '304S': 'auto_304S.png',
  '305': 'auto_305.png',
};

async function main() {
  if (!DIR) throw new Error('DIAGRAM_DIR を指定してください');

  // GT3-049 カテゴリー配下の CLUTCH ジャンルに限定
  const category = await prisma.category.findFirst({ where: { name: 'GT3-049', genres: { some: { name: GENRE_NAME } } } });
  const genre = await prisma.genre.findFirst({ where: { name: GENRE_NAME, categoryId: category?.id } });
  if (!genre) throw new Error('GT3-049のCLUTCHジャンルが見つかりません');

  const units = await prisma.unit.findMany({ where: { genreId: genre.id } });
  console.log(`CLUTCHジャンルのユニット数: ${units.length}`);

  for (const unit of units) {
    const file = MAP[unit.unitNumber];
    if (!file) {
      console.log(`  UNIT ${unit.unitNumber}: 対応画像なし（スキップ）`);
      continue;
    }
    const filePath = path.join(DIR, file);
    if (!fs.existsSync(filePath)) {
      console.log(`  UNIT ${unit.unitNumber}: ファイル無し ${filePath}`);
      continue;
    }
    // Cloudinaryへアップロード
    const res = await cloudinary.uploader.upload(filePath, {
      folder: 'gt3-049/diagrams',
      public_id: `clutch_${unit.unitNumber}`,
      overwrite: true,
    });
    // 既存の展開図を消して作り直し
    await prisma.diagramImage.deleteMany({ where: { unitId: unit.id } });
    await prisma.diagramImage.create({
      data: { unitId: unit.id, imageUrl: res.secure_url, imageType: 'diagram' },
    });
    console.log(`  UNIT ${unit.unitNumber}: 展開図登録 → ${res.secure_url}`);
  }

  await prisma.$disconnect();
  console.log('完了');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
