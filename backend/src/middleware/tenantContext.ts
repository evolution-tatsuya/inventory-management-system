// ============================================================
// publicTenant ミドルウェア（無認証の閲覧系GET用）
// ============================================================
// URLの :slug からテナントを解決し req.tenantId を確立する。JWTは見ない。
// 一般ユーザー向けの閲覧API（categories/genres/parts/units/diagram/search/
// system-settings 等）に適用し、テナント横断の情報漏洩を防ぐ。
// tenantId が確立できない場合はハンドラを走らせない。
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export const publicTenant = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const slug = req.params.slug;
  if (!slug) {
    return res.status(400).json({ error: 'Tenant slug is required' });
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant not found' });
  }
  // 停止中・未有効化テナントは閲覧も遮断（データは保持されるがアクセス不可）
  if (tenant.status !== 'active') {
    return res.status(403).json({ error: 'Tenant is not accessible' });
  }

  (req as any).tenantId = tenant.id;
  next();
};
