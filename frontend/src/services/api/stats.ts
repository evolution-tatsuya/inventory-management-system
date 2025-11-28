// ============================================================
// Stats API Service
// ============================================================
// 統計情報のAPI呼び出しを管理
// ============================================================

import { get } from './client';
import { STATS_ENDPOINTS } from './endpoints';
import type { StatsResponse } from './types';

/**
 * 統計情報取得
 *
 * @returns 統計情報（カテゴリー数、ジャンル数、パーツ数、総在庫数）
 * @throws ApiError
 */
export async function getStats(): Promise<StatsResponse> {
  return get<StatsResponse>(STATS_ENDPOINTS.GET);
}
