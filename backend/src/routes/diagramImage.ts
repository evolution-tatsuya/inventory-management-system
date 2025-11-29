// ============================================================
// DiagramImage Routes
// ============================================================
// 展開図のルート定義
// ============================================================

import express from 'express';
import {
  getDiagramImage,
  upsertDiagramImage,
  deleteDiagramImage,
} from '../controllers/diagramImageController';
import { requireAuth } from '../middleware/requireAuth';

const router = express.Router();

// ============================================================
// Public Routes（認証不要）
// ============================================================

/**
 * GET /api/units/:unitId/diagram
 * ユニットの展開図を取得
 */
router.get('/units/:unitId/diagram', getDiagramImage);

// ============================================================
// Admin Routes（認証必須）
// ============================================================

/**
 * PUT /api/admin/units/:unitId/diagram
 * 展開図を作成または更新
 */
router.put('/admin/units/:unitId/diagram', requireAuth, upsertDiagramImage);

/**
 * DELETE /api/admin/units/:unitId/diagram
 * 展開図を削除
 */
router.delete('/admin/units/:unitId/diagram', requireAuth, deleteDiagramImage);

export default router;
