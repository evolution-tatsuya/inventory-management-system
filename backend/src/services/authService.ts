// ============================================================
// 階層型在庫管理システム - 認証サービス
// ============================================================
// ログイン認証のビジネスロジック
// ============================================================

import bcrypt from 'bcrypt';
import crypto from 'crypto';

import { prisma } from '../lib/prisma';
import { sendMail, buildPasswordResetEmail } from '../lib/mailer';

// パスワード再発行トークンの有効期限（分）
const RESET_TOKEN_EXPIRES_MINUTES = 30;

// 平文トークンをSHA-256でハッシュ化（DB保存用）
const hashToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');

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

    // 最終ログイン日時を記録（admin のみ。User は lastLoginAt を持たない）
    if (userType === 'admin') {
      await prisma.admin.update({
        where: { id: account.id },
        data: { lastLoginAt: new Date() },
      });
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
    // 最終ログイン日時を記録
    await prisma.admin.update({
      where: { id: account.id },
      data: { lastLoginAt: new Date() },
    });
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

  // ============================================================
  // パスワード再発行: リクエスト
  // ============================================================
  // slug + email から管理者を特定し、リセットトークンを発行してメール送信。
  // ※ メールアドレスの存在有無を漏らさないため、該当が無くても例外を投げず
  //   正常終了する（呼び出し側は常に同じ応答を返す）。
  async requestPasswordReset(slug: string, email: string, frontendUrl: string) {
    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (!tenant || tenant.status === 'suspended') return; // 秘匿

    const admin = await prisma.admin.findFirst({
      where: { tenantId: tenant.id, email, role: 'admin' },
    });
    if (!admin) return; // 秘匿（該当なしでも正常終了）

    // 平文トークン生成（URL安全）。DBにはハッシュのみ保存。
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRES_MINUTES * 60 * 1000);

    // 同一管理者の未使用トークンは無効化（使い回し防止）
    await prisma.passwordResetToken.deleteMany({
      where: { adminId: admin.id, usedAt: null },
    });
    await prisma.passwordResetToken.create({
      data: { adminId: admin.id, tenantId: tenant.id, tokenHash, expiresAt },
    });

    // トークンとslugをURLに載せる（フロントの再設定画面）
    const resetUrl =
      `${frontendUrl.replace(/\/$/, '')}/admin/reset-password` +
      `?token=${token}&tenant=${encodeURIComponent(slug)}`;

    await sendMail({
      to: admin.email,
      subject: `【${tenant.name}】パスワード再設定のご案内`,
      html: buildPasswordResetEmail({
        tenantName: tenant.name,
        resetUrl,
        expiresMinutes: RESET_TOKEN_EXPIRES_MINUTES,
      }),
    });
  },

  // ============================================================
  // パスワード再発行: 実行
  // ============================================================
  // トークンを検証し、有効なら新パスワードに更新してトークンを使用済みにする。
  async resetPassword(token: string, newPassword: string) {
    const tokenHash = hashToken(token);
    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new Error('リンクが無効か、有効期限が切れています。お手数ですが再度お試しください。');
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    // パスワード更新とトークン使用済み化を同時に
    await prisma.$transaction([
      prisma.admin.update({ where: { id: record.adminId }, data: { password: hashed } }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);
  },
};
