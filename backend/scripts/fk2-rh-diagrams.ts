// RH固有コードの展開図(白黒PNG)をCloudinaryへアップし、対象DBのRHユニットにdiagramImageを付与。
// 使い方: ts-node fk2-rh-diagrams.ts <categoryId> <pngDir>
//   pngDir に <code>.png (白黒化済み) を置く。ファイル名のcode=unitNumberで該当unitを特定。
// 既にdiagramImageがあるユニットはスキップ(冪等)。
import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let i = 0; i < 6; i++) {
    try { return await fn(); }
    catch (e: any) {
      if (['P1017', 'P2028', 'P1001'].includes(e.code || '') && i < 5) { await new Promise((r) => setTimeout(r, 2000)); continue; }
      throw e;
    }
  }
  throw new Error('retry');
}

async function main() {
  const catId = process.argv[2];
  const pngDir = process.argv[3];
  if (!catId || !pngDir) throw new Error('usage: <categoryId> <pngDir>');
  const cat = await withRetry(() => prisma.category.findUnique({ where: { id: catId } }));
  if (!cat) throw new Error('category not found');

  const files = fs.readdirSync(pngDir).filter((f) => f.endsWith('.png'));
  let up = 0, skip = 0, nounit = 0;
  for (const f of files) {
    const code = f.replace(/\.png$/, '');
    const units = await withRetry(() => prisma.unit.findMany({
      where: { unitNumber: code, genre: { categoryId: cat.id } },
      include: { _count: { select: { diagramImage: true } } },
    }));
    if (!units.length) { console.log(`ユニット無: ${code}`); nounit++; continue; }
    // Cloudinaryアップ(1回)。public_id=FK2RH-<code>
    const res = await cloudinary.uploader.upload(path.join(pngDir, f), {
      folder: 'inventory/fk2-diagrams', public_id: `FK2RH-${code}`, overwrite: true, resource_type: 'image',
    });
    for (const u of units) {
      if (u._count.diagramImage > 0) { skip++; continue; }
      await withRetry(() => prisma.diagramImage.create({
        data: { unitId: u.id, imageUrl: res.secure_url, imageType: 'diagram', isMain: true, sortOrder: 0 },
      }));
      up++;
    }
    console.log(`↑ ${code} -> ${res.secure_url}`);
  }
  console.log(`\n✅ 展開図付与: ${up} / スキップ${skip} / ユニット無${nounit}`);
}

main().catch((e) => { console.error('FATAL', e.code || e.message); process.exit(1); }).finally(() => prisma.$disconnect());
