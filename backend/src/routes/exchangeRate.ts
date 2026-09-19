// ============================================================
// 階層型在庫管理システム - 為替レートルート
// ============================================================
// 当日の元通貨→日本円レートを提供（認証不要 - 一般ユーザーの円換算表示に必要）
// ============================================================

import { Router } from 'express';
import { exchangeRateController } from '../controllers/exchangeRateController';
import { publicTenant } from '../middleware/tenantContext';

const router = Router({ mergeParams: true });

// 当日の為替レート取得（認証不要）
router.get('/exchange-rates', exchangeRateController.getRates);

export default router;
