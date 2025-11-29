// ============================================================
// 階層型在庫管理システム - ジャンルコントローラー
// ============================================================
// ジャンル関連のHTTPリクエスト処理
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { genreService } from '../services/genreService';
import { validateGenreName, validateId, validateUrl } from '../utils/validators';

// ============================================================
// ジャンルコントローラー
// ============================================================
export const genreController = {
  // 全ジャンル一覧取得（管理画面用）
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const genres = await genreService.getAll();
      res.json(genres);
    } catch (error) {
      next(error);
    }
  },

  // カテゴリー内のジャンル一覧取得
  async getByCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!validateId(id)) {
        return res.status(400).json({ error: 'Invalid category ID' });
      }

      const genres = await genreService.getByCategory(id);
      res.json(genres);
    } catch (error) {
      next(error);
    }
  },

  // ジャンル作成
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        genreId,
        name,
        subtitle,
        categoryId,
        imageUrl,
        diagramImageUrl,
        showDiagram,
        showPartImages,
        imagePosition,
        cropPositionX,
        cropPositionY,
      } = req.body;

      // バリデーション
      if (!validateGenreName(name)) {
        return res.status(400).json({ error: 'Invalid genre name' });
      }
      if (!validateId(categoryId)) {
        return res.status(400).json({ error: 'Invalid category ID' });
      }
      if (imageUrl && !validateUrl(imageUrl)) {
        return res.status(400).json({ error: 'Invalid image URL' });
      }
      if (diagramImageUrl && !validateUrl(diagramImageUrl)) {
        return res.status(400).json({ error: 'Invalid diagram image URL' });
      }

      const genre = await genreService.create({
        genreId,
        name,
        subtitle,
        categoryId,
        imageUrl,
        diagramImageUrl,
        showDiagram,
        showPartImages,
        imagePosition,
        cropPositionX,
        cropPositionY,
      });

      res.status(201).json(genre);
    } catch (error) {
      next(error);
    }
  },

  // ジャンル更新
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const {
        genreId,
        name,
        subtitle,
        categoryId,
        imageUrl,
        diagramImageUrl,
        showDiagram,
        showPartImages,
        imagePosition,
        cropPositionX,
        cropPositionY,
      } = req.body;

      if (!validateId(id)) {
        return res.status(400).json({ error: 'Invalid genre ID' });
      }
      if (name && !validateGenreName(name)) {
        return res.status(400).json({ error: 'Invalid genre name' });
      }
      if (categoryId && !validateId(categoryId)) {
        return res.status(400).json({ error: 'Invalid category ID' });
      }
      if (imageUrl && !validateUrl(imageUrl)) {
        return res.status(400).json({ error: 'Invalid image URL' });
      }
      if (diagramImageUrl && !validateUrl(diagramImageUrl)) {
        return res.status(400).json({ error: 'Invalid diagram image URL' });
      }

      const genre = await genreService.update(id, {
        genreId,
        name,
        subtitle,
        categoryId,
        imageUrl,
        diagramImageUrl,
        showDiagram,
        showPartImages,
        imagePosition,
        cropPositionX,
        cropPositionY,
      });

      res.json(genre);
    } catch (error) {
      next(error);
    }
  },

  // ジャンル削除
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!validateId(id)) {
        return res.status(400).json({ error: 'Invalid genre ID' });
      }

      await genreService.delete(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  // ジャンル並び順更新
  async updateOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds)) {
        return res.status(400).json({ error: 'orderedIds must be an array' });
      }
      await genreService.updateOrder(orderedIds);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
};
