// ============================================================
// 階層型在庫管理システム - システム設定サービス
// ============================================================
// システム名、ロゴ、ヘッダー色のビジネスロジック
// ============================================================


import { prisma } from '../lib/prisma';

// ============================================================
// システム設定サービス
// ============================================================
export const systemSettingsService = {
  /**
   * システム設定取得（テナントごとに1件）
   */
  async getSettings(tenantId: string) {
    let settings = await prisma.systemSettings.findFirst({ where: { tenantId } });

    // 設定が存在しない場合、デフォルト値で作成
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {
          systemName: '階層型在庫管理システム',
          headerColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          tenantId,
        },
      });
    }

    return settings;
  },

  /**
   * システム設定更新
   */
  async updateSettings(
    tenantId: string,
    data: {
      systemName?: string;
      logoUrl?: string | null;
      logoSize?: string;
      headerColor?: string;
    }
  ) {
    const existing = await prisma.systemSettings.findFirst({ where: { tenantId } });

    if (existing) {
      return await prisma.systemSettings.update({
        where: { id: existing.id },
        data,
      });
    } else {
      return await prisma.systemSettings.create({
        data: {
          systemName: data.systemName || '階層型在庫管理システム',
          logoUrl: data.logoUrl || null,
          logoSize: data.logoSize || 'small',
          headerColor: data.headerColor || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          tenantId,
        },
      });
    }
  },
};
