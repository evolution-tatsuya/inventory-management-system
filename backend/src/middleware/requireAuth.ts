// ============================================================
// 階層型在庫管理システム - 認証ミドルウェア（マルチテナント対応）
// ============================================================
// JWT検証（管理者のみアクセス可能）＋ テナントスコープの確立。
// URLの :slug と JWT の tenantId の一致を強制し、他テナントへの越境を防ぐ。
// master(運営者) は全テナント横断可。
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt';
import { prisma } from '../lib/prisma';

// ============================================================
// admin系API用の認証ミドルウェア
// ============================================================
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7); // "Bearer "を除去

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // 管理者専用: userTypeがadminでなければ拒否（一般ユーザーの管理者API不正利用を防ぐ）
  if (decoded.userType !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: admin access required' });
  }

  // URLの :slug からテナントを解決（admin系ルートは /api/t/:slug/... 配下）
  const slug = req.params.slug;
  if (!slug) {
    return res.status(400).json({ error: 'Tenant slug is required' });
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant not found' });
  }
  if (tenant.status === 'suspended') {
    return res.status(403).json({ error: 'Tenant is suspended' });
  }
  if (tenant.status === 'pending') {
    return res.status(403).json({ error: 'Tenant is not activated' });
  }

  // 認可: master は全テナント横断可。それ以外は自テナントのみ。
  if (decoded.role !== 'master' && decoded.tenantId !== tenant.id) {
    return res.status(403).json({ error: 'Forbidden: tenant mismatch' });
  }

  // テナントコンテキストを確立（URLのテナント＝アクセス対象）
  (req as any).tenantId = tenant.id;
  (req as any).auth = decoded;
  // 後方互換（既存コードが req.admin / req.user を参照している場合に備える）
  (req as any).admin = decoded;
  (req as any).user = decoded;
  next();
};
