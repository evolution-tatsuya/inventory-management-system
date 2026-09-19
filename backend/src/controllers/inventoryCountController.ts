// ============================================================
// InventoryCount Controller（棚卸し）
// ============================================================
import { Request, Response, NextFunction } from 'express';
import { inventoryCountService } from '../services/inventoryCountService';

export const inventoryCountController = {
  /**
   * 棚卸し実数の保存
   * POST /api/admin/inventory-count/save
   * body: { items: [{ partId, countedQty, storageCase? }] }
   */
  async save(req: Request, res: Response, next: NextFunction) {
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'items must be an array' });
      }
      // バリデーション: countedQtyは0以上の整数
      for (const it of items) {
        if (
          typeof it.partId !== 'string' ||
          !Number.isInteger(it.countedQty) ||
          it.countedQty < 0
        ) {
          return res.status(400).json({ error: 'Invalid item in items' });
        }
      }
      const countedBy = (req as any).admin?.email ?? null;
      const result = await inventoryCountService.saveCounts(req.tenantId!, items, countedBy);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * 棚卸し履歴の取得
   * GET /api/admin/inventory-count/history
   */
  async history(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 200;
      const logs = await inventoryCountService.getHistory(req.tenantId!, limit);
      res.json(logs);
    } catch (error) {
      next(error);
    }
  },
};
