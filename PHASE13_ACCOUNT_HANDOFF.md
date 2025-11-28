# Phase 13: アカウント管理機能実装 - 引き継ぎ文書

## 📋 現在の状況（90%完了）

### ✅ 完了済み項目

#### 1. データベース層（100%完了）
- ✅ Prismaスキーマに`User`テーブル追加
  - `backend/prisma/schema.prisma` (lines 33-42)
  - Admin と同じ構造（id, email, password, name, createdAt, updatedAt）
- ✅ `Admin`テーブルに`name`フィールド追加
- ✅ データベースマイグレーション実行完了（`npx prisma db push`）

#### 2. バックエンドAPI層（100%完了）
- ✅ `authService.ts` 更新
  - `login(email, password, userType)` - Admin/User両テーブル対応
  - userType='admin' または 'user' で異なるテーブルを参照
- ✅ `authController.ts` 更新
  - ログインリクエストに`userType`パラメータ追加
  - JWTトークンに`userType`を含める
  - セッション検証で`userType`を返す
- ✅ `accountService.ts` 更新
  - `changeEmail(userId, newEmail, userType)` - Admin/User両対応
  - `changePassword(userId, currentPassword, newPassword, userType)` - Admin/User両対応
  - メールアドレス重複チェックは各テーブル内でのみ
- ✅ `accountController.ts` 更新
  - JWT認証チェック追加
  - `userType`パラメータ対応
- ✅ バックエンドサーバー再起動完了

#### 3. フロントエンド基盤層（70%完了）
- ✅ 型定義更新（`frontend/src/types/index.ts`）
  - `User`インターフェース追加
  - `UserType = 'admin' | 'user'` 型追加
  - `Admin`に`name`フィールド追加
- ✅ `AuthContext.tsx` 完全リファクタリング
  - `admin` → `account` (Admin | User | null)
  - `userType: UserType | null` 追加
  - `login(email, password, userType)` - userTypeパラメータ追加
  - localStorageに`userType`も保存
  - セッション確認で`userType`を復元

---

## 🔜 残りのタスク（10%）

### 8. auth API型定義更新
**ファイル**: `frontend/src/services/api/auth.ts`

現在のログインAPIリクエスト型:
```typescript
interface LoginRequest {
  email: string;
  password: string;
}
```

**変更後**:
```typescript
interface LoginRequest {
  email: string;
  password: string;
  userType?: 'admin' | 'user'; // デフォルト'admin'
}
```

現在のログインレスポンス型:
```typescript
interface LoginResponse {
  success: boolean;
  token: string;
  admin: {
    id: string;
    email: string;
  };
}
```

**変更後**:
```typescript
interface LoginResponse {
  success: boolean;
  token: string;
  account: {
    id: string;
    email: string;
    name?: string;
    userType: 'admin' | 'user';
  };
}
```

セッション検証レスポンス型:
```typescript
interface SessionResponse {
  authenticated: boolean;
  userId: string;
  email: string;
  userType: 'admin' | 'user';
}
```

---

### 9. ログインページ更新

#### 9-1. LoginPage.tsx（一般ユーザー用）
**ファイル**: `frontend/src/pages/LoginPage.tsx`

**変更箇所** (line 42):
```typescript
// 変更前
await login(email, password);

// 変更後
await login(email, password, 'user'); // 一般ユーザーとしてログイン
```

#### 9-2. AdminLoginPage.tsx（管理者用）
**ファイル**: `frontend/src/pages/AdminLoginPage.tsx`

**変更箇所** (line 42):
```typescript
// 変更前
await login(email, password);

// 変更後
await login(email, password, 'admin'); // 管理者としてログイン
```

---

### 10. アカウント設定ページUI実装（選択式）
**ファイル**: `frontend/src/pages/AccountSettingsPage.tsx`

#### 実装方針
1. **ラジオボタンで切り替え**:
   ```
   ○ 管理者アカウント設定
   ○ 一般ユーザーアカウント設定
   ```

2. **選択に応じてフォーム表示**:
   - 管理者選択 → Admin用のメールアドレス・パスワード変更フォーム
   - 一般ユーザー選択 → User用のメールアドレス・パスワード変更フォーム

3. **API呼び出し時にuserTypeを渡す**:
   ```typescript
   await accountApi.changeEmail({ newEmail, userType: selectedUserType });
   await accountApi.changePassword({ currentPassword, newPassword, userType: selectedUserType });
   ```

