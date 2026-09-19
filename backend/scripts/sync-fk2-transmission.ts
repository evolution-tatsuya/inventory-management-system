// エクスポート済みの正解データ(trans-export.json)を対象DBへ冪等同期する。
// - Cloudinaryアップロードは行わない(URLはエクスポート済みを使用) => DB処理のみで高速・切断に強い。
// - ユニット単位のトランザクションで「削除→再作成」。1ユニットずつコミットするので途中切断しても
//   残りを再実行すれば完了できる(既に正しいユニットはそのまま上書き)。
// - 実行するDBは環境変数 DATABASE_URL で決まる。
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();
const SC = '/private/tmp/claude-501/-Users-gainertatsuya-Downloads-----/0523a2fa-5000-4b96-a4c6-0f46441a9469/scratchpad';

interface EP { ref: string; pn: string; name: string; eur: number | null; sortOrder: number; }
interface EU { genre: string; unitNumber: string; unitName: string; sortOrder: number; partsCount: number; diagramUrl: string | null; parts: EP[]; }

async function main() {
  const data = JSON.parse(fs.readFileSync(`${SC}/trans-export.json`, 'utf8')) as { units: EU[] };

  const category = await prisma.category.findFirst({ where: { name: 'ABA-FK2' } });
  if (!category) throw new Error('カテゴリー ABA-FK2 が見つかりません');

  // ジャンルを用意(なければ作成)
  const genreId: Record<string, string> = {};
  for (const gName of ['CLUTCH', 'TRANSMISSION']) {
    let g = await prisma.genre.findFirst({ where: { categoryId: category.id, name: gName } });
    if (!g) {
      const maxOrder = (await prisma.genre.aggregate({ where: { categoryId: category.id }, _max: { order: true } }))._max.order ?? -1;
      g = await prisma.genre.create({ data: { categoryId: category.id, name: gName, order: maxOrder + 1 } });
      console.log(`ジャンル作成: ${gName}`);
    }
    genreId[gName] = g.id;
  }

  let done = 0;
  for (const u of data.units) {
    const gId = genreId[u.genre];

    // 既にこのユニットが正しい部品数で存在するならスキップ(再実行の高速化)
    const existing = await prisma.unit.findFirst({
      where: { genreId: gId, unitNumber: u.unitNumber },
      include: { _count: { select: { parts: true, diagramImage: true } } },
    });
    if (existing && existing._count.parts === u.parts.length && existing._count.diagramImage === (u.diagramUrl ? 1 : 0)) {
      console.log(`  = ${u.unitNumber} ${u.unitName} 既に正常(parts=${u.parts.length}) スキップ`);
      done++;
      continue;
    }

    await prisma.$transaction(async (tx) => {
      // 同ユニットを削除(部品・展開図はカスケード or 明示削除)
      const dups = await tx.unit.findMany({ where: { genreId: gId, unitNumber: u.unitNumber }, select: { id: true } });
      if (dups.length) await tx.unit.deleteMany({ where: { id: { in: dups.map((d) => d.id) } } });

      const unit = await tx.unit.create({
        data: { genreId: gId, unitNumber: u.unitNumber, unitName: u.unitName, sortOrder: u.sortOrder, partsCount: u.parts.length },
      });
      if (u.diagramUrl) {
        await tx.diagramImage.create({ data: { unitId: unit.id, imageUrl: u.diagramUrl, imageType: 'diagram', isMain: true, sortOrder: 0 } });
      }
      for (const p of u.parts) {
        const master = await tx.partMaster.findUnique({ where: { categoryId_partNumber: { categoryId: category.id, partNumber: p.pn } } });
        if (!master) await tx.partMaster.create({ data: { categoryId: category.id, partNumber: p.pn, stockQuantity: 0 } });
        await tx.part.create({
          data: {
            genreId: gId, unitId: unit.id, unitNumber: p.ref, partNumber: p.pn, partName: p.name,
            quantity: 1, currency: 'EUR', originalPrice: p.eur ?? undefined, sortOrder: p.sortOrder,
          },
        });
      }
    }, { timeout: 30000 });

    console.log(`  ✓ ${u.unitNumber} ${u.unitName} (${u.genre}) parts=${u.parts.length}`);
    done++;
  }

  console.log(`\n✅ 同期完了: ${done}/${data.units.length} ユニット`);
}

main().catch((e) => { console.error('ERR', e.code || e.message); process.exit(1); }).finally(() => prisma.$disconnect());
