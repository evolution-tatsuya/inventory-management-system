import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Box,
} from '@mui/material';
import {
  Dashboard,
  Category,
  Collections,
  Inventory,
  DisplaySettings,
  AccountCircle,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

// ============================================================
// Sidebar
// ============================================================
// サイドバーナビゲーションメニュー
// - ダッシュボード
// - カテゴリー管理
// - ジャンル管理
// - パーツ管理
// - 表示設定
// - アカウント設定
// ============================================================

interface MenuItem {
  text: string;
  icon: React.JSX.Element;
  path: string;
}

const menuItems: MenuItem[] = [
  {
    text: 'ダッシュボード',
    icon: <Dashboard />,
    path: '/admin/dashboard',
  },
  {
    text: 'カテゴリー管理',
    icon: <Category />,
    path: '/admin/categories',
  },
  {
    text: 'ジャンル管理',
    icon: <Collections />,
    path: '/admin/genres',
  },
  {
    text: 'パーツ管理',
    icon: <Inventory />,
    path: '/admin/parts/categories',
  },
  {
    text: '表示設定',
    icon: <DisplaySettings />,
    path: '/admin/display-settings',
  },
  {
    text: 'アカウント設定',
    icon: <AccountCircle />,
    path: '/admin/account-settings',
  },
];

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div>
      <Box sx={{ pt: 3, px: 3, pb: 2 }}>
        <Typography variant="h5" sx={{ color: '#ffffff', fontWeight: 600 }}>
          在庫管理
        </Typography>
      </Box>
      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.12)' }} />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
              sx={{
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                },
                '&.Mui-selected': {
                  backgroundColor: '#4a5d7a',
                  color: '#ffffff',
                  '&:hover': {
                    backgroundColor: '#5a6d8a',
                  },
                  '& .MuiListItemIcon-root': {
                    color: '#ffffff',
                  },
                },
                '& .MuiListItemIcon-root': {
                  color: '#ffffff',
                },
              }}
            >
              <ListItemIcon sx={{ color: 'inherit' }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );
};
