// ============================================================
// usageLogService: テナントごとの日次使用量ログ
// ============================================================
// - recordAccess: 閲覧時にアクセス数を+1（非同期・失敗無視。本番動作に影響させない）
// - snapshotAll: 全テナントのパーツ数・画像枚数・容量を当日行に記録（日次実行）
// - getTrend: 指定テナントの推移（前日/今月/今年/日別）を返す
// ============================================================

import { prisma } from '../lib/prisma';

const AVG_IMAGE_MB = 0.3; // limitService / listTenants と同じ基準

// JSTの YYYY-MM-DD（サーバーがUTCでも日本時間の日付で集計するため+9h）
function jstDate(d = new Date()): string {
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

export const usageLogService = {
  /**
   * アクセス数を当日行に+1する。閲覧のたびに呼ばれるため、
   * エラーは握りつぶし、await しない（呼び出し側でブロックしない）運用を想定。
   */
  async recordAccess(tenantId: string): Promise<void> {
    const date = jstDate();
    try {
      await prisma.tenantUsageLog.upsert({
        where: { tenantId_date: { tenantId, date } },
        create: { tenantId, date, accessCount: 1 },
        update: { accessCount: { increment: 1 } },
      });
    } catch {
      // 記録失敗は無視（本番の閲覧動作を止めない）
    }
  },

  /**
   * 全テナントのパーツ数・画像枚数・容量を当日行に記録（スナップショット）。
   * 日次で実行して増加ペースを追えるようにする。
   */
  async snapshotAll(): Promise<{ tenants: number; date: string }> {
    const date = jstDate();
    const tenants = await prisma.tenant.findMany({ select: { id: true } });
    for (const t of tenants) {
      const [partCount, genreImg, unitImg, partImg, diagramImg] = await Promise.all([
        prisma.part.count({ where: { tenantId: t.id } }),
        prisma.genre.count({ where: { tenantId: t.id, imageUrl: { not: null } } }),
        prisma.unit.count({ where: { tenantId: t.id, imageUrl: { not: null } } }),
        prisma.part.count({ where: { tenantId: t.id, imageUrl: { not: null } } }),
        prisma.diagramImage.count({ where: { tenantId: t.id } }),
      ]);
      const imageCount = genreImg + unitImg + partImg + diagramImg;
      const imageMB = Math.round(imageCount * AVG_IMAGE_MB * 10) / 10;
      await prisma.tenantUsageLog.upsert({
        where: { tenantId_date: { tenantId: t.id, date } },
        create: { tenantId: t.id, date, partCount, imageCount, imageMB },
        update: { partCount, imageCount, imageMB },
      });
    }
    return { tenants: tenants.length, date };
  },

  /**
   * 指定テナントの使用量推移を返す。
   * - 日別（直近days日、既定90）
   * - サマリー（前日アクセス、今月アクセス合計、今年アクセス合計）
   */
  async getTrend(tenantId: string, days = 90) {
    const logs = await prisma.tenantUsageLog.findMany({
      where: { tenantId },
      orderBy: { date: 'asc' },
    });
    const today = jstDate();
    const yesterday = jstDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const thisMonth = today.slice(0, 7); // YYYY-MM
    const thisYear = today.slice(0, 4); // YYYY

    const sumAccess = (pred: (d: string) => boolean) =>
      logs.filter((l) => pred(l.date)).reduce((a, l) => a + l.accessCount, 0);

    const daily = logs.slice(-days).map((l) => ({
      date: l.date,
      accessCount: l.accessCount,
      partCount: l.partCount,
      imageCount: l.imageCount,
      imageMB: l.imageMB,
    }));

    return {
      summary: {
        yesterdayAccess: sumAccess((d) => d === yesterday),
        todayAccess: sumAccess((d) => d === today),
        thisMonthAccess: sumAccess((d) => d.startsWith(thisMonth)),
        thisYearAccess: sumAccess((d) => d.startsWith(thisYear)),
      },
      daily,
    };
  },
};
