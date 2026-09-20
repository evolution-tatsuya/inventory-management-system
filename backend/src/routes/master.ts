// ============================================================
// Master Routes（運営者=master のテナント管理）
// ============================================================
// /api/master/* にマウント。全て requireMaster で保護（全テナント横断）。
// ※ /api/master/login（認証前）は index.ts でトップレベル登録済み。
// ※ ライセンスキー有効化（購入者用・無認証）は index.ts で /api/tenants/activate。
// ============================================================
import { Router } from 'express';
import { requireMaster } from '../middleware/requireMaster';
import { masterController } from '../controllers/masterController';

const router = Router();

router.get('/tenants', requireMaster, masterController.listTenants);
router.post('/tenants', requireMaster, masterController.createTenant);
router.get('/summary', requireMaster, masterController.getSummary);
router.get('/tenants/:id', requireMaster, masterController.getTenantDetail);
router.get('/tenants/:id/backup', requireMaster, masterController.backup);
router.put('/tenants/:id/status', requireMaster, masterController.setStatus);
router.put('/tenants/:id/billing', requireMaster, masterController.updateBilling);
router.post('/tenants/:id/regenerate-key', requireMaster, masterController.regenerateKey);
router.delete('/tenants/:id', requireMaster, masterController.deleteTenant);

export default router;
