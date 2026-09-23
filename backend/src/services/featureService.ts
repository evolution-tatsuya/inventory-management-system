// ============================================================
// featureService: プラン機能フラグの判定
// ============================================================
// Tenant.features（カンマ区切りの機能キー）で、テナントごとに機能をON/OFFする。
// features が null / 空 の場合は「全機能ON」（後方互換：既存テナントは無制限）。
// 上限（limitService）と同じ思想：EC=マスター、在庫=適用（値を受け取って判定）。
// ============================================================

import { prisma } from '../lib/prisma';

// 実在機能キー（EC側と共有する確定版）。ここに無いキーは無視する。
export const FEATURE_KEYS = [
  'stocktake', // 棚卸し
  'csv_import', // CSV一括インポート
  'csv_export', // CSVエクスポート
  'pdf_export', // PDFエクスポート
  'qr_code', // QRコード
  'search', // 横断検索
  'part_detail', // パーツ詳細（商品説明・制作手順・画像/PDF資料）※プロ想定
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

// features 文字列を機能キーの集合に変換。null/空 は「全機能」を意味する。
function parseFeatures(features: string | null): Set<string> | null {
  if (features == null) return null; // null = 全機能ON
  const list = features
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (list.length === 0) return null; // 空文字も全機能ON扱い（誤って全機能を消さない安全側）
  return new Set(list);
}

export const featureService = {
  FEATURE_KEYS,

  // features 文字列を正規化（既知キーのみ・重複除去・順序固定）。EC受け取り時に使う。
  // null / 全機能相当 の場合は null を返す（＝全機能ON・後方互換）。
  normalize(features: unknown): string | null {
    if (features == null) return null;
    let list: string[];
    if (Array.isArray(features)) {
      list = features.map((s) => String(s).trim());
    } else if (typeof features === 'string') {
      list = features.split(',').map((s) => s.trim());
    } else {
      return null;
    }
    const known = FEATURE_KEYS.filter((k) => list.includes(k));
    // 全機能そろっている、または1つも無い → null（全機能ON）に丸める
    if (known.length === 0 || known.length === FEATURE_KEYS.length) return null;
    return known.join(',');
  },

  // テナントで指定機能が有効か。features=null は常に true（全機能ON）。
  async isEnabled(tenantId: string, key: FeatureKey): Promise<boolean> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { features: true },
    });
    if (!tenant) return false;
    const set = parseFeatures(tenant.features);
    if (set === null) return true; // 全機能ON
    return set.has(key);
  },

  // 有効機能の一覧を返す（フロントの出し分け用）。null=全機能。
  async listEnabled(tenantId: string): Promise<FeatureKey[]> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { features: true },
    });
    const set = parseFeatures(tenant?.features ?? null);
    if (set === null) return [...FEATURE_KEYS];
    return FEATURE_KEYS.filter((k) => set.has(k));
  },
};
