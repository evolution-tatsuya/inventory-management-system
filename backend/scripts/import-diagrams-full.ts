// ============================================================
// 展開図イラスト 全ユニット投入スクリプト
// ============================================================
// unit_page_map.json (db_unit_id -> page番号) に基づき、
// 各ユニットに対応する現行PDFページ画像(full_pages/page-XXX.png)を
// Cloudinaryにアップロードし、DiagramImageに登録する。開発環境専用。
// 使い方: PAGE_MAP=/tmp/unit_page_map.json IMG_DIR=/path/full_pages npx ts-node scripts/import-diagrams-full.ts
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
const PAGE_MAP = process.env.PAGE_MAP || '';
const IMG_DIR = process.env.IMG_DIR || '';

async function main() {
  if (!PAGE_MAP || !IMG_DIR) throw new Error('PAGE_MAP と IMG_DIR を指定してください');
  const pageMap: Record<string, number> = JSON.parse(fs.readFileSync(PAGE_MAP, 'utf-8'));

  const unitIds = Object.keys(pageMap);
  console.log(`対象ユニット: ${unitIds.length}`);

  let done = 0, failed = 0;
  for (const unitId of unitIds) {
    const page = pageMap[unitId];
    const pageStr = String(page).padStart(3, '0');
    const filePath = path.join(IMG_DIR, `page-${pageStr}.png`);
    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠️ ページ画像なし: ${filePath}`);
      failed++;
      continue;
    }
    try {
      const res = await cloudinary.uploader.upload(filePath, {
        folder: 'gt3-049/diagrams-full',
        public_id: `unit_${unitId}`,
        overwrite: true,
      });
      await prisma.diagramImage.deleteMany({ where: { unitId } });
      await prisma.diagramImage.create({
        data: { unitId, imageUrl: res.secure_url, imageType: 'diagram' },
      });
      done++;
      if (done % 20 === 0) console.log(`  進捗: ${done}/${unitIds.length}`);
    } catch (e: any) {
      console.log(`  ❌ 失敗 unit=${unitId}: ${e.message}`);
      failed++;
    }
  }
  console.log(`\n完了: 成功${done} / 失敗${failed}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
