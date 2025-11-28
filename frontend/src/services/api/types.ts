// ============================================================
// API Response Types
// ============================================================
// バックエンドAPIレスポンスの型定義
// backend/src/types/index.ts と同期を保つこと
// ============================================================

import type {
  Admin,
  User,
  Category,
  Genre,
  Unit,
  Part,
  PartMaster,
  DashboardStats,
  SearchResult,
} from '../../types';

// ============================================================
// 認証関連レスポンス
// ============================================================

export interface LoginResponse {
  success: boolean;
  token: string; // JWTトークン
  account: Admin | User; // Admin または User
  userType: 'admin' | 'user'; // アカウント種別
}

export interface LogoutResponse {
  success: boolean;
}

export interface SessionResponse {
  authenticated: boolean;
  userId: string;
  email: string;
  userType: 'admin' | 'user';
}

// ============================================================
// CRUD レスポンス
// ============================================================

export interface CategoriesResponse extends Array<Category> {}

export interface CategoryResponse extends Category {}

export interface GenresResponse extends Array<Genre> {}

export interface GenreResponse extends Genre {}

export interface UnitsResponse extends Array<Unit> {}

export interface UnitResponse extends Unit {}

export interface PartsResponse extends Array<Part> {}

export interface PartResponse extends Part {}

export interface PartMasterResponse extends PartMaster {}

// ============================================================
// 検索レスポンス
// ============================================================

export interface SearchResultsResponse extends Array<SearchResult> {}

// ============================================================
// 統計レスポンス
// ============================================================

export interface StatsResponse extends DashboardStats {}

// ============================================================
// 画像アップロードレスポンス
// ============================================================

export interface ImageUploadResponse {
  imageUrl: string;
  publicId: string;
}

// ============================================================
// エクスポート/インポートレスポンス
// ============================================================

export interface ImportResponse {
  success: boolean;
  imported: number;
  failed: number;
}

// ============================================================
// アカウント設定レスポンス
// ============================================================

export interface UpdateEmailResponse {
  success: boolean;
  admin: Admin;
}

export interface UpdatePasswordResponse {
  success: boolean;
}