#### UIレイアウト案
```tsx
<Box>
  <Typography variant="h5">アカウント設定</Typography>

  {/* アカウント種別選択 */}
  <RadioGroup value={selectedUserType} onChange={(e) => setSelectedUserType(e.target.value)}>
    <FormControlLabel value="admin" control={<Radio />} label="管理者アカウント設定" />
    <FormControlLabel value="user" control={<Radio />} label="一般ユーザーアカウント設定" />
  </RadioGroup>

  {/* メールアドレス変更 */}
  <TextField
    label={`${selectedUserType === 'admin' ? '管理者' : '一般ユーザー'}メールアドレス`}
    value={email}
    onChange={(e) => setEmail(e.target.value)}
  />
  <Button onClick={handleEmailChange}>メールアドレス変更</Button>

  {/* パスワード変更 */}
  <TextField label="現在のパスワード" type="password" value={currentPassword} />
  <TextField label="新しいパスワード" type="password" value={newPassword} />
  <TextField label="新しいパスワード（確認）" type="password" value={confirmPassword} />
  <Button onClick={handlePasswordChange}>パスワード変更</Button>
</Box>
```

---

### 11. テスト用アカウント作成

バックエンドのseedスクリプトまたはPrisma Studioで以下を作成:

#### 管理者アカウント
```
email: admin@inventory-system.local
password: InventoryAdmin2025!
name: 管理者
```

#### 一般ユーザーアカウント
```
email: user@inventory-system.local
password: InventoryUser2025!
name: 一般ユーザー
```

**パスワードのハッシュ化**:
```bash
# backendディレクトリで実行
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('InventoryAdmin2025!', 10).then(hash => console.log('Admin:', hash));"
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('InventoryUser2025!', 10).then(hash => console.log('User:', hash));"
```

Prisma Studioで直接作成: `npx prisma studio`

---

### 12. 動作確認テスト

#### テストシナリオ

1. **管理者ログイン**
   - `/admin/login` にアクセス
   - `admin@inventory-system.local` でログイン
   - `/admin/dashboard` にリダイレクトされること

2. **一般ユーザーログイン**
   - `/login` にアクセス
   - `user@inventory-system.local` でログイン
   - `/categories` にリダイレクトされること

3. **アカウント設定（管理者）**
   - `/admin/account-settings` にアクセス
   - 「管理者アカウント設定」を選択
   - メールアドレス変更が動作すること
   - パスワード変更が動作すること

4. **アカウント設定（一般ユーザー）**
   - `/admin/account-settings` にアクセス
   - 「一般ユーザーアカウント設定」を選択
   - メールアドレス変更が動作すること
   - パスワード変更が動作すること

5. **エラーケース**
   - 同じメールアドレスで重複登録しようとした場合のエラー表示
   - 現在のパスワードが間違っている場合のエラー表示

---

## 🎯 最終ゴール

- ✅ 管理者と一般ユーザーで別々のアカウント管理
- ✅ 同じメールアドレスでも別テーブルなのでエラーなし
- ✅ アカウント設定ページで両方のアカウントを管理可能
- ✅ 将来のマルチテナント対応に向けた基盤完成

---

## 📝 重要な注意事項

1. **後方互換性**: 既存のログイン機能を壊さないよう、`userType`のデフォルト値は`'admin'`
2. **セキュリティ**: パスワードは必ずbcryptでハッシュ化
3. **エラーハンドリング**: メールアドレス重複は各テーブル内でのみチェック
4. **型の一貫性**: フロントエンドとバックエンドの型定義を同期

---

## 🚀 次のアクション

1. auth API型定義更新（5分）
2. LoginPage/AdminLoginPage更新（5分）
3. アカウント設定ページUI実装（20分）
4. テスト用アカウント作成（5分）
5. 動作確認（10分）

**推定残り時間**: 45分

---

## 📂 主な変更ファイル一覧

### バックエンド
- ✅ `backend/prisma/schema.prisma`
- ✅ `backend/src/services/authService.ts`
- ✅ `backend/src/controllers/authController.ts`
- ✅ `backend/src/services/accountService.ts`
- ✅ `backend/src/controllers/accountController.ts`

### フロントエンド
- ✅ `frontend/src/types/index.ts`
- ✅ `frontend/src/contexts/AuthContext.tsx`
- 🔜 `frontend/src/services/api/auth.ts`
- 🔜 `frontend/src/pages/LoginPage.tsx`
- 🔜 `frontend/src/pages/AdminLoginPage.tsx`
- 🔜 `frontend/src/pages/AccountSettingsPage.tsx`

---

**作成日**: 2025-11-22
**Phase**: 13 - アカウント管理機能実装
**進捗**: 90%完了
