import { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Admin } from '@/types';

// ============================================================
// AuthContext型定義
// ============================================================
interface AuthContextType {
  admin: Admin | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

// ============================================================
// AuthContext作成
// ============================================================
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================
// AuthProvider Props
// ============================================================
interface AuthProviderProps {
  children: ReactNode;
}

// ============================================================
// AuthProvider実装
// ============================================================
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // モックユーザーデータ
  const MOCK_ADMIN: Admin = {
    id: '1',
    email: 'admin@inventory-system.local',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  // セッションチェック（初回マウント時）
  useEffect(() => {
    checkSession();
  }, []);

  // ログイン処理（モック実装）
  const login = async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);

      // モック認証ロジック
      if (email === 'admin@inventory-system.local' && password === 'InventoryAdmin2025!') {
        // ローカルストレージに保存
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('admin', JSON.stringify(MOCK_ADMIN));
        setAdmin(MOCK_ADMIN);
      } else {
        throw new Error('メールアドレスまたはパスワードが正しくありません');
      }
    } catch (error) {
      console.error('ログインエラー:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ログアウト処理
  const logout = async (): Promise<void> => {
    try {
      setLoading(true);
      // ローカルストレージをクリア
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('admin');
      setAdmin(null);
    } catch (error) {
      console.error('ログアウトエラー:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // セッション確認
  const checkSession = async (): Promise<void> => {
    try {
      setLoading(true);
      const isAuthenticated = localStorage.getItem('isAuthenticated');
      const adminData = localStorage.getItem('admin');

      if (isAuthenticated === 'true' && adminData) {
        setAdmin(JSON.parse(adminData));
      } else {
        setAdmin(null);
      }
    } catch (error) {
      console.error('セッション確認エラー:', error);
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    admin,
    loading,
    login,
    logout,
    checkSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
