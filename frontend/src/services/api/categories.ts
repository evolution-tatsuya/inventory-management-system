// ============================================================
// Category API Service
// ============================================================
// カテゴリー管理のAPI呼び出しを管理
// ============================================================

import { get, post, put, del } from './client';
import { CATEGORY_ENDPOINTS } from './endpoints';
import type { CategoriesResponse, CategoryResponse } from './types';

/**
 * カテゴリー一覧取得
 *
 * @returns カテゴリー一覧
 * @throws ApiError
 */
export async function getCategories(): Promise<CategoriesResponse> {
  return get<CategoriesResponse>(CATEGORY_ENDPOINTS.LIST);
}

/**
 * カテゴリー作成
 *
 * @param data - カテゴリー作成データ
 * @returns 作成されたカテゴリー
 * @throws ApiError
 */
export async function createCategory(data: {
  name: string;
  categoryId?: string;
  subtitle?: string;
  createdAt?: string;
}): Promise<CategoryResponse> {
  return post<CategoryResponse>(CATEGORY_ENDPOINTS.CREATE, data);
}

/**
 * カテゴリー更新
 *
 * @param id - カテゴリーID
 * @param data - 更新データ
 * @returns 更新されたカテゴリー
 * @throws ApiError
 */
export async function updateCategory(
  id: string,
  data: {
    name?: string;
    categoryId?: string;
    subtitle?: string;
    imageUrl?: string;
    createdAt?: string;
    cropPositionX?: number;
    cropPositionY?: number;
  },
): Promise<CategoryResponse> {
  return put<CategoryResponse>(CATEGORY_ENDPOINTS.UPDATE(id), data);
}

/**
 * カテゴリー削除
 *
 * @param id - カテゴリーID
 * @throws ApiError
 */
export async function deleteCategory(id: string): Promise<void> {
  await del(CATEGORY_ENDPOINTS.DELETE(id));
}

/**
 * カテゴリー並び順更新
 *
 * @param orderedIds - 並び順通りのカテゴリーID配列
 * @throws ApiError
 */
export async function updateCategoryOrder(orderedIds: string[]): Promise<void> {
  await put(CATEGORY_ENDPOINTS.UPDATE_ORDER, { orderedIds });
}
