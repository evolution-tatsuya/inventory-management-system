import { Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import type { ReactNode } from 'react';

// ============================================================
// AdminRoute Props
// ============================================================
interface AdminRouteProps {
  children: ReactNode;
}

// ============================================================
// AdminRoute
// ============================================================
// 管理者専用ルートを保護するコンポーネント
// - 未認証の場合は/admin/loginにリダイレクト
// - 一般ユーザーの場合は/categoriesにリダイレクト
// - loading中はローディング表示
// ============================================================

export const AdminRoute = ({ children }: AdminRouteProps) => {
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

  // 未認証の場合は/admin/loginにリダイレクト
  if (!account || !userType) {
    return <Navigate to="/admin/login" replace />;
  }

  // 一般ユーザーの場合は/categoriesにリダイレクト
  if (userType === 'user') {
    console.warn('⚠️ 一般ユーザーが管理者ページにアクセスしようとしました。/categoriesにリダイレクトします。');
    return <Navigate to="/categories" replace />;
  }

  // 管理者の場合は子要素を表示
  return <>{children}</>;
};
