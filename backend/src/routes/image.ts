// ============================================================
// 階層型在庫管理システム - 画像管理ルート
// ============================================================
// 画像アップロード・削除機能
// ============================================================

import { Router } from 'express';
import { imageController, imageUploadMiddleware } from '../controllers/imageController';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

// ============================================================
// 画像アップロード
// POST /api/admin/images/upload
// ============================================================
router.post(
  '/admin/images/upload',
  requireAuth,
  imageUploadMiddleware,
  imageController.uploadImage
);

// ============================================================
// 画像削除
// DELETE /api/admin/images/:id
// ============================================================
router.delete('/admin/images/:id', requireAuth, imageController.deleteImage);

export default router;
