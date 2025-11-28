// ============================================================
// Unit API Service
// ============================================================
// ユニット管理のAPI呼び出しを管理
// ============================================================

import { get, post, put, del } from './client';
import { UNIT_ENDPOINTS } from './endpoints';
import type { UnitsResponse, UnitResponse } from './types';

/**
 * ユニット一覧取得（ジャンル別）
 *
 * @param genreId - ジャンルID
 * @returns ユニット一覧
 * @throws ApiError
 */
export async function getUnits(genreId: string): Promise<UnitsResponse> {
  return get<UnitsResponse>(UNIT_ENDPOINTS.LIST(genreId));
}

/**
 * 全ユニット一覧取得（管理画面用）
 *
 * @returns 全ユニット一覧
 * @throws ApiError
 */
export async function getAllUnits(): Promise<UnitsResponse> {
  return get<UnitsResponse>(UNIT_ENDPOINTS.LIST_ALL);
}

/**
 * ユニット作成
 *
 * @param data - ユニット作成データ
 * @returns 作成されたユニット
 * @throws ApiError
 */
export async function createUnit(data: {
  genreId: string;
  unitNumber: string;
  unitName: string;
  imageUrl?: string;
}): Promise<UnitResponse> {
  return post<UnitResponse>(UNIT_ENDPOINTS.CREATE, data);
}

/**
 * ユニット更新
 *
 * @param id - ユニットID
 * @param data - 更新データ
 * @returns 更新されたユニット
 * @throws ApiError
 */
export async function updateUnit(
  id: string,
  data: { unitName?: string; imageUrl?: string },
): Promise<UnitResponse> {
  return put<UnitResponse>(UNIT_ENDPOINTS.UPDATE(id), data);
}

/**
 * ユニット削除
 *
 * @param id - ユニットID
 * @throws ApiError
 */
export async function deleteUnit(id: string): Promise<void> {
  await del(UNIT_ENDPOINTS.DELETE(id));
}

/**
 * ユニット並び順更新
 *
 * @param orderedIds - 並び順通りのユニットID配列
 * @throws ApiError
 */
export async function updateUnitOrder(orderedIds: string[]): Promise<void> {
  await put(UNIT_ENDPOINTS.UPDATE_ORDER, { orderedIds });
}
