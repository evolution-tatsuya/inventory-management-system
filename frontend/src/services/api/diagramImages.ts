// ============================================================
// DiagramImage API Service
// ============================================================
// 展開図管理のAPI呼び出しを管理
// ============================================================

import { get, put, del } from './client';
import type { DiagramImage } from '@/types';

/**
 * ユニットの展開図を取得
 *
 * @param unitId - ユニットID
 * @returns 展開図
 * @throws ApiError
 */
export async function getDiagramImage(unitId: string): Promise<DiagramImage | null> {
  try {
    return await get<DiagramImage>(`/api/units/${unitId}/diagram`);
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
 * @param unitId - ユニットID
 * @param imageUrl - 画像URL
 * @returns 作成または更新された展開図
 * @throws ApiError
 */
export async function upsertDiagramImage(
  unitId: string,
  imageUrl: string,
): Promise<DiagramImage> {
  return put<DiagramImage>(`/api/admin/units/${unitId}/diagram`, { imageUrl });
}

/**
 * 展開図を削除
 *
 * @param unitId - ユニットID
 * @throws ApiError
 */
export async function deleteDiagramImage(unitId: string): Promise<void> {
  await del(`/api/admin/units/${unitId}/diagram`);
}
