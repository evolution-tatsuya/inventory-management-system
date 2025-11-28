// ============================================================
// Part API Service
// ============================================================
// パーツ管理のAPI呼び出しを管理
// ============================================================

import { get, post, put, del } from './client';
import { PART_ENDPOINTS } from './endpoints';
import type { PartsResponse, PartResponse, PartMasterResponse } from './types';

/**
 * パーツ一覧取得（ジャンル別）
 *
 * @param genreId - ジャンルID
 * @returns パーツ一覧
 * @throws ApiError
 */
export async function getParts(genreId: string): Promise<PartsResponse> {
  return get<PartsResponse>(PART_ENDPOINTS.LIST(genreId));
}

/**
 * 全パーツ一覧取得（管理画面用）
 *
 * @returns 全パーツ一覧
 * @throws ApiError
 */
export async function getAllParts(): Promise<PartsResponse> {
  return get<PartsResponse>(PART_ENDPOINTS.LIST_ALL);
}

/**
 * パーツ作成
 *
 * @param data - パーツ作成データ
 * @returns 作成されたパーツ
 * @throws ApiError
 */
export async function createPart(data: {
  genreId: string;
  unitNumber: string;
  partNumber: string;
  partName: string;
  storageCase?: string;
  notes?: string;
  orderDate?: string;
  expectedArrivalDate?: string;
  imageUrl?: string;
}): Promise<PartResponse> {
  return post<PartResponse>(PART_ENDPOINTS.CREATE, data);
}

/**
 * パーツ更新
 *
 * @param id - パーツID
 * @param data - 更新データ
 * @returns 更新されたパーツ
 * @throws ApiError
 */
export async function updatePart(
  id: string,
  data: {
    unitNumber?: string;
    partNumber?: string;
    partName?: string;
    storageCase?: string;
    notes?: string;
    orderDate?: string;
    expectedArrivalDate?: string;
    imageUrl?: string;
  },
): Promise<PartResponse> {
  return put<PartResponse>(PART_ENDPOINTS.UPDATE(id), data);
}

/**
 * パーツ削除
 *
 * @param id - パーツID
 * @throws ApiError
 */
export async function deletePart(id: string): Promise<void> {
  await del(PART_ENDPOINTS.DELETE(id));
}

/**
 * 在庫数更新（同一品番すべてに自動反映）
 *
 * @param partNumber - 品番
 * @param stockQuantity - 在庫数
 * @returns 更新されたPartMaster
 * @throws ApiError
 */
export async function updateStock(
  partNumber: string,
  stockQuantity: number,
): Promise<PartMasterResponse> {
  return put<PartMasterResponse>(PART_ENDPOINTS.UPDATE_STOCK(partNumber), {
    stockQuantity,
  });
}

/**
 * パーツ並び順更新
 *
 * @param orderedIds - 並び順通りのパーツID配列
 * @throws ApiError
 */
export async function updatePartOrder(orderedIds: string[]): Promise<void> {
  await put(PART_ENDPOINTS.UPDATE_ORDER, { orderedIds });
}
