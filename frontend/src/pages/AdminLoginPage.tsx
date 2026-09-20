import { useState, useEffect } from 'react';
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
import { Visibility, VisibilityOff, AdminPanelSettings } from '@mui/icons-material';
import { PublicLayout } from '@/layouts/PublicLayout';
import { useAuth } from '@/hooks/useAuth';

// ============================================================
// AdminLoginPage
// ============================================================
// 管理者用ログインページ
// - メールアドレス入力
// - パスワード入力
// - ログインボタン
// - デモアカウント情報表示
// ============================================================

export const AdminLoginPage = () => {
  const navigate = useNavigate();
  const { login, account, userType, loading: authLoading } = useAuth();

  // 既にログイン済みの場合はリダイレクト
  useEffect(() => {
    if (!authLoading && account && userType) {
      if (userType === 'admin') {
        // 管理者の場合は管理ダッシュボードへ
        navigate('/admin/dashboard', { replace: true });
      } else {
        // 一般ユーザーの場合はカテゴリー一覧へ
        navigate('/categories', { replace: true });
      }
    }
  }, [account, userType, authLoading, navigate]);

  // テナント識別子（slug）。URLの ?tenant= があれば初期値に、無ければ 'default'
  const initialSlug =
    new URLSearchParams(window.location.search).get('tenant') || 'default';
  const [tenantSlug, setTenantSlug] = useState(initialSlug);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(tenantSlug.trim(), email, password, 'admin'); // 管理者としてログイン
      // 管理者ダッシュボードにリダイレクト
      navigate('/admin/dashboard');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('ログインに失敗しました');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <PublicLayout>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 4 }}>
          <AdminPanelSettings sx={{ fontSize: 60, color: '#d32f2f', mr: 2 }} />
          <Typography
            variant="h2"
            sx={{ fontWeight: 600, color: '#d32f2f' }}
          >
            Admin Sign In
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          label="テナントID"
          type="text"
          fullWidth
          required
          value={tenantSlug}
          onChange={(e) => setTenantSlug(e.target.value)}
          sx={{ mb: 2 }}
          helperText="在庫管理システムの識別子（例: default）"
        />

        <TextField
          label="メールアドレス"
          type="email"
          fullWidth
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={{ mb: 2 }}
          autoComplete="email"
          autoFocus
        />

        <TextField
          label="パスワード"
          type={showPassword ? 'text' : 'password'}
          fullWidth
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          sx={{ mb: 3 }}
          autoComplete="current-password"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={handleTogglePasswordVisibility}
                  edge="end"
                  aria-label="パスワードの表示/非表示を切り替え"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Button
          type="submit"
          variant="contained"
          color="error"
          fullWidth
          size="large"
          disabled={loading || !email || !password}
          sx={{ mb: 3 }}
        >
          {loading ? 'ログイン中...' : '管理者ログイン'}
        </Button>

        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Button variant="text" size="small" onClick={() => navigate('/login')}>
            一般利用者の方はこちら
          </Button>
        </Box>
      </Box>
    </PublicLayout>
  );
};
