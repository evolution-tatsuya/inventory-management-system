// ============================================================
// InventoryCount Service（棚卸し）
// ============================================================
// ユニット単位で実数を受け取り、在庫(PartMaster.stockQuantity)を
// 実数で上書きし、変更を StockCountLog に履歴として記録する。
// ============================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CountItem {
  partId: string; // 対象Part.id（画面の行）
  countedQty: number; // 実数
  storageCase?: string | null; // 収納ケース番号（任意・同時更新可）
}

export const inventoryCountService = {
  /**
   * 棚卸しの実数をまとめて反映する。
   * - 在庫は品番(PartMaster)単位で上書き
   * - 収納ケースはPart単位で更新（渡された場合）
   * - 変更(before≠after)のみStockCountLogに記録
   */
  async saveCounts(items: CountItem[], countedBy: string | null) {
    if (!Array.isArray(items) || items.length === 0) {
      return { updated: 0, logged: 0 };
    }

    // 対象パーツをまとめて取得（品番・ユニット情報のため）
    const partIds = items.map((i) => i.partId);
    const parts = await prisma.part.findMany({
      where: { id: { in: partIds } },
      include: {
        partMaster: { select: { stockQuantity: true } },
        unit: { select: { id: true, unitName: true } },
      },
    });
    const partById = new Map(parts.map((p) => [p.id, p]));

    let updated = 0;
    let logged = 0;

    await prisma.$transaction(
      async (tx) => {
        for (const item of items) {
          const part = partById.get(item.partId);
          if (!part) continue;

          const before = part.partMaster?.stockQuantity ?? 0;
          const after = item.countedQty;

          // 収納ケースの更新（渡され、かつ変化がある場合）
          if (
            item.storageCase !== undefined &&
            item.storageCase !== null &&
            item.storageCase !== part.storageCase
          ) {
            await tx.part.update({
              where: { id: part.id },
              data: { storageCase: item.storageCase },
            });
          }

          // 在庫が変わる場合のみ上書き＋履歴
          if (after !== before) {
            await tx.partMaster.update({
              where: { partNumber: part.partNumber },
              data: { stockQuantity: after },
            });
            await tx.stockCountLog.create({
              data: {
                partNumber: part.partNumber,
                partName: part.partName,
                unitId: part.unit?.id ?? part.unitId ?? null,
                unitName: part.unit?.unitName ?? null,
                beforeQty: before,
                afterQty: after,
                diff: after - before,
                countedBy,
              },
            });
            updated++;
            logged++;
          }
        }
      },
      { maxWait: 30000, timeout: 60000 },
    );

    return { updated, logged };
  },

  /**
   * 棚卸し履歴を取得（新しい順）
   */
  async getHistory(limit = 200) {
    return prisma.stockCountLog.findMany({
      orderBy: { countedAt: 'desc' },
      take: limit,
    });
  },
};
