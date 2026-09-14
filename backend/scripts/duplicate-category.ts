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

  await prisma.$transaction(
    async (tx) => {
      // 新カテゴリー作成（画像・クロップ・順序も引き継ぐ）
      const maxCatOrder = await tx.category.aggregate({ _max: { order: true } });
      const newCat = await tx.category.create({
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

      // 新カテゴリー用の在庫レコード作成対象（perCategory時、重複作成防止）
      const createdStockKeys = new Set<string>();

      for (const g of src.genres) {
        const newGenre = await tx.genre.create({
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
          const newUnit = await tx.unit.create({
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

          // 展開図コピー
          for (const d of u.diagramImage) {
            await tx.diagramImage.create({
              data: {
                unitId: newUnit.id,
                imageUrl: d.imageUrl,
                imageType: d.imageType,
                isMain: d.isMain,
                sortOrder: d.sortOrder,
              },
            });
          }

          // パーツコピー
          for (const p of u.parts) {
            // 在庫レコードを用意
            if (stockMode === 'perCategory') {
              const key = `${newCat.id}::${p.partNumber}`;
              if (!createdStockKeys.has(key)) {
                const existing = await tx.partMaster.findFirst({
                  where: { categoryId: newCat.id, partNumber: p.partNumber },
                });
                if (!existing) {
                  await tx.partMaster.create({
                    data: {
                      categoryId: newCat.id,
                      partNumber: p.partNumber,
                      stockQuantity: srcStock.get(p.partNumber) ?? 0,
                    },
                  });
                }
                createdStockKeys.add(key);
              }
            }
            // shared時は共有(null)在庫をそのまま使うので作成不要

            await tx.part.create({
              data: {
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
              },
            });
          }
        }
      }

      console.log(`✅ 複製完了: ${toName}（カテゴリーID=${newCat.id}）`);
    },
    { maxWait: 120000, timeout: 300000 },
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
