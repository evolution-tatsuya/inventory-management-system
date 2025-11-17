import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { CategoryListPage } from '@/pages/CategoryListPage';
import { GenreListPage } from '@/pages/GenreListPage';
import { PartsListPage } from '@/pages/PartsListPage';
import { SearchPage } from '@/pages/SearchPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { CategoryManagementPage } from '@/pages/CategoryManagementPage';
import { GenreManagementPage } from '@/pages/GenreManagementPage';
import { PartsManagementPage } from '@/pages/PartsManagementPage';
import { DisplaySettingsPage } from '@/pages/DisplaySettingsPage';
import { AccountSettingsPage } from '@/pages/AccountSettingsPage';
import { CategorySelectionPage } from '@/pages/CategorySelectionPage';
import { GenreSelectionPage } from '@/pages/GenreSelectionPage';

// ============================================================
// App
// ============================================================
// アプリケーションのルーティング設定
// ============================================================

function App() {
  return (
    <Routes>
      {/* ルートパスは/categoriesにリダイレクト（未認証の場合は自動的に/loginへ） */}
      <Route path="/" element={<Navigate to="/categories" replace />} />

      {/* 公開ページ */}
      <Route path="/login" element={<LoginPage />} />

      {/* 認証必須ページ */}
      <Route
        path="/categories"
        element={
          <ProtectedRoute>
            <CategoryListPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/categories/:categoryId/genres"
        element={
          <ProtectedRoute>
            <GenreListPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/genres/:genreId/parts"
        element={
          <ProtectedRoute>
            <PartsListPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/search"
        element={
          <ProtectedRoute>
            <SearchPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/categories"
        element={
          <ProtectedRoute>
            <CategoryManagementPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/genres"
        element={
          <ProtectedRoute>
            <GenreManagementPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/parts/categories"
        element={
          <ProtectedRoute>
            <CategorySelectionPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/parts/categories/:categoryId/genres"
        element={
          <ProtectedRoute>
            <GenreSelectionPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/parts/:genreId"
        element={
          <ProtectedRoute>
            <PartsManagementPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/display-settings"
        element={
          <ProtectedRoute>
            <DisplaySettingsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/account-settings"
        element={
          <ProtectedRoute>
            <AccountSettingsPage />
          </ProtectedRoute>
        }
      />

      {/* 404ページ（未実装のルート） */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
