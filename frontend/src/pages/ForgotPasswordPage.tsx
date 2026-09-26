import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, TextField, Button, Typography, Alert } from '@mui/material';
import { PublicLayout } from '@/layouts/PublicLayout';
import { forgotPassword } from '@/services/api/auth';

// ============================================================
// ForgotPasswordPage
// ============================================================
// パスワード再発行リクエスト画面（ログイン不要）。
// テナントID(slug) + メールアドレスを入力 → 再設定リンクをメール送信。
// セキュリティ上、該当有無に関わらず「送信しました」と表示する。
// ============================================================

export const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const initialSlug =
    new URLSearchParams(window.location.search).get('tenant') || 'default';
  const [tenantSlug, setTenantSlug] = useState(initialSlug);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!tenantSlug.trim() || !email.trim()) {
      setError('テナントIDとメールアドレスを入力してください');
      return;
    }
    setLoading(true);
    try {
      await forgotPassword(tenantSlug.trim(), email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, textAlign: 'center' }}>
          パスワードの再設定
        </Typography>

        {sent ? (
          <>
            <Alert severity="success" sx={{ my: 3 }}>
              入力されたメールアドレスが登録されている場合、パスワード再設定用のリンクをお送りしました。
              メールをご確認ください（届かない場合は迷惑メールフォルダもご確認ください）。
            </Alert>
            <Button fullWidth variant="outlined" onClick={() => navigate('/admin/login')}>
              ログイン画面に戻る
            </Button>
          </>
        ) : (
          <>
            <Typography variant="body2" sx={{ color: '#666', mb: 3, textAlign: 'center' }}>
              テナントIDと登録メールアドレスを入力してください。<br />
              パスワード再設定用のリンクをメールでお送りします。
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <TextField
              label="テナントID"
              fullWidth
              required
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
              helperText="在庫管理システムの識別子（例: default）"
              sx={{ mb: 2 }}
            />
            <TextField
              label="メールアドレス"
              type="email"
              fullWidth
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: 3 }}
            />

            <Button type="submit" fullWidth variant="contained" disabled={loading} sx={{ mb: 2, py: 1.2 }}>
              {loading ? '送信中...' : '再設定リンクを送信'}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Button variant="text" size="small" onClick={() => navigate('/admin/login')}>
                ログイン画面に戻る
              </Button>
            </Box>
          </>
        )}
      </Box>
    </PublicLayout>
  );
};
