import { Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import type { ReactNode } from 'react';

// ============================================================
// ProtectedRoute Props
// ============================================================
interface ProtectedRouteProps {
  children: ReactNode;
}

// ============================================================
// ProtectedRoute
// ============================================================
// 認証が必要なルートを保護するコンポーネント
// - 未認証の場合は/loginにリダイレクト
// - loading中はローディング表示
// ============================================================

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { account, userType, loading } = useAuth();

  // ローディング中
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

  // 未認証の場合は/loginにリダイレクト
  if (!account || !userType) {
    return <Navigate to="/login" replace />;
  }

  // 管理者・一般ユーザーともに閲覧画面へアクセス可能
  // （運営者は1ログインで管理・ユーザー・総括を自由に行き来できる）
  return <>{children}</>;
};
