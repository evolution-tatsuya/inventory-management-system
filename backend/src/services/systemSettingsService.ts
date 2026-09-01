// ============================================================
// 階層型在庫管理システム - システム設定サービス
// ============================================================
// システム名、ロゴ、ヘッダー色のビジネスロジック
// ============================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================
// システム設定サービス
// ============================================================
export const systemSettingsService = {
  /**
   * システム設定取得（1件のみ）
   */
  async getSettings() {
    let settings = await prisma.systemSettings.findFirst();

    // 設定が存在しない場合、デフォルト値で作成
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {
          systemName: '階層型在庫管理システム',
          headerColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        },
      });
    }

    return settings;
  },

  /**
   * システム設定更新
   */
  async updateSettings(data: {
    systemName?: string;
    logoUrl?: string | null;
    headerColor?: string;
  }) {
    const existing = await prisma.systemSettings.findFirst();

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
          headerColor: data.headerColor || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        },
      });
    }
  },
};
