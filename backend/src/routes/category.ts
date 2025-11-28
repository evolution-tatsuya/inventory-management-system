// ============================================================
// 階層型在庫管理システム - カテゴリールート
// ============================================================
// カテゴリー関連のエンドポイント定義
// ============================================================

import { Router } from 'express';
import { categoryController } from '../controllers/categoryController';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

// ============================================================
// GET /api/categories - カテゴリー一覧取得（認証不要）
// ============================================================
router.get('/categories', categoryController.getAll);

// ============================================================
// POST /api/admin/categories - カテゴリー作成（認証必須）
// ============================================================
router.post('/admin/categories', requireAuth, categoryController.create);

// ============================================================
// PUT /api/admin/categories/order - カテゴリー並び順更新（認証必須）
// ※ :id より先に定義する必要がある
// ============================================================
router.put('/admin/categories/order', requireAuth, categoryController.updateOrder);

// ============================================================
// PUT /api/admin/categories/:id - カテゴリー更新（認証必須）
// ============================================================
router.put('/admin/categories/:id', requireAuth, categoryController.update);

// ============================================================
// DELETE /api/admin/categories/:id - カテゴリー削除（認証必須）
// ============================================================
router.delete('/admin/categories/:id', requireAuth, categoryController.delete);

export default router;
