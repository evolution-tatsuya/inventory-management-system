// ============================================================
// 階層型在庫管理システム - 統計ルート
// ============================================================
// 統計情報取得のエンドポイント定義
// ============================================================

import { Router } from 'express';
import { statsController } from '../controllers/statsController';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

// ============================================================
// 統計情報取得（管理者のみ）
// ============================================================
router.get('/admin/stats', requireAuth, statsController.getStats);

export default router;
