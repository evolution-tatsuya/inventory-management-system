// ============================================================
// stockHelper: 在庫(PartMaster)を stockMode に応じて解決するヘルパー
// ============================================================
// shared      : categoryId=null の PartMaster を品番でグローバル共有（従来動作）
// perCategory : (categoryId, partNumber) の PartMaster をカテゴリー単位で管理
//
// Part は categoryId を直接持たないため、genre 経由で解決する。
// 呼び出し側は「そのPartが属するカテゴリーID」を渡すか、
// resolveCategoryIds() でまとめて引く。
// ============================================================

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export type StockMode = 'shared' | 'perCategory';

// システムの在庫モードを取得（未設定なら shared）
export async function getStockMode(
  client: PrismaClient | Prisma.TransactionClient = prisma,
): Promise<StockMode> {
  const s = await client.systemSettings.findFirst();
  return (s?.stockMode as StockMode) || 'shared';
}

// genreId -> categoryId のマップを作る
export async function genreToCategoryMap(
  client: PrismaClient | Prisma.TransactionClient = prisma,
): Promise<Map<string, string>> {
  const genres = await client.genre.findMany({ select: { id: true, categoryId: true } });
  return new Map(genres.map((g) => [g.id, g.categoryId]));
}

// 在庫レコードの「カテゴリーキー」を決める（shared時は常にnull）
export function stockCategoryKey(mode: StockMode, categoryId: string | null): string | null {
  return mode === 'perCategory' ? categoryId : null;
}

// 指定(カテゴリー,品番)群の在庫を取得して Map<`${catKey}::${partNumber}`, qty> で返す
export async function loadStockMap(
  client: PrismaClient | Prisma.TransactionClient,
  mode: StockMode,
  keys: { categoryId: string | null; partNumber: string }[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (keys.length === 0) return map;
  // shared は categoryId=null の行、perCategory は該当categoryIdの行をまとめて取得
  const partNumbers = Array.from(new Set(keys.map((k) => k.partNumber)));
  const catIds = Array.from(
    new Set(keys.map((k) => stockCategoryKey(mode, k.categoryId))),
  );
  const rows = await client.partMaster.findMany({
    where: {
      partNumber: { in: partNumbers },
      categoryId: mode === 'perCategory' ? { in: catIds as string[] } : null,
    },
    select: { categoryId: true, partNumber: true, stockQuantity: true },
  });
  for (const r of rows) {
    map.set(`${r.categoryId ?? 'null'}::${r.partNumber}`, r.stockQuantity);
  }
  return map;
}

// 1レコードを (catKey, partNumber) で取得（Prismaの複合uniqueはnull不可のためfindFirstで統一）
async function findStockRow(
  client: PrismaClient | Prisma.TransactionClient,
  catKey: string | null,
  partNumber: string,
) {
  return client.partMaster.findFirst({ where: { categoryId: catKey, partNumber } });
}

// 1品番の在庫を取得（無ければ0）
export async function getStock(
  client: PrismaClient | Prisma.TransactionClient,
  mode: StockMode,
  categoryId: string | null,
  partNumber: string,
): Promise<number> {
  const catKey = stockCategoryKey(mode, categoryId);
  const row = await findStockRow(client, catKey, partNumber);
  return row?.stockQuantity ?? 0;
}

// 在庫をupsert（作成 or 更新）。複合uniqueがnull非対応なため手動で分岐。
export async function upsertStock(
  client: PrismaClient | Prisma.TransactionClient,
  mode: StockMode,
  categoryId: string | null,
  partNumber: string,
  stockQuantity: number,
) {
  const catKey = stockCategoryKey(mode, categoryId);
  const existing = await findStockRow(client, catKey, partNumber);
  if (existing) {
    return client.partMaster.update({
      where: { id: existing.id },
      data: { stockQuantity },
    });
  }
  return client.partMaster.create({
    data: { categoryId: catKey, partNumber, stockQuantity },
  });
}

// 在庫レコードの存在を保証（無ければ0で作成）
export async function ensureStock(
  client: PrismaClient | Prisma.TransactionClient,
  mode: StockMode,
  categoryId: string | null,
  partNumber: string,
) {
  const catKey = stockCategoryKey(mode, categoryId);
  const existing = await findStockRow(client, catKey, partNumber);
  if (!existing) {
    await client.partMaster.create({
      data: { categoryId: catKey, partNumber, stockQuantity: 0 },
    });
  }
}
