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
import { Visibility, VisibilityOff, Lock } from '@mui/icons-material';
import { PublicLayout } from '@/layouts/PublicLayout';
import { useAuth } from '@/hooks/useAuth';

// ============================================================
// LoginPage
// ============================================================
// ログインページ（P-001）
// - メールアドレス入力
// - パスワード入力
// - ログインボタン
// - デモアカウント情報表示
// ============================================================

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

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
      await login(email, password);
      navigate('/categories');
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
          <Lock sx={{ fontSize: 60, color: '#1976d2', mr: 2 }} />
          <Typography
            variant="h2"
            sx={{ fontWeight: 600, color: '#1976d2' }}
          >
            Member Sign In
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
          fullWidth
          size="large"
          disabled={loading || !email || !password}
          sx={{ mb: 3 }}
        >
          {loading ? 'ログイン中...' : 'ログイン'}
        </Button>

        <Box
          sx={{
            p: 2,
            backgroundColor: 'grey.100',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'grey.300',
          }}
        >
          <Typography variant="caption" display="block" sx={{ fontWeight: 600, mb: 1 }}>
            デモアカウント
          </Typography>
          <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace' }}>
            email: admin@inventory-system.local
          </Typography>
          <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace' }}>
            password: InventoryAdmin2025!
          </Typography>
        </Box>
      </Box>
    </PublicLayout>
  );
};
