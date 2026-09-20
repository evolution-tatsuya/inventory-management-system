// ============================================================
// 階層型在庫管理システム - 認証コントローラー
// ============================================================
// 認証エンドポイントの処理（JWT認証）
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { validateEmail, validatePassword } from '../utils/validators';
import { signToken, verifyToken } from '../lib/jwt';

// ============================================================
// ログイン
// ============================================================
export const authController = {
  // テナント配下のログイン（/api/t/:slug/auth/login）
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const slug = req.params.slug;
      const { email, password, userType = 'admin' } = req.body;

      if (!slug) {
        return res.status(400).json({ error: 'Tenant slug is required' });
      }
      if (!validateEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      if (!validatePassword(password)) {
        return res.status(400).json({ error: 'Invalid password format' });
      }
      if (userType !== 'admin' && userType !== 'user') {
        return res.status(400).json({ error: 'Invalid user type' });
      }

      const account = await authService.login(slug, email, password, userType);

      const token = signToken({
        userId: account.id,
        email: account.email,
        userType,
        tenantId: account.tenantId,
        role: account.role as 'master' | 'admin' | 'user',
      });

      res.json({
        success: true,
        token,
        // フロントの LoginResponse はトップレベルの role/tenantId/userType を参照する
        userType,
        role: account.role,
        tenantId: account.tenantId,
        account: {
          id: account.id,
          email: account.email,
          name: account.name || null,
          userType,
          role: account.role,
          tenantId: account.tenantId,
        },
      });
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  },

  // 運営者(master)ログイン（別導線 /api/master/login）
  async loginMaster(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      if (!validateEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      if (!validatePassword(password)) {
        return res.status(400).json({ error: 'Invalid password format' });
      }

      const account = await authService.loginMaster(email, password);

      const token = signToken({
        userId: account.id,
        email: account.email,
        userType: 'admin',
        tenantId: account.tenantId,
        role: 'master',
      });

      res.json({
        success: true,
        token,
        // フロントの LoginResponse はトップレベルの role/tenantId/userType を参照する
        userType: 'admin',
        role: 'master',
        tenantId: account.tenantId,
        account: {
          id: account.id,
          email: account.email,
          name: account.name || null,
          userType: 'admin',
          role: 'master',
          tenantId: account.tenantId,
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

    const token = authHeader.substring(7);

    try {
      const decoded = verifyToken(token);
      res.json({
        authenticated: true,
        userId: decoded.userId,
        email: decoded.email,
        userType: decoded.userType,
        role: decoded.role,
        tenantId: decoded.tenantId,
      });
    } catch (error) {
      return res.status(401).json({ authenticated: false });
    }
  },
};
