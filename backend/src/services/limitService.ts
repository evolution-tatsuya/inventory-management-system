// ============================================================
// limitService: プラン上限の判定
// ============================================================
// Tenant の maxParts / maxImageMB / maxUsers に対し、作成前に上限を判定する。
// 各上限が null のときは「無制限」＝チェックを通す（プロ相当）。
// 超過時は AppError(403) を投げ、呼び出し側の作成処理をブロックする。
// 画像容量は Cloudinary の実バイト数を持たないため、画像枚数 × 平均サイズで概算する。
// ============================================================

import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

// 展開図・パーツ画像1枚あたりの平均サイズ（本番実測 ≒ 0.27MB。余裕を見て 0.3MB）
const AVG_IMAGE_MB = 0.3;

// テナントのプラン上限を取得
async function getLimits(tenantId: string) {
  const t = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { maxParts: true, maxImageMB: true, maxUsers: true },
  });
  return t ?? { maxParts: null, maxImageMB: null, maxUsers: null };
}

export const limitService = {
  // パーツを add 件追加してよいか（超過なら throw）
  async assertPartLimit(tenantId: string, add = 1) {
    const { maxParts } = await getLimits(tenantId);
    if (maxParts == null) return; // 無制限
    const current = await prisma.part.count({ where: { tenantId } });
    if (current + add > maxParts) {
      throw new AppError(
        `登録パーツ数が上限（${maxParts.toLocaleString()}点）に達しています。プランのアップグレードが必要です。`,
        403,
      );
    }
  },

  // 一般ユーザーを1人追加してよいか（超過なら throw）
  async assertUserLimit(tenantId: string) {
    const { maxUsers } = await getLimits(tenantId);
    if (maxUsers == null) return; // 無制限
    const current = await prisma.user.count({ where: { tenantId } });
    if (current + 1 > maxUsers) {
      throw new AppError(
        `閲覧ユーザー数が上限（${maxUsers}人）に達しています。プランのアップグレードが必要です。`,
        403,
      );
    }
  },

  // 画像を addCount 枚追加してよいか（概算容量で判定・超過なら throw）
  async assertImageLimit(tenantId: string, addCount = 1) {
    const { maxImageMB } = await getLimits(tenantId);
    if (maxImageMB == null) return; // 無制限
    const [genreImg, unitImg, partImg, diagram] = await Promise.all([
      prisma.genre.count({ where: { tenantId, imageUrl: { not: null } } }),
      prisma.unit.count({ where: { tenantId, imageUrl: { not: null } } }),
      prisma.part.count({ where: { tenantId, imageUrl: { not: null } } }),
      prisma.diagramImage.count({ where: { tenantId } }),
    ]);
    const currentCount = genreImg + unitImg + partImg + diagram;
    const usedMB = (currentCount + addCount) * AVG_IMAGE_MB;
    if (usedMB > maxImageMB) {
      throw new AppError(
        `画像容量が上限（${maxImageMB >= 1024 ? (maxImageMB / 1024).toFixed(0) + 'GB' : maxImageMB + 'MB'}）に達しています。プランのアップグレードが必要です。`,
        403,
      );
    }
  },

  // 現在の使用量サマリー（警告バナー・総括表示用）
  async usage(tenantId: string) {
    const { maxParts, maxImageMB, maxUsers } = await getLimits(tenantId);
    const [parts, users, genreImg, unitImg, partImg, diagram] = await Promise.all([
      prisma.part.count({ where: { tenantId } }),
      prisma.user.count({ where: { tenantId } }),
      prisma.genre.count({ where: { tenantId, imageUrl: { not: null } } }),
      prisma.unit.count({ where: { tenantId, imageUrl: { not: null } } }),
      prisma.part.count({ where: { tenantId, imageUrl: { not: null } } }),
      prisma.diagramImage.count({ where: { tenantId } }),
    ]);
    const imageMB = Math.round((genreImg + unitImg + partImg + diagram) * AVG_IMAGE_MB);
    return {
      parts: { used: parts, limit: maxParts },
      users: { used: users, limit: maxUsers },
      imageMB: { used: imageMB, limit: maxImageMB },
    };
  },
};
