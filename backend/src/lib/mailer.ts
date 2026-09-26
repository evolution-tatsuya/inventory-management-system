// ============================================================
// mailer: Resend を使ったメール送信
// ============================================================
// パスワード再発行メールなどの送信に使用。
// 環境変数:
//   RESEND_API_KEY  … Resend の API キー（必須。未設定なら送信をスキップしログのみ）
//   RESEND_FROM     … 送信元アドレス（例: "在庫管理システム <noreply@yourdomain.com>"）
//                     未設定時は Resend のテスト用 onboarding@resend.dev を使う
// ============================================================

import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.RESEND_FROM || 'onboarding@resend.dev';

const resend = apiKey ? new Resend(apiKey) : null;

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * メールを送信する。RESEND_API_KEY 未設定時は送信せず警告ログのみ（開発時の安全策）。
 */
export const sendMail = async ({ to, subject, html }: SendMailOptions): Promise<void> => {
  if (!resend) {
    console.warn('[mailer] RESEND_API_KEY が未設定のためメール送信をスキップしました:', { to, subject });
    return;
  }
  const { error } = await resend.emails.send({ from: fromAddress, to, subject, html });
  if (error) {
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
