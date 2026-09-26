import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { PublicLayout } from '@/layouts/PublicLayout';
import { resetPassword } from '@/services/api/auth';

// ============================================================
// ResetPasswordPage
// ============================================================
// メールのリンク（/admin/reset-password?token=...）から遷移。
// トークン + 新パスワードで再設定を実行する。
// ============================================================

export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const token = new URLSearchParams(window.location.search).get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください');
      return;
    }
    if (password !== confirm) {
      setError('確認用パスワードが一致しません');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '再設定に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, textAlign: 'center' }}>
          新しいパスワードの設定
        </Typography>

        {!token ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            リンクが不正です。メールのリンクからもう一度アクセスしてください。
          </Alert>
        ) : done ? (
          <>
            <Alert severity="success" sx={{ mb: 3 }}>
              パスワードを変更しました。新しいパスワードでログインしてください。
            </Alert>
            <Button fullWidth variant="contained" onClick={() => navigate('/admin/login')}>
              ログイン画面へ
            </Button>
          </>
        ) : (
          <>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <TextField
              label="新しいパスワード（8文字以上）"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword((v) => !v)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="新しいパスワード（確認）"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              sx={{ mb: 3 }}
            />

            <Button type="submit" fullWidth variant="contained" disabled={loading} sx={{ py: 1.2 }}>
              {loading ? '設定中...' : 'パスワードを変更'}
            </Button>
          </>
        )}
      </Box>
    </PublicLayout>
  );
};
