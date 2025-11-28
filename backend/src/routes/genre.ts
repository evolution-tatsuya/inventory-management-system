// ============================================================
// 階層型在庫管理システム - ジャンルルート
// ============================================================
// ジャンル関連のAPIエンドポイント
// ============================================================

import { Router } from 'express';
import { genreController } from '../controllers/genreController';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

// ============================================================
// 認証不要（カテゴリー内のジャンル一覧取得）
// ============================================================
router.get('/categories/:id/genres', genreController.getByCategory);

// ============================================================
// 認証必須（管理者のみ）
// ============================================================
router.get('/admin/genres', requireAuth, genreController.getAll);
router.post('/admin/genres', requireAuth, genreController.create);
router.put('/admin/genres/order', requireAuth, genreController.updateOrder);
router.put('/admin/genres/:id', requireAuth, genreController.update);
router.delete('/admin/genres/:id', requireAuth, genreController.delete);

export default router;
