// ============================================================
// 階層型在庫管理システム - 型定義
// ============================================================
// フロントエンドと完全同期を保つこと
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
  categoryId?: string;
  name: string;
  subtitle?: string;
  imageUrl?: string;
  cropPositionX?: number;
  cropPositionY?: number;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// Genre（ジャンル）
// ============================================================
export interface Genre {
  id: string;
  genreId?: string;        // ジャンルID（ユーザー定義）
  categoryId: string;
  name: string;
  subtitle?: string;       // サブタイトル
  imageUrl?: string;
  cropPositionX?: number;  // 画像のクロップ位置X (0.0 ~ 1.0)
  cropPositionY?: number;  // 画像のクロップ位置Y (0.0 ~ 1.0)
  order: number;
  createdAt: Date;
  updatedAt: Date;
  category?: Category;
}

// ============================================================
// Unit（ユニット）
// ============================================================
export interface Unit {
  id: string;
  genreId: string;
  unitNumber: string;
  unitName: string;
  imageUrl?: string;
  cropPositionX?: number;  // 画像のクロップ位置X (0.0 ~ 1.0)
  cropPositionY?: number;  // 画像のクロップ位置Y (0.0 ~ 1.0)
  partsCount: number;
  createdAt: Date;
  updatedAt: Date;
  genre?: Genre;
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
  quantity?: number;       // 数量
  price?: number;          // 価格
  storageCase?: string;
  notes?: string;
  orderDate?: Date;
  expectedArrivalDate?: Date;
  imageUrl?: string;
  cropPositionX?: number;  // 画像のクロップ位置X (0.0 ~ 1.0)
  cropPositionY?: number;  // 画像のクロップ位置Y (0.0 ~ 1.0)
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
  currentPassword?: string;
  userType?: 'admin' | 'user';
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
  userType?: 'admin' | 'user';
}
