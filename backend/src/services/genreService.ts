// ============================================================
// 階層型在庫管理システム - ジャンルサービス
// ============================================================
// ジャンルのCRUD処理（Prisma ORM使用）
// ============================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================
// ジャンルサービス
// ============================================================
export const genreService = {
  // 全ジャンル一覧取得（管理画面用）
  async getAll() {
    return await prisma.genre.findMany({
      orderBy: [{ categoryId: 'asc' }, { order: 'asc' }, { createdAt: 'desc' }],
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });
  },

  // カテゴリー内のジャンル一覧取得
  async getByCategory(categoryId: string) {
    return await prisma.genre.findMany({
      where: { categoryId },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      include: {
        parts: {
          select: { id: true },
        },
      },
    });
  },

  // ジャンル作成
  async create(data: {
    genreId?: string;
    name: string;
    subtitle?: string;
    categoryId: string;
    imageUrl?: string;
    diagramImageUrl?: string;
    showDiagram?: boolean;
    showPartImages?: boolean;
    imagePosition?: string;
    cropPositionX?: number;
    cropPositionY?: number;
  }) {
    // 同じカテゴリー内の最大order値を取得
    const maxOrderGenre = await prisma.genre.findFirst({
      where: { categoryId: data.categoryId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    // 新規ジャンルは最大order + 1（または0）に設定して一番下に表示
    const newOrder = maxOrderGenre ? maxOrderGenre.order + 1 : 0;

    return await prisma.genre.create({
      data: {
        ...data,
        order: newOrder,
      },
      include: { category: true },
    });
  },

  // ジャンル更新
  async update(
    id: string,
    data: {
      genreId?: string;
      name?: string;
      subtitle?: string;
      categoryId?: string;
      imageUrl?: string;
      diagramImageUrl?: string;
      showDiagram?: boolean;
      showPartImages?: boolean;
      imagePosition?: string;
      cropPositionX?: number;
      cropPositionY?: number;
    }
  ) {
    return await prisma.genre.update({
      where: { id },
      data,
      include: { category: true },
    });
  },

  // ジャンル削除（カスケード削除: 関連パーツも削除される）
  async delete(id: string) {
    return await prisma.genre.delete({
      where: { id },
    });
  },

  // ジャンル並び順更新
  async updateOrder(orderedIds: string[]) {
    await prisma.$transaction(
      orderedIds.map((id: string, index: number) =>
        prisma.genre.update({
          where: { id },
          data: { order: index },
        })
      )
    );
  },
};
