// ============================================================
// 階層型在庫管理システム - カテゴリーサービス
// ============================================================
// カテゴリー管理のビジネスロジック
// ============================================================


import { prisma } from '../lib/prisma';

// ============================================================
// カテゴリーサービス
// ============================================================
export const categoryService = {
  // カテゴリー一覧取得
  async getAll(tenantId: string) {
    return await prisma.category.findMany({
      where: { tenantId },
      orderBy: { order: 'asc' },
      include: {
        genres: {
          select: { id: true },
        },
      },
    });
  },

  // カテゴリー作成
  async create(
    tenantId: string,
    data: {
      name: string;
      categoryId?: string;
      subtitle?: string;
      imageUrl?: string;
      cropPositionX?: number;
      cropPositionY?: number;
      createdAt?: Date;
    }
  ) {
    return await prisma.category.create({
      data: {
        name: data.name,
        categoryId: data.categoryId,
        subtitle: data.subtitle,
        imageUrl: data.imageUrl,
        cropPositionX: data.cropPositionX,
        cropPositionY: data.cropPositionY,
        createdAt: data.createdAt,
        tenantId,
      },
    });
  },

  // カテゴリー更新
  async update(
    tenantId: string,
    id: string,
    data: {
      categoryId?: string;
      name?: string;
      subtitle?: string;
      imageUrl?: string;
      createdAt?: Date;
      cropPositionX?: number;
      cropPositionY?: number;
    }
  ) {
    // 所有確認（自テナントのカテゴリーか）
    const owned = await prisma.category.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!owned) {
      throw new Error('Category not found');
    }
    return await prisma.category.update({
      where: { id },
      data,
    });
  },

  // カテゴリー削除
  async delete(tenantId: string, id: string) {
    // 所有確認（越境削除防止）
    const owned = await prisma.category.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!owned) {
      throw new Error('Category not found');
    }
    // カスケード削除: 関連するジャンルも削除される（Prismaスキーマで設定済み）
    return await prisma.category.delete({
      where: { id },
    });
  },

  // カテゴリー並び順更新
  async updateOrder(tenantId: string, orderedIds: string[]) {
    // 全idが自テナント所有か検証（越境並べ替え防止）
    const owned = await prisma.category.findMany({
      where: { id: { in: orderedIds }, tenantId },
      select: { id: true },
    });
    if (owned.length !== orderedIds.length) {
      throw new Error('Some categories do not belong to this tenant');
    }
    const updates = orderedIds.map((id, index) =>
      prisma.category.update({
        where: { id },
        data: { order: index },
      })
    );
    return await prisma.$transaction(updates);
  },
};
