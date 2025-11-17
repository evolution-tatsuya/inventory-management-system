# 階層型在庫管理システム - フロントエンド

## 🎉 フロントエンド基盤構築完了！

React 18 + TypeScript 5 + MUI v6 + Vite 5で構築された、階層型在庫管理システムのフロントエンドアプリケーションです。

## 📦 技術スタック

- **React 18** - UIフレームワーク
- **TypeScript 5** - 型安全性
- **MUI v6** - UIコンポーネントライブラリ（テーマ1: プロフェッショナル）
- **Vite 5** - 高速ビルドツール
- **React Router v6** - ルーティング
- **Zustand** - 状態管理
- **React Query** - サーバー状態管理
- **Playwright** - E2Eテスト

## 🚀 クイックスタート

### 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3589 にアクセス

### テストアカウント

```
メールアドレス: admin@inventory-system.local
パスワード: InventoryAdmin2025!
```

## 📁 ディレクトリ構造

```
frontend/src/
├── components/       # 共通コンポーネント（Header、Sidebar等）
├── pages/            # ページコンポーネント（Login、Dashboard等）
├── layouts/          # レイアウト（PublicLayout、MainLayout）
├── theme/            # MUIテーマ（プロフェッショナルテーマ）
├── types/            # 型定義（バックエンドと同期）
├── contexts/         # React Context（AuthContext）
├── hooks/            # カスタムフック（useAuth）
└── services/         # API接続層
```

## ✅ 実装済み機能（Phase 3完了）

- ✅ MUIテーマシステム（ダークブルー基調・ビジネスライク）
- ✅ 認証システム（ログイン・ログアウト・セッション管理）
- ✅ レスポンシブレイアウト（モバイル対応）
- ✅ ナビゲーション（Header + サイドバー）
- ✅ ルーティング（権限ベース）
- ✅ 基本ページ（Login、CategoryList、Dashboard）
- ✅ E2Eテスト基盤（17テスト、100%成功率）
- ✅ TypeScriptエラー: 0件
- ✅ ビルドエラー: 0件

## 🧪 テスト

```bash
# すべてのE2Eテストを実行
npm test

# UIモードでテスト
npm run test:ui

# ブラウザを表示してテスト
npm run test:headed

# テストレポート表示
npm run test:report
```

## 🎨 デザインテーマ

**テーマ1: プロフェッショナル**（選択済み）
- プライマリ: #1976d2（ライトブルー）
- セカンダリ: #283593（インディゴ）
- 特徴: 信頼感・ビジネスライク・視認性重視

## 📚 ドキュメント

- [要件定義書](../docs/requirements.md)
- [プロジェクト設定](../CLAUDE.md)
- [進捗管理](../docs/SCOPE_PROGRESS.md)

## 🔧 その他のコマンド

```bash
# ビルド
npm run build

# TypeScriptエラーチェック
npx tsc --noEmit

# 依存関係のインストール
npm install
```

## 🎯 次のステップ

個別ページの詳細実装に進んでください（Phase 4以降）。

### 実装予定のページ

1. ジャンル一覧ページ (`/genres/:categoryId`)
2. パーツリストページ (`/parts/:genreId`)
3. 検索ページ (`/search`)
4. 管理ページ群（カテゴリー、ジャンル、パーツ、表示設定、アカウント設定）

## 📊 品質指標

- **TypeScriptエラー**: 0件
- **ビルドエラー**: 0件
- **E2Eテスト成功率**: 100%（17/17テスト）
- **ビルドサイズ**: 約493KB
