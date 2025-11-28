// ============================================================
// 階層型在庫管理システム - アカウントルート
// ============================================================
// アカウント設定エンドポイント定義
// ============================================================

import { Router } from 'express';
import { accountController } from '../controllers/accountController';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

// デバッグ用ミドルウェア
router.use((req, res, next) => {
  console.log('🔍 Account Router Debug:', {
    method: req.method,
    path: req.path,
    params: req.params,
    query: req.query,
  });
  next();
});

// ============================================================
// アカウント設定エンドポイント
// ============================================================
// GET /api/admin/account/list/:userType - アカウント一覧取得（管理者専用）
router.get('/list/:userType', requireAuth, accountController.getAllAccounts);

// GET /api/admin/account/:userType - アカウント情報取得
router.get('/:userType', requireAuth, accountController.getAccount);

// PUT /api/admin/account/email - メールアドレス変更
router.put('/email', requireAuth, accountController.changeEmail);

// PUT /api/admin/account/password - パスワード変更
router.put('/password', requireAuth, accountController.changePassword);

// PUT /api/admin/account/displayname - ユーザー名変更
router.put('/displayname', requireAuth, accountController.changeDisplayName);

export default router;
