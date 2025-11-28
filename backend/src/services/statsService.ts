// ============================================================
// 階層型在庫管理システム - 統計サービス
// ============================================================
// 統計情報の計算・取得
// ============================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================
// 統計サービス
// ============================================================
export const statsService = {
  /**
   * 統計情報を取得
   */
  async getStats() {
    const [
      categoryCount,
      genreCount,
      partCount,
      totalStock,
      lowStockParts,
    ] = await Promise.all([
      // カテゴリー数
      prisma.category.count(),

      // ジャンル数
      prisma.genre.count(),

      // パーツ数
      prisma.part.count(),

      // 総在庫数（PartMasterの合計）
      prisma.partMaster.aggregate({
        _sum: {
          stockQuantity: true,
        },
      }),

      // 在庫数5以下のパーツ（PartMasterベース）
      prisma.partMaster.findMany({
        where: {
          stockQuantity: {
            lte: 5,
          },
        },
        include: {
          parts: {
            select: {
              partName: true,
              genre: {
                select: {
                  name: true,
                },
              },
            },
            take: 1,
          },
        },
        orderBy: {
          stockQuantity: 'asc',
        },
        take: 10,
      }),
    ]);

    // 低在庫パーツを整形
    const formattedLowStockParts = lowStockParts.map((pm) => ({
      partNumber: pm.partNumber,
      partName: pm.parts[0]?.partName || 'Unknown',
      genreName: pm.parts[0]?.genre.name || 'Unknown',
      stockQuantity: pm.stockQuantity,
    }));

    return {
      categoryCount,
      genreCount,
      partCount,
      totalStock: totalStock._sum.stockQuantity || 0,
      lowStockParts: formattedLowStockParts,
    };
  },
};
