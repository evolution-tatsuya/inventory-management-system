// ============================================================
// InventoryCount Routes（棚卸し）
// ============================================================
import { Router } from 'express';
import { inventoryCountController } from '../controllers/inventoryCountController';
import { requireAuth } from '../middleware/requireAuth';

const router = Router({ mergeParams: true });

// 棚卸し実数の保存（在庫上書き＋履歴記録）
router.post('/admin/inventory-count/save', requireAuth, inventoryCountController.save);

// 棚卸し履歴の取得
router.get('/admin/inventory-count/history', requireAuth, inventoryCountController.history);

export default router;
