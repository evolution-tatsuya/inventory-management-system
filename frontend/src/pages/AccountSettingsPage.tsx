import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Button,
  TextField,
  Avatar,
  Radio,
  RadioGroup,
  FormControlLabel,
  Alert,
  Snackbar,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Logout, Visibility, VisibilityOff, Upload } from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { accountApi, authApi, systemSettingsApi, imagesApi } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { getLogoMaxHeight, getLogoMaxWidth } from '@/utils/logoSize';
import type { SystemSettings } from '@/services/api/types';

// ============================================================
// AccountSettingsPage (A-005)
// ============================================================
// アカウント設定ページ - モックアップ準拠
// ============================================================

export const AccountSettingsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { account } = useAuth();

  // 基本情報フォーム
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [department, setDepartment] = useState('');

  // パスワード変更フォーム
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // パスワード表示/非表示の状態
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // アカウント種別選択（管理者は両方のアカウントを編集可能）
  const [selectedUserType, setSelectedUserType] = useState<'admin' | 'user'>('admin');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [showAccountDetails, setShowAccountDetails] = useState(false); // 詳細表示フラグ
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // システム設定
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [systemName, setSystemName] = useState('');
  const [logoSize, setLogoSize] = useState('small'); // ロゴサイズ: small/medium/large
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [headerColor, setHeaderColor] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // アカウント一覧取得
  const { data: accountList } = useQuery({
    queryKey: ['accountList', selectedUserType],
    queryFn: async () => {
      const response = await accountApi.getAllAccounts(selectedUserType);
      return response;
    },
  });

  // アカウント種別が変わったら、selectedAccountIdをリセット & 古いクエリを削除
  useEffect(() => {
    setSelectedAccountId('');
    setShowAccountDetails(false); // 詳細表示をリセット
    // 実行中のクエリをキャンセル
    queryClient.cancelQueries({ queryKey: ['account'] });
    // 古いアカウントクエリのキャッシュを完全に削除（再実行しない）
    queryClient.removeQueries({ queryKey: ['account'] });
  }, [selectedUserType, queryClient]);

  // アカウント一覧が取得されたら、最初のアカウントを選択
  useEffect(() => {
    if (accountList && accountList.length > 0) {
      setSelectedAccountId(accountList[0].id);
    }
  }, [accountList]);

  // 選択されたアカウントのデータを取得
  const { data: accountData } = useQuery({
    queryKey: ['account', selectedUserType, selectedAccountId],
    queryFn: async () => {
      if (!selectedAccountId) {
        return null;
      }

      // アカウント一覧から、選択されたIDが存在するか確認
      const isValidId = accountList?.some(acc => acc.id === selectedAccountId);
      if (!isValidId) {
        return null;
      }

      const response = await accountApi.getAccount(selectedUserType, selectedAccountId);
      return response;
    },
    enabled: showAccountDetails && !!selectedAccountId && !!accountList && accountList.some(acc => acc.id === selectedAccountId), // ボタンが押されたときだけ実行
    retry: false, // 404エラー時にリトライしない
    staleTime: 0, // 常に最新のデータを取得
  });

  // アカウントデータが取得されたら、フォームに反映
  useEffect(() => {
    console.log('🔍 accountData updated:', accountData);
    if (accountData) {
      console.log('✅ Setting form values:', {
        name: accountData.name,
        email: accountData.email,
      });
      setDisplayName(accountData.name || '');
      setEmail(accountData.email || '');
      // 会社名・部署は admin のみ（User型には存在しない）
      const prof = accountData as { companyName?: string | null; department?: string | null };
      setCompanyName(prof.companyName ?? '');
      setDepartment(prof.department ?? '');
    }
  }, [accountData]);

  // システム設定取得
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await systemSettingsApi.getSystemSettings();
        setSystemSettings(settings);
        setSystemName(settings.systemName);
        setLogoPreview(settings.logoUrl || '');
        setLogoSize(settings.logoSize || 'small');
        setHeaderColor(settings.headerColor);
      } catch (error) {
        console.error('システム設定取得エラー:', error);
      }
    };
    fetchSettings();
  }, []);

  // ログアウト
  const handleLogout = async () => {
    try {
      await authApi.logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // キャンセル処理
  const handleCancel = () => {
    if (accountData) {
      setDisplayName(accountData.name || '');
      setEmail(accountData.email || '');
      const prof = accountData as { companyName?: string | null; department?: string | null };
      setCompanyName(prof.companyName ?? '');
      setDepartment(prof.department ?? '');
    }
  };

  // ユーザー名変更処理
  const handleDisplayNameChange = async () => {
    try {
      console.log('🔍 Frontend - handleDisplayNameChange:', {
        newDisplayName: displayName,
        userType: selectedUserType,
        accountId: selectedAccountId,
        accountData: accountData,
      });

      await accountApi.updateDisplayName({
        newDisplayName: displayName,
        userType: selectedUserType,
        accountId: selectedAccountId, // 管理者が他のアカウントを編集する場合のID
      });
      setSuccessMessage('ユーザー名を変更しました');
      // アカウントデータを再取得
      queryClient.invalidateQueries({ queryKey: ['account', selectedUserType, selectedAccountId] });
      queryClient.invalidateQueries({ queryKey: ['accountList', selectedUserType] });
    } catch (error) {
      console.error('❌ Frontend - handleDisplayNameChange Error:', error);
      setErrorMessage('ユーザー名の変更に失敗しました');
    }
  };

  // メールアドレス変更処理
  const handleEmailChange = async () => {
    try {
      await accountApi.updateEmail({
        newEmail: email,
        userType: selectedUserType,
        accountId: selectedAccountId, // 管理者が他のアカウントを編集する場合のID
      });
      setSuccessMessage('メールアドレスを変更しました');
      // アカウントデータを再取得
      queryClient.invalidateQueries({ queryKey: ['account', selectedUserType, selectedAccountId] });
      queryClient.invalidateQueries({ queryKey: ['accountList', selectedUserType] });
    } catch (error) {
      setErrorMessage('メールアドレスの変更に失敗しました');
    }
  };

  // プロフィール（名前・会社名・部署）変更処理（管理者のみ）
  const handleProfileChange = async () => {
    try {
      if (!displayName.trim()) {
        setErrorMessage('お名前を入力してください');
        return;
      }
      await accountApi.updateProfile({
        name: displayName.trim(),
        companyName,
        department,
        accountId: selectedAccountId,
      });
      setSuccessMessage('プロフィールを変更しました');
      queryClient.invalidateQueries({ queryKey: ['account', selectedUserType, selectedAccountId] });
      queryClient.invalidateQueries({ queryKey: ['accountList', selectedUserType] });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'プロフィールの変更に失敗しました',
      );
    }
  };

  // 基本情報変更処理（まとめて保存）
  const handleSaveBasicInfo = async () => {
    // 対象アカウントが未取得（種別に該当アカウントが無い等）の場合は保存しない
    if (!accountData) {
      setErrorMessage('先に「現在の登録状況確認」で対象アカウントを表示してください');
      return;
    }
    const prof = (accountData ?? {}) as {
      companyName?: string | null;
      department?: string | null;
    };
    const prevCompany = prof.companyName ?? '';
    const prevDept = prof.department ?? '';
    if (selectedUserType === 'admin') {
      // admin は名前・会社名・部署をまとめて更新
      if (
        displayName !== (accountData?.name || '') ||
        companyName !== prevCompany ||
        department !== prevDept
      ) {
        await handleProfileChange();
      }
    } else {
      // user は従来通り名前のみ
      if (displayName !== accountData?.name) {
        await handleDisplayNameChange();
      }
    }
    // メールアドレスが変更されている場合
    if (email !== accountData?.email) {
      await handleEmailChange();
    }
  };

  // パスワード変更処理
  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setErrorMessage('新しいパスワードと確認用パスワードが一致しません');
      return;
    }
    try {
      await accountApi.updatePassword({
        currentPassword,
        newPassword,
        userType: selectedUserType,
        accountId: selectedAccountId, // 管理者が他のアカウントのパスワードを変更する場合のID
      });
      setSuccessMessage('パスワードを変更しました');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setErrorMessage('パスワードの変更に失敗しました');
    }
  };

  // ロゴアップロード処理
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 2MB制限
    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('ファイルサイズは2MB以下にしてください');
      return;
    }

    // プレビュー表示
    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setLogoFile(file);
  };

  // システム設定更新処理
  const handleUpdateSystemSettings = async () => {
    try {
      let logoUrl = systemSettings?.logoUrl || null;

      // ロゴ画像をアップロード
      if (logoFile) {
        setUploadingLogo(true);
        const uploadResponse: any = await imagesApi.uploadImage(logoFile);
        // バックエンドは { success, url, publicId } を返すため url を使う
        logoUrl = uploadResponse.url || uploadResponse.imageUrl;
        setUploadingLogo(false);
      }

      // システム設定を更新
      const updated = await systemSettingsApi.updateSystemSettings({
        systemName,
        logoUrl,
        logoSize,
        headerColor,
      });

      setSystemSettings(updated);
      setSuccessMessage('システム設定を更新しました');

      // ページリロードしてヘッダーを更新
      window.location.reload();
    } catch (error) {
      console.error('システム設定更新エラー:', error);
      setErrorMessage('システム設定の更新に失敗しました');
      setUploadingLogo(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'auto',
      }}
    >
      {/* ヘッダー */}
      <Box
        sx={{
          background: systemSettings?.headerColor || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '20px 30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {systemSettings?.logoUrl && (
          <Box
            component="img"
            src={systemSettings.logoUrl}
            alt="Logo"
            sx={{
              maxHeight: getLogoMaxHeight(systemSettings?.logoSize),
              maxWidth: getLogoMaxWidth(systemSettings?.logoSize),
              objectFit: 'contain',
              mr: 2,
            }}
          />
        )}
        <Typography
          sx={{
            fontSize: '22px',
            fontWeight: 600,
            letterSpacing: '0.5px',
          }}
        >
          {systemSettings?.systemName || '階層型在庫管理システム'}
        </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            onClick={() => navigate('/categories')}
            sx={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '2px solid white',
              color: 'white',
              padding: '10px 24px',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 600,
              textTransform: 'none',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'white',
                color: '#667eea',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
              },
            }}
          >
            ユーザー画面を見る
          </Button>
          <Button
          onClick={handleLogout}
          sx={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: '2px solid white',
            color: 'white',
            padding: '10px 24px',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: 600,
            transition: 'all 0.3s ease',
            '&:hover': {
              background: 'white',
              color: '#667eea',
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            },
          }}
        >
          ログアウト
          </Button>
        </Box>
      </Box>

      {/* タブナビゲーションバー */}
      <Box
        sx={{
          display: 'flex',
          background: '#f7f7f7',
          borderBottom: '2px solid #e0e0e0',
          overflowX: 'auto',
        }}
      >
        <Button
          onClick={() => navigate('/admin/dashboard')}
          sx={{
            padding: '16px 32px',
            background: 'transparent',
            borderBottom: '3px solid transparent',
            borderRadius: 0,
            fontSize: '15px',
            fontWeight: 600,
            color: '#666',
            transition: 'all 0.3s ease',
            whiteSpace: 'nowrap',
            '&:hover': {
              background: '#e9ecef',
              color: '#667eea',
            },
          }}
        >
          ダッシュボード
        </Button>
        <Button
          onClick={() => navigate('/admin/categories')}
          sx={{
            padding: '16px 32px',
            background: 'transparent',
            borderBottom: '3px solid transparent',
            borderRadius: 0,
            fontSize: '15px',
            fontWeight: 600,
            color: '#666',
            transition: 'all 0.3s ease',
            whiteSpace: 'nowrap',
            '&:hover': {
              background: '#e9ecef',
              color: '#667eea',
            },
          }}
        >
          カテゴリー管理
        </Button>
        <Button
          onClick={() => navigate('/admin/genres')}
          sx={{
            padding: '16px 32px',
            background: 'transparent',
            borderBottom: '3px solid transparent',
            borderRadius: 0,
            fontSize: '15px',
            fontWeight: 600,
            color: '#666',
            transition: 'all 0.3s ease',
            whiteSpace: 'nowrap',
            '&:hover': {
              background: '#e9ecef',
              color: '#667eea',
            },
          }}
        >
          ジャンル管理
        </Button>
        <Button
          onClick={() => navigate('/admin/units')}
          sx={{
            padding: '16px 32px',
            background: 'transparent',
            borderBottom: '3px solid transparent',
            borderRadius: 0,
            fontSize: '15px',
            fontWeight: 600,
            color: '#666',
            transition: 'all 0.3s ease',
            whiteSpace: 'nowrap',
            '&:hover': {
              background: '#e9ecef',
              color: '#667eea',
            },
          }}
        >
          ユニット管理
        </Button>
        <Button
          onClick={() => navigate('/admin/parts')}
          sx={{
            padding: '16px 32px',
            background: 'transparent',
            borderBottom: '3px solid transparent',
            borderRadius: 0,
            fontSize: '15px',
            fontWeight: 600,
            color: '#666',
            transition: 'all 0.3s ease',
            whiteSpace: 'nowrap',
            '&:hover': {
              background: '#e9ecef',
              color: '#667eea',
            },
          }}
        >
          パーツ管理
        </Button>
          <Button
            onClick={() => navigate('/admin/inventory-count')}
            sx={{
              padding: '16px 32px',
              background: '#f7f7f7',
              color: '#666',
              fontSize: '15px',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 0,
              minWidth: 'fit-content',
              '&:hover': {
                background: '#e0e0e0',
              },
            }}
          >
            棚卸し
          </Button>
          <Button
            onClick={() => navigate('/admin/owner')}
            sx={{
              padding: '16px 32px',
              background: '#f7f7f7',
              color: '#666',
              fontSize: '15px',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 0,
              minWidth: 'fit-content',
              '&:hover': {
                background: '#e0e0e0',
              },
            }}
          >
            運営者
          </Button>
        <Button
          onClick={() => navigate('/admin/account-settings')}
          sx={{
            padding: '16px 32px',
            background: 'white',
            borderBottom: '3px solid #667eea',
            borderRadius: 0,
            fontSize: '15px',
            fontWeight: 600,
            color: '#667eea',
            whiteSpace: 'nowrap',
          }}
        >
          アカウント設定
        </Button>
        <Button
          onClick={() => navigate('/admin/qr')}
          sx={{
            padding: '16px 32px',
            background: 'transparent',
            borderBottom: '3px solid transparent',
            borderRadius: 0,
            fontSize: '15px',
            fontWeight: 600,
            color: '#666',
            transition: 'all 0.3s ease',
            whiteSpace: 'nowrap',
            '&:hover': {
              background: '#e9ecef',
              color: '#667eea',
            },
          }}
        >
          QRコード
        </Button>
      </Box>

      {/* メインコンテンツ */}
      <Box
        sx={{
          background: '#f5f5f5',
          minHeight: 'calc(100vh - 130px)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            padding: '20px 40px 60px 40px',
          }}
        >
          {/* 中央配置コンテナ */}
          <Box sx={{ width: '100%', maxWidth: '800px' }}>
          {/* ページタイトル */}
          <Typography
            sx={{
              fontSize: '21px',
              fontWeight: 700,
              marginTop: '16px',
              marginBottom: '16px',
              color: '#333',
            }}
          >
            アカウント設定
          </Typography>

          {/* プロフィールカード */}
          <Box
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '16px',
              padding: '26px 38px',
              marginBottom: '13px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            }}
          >
            <Avatar
              sx={{
                width: 112,
                height: 112,
                background: 'white',
                color: '#667eea',
                fontSize: '51px',
                fontWeight: 700,
                marginBottom: '10px',
              }}
            >
              {selectedUserType === 'admin' ? 'A' : 'U'}
            </Avatar>
            <Typography
              sx={{
                color: 'white',
                fontSize: '19px',
                fontWeight: 600,
                marginBottom: '5px',
              }}
            >
              {accountData?.name || (selectedUserType === 'admin' ? '管理者' : '一般ユーザー')}
            </Typography>
            <Typography
              sx={{
                color: 'white',
                fontSize: '14px',
              }}
            >
              {accountData?.email || ''}
            </Typography>
          </Box>

          {/* アカウント種別選択 */}
          <Box
            sx={{
              background: 'white',
              borderRadius: '16px',
              padding: '19px',
              marginBottom: '13px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            }}
          >
            <Typography
              sx={{
                fontSize: '19px',
                fontWeight: 700,
                marginBottom: '13px',
                color: '#333',
              }}
            >
              アカウント種別
            </Typography>
            <RadioGroup
              value={selectedUserType}
              onChange={(e) => setSelectedUserType(e.target.value as 'admin' | 'user')}
            >
              <FormControlLabel
                value="admin"
                control={<Radio />}
                label="管理者アカウント"
              />
              <FormControlLabel
                value="user"
                control={<Radio />}
                label="一般ユーザーアカウント"
              />
            </RadioGroup>

            {/* アカウント選択ドロップダウン（複数アカウントがある場合のみ表示） */}
            {accountList && accountList.length > 1 && (
              <FormControl fullWidth sx={{ marginTop: '13px' }}>
                <InputLabel>アカウント選択</InputLabel>
                <Select
                  value={selectedAccountId}
                  label="アカウント選択"
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                >
                  {accountList.map((acc) => (
                    <MenuItem key={acc.id} value={acc.id}>
                      {acc.name || acc.email} ({acc.email})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* 現在の登録状況確認ボタン */}
            <Box sx={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
              <Button
                onClick={() => setShowAccountDetails(true)}
                variant="contained"
                sx={{
                  padding: '11px 32px',
                  fontSize: '14px',
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #63358b 100%)',
                  },
                }}
              >
                現在の登録状況確認
              </Button>
            </Box>
          </Box>

          {/* 基本情報セクション（詳細表示時のみ） */}
          {showAccountDetails && (
          <Box
            sx={{
              background: 'white',
              borderRadius: '16px',
              padding: '19px',
              marginBottom: '13px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            }}
          >
            <Typography
              sx={{
                fontSize: '19px',
                fontWeight: 700,
                marginBottom: '13px',
                color: '#333',
              }}
            >
              基本情報（{selectedUserType === 'admin' ? '管理者' : '一般ユーザー'}）
            </Typography>

            <Box sx={{ marginBottom: '13px' }}>
              <Typography
                sx={{
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '5px',
                  color: '#333',
                }}
              >
                {selectedUserType === 'admin' ? 'お名前' : '表示名'}
              </Typography>
              <TextField
                fullWidth
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    fontSize: '13px',
                  },
                  '& .MuiOutlinedInput-input': {
                    padding: '13px 11px',
                  },
                }}
              />
            </Box>

            {selectedUserType === 'admin' && (
              <>
                <Box sx={{ marginBottom: '13px' }}>
                  <Typography
                    sx={{
                      fontSize: '13px',
                      fontWeight: 600,
                      marginBottom: '5px',
                      color: '#333',
                    }}
                  >
                    会社名（任意）
                  </Typography>
                  <TextField
                    fullWidth
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="例: 株式会社◯◯◯"
                    sx={{
                      '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '13px' },
                      '& .MuiOutlinedInput-input': { padding: '13px 11px' },
                    }}
                  />
                </Box>
                <Box sx={{ marginBottom: '13px' }}>
                  <Typography
                    sx={{
                      fontSize: '13px',
                      fontWeight: 600,
                      marginBottom: '5px',
                      color: '#333',
                    }}
                  >
                    部署（任意）
                  </Typography>
                  <TextField
                    fullWidth
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="例: 購買部"
                    sx={{
                      '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '13px' },
                      '& .MuiOutlinedInput-input': { padding: '13px 11px' },
                    }}
                  />
                </Box>
              </>
            )}

            <Box sx={{ marginBottom: '16px' }}>
              <Typography
                sx={{
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '5px',
                  color: '#333',
                }}
              >
                メールアドレス
              </Typography>
              <TextField
                fullWidth
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    fontSize: '13px',
                  },
                  '& .MuiOutlinedInput-input': {
                    padding: '13px 11px',
                  },
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
              <Button
                onClick={handleCancel}
                sx={{
                  padding: '11px 32px',
                  fontSize: '13px',
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: '8px',
                  color: '#666',
                  border: '2px solid #ddd',
                  '&:hover': {
                    background: '#f5f5f5',
                  },
                }}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleSaveBasicInfo}
                variant="contained"
                sx={{
                  padding: '11px 32px',
                  fontSize: '13px',
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #63358b 100%)',
                  },
                }}
              >
                変更を保存
              </Button>
            </Box>
          </Box>
          )}

          {/* パスワード変更セクション（詳細表示時のみ） */}
          {showAccountDetails && (
          <Box
            sx={{
              background: 'white',
              borderRadius: '16px',
              padding: '19px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            }}
          >
            <Typography
              sx={{
                fontSize: '19px',
                fontWeight: 700,
                marginBottom: '13px',
                color: '#333',
              }}
            >
              パスワード変更 ({selectedUserType === 'admin' ? '管理者' : '一般ユーザー'})
            </Typography>

            {/* 管理者が他のアカウントを編集している場合は、現在のパスワード不要 */}
            {!selectedAccountId && (
              <Box sx={{ marginBottom: '13px' }}>
                <Typography
                  sx={{
                    fontSize: '13px',
                    fontWeight: 600,
                    marginBottom: '5px',
                    color: '#333',
                  }}
                >
                  現在のパスワード
                </Typography>
                <TextField
                  fullWidth
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="現在のパスワードを入力"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
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
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      fontSize: '13px',
                    },
                    '& .MuiOutlinedInput-input': {
                      padding: '13px 11px',
                    },
                  }}
                />
              </Box>
            )}

            <Box sx={{ marginBottom: '13px' }}>
              <Typography
                sx={{
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '5px',
                  color: '#333',
                }}
              >
                新しいパスワード
              </Typography>
              <TextField
                fullWidth
                type={showNewPassword ? 'text' : 'password'}
                placeholder="新しいパスワードを入力"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    fontSize: '13px',
                  },
                  '& .MuiOutlinedInput-input': {
                    padding: '13px 11px',
                  },
                }}
              />
            </Box>

            <Box sx={{ marginBottom: '16px' }}>
              <Typography
                sx={{
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '5px',
                  color: '#333',
                }}
              >
                新しいパスワード（確認）
              </Typography>
              <TextField
                fullWidth
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="新しいパスワードを再入力"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    fontSize: '13px',
                  },
                  '& .MuiOutlinedInput-input': {
                    padding: '13px 11px',
                  },
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
              <Button
                onClick={handlePasswordChange}
                variant="contained"
                sx={{
                  padding: '11px 32px',
                  fontSize: '13px',
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #63358b 100%)',
                  },
                }}
              >
                パスワードを変更
              </Button>
            </Box>
          </Box>
          )}

          {/* システム設定セクション（詳細表示時のみ） */}
          {showAccountDetails && (
          <Box
            sx={{
              background: 'white',
              borderRadius: '16px',
              padding: '19px',
              marginTop: '13px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            }}
          >
            <Typography
              sx={{
                fontSize: '19px',
                fontWeight: 700,
                marginBottom: '13px',
                color: '#333',
              }}
            >
              システム設定
            </Typography>

            {/* システム名 */}
            <Box sx={{ marginBottom: '13px' }}>
              <Typography
                sx={{
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '5px',
                  color: '#333',
                }}
              >
                システム名
              </Typography>
              <TextField
                fullWidth
                value={systemName}
                onChange={(e) => setSystemName(e.target.value)}
                inputProps={{ maxLength: 50 }}
                helperText={`${systemName.length}/50文字`}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    fontSize: '13px',
                  },
                  '& .MuiOutlinedInput-input': {
                    padding: '13px 11px',
                  },
                }}
              />
            </Box>

            {/* ロゴ画像 */}
            <Box sx={{ marginBottom: '13px' }}>
              <Typography
                sx={{
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '5px',
                  color: '#333',
                }}
              >
                ロゴ画像（任意、2MB以下）
              </Typography>
              <Button
                component="label"
                variant="outlined"
                startIcon={uploadingLogo ? <CircularProgress size={16} /> : <Upload />}
                disabled={uploadingLogo}
                sx={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: '8px',
                }}
              >
                ロゴをアップロード
                <input
                  type="file"
                  hidden
                  accept="image/jpeg,image/png,image/svg+xml"
                  onChange={handleLogoUpload}
                />
              </Button>
              {logoPreview && (
                <Box sx={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    style={{ maxWidth: getLogoMaxWidth(systemSettings?.logoSize), maxHeight: '60px', objectFit: 'contain' }}
                  />
                  <Button
                    size="small"
                    color="error"
                    onClick={() => {
                      setLogoFile(null);
                      setLogoPreview('');
                    }}
                    sx={{
                      fontSize: '12px',
                      padding: '4px 12px',
                    }}
                  >
                    削除
                  </Button>
                </Box>
              )}
            </Box>

            {/* ロゴサイズ（小・中・大） */}
            <Box sx={{ marginBottom: '16px' }}>
              <Typography
                sx={{ fontSize: '13px', fontWeight: 600, marginBottom: '5px', color: '#333' }}
              >
                ロゴの大きさ
              </Typography>
              <ToggleButtonGroup
                value={logoSize}
                exclusive
                onChange={(_, value) => {
                  if (value !== null) setLogoSize(value);
                }}
                size="small"
              >
                <ToggleButton value="small">小</ToggleButton>
                <ToggleButton value="medium">中</ToggleButton>
                <ToggleButton value="large">大</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* ヘッダー背景色 */}
            <Box sx={{ marginBottom: '16px' }}>
              <Typography
                sx={{
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '5px',
                  color: '#333',
                }}
              >
                ヘッダー背景色
              </Typography>
              <TextField
                fullWidth
                value={headerColor}
                onChange={(e) => setHeaderColor(e.target.value)}
                placeholder="例: #667eea または linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                helperText="単色の場合は#667eea、グラデーションの場合はlinear-gradient(...)形式で入力"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    fontSize: '13px',
                  },
                  '& .MuiOutlinedInput-input': {
                    padding: '13px 11px',
                  },
                }}
              />
              <Box
                sx={{
                  marginTop: '10px',
                  width: '100%',
                  height: '40px',
                  background: headerColor || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                onClick={handleUpdateSystemSettings}
                disabled={uploadingLogo}
                sx={{
                  padding: '11px 32px',
                  fontSize: '13px',
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #63358b 100%)',
                  },
                }}
              >
                システム設定を保存
              </Button>
            </Box>
          </Box>
          )}
        </Box>
        </Box>
      </Box>

      {/* 成功メッセージ */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage('')}
      >
        <Alert severity="success" onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      </Snackbar>

      {/* エラーメッセージ */}
      <Snackbar
        open={!!errorMessage}
        autoHideDuration={3000}
        onClose={() => setErrorMessage('')}
      >
        <Alert severity="error" onClose={() => setErrorMessage('')}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};
