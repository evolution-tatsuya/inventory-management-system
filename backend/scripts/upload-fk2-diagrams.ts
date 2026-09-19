// 30枚の展開図(白黒・透かし除去済み)をCloudinaryにアップし、URLを fk2-final.json に追記
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const SC = '/private/tmp/claude-501/-Users-gainertatsuya-Downloads-----/bbdfa00c-ab9b-4580-ae14-4de1386747fa/scratchpad';
const IMG = `${SC}/fk2final-img`;

async function main() {
  const data = JSON.parse(fs.readFileSync(`${SC}/fk2-final.json`, 'utf8'));
  let ok = 0;
  for (const u of data) {
    if (!u.code) continue;
    const file = `${IMG}/${u.code}.png`;
    if (!fs.existsSync(file)) { console.log(`画像なし: ${u.code}`); continue; }
    const res = await cloudinary.uploader.upload(file, {
      folder: 'inventory/fk2-diagrams',
      public_id: `FK2-${u.code}`,
      overwrite: true,
      resource_type: 'image',
    });
    u.diagramUrl = res.secure_url;
    ok++;
    console.log(`↑ ${u.code} -> ${res.secure_url}`);
  }
  fs.writeFileSync(`${SC}/fk2-final.json`, JSON.stringify(data, null, 2));
  console.log(`\nアップロード完了: ${ok}件`);
}

main().catch((e) => { console.error(e); process.exit(1); });
