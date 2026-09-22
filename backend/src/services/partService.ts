// ============================================================
// 階層型在庫管理システム - パーツサービス
// ============================================================
// パーツのCRUD処理（Prisma ORM使用）
// 在庫(PartMaster)は stockMode に応じて shared/perCategory を解決する。
// ============================================================

import {
  getStockMode,
  genreToCategoryMap,
  loadStockMap,
  upsertStock,
  ensureStock,
  stockCategoryKey,
  StockMode,
} from './stockHelper';

import { prisma } from '../lib/prisma';
import { limitService } from './limitService';

// パーツ配列に partMaster.stockQuantity を付与する（APIレスポンス互換のため）
async function attachStock(tenantId: string, parts: any[]): Promise<any[]> {
  if (parts.length === 0) return parts;
  const mode = await getStockMode(prisma, tenantId);
  const g2c = await genreToCategoryMap(prisma, tenantId);
  const keys = parts.map((p) => ({
    categoryId: g2c.get(p.genreId) ?? null,
    partNumber: p.partNumber,
  }));
  const stockMap = await loadStockMap(prisma, tenantId, mode, keys);
  return parts.map((p) => {
    const catKey = stockCategoryKey(mode, g2c.get(p.genreId) ?? null);
    const qty = stockMap.get(`${catKey ?? 'null'}::${p.partNumber}`) ?? 0;
    return { ...p, partMaster: { stockQuantity: qty } };
  });
}

// あるgenreIdのカテゴリーIDを引く（テナント内のみ）
async function categoryOfGenre(tenantId: string, genreId: string): Promise<string | null> {
  const g = await prisma.genre.findFirst({
    where: { id: genreId, tenantId },
    select: { categoryId: true },
  });
  return g?.categoryId ?? null;
}

