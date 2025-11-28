// ============================================================
// 階層型在庫管理システム - 認証コントローラー
// ============================================================
// 認証エンドポイントの処理（JWT認証）
// ============================================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authService } from '../services/authService';
import { validateEmail, validatePassword } from '../utils/validators';

const JWT_SECRET = process.env.SESSION_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = '7d'; // 7日間有効

// ============================================================
// ログイン
// ============================================================
export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, userType = 'admin' } = req.body;

      // バリデーション
      if (!validateEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      if (!validatePassword(password)) {
        return res.status(400).json({ error: 'Invalid password format' });
      }
      if (userType !== 'admin' && userType !== 'user') {
        return res.status(400).json({ error: 'Invalid user type' });
      }

      // ログイン処理（userTypeに応じて異なるテーブルを参照）
      const account = await authService.login(email, password, userType);

      // JWTトークン生成
      const token = jwt.sign(
        {
          userId: account.id,
          email: account.email,
          userType: userType, // admin or user
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.json({
        success: true,
        token, // JWTトークンを返す
        account: {
          id: account.id,
          email: account.email,
          name: account.name || null,
          userType: userType,
        },
      });
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  },

  // ============================================================
  // ログアウト（JWTではトークン削除のみ）
  // ============================================================
  async logout(req: Request, res: Response) {
    // JWTはステートレスのため、サーバー側では何もしない
    // フロントエンドでトークンを削除
    res.json({ success: true });
  },

  // ============================================================
  // トークン検証
  // ============================================================
  async getSession(req: Request, res: Response) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ authenticated: false });
    }

    const token = authHeader.substring(7); // "Bearer "を除去

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        email: string;
        userType: 'admin' | 'user';
      };

      res.json({
        authenticated: true,
        userId: decoded.userId,
        email: decoded.email,
        userType: decoded.userType,
      });
    } catch (error) {
      return res.status(401).json({ authenticated: false });
    }
  },
};
