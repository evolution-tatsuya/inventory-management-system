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
import { Visibility, VisibilityOff, VpnKey } from '@mui/icons-material';
import { PublicLayout } from '@/layouts/PublicLayout';
import * as masterApi from '@/services/api/master';

// ============================================================
// ActivatePage（購入者用・無認証）
// ============================================================
// ライセンスキーを入力し、自分の管理者アカウント（email/パスワード）を登録して
// テナントを有効化する。成功後は該当テナントのログイン画面へ誘導。
// ============================================================

export const ActivatePage = () => {
  const navigate = useNavigate();

  const [licenseKey, setLicenseKey] = useState(
    new URLSearchParams(window.location.search).get('key') || '',
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [department, setDepartment] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [doneSlug, setDoneSlug] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await masterApi.activate({
        licenseKey: licenseKey.trim(),
        email: email.trim(),
        password,
        name: name.trim(),
        companyName: companyName.trim() || undefined,
        department: department.trim() || undefined,
      });
      setDoneSlug(res.slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : '有効化に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (doneSlug) {
    return (
      <PublicLayout>
        <Box sx={{ textAlign: 'center' }}>
          <Alert severity="success" sx={{ mb: 3 }}>
            有効化が完了しました。登録したメールアドレスとパスワードでログインできます。
          </Alert>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate(`/admin/login?tenant=${doneSlug}`)}
          >
            ログイン画面へ
          </Button>
        </Box>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 4 }}>
          <VpnKey sx={{ fontSize: 60, color: '#1976d2', mr: 2 }} />
          <Typography variant="h2" sx={{ fontWeight: 600, color: '#1976d2' }}>
            ライセンス有効化
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          label="ライセンスキー"
          fullWidth
          required
          value={licenseKey}
          onChange={(e) => setLicenseKey(e.target.value)}
          sx={{ mb: 2 }}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          autoFocus
        />
        <TextField
          label="メールアドレス（管理者アカウント）"
          type="email"
          fullWidth
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={{ mb: 2 }}
          autoComplete="email"
        />
        <TextField
          label="会社名（任意）"
          fullWidth
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          sx={{ mb: 2 }}
          placeholder="例: 株式会社ゲイナー"
        />
        <TextField
          label="部署（任意）"
          fullWidth
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          sx={{ mb: 2 }}
          placeholder="例: 購買部"
        />
        <TextField
          label="お名前"
          fullWidth
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mb: 2 }}
          helperText="どなたが登録したか分かるようご入力ください"
        />
        <TextField
          label="パスワード（8文字以上）"
          type={showPassword ? 'text' : 'password'}
          fullWidth
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          sx={{ mb: 3 }}
          autoComplete="new-password"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
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
          disabled={loading || !licenseKey || !email || !password || !name.trim()}
        >
          {loading ? '有効化中...' : '有効化する'}
        </Button>
      </Box>
    </PublicLayout>
  );
};

export default ActivatePage;
