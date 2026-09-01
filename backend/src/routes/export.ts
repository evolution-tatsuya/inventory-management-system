// ============================================================
// 階層型在庫管理システム - エクスポートルート
// ============================================================
// エクスポート関連のAPIエンドポイント
// ============================================================

import { Router } from 'express';
import { exportController, uploadCSVMiddleware } from '../controllers/exportController';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

// ============================================================
// 認証必須（管理者のみ）
// ============================================================
// CSVエクスポート
router.get('/admin/genres/:id/export/csv', requireAuth, exportController.exportCSV);

// PDFエクスポート
router.get('/admin/genres/:id/export/pdf', requireAuth, exportController.exportPDF);

// CSV/Excel一括インポート（FormData対応、multerミドルウェア使用）
router.post(
  '/admin/genres/:id/import/csv',
  requireAuth,
  uploadCSVMiddleware,
  exportController.importCSV,
);

export default router;
