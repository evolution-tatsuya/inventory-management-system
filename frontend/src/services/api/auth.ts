// ============================================================
// Authentication API Service
// ============================================================
// 認証関連のAPI呼び出しを管理
// ============================================================

import { post, get } from './client';
import { AUTH_ENDPOINTS } from './endpoints';
import type { LoginResponse, LogoutResponse, SessionResponse } from './types';
import type { LoginRequest } from '../../types';

/**
 * ログイン
 *
 * @param credentials - メールアドレスとパスワード
 * @returns ログイン成功レスポンス
 * @throws ApiError - 認証失敗時
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  return post<LoginResponse>(AUTH_ENDPOINTS.LOGIN, credentials);
}

/**
 * ログアウト
 *
 * @returns ログアウト成功レスポンス
 * @throws ApiError - ログアウト失敗時
 */
export async function logout(): Promise<LogoutResponse> {
  return post<LogoutResponse>(AUTH_ENDPOINTS.LOGOUT);
}

/**
 * セッション確認
 *
 * @returns セッション状態
 * @throws ApiError - セッション確認失敗時
 */
export async function checkSession(): Promise<SessionResponse> {
  return get<SessionResponse>(AUTH_ENDPOINTS.SESSION);
}
