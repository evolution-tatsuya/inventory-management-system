import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminRoute } from '@/components/AdminRoute';
import { LoginPage } from '@/pages/LoginPage';
import { AdminLoginPage } from '@/pages/AdminLoginPage';
import { CategoryListPage } from '@/pages/CategoryListPage';
import { PartsListPage } from '@/pages/PartsListPage';
import { SearchPage } from '@/pages/SearchPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { CategoryManagementPage } from '@/pages/CategoryManagementPage';
import { GenreManagementPage } from '@/pages/GenreManagementPage';
import { PartsManagementPage } from '@/pages/PartsManagementPage';
import { UnitManagementPage } from '@/pages/UnitManagementPage';
import { DisplaySettingsPage } from '@/pages/DisplaySettingsPage';
import { AccountSettingsPage } from '@/pages/AccountSettingsPage';
import { CategorySelectionPage } from '@/pages/CategorySelectionPage';
import { GenreSelectionPage } from '@/pages/GenreSelectionPage';
import { QRCodePage } from '@/pages/QRCodePage';
import { GenreListPage } from '@/pages/GenreListPage';
import { UnitListPage } from '@/pages/UnitListPage';

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
      <Route path="/admin/login" element={<AdminLoginPage />} />

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
        path="/categories/:categoryId/genres/:genreId/units"
        element={
          <ProtectedRoute>
            <UnitListPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/categories/:categoryId/genres/:genreId/units/:unitId/parts"
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
          <AdminRoute>
            <DashboardPage />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/categories"
        element={
          <AdminRoute>
            <CategoryManagementPage />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/genres"
        element={
          <AdminRoute>
            <GenreManagementPage />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/parts/categories"
        element={
          <AdminRoute>
            <CategorySelectionPage />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/parts/categories/:categoryId/genres"
        element={
          <AdminRoute>
            <GenreSelectionPage />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/parts"
        element={
          <AdminRoute>
            <PartsManagementPage />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/units"
        element={
          <AdminRoute>
            <UnitManagementPage />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/display-settings"
        element={
          <AdminRoute>
            <DisplaySettingsPage />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/account-settings"
        element={
          <AdminRoute>
            <AccountSettingsPage />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/qr"
        element={
          <AdminRoute>
            <QRCodePage />
          </AdminRoute>
        }
      />

      {/* 404ページ（未実装のルート） */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
