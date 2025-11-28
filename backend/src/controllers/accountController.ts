// ============================================================
// 階層型在庫管理システム - アカウントコントローラー
// ============================================================
// アカウント設定エンドポイントの処理
// ============================================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { accountService } from '../services/accountService';
import { validateEmail, validatePassword } from '../utils/validators';

const JWT_SECRET = process.env.SESSION_SECRET || 'fallback-secret-key';

// ============================================================
// アカウントコントローラー
// ============================================================
export const accountController = {
  // ============================================================
  // メールアドレス変更
  // ============================================================
  async changeEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      const { newEmail, userType = 'admin', accountId } = req.body;

      console.log('🔍 changeEmail Debug:', {
        newEmail,
        userType,
        accountId,
        hasAuth: !!authHeader,
      });

      // JWT認証チェック
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        userType: 'admin' | 'user';
      };

      // バリデーション
      if (!validateEmail(newEmail)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // 更新対象のアカウントIDを決定
      const targetUserId = accountId || decoded.userId;

      console.log('🔍 Target User ID for email change:', targetUserId);

      // メールアドレス変更処理
      const account = await accountService.changeEmail(targetUserId, newEmail, userType);

      res.json({
        success: true,
        account,
      });
    } catch (error: any) {
      if (error.message === 'Email already in use') {
        return res.status(409).json({ error: error.message });
      }
      next(error);
    }
  },

  // ============================================================
  // パスワード変更
  // ============================================================
  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      const { currentPassword, newPassword, userType = 'admin', accountId } = req.body;

      // JWT認証チェック
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        userType: 'admin' | 'user';
      };

      // バリデーション
      if (!validatePassword(newPassword)) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }

      // 更新対象のアカウントIDを決定
      const targetUserId = accountId || decoded.userId;

      // 管理者が他のアカウントのパスワードを変更する場合は、
      // 現在のパスワード検証をスキップ
      const skipCurrentPasswordCheck = decoded.userType === 'admin' && !!accountId;

      // パスワード変更処理
      await accountService.changePassword(
        targetUserId,
        currentPassword,
        newPassword,
        userType,
        skipCurrentPasswordCheck
      );

      res.json({ success: true });
    } catch (error: any) {
      if (error.message === 'Current password is incorrect') {
        return res.status(401).json({ error: error.message });
      }
      next(error);
    }
  },

  // ============================================================
  // ユーザー名変更
  // ============================================================
  async changeDisplayName(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      const { newDisplayName, userType = 'admin', accountId } = req.body;

      console.log('🔍 changeDisplayName Debug:', {
        newDisplayName,
        userType,
        accountId,
        hasAuth: !!authHeader,
      });

      // JWT認証チェック
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error('❌ Unauthorized: No auth header');
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        userType: 'admin' | 'user';
      };

      console.log('🔍 Decoded Token:', {
        userId: decoded.userId,
        decodedUserType: decoded.userType,
        requestUserType: userType,
        targetAccountId: accountId,
      });

      // バリデーション
      if (!newDisplayName || newDisplayName.trim().length === 0) {
        console.error('❌ Validation Error: Display name is empty');
        return res.status(400).json({ error: 'Display name cannot be empty' });
      }

      if (newDisplayName.length > 50) {
        console.error('❌ Validation Error: Display name too long');
        return res.status(400).json({ error: 'Display name must be 50 characters or less' });
      }

      // 更新対象のアカウントIDを決定
      // accountIdが指定されている場合はそれを使用（管理者が他のアカウントを編集）
      // 指定されていない場合は自分自身のアカウントを更新
      const targetUserId = accountId || decoded.userId;

      console.log('🔍 Target User ID:', targetUserId);

      // ユーザー名変更処理
      const account = await accountService.changeDisplayName(
        targetUserId,
        newDisplayName.trim(),
        userType
      );

      console.log('✅ Display name changed successfully');

      res.json({
        success: true,
        account,
      });
    } catch (error: any) {
      console.error('❌ changeDisplayName Error:', error);
      next(error);
    }
  },

  // ============================================================
  // アカウント情報取得
  // ============================================================
  async getAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      const { userType } = req.params; // 'admin' or 'user'
      const { accountId } = req.query; // オプション: 特定のアカウントID

      console.log('🔍 getAccount Debug:', {
        userType,
        accountId,
        hasAuth: !!authHeader,
      });

      // JWT認証チェック
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        userType: 'admin' | 'user';
      };

      // バリデーション
      if (userType !== 'admin' && userType !== 'user') {
        return res.status(400).json({ error: 'Invalid user type' });
      }

      // 一般ユーザーは自分のアカウントのみ取得可能
      // 管理者は全アカウント取得可能
      if (decoded.userType === 'user' && accountId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // 管理者が他のアカウントを取得する場合は、accountIdを使用
      const targetUserId = (decoded.userType === 'admin' && accountId) ? accountId as string : decoded.userId;

      // アカウント情報取得
      const account = await accountService.getAccount(
        targetUserId,
        userType as 'admin' | 'user',
        undefined // accountIdはtargetUserIdで処理済みなのでundefined
      );

      console.log('🔍 getAccount Result:', { found: !!account });

      if (!account) {
        console.error('❌ Account not found');
        return res.status(404).json({ error: 'Account not found' });
      }

      res.json(account);
    } catch (error: any) {
      console.error('❌ getAccount Error:', error);
      next(error);
    }
  },

  // ============================================================
  // 全アカウント一覧取得（管理者専用）
  // ============================================================
  async getAllAccounts(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      const { userType } = req.params;

      // JWT認証チェック
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        userType: 'admin' | 'user';
      };

      // デバッグログ
      console.log('🔍 getAllAccounts Debug:', {
        requestUserType: userType,
        decodedUserType: decoded.userType,
        decodedUserId: decoded.userId,
      });

      // 管理者のみアクセス可能
      if (decoded.userType !== 'admin') {
        console.error('❌ 403 Forbidden: User is not admin');
        return res.status(403).json({ error: 'Forbidden' });
      }

      // アカウント一覧取得
      const accounts = await accountService.getAllAccounts(userType as 'admin' | 'user');

      res.json(accounts);
    } catch (error: any) {
      console.error('❌ getAllAccounts Error:', error);
      next(error);
    }
  },
};
