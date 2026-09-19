// ============================================================
// 階層型在庫管理システム - 為替レートサービス
// ============================================================
// 海外通貨→日本円(JPY)への換算レートを外部APIから取得し、
// 1日1回キャッシュする。表示時の円換算に使用。
// 換算は必ず「元通貨 → JPY」のみ（クロス換算は行わない）。
// ============================================================

// 対応通貨（元通貨として登録可能なもの）
export const SUPPORTED_CURRENCIES = ['JPY', 'EUR', 'USD', 'GBP'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

// レート取得先（APIキー不要の無料エンドポイント）
// base=JPY で各通貨→JPY のレートを取得する
const PRIMARY_API = 'https://open.er-api.com/v6/latest/JPY';

// キャッシュ有効期間: 24時間
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// 万一APIが落ちている場合のフォールバックレート（1通貨=何円か）
// あくまで最終手段。取得できない場合でも画面が壊れないようにする。
const FALLBACK_RATES: Record<string, number> = {
  JPY: 1,
  EUR: 160,
  USD: 150,
  GBP: 190,
};

export interface RateInfo {
  // 「1<通貨> = ? JPY」のレート表（例: { EUR: 160.2, USD: 150.1, ... }）
  rates: Record<string, number>;
  // レート基準日時（ISO文字列）
  fetchedAt: string;
  // フォールバック値を使っているか
  isFallback: boolean;
}

interface CacheEntry {
  data: RateInfo;
  expiresAt: number;
}

let cache: CacheEntry | null = null;

/**
 * 外部APIから「1通貨=?円」のレート表を取得する。
 * open.er-api.com は base=JPY のとき rates[X] = 「1 JPY = X通貨」を返すため、
 * 「1通貨 = ? 円」に変換するには逆数を取る。
 */
async function fetchRatesFromApi(): Promise<RateInfo> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(PRIMARY_API, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Exchange API responded ${res.status}`);
    }
    const json = (await res.json()) as {
      result?: string;
      rates?: Record<string, number>;
      time_last_update_utc?: string;
    };
    if (json.result !== 'success' || !json.rates) {
      throw new Error('Exchange API returned invalid payload');
    }

    // json.rates[X] = 「1 JPY = X通貨」→ 逆数で「1通貨 = ?円」に変換
    const rates: Record<string, number> = { JPY: 1 };
    for (const cur of SUPPORTED_CURRENCIES) {
      if (cur === 'JPY') continue;
      const perJpy = json.rates[cur];
      if (perJpy && perJpy > 0) {
        rates[cur] = 1 / perJpy;
      }
    }

    return {
      rates,
      fetchedAt: json.time_last_update_utc
        ? new Date(json.time_last_update_utc).toISOString()
        : new Date().toISOString(),
      isFallback: false,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export const exchangeRateService = {
  /**
   * レート情報を取得（1日1回キャッシュ）。
   * API取得に失敗した場合はフォールバックレートを返す（画面を壊さない）。
   */
  async getRates(): Promise<RateInfo> {
    const now = Date.now();
    if (cache && cache.expiresAt > now) {
      return cache.data;
    }

    try {
      const data = await fetchRatesFromApi();
      cache = { data, expiresAt: now + CACHE_TTL_MS };
      return data;
    } catch (error) {
      // 取得失敗時: 期限切れでも直近キャッシュがあればそれを使う
      if (cache) {
        return cache.data;
      }
      // キャッシュも無ければフォールバック（短めにキャッシュして再取得を促す）
      const fallback: RateInfo = {
        rates: { ...FALLBACK_RATES },
        fetchedAt: new Date().toISOString(),
        isFallback: true,
      };
      cache = { data: fallback, expiresAt: now + 60 * 60 * 1000 }; // 1時間で再取得
      return fallback;
    }
  },

  /**
   * 指定通貨の金額を日本円に換算する。
   * @returns 換算後の円（四捨五入した整数）。通貨未対応時は null。
   */
  async convertToJpy(amount: number, currency: string): Promise<number | null> {
    if (currency === 'JPY') return Math.round(amount);
    const { rates } = await this.getRates();
    const rate = rates[currency];
    if (!rate) return null;
    return Math.round(amount * rate);
  },
};
