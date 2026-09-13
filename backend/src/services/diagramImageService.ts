// ============================================================
// DiagramImage Service
// ============================================================
// 展開図の管理サービス（1ユニット最大10枚：メイン1＋サブ9）
// ============================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 1ユニットあたりの展開図の最大枚数（メイン1＋サブ9）
export const MAX_DIAGRAMS_PER_UNIT = 10;

export const diagramImageService = {
  // ----------------------------------------------------------
  // 複数枚対応API
  // ----------------------------------------------------------

  /**
   * ユニットの展開図を全件取得（メイン優先→並び順）
   * @param unitId ユニットID
   */
  async listDiagramImages(unitId: string) {
    // 並び順は sortOrder のみで決定（メインフラグは表示ラベルとして独立させ、
    // メインでも自由に前後へ並び替えできるようにする）
    return await prisma.diagramImage.findMany({
      where: { unitId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  },

  /**
   * 展開図を1枚追加（上限チェック付き）
   * 既存が0枚ならそれをメインにする。
   * @param unitId ユニットID
   * @param imageUrl 画像URL
   */
  async addDiagramImage(unitId: string, imageUrl: string) {
    const existing = await prisma.diagramImage.findMany({ where: { unitId } });

    if (existing.length >= MAX_DIAGRAMS_PER_UNIT) {
      throw new Error(
        `展開図は最大${MAX_DIAGRAMS_PER_UNIT}枚までです（現在${existing.length}枚）`,
      );
    }

    const hasMain = existing.some((d) => d.isMain);
    const maxOrder = existing.reduce((m, d) => Math.max(m, d.sortOrder), -1);

    return await prisma.diagramImage.create({
      data: {
        unitId,
        imageUrl,
        imageType: 'diagram',
        isMain: !hasMain, // メインが無ければ最初の1枚をメインに
        sortOrder: maxOrder + 1,
      },
    });
  },

  /**
   * 展開図を1枚更新（画像編集後のURL差し替えなど）
   * @param id 展開図ID
   * @param imageUrl 新しい画像URL
   */
  async updateDiagramImage(id: string, imageUrl: string) {
    return await prisma.diagramImage.update({
      where: { id },
      data: { imageUrl },
    });
  },

  /**
   * 展開図を1枚削除（IDで指定）
   * 削除したのがメインだった場合、残りの先頭を自動でメインに繰り上げる。
   * @param id 展開図ID
   */
  async deleteDiagramImageById(id: string) {
    const target = await prisma.diagramImage.findUnique({ where: { id } });
    if (!target) return;

    await prisma.$transaction(async (tx) => {
      await tx.diagramImage.delete({ where: { id } });

      if (target.isMain) {
        const next = await tx.diagramImage.findFirst({
          where: { unitId: target.unitId },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        });
        if (next) {
          await tx.diagramImage.update({
            where: { id: next.id },
            data: { isMain: true },
          });
        }
      }
    });
  },

  /**
   * 指定した1枚をメインに設定（他はメイン解除）
   * @param unitId ユニットID
   * @param id メインにする展開図ID
   */
  async setMainDiagramImage(unitId: string, id: string) {
    await prisma.$transaction([
      prisma.diagramImage.updateMany({
        where: { unitId },
        data: { isMain: false },
      }),
      prisma.diagramImage.update({
        where: { id },
        data: { isMain: true },
      }),
    ]);
    return this.listDiagramImages(unitId);
  },

  /**
   * 並び順を一括更新（渡されたID配列の順にsortOrderを振り直す）
   * @param unitId ユニットID
   * @param orderedIds 並び順に並べた展開図IDの配列
   */
  async reorderDiagramImages(unitId: string, orderedIds: string[]) {
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.diagramImage.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
    return this.listDiagramImages(unitId);
  },

  // ----------------------------------------------------------
  // 後方互換API（単数：メイン1枚を対象）
  // ----------------------------------------------------------

  /**
   * ユニットのメイン展開図を取得（無ければ先頭）
   * @param unitId ユニットID
   * @returns 展開図（存在しない場合null）
   */
  async getDiagramImageByUnitId(unitId: string) {
    const main = await prisma.diagramImage.findFirst({
      where: { unitId, isMain: true },
    });
    if (main) return main;
    return await prisma.diagramImage.findFirst({
      where: { unitId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  },

  /**
   * 展開図を作成または更新（後方互換：メイン1枚を差し替え）
   * @param unitId ユニットID
   * @param imageUrl 画像URL
   */
  async upsertDiagramImage(unitId: string, imageUrl: string) {
    const existing = await this.getDiagramImageByUnitId(unitId);

    if (existing) {
      return await prisma.diagramImage.update({
        where: { id: existing.id },
        data: { imageUrl },
      });
    }
    return await this.addDiagramImage(unitId, imageUrl);
  },

  /**
   * 展開図を削除（後方互換：メイン1枚のみ）
   * @param unitId ユニットID
   */
  async deleteDiagramImage(unitId: string) {
    const existing = await this.getDiagramImageByUnitId(unitId);
    if (existing) {
      await this.deleteDiagramImageById(existing.id);
    }
  },
};
