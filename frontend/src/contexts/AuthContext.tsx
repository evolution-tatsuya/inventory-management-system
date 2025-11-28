import { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Admin, User, UserType } from '@/types';
import * as authApi from '@/services/api/auth';
import { ApiError } from '@/services/api/client';

// ============================================================
// AuthContext型定義
// ============================================================
interface AuthContextType {
  account: Admin | User | null;
  userType: UserType | null;
  loading: boolean;
  login: (email: string, password: string, userType: UserType) => Promise<void>;
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
  const [account, setAccount] = useState<Admin | User | null>(null);
  const [userType, setUserType] = useState<UserType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // セッションチェック（初回マウント時）
  useEffect(() => {
    // マイグレーション: 古いトークンキーをクリア
    const oldAuthToken = localStorage.getItem('authToken');
    const oldUserType = localStorage.getItem('userType');
    if (oldAuthToken || oldUserType) {
      console.log('🔄 古い認証トークンを検出しました。新しい形式にマイグレーションします。');
      localStorage.removeItem('authToken');
      localStorage.removeItem('userType');
      // 再ログインが必要になるため、既存のトークンはクリア
      localStorage.removeItem('adminAuthToken');
      localStorage.removeItem('userAuthToken');
      localStorage.removeItem('currentUserType');
    }

    checkSession();
  }, []);

  // ログイン処理（JWT統合 + userType対応）
  const login = async (email: string, password: string, loginUserType: UserType): Promise<void> => {
    try {
      setLoading(true);

      // 実APIを呼び出し（userTypeを渡す）
      const response = await authApi.login({ email, password, userType: loginUserType });

      // JWTトークンをローカルストレージに保存（userType別のキーを使用）
      if (response.token) {
        const tokenKey = loginUserType === 'admin' ? 'adminAuthToken' : 'userAuthToken';
        localStorage.setItem(tokenKey, response.token);
        localStorage.setItem('currentUserType', loginUserType); // 現在のログインタイプを保存
      }

      // アカウント情報を保存
      setAccount(response.account);
      setUserType(loginUserType);
    } catch (error) {
      console.error('ログインエラー:', error);

      // エラーメッセージを整形
      if (error instanceof ApiError) {
        if (error.status === 401) {
          throw new Error('メールアドレスまたはパスワードが正しくありません');
        } else if (error.status === 400) {
          throw new Error('入力内容に誤りがあります');
        }
      }

      throw new Error('ログインに失敗しました。時間をおいて再度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  // ログアウト処理（JWT削除）
  const logout = async (): Promise<void> => {
    try {
      setLoading(true);

      // 実APIを呼び出し
      await authApi.logout();

      // JWTトークンを削除（現在のuserTypeに応じて）
      const currentType = localStorage.getItem('currentUserType') as UserType | null;
      if (currentType) {
        const tokenKey = currentType === 'admin' ? 'adminAuthToken' : 'userAuthToken';
        localStorage.removeItem(tokenKey);
      }
      localStorage.removeItem('currentUserType');

      // アカウント情報をクリア
      setAccount(null);
      setUserType(null);
    } catch (error) {
      console.error('ログアウトエラー:', error);
      // ログアウトは失敗してもフロントエンドの状態はクリア
      localStorage.removeItem('adminAuthToken');
      localStorage.removeItem('userAuthToken');
      localStorage.removeItem('currentUserType');
      setAccount(null);
      setUserType(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // セッション確認（JWT検証）
  const checkSession = async (): Promise<void> => {
    setLoading(true);

    try {
      // ローカルストレージから現在のログインタイプを取得
      const storedUserType = localStorage.getItem('currentUserType') as UserType | null;

      if (!storedUserType) {
        setAccount(null);
        setUserType(null);
        setLoading(false);
        return;
      }

      // userType別のトークンキーを使用
      const tokenKey = storedUserType === 'admin' ? 'adminAuthToken' : 'userAuthToken';
      const token = localStorage.getItem(tokenKey);

      if (!token) {
        setAccount(null);
        setUserType(null);
        localStorage.removeItem('currentUserType');
        setLoading(false);
        return;
      }

      // 実APIを呼び出し
      const response = await authApi.checkSession();

      if (response.authenticated && response.userId) {
        // トークンが有効な場合、アカウント情報を保存
        setAccount({
          id: response.userId,
          email: response.email || '',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        setUserType(response.userType || storedUserType);
      } else {
        setAccount(null);
        setUserType(null);
        localStorage.removeItem(tokenKey); // 無効なトークンを削除
        localStorage.removeItem('currentUserType');
      }
    } catch (error) {
      console.error('セッション確認エラー:', error);
      setAccount(null);
      setUserType(null);
      // エラー時は両方のトークンを削除
      localStorage.removeItem('adminAuthToken');
      localStorage.removeItem('userAuthToken');
      localStorage.removeItem('currentUserType');
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    account,
    userType,
    loading,
    login,
    logout,
    checkSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
