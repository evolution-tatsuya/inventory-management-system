// ============================================================
// EC連携ルート（/api/integration/*）
// ============================================================
// EC専用シークレット（x-integration-key）で保護。運営者JWTとは別系統。
// ============================================================

import { Router } from 'express';
import { integrationController } from '../controllers/integrationController';
import { requireIntegration } from '../middleware/requireIntegration';

const router = Router();

// POST /api/integration/provision - 注文からテナント発行（冪等）
router.post('/provision', requireIntegration, integrationController.provision);

// POST /api/integration/plan-change - 既存テナントのプラン変更（上限の上/下）
router.post('/plan-change', requireIntegration, integrationController.planChange);

// POST /api/integration/suspend - 解約/一時停止でテナントを停止（冪等・データ保持）
router.post('/suspend', requireIntegration, integrationController.suspend);

// POST /api/integration/unsuspend - 再契約で停止中テナントを再開（冪等）
router.post('/unsuspend', requireIntegration, integrationController.unsuspend);

// POST /api/integration/reactivate - 解約後の再購入で旧テナント（データ）を引き継ぐ（冪等）
router.post('/reactivate', requireIntegration, integrationController.reactivate);

export default router;
