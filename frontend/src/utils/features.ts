// ============================================================
// 機能フラグ判定ヘルパー（フロント）
// ============================================================
// system-settings の features（有効機能キー一覧）を見て、機能の表示/非表示を判定する。
// features が未定義/空 の場合は「全機能ON」（後方互換：バックエンドと同じ思想）。
// ============================================================

export type FeatureKey =
  | 'stocktake'
  | 'csv_import'
  | 'csv_export'
  | 'pdf_export'
  | 'qr_code'
  | 'search'
  | 'part_detail';

// 指定機能が有効か。features 未指定/空 は全機能ONとみなす。
export function hasFeature(
  features: string[] | undefined | null,
  key: FeatureKey,
): boolean {
  if (features == null || features.length === 0) return true; // 全機能ON
  return features.includes(key);
}
