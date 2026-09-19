// ============================================================
// Prisma Client シングルトン
// ============================================================
// 全サービス・コントローラーはこの1インスタンスを共有する。
// マルチテナント化に伴い、Prisma初期化を1箇所へ集約（tenantId対応・
// 将来の検証用$extendsの適用ポイントを単一化するため）。
//
// ts-node-dev の --respawn によるホットリロードで接続が増殖するのを
// globalThis キャッシュで防ぐ。
// ============================================================
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
