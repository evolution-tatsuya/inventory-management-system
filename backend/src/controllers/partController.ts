// ============================================================
// 階層型在庫管理システム - パーツコントローラー
// ============================================================
// パーツ関連のHTTPリクエスト処理
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { partService } from '../services/partService';
import {
  validateId,
  validatePartNumber,
  validatePartName,
  validateStockQuantity,
  validateStorageCase,
  validateUrl,
} from '../utils/validators';

// ============================================================
// パーツコントローラー
// ============================================================
export const partController = {
  // 全パーツ一覧取得（管理画面用）
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const parts = await partService.getAll(req.tenantId!);
      res.json(parts);
    } catch (error) {
      next(error);
    }
  },

  // ジャンル内のパーツ一覧取得
  async getByGenre(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!validateId(id)) {
        return res.status(400).json({ error: 'Invalid genre ID' });
      }

      const parts = await partService.getByGenre(req.tenantId!, id);
      res.json(parts);
    } catch (error) {
      next(error);
    }
  },

  // パーツ作成
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        genreId,
        unitId,
        unitNumber,
        partNumber,
        partName,
        quantity,
        price,
        currency,
        originalPrice,
        storageCase,
        orderDate,
        expectedArrivalDate,
        imageUrl,
        notes,
        stockQuantity, // 在庫数量を追加
      } = req.body;

      // バリデーション
      if (!validateId(genreId)) {
        return res.status(400).json({ error: 'Invalid genre ID' });
      }
      if (unitId && !validateId(unitId)) {
        return res.status(400).json({ error: 'Invalid unit ID' });
      }
      if (!validatePartNumber(partNumber)) {
        return res.status(400).json({ error: 'Invalid part number' });
      }
      if (!validatePartName(partName)) {
        return res.status(400).json({ error: 'Invalid part name' });
      }
      if (storageCase && !validateStorageCase(storageCase)) {
        return res.status(400).json({ error: 'Invalid storage case' });
      }
      if (imageUrl && !validateUrl(imageUrl)) {
        return res.status(400).json({ error: 'Invalid image URL' });
      }
      if (stockQuantity !== undefined && !validateStockQuantity(stockQuantity)) {
        return res.status(400).json({ error: 'Invalid stock quantity' });
      }

      const part = await partService.create(req.tenantId!, {
        genreId,
        unitId,
        unitNumber,
        partNumber,
        partName,
        quantity,
        price,
        currency,
        originalPrice,
        storageCase,
        orderDate,
        expectedArrivalDate,
        imageUrl,
        stockQuantity, // 在庫数量を渡す
        notes,
      });

      res.status(201).json(part);
    } catch (error) {
      next(error);
    }
  },

  // パーツ更新
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const {
        unitNumber,
        partNumber,
        partName,
        quantity,
        price,
        currency,
        originalPrice,
        storageCase,
        orderDate,
        expectedArrivalDate,
        imageUrl,
        notes,
        cropPositionX,
        cropPositionY,
        stockQuantity, // 在庫数量を追加
      } = req.body;

      if (!validateId(id)) {
        return res.status(400).json({ error: 'Invalid part ID' });
      }
      if (partNumber && !validatePartNumber(partNumber)) {
        return res.status(400).json({ error: 'Invalid part number' });
      }
      if (partName && !validatePartName(partName)) {
        return res.status(400).json({ error: 'Invalid part name' });
      }
      if (storageCase && !validateStorageCase(storageCase)) {
        return res.status(400).json({ error: 'Invalid storage case' });
      }
      if (imageUrl && !validateUrl(imageUrl)) {
        return res.status(400).json({ error: 'Invalid image URL' });
      }
      if (stockQuantity !== undefined && !validateStockQuantity(stockQuantity)) {
        return res.status(400).json({ error: 'Invalid stock quantity' });
      }

      const part = await partService.update(req.tenantId!, id, {
        unitNumber,
        partNumber,
        partName,
        quantity,
        price,
        currency,
        originalPrice,
        storageCase,
        orderDate,
        expectedArrivalDate,
        imageUrl,
        notes,
        cropPositionX,
        cropPositionY,
        stockQuantity, // 在庫数量を渡す
      });

      res.json(part);
    } catch (error) {
      next(error);
    }
  },

  // パーツ削除
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!validateId(id)) {
        return res.status(400).json({ error: 'Invalid part ID' });
      }

      await partService.delete(req.tenantId!, id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  // 在庫数更新（同一品番すべてに反映）
  async updateStock(req: Request, res: Response, next: NextFunction) {
    try {
      const { partNumber } = req.params;
      const { stockQuantity } = req.body;

      if (!validatePartNumber(partNumber)) {
        return res.status(400).json({ error: 'Invalid part number' });
      }
      if (!validateStockQuantity(stockQuantity)) {
        return res.status(400).json({ error: 'Invalid stock quantity' });
      }

      const result = await partService.updateStock(req.tenantId!, partNumber, stockQuantity);

      res.json({
        success: true,
        partNumber: result.partMaster.partNumber,
        stockQuantity: result.partMaster.stockQuantity,
        affectedParts: result.affectedCount,
      });
    } catch (error) {
      next(error);
    }
  },

  // パーツ並び順更新
  async updateOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds)) {
        return res.status(400).json({ error: 'orderedIds must be an array' });
      }
      await partService.updateOrder(req.tenantId!, orderedIds);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
};
