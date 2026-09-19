import { Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import type { ReactNode } from 'react';

interface MasterRouteProps {
  children: ReactNode;
}

// ============================================================
// MasterRoute
// ============================================================
// 運営者(master)専用ルートを保護する。
// - loading中はローディング
// - role !== 'master' なら /master/login へ
// ※ 最終的な認可はバックエンド requireMaster が担保。ここは導線制御のみ。
// ============================================================
export const MasterRoute = ({ children }: MasterRouteProps) => {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (role !== 'master') {
    return <Navigate to="/master/login" replace />;
  }

  return <>{children}</>;
};
