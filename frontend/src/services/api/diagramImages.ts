// ============================================================
// DiagramImage API Service
// ============================================================
// 展開図管理のAPI呼び出しを管理（1ユニット最大10枚対応）
// ============================================================

import { get, post, put, del } from './client';
import type { DiagramImage } from '@/types';

// 1ユニットあたりの展開図の最大枚数（メイン1＋サブ9）
export const MAX_DIAGRAMS_PER_UNIT = 10;

// ============================================================
// 複数枚対応
// ============================================================

/**
 * ユニットの展開図を全件取得（メイン優先→並び順）
 * @param unitId - ユニットID
 */
export async function listDiagramImages(unitId: string): Promise<DiagramImage[]> {
  return get<DiagramImage[]>(`/api/units/${unitId}/diagrams`);
}

/**
 * 展開図を1枚追加
 * @param unitId - ユニットID
 * @param imageUrl - 画像URL
 */
export async function addDiagramImage(
  unitId: string,
  imageUrl: string,
): Promise<DiagramImage> {
  return post<DiagramImage>(`/api/admin/units/${unitId}/diagrams`, { imageUrl });
}

/**
 * 展開図を1枚更新（画像差し替え）
 * @param id - 展開図ID
 * @param imageUrl - 新しい画像URL
 */
export async function updateDiagramImageById(
  id: string,
  imageUrl: string,
): Promise<DiagramImage> {
  return put<DiagramImage>(`/api/admin/diagrams/${id}`, { imageUrl });
}

/**
 * 展開図を1枚削除（IDで指定）
 * @param id - 展開図ID
 */
export async function deleteDiagramImageById(id: string): Promise<void> {
  await del(`/api/admin/diagrams/${id}`);
}

/**
 * メイン展開図を設定
 * @param unitId - ユニットID
 * @param id - メインにする展開図ID
 */
export async function setMainDiagramImage(
  unitId: string,
  id: string,
): Promise<DiagramImage[]> {
  return put<DiagramImage[]>(`/api/admin/units/${unitId}/diagrams/main`, { id });
}

/**
 * 展開図の並び順を一括更新
 * @param unitId - ユニットID
 * @param orderedIds - 並び順に並べた展開図IDの配列
 */
export async function reorderDiagramImages(
  unitId: string,
  orderedIds: string[],
): Promise<DiagramImage[]> {
  return put<DiagramImage[]>(`/api/admin/units/${unitId}/diagrams/order`, {
    orderedIds,
  });
}

// ============================================================
// 後方互換（単数：メイン1枚）
// ============================================================

/**
 * ユニットの展開図を取得（メイン1枚）
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
 * 展開図を作成または更新（後方互換：メイン1枚差し替え）
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
 * 展開図を削除（後方互換：メイン1枚）
 *
 * @param unitId - ユニットID
 * @throws ApiError
 */
export async function deleteDiagramImage(unitId: string): Promise<void> {
  await del(`/api/admin/units/${unitId}/diagram`);
}
