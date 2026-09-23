// ============================================================
// 階層型在庫管理システム - 統計サービス
// ============================================================
// 統計情報の計算・取得
// ============================================================


import { prisma } from '../lib/prisma';

// ============================================================
// 統計サービス
// ============================================================
export const statsService = {
  /**
   * 統計情報を取得
   */
  async getStats(tenantId: string) {
    const [
      categoryCount,
      genreCount,
      unitCount,
      partCount,
      totalStock,
      lowStockParts,
      outOfStockPartNumbers,
    ] = await Promise.all([
      // カテゴリー数
      prisma.category.count({ where: { tenantId } }),

      // ジャンル数
      prisma.genre.count({ where: { tenantId } }),

      // ユニット数
      prisma.unit.count({ where: { tenantId } }),

      // パーツ数（登録総数）
      prisma.part.count({ where: { tenantId } }),

      // 総在庫数（PartMasterの合計）
      prisma.partMaster.aggregate({
        where: { tenantId },
        _sum: {
          stockQuantity: true,
        },
      }),

      // 在庫ゼロの在庫レコード（リスト表示用、在庫の少ない順）
      prisma.partMaster.findMany({
        where: { tenantId, stockQuantity: { lte: 0 } },
        orderBy: { stockQuantity: 'asc' },
        take: 10,
      }),

      // 在庫ゼロの「品番」ユニーク一覧（カード表示用）
      // ※ shared/perCategory の二重計上を避けるため partNumber 単位で数える。
      //   同一品番が複数カテゴリーに在庫レコードを持つ場合でも1件として扱う。
      prisma.partMaster.groupBy({
        by: ['partNumber'],
        where: { tenantId, stockQuantity: { lte: 0 } },
      }),
    ]);

    // 在庫ゼロの品番ユニーク件数（カード表示用）
    const outOfStockCount = outOfStockPartNumbers.length;

    // 低在庫の品番から、対応するパーツ名・ジャンル名を引く
    const lowPartNumbers = lowStockParts.map((pm) => pm.partNumber);
    const partInfos = await prisma.part.findMany({
      where: { tenantId, partNumber: { in: lowPartNumbers } },
      select: { partNumber: true, partName: true, genre: { select: { name: true } } },
    });
    const infoByPn = new Map(partInfos.map((p) => [p.partNumber, p]));
    const formattedLowStockParts = lowStockParts.map((pm) => ({
      partNumber: pm.partNumber,
      partName: infoByPn.get(pm.partNumber)?.partName || 'Unknown',
      genreName: infoByPn.get(pm.partNumber)?.genre?.name || 'Unknown',
      stockQuantity: pm.stockQuantity,
    }));

    return {
      categoryCount,
      genreCount,
      unitCount,
      partCount,
      totalStock: totalStock._sum.stockQuantity || 0,
      lowStockParts: formattedLowStockParts,
      // 在庫ゼロの品番ユニーク件数。
      // lowStockCount は後方互換のため同値を返す（旧UIが参照している場合に備える）。
      outOfStockCount,
      lowStockCount: outOfStockCount,
    };
  },
};
