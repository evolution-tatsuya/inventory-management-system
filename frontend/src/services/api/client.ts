// ============================================================
// API Client - Fetch API Wrapper
// ============================================================
// バックエンドAPIとの通信を管理する基盤レイヤー
// ============================================================

/**
 * APIベースURL
 * 開発環境: http://localhost:8763/api
 * 本番環境: 環境変数で設定
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8763';

/**
 * APIエラーレスポンス型
 */
export interface ApiErrorResponse {
  error: string;
  details?: unknown;
}

/**
 * API成功レスポンス型
 */
export interface ApiSuccessResponse<T = unknown> {
  success: boolean;
  data?: T;
}

/**
 * APIクライアントエラー
 */
export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(
    status: number,
    message: string,
    data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Fetch API ラッパー
 *
 * 機能:
 * - 認証ヘッダー自動付与（Authorization: Bearer <token>）
 * - JSONレスポンス自動パース
 * - エラーハンドリング統一
 *
 * @param endpoint - APIエンドポイント（例: '/api/categories'）
 * @param options - Fetch APIオプション
 * @returns レスポンスデータ
 * @throws ApiError
 */
export async function apiClient<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  // ローカルストレージからJWTトークンを取得（userType別）
  const currentUserType = localStorage.getItem('currentUserType');
  let token: string | null = null;

  if (currentUserType === 'admin') {
    token = localStorage.getItem('adminAuthToken');
  } else if (currentUserType === 'user') {
    token = localStorage.getItem('userAuthToken');
  }

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // トークンがあれば認証ヘッダーを追加
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);

    // レスポンスがJSONでない場合（例: CSVダウンロード、PDFダウンロード）
    const contentType = response.headers.get('Content-Type');
    if (contentType && !contentType.includes('application/json')) {
      if (!response.ok) {
        throw new ApiError(
          response.status,
          `HTTP Error: ${response.status} ${response.statusText}`,
        );
      }
      return response as unknown as T;
    }

    // JSONレスポンスをパース
    const data = await response.json();

    // エラーレスポンス処理
    if (!response.ok) {
      throw new ApiError(
        response.status,
        data.error || `HTTP Error: ${response.status}`,
        data,
      );
    }

    return data as T;
  } catch (error) {
    // ネットワークエラー、パースエラー等
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      0,
      error instanceof Error ? error.message : 'Unknown error occurred',
      error,
    );
  }
}

/**
 * GET リクエスト
 */
export async function get<T = unknown>(endpoint: string): Promise<T> {
  return apiClient<T>(endpoint, { method: 'GET' });
}

/**
 * POST リクエスト
 */
export async function post<T = unknown>(
  endpoint: string,
  data?: unknown,
): Promise<T> {
  return apiClient<T>(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PUT リクエスト
 */
export async function put<T = unknown>(
  endpoint: string,
  data?: unknown,
): Promise<T> {
  return apiClient<T>(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETE リクエスト
 */
export async function del<T = unknown>(endpoint: string): Promise<T> {
  return apiClient<T>(endpoint, { method: 'DELETE' });
}

/**
 * マルチパートフォームデータ送信（画像アップロード、CSVインポート）
 */
export async function postFormData<T = unknown>(
  endpoint: string,
  formData: FormData,
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  // ローカルストレージからJWTトークンを取得（userType別）
  const currentUserType = localStorage.getItem('currentUserType');
  let token: string | null = null;

  if (currentUserType === 'admin') {
    token = localStorage.getItem('adminAuthToken');
  } else if (currentUserType === 'user') {
    token = localStorage.getItem('userAuthToken');
  }

  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method: 'POST',
    body: formData,
    headers,
    // Content-Typeは自動設定されるため、ヘッダーに含めない
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        response.status,
        data.error || `HTTP Error: ${response.status}`,
        data,
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      0,
      error instanceof Error ? error.message : 'Unknown error occurred',
      error,
    );
  }
}
