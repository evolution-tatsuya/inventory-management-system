// ============================================================
// 階層型在庫管理システム - アカウントサービス
// ============================================================
// アカウント設定のビジネスロジック（メール・パスワード変更）
// ============================================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ============================================================
// アカウントサービス
// ============================================================
export const accountService = {
  // ============================================================
  // メールアドレス変更
  // ============================================================
  async changeEmail(userId: string, newEmail: string, userType: 'admin' | 'user' = 'admin') {
    if (userType === 'admin') {
      // 管理者のメールアドレス重複チェック
      const existing = await prisma.admin.findUnique({
        where: { email: newEmail },
      });

      if (existing && existing.id !== userId) {
        throw new Error('Email already in use');
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
      // 一般ユーザーのメールアドレス重複チェック
      const existing = await prisma.user.findUnique({
        where: { email: newEmail },
      });

      if (existing && existing.id !== userId) {
        throw new Error('Email already in use');
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
    userId: string,
    currentPassword: string,
    newPassword: string,
    userType: 'admin' | 'user' = 'admin',
    skipCurrentPasswordCheck: boolean = false
  ) {
    let account;

    if (userType === 'admin') {
      // 管理者情報取得
      account = await prisma.admin.findUnique({
        where: { id: userId },
      });
    } else {
      // 一般ユーザー情報取得
      account = await prisma.user.findUnique({
        where: { id: userId },
      });
    }

    if (!account) {
      throw new Error('Account not found');
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
  async changeDisplayName(userId: string, newDisplayName: string, userType: 'admin' | 'user' = 'admin') {
    if (userType === 'admin') {
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
  // アカウント情報取得
  // ============================================================
  async getAccount(userId: string, userType: 'admin' | 'user' = 'admin', accountId?: string) {
    // accountIdが指定されている場合は、そのIDのアカウントを取得
    // （管理者が別のアカウントを編集する場合）
    if (accountId) {
      if (userType === 'admin') {
        return await prisma.admin.findUnique({
          where: { id: accountId },
          select: {
            id: true,
            email: true,
            name: true,
          },
        });
      } else {
        return await prisma.user.findUnique({
          where: { id: accountId },
          select: {
            id: true,
            email: true,
            name: true,
          },
        });
      }
    }

    // accountIdがない場合は、現在ログイン中のアカウントを取得
    if (userType === 'admin') {
      return await prisma.admin.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });
    } else {
      return await prisma.user.findUnique({
        where: { id: userId },
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
  async getAllAccounts(userType: 'admin' | 'user' = 'admin') {
    if (userType === 'admin') {
      return await prisma.admin.findMany({
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
};
