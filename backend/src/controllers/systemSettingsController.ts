// ============================================================
// 階層型在庫管理システム - システム設定コントローラー
// ============================================================
// システム設定のHTTPリクエスト処理
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { systemSettingsService } from '../services/systemSettingsService';
import { featureService } from '../services/featureService';

// ============================================================
// システム設定コントローラー
// ============================================================
export const systemSettingsController = {
  /**
   * システム設定取得
   * GET /api/system-settings
   */
  async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await systemSettingsService.getSettings(req.tenantId!);
      // 有効機能一覧を同梱（フロントの機能出し分け用。null=全機能相当は全キーが返る）
      const features = await featureService.listEnabled(req.tenantId!);
      res.json({ ...settings, features });
    } catch (error) {
      next(error);
    }
  },

  /**
   * システム設定更新
   * PUT /api/admin/system-settings
   */
  async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const { systemName, logoUrl, logoSize, headerColor } = req.body;
      const settings = await systemSettingsService.updateSettings(req.tenantId!, {
        systemName,
        logoUrl,
        logoSize,
        headerColor,
      });
      res.json(settings);
    } catch (error) {
      next(error);
    }
  },
};
