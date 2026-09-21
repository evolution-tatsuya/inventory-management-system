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

export default router;
