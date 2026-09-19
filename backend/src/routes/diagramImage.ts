// ============================================================
// DiagramImage Routes
// ============================================================
// 展開図のルート定義（1ユニット最大10枚対応）
// ============================================================

import express from 'express';
import {
  getDiagramImage,
  upsertDiagramImage,
  deleteDiagramImage,
  listDiagramImages,
  addDiagramImage,
  updateDiagramImageById,
  deleteDiagramImageById,
  setMainDiagramImage,
  reorderDiagramImages,
} from '../controllers/diagramImageController';
import { requireAuth } from '../middleware/requireAuth';
import { publicTenant } from '../middleware/tenantContext';

const router = express.Router({ mergeParams: true });

// ============================================================
// Public Routes（認証不要）
// ============================================================

/**
 * GET /api/units/:unitId/diagrams
 * ユニットの展開図を全件取得（複数枚）
 */
router.get('/units/:unitId/diagrams', publicTenant, listDiagramImages);

/**
 * GET /api/units/:unitId/diagram
 * ユニットの展開図を取得（後方互換：メイン1枚）
 */
router.get('/units/:unitId/diagram', publicTenant, getDiagramImage);

// ============================================================
// Admin Routes（認証必須）
// ============================================================

// --- 複数枚対応 ---

/**
 * POST /api/admin/units/:unitId/diagrams
 * 展開図を1枚追加
 */
router.post('/admin/units/:unitId/diagrams', requireAuth, addDiagramImage);

/**
 * PUT /api/admin/units/:unitId/diagrams/main
 * メイン展開図を設定
 */
router.put('/admin/units/:unitId/diagrams/main', requireAuth, setMainDiagramImage);

/**
 * PUT /api/admin/units/:unitId/diagrams/order
 * 展開図の並び順を一括更新
 */
router.put('/admin/units/:unitId/diagrams/order', requireAuth, reorderDiagramImages);

/**
 * PUT /api/admin/diagrams/:id
 * 展開図を1枚更新（画像差し替え）
 */
router.put('/admin/diagrams/:id', requireAuth, updateDiagramImageById);

/**
 * DELETE /api/admin/diagrams/:id
 * 展開図を1枚削除
 */
router.delete('/admin/diagrams/:id', requireAuth, deleteDiagramImageById);

// --- 後方互換（単数：メイン1枚） ---

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
