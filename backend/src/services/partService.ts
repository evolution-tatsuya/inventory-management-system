// ============================================================
// 階層型在庫管理システム - パーツサービス
// ============================================================
// パーツのCRUD処理（Prisma ORM使用）
// PartMaster自動作成・更新ロジック実装
// ============================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================
// パーツサービス
// ============================================================
export const partService = {
  // 全パーツ一覧取得（管理画面用）
  async getAll() {
    return await prisma.part.findMany({
      orderBy: [{ genreId: 'asc' }, { unitNumber: 'asc' }, { sortOrder: 'asc' }],
      include: {
        partMaster: {
          select: { stockQuantity: true },
        },
        genre: {
          select: { id: true, name: true },
        },
        unit: {
          select: { id: true, unitNumber: true, unitName: true },
        },
      },
    });
  },

  // ジャンル内のパーツ一覧取得
  async getByGenre(genreId: string) {
    return await prisma.part.findMany({
      where: { genreId },
      orderBy: [{ unitNumber: 'asc' }, { sortOrder: 'asc' }],
      include: {
        partMaster: {
          select: { stockQuantity: true },
        },
        genre: true,
        unit: {
          select: { id: true, unitNumber: true, unitName: true },
        },
      },
    });
  },

  // パーツ作成（PartMaster自動作成含む）
  async create(data: {
    genreId: string;
    unitId?: string;
    unitNumber: string;
    partNumber: string;
    partName: string;
    quantity?: number;
    price?: number;
    storageCase?: string;
    orderDate?: string;
    expectedArrivalDate?: string;
    imageUrl?: string;
    notes?: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      // PartMasterが存在しない場合は作成（upsertで冪等性確保）
      const partMaster = await tx.partMaster.upsert({
        where: { partNumber: data.partNumber },
        update: {}, // 既存の場合は何もしない
        create: {
          partNumber: data.partNumber,
          stockQuantity: 0, // 初期在庫は0
        },
      });

      // 日付文字列をDateTimeに変換
      const partData = {
        ...data,
        orderDate: data.orderDate ? new Date(data.orderDate) : undefined,
        expectedArrivalDate: data.expectedArrivalDate ? new Date(data.expectedArrivalDate) : undefined,
      };

      // Part作成
      return await tx.part.create({
        data: partData,
        include: {
          partMaster: true,
          genre: true,
        },
      });
    });
  },

  // パーツ更新
  async update(
    id: string,
    data: {
      unitNumber?: string;
      partNumber?: string;
      partName?: string;
      quantity?: number;
      price?: number;
      storageCase?: string;
      orderDate?: string;
      expectedArrivalDate?: string;
      imageUrl?: string;
      notes?: string;
      cropPositionX?: number;
      cropPositionY?: number;
    }
  ) {
    return await prisma.$transaction(async (tx) => {
      // 品番が変更される場合、新しいPartMasterを確保
      if (data.partNumber) {
        await tx.partMaster.upsert({
          where: { partNumber: data.partNumber },
          update: {}, // 既存の場合は何もしない
          create: {
            partNumber: data.partNumber,
            stockQuantity: 0, // 新規品番の初期在庫は0
          },
        });
      }

      // 日付文字列をDateTimeに変換
      const updateData = {
        ...data,
        orderDate: data.orderDate ? new Date(data.orderDate) : undefined,
        expectedArrivalDate: data.expectedArrivalDate ? new Date(data.expectedArrivalDate) : undefined,
      };

      // Part更新
      return await tx.part.update({
        where: { id },
        data: updateData,
        include: {
          partMaster: true,
          genre: true,
        },
      });
    });
  },

  // パーツ削除
  async delete(id: string) {
    return await prisma.part.delete({
      where: { id },
    });
  },

  // 在庫数更新（同一品番すべてに反映）
  async updateStock(partNumber: string, stockQuantity: number) {
    return await prisma.$transaction(async (tx) => {
      // PartMaster更新（これで全パーツに反映される）
      const partMaster = await tx.partMaster.update({
        where: { partNumber },
        data: { stockQuantity },
      });

      // 更新された品番を使用しているパーツ数を取得
      const affectedCount = await tx.part.count({
        where: { partNumber },
      });

      return {
        partMaster,
        affectedCount,
      };
    });
  },

  // パーツ並び順更新
  async updateOrder(orderedIds: string[]) {
    await prisma.$transaction(
      orderedIds.map((id: string, index: number) =>
        prisma.part.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );
  },
};
