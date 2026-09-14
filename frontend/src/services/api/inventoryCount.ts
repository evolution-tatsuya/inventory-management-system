// ============================================================
// InventoryCount API Service（棚卸し）
// ============================================================
import { post, get } from './client';

export interface CountItemInput {
  partId: string;
  countedQty: number;
  storageCase?: string | null;
}

export interface SaveCountResult {
  success: boolean;
  updated: number;
  logged: number;
}

export interface StockCountLog {
  id: string;
  partNumber: string;
  partName: string;
  unitId: string | null;
  unitName: string | null;
  beforeQty: number;
  afterQty: number;
  diff: number;
  countedBy: string | null;
  countedAt: string;
}

/**
 * 棚卸し実数をまとめて保存（在庫上書き＋履歴記録）
 */
export async function saveCounts(items: CountItemInput[]): Promise<SaveCountResult> {
  return post<SaveCountResult>('/api/admin/inventory-count/save', { items });
}

/**
 * 棚卸し履歴を取得
 */
export async function getHistory(limit = 200): Promise<StockCountLog[]> {
  return get<StockCountLog[]>(`/api/admin/inventory-count/history?limit=${limit}`);
}
