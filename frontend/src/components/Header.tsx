import { IconButton, Avatar, Menu, MenuItem } from '@mui/material';
import { AccountCircle, Logout, Settings } from '@mui/icons-material';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

// ============================================================
// Header
// ============================================================
// アプリケーションヘッダー（ユーザーメニュー）
// - ユーザーアバター
// - ドロップダウンメニュー（アカウント設定、ログアウト）
// ============================================================

export const Header = () => {
  const { account, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleAccountSettings = () => {
    navigate('/admin/account-settings');
    handleMenuClose();
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
      handleMenuClose();
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleMenuOpen}>
        {account ? (
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
            {account.email.charAt(0).toUpperCase()}
          </Avatar>
        ) : (
          <AccountCircle />
        )}
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleAccountSettings}>
          <Settings sx={{ mr: 1 }} />
          アカウント設定
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <Logout sx={{ mr: 1 }} />
          ログアウト
        </MenuItem>
      </Menu>
    </>
  );
};
