// ============================================================
// Owner Routes（運営者向け総括）
// ============================================================
// 在庫モードの取得・切替など、運営者(オーナー)が管理する設定。
// 現状は管理者認証で保護（将来マスターアカウント専用にする想定）。
// ============================================================
import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { stockModeService } from '../services/stockModeService';

const router = Router({ mergeParams: true });

// 在庫モード取得
router.get(
  '/admin/owner/stock-mode',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const mode = await stockModeService.getMode(req.tenantId!);
      res.json({ mode });
    } catch (e) {
      next(e);
    }
  },
);

// 在庫モード切替（perCategoryに切り替える時は移行も実行）
router.put(
  '/admin/owner/stock-mode',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mode } = req.body;
      if (mode !== 'shared' && mode !== 'perCategory') {
        return res.status(400).json({ error: 'mode must be shared or perCategory' });
      }
      const result = await stockModeService.setMode(req.tenantId!, mode);
      res.json({ success: true, ...result });
    } catch (e) {
      next(e);
    }
  },
);

export default router;
