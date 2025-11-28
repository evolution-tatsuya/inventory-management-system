// ============================================================
// 階層型在庫管理システム - バリデーションヘルパー
// ============================================================
// データ検証用のユーティリティ関数
// ============================================================

// ============================================================
// メールアドレス検証
// ============================================================
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// ============================================================
// パスワード検証（8文字以上）
// ============================================================
export const validatePassword = (password: string): boolean => {
  return password.length >= 8;
};

// ============================================================
// 品番検証（空でないこと）
// ============================================================
export const validatePartNumber = (partNumber: string): boolean => {
  return partNumber.trim().length > 0;
};

// ============================================================
// 在庫数検証（0以上の整数）
// ============================================================
export const validateStockQuantity = (quantity: number): boolean => {
  return Number.isInteger(quantity) && quantity >= 0;
};

// ============================================================
// カテゴリー名検証（空でないこと、255文字以内）
// ============================================================
export const validateCategoryName = (name: string): boolean => {
  return name.trim().length > 0 && name.length <= 255;
};

// ============================================================
// ジャンル名検証（空でないこと、255文字以内）
// ============================================================
export const validateGenreName = (name: string): boolean => {
  return name.trim().length > 0 && name.length <= 255;
};

// ============================================================
// パーツ名検証（空でないこと、255文字以内）
// ============================================================
export const validatePartName = (name: string): boolean => {
  return name.trim().length > 0 && name.length <= 255;
};

// ============================================================
// 収納ケース番号検証（任意、255文字以内）
// ============================================================
export const validateStorageCase = (storageCase?: string): boolean => {
  if (!storageCase) return true; // 任意項目
  return storageCase.trim().length > 0 && storageCase.length <= 255;
};

// ============================================================
// URL検証（任意、URL形式）
// ============================================================
export const validateUrl = (url?: string): boolean => {
  if (!url) return true; // 任意項目
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// ============================================================
// ID検証（CUID形式）
// ============================================================
export const validateId = (id: string): boolean => {
  // CUIDは25文字の英数字
  return /^[a-z0-9]{25}$/i.test(id);
};

// ============================================================
// 日付検証（ISO 8601形式）
// ============================================================
export const validateDate = (date?: string): boolean => {
  if (!date) return true; // 任意項目
  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime());
};

// ============================================================
// 汎用バリデーションエラークラス
// ============================================================
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
