import { Box, Drawer, Toolbar, AppBar, Typography, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

// ============================================================
// MainLayout Props
// ============================================================
interface MainLayoutProps {
  children: ReactNode;
}

// ============================================================
// MainLayout
// ============================================================
// 認証後ページ用のレイアウト
// - ヘッダー
// - サイドバー（レスポンシブDrawer）
// - メインコンテンツエリア
// ============================================================

const DRAWER_WIDTH = 240;

export const MainLayout = ({ children }: MainLayoutProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* ヘッダー */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: 'primary.main',
          top: 48,
          left: { xs: 24, sm: 288 },
          right: 24,
          width: { xs: 'calc(100% - 48px)', sm: `calc(100% - ${DRAWER_WIDTH}px - 72px)` },
        }}
      >
        <Toolbar>
          {/* モバイルメニューボタン */}
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" noWrap sx={{ flexGrow: 1, fontWeight: 600 }}>
            階層型在庫管理システム
          </Typography>

          {/* Header コンポーネント（ユーザーメニュー等） */}
          <Header />
        </Toolbar>
      </AppBar>

      {/* サイドバー */}
      <Box
        component="nav"
        sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}
      >
        {/* モバイル用Drawer（一時的） */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }} // パフォーマンス向上
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              backgroundColor: '#2c3e50',
              color: '#ffffff',
              mt: 6,
              ml: 3,
              mb: 3,
              height: 'calc(100vh - 96px)',
              borderRadius: 2,
            },
          }}
        >
          <Sidebar />
        </Drawer>

        {/* デスクトップ用Drawer（常時表示） */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              backgroundColor: '#2c3e50',
              color: '#ffffff',
              mt: 6,
              ml: 3,
              mb: 3,
              height: 'calc(100vh - 96px)',
              borderRadius: 2,
            },
          }}
          open
        >
          <Sidebar />
        </Drawer>
      </Box>

      {/* メインコンテンツ */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          px: 10,
          py: 3,
          pt: 12,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          backgroundColor: 'background.default',
        }}
      >
        <Toolbar /> {/* ヘッダーの高さ分のスペーサー */}
        {children}
      </Box>
    </Box>
  );
};
