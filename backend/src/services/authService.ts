// ============================================================
// 階層型在庫管理システム - 認証サービス
// ============================================================
// ログイン認証のビジネスロジック
// ============================================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ============================================================
// ログイン処理
// ============================================================
export const authService = {
  async login(email: string, password: string, userType: 'admin' | 'user' = 'admin') {
    console.log(`🔐 ログイン試行: email=${email}, userType=${userType}`);
    let account;

    if (userType === 'admin') {
      // 管理者をメールアドレスで検索
      account = await prisma.admin.findUnique({
        where: { email },
      });
    } else {
      // 一般ユーザーをメールアドレスで検索
      account = await prisma.user.findUnique({
        where: { email },
      });
    }

    console.log(`🔍 アカウント検索結果: ${account ? '見つかった' : '見つからない'}`);

    if (!account) {
      throw new Error('Invalid credentials');
    }

    // パスワード照合
    const isValid = await bcrypt.compare(password, account.password);
    console.log(`🔑 パスワード検証: ${isValid ? '成功' : '失敗'}`);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // パスワードを除外して返す
    return {
      id: account.id,
      email: account.email,
      name: account.name || null,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  },
};
