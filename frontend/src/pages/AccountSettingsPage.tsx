import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  Divider,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff, Save, Email, Lock } from '@mui/icons-material';
import { MainLayout } from '@/layouts/MainLayout';

// ============================================================
// AccountSettingsPage (A-006)
// ============================================================
// アカウント設定ページ（管理者専用）
// - メールアドレス変更
// - パスワード変更
// ============================================================

export const AccountSettingsPage = () => {
  // メールアドレス変更フォーム
  const [emailFormData, setEmailFormData] = useState({
    newEmail: '',
    currentPassword: '',
  });
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [emailError, setEmailError] = useState('');

  // パスワード変更フォーム
  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // パスワード表示状態
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showEmailCurrentPassword, setShowEmailCurrentPassword] = useState(false);

  // メールアドレス変更処理
  const handleEmailChange = () => {
    setEmailError('');
    setEmailSuccess(false);

    // バリデーション
    if (!emailFormData.newEmail) {
      setEmailError('新しいメールアドレスを入力してください');
      return;
    }

    if (!emailFormData.currentPassword) {
      setEmailError('現在のパスワードを入力してください');
      return;
    }

    // メールアドレス形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailFormData.newEmail)) {
      setEmailError('有効なメールアドレス形式を入力してください');
      return;
    }

    // TODO: バックエンドAPI連携
    // PUT /api/admin/account/email
    // { newEmail, currentPassword }

    // モック実装（成功）
    console.log('メールアドレス変更:', emailFormData);
    setEmailSuccess(true);
    setEmailFormData({ newEmail: '', currentPassword: '' });

    // 3秒後に成功メッセージを消す
    setTimeout(() => setEmailSuccess(false), 3000);
  };

  // パスワード変更処理
  const handlePasswordChange = () => {
    setPasswordError('');
    setPasswordSuccess(false);

    // バリデーション
    if (!passwordFormData.currentPassword) {
      setPasswordError('現在のパスワードを入力してください');
      return;
    }

    if (!passwordFormData.newPassword) {
      setPasswordError('新しいパスワードを入力してください');
      return;
    }

    if (passwordFormData.newPassword.length < 8) {
      setPasswordError('新しいパスワードは8文字以上で入力してください');
      return;
    }

    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      setPasswordError('新しいパスワードと確認用パスワードが一致しません');
      return;
    }

    if (passwordFormData.currentPassword === passwordFormData.newPassword) {
      setPasswordError('現在のパスワードと同じパスワードは使用できません');
      return;
    }

    // TODO: バックエンドAPI連携
    // PUT /api/admin/account/password
    // { currentPassword, newPassword }

    // モック実装（成功）
    console.log('パスワード変更:', { currentPassword: '***', newPassword: '***' });
    setPasswordSuccess(true);
    setPasswordFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });

    // 3秒後に成功メッセージを消す
    setTimeout(() => setPasswordSuccess(false), 3000);
  };

  return (
    <MainLayout>
      <Box sx={{ maxWidth: 800, mx: 'auto' }}>
        {/* ヘッダー */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
            アカウント設定
          </Typography>
          <Typography variant="body2" color="text.secondary">
            メールアドレスとパスワードを変更できます
          </Typography>
        </Box>

        {/* メールアドレス変更セクション */}
        <Card sx={{ mb: 4, boxShadow: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Email sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                メールアドレス変更
              </Typography>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {emailSuccess && (
              <Alert severity="success" sx={{ mb: 3 }}>
                メールアドレスを変更しました
              </Alert>
            )}

            {emailError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {emailError}
              </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                label="新しいメールアドレス"
                type="email"
                value={emailFormData.newEmail}
                onChange={(e) =>
                  setEmailFormData({ ...emailFormData, newEmail: e.target.value })
                }
                fullWidth
                placeholder="example@domain.com"
              />

              <TextField
                label="現在のパスワード（確認用）"
                type={showEmailCurrentPassword ? 'text' : 'password'}
                value={emailFormData.currentPassword}
                onChange={(e) =>
                  setEmailFormData({ ...emailFormData, currentPassword: e.target.value })
                }
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowEmailCurrentPassword(!showEmailCurrentPassword)}
                        edge="end"
                      >
                        {showEmailCurrentPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={<Save />}
                onClick={handleEmailChange}
                sx={{ alignSelf: 'flex-start' }}
              >
                メールアドレスを変更
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* パスワード変更セクション */}
        <Card sx={{ boxShadow: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Lock sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                パスワード変更
              </Typography>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {passwordSuccess && (
              <Alert severity="success" sx={{ mb: 3 }}>
                パスワードを変更しました
              </Alert>
            )}

            {passwordError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {passwordError}
              </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                label="現在のパスワード"
                type={showCurrentPassword ? 'text' : 'password'}
                value={passwordFormData.currentPassword}
                onChange={(e) =>
                  setPasswordFormData({ ...passwordFormData, currentPassword: e.target.value })
                }
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        edge="end"
                      >
                        {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                label="新しいパスワード"
                type={showNewPassword ? 'text' : 'password'}
                value={passwordFormData.newPassword}
                onChange={(e) =>
                  setPasswordFormData({ ...passwordFormData, newPassword: e.target.value })
                }
                fullWidth
                helperText="8文字以上で入力してください"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        edge="end"
                      >
                        {showNewPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                label="新しいパスワード（確認用）"
                type={showConfirmPassword ? 'text' : 'password'}
                value={passwordFormData.confirmPassword}
                onChange={(e) =>
                  setPasswordFormData({ ...passwordFormData, confirmPassword: e.target.value })
                }
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={<Save />}
                onClick={handlePasswordChange}
                sx={{ alignSelf: 'flex-start' }}
              >
                パスワードを変更
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* 注意事項 */}
        <Alert severity="info" sx={{ mt: 4 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            注意事項
          </Typography>
          <Typography variant="body2" component="ul" sx={{ pl: 2, m: 0 }}>
            <li>メールアドレス変更時は、現在のパスワードの入力が必要です</li>
            <li>パスワードは8文字以上で設定してください</li>
            <li>セキュリティのため、定期的なパスワード変更を推奨します</li>
          </Typography>
        </Alert>
      </Box>
    </MainLayout>
  );
};
