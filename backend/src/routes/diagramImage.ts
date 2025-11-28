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
 * GET /api/genres/:genreId/diagram
 * ジャンルの展開図を取得
 */
router.get('/genres/:genreId/diagram', getDiagramImage);

// ============================================================
// Admin Routes（認証必須）
// ============================================================

/**
 * PUT /api/admin/genres/:genreId/diagram
 * 展開図を作成または更新
 */
router.put('/admin/genres/:genreId/diagram', requireAuth, upsertDiagramImage);

/**
 * DELETE /api/admin/genres/:genreId/diagram
 * 展開図を削除
 */
router.delete('/admin/genres/:genreId/diagram', requireAuth, deleteDiagramImage);

export default router;
