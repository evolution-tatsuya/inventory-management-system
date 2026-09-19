// ELECTRICAL EQUIPMENTS/EXHAUST/HEATER の49ユニットを対象DBへ冪等同期。
// - elec-final.json(diagramUrl付き)を使用。Cloudinaryアップは行わない。
// - ジャンルは11種(機能別)。既存があれば流用、なければカテゴリー末尾に追加。
// - ユニット単位トランザクション。既に正しい部品数なら スキップ(再実行の高速化・切断耐性)。
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();
const SC = '/private/tmp/claude-501/-Users-gainertatsuya-Downloads-----/0523a2fa-5000-4b96-a4c6-0f46441a9469/scratchpad';

async function main() {
  const data = JSON.parse(fs.readFileSync(`${SC}/elec-final.json`, 'utf8'));
  const units = data.units;

  const category = await prisma.category.findFirst({ where: { name: data.categoryName } });
  if (!category) throw new Error(`カテゴリー ${data.categoryName} が見つかりません`);

  // ジャンル登場順(データ配列の初出順)
  const genreOrder: string[] = [];
  for (const u of units) if (!genreOrder.includes(u.genre)) genreOrder.push(u.genre);

  const existing = await prisma.genre.findMany({ where: { categoryId: category.id } });
  const genreId: Record<string, string> = {};
  for (const g of existing) genreId[g.name] = g.id;
  let nextOrder = existing.reduce((m, g) => Math.max(m, g.order ?? 0), -1) + 1;
  for (const gName of genreOrder) {
    if (genreId[gName]) continue;
    const g = await prisma.genre.create({ data: { categoryId: category.id, name: gName, order: nextOrder++ } });
    genreId[gName] = g.id;
    console.log(`ジャンル作成: ${gName}`);
  }

  let done = 0;
  for (let ui = 0; ui < units.length; ui++) {
    const u = units[ui];
    const gId = genreId[u.genre];

    const exist = await prisma.unit.findFirst({
      where: { genreId: gId, unitNumber: u.code },
      include: { _count: { select: { parts: true, diagramImage: true } } },
    });
    if (exist && exist._count.parts === u.parts.length && exist._count.diagramImage === (u.diagramUrl ? 1 : 0)) {
      done++; continue;
    }

    await prisma.$transaction(async (tx) => {
      const dups = await tx.unit.findMany({ where: { genreId: gId, unitNumber: u.code }, select: { id: true } });
      if (dups.length) await tx.unit.deleteMany({ where: { id: { in: dups.map((d) => d.id) } } });

      const unit = await tx.unit.create({
        data: { genreId: gId, unitNumber: u.code, unitName: u.unitName, sortOrder: ui, partsCount: u.parts.length },
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

    console.log(`  ✓ ${u.code} ${u.unitName} (${u.genre}) parts=${u.parts.length}`);
    done++;
  }

  console.log(`\n✅ 同期完了: ${done}/${units.length} ユニット`);
}

main().catch((e) => { console.error('ERR', e.code || e.message); process.exit(1); }).finally(() => prisma.$disconnect());
