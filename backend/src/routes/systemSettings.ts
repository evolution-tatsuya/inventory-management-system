// ============================================================
// 階層型在庫管理システム - システム設定ルート
// ============================================================
// システム設定のエンドポイント定義
// ============================================================

import { Router } from 'express';
import { systemSettingsController } from '../controllers/systemSettingsController';
import { requireAuth } from '../middleware/requireAuth';
import { publicTenant } from '../middleware/tenantContext';

const router = Router({ mergeParams: true });

// ============================================================
// システム設定取得（認証不要 - 一般ユーザーも表示に必要）
// ============================================================
router.get('/system-settings', publicTenant, systemSettingsController.getSettings);

// ============================================================
// システム設定更新（管理者のみ）
// ============================================================
router.put('/admin/system-settings', requireAuth, systemSettingsController.updateSettings);

export default router;
