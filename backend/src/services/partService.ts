// ============================================================
// 階層型在庫管理システム - パーツサービス
// ============================================================
// パーツのCRUD処理（Prisma ORM使用）
// 在庫(PartMaster)は stockMode に応じて shared/perCategory を解決する。
// ============================================================

import { PrismaClient } from '@prisma/client';
import {
  getStockMode,
  genreToCategoryMap,
  loadStockMap,
  upsertStock,
  ensureStock,
  stockCategoryKey,
  StockMode,
} from './stockHelper';

const prisma = new PrismaClient();

// パーツ配列に partMaster.stockQuantity を付与する（APIレスポンス互換のため）
async function attachStock(parts: any[]): Promise<any[]> {
  if (parts.length === 0) return parts;
  const mode = await getStockMode();
  const g2c = await genreToCategoryMap();
  const keys = parts.map((p) => ({
    categoryId: g2c.get(p.genreId) ?? null,
    partNumber: p.partNumber,
  }));
  const stockMap = await loadStockMap(prisma, mode, keys);
  return parts.map((p) => {
    const catKey = stockCategoryKey(mode, g2c.get(p.genreId) ?? null);
    const qty = stockMap.get(`${catKey ?? 'null'}::${p.partNumber}`) ?? 0;
    return { ...p, partMaster: { stockQuantity: qty } };
  });
}

// あるgenreIdのカテゴリーIDを引く
async function categoryOfGenre(genreId: string): Promise<string | null> {
  const g = await prisma.genre.findUnique({ where: { id: genreId }, select: { categoryId: true } });
  return g?.categoryId ?? null;
}

export const partService = {
  // 全パーツ一覧取得（管理画面用）
  async getAll() {
    const parts = await prisma.part.findMany({
      orderBy: [{ genreId: 'asc' }, { sortOrder: 'asc' }],
      include: {
        genre: { select: { id: true, name: true } },
        unit: { select: { id: true, unitNumber: true, unitName: true } },
      },
    });
    return attachStock(parts);
  },

  // ジャンル内のパーツ一覧取得
  async getByGenre(genreId: string) {
    const parts = await prisma.part.findMany({
      where: { genreId },
      orderBy: [{ sortOrder: 'asc' }],
      include: {
        genre: true,
        unit: { select: { id: true, unitNumber: true, unitName: true } },
      },
    });
    return attachStock(parts);
  },

  // パーツ作成（在庫レコード自動作成含む）
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
    stockQuantity?: number;
  }) {
    const created = await prisma.$transaction(async (tx) => {
      const mode = await getStockMode(tx);
      const categoryId = (
        await tx.genre.findUnique({ where: { id: data.genreId }, select: { categoryId: true } })
      )?.categoryId ?? null;

      // 在庫レコードを用意（指定があればその値、なければ既存維持 or 0）
      if (data.stockQuantity !== undefined) {
        await upsertStock(tx, mode, categoryId, data.partNumber, data.stockQuantity);
      } else {
        await ensureStock(tx, mode, categoryId, data.partNumber);
      }

      const { stockQuantity, ...rest } = data;
      const partData = {
        ...rest,
        orderDate: data.orderDate ? new Date(data.orderDate) : undefined,
        expectedArrivalDate: data.expectedArrivalDate ? new Date(data.expectedArrivalDate) : undefined,
      };
      return tx.part.create({ data: partData, include: { genre: true } });
    });
    return (await attachStock([created]))[0];
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
      stockQuantity?: number;
    },
  ) {
    const updated = await prisma.$transaction(async (tx) => {
      const mode = await getStockMode(tx);
      const current = await tx.part.findUnique({
        where: { id },
        select: { partNumber: true, genreId: true },
      });
      const categoryId = current
        ? (await tx.genre.findUnique({ where: { id: current.genreId }, select: { categoryId: true } }))?.categoryId ?? null
        : null;
      const effectivePartNumber = data.partNumber ?? current?.partNumber;

      if (effectivePartNumber) {
        if (data.stockQuantity !== undefined) {
          await upsertStock(tx, mode, categoryId, effectivePartNumber, data.stockQuantity);
        } else {
          await ensureStock(tx, mode, categoryId, effectivePartNumber);
        }
      }

      const { stockQuantity, ...rest } = data;
      const updateData = {
        ...rest,
        orderDate: data.orderDate ? new Date(data.orderDate) : undefined,
        expectedArrivalDate: data.expectedArrivalDate ? new Date(data.expectedArrivalDate) : undefined,
      };
      return tx.part.update({ where: { id }, data: updateData, include: { genre: true } });
    });
    return (await attachStock([updated]))[0];
  },

  // パーツ削除
  async delete(id: string) {
    return prisma.part.delete({ where: { id } });
  },

  // 在庫数更新（同一カテゴリー内の同一品番に反映）
  // categoryId を渡すとそのカテゴリーの在庫を、渡さない場合は品番から推定して更新。
  async updateStock(partNumber: string, stockQuantity: number, categoryId?: string | null) {
    return prisma.$transaction(async (tx) => {
      const mode = await getStockMode(tx);
      // categoryId未指定時: perCategoryならこの品番を持つ最初のパーツのカテゴリーを使う
      let catId = categoryId ?? null;
      if (mode === 'perCategory' && categoryId === undefined) {
        const anyPart = await tx.part.findFirst({
          where: { partNumber },
          select: { genreId: true },
        });
        if (anyPart) {
          catId = (await tx.genre.findUnique({ where: { id: anyPart.genreId }, select: { categoryId: true } }))?.categoryId ?? null;
        }
      }
      const partMaster = await upsertStock(tx, mode, catId, partNumber, stockQuantity);

      // 同じ在庫が反映されるパーツ数（同カテゴリー内の同品番）
      const affectedCount = await tx.part.count({ where: { partNumber } });
      return { partMaster, affectedCount };
    });
  },

  // パーツ並び順更新
  async updateOrder(orderedIds: string[]) {
    await prisma.$transaction(
      orderedIds.map((id: string, index: number) =>
        prisma.part.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );
  },
};

// 他サービスから使えるように公開（categoryOfGenreは将来用）
export { categoryOfGenre };
