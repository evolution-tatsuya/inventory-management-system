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
  name?: string;           // 登録者名
  companyName?: string | null; // 会社名（企業登録時。任意）
  department?: string | null;  // 部署（企業登録時。任意）
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// User（一般ユーザー）
// ============================================================
export interface User {
  id: string;
  email: string;
  name?: string;           // 表示名（オプション）
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// UserType（ユーザータイプ）
// ============================================================
export type UserType = 'admin' | 'user';

// ============================================================
// Category（カテゴリー）
// ============================================================
export interface Category {
  id: string;
  categoryId?: string;     // カテゴリーID（ユーザー定義）
  name: string;
  subtitle?: string;       // サブタイトル
  imageUrl?: string;       // 画像URL
  cropPositionX?: number;  // 画像のクロップ位置X (0.0 ~ 1.0)
  cropPositionY?: number;  // 画像のクロップ位置Y (0.0 ~ 1.0)
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
  unitId?: string;         // ユニットID
  unitNumber: string;
  partNumber: string;
  partName: string;
  quantity?: number;       // 数量
  price?: number;          // 価格（JPY登録時の手入力価格、または換算不要時の表示価格）
  currency?: string;       // 元通貨（JPY/EUR/USD等）。海外通貨は表示時に当日レートで円換算
  originalPrice?: number;  // 元通貨での価格（currencyがJPY以外のとき使用）
  storageCase?: string;
  notes?: string;
  description?: string;    // 商品説明（詳細モーダルで表示、プロ購入者向け）
  pdfUrl?: string;         // 資料URL（画像またはPDF）
  orderDate?: string;
  expectedArrivalDate?: string;
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
  unitId: string;
  imageUrl: string;
  imageType: string;
  isMain: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// 認証関連
// ============================================================
export interface LoginRequest {
  email: string;
  password: string;
  userType?: 'admin' | 'user'; // デフォルト'admin'（後方互換性のため）
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
  categoryCount: number;
  genreCount: number;
  unitCount: number;
  partCount: number;
  totalStock: number;
  lowStockCount: number;
  lowStockParts?: {
    partNumber: string;
    partName: string;
    genreName: string;
    stockQuantity: number;
  }[];
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
  accountId?: string;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
  userType?: 'admin' | 'user';
  accountId?: string;
}

// ============================================================
// Tenant（テナント / マルチテナント）
// ============================================================
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  licenseKey: string | null;
  stockMode: string;
  status: 'pending' | 'active' | 'suspended';
  // 契約/課金（運営者が総括ページで管理。すべて任意）
  plan: string | null;
  monthlyFee: number | null;
  billingStatus: string | null;
  contractStartDate: string | null;
  nextBillingDate: string | null;
  billingNote: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// システム設定
// ============================================================
export interface SystemSettings {
  id: string;
  systemName: string;
  logoUrl: string | null;
  logoSize?: string; // ロゴサイズ: small / medium / large
  headerColor: string;
  stockMode?: 'shared' | 'perCategory'; // 在庫モード: 全カテゴリー共有 / カテゴリー独立
  createdAt: string;
  updatedAt: string;
}
