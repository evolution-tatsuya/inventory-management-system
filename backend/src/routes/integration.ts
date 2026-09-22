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

export default router;
