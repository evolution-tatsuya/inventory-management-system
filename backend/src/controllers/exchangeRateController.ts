// ============================================================
// 階層型在庫管理システム - 為替レートコントローラー
// ============================================================
// 当日の「元通貨→日本円」レートを返す。フロントの円換算トグルで使用。
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { exchangeRateService } from '../services/exchangeRateService';

export const exchangeRateController = {
  /**
   * 当日の為替レート取得
   * GET /api/exchange-rates
   * レスポンス: { rates: { EUR: 160.2, USD: 150.1, ... }, fetchedAt, isFallback }
   * rates[通貨] = 「1通貨 = ?円」
   */
  async getRates(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exchangeRateService.getRates();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },
};
