// ============================================================
// Image API Service
// ============================================================
// 画像管理のAPI呼び出しを管理
// ============================================================

import { del, postFormData } from './client';
import { IMAGE_ENDPOINTS } from './endpoints';
import type { ImageUploadResponse } from './types';

/**
 * 画像アップロード
 *
 * @param file - アップロードする画像ファイル
 * @returns アップロードされた画像のURL
 * @throws ApiError
 */
export async function uploadImage(file: File): Promise<ImageUploadResponse> {
  const formData = new FormData();
  formData.append('image', file);

  return postFormData<ImageUploadResponse>(IMAGE_ENDPOINTS.UPLOAD, formData);
}

/**
 * 画像削除
 *
 * @param id - 画像ID
 * @throws ApiError
 */
export async function deleteImage(id: string): Promise<void> {
  await del(IMAGE_ENDPOINTS.DELETE(id));
}
