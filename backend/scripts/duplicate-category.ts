// ============================================================
// カテゴリー複製スクリプト
// ============================================================
// 指定カテゴリー配下(ジャンル→ユニット→パーツ→展開図)を丸ごと複製し、
// 新しい名前のカテゴリーとして作成する。
// 在庫は stockMode に応じて:
//   perCategory: 元カテゴリーのカテゴリー別在庫を新カテゴリーへコピー
//   shared     : 共有(null)在庫をそのまま参照（新規作成不要）
//
//   DATABASE_URL=... npx ts-node scripts/duplicate-category.ts --from "GT3-049" --to "GTR-GT3 Rev.4.1" [--apply]
// ============================================================
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function argVal(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const fromName = argVal('--from');
  const toName = argVal('--to');
  const apply = process.argv.includes('--apply');
  if (!fromName || !toName) {
    console.error('Usage: --from "<元カテゴリー名>" --to "<新カテゴリー名>" [--apply]');
    process.exit(1);
  }
  console.log(apply ? '=== APPLY ===' : '=== DRY-RUN ===');

  const src = await prisma.category.findFirst({
    where: { name: fromName },
    include: {
      genres: {
        include: {
          units: { include: { parts: true, diagramImage: true } },
          parts: true, // ユニット未割当のパーツも拾う
        },
      },
    },
  });
  if (!src) throw new Error(`元カテゴリーが見つかりません: ${fromName}`);

  const dup = await prisma.category.findFirst({ where: { name: toName } });
  if (dup) throw new Error(`既に同名カテゴリーが存在します: ${toName}`);

  const stockMode =
    (await prisma.systemSettings.findFirst())?.stockMode || 'shared';

  // 集計（ドライラン表示用）
  let genreCount = src.genres.length;
  let unitCount = 0;
  let partCount = 0;
  let diagCount = 0;
  for (const g of src.genres) {
    unitCount += g.units.length;
    for (const u of g.units) {
      partCount += u.parts.length;
      diagCount += u.diagramImage.length;
    }
    // ユニット直下ではなくgenre直下partsは、上のunits.partsと重複するため数えない
  }
  console.log(`複製元: ${fromName}`);
  console.log(`  ジャンル ${genreCount} / ユニット ${unitCount} / パーツ ${partCount} / 展開図 ${diagCount}`);
  console.log(`複製先: ${toName}（stockMode=${stockMode}）`);

  if (!apply) {
    await prisma.$disconnect();
    return;
  }

  // カテゴリー別在庫の元マップ（perCategory時に引き継ぐ）
  const srcStock = new Map<string, number>();
  if (stockMode === 'perCategory') {
    const rows = await prisma.partMaster.findMany({ where: { categoryId: src.id } });
    rows.forEach((r) => srcStock.set(r.partNumber, r.stockQuantity));
  }

  // ------------------------------------------------------------
  // Neon対策: 巨大な単一トランザクションはpoolerのタイムアウトで失敗するため、
  // 小さな単位に分けて実行する（category→genre→unit＋diagram は個別tx、
  // parts は createMany でチャンク投入）。
  // ------------------------------------------------------------

  // 1) カテゴリー作成
  const maxCatOrder = await prisma.category.aggregate({ _max: { order: true } });
  const newCat = await prisma.category.create({
    data: {
      categoryId: src.categoryId,
      name: toName,
      subtitle: src.subtitle,
      imageUrl: src.imageUrl,
      cropPositionX: src.cropPositionX,
      cropPositionY: src.cropPositionY,
      order: (maxCatOrder._max.order ?? -1) + 1,
    },
  });

  // 2) perCategory在庫レコードをまとめて作成（元カテゴリー在庫を引き継ぐ）
  if (stockMode === 'perCategory') {
    const pnSet = new Map<string, number>();
    for (const g of src.genres)
      for (const u of g.units)
        for (const p of u.parts)
          if (!pnSet.has(p.partNumber)) pnSet.set(p.partNumber, srcStock.get(p.partNumber) ?? 0);
    const stockData = Array.from(pnSet.entries()).map(([partNumber, stockQuantity]) => ({
      categoryId: newCat.id,
      partNumber,
      stockQuantity,
    }));
    for (let i = 0; i < stockData.length; i += 500) {
      await prisma.partMaster.createMany({
        data: stockData.slice(i, i + 500),
        skipDuplicates: true,
      });
    }
  }

  // 3) ジャンル・ユニット・展開図を作成し、パーツはためて後でまとめて投入
  const partsBuffer: any[] = [];
  for (const g of src.genres) {
    const newGenre = await prisma.genre.create({
      data: {
        genreId: g.genreId,
        categoryId: newCat.id,
        name: g.name,
        subtitle: g.subtitle,
        imageUrl: g.imageUrl,
        cropPositionX: g.cropPositionX,
        cropPositionY: g.cropPositionY,
        order: g.order,
      },
    });

    for (const u of g.units) {
      const newUnit = await prisma.unit.create({
        data: {
          genreId: newGenre.id,
          unitNumber: u.unitNumber,
          unitName: u.unitName,
          imageUrl: u.imageUrl,
          cropPositionX: u.cropPositionX,
          cropPositionY: u.cropPositionY,
          partsCount: u.partsCount,
          sortOrder: u.sortOrder,
        },
      });

      if (u.diagramImage.length > 0) {
        await prisma.diagramImage.createMany({
          data: u.diagramImage.map((d) => ({
            unitId: newUnit.id,
            imageUrl: d.imageUrl,
            imageType: d.imageType,
            isMain: d.isMain,
            sortOrder: d.sortOrder,
          })),
        });
      }

      for (const p of u.parts) {
        partsBuffer.push({
          genreId: newGenre.id,
          unitId: newUnit.id,
          unitNumber: p.unitNumber,
          partNumber: p.partNumber,
          partName: p.partName,
          quantity: p.quantity,
          price: p.price,
          storageCase: p.storageCase,
          notes: p.notes,
          orderDate: p.orderDate,
          expectedArrivalDate: p.expectedArrivalDate,
          imageUrl: p.imageUrl,
          cropPositionX: p.cropPositionX,
          cropPositionY: p.cropPositionY,
          sortOrder: p.sortOrder,
        });
      }
    }
  }

  // 4) パーツをチャンクでまとめて投入（createManyは高速・短時間）
  let inserted = 0;
  for (let i = 0; i < partsBuffer.length; i += 500) {
    const res = await prisma.part.createMany({ data: partsBuffer.slice(i, i + 500) });
    inserted += res.count;
  }

  console.log(`✅ 複製完了: ${toName}（カテゴリーID=${newCat.id}, パーツ${inserted}件）`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
