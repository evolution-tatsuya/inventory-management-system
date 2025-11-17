// ============================================================
// 階層型在庫管理システム - 型定義
// ============================================================
// バックエンドと完全同期を保つこと
// ============================================================

// ============================================================
// Admin（管理者）
// ============================================================
export interface Admin {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// Category（カテゴリー）
// ============================================================
export interface Category {
  id: string;
  name: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// Genre（ジャンル）
// ============================================================
export interface Genre {
  id: string;
  categoryId: string;
  name: string;
  imageUrl?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  category?: Category;
}

// ============================================================
// Part（パーツ）
// ============================================================
export interface Part {
  id: string;
  genreId: string;
  unitNumber: string;
  partNumber: string;
  partName: string;
  storageCase?: string;
  notes?: string;
  orderDate?: Date;
  expectedArrivalDate?: Date;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  genre?: Genre;
  partMaster?: PartMaster;
}

// ============================================================
// PartMaster（在庫マスター）
// ============================================================
export interface PartMaster {
  id: string;
  partNumber: string;
  stockQuantity: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// DiagramImage（展開図）
// ============================================================
export interface DiagramImage {
  id: string;
  genreId: string;
  imageUrl: string;
  imageType: 'diagram';
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// 認証関連
// ============================================================
export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  admin: Admin;
  message: string;
}

export interface SessionResponse {
  authenticated: boolean;
  admin?: Admin;
}

// ============================================================
// 統計情報
// ============================================================
export interface DashboardStats {
  categoriesCount: number;
  genresCount: number;
  partsCount: number;
  totalStock: number;
}

// ============================================================
// 検索関連
// ============================================================
export interface SearchResult {
  part: Part;
  genre: Genre;
  category: Category;
}

// ============================================================
// エクスポート関連
// ============================================================
export interface ExportOptions {
  genreId: string;
  format: 'csv' | 'pdf';
}

// ============================================================
// アカウント設定
// ============================================================
export interface UpdateEmailRequest {
  newEmail: string;
  currentPassword: string;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
