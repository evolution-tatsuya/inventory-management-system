# Phase 8: API統合 への引き継ぎドキュメント

**作成日**: 2025-11-17
**前フェーズ**: Phase 4-7（バックエンド実装）完了
**次フェーズ**: Phase 8（API統合）

---

## 📊 現在の状態

### ✅ 完了済み

#### Phase 1-3: 基盤構築
- 要件定義完了
- Git/GitHub管理完了
- フロントエンド基盤完了（全12ページ実装済み）

#### Phase 4-7: バックエンド実装
- データベース基盤構築完了
- 認証システム完了
- 全26エンドポイント実装完了
- 在庫管理システム（PartMaster）実装完了

### ⏳ 次のステップ: Phase 8

**フロントエンドとバックエンドの統合**
- モックデータからリアルAPI呼び出しへ切り替え
- 認証フローの統合
- エラーハンドリングの統合

---

## 🗂️ プロジェクト構成

### ディレクトリ構造
```
/Users/gainertatsuya/Downloads/在庫管理/
├── frontend/          # React + MUI v6 (全12ページ実装済み)
├── backend/           # Express + Prisma (26エンドポイント実装済み)
├── docs/              # ドキュメント
│   ├── requirements.md
│   ├── SCOPE_PROGRESS.md
│   └── API_ENDPOINTS.md (新規作成予定)
├── CLAUDE.md
└── HANDOFF_TO_PHASE8.md (このファイル)
```

---

## 🔌 バックエンドAPI

### サーバー情報
- **URL**: http://localhost:8763
- **CORS許可オリジン**: http://localhost:3589
- **認証方式**: express-session（Cookie: connect.sid）

### 環境変数（.env.local）
```
DATABASE_URL=postgresql://...（Neon接続済み）
SESSION_SECRET=（設定済み）
CLOUDINARY_CLOUD_NAME=dg30ioxcx
CLOUDINARY_API_KEY=755568141878345
CLOUDINARY_API_SECRET=（設定済み）
```

### エンドポイント一覧

**認証**（3）:
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/session

**カテゴリー**（4）:
- GET /api/categories
- POST /api/admin/categories
- PUT /api/admin/categories/:id
- DELETE /api/admin/categories/:id

**ジャンル**（4）:
- GET /api/categories/:id/genres
- POST /api/admin/genres
- PUT /api/admin/genres/:id
- DELETE /api/admin/genres/:id

**パーツ**（5）:
- GET /api/genres/:id/parts
- POST /api/admin/parts
- PUT /api/admin/parts/:id
- DELETE /api/admin/parts/:id
- PUT /api/admin/parts/:partNumber/stock

**検索**（2）:
- GET /api/search/by-storage-case?case={caseNumber}
- GET /api/search/by-part-number?partNumber={partNumber}

**統計**（1）:
- GET /api/admin/stats

**エクスポート**（3）:
- GET /api/admin/genres/:id/export/csv
- GET /api/admin/genres/:id/export/pdf
- POST /api/admin/genres/:id/import/csv

**画像**（2）:
- POST /api/admin/images/upload
- DELETE /api/admin/images/:id

**アカウント**（2）:
- PUT /api/admin/account/email
- PUT /api/admin/account/password

---

## 🎨 フロントエンド

### 実装済みページ（12ページ）

| ID | ページ名 | ルート | 状態 |
|----|---------|-------|------|
| P-001 | ログインページ | /login | モック実装済み |
| P-002 | カテゴリー選択ページ | /categories | モック実装済み |
| P-003 | ジャンル一覧ページ | /categories/:id/genres | モック実装済み |
| P-004 | パーツリストページ | /genres/:id/parts | モック実装済み |
| P-005 | 検索ページ | /search | モック実装済み |
| A-001 | 管理ダッシュボード | /admin | モック実装済み |
| A-002 | カテゴリー管理ページ | /admin/categories | モック実装済み |
| A-003 | ジャンル管理ページ | /admin/genres | モック実装済み |
| A-004 | パーツリスト管理ページ | /admin/parts | モック実装済み |
| A-005 | 表示設定ページ | /admin/settings/display | モック実装済み |
| A-006 | アカウント設定ページ | /admin/settings/account | モック実装済み |

