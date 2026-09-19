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
 * テナント配下ログイン（/api/t/:slug/auth/login）
 *
 * ログイン時点ではまだテナント slug が localStorage に無いため、
 * 明示的に slug を URL に埋め込む（client の自動注入には頼らない）。
 *
 * @param slug - テナント識別子
 * @param credentials - メールアドレスとパスワード
 */
export async function login(
  slug: string,
  credentials: LoginRequest,
): Promise<LoginResponse> {
  return post<LoginResponse>(`/api/t/${slug}/auth/login`, credentials);
}

/**
 * 運営者(master)ログイン（別導線 /api/master/login）
 */
export async function loginMaster(
  credentials: LoginRequest,
): Promise<LoginResponse> {
  return post<LoginResponse>('/api/master/login', credentials);
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
