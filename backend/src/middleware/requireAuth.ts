// ============================================================
// 階層型在庫管理システム - 認証ミドルウェア
// ============================================================
// JWT検証（管理者のみアクセス可能）
// ============================================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.SESSION_SECRET || 'fallback-secret-key';

// ============================================================
// JWT検証ミドルウェア
// ============================================================
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7); // "Bearer "を除去

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { adminId: string; email: string };
    // デコードされた情報をリクエストに追加（必要に応じて使用）
    (req as any).admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