export const partService = {
  // 全パーツ一覧取得（管理画面用）
  async getAll(tenantId: string) {
    const parts = await prisma.part.findMany({
      where: { tenantId },
      orderBy: [{ genreId: 'asc' }, { sortOrder: 'asc' }],
      include: {
        genre: { select: { id: true, name: true } },
        unit: { select: { id: true, unitNumber: true, unitName: true } },
      },
    });
    return attachStock(tenantId, parts);
  },

  // ジャンル内のパーツ一覧取得
  async getByGenre(tenantId: string, genreId: string) {
    const parts = await prisma.part.findMany({
      where: { tenantId, genreId },
      orderBy: [{ sortOrder: 'asc' }],
      include: {
        genre: true,
        unit: { select: { id: true, unitNumber: true, unitName: true } },
      },
    });
    return attachStock(tenantId, parts);
  },

  // パーツ作成（在庫レコード自動作成含む）
  async create(
    tenantId: string,
    data: {
      genreId: string;
      unitId?: string;
      unitNumber: string;
      partNumber: string;
      partName: string;
      quantity?: number;
      price?: number | null;
      currency?: string;
      originalPrice?: number | null;
      storageCase?: string;
      orderDate?: string;
      expectedArrivalDate?: string;
      imageUrl?: string;
      notes?: string;
      description?: string;
      pdfUrl?: string;
      stockQuantity?: number;
    },
  ) {
    // プラン上限チェック（超過なら403で作成をブロック）
    await limitService.assertPartLimit(tenantId, 1);
    const created = await prisma.$transaction(async (tx) => {
      const mode = await getStockMode(tx, tenantId);
      // genre はテナント所有を確認しつつ categoryId を得る
      const genre = await tx.genre.findFirst({
        where: { id: data.genreId, tenantId },
        select: { categoryId: true },
      });
      if (!genre) {
        throw new Error('Genre not found');
      }
      const categoryId = genre.categoryId ?? null;

      // 在庫レコードを用意（指定があればその値、なければ既存維持 or 0）
      if (data.stockQuantity !== undefined) {
        await upsertStock(tx, tenantId, mode, categoryId, data.partNumber, data.stockQuantity);
      } else {
        await ensureStock(tx, tenantId, mode, categoryId, data.partNumber);
      }

      const { stockQuantity, ...rest } = data;
      const partData = {
        ...rest,
        tenantId,
        orderDate: data.orderDate ? new Date(data.orderDate) : undefined,
        expectedArrivalDate: data.expectedArrivalDate ? new Date(data.expectedArrivalDate) : undefined,
      };
      return tx.part.create({ data: partData, include: { genre: true } });
    });
    return (await attachStock(tenantId, [created]))[0];
  },

  // パーツ更新
  async update(
    tenantId: string,
    id: string,
    data: {
      unitNumber?: string;
      partNumber?: string;
      partName?: string;
      quantity?: number;
      price?: number | null;
      currency?: string;
      originalPrice?: number | null;
      storageCase?: string;
      orderDate?: string;
      expectedArrivalDate?: string;
      imageUrl?: string;
      notes?: string;
      description?: string;
      pdfUrl?: string;
      cropPositionX?: number;
      cropPositionY?: number;
      stockQuantity?: number;
    },
  ) {
    const updated = await prisma.$transaction(async (tx) => {
      const mode = await getStockMode(tx, tenantId);
      // 所有確認（自テナントのパーツか）
      const current = await tx.part.findFirst({
        where: { id, tenantId },
        select: { partNumber: true, genreId: true },
      });
      if (!current) {
        throw new Error('Part not found');
      }
      const categoryId =
        (await tx.genre.findFirst({
          where: { id: current.genreId, tenantId },
          select: { categoryId: true },
        }))?.categoryId ?? null;
      const effectivePartNumber = data.partNumber ?? current.partNumber;

      if (effectivePartNumber) {
        if (data.stockQuantity !== undefined) {
          await upsertStock(tx, tenantId, mode, categoryId, effectivePartNumber, data.stockQuantity);
        } else {
          await ensureStock(tx, tenantId, mode, categoryId, effectivePartNumber);
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
    return (await attachStock(tenantId, [updated]))[0];
  },

  // パーツ削除
  async delete(tenantId: string, id: string) {
    // 所有確認してから削除（越境削除防止）
    const existing = await prisma.part.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!existing) {
      throw new Error('Part not found');
    }
    return prisma.part.delete({ where: { id } });
  },

  // 在庫数更新（同一カテゴリー内の同一品番に反映）
  // categoryId を渡すとそのカテゴリーの在庫を、渡さない場合は品番から推定して更新。
  async updateStock(
    tenantId: string,
    partNumber: string,
    stockQuantity: number,
    categoryId?: string | null,
  ) {
    return prisma.$transaction(async (tx) => {
      const mode = await getStockMode(tx, tenantId);
      // categoryId未指定時: perCategoryならこの品番を持つ最初のパーツのカテゴリーを使う
      let catId = categoryId ?? null;
      if (mode === 'perCategory' && categoryId === undefined) {
        const anyPart = await tx.part.findFirst({
          where: { partNumber, tenantId },
          select: { genreId: true },
        });
        if (anyPart) {
          catId = (await tx.genre.findFirst({ where: { id: anyPart.genreId, tenantId }, select: { categoryId: true } }))?.categoryId ?? null;
        }
      }
      const partMaster = await upsertStock(tx, tenantId, mode, catId, partNumber, stockQuantity);

      // 同じ在庫が反映されるパーツ数（同カテゴリー内の同品番）
      const affectedCount = await tx.part.count({ where: { partNumber, tenantId } });
      return { partMaster, affectedCount };
    });
  },

  // パーツ並び順更新
  async updateOrder(tenantId: string, orderedIds: string[]) {
    // 全idが自テナント所有か検証（越境並べ替え防止）
    const owned = await prisma.part.findMany({
      where: { id: { in: orderedIds }, tenantId },
      select: { id: true },
    });
    if (owned.length !== orderedIds.length) {
      throw new Error('Some parts do not belong to this tenant');
    }
    await prisma.$transaction(
      orderedIds.map((id: string, index: number) =>
        prisma.part.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );
  },
};

// 他サービスから使えるように公開（categoryOfGenreは将来用）
export { categoryOfGenre };
