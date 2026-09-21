// ============================================================
// 階層型在庫管理システム - アカウントコントローラー
// ============================================================
// アカウント設定エンドポイントの処理
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt';
import { accountService } from '../services/accountService';
import { validateEmail, validatePassword } from '../utils/validators';


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
      const decoded = verifyToken(token);

      // バリデーション
      if (!validateEmail(newEmail)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // 更新対象のアカウントIDを決定
      const targetUserId = accountId || decoded.userId;

      console.log('🔍 Target User ID for email change:', targetUserId);

      // メールアドレス変更処理
      const account = await accountService.changeEmail(decoded.tenantId, targetUserId, newEmail, userType);

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
      const decoded = verifyToken(token);

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
        decoded.tenantId,
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
      const decoded = verifyToken(token);

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
        decoded.tenantId,
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
  // プロフィール更新（管理者のみ。名前・会社名・部署をまとめて更新）
  // ============================================================
  async changeProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      const { name, companyName, department, accountId } = req.body;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);

      // 更新対象（accountId指定時は管理者が他アカウントを編集、無ければ自分）
      const targetUserId = accountId || decoded.userId;

      const account = await accountService.changeProfile(decoded.tenantId, targetUserId, {
        name,
        companyName,
        department,
      });
      res.json({ success: true, account });
    } catch (error: any) {
      console.error('❌ changeProfile Error:', error);
      // バリデーションエラーは400で返す
      if (error?.message === 'お名前を入力してください') {
        return res.status(400).json({ error: error.message });
      }
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
      const decoded = verifyToken(token);

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
        decoded.tenantId,
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
      const decoded = verifyToken(token);

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
      const accounts = await accountService.getAllAccounts(decoded.tenantId, userType as 'admin' | 'user');

      res.json(accounts);
    } catch (error: any) {
      console.error('❌ getAllAccounts Error:', error);
      next(error);
    }
  },

  // 一般ユーザー(閲覧専用)を新規作成（管理者のみ）
  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      const { email, password, name } = req.body;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const decoded = verifyToken(authHeader.substring(7));
      if (decoded.userType !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
      }
      if (!validateEmail(email)) {
        return res.status(400).json({ error: 'メールアドレスの形式が不正です' });
      }
      const user = await accountService.createUser(decoded.tenantId, { email, password, name });
      res.json({ success: true, user });
    } catch (error: any) {
      next(error);
    }
  },

  // 一般ユーザーを削除（管理者のみ）
  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const decoded = verifyToken(authHeader.substring(7));
      if (decoded.userType !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const result = await accountService.deleteUser(decoded.tenantId, req.params.id);
      res.json(result);
    } catch (error: any) {
      next(error);
    }
  },
};
