// ============================================================
// Export API Service
// ============================================================
// エクスポート/インポート機能のAPI呼び出しを管理
// ============================================================

import { get, postFormData } from './client';
import { EXPORT_ENDPOINTS } from './endpoints';
import type { ImportResponse } from './types';

/**
 * CSVエクスポート
 *
 * @param genreId - ジャンルID
 * @returns CSVファイルのBlobデータ
 * @throws ApiError
 */
export async function exportCSV(genreId: string): Promise<Blob> {
  const response = await get<Response>(EXPORT_ENDPOINTS.CSV(genreId));

  // Response オブジェクトからBlobを取得
  if (response instanceof Response) {
    return await response.blob();
  }

  throw new Error('Unexpected response format');
}

/**
 * PDFエクスポート
 *
 * @param genreId - ジャンルID
 * @param unitId - ユニットID（オプション）
 * @returns PDFファイルのBlobデータ
 * @throws ApiError
 */
export async function exportPDF(genreId: string, unitId?: string): Promise<Blob> {
  let url = EXPORT_ENDPOINTS.PDF(genreId);
  if (unitId) {
    url += `?unitId=${encodeURIComponent(unitId)}`;
  }

  const response = await get<Response>(url);

  // Response オブジェクトからBlobを取得
  if (response instanceof Response) {
    return await response.blob();
  }

  throw new Error('Unexpected response format');
}

/**
 * CSV一括インポート
 *
 * @param genreId - ジャンルID
 * @param file - CSVファイル
 * @returns インポート結果
 * @throws ApiError
 */
export async function importCSV(
  genreId: string,
  file: File,
): Promise<ImportResponse> {
  const formData = new FormData();
  formData.append('file', file);

  return postFormData<ImportResponse>(EXPORT_ENDPOINTS.IMPORT_CSV(genreId), formData);
}
