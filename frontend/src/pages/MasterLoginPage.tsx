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
import { Visibility, VisibilityOff, SupervisorAccount } from '@mui/icons-material';
import { PublicLayout } from '@/layouts/PublicLayout';
import { useAuth } from '@/hooks/useAuth';

// ============================================================
// MasterLoginPage
// ============================================================
// 運営者(master)専用ログインページ（別導線）。
// テナントIDは不要（master は全テナント横断）。
// ============================================================

export const MasterLoginPage = () => {
  const navigate = useNavigate();
  const { loginMaster, role, loading: authLoading } = useAuth();

  // 既に master でログイン済みならダッシュボードへ
  useEffect(() => {
    if (!authLoading && role === 'master') {
      navigate('/master/dashboard', { replace: true });
    }
  }, [role, authLoading, navigate]);

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
      await loginMaster(email, password);
      navigate('/master/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 4 }}>
          <SupervisorAccount sx={{ fontSize: 60, color: '#6a1b9a', mr: 2 }} />
          <Typography variant="h2" sx={{ fontWeight: 600, color: '#6a1b9a' }}>
            Master Sign In
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

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
                  onClick={() => setShowPassword(!showPassword)}
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
          fullWidth
          size="large"
          disabled={loading || !email || !password}
          sx={{ mb: 3, bgcolor: '#6a1b9a', '&:hover': { bgcolor: '#4a148c' } }}
        >
          {loading ? 'ログイン中...' : '運営者ログイン'}
        </Button>
      </Box>
    </PublicLayout>
  );
};
