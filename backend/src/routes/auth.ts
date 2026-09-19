// ============================================================
// 階層型在庫管理システム - 認証ルート
// ============================================================
// 認証関連のエンドポイント定義
// ============================================================

import { Router } from 'express';
import { authController } from '../controllers/authController';

// mergeParams: true で親ルーターの :slug を受け取る（/api/t/:slug/auth/...）
const router = Router({ mergeParams: true });

// ============================================================
// POST /api/t/:slug/auth/login - テナント配下ログイン
// ============================================================
router.post('/login', authController.login);

// ============================================================
// POST /api/auth/logout - ログアウト
// ============================================================
router.post('/logout', authController.logout);

// ============================================================
// GET /api/auth/session - セッション確認
// ============================================================
router.get('/session', authController.getSession);

export default router;
