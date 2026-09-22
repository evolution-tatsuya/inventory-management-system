// ============================================================
// 階層型在庫管理システム - アカウントサービス
// ============================================================
// アカウント設定のビジネスロジック（メール・パスワード変更）
// ============================================================

import bcrypt from 'bcrypt';

import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { limitService } from './limitService';

// ============================================================
// アカウントサービス
// ============================================================
export const accountService = {
  // ============================================================
  // メールアドレス変更
  // ============================================================
  async changeEmail(
    tenantId: string,
    userId: string,
    newEmail: string,
    userType: 'admin' | 'user' = 'admin'
  ) {
    if (userType === 'admin') {
      // 管理者のメールアドレス重複チェック（テナント内）
      const existing = await prisma.admin.findFirst({
        where: { tenantId, email: newEmail },
      });

      if (existing && existing.id !== userId) {
        throw new Error('Email already in use');
      }

      // 所有確認（自テナントのアカウントか）
      const owned = await prisma.admin.findFirst({
        where: { id: userId, tenantId },
        select: { id: true },
      });
      if (!owned) {
        throw new AppError('Account not found', 404);
      }

      // メールアドレス更新
      return await prisma.admin.update({
        where: { id: userId },
        data: { email: newEmail },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });
    } else {
      // 一般ユーザーのメールアドレス重複チェック（テナント内）
      const existing = await prisma.user.findFirst({
        where: { tenantId, email: newEmail },
      });

      if (existing && existing.id !== userId) {
        throw new Error('Email already in use');
      }

      const owned = await prisma.user.findFirst({
        where: { id: userId, tenantId },
        select: { id: true },
      });
      if (!owned) {
        throw new AppError('Account not found', 404);
      }

      // メールアドレス更新
      return await prisma.user.update({
        where: { id: userId },
        data: { email: newEmail },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });
    }
  },

  // ============================================================
  // パスワード変更
  // ============================================================
  async changePassword(
    tenantId: string,
    userId: string,
    currentPassword: string,
    newPassword: string,
    userType: 'admin' | 'user' = 'admin',
    skipCurrentPasswordCheck: boolean = false
  ) {
    let account;

    if (userType === 'admin') {
      // 管理者情報取得（テナント内）
      account = await prisma.admin.findFirst({
        where: { id: userId, tenantId },
      });
    } else {
      // 一般ユーザー情報取得（テナント内）
      account = await prisma.user.findFirst({
        where: { id: userId, tenantId },
      });
    }

    if (!account) {
      throw new AppError('Account not found', 404);
    }

    // 現在のパスワード検証（管理者が他のアカウントを変更する場合はスキップ）
    if (!skipCurrentPasswordCheck) {
      const isValid = await bcrypt.compare(currentPassword, account.password);
      if (!isValid) {
        throw new Error('Current password is incorrect');
      }
    }

    // 新しいパスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // パスワード更新
    if (userType === 'admin') {
      await prisma.admin.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });
    }

    return { success: true };
  },

  // ============================================================
  // ユーザー名変更
  // ============================================================
  async changeDisplayName(
    tenantId: string,
    userId: string,
    newDisplayName: string,
    userType: 'admin' | 'user' = 'admin'
  ) {
    if (userType === 'admin') {
      const owned = await prisma.admin.findFirst({
        where: { id: userId, tenantId },
        select: { id: true },
      });
      if (!owned) {
        throw new AppError('Account not found', 404);
      }
      // 管理者のユーザー名更新
      return await prisma.admin.update({
        where: { id: userId },
        data: { name: newDisplayName },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });
    } else {
      const owned = await prisma.user.findFirst({
        where: { id: userId, tenantId },
        select: { id: true },
      });
      if (!owned) {
        throw new AppError('Account not found', 404);
      }
      // 一般ユーザーのユーザー名更新
      return await prisma.user.update({
        where: { id: userId },
        data: { name: newDisplayName },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });
    }
  },

  // ============================================================
  // プロフィール更新（管理者のみ。名前・会社名・部署をまとめて更新）
  // 名前は必須。会社名・部署は任意（空はnull）。
  // ============================================================
  async changeProfile(
    tenantId: string,
    userId: string,
    data: { name: string; companyName?: string; department?: string },
  ) {
    const name = (data.name || '').trim();
    if (!name) {
      throw new AppError('お名前を入力してください', 400);
    }
    const owned = await prisma.admin.findFirst({
      where: { id: userId, tenantId },
      select: { id: true },
    });
    if (!owned) {
      throw new AppError('Account not found', 404);
    }
    return await prisma.admin.update({
      where: { id: userId },
      data: {
        name,
        companyName: data.companyName?.trim() || null,
        department: data.department?.trim() || null,
      },
      select: { id: true, email: true, name: true, companyName: true, department: true },
    });
  },

  // ============================================================
  // アカウント情報取得
  // ============================================================
  async getAccount(
    tenantId: string,
    userId: string,
    userType: 'admin' | 'user' = 'admin',
    accountId?: string
  ) {
    // accountIdが指定されている場合は、そのIDのアカウントを取得
    // （管理者が別のアカウントを編集する場合）
    const targetId = accountId || userId;
    if (userType === 'admin') {
      return await prisma.admin.findFirst({
        where: { id: targetId, tenantId },
        select: {
          id: true,
          email: true,
          name: true,
          companyName: true,
          department: true,
        },
      });
    } else {
      return await prisma.user.findFirst({
        where: { id: targetId, tenantId },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });
    }
  },

  // ============================================================
  // 全アカウント一覧取得（管理者専用）
  // ============================================================
  async getAllAccounts(tenantId: string, userType: 'admin' | 'user' = 'admin') {
    if (userType === 'admin') {
      return await prisma.admin.findMany({
        where: { tenantId },
        select: {
          id: true,
          email: true,
          name: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
    } else {
      return await prisma.user.findMany({
        where: { tenantId },
        select: {
          id: true,
          email: true,
          name: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
    }
  },

  // ============================================================
  // 一般ユーザー(閲覧専用)を新規作成する。email はテナント内で一意。
  // ============================================================
  async createUser(
    tenantId: string,
    data: { email: string; password: string; name?: string },
  ) {
    const email = (data.email || '').trim();
    if (!email) {
      throw new AppError('メールアドレスを入力してください', 400);
    }
    if (!data.password || data.password.length < 8) {
      throw new AppError('パスワードは8文字以上で入力してください', 400);
    }
    // テナント内 email 重複チェック
    const existing = await prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email } },
    });
    if (existing) {
      throw new AppError('このメールアドレスは既に使用されています', 400);
    }
    // プラン上限チェック（閲覧ユーザー数の上限）
    await limitService.assertUserLimit(tenantId);
    const hashed = await bcrypt.hash(data.password, 10);
    return prisma.user.create({
      data: {
        email,
        password: hashed,
        name: data.name?.trim() || null,
        tenantId,
      },
      select: { id: true, email: true, name: true, createdAt: true },
    });
  },

  // ============================================================
  // 一般ユーザーを削除する（自テナントのユーザーのみ）。
  // ============================================================
  async deleteUser(tenantId: string, userId: string) {
    const owned = await prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { id: true },
    });
    if (!owned) {
      throw new AppError('User not found', 404);
    }
    await prisma.user.delete({ where: { id: userId } });
    return { success: true };
  },
};
