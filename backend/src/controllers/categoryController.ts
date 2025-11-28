// ============================================================
// 階層型在庫管理システム - カテゴリーコントローラー
// ============================================================
// カテゴリーエンドポイントの処理
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { categoryService } from '../services/categoryService';
import { validateCategoryName, validateId } from '../utils/validators';

// ============================================================
// カテゴリーコントローラー
// ============================================================
export const categoryController = {
  // ============================================================
  // カテゴリー一覧取得
  // ============================================================
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await categoryService.getAll();
      res.json(categories);
    } catch (error) {
      next(error);
    }
  },

  // ============================================================
  // カテゴリー作成
  // ============================================================
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, categoryId, subtitle, createdAt } = req.body;

      // バリデーション
      if (!validateCategoryName(name)) {
        return res.status(400).json({
          error: 'Invalid category name (must be 1-255 characters)',
        });
      }

      const category = await categoryService.create({
        name,
        categoryId,
        subtitle,
        createdAt: createdAt ? new Date(createdAt) : undefined,
      });
      res.status(201).json(category);
    } catch (error: any) {
      if (error.message === 'Category name already exists') {
        return res.status(409).json({ error: error.message });
      }
      next(error);
    }
  },

  // ============================================================
  // カテゴリー更新
  // ============================================================
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { categoryId, name, subtitle, imageUrl, createdAt, cropPositionX, cropPositionY } = req.body;

      // バリデーション
      if (!validateId(id)) {
        return res.status(400).json({ error: 'Invalid category ID' });
      }
      if (name && !validateCategoryName(name)) {
        return res.status(400).json({
          error: 'Invalid category name (must be 1-255 characters)',
        });
      }

      const category = await categoryService.update(id, {
        categoryId,
        name,
        subtitle,
        imageUrl,
        createdAt: createdAt ? new Date(createdAt) : undefined,
        cropPositionX,
        cropPositionY,
      });
      res.json(category);
    } catch (error: any) {
      if (error.message === 'Category name already exists') {
        return res.status(409).json({ error: error.message });
      }
      next(error);
    }
  },

  // ============================================================
  // カテゴリー削除
  // ============================================================
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // バリデーション
      if (!validateId(id)) {
        return res.status(400).json({ error: 'Invalid category ID' });
      }

      await categoryService.delete(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  // ============================================================
  // カテゴリー並び順更新
  // ============================================================
  async updateOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderedIds } = req.body;

      if (!Array.isArray(orderedIds)) {
        return res.status(400).json({ error: 'orderedIds must be an array' });
      }

      await categoryService.updateOrder(orderedIds);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
};
