// ============================================================
// API Endpoints - エンドポイント定義
// ============================================================
// バックエンドAPIのエンドポイント一覧（全26エンドポイント）
// docs/API_ENDPOINTS.md と同期を保つこと
// ============================================================

/**
 * 認証エンドポイント（3）
 */
export const AUTH_ENDPOINTS = {
  LOGIN: '/api/auth/login',
  LOGOUT: '/api/auth/logout',
  SESSION: '/api/auth/session',
} as const;

/**
 * カテゴリー管理エンドポイント（4）
 */
export const CATEGORY_ENDPOINTS = {
  LIST: '/api/categories',
  CREATE: '/api/admin/categories',
  UPDATE: (id: string) => `/api/admin/categories/${id}`,
  DELETE: (id: string) => `/api/admin/categories/${id}`,
  UPDATE_ORDER: '/api/admin/categories/order',
} as const;

/**
 * ジャンル管理エンドポイント（5）
 */
export const GENRE_ENDPOINTS = {
  LIST: (categoryId: string) => `/api/categories/${categoryId}/genres`,
  LIST_ALL: '/api/admin/genres',
  CREATE: '/api/admin/genres',
  UPDATE: (id: string) => `/api/admin/genres/${id}`,
  DELETE: (id: string) => `/api/admin/genres/${id}`,
  UPDATE_ORDER: '/api/admin/genres/order',
} as const;

/**
 * ユニット管理エンドポイント（5）
 */
export const UNIT_ENDPOINTS = {
  LIST: (genreId: string) => `/api/genres/${genreId}/units`,
  LIST_ALL: '/api/admin/units',
  CREATE: '/api/admin/units',
  UPDATE: (id: string) => `/api/admin/units/${id}`,
  DELETE: (id: string) => `/api/admin/units/${id}`,
  UPDATE_ORDER: '/api/admin/units/order',
} as const;

/**
 * パーツ管理エンドポイント（6）
 */
export const PART_ENDPOINTS = {
  LIST: (genreId: string) => `/api/genres/${genreId}/parts`,
  LIST_ALL: '/api/admin/parts',
  CREATE: '/api/admin/parts',
  UPDATE: (id: string) => `/api/admin/parts/${id}`,
  DELETE: (id: string) => `/api/admin/parts/${id}`,
  UPDATE_STOCK: (partNumber: string) => `/api/admin/parts/${partNumber}/stock`,
  UPDATE_ORDER: '/api/admin/parts/order',
} as const;

/**
 * 検索エンドポイント（2）
 */
export const SEARCH_ENDPOINTS = {
  BY_STORAGE_CASE: (caseNumber: string) =>
    `/api/search/by-storage-case?case=${encodeURIComponent(caseNumber)}`,
  BY_PART_NUMBER: (partNumber: string) =>
    `/api/search/by-part-number?partNumber=${encodeURIComponent(partNumber)}`,
} as const;

/**
 * 統計エンドポイント（1）
 */
export const STATS_ENDPOINTS = {
  GET: '/api/admin/stats',
} as const;

/**
 * エクスポート/インポートエンドポイント（3）
 */
export const EXPORT_ENDPOINTS = {
  CSV: (genreId: string) => `/api/admin/genres/${genreId}/export/csv`,
  PDF: (genreId: string) => `/api/admin/genres/${genreId}/export/pdf`,
  IMPORT_CSV: (genreId: string) => `/api/admin/genres/${genreId}/import/csv`,
} as const;

/**
 * 画像管理エンドポイント（2）
 */
export const IMAGE_ENDPOINTS = {
  UPLOAD: '/api/admin/images/upload',
  DELETE: (id: string) => `/api/admin/images/${id}`,
} as const;

/**
 * アカウント設定エンドポイント（3）
 */
export const ACCOUNT_ENDPOINTS = {
  GET_ACCOUNT: (userType: string) => `/api/admin/account/${userType}`,
  UPDATE_EMAIL: '/api/admin/account/email',
  UPDATE_PASSWORD: '/api/admin/account/password',
} as const;

/**
 * 全エンドポイント一覧（エクスポート用）
 */
export const API_ENDPOINTS = {
  AUTH: AUTH_ENDPOINTS,
  CATEGORIES: CATEGORY_ENDPOINTS,
  GENRES: GENRE_ENDPOINTS,
  UNITS: UNIT_ENDPOINTS,
  PARTS: PART_ENDPOINTS,
  SEARCH: SEARCH_ENDPOINTS,
  STATS: STATS_ENDPOINTS,
  EXPORT: EXPORT_ENDPOINTS,
  IMAGES: IMAGE_ENDPOINTS,
  ACCOUNT: ACCOUNT_ENDPOINTS,
} as const;
