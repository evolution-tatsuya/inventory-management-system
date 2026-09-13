// ============================================================
// 階層型在庫管理システム - システム設定コントローラー
// ============================================================
// システム設定のHTTPリクエスト処理
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { systemSettingsService } from '../services/systemSettingsService';

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
      const settings = await systemSettingsService.getSettings();
      res.json(settings);
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
      const settings = await systemSettingsService.updateSettings({
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
