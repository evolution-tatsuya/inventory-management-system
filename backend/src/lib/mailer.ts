// ============================================================
// mailer: Gmail SMTP (nodemailer) を使ったメール送信
// ============================================================
// パスワード再発行メールなどの送信に使用。
// 環境変数:
//   GMAIL_USER          … 送信元 Gmail アドレス（例: zaiko.system.no.1@gmail.com）
//   GMAIL_APP_PASSWORD  … Gmail のアプリパスワード（16桁。スペースは無視される）
//   MAIL_FROM_NAME      … 送信元の表示名（任意。既定: "在庫管理システム"）
//
// いずれかが未設定の場合は送信をスキップし警告ログのみ（開発時の安全策）。
// ※ アプリパスワードは Google アカウントの「2段階認証 → アプリパスワード」で発行。
// ============================================================

import nodemailer from 'nodemailer';

const gmailUser = process.env.GMAIL_USER;
// アプリパスワードは表示上スペース区切りだが、実際にはスペース無しでも可。念のため除去。
const gmailAppPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, '');
const fromName = process.env.MAIL_FROM_NAME || '在庫管理システム';

const isConfigured = Boolean(gmailUser && gmailAppPassword);

const transporter = isConfigured
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    })
  : null;

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * メールを送信する。Gmail 認証情報が未設定なら送信せず警告ログのみ（開発時の安全策）。
 */
export const sendMail = async ({ to, subject, html }: SendMailOptions): Promise<void> => {
  if (!transporter) {
    console.warn(
      '[mailer] GMAIL_USER / GMAIL_APP_PASSWORD が未設定のためメール送信をスキップしました:',
      { to, subject },
    );
    return;
  }
  try {
    await transporter.sendMail({
      from: `${fromName} <${gmailUser}>`,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error('[mailer] メール送信エラー:', error);
    throw new Error('メールの送信に失敗しました');
  }
};

/**
 * パスワード再発行メールのHTMLを組み立てる。
 */
export const buildPasswordResetEmail = (params: {
  tenantName: string;
  resetUrl: string;
  expiresMinutes: number;
}): string => {
  const { tenantName, resetUrl, expiresMinutes } = params;
  return `
    <div style="font-family: sans-serif; line-height: 1.7; color: #333;">
      <h2 style="color: #667eea;">パスワード再設定のご案内</h2>
      <p>「${tenantName}」の管理者アカウントのパスワード再設定リクエストを受け付けました。</p>
      <p>下のボタンから新しいパスワードを設定してください。（有効期限: ${expiresMinutes}分）</p>
      <p style="margin: 24px 0;">
        <a href="${resetUrl}"
           style="background:#667eea;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
          パスワードを再設定する
        </a>
      </p>
      <p style="font-size: 13px; color: #666;">
        ボタンが開けない場合は、以下のURLをブラウザに貼り付けてください:<br>
        <span style="word-break: break-all;">${resetUrl}</span>
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
      <p style="font-size: 12px; color: #999;">
        このメールに心当たりがない場合は、破棄してください。パスワードは変更されません。
      </p>
    </div>
  `;
};
