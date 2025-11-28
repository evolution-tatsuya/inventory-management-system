// ============================================================
// 階層型在庫管理システム - エクスポートルート
// ============================================================
// エクスポート関連のAPIエンドポイント
// ============================================================

import { Router } from 'express';
import { exportController } from '../controllers/exportController';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

// ============================================================
// 認証必須（管理者のみ）
// ============================================================
// CSVエクスポート
router.get('/admin/genres/:id/export/csv', requireAuth, exportController.exportCSV);

// PDFエクスポート
router.get('/admin/genres/:id/export/pdf', requireAuth, exportController.exportPDF);

// CSV一括インポート
router.post('/admin/genres/:id/import/csv', requireAuth, exportController.importCSV);

export default router;
