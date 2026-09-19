// ============================================================
// stockModeService: 在庫モードの取得・切替（＋切替時のデータ移行）
// ============================================================
import { StockMode } from './stockHelper';

import { prisma } from '../lib/prisma';

export const stockModeService = {
  async getMode(tenantId: string): Promise<StockMode> {
    const s = await prisma.systemSettings.findFirst({ where: { tenantId } });
    return (s?.stockMode as StockMode) || 'shared';
  },

  /**
   * 在庫モードを切り替える。データ移行も行う。
   * shared → perCategory:
   *   各カテゴリーで使われている品番ごとに、共有(null)在庫の値をコピーした
   *   カテゴリー別レコードを作成する。共有レコードは残す（sharedに戻せるように）。
   * perCategory → shared:
   *   何もしない（共有レコードは維持されているのでそのまま使う）。
   */
  async setMode(
    tenantId: string,
    mode: StockMode,
  ): Promise<{ mode: StockMode; migrated: number }> {
    const settings = await prisma.systemSettings.findFirst({ where: { tenantId } });
    if (!settings) throw new Error('SystemSettings not found');
    const current = (settings.stockMode as StockMode) || 'shared';

    let migrated = 0;

    if (current !== 'perCategory' && mode === 'perCategory') {
      migrated = await this.migrateToPerCategory(tenantId);
    }

    await prisma.systemSettings.update({
      where: { id: settings.id },
      data: { stockMode: mode },
    });
    return { mode, migrated };
  },

  /**
   * 共有在庫を各カテゴリーへ複製（冪等）。
   * 「そのカテゴリーで使われている品番」に対してのみ、カテゴリー別レコードを用意する。
   */
  async migrateToPerCategory(tenantId: string): Promise<number> {
    // カテゴリー × 品番 の使用実績（distinct）を集める（テナント内のみ）
    const rows = await prisma.$queryRaw<{ categoryId: string; partNumber: string }[]>`
      SELECT DISTINCT g."categoryId" AS "categoryId", p."partNumber" AS "partNumber"
      FROM parts p
      JOIN genres g ON g.id = p."genreId"
      WHERE p."tenantId" = ${tenantId}
    `;

    // 共有(null)在庫の現在値マップ（テナント内）
    const shared = await prisma.partMaster.findMany({ where: { tenantId, categoryId: null } });
    const sharedQty = new Map(shared.map((s) => [s.partNumber, s.stockQuantity]));

    // 既存のカテゴリー別レコード（重複作成防止・テナント内）
    const existing = await prisma.partMaster.findMany({
      where: { tenantId, categoryId: { not: null } },
    });
    const existingKey = new Set(existing.map((e) => `${e.categoryId}::${e.partNumber}`));

    const toCreate: {
      categoryId: string;
      partNumber: string;
      stockQuantity: number;
      tenantId: string;
    }[] = [];
    for (const r of rows) {
      const key = `${r.categoryId}::${r.partNumber}`;
      if (existingKey.has(key)) continue;
      toCreate.push({
        categoryId: r.categoryId,
        partNumber: r.partNumber,
        stockQuantity: sharedQty.get(r.partNumber) ?? 0, // 共有値を初期値として引き継ぐ
        tenantId,
      });
    }

    // まとめて作成（バッチ）
    let created = 0;
    const chunkSize = 500;
    for (let i = 0; i < toCreate.length; i += chunkSize) {
      const chunk = toCreate.slice(i, i + chunkSize);
      const res = await prisma.partMaster.createMany({ data: chunk, skipDuplicates: true });
      created += res.count;
    }
    return created;
  },
};
