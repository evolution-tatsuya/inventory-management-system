// ============================================================
// 階層型在庫管理システム - 統計コントローラー
// ============================================================
// 統計情報取得のエンドポイント処理
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { statsService } from '../services/statsService';

// ============================================================
// 統計コントローラー
// ============================================================
export const statsController = {
  /**
   * 統計情報を取得
   * GET /api/admin/stats
   */
  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await statsService.getStats();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  },
};
