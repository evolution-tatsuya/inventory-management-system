// ============================================================
// Account API Service
// ============================================================
// アカウント設定のAPI呼び出しを管理
// ============================================================

import { get, put } from './client';
import { ACCOUNT_ENDPOINTS } from './endpoints';
import type { UpdateEmailResponse, UpdatePasswordResponse } from './types';
import type { UpdateEmailRequest, UpdatePasswordRequest, Admin, User } from '../../types';

/**
 * アカウント情報取得
 *
 * @param userType - アカウント種別（'admin' または 'user'）
 * @param accountId - オプション: 特定のアカウントID
 * @returns アカウント情報
 * @throws ApiError
 */
export async function getAccount(
  userType: 'admin' | 'user',
  accountId?: string,
): Promise<Admin | User> {
  const url = accountId
    ? `${ACCOUNT_ENDPOINTS.GET_ACCOUNT(userType)}?accountId=${accountId}`
    : ACCOUNT_ENDPOINTS.GET_ACCOUNT(userType);
  return get<Admin | User>(url);
}

/**
 * アカウント一覧取得（管理者専用）
 *
 * @param userType - アカウント種別（'admin' または 'user'）
 * @returns アカウント一覧
 * @throws ApiError
 */
export async function getAllAccounts(
  userType: 'admin' | 'user',
): Promise<Array<Admin | User>> {
  return get<Array<Admin | User>>(`/api/admin/account/list/${userType}`);
}

/**
 * メールアドレス変更
 *
 * @param data - 新しいメールアドレスと現在のパスワード
 * @returns 更新後の管理者情報
 * @throws ApiError
 */
export async function updateEmail(
  data: UpdateEmailRequest,
): Promise<UpdateEmailResponse> {
  return put<UpdateEmailResponse>(ACCOUNT_ENDPOINTS.UPDATE_EMAIL, data);
}

/**
 * パスワード変更
 *
 * @param data - 現在のパスワードと新しいパスワード
 * @returns 更新結果
 * @throws ApiError
 */
export async function updatePassword(
  data: UpdatePasswordRequest,
): Promise<UpdatePasswordResponse> {
  return put<UpdatePasswordResponse>(ACCOUNT_ENDPOINTS.UPDATE_PASSWORD, data);
}

/**
 * ユーザー名変更
 *
 * @param data - 新しいユーザー名、アカウント種別、アカウントID
 * @returns 更新後のアカウント情報
 * @throws ApiError
 */
export async function updateDisplayName(data: {
  newDisplayName: string;
  userType?: 'admin' | 'user';
  accountId?: string;
}): Promise<{ success: boolean; account: Admin | User }> {
  return put<{ success: boolean; account: Admin | User }>(
    '/api/admin/account/displayname',
    data
  );
}
