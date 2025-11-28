// ============================================================
// DiagramImage API Service
// ============================================================
// 展開図管理のAPI呼び出しを管理
// ============================================================

import { get, put, del } from './client';
import type { DiagramImage } from '@/types';

/**
 * ジャンルの展開図を取得
 *
 * @param genreId - ジャンルID
 * @returns 展開図
 * @throws ApiError
 */
export async function getDiagramImage(genreId: string): Promise<DiagramImage | null> {
  try {
    return await get<DiagramImage>(`/api/genres/${genreId}/diagram`);
  } catch (error: any) {
    // 404の場合はnullを返す（展開図が存在しない）
    if (error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * 展開図を作成または更新
 *
 * @param genreId - ジャンルID
 * @param imageUrl - 画像URL
 * @returns 作成または更新された展開図
 * @throws ApiError
 */
export async function upsertDiagramImage(
  genreId: string,
  imageUrl: string,
): Promise<DiagramImage> {
  return put<DiagramImage>(`/api/admin/genres/${genreId}/diagram`, { imageUrl });
}

/**
 * 展開図を削除
 *
 * @param genreId - ジャンルID
 * @throws ApiError
 */
export async function deleteDiagramImage(genreId: string): Promise<void> {
  await del(`/api/admin/genres/${genreId}/diagram`);
}
