// ============================================================
// 為替レートAPI - エンドポイント呼び出し
// ============================================================
// 当日の「元通貨→日本円」レートを取得（円換算トグルで使用）
// ============================================================

import { get } from './client';
import { EXCHANGE_RATE_ENDPOINTS } from './endpoints';

export interface ExchangeRateInfo {
  // rates[通貨] = 「1通貨 = ?円」（例: { EUR: 179.0, USD: 155.1 }）
  rates: Record<string, number>;
  fetchedAt: string;
  isFallback: boolean;
}

/**
 * 当日の為替レート取得
 * GET /api/exchange-rates
 */
export async function getExchangeRates(): Promise<ExchangeRateInfo> {
  return get<ExchangeRateInfo>(EXCHANGE_RATE_ENDPOINTS.GET);
}
