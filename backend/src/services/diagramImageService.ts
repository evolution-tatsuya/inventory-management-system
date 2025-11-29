// ============================================================
// DiagramImage Service
// ============================================================
// 展開図の管理サービス
// ============================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const diagramImageService = {
  /**
   * ユニットの展開図を取得
   * @param unitId ユニットID
   * @returns 展開図（存在しない場合null）
   */
  async getDiagramImageByUnitId(unitId: string) {
    return await prisma.diagramImage.findFirst({
      where: { unitId },
    });
  },

  /**
   * 展開図を作成または更新
   * @param unitId ユニットID
   * @param imageUrl 画像URL
   * @returns 作成または更新された展開図
   */
  async upsertDiagramImage(unitId: string, imageUrl: string) {
    // 既存の展開図を確認
    const existing = await prisma.diagramImage.findFirst({
      where: { unitId },
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
          unitId,
          imageUrl,
          imageType: 'diagram',
        },
      });
    }
  },

  /**
   * 展開図を削除
   * @param unitId ユニットID
   */
  async deleteDiagramImage(unitId: string) {
    const existing = await prisma.diagramImage.findFirst({
      where: { unitId },
    });

    if (existing) {
      await prisma.diagramImage.delete({
        where: { id: existing.id },
      });
    }
  },
};
