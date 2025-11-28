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
      const parts = await partService.getAll();
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

      const parts = await partService.getByGenre(id);
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
        storageCase,
        orderDate,
        expectedArrivalDate,
        imageUrl,
        notes,
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

      const part = await partService.create({
        genreId,
        unitId,
        unitNumber,
        partNumber,
        partName,
        quantity,
        price,
        storageCase,
        orderDate,
        expectedArrivalDate,
        imageUrl,
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
        storageCase,
        orderDate,
        expectedArrivalDate,
        imageUrl,
        notes,
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

      const part = await partService.update(id, {
        unitNumber,
        partNumber,
        partName,
        quantity,
        price,
        storageCase,
        orderDate,
        expectedArrivalDate,
        imageUrl,
        notes,
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

      await partService.delete(id);
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

      const result = await partService.updateStock(partNumber, stockQuantity);

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
      await partService.updateOrder(orderedIds);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
};
