// ============================================================
// requireMaster ミドルウェア（運営者=master 専用）
// ============================================================
// テナント管理API（/api/master/*）を保護する。全テナント横断のため
// slug 検証は行わない（requireAuth との決定的な違い）。
// 認可の穴を塞ぐため、JWTのrole=masterに加えてDB上でも現在masterか再確認する
// （トークン発行後にmaster剥奪されたケースを弾く）。
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt';
import { prisma } from '../lib/prisma';

export const requireMaster = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // 唯一の認可ゲート: role で判定（userType ではない）
  if (decoded.role !== 'master') {
    return res.status(403).json({ error: 'Forbidden: master access required' });
  }

  // DB再確認: トークン発行後に master 剥奪された穴を塞ぐ
  const stillMaster = await prisma.admin.findFirst({
    where: { id: decoded.userId, role: 'master' },
    select: { id: true },
  });
  if (!stillMaster) {
    return res.status(403).json({ error: 'Forbidden: master access required' });
  }

  (req as any).auth = decoded;
  next();
};
