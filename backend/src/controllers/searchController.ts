// ============================================================
// 階層型在庫管理システム - 検索コントローラー
// ============================================================
// 検索関連のHTTPリクエスト処理
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { searchService } from '../services/searchService';

// ============================================================
// 検索コントローラー
// ============================================================
export const searchController = {
  // 収納ケース番号検索
  async searchByStorageCase(req: Request, res: Response, next: NextFunction) {
    try {
      const { case: caseNumber } = req.query;

      if (!caseNumber || typeof caseNumber !== 'string') {
        return res.status(400).json({ error: 'Storage case number is required' });
      }

      const results = await searchService.searchByStorageCase(caseNumber);
      res.json(results);
    } catch (error) {
      next(error);
    }
  },

  // 品番検索
  async searchByPartNumber(req: Request, res: Response, next: NextFunction) {
    try {
      const { partNumber } = req.query;

      if (!partNumber || typeof partNumber !== 'string') {
        return res.status(400).json({ error: 'Part number is required' });
      }

      const results = await searchService.searchByPartNumber(partNumber);
      res.json(results);
    } catch (error) {
      next(error);
    }
  },
};
