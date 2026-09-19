// ============================================================
// 階層型在庫管理システム - 認証サービス
// ============================================================
// ログイン認証のビジネスロジック
// ============================================================

import bcrypt from 'bcrypt';

import { prisma } from '../lib/prisma';

// ============================================================
// ログイン処理
// ============================================================
export const authService = {
  // テナント配下のログイン（admin/user）。slug でテナントを特定し、
  // そのテナント内で email 照合（複合unique tenantId_email）。
  async login(
    slug: string,
    email: string,
    password: string,
    userType: 'admin' | 'user' = 'admin',
  ) {
    console.log(`🔐 ログイン試行: slug=${slug}, email=${email}, userType=${userType}`);

    // テナント特定（存在・状態は Invalid credentials に丸めて秘匿）
    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) {
      throw new Error('Invalid credentials');
    }
    if (tenant.status === 'suspended') {
      throw new Error('このアカウントは停止中です。管理者にお問い合わせください。');
    }
    if (tenant.status === 'pending') {
      throw new Error('ライセンスが未有効化です。ライセンスキーを入力してください。');
    }

    let account;
    if (userType === 'admin') {
      account = await prisma.admin.findUnique({
        where: { tenantId_email: { tenantId: tenant.id, email } },
      });
    } else {
      account = await prisma.user.findUnique({
        where: { tenantId_email: { tenantId: tenant.id, email } },
      });
    }

    console.log(`🔍 アカウント検索結果: ${account ? '見つかった' : '見つからない'}`);
    if (!account) {
      throw new Error('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, account.password);
    console.log(`🔑 パスワード検証: ${isValid ? '成功' : '失敗'}`);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    return {
      id: account.id,
      email: account.email,
      name: account.name || null,
      tenantId: tenant.id,
      // admin は role を持つ（master/admin）。user は 'user' 固定
      role: userType === 'admin' ? (account as unknown as { role: string }).role : 'user',
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  },

  // 運営者(master)ログイン（別導線）。email から role=master の admin を照合。
  // master はテナント横断のため slug 不要。
  async loginMaster(email: string, password: string) {
    console.log(`🔐 masterログイン試行: email=${email}`);
    const account = await prisma.admin.findFirst({
      where: { email, role: 'master' },
    });
    if (!account) {
      throw new Error('Invalid credentials');
    }
    const isValid = await bcrypt.compare(password, account.password);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }
    return {
      id: account.id,
      email: account.email,
      name: account.name || null,
      tenantId: account.tenantId, // master 自身の所属テナント（既定テナント）
      role: 'master' as const,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  },
};
