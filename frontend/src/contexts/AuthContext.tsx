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
  role: string | null;
  loading: boolean;
  login: (
    slug: string,
    email: string,
    password: string,
    userType: UserType,
  ) => Promise<void>;
  loginMaster: (email: string, password: string) => Promise<void>;
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
  const [role, setRole] = useState<string | null>(null);
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
      localStorage.removeItem('currentRole');
    }

    checkSession();
  }, []);

  // ログイン成功時の共通処理（トークン・slug・アカウント保存）
  const applyLoginResponse = (
    response: Awaited<ReturnType<typeof authApi.login>>,
    loginUserType: UserType,
    slug: string,
  ) => {
    const resolvedRole = response.role || loginUserType;
    if (response.token) {
      const tokenKey = loginUserType === 'admin' ? 'adminAuthToken' : 'userAuthToken';
      localStorage.setItem(tokenKey, response.token);
      localStorage.setItem('currentUserType', loginUserType);
      localStorage.setItem('currentTenantSlug', slug); // 全APIリクエストの /api/t/<slug> に使用
      localStorage.setItem('currentRole', resolvedRole);
    }
    setAccount(response.account);
    setUserType(loginUserType);
    setRole(resolvedRole);
  };

  const toLoginError = (error: unknown): Error => {
    console.error('ログインエラー:', error);
    if (error instanceof ApiError) {
      if (error.status === 401) {
        return new Error('メールアドレスまたはパスワードが正しくありません');
      } else if (error.status === 400) {
        return new Error('入力内容に誤りがあります');
      }
    }
    return new Error('ログインに失敗しました。時間をおいて再度お試しください。');
  };

  // テナント配下ログイン（JWT統合 + userType対応）
  const login = async (
    slug: string,
    email: string,
    password: string,
    loginUserType: UserType,
  ): Promise<void> => {
    try {
      setLoading(true);
      const response = await authApi.login(slug, { email, password, userType: loginUserType });
      applyLoginResponse(response, loginUserType, slug);
    } catch (error) {
      throw toLoginError(error);
    } finally {
      setLoading(false);
    }
  };

  // 運営者(master)ログイン（別導線）。master のテナントは slug=default 相当で扱う。
  const loginMaster = async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      const response = await authApi.loginMaster({ email, password });
      // master は全テナント横断。slug はレスポンスに含まれないため 'default' を既定にする
      // （master 用の総括ページは S4 で別途 slug 指定に対応）。
      applyLoginResponse(response, 'admin', 'default');
    } catch (error) {
      throw toLoginError(error);
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
      localStorage.removeItem('currentTenantSlug');
      localStorage.removeItem('currentRole');

      // アカウント情報をクリア
      setAccount(null);
      setUserType(null);
      setRole(null);
    } catch (error) {
      console.error('ログアウトエラー:', error);
      // ログアウトは失敗してもフロントエンドの状態はクリア
      localStorage.removeItem('adminAuthToken');
      localStorage.removeItem('userAuthToken');
      localStorage.removeItem('currentUserType');
      localStorage.removeItem('currentRole');
      setAccount(null);
      setUserType(null);
      setRole(null);
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
        setRole(null);
        setLoading(false);
        return;
      }

      // userType別のトークンキーを使用
      const tokenKey = storedUserType === 'admin' ? 'adminAuthToken' : 'userAuthToken';
      const token = localStorage.getItem(tokenKey);

      if (!token) {
        setAccount(null);
        setUserType(null);
        setRole(null);
        localStorage.removeItem('currentUserType');
        localStorage.removeItem('currentRole');
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
        const resolvedRole =
          response.role || localStorage.getItem('currentRole') || response.userType || storedUserType;
        setRole(resolvedRole);
        localStorage.setItem('currentRole', resolvedRole);
      } else {
        setAccount(null);
        setUserType(null);
        setRole(null);
        localStorage.removeItem(tokenKey); // 無効なトークンを削除
        localStorage.removeItem('currentUserType');
        localStorage.removeItem('currentRole');
      }
    } catch (error) {
      console.error('セッション確認エラー:', error);
      setAccount(null);
      setUserType(null);
      setRole(null);
      // エラー時は両方のトークンを削除
      localStorage.removeItem('adminAuthToken');
      localStorage.removeItem('userAuthToken');
      localStorage.removeItem('currentUserType');
      localStorage.removeItem('currentRole');
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    account,
    userType,
    role,
    loading,
    login,
    loginMaster,
    logout,
    checkSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
