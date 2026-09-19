// FK2 TRANSMISSION 投入: ABA-FK2 カテゴリーにトランスミッション系ジャンル/ユニット/部品/展開図を追加する。
// - サイト parts-honda.uk から取得した9ユニット(227部品、EUR建て)
// - 展開図は透かし除去+白黒化済みPNGをCloudinaryへアップ(inventory/fk2-diagrams/FK2-{code}.png)
// - 冪等: 既存の同名ジャンル配下に同じ unitNumber のユニットがあれば作り直す(削除→再作成)。
// - 旧品番の概念なし(サイトに取り消し線が無いことを確認済み)。同一refの複数品番は別行として登録。
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

const SC = '/private/tmp/claude-501/-Users-gainertatsuya-Downloads-----/0523a2fa-5000-4b96-a4c6-0f46441a9469/scratchpad';
const IMG_DIR = `${SC}/fk2-trans-img/out`;
const DATA = `${SC}/trans-final.json`;

interface P { ref: string; pn: string; name: string; eur: number | null; }
interface U { code: string; unitName: string; genre: string; parts: P[]; }

async function uploadDiagram(code: string): Promise<string | null> {
  const file = path.join(IMG_DIR, `${code}.png`);
  if (!fs.existsSync(file)) {
    console.log(`  展開図ファイルなし: ${code}`);
    return null;
  }
  const res = await cloudinary.uploader.upload(file, {
    folder: 'inventory/fk2-diagrams',
    public_id: `FK2-${code}`,
    overwrite: true,
    resource_type: 'image',
  });
  return res.secure_url;
}

async function main() {
  const parsed = JSON.parse(fs.readFileSync(DATA, 'utf8')) as { categoryName: string; units: U[] };
  const units = parsed.units;

  const category = await prisma.category.findFirst({ where: { name: parsed.categoryName } });
  if (!category) throw new Error(`カテゴリー ${parsed.categoryName} が見つかりません`);
  console.log(`カテゴリー: ${category.name} (${category.id})`);

  // ジャンル登場順(データ配列順で初出)
  const genreOrder: string[] = [];
  for (const u of units) if (!genreOrder.includes(u.genre)) genreOrder.push(u.genre);

  // 既存ジャンルの最大orderを取得して続きに追加
  const existingGenres = await prisma.genre.findMany({ where: { categoryId: category.id } });
  const maxOrder = existingGenres.reduce((m, g) => Math.max(m, g.order ?? 0), -1);
  const genreIdByName: Record<string, string> = {};
  for (const g of existingGenres) genreIdByName[g.name] = g.id;

  let nextOrder = maxOrder + 1;
  for (const gName of genreOrder) {
    if (genreIdByName[gName]) {
      console.log(`  既存ジャンル利用: ${gName}`);
      continue;
    }
    const g = await prisma.genre.create({
      data: { categoryId: category.id, name: gName, order: nextOrder++ },
    });
    genreIdByName[gName] = g.id;
    console.log(`  ジャンル作成: ${gName}`);
  }

  let unitCount = 0, partCount = 0, diagCount = 0, masterCount = 0;

  for (let ui = 0; ui < units.length; ui++) {
    const u = units[ui];
    const gId = genreIdByName[u.genre];

    // 冪等: 同ジャンル配下に同 unitNumber があれば削除して作り直す
    const dup = await prisma.unit.findMany({
      where: { genreId: gId, unitNumber: u.code },
      select: { id: true },
    });
    if (dup.length) {
      await prisma.unit.deleteMany({ where: { id: { in: dup.map((d) => d.id) } } });
      console.log(`  既存ユニット ${u.code} を削除して再作成`);
    }

    const diagramUrl = await uploadDiagram(u.code);

    const unit = await prisma.unit.create({
      data: {
        genreId: gId,
        unitNumber: u.code,
        unitName: u.unitName,
        sortOrder: ui,
        partsCount: u.parts.length,
      },
    });
    unitCount++;

    if (diagramUrl) {
      await prisma.diagramImage.create({
        data: { unitId: unit.id, imageUrl: diagramUrl, imageType: 'diagram', isMain: true, sortOrder: 0 },
      });
      diagCount++;
      console.log(`  ↑ 展開図 ${u.code} -> ${diagramUrl}`);
    }

    for (let pi = 0; pi < u.parts.length; pi++) {
      const p = u.parts[pi];
      const master = await prisma.partMaster.findUnique({
        where: { categoryId_partNumber: { categoryId: category.id, partNumber: p.pn } },
      });
      if (!master) {
        await prisma.partMaster.create({
          data: { categoryId: category.id, partNumber: p.pn, stockQuantity: 0 },
        });
        masterCount++;
      }
      await prisma.part.create({
        data: {
          genreId: gId,
          unitId: unit.id,
          unitNumber: p.ref || String(pi + 1),
          partNumber: p.pn,
          partName: p.name,
          quantity: 1,
          currency: 'EUR',
          originalPrice: p.eur ?? undefined,
          sortOrder: pi,
        },
      });
      partCount++;
    }
    console.log(`  ✓ ${u.code} ${u.unitName} (${u.genre}) 部品${u.parts.length}`);
  }

  console.log(`\n✅ 投入完了: ジャンル追加${genreOrder.length} / ユニット${unitCount} / 部品${partCount} / 展開図${diagCount} / 新規マスター${masterCount}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
