// ============================================================
// Genre API Service
// ============================================================
// ジャンル管理のAPI呼び出しを管理
// ============================================================

import { get, post, put, del } from './client';
import { GENRE_ENDPOINTS } from './endpoints';
import type { GenresResponse, GenreResponse } from './types';

/**
 * ジャンル一覧取得（カテゴリー別）
 *
 * @param categoryId - カテゴリーID
 * @returns ジャンル一覧
 * @throws ApiError
 */
export async function getGenres(categoryId: string): Promise<GenresResponse> {
  return get<GenresResponse>(GENRE_ENDPOINTS.LIST(categoryId));
}

/**
 * 全ジャンル一覧取得（管理画面用）
 *
 * @returns 全ジャンル一覧
 * @throws ApiError
 */
export async function getAllGenres(): Promise<GenresResponse> {
  return get<GenresResponse>(GENRE_ENDPOINTS.LIST_ALL);
}

/**
 * ジャンル作成
 *
 * @param data - ジャンル作成データ
 * @returns 作成されたジャンル
 * @throws ApiError
 */
export async function createGenre(data: {
  categoryId: string;
  name: string;
  genreId?: string;
  subtitle?: string;
  imageUrl?: string;
  cropPositionX?: number;
  cropPositionY?: number;
  diagramImageUrl?: string;
  showDiagram?: boolean;
  showPartImages?: boolean;
  imagePosition?: string;
}): Promise<GenreResponse> {
  return post<GenreResponse>(GENRE_ENDPOINTS.CREATE, data);
}

/**
 * ジャンル更新
 *
 * @param id - ジャンルID
 * @param data - 更新データ
 * @returns 更新されたジャンル
 * @throws ApiError
 */
export async function updateGenre(
  id: string,
  data: {
    name?: string;
    genreId?: string;
    subtitle?: string;
    categoryId?: string;
    imageUrl?: string;
    cropPositionX?: number;
    cropPositionY?: number;
    diagramImageUrl?: string;
    showDiagram?: boolean;
    showPartImages?: boolean;
    imagePosition?: string;
  },
): Promise<GenreResponse> {
  return put<GenreResponse>(GENRE_ENDPOINTS.UPDATE(id), data);
}

/**
 * ジャンル削除
 *
 * @param id - ジャンルID
 * @throws ApiError
 */
export async function deleteGenre(id: string): Promise<void> {
  await del(GENRE_ENDPOINTS.DELETE(id));
}

/**
 * ジャンル並び順更新
 *
 * @param orderedIds - 並び順通りのジャンルID配列
 * @throws ApiError
 */
export async function updateGenreOrder(orderedIds: string[]): Promise<void> {
  await put(GENRE_ENDPOINTS.UPDATE_ORDER, { orderedIds });
}
