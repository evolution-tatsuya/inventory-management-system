// ============================================================
// 階層型在庫管理システム - ジャンルサービス
// ============================================================
// ジャンルのCRUD処理（Prisma ORM使用）
// ============================================================


import { prisma } from '../lib/prisma';

// ============================================================
// ジャンルサービス
// ============================================================
export const genreService = {
  // 全ジャンル一覧取得（管理画面用）
  async getAll(tenantId: string) {
    return await prisma.genre.findMany({
      where: { tenantId },
      orderBy: [{ categoryId: 'asc' }, { order: 'asc' }, { createdAt: 'desc' }],
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });
  },

  // カテゴリー内のジャンル一覧取得
  async getByCategory(tenantId: string, categoryId: string) {
    return await prisma.genre.findMany({
      where: { categoryId, tenantId },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      include: {
        parts: {
          select: { id: true },
        },
      },
    });
  },

  // ジャンル作成
  async create(
    tenantId: string,
    data: {
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
    }
  ) {
    // 親カテゴリーが自テナント所有か確認（越境作成防止）
    const category = await prisma.category.findFirst({
      where: { id: data.categoryId, tenantId },
      select: { id: true },
    });
    if (!category) {
      throw new Error('Category not found');
    }

    // 同じカテゴリー内の最大order値を取得
    const maxOrderGenre = await prisma.genre.findFirst({
      where: { categoryId: data.categoryId, tenantId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    // 新規ジャンルは最大order + 1（または0）に設定して一番下に表示
    const newOrder = maxOrderGenre ? maxOrderGenre.order + 1 : 0;

    return await prisma.genre.create({
      data: {
        ...data,
        order: newOrder,
        tenantId,
      },
      include: { category: true },
    });
  },

  // ジャンル更新
  async update(
    tenantId: string,
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
    // 所有確認（自テナントのジャンルか）
    const owned = await prisma.genre.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!owned) {
      throw new Error('Genre not found');
    }
    return await prisma.genre.update({
      where: { id },
      data,
      include: { category: true },
    });
  },

  // ジャンル削除（カスケード削除: 関連パーツも削除される）
  async delete(tenantId: string, id: string) {
    // 所有確認（越境削除防止）
    const owned = await prisma.genre.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!owned) {
      throw new Error('Genre not found');
    }
    return await prisma.genre.delete({
      where: { id },
    });
  },

  // ジャンル並び順更新
  async updateOrder(tenantId: string, orderedIds: string[]) {
    // 全idが自テナント所有か検証（越境並べ替え防止）
    const owned = await prisma.genre.findMany({
      where: { id: { in: orderedIds }, tenantId },
      select: { id: true },
    });
    if (owned.length !== orderedIds.length) {
      throw new Error('Some genres do not belong to this tenant');
    }
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
