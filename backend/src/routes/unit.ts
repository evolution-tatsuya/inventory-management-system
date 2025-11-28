// ============================================================
// Unit Routes
// ============================================================
// ユニット管理のルーティング
// ============================================================

import express from 'express';
import * as unitController from '../controllers/unitController';
import { requireAuth } from '../middleware/requireAuth';

const router = express.Router();

// ============================================================
// 公開エンドポイント
// ============================================================

/**
 * GET /api/genres/:genreId/units
 * ユニット一覧取得（一般ユーザー向け）
 */
router.get('/genres/:genreId/units', unitController.getUnits);

// ============================================================
// 管理者専用エンドポイント
// ============================================================

/**
 * GET /api/admin/units
 * 全ユニット一覧取得（管理画面用）
 */
router.get('/admin/units', requireAuth, unitController.getAllUnits);

/**
 * POST /api/admin/units
 * ユニット作成
 */
router.post('/admin/units', requireAuth, unitController.createUnit);

/**
 * PUT /api/admin/units/order
 * ユニット並び順更新
 */
router.put('/admin/units/order', requireAuth, unitController.updateOrder);

/**
 * PUT /api/admin/units/:id
 * ユニット更新
 */
router.put('/admin/units/:id', requireAuth, unitController.updateUnit);

/**
 * DELETE /api/admin/units/:id
 * ユニット削除
 */
router.delete('/admin/units/:id', requireAuth, unitController.deleteUnit);

export default router;
