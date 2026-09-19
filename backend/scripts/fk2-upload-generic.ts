// 汎用: 指定JSONの各ユニットの展開図PNGをCloudinaryへアップし diagramUrl を追記。
// 使い方: ts-node fk2-upload-generic.ts <final.json絶対パス> <画像outディレクトリ絶対パス>
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function main() {
  const jsonPath = process.argv[2];
  const outDir = process.argv[3];
  if (!jsonPath || !outDir) throw new Error('usage: <json> <imgOutDir>');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  let ok = 0, skip = 0;
  for (const u of data.units) {
    if (u.diagramUrl) { skip++; continue; }
    const file = `${outDir}/${u.code}.png`;
    if (!fs.existsSync(file)) { console.log(`画像なし: ${u.code}`); continue; }
    const res = await cloudinary.uploader.upload(file, {
      folder: 'inventory/fk2-diagrams',
      public_id: `FK2-${u.code}`,
      overwrite: true,
      resource_type: 'image',
    });
    u.diagramUrl = res.secure_url;
    ok++;
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    console.log(`↑ ${u.code}`);
  }
  console.log(`\nアップ完了: ${ok} / スキップ${skip}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
