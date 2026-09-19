// ELECTRICAL 49枚の白黒展開図をCloudinaryへアップし、URLを elec-final.json の各ユニットに追記。
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const SC = '/private/tmp/claude-501/-Users-gainertatsuya-Downloads-----/0523a2fa-5000-4b96-a4c6-0f46441a9469/scratchpad';
const OUT = `${SC}/elec-img/out`;

async function main() {
  const data = JSON.parse(fs.readFileSync(`${SC}/elec-final.json`, 'utf8'));
  let ok = 0, skip = 0;
  for (const u of data.units) {
    if (u.diagramUrl) { skip++; continue; } // 冪等: 既にアップ済みはスキップ
    const file = `${OUT}/${u.code}.png`;
    if (!fs.existsSync(file)) { console.log(`画像なし: ${u.code}`); continue; }
    const res = await cloudinary.uploader.upload(file, {
      folder: 'inventory/fk2-diagrams',
      public_id: `FK2-${u.code}`,
      overwrite: true,
      resource_type: 'image',
    });
    u.diagramUrl = res.secure_url;
    ok++;
    console.log(`↑ ${u.code}`);
    fs.writeFileSync(`${SC}/elec-final.json`, JSON.stringify(data, null, 2)); // 逐次保存(中断耐性)
  }
  console.log(`\nアップ完了: ${ok}件 / スキップ${skip}件`);
}

main().catch((e) => { console.error(e); process.exit(1); });
