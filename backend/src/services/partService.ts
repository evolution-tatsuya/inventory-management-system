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
    stockQuantity?: number; // 在庫数量（PartMaster用）
  }) {
    return await prisma.$transaction(async (tx) => {
      // PartMasterが存在しない場合は作成、既存の場合は在庫数量を更新
      const partMaster = await tx.partMaster.upsert({
        where: { partNumber: data.partNumber },
        update: {
          // 在庫数量が指定されている場合は更新
          ...(data.stockQuantity !== undefined && { stockQuantity: data.stockQuantity })
        },
        create: {
          partNumber: data.partNumber,
          stockQuantity: data.stockQuantity ?? 0, // 指定がない場合は0
        },
      });

      // 日付文字列をDateTimeに変換、stockQuantityは除外（PartMasterのみで管理）
      const { stockQuantity, ...partDataWithoutStock } = data;
      const partData = {
        ...partDataWithoutStock,
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
      stockQuantity?: number; // 在庫数量を追加
    }
  ) {
    return await prisma.$transaction(async (tx) => {
      // 品番が変更される場合、または在庫数量が指定されている場合、PartMasterを更新
      if (data.partNumber) {
        await tx.partMaster.upsert({
          where: { partNumber: data.partNumber },
          update: {
            // 在庫数量が指定されている場合は更新
            ...(data.stockQuantity !== undefined && { stockQuantity: data.stockQuantity })
          },
          create: {
            partNumber: data.partNumber,
            stockQuantity: data.stockQuantity ?? 0, // 指定がない場合は0
          },
        });
      } else if (data.stockQuantity !== undefined) {
        // 品番変更なしで在庫数量のみ更新する場合
        // 現在のパーツの品番を取得
        const currentPart = await tx.part.findUnique({
          where: { id },
          select: { partNumber: true },
        });
        if (currentPart) {
          await tx.partMaster.update({
            where: { partNumber: currentPart.partNumber },
            data: { stockQuantity: data.stockQuantity },
          });
        }
      }

      // 日付文字列をDateTimeに変換、stockQuantityは除外（PartMasterのみで管理）
      const { stockQuantity, ...dataWithoutStock } = data;
      const updateData = {
        ...dataWithoutStock,
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
