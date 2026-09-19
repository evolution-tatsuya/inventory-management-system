// ============================================================
// 価格表示ユーティリティ
// ============================================================
// パーツの価格を「元通貨表示」または「日本円換算表示」で整形する。
// 換算は必ず 元通貨 → 日本円 のみ（クロス換算なし）。
// 円換算して表示する場合は、呼び出し側で注意書きを併記すること。
// ============================================================

import type { Part } from '@/types';

// 通貨記号（表示用）
const CURRENCY_SYMBOLS: Record<string, string> = {
  JPY: '¥',
  EUR: '€',
  USD: '$',
  GBP: '£',
};

/**
 * パーツが海外通貨（円換算対象）で登録されているか。
 * currencyがJPY以外かつoriginalPriceがある場合にtrue。
 */
export function isForeignCurrency(part: Part): boolean {
  const cur = part.currency || 'JPY';
  return cur !== 'JPY' && part.originalPrice != null;
}

/**
 * パーツの価格表示文字列を返す。
 * @param part 対象パーツ
 * @param showJpy 円換算表示モードか（trueなら海外通貨を円換算して表示）
 * @param rates rates[通貨] = 「1通貨 = ?円」
 * @returns 表示文字列（価格が無ければ '-'）
 */
export function formatPartPrice(
  part: Part,
  showJpy: boolean,
  rates: Record<string, number> | undefined,
): string {
  const cur = part.currency || 'JPY';

  // 日本円登録のパーツ: 従来どおり price をそのまま円表示
  if (cur === 'JPY' || part.originalPrice == null) {
    return part.price != null ? `¥${part.price.toLocaleString()}` : '-';
  }

  // 海外通貨登録のパーツ
  const symbol = CURRENCY_SYMBOLS[cur] || `${cur} `;
  const original = `${symbol}${part.originalPrice.toLocaleString()}`;

  if (!showJpy) {
    // 元通貨表示モード
    return original;
  }

  // 円換算表示モード
  const rate = rates?.[cur];
  if (!rate) {
    // レート未取得時は元通貨のまま（換算できない旨は呼び出し側で表示）
    return original;
  }
  const jpy = Math.round(part.originalPrice * rate);
  return `¥${jpy.toLocaleString()}`;
}

/**
 * 表示中のパーツ群に、円換算対象（海外通貨）が1件でも含まれるか。
 * トグルボタンや注意書きの表示要否の判定に使う。
 */
export function hasForeignCurrencyParts(parts: Part[]): boolean {
  return parts.some(isForeignCurrency);
}
