// ============================================================
// 階層型在庫管理システム - カテゴリーサービス
// ============================================================
// カテゴリー管理のビジネスロジック
// ============================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================
// カテゴリーサービス
// ============================================================
export const categoryService = {
  // カテゴリー一覧取得
  async getAll() {
    return await prisma.category.findMany({
      orderBy: { order: 'asc' },
      include: {
        genres: {
          select: { id: true },
        },
      },
    });
  },

  // カテゴリー作成
  async create(data: {
    name: string;
    categoryId?: string;
    subtitle?: string;
    createdAt?: Date;
  }) {
    return await prisma.category.create({
      data: {
        name: data.name,
        categoryId: data.categoryId,
        subtitle: data.subtitle,
        createdAt: data.createdAt,
      },
    });
  },

  // カテゴリー更新
  async update(
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
    return await prisma.category.update({
      where: { id },
      data,
    });
  },

  // カテゴリー削除
  async delete(id: string) {
    // カスケード削除: 関連するジャンルも削除される（Prismaスキーマで設定済み）
    return await prisma.category.delete({
      where: { id },
    });
  },

  // カテゴリー並び順更新
  async updateOrder(orderedIds: string[]) {
    const updates = orderedIds.map((id, index) =>
      prisma.category.update({
        where: { id },
        data: { order: index },
      })
    );
    return await prisma.$transaction(updates);
  },
};
