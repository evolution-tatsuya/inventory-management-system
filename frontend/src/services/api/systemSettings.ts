// ============================================================
// システム設定API - エンドポイント呼び出し
// ============================================================
// システム設定の取得・更新
// ============================================================

import { get, put } from './client';
import { SYSTEM_SETTINGS_ENDPOINTS } from './endpoints';
import type { SystemSettings, UpdateSystemSettingsRequest } from './types';

/**
 * システム設定取得
 * GET /api/system-settings
 */
export async function getSystemSettings(): Promise<SystemSettings> {
  return get<SystemSettings>(SYSTEM_SETTINGS_ENDPOINTS.GET);
}

/**
 * システム設定更新
 * PUT /api/admin/system-settings
 */
export async function updateSystemSettings(
  data: UpdateSystemSettingsRequest,
): Promise<SystemSettings> {
  return put<SystemSettings>(SYSTEM_SETTINGS_ENDPOINTS.UPDATE, data);
}