### @MOCK_TO_APIマーク
フロントエンドコード内に`@MOCK_TO_API`マークが付いている箇所が、API統合対象です。

---

## 🎯 Phase 8 タスク概要

### 1. 認証フローの統合
- ログイン処理をリアルAPIに接続
- セッション管理の実装
- 未認証時のリダイレクト処理

### 2. データ取得の統合
- カテゴリー/ジャンル/パーツ一覧取得
- React Queryでのキャッシング設定
- ローディング状態の管理

### 3. データ更新の統合
- CRUD操作（作成/更新/削除）
- 楽観的更新（Optimistic Update）
- エラーハンドリング

### 4. 検索機能の統合
- 収納ケース番号検索
- 品番検索
- 検索結果の表示

### 5. 画像管理の統合
- Cloudinaryへの画像アップロード
- 画像URLの取得と表示
- 画像削除

### 6. エクスポート/インポートの統合
- CSVエクスポート
- PDFエクスポート
- CSV一括インポート

---

## 📝 重要な設計

### 在庫数管理（PartMaster）
- **PartMaster.stockQuantity**が唯一の真実（Single Source of Truth）
- 同一品番のパーツすべてに自動反映
- フロントエンドは常にPartMasterから在庫数を取得

### セッション認証
- Cookie: connect.sid（httpOnly）
- 有効期限: 7日間
- フロントエンドからのリクエストには`credentials: 'include'`が必須

---

## 🛠️ 推奨する統合順序

### ステップ1: 認証（P-001）
1. ログインページをリアルAPIに接続
2. セッション管理の実装
3. ログアウト処理の実装

### ステップ2: 基本CRUD（P-002, P-003, P-004）
1. カテゴリー一覧取得
2. ジャンル一覧取得
3. パーツ一覧取得

### ステップ3: 管理画面（A-002, A-003, A-004）
1. カテゴリー管理（CRUD）
2. ジャンル管理（CRUD）
3. パーツ管理（CRUD + 在庫数更新）

### ステップ4: 検索・統計（P-005, A-001）
1. 検索機能
2. 統計ダッシュボード

### ステップ5: 画像・エクスポート（A-004, A-005）
1. 画像アップロード/削除
2. CSV/PDFエクスポート
3. CSV一括インポート

### ステップ6: アカウント設定（A-006）
1. メールアドレス変更
2. パスワード変更

---

## 🔧 開発環境の起動

### バックエンド
```bash
cd /Users/gainertatsuya/Downloads/在庫管理/backend
npm run dev
# → http://localhost:8763
```

### フロントエンド
```bash
cd /Users/gainertatsuya/Downloads/在庫管理/frontend
npm run dev
# → http://localhost:3589
```

### データベース（Prisma Studio）
```bash
cd /Users/gainertatsuya/Downloads/在庫管理/backend
npm run db:studio
# → http://localhost:5555
```

---

## 📚 参考ドキュメント

| ドキュメント | パス |
|-------------|------|
| 要件定義書 | docs/requirements.md |
| 進捗管理 | docs/SCOPE_PROGRESS.md |
| プロジェクト設定 | CLAUDE.md |

---

## ✅ Phase 7完了チェックリスト

- [x] データベース基盤構築完了
- [x] 全26エンドポイント実装完了
- [x] 認証システム実装完了
- [x] 在庫管理システム実装完了
- [x] 検索機能実装完了
- [x] 統計機能実装完了
- [x] エクスポート/インポート機能実装完了
- [x] 画像管理機能実装完了
- [x] アカウント設定機能実装完了
- [x] 引き継ぎドキュメント作成完了

---

## 🚀 Phase 8へ

**次のエージェント**: @8-API統合オーケストレーター

**開始前の準備**:
1. バックエンドサーバーを起動（npm run dev）
2. フロントエンドサーバーを起動（npm run dev）
3. データベース接続を確認（Prisma Studio）
4. 環境変数（.env.local）を確認

**期待される成果**:
- 全ページでリアルAPIが動作
- モックデータの完全除去
- 認証フローの完全統合
- エラーハンドリングの完全統合

**推定工数**: 6-8時間（全12ページ）

---

**Phase 7完了日**: 2025-11-17
**Phase 8開始準備**: 完了
