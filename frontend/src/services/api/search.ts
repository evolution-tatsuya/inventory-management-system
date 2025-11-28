// ============================================================
// Search API Service
// ============================================================
// 検索機能のAPI呼び出しを管理
// ============================================================

import { get } from './client';
import { SEARCH_ENDPOINTS } from './endpoints';
import type { SearchResultsResponse } from './types';

/**
 * 収納ケース番号検索
 *
 * @param caseNumber - 収納ケース番号（例: A-001）
 * @returns 検索結果一覧
 * @throws ApiError
 */
export async function searchByStorageCase(
  caseNumber: string,
): Promise<SearchResultsResponse> {
  return get<SearchResultsResponse>(SEARCH_ENDPOINTS.BY_STORAGE_CASE(caseNumber));
}

/**
 * 品番検索
 *
 * @param partNumber - 品番（例: 12345-ABC-001）
 * @returns 検索結果一覧
 * @throws ApiError
 */
export async function searchByPartNumber(
  partNumber: string,
): Promise<SearchResultsResponse> {
  return get<SearchResultsResponse>(SEARCH_ENDPOINTS.BY_PART_NUMBER(partNumber));
}
