// ============================================================
// 階層型在庫管理システム - 検索サービス
// ============================================================
// 全ジャンル横断検索機能（収納ケース番号検索、品番検索）
// ============================================================

import { getStockMode, loadStockMap, stockCategoryKey } from './stockHelper';

import { prisma } from '../lib/prisma';

// ============================================================
// 検索サービス
// ============================================================
export const searchService = {
  // 収納ケース番号検索（全ジャンル横断・テナント内）
  async searchByStorageCase(tenantId: string, caseNumber: string) {
    const parts = await prisma.part.findMany({
      where: {
        tenantId,
        storageCase: {
          contains: caseNumber,
          mode: 'insensitive',
        },
      },
      include: {
        genre: {
          select: {
            id: true,
            name: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { genre: { category: { name: 'asc' } } },
        { genre: { name: 'asc' } },
        { unitNumber: 'asc' },
      ],
    });

    const mode = await getStockMode(prisma, tenantId);
    const stockMap = await loadStockMap(
      prisma,
      tenantId,
      mode,
      parts.map((p) => ({ categoryId: p.genre.category.id, partNumber: p.partNumber })),
    );
    const stockOf = (p: any) => {
      const catKey = stockCategoryKey(mode, p.genre.category.id);
      return stockMap.get(`${catKey ?? 'null'}::${p.partNumber}`) ?? 0;
    };

    return parts.map((part) => ({
      part: {
        id: part.id,
        unitId: part.unitId,
        unitNumber: part.unitNumber,
        partNumber: part.partNumber,
        partName: part.partName,
        storageCase: part.storageCase,
        imageUrl: part.imageUrl,
        notes: part.notes,
        orderDate: part.orderDate,
        expectedArrivalDate: part.expectedArrivalDate,
        partMaster: {
          stockQuantity: stockOf(part),
        },
      },
      genre: {
        id: part.genre.id,
        name: part.genre.name,
      },
      category: {
        id: part.genre.category.id,
        name: part.genre.category.name,
      },
    }));
  },

  // 品番検索（全ジャンル横断・テナント内、複数ジャンルで使用されている場合はすべて表示）
  async searchByPartNumber(tenantId: string, partNumber: string) {
    const parts = await prisma.part.findMany({
      where: {
        tenantId,
        partNumber: {
          contains: partNumber,
          mode: 'insensitive',
        },
      },
      include: {
        genre: {
          select: {
            id: true,
            name: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { partNumber: 'asc' },
        { genre: { category: { name: 'asc' } } },
        { genre: { name: 'asc' } },
        { unitNumber: 'asc' },
      ],
    });

    const mode = await getStockMode(prisma, tenantId);
    const stockMap = await loadStockMap(
      prisma,
      tenantId,
      mode,
      parts.map((p) => ({ categoryId: p.genre.category.id, partNumber: p.partNumber })),
    );
    const stockOf = (p: any) => {
      const catKey = stockCategoryKey(mode, p.genre.category.id);
      return stockMap.get(`${catKey ?? 'null'}::${p.partNumber}`) ?? 0;
    };

    return parts.map((part) => ({
      part: {
        id: part.id,
        unitId: part.unitId,
        unitNumber: part.unitNumber,
        partNumber: part.partNumber,
        partName: part.partName,
        storageCase: part.storageCase,
        imageUrl: part.imageUrl,
        notes: part.notes,
        orderDate: part.orderDate,
        expectedArrivalDate: part.expectedArrivalDate,
        partMaster: {
          stockQuantity: stockOf(part),
        },
      },
      genre: {
        id: part.genre.id,
        name: part.genre.name,
      },
      category: {
        id: part.genre.category.id,
        name: part.genre.category.name,
      },
    }));
  },
};
