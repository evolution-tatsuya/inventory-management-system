// ============================================================
// Owner API Service（運営者向け総括）
// ============================================================
import { get, put } from './client';

export type StockMode = 'shared' | 'perCategory';

export async function getStockMode(): Promise<{ mode: StockMode }> {
  return get<{ mode: StockMode }>('/api/admin/owner/stock-mode');
}

export async function setStockMode(
  mode: StockMode,
): Promise<{ success: boolean; mode: StockMode; migrated: number }> {
  return put('/api/admin/owner/stock-mode', { mode });
}
