// ============================================================
// 階層型在庫管理システム - エクスポートルート
// ============================================================
// エクスポート関連のAPIエンドポイント
// ============================================================

import { Router } from 'express';
import { exportController, uploadCSVMiddleware } from '../controllers/exportController';
import { requireAuth } from '../middleware/requireAuth';
import { requireFeature } from '../middleware/requireFeature';

const router = Router({ mergeParams: true });

// ============================================================
// 認証必須（管理者のみ）＋プラン機能フラグ
// ============================================================
// CSVエクスポート
router.get(
  '/admin/genres/:id/export/csv',
  requireAuth,
  requireFeature('csv_export'),
  exportController.exportCSV,
);

// PDFエクスポート
router.get(
  '/admin/genres/:id/export/pdf',
  requireAuth,
  requireFeature('pdf_export'),
  exportController.exportPDF,
);

// CSV/Excel一括インポート（FormData対応、multerミドルウェア使用）
router.post(
  '/admin/genres/:id/import/csv',
  requireAuth,
  requireFeature('csv_import'),
  uploadCSVMiddleware,
  exportController.importCSV,
);

export default router;
