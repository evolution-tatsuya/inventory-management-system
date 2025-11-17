import { Box, Paper } from '@mui/material';
import type { ReactNode } from 'react';

// ============================================================
// PublicLayout Props
// ============================================================
interface PublicLayoutProps {
  children: ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

// ============================================================
// PublicLayout
// ============================================================
// 公開ページ（ログインページ等）用のレイアウト
// - ヘッダー
// - 中央揃えのコンテンツエリア
// - 背景グラデーション
// ============================================================

export const PublicLayout = ({ children, maxWidth = 'sm' }: PublicLayoutProps) => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(315deg, #64b5f6 0%, #0d47a1 100%)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'auto',
      }}
    >

      {/* メインコンテンツ（中央揃え） */}
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          px: 3,
          py: 4,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            borderRadius: 2,
            backgroundColor: '#ffffff',
            width: '100%',
            maxWidth: maxWidth === 'sm' ? 500 : 900,
          }}
        >
          {children}
        </Paper>
      </Box>
    </Box>
  );
};
