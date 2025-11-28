// ============================================================
// DiagramImage Service
// ============================================================
// 展開図の管理サービス
// ============================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const diagramImageService = {
  /**
   * ジャンルの展開図を取得
   * @param genreId ジャンルID
   * @returns 展開図（存在しない場合null）
   */
  async getDiagramImageByGenreId(genreId: string) {
    return await prisma.diagramImage.findFirst({
      where: { genreId },
    });
  },

  /**
   * 展開図を作成または更新
   * @param genreId ジャンルID
   * @param imageUrl 画像URL
   * @returns 作成または更新された展開図
   */
  async upsertDiagramImage(genreId: string, imageUrl: string) {
    // 既存の展開図を確認
    const existing = await prisma.diagramImage.findFirst({
      where: { genreId },
    });

    if (existing) {
      // 更新
      return await prisma.diagramImage.update({
        where: { id: existing.id },
        data: { imageUrl },
      });
    } else {
      // 新規作成
      return await prisma.diagramImage.create({
        data: {
          genreId,
          imageUrl,
          imageType: 'diagram',
        },
      });
    }
  },

  /**
   * 展開図を削除
   * @param genreId ジャンルID
   */
  async deleteDiagramImage(genreId: string) {
    const existing = await prisma.diagramImage.findFirst({
      where: { genreId },
    });

    if (existing) {
      await prisma.diagramImage.delete({
        where: { id: existing.id },
      });
    }
  },
};
