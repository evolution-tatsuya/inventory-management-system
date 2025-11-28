// ============================================================
// 階層型在庫管理システム - パーツルート
// ============================================================
// パーツ関連のAPIエンドポイント
// ============================================================

import { Router } from 'express';
import { partController } from '../controllers/partController';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

// ============================================================
// 認証不要（ジャンル内のパーツ一覧取得）
// ============================================================
router.get('/genres/:id/parts', partController.getByGenre);

// ============================================================
// 認証必須（管理者のみ）
// ============================================================
router.get('/admin/parts', requireAuth, partController.getAll);
router.post('/admin/parts', requireAuth, partController.create);
router.put('/admin/parts/order', requireAuth, partController.updateOrder);
router.put('/admin/parts/:id', requireAuth, partController.update);
router.delete('/admin/parts/:id', requireAuth, partController.delete);
router.put('/admin/parts/:partNumber/stock', requireAuth, partController.updateStock);

export default router;
