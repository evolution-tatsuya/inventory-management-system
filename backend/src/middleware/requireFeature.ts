// ============================================================
// requireFeature: プラン機能フラグでエンドポイントをガードする
// ============================================================
// tenantContext / requireAuth が先に走って req.tenantId を確立している前提。
// 指定機能がテナントで無効なら 403 で止める（features=null は全機能ONで通過）。
// 上限（limitService）と同型のブロック。EC=マスター、在庫=適用。
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { featureService, FeatureKey } from '../services/featureService';
import { AppError } from './errorHandler';

// 機能キー → 顧客向け表示名（403メッセージ用）
const FEATURE_LABELS: Record<FeatureKey, string> = {
  stocktake: '棚卸し',
  csv_import: 'CSVインポート',
  csv_export: 'CSVエクスポート',
  pdf_export: 'PDFエクスポート',
  qr_code: 'QRコード',
  search: '検索',
  part_detail: 'パーツ詳細（説明・資料）',
};

export const requireFeature = (key: FeatureKey) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = (req as any).tenantId as string | undefined;
      if (!tenantId) {
        // tenantContext/requireAuth が先に走っていない = 設定ミス。安全側で拒否。
        throw new AppError('テナントが特定できません', 400);
      }
      const enabled = await featureService.isEnabled(tenantId, key);
      if (!enabled) {
        throw new AppError(
          `${FEATURE_LABELS[key]}機能は現在のプランではご利用いただけません。プランのアップグレードが必要です。`,
          403,
        );
      }
      next();
    } catch (e) {
      next(e);
    }
  };
};
