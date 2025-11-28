# 本番環境デプロイ引き継ぎ文書

## 📋 概要

本ドキュメントは、階層型在庫管理システムを**完全に新規デプロイ**するための引き継ぎ文書です。

**重要**: 既存の本番環境は全て削除し、現在のローカル環境の状態をそのまま本番環境に展開してください。

---

## 🎯 デプロイ方針

### 1. 基本方針
- **ローカル環境と完全同一**: 現在のローカル環境（`/Users/gainertatsuya/Downloads/在庫管理`）の状態を、**一切の変更なく**本番環境にデプロイする
- **既存環境の完全削除**: 以前にデプロイされた本番環境は全て削除し、新規作成する
- **データベースの新規作成**: 既存のデータは一切保持せず、完全に新しいデータベースを作成する

### 2. 環境分離戦略
- **ローカル環境**: 開発・テスト・修正用（現在の状態を維持）
- **本番環境**: 実運用・動作確認・バグ洗い出し用（新規作成）
- **データベース**: ローカルと本番で完全に分離

### 3. 今後の運用フロー
1. 本番環境で問題が発見される
2. ローカル環境で修正・テスト
3. 動作確認後、本番環境にデプロイ
4. 本番環境で動作確認

---

## 🏗️ 技術スタック

### フロントエンド
- **フレームワーク**: React 18 + TypeScript 5
- **UI**: MUI v6
- **状態管理**: Zustand, React Query
- **ルーティング**: React Router v6
- **ビルドツール**: Vite 5
- **デプロイ先**: Vercel
- **ポート（ローカル）**: 3589

### バックエンド
- **ランタイム**: Node.js 20+ + TypeScript 5
- **フレームワーク**: Express.js
- **ORM**: Prisma
- **認証**: express-session + bcrypt
- **ファイルアップロード**: multer
- **PDF生成**: pdfkit
- **CSV処理**: papaparse
- **画像ストレージ**: Cloudinary
- **デプロイ先**: Google Cloud Run
- **ポート（ローカル）**: 8763

### データベース
- **DBMS**: PostgreSQL 15+
- **ホスティング**: Neon
- **接続方式**: Pooled接続必須（`?pgbouncer=true`）
- **ポート（ローカル）**: 5437

---

## 📦 現在のローカル環境の状態

### ディレクトリ構成
```
/Users/gainertatsuya/Downloads/在庫管理/
├── backend/          # バックエンドAPI
│   ├── src/
│   ├── prisma/
│   └── package.json
├── frontend/         # フロントエンドUI
│   ├── src/
│   └── package.json
├── docs/             # ドキュメント
├── CLAUDE.md         # プロジェクト設定
└── .env.local        # 環境変数（ローカル用）
```

### 最新の実装済み機能（Phase 14完了）
1. **PDFエクスポート機能**
   - A4縦向き、左右10mm/上下10mmの余白
   - 展開図（200px、中央配置）+ パーツ一覧表
   - 複数ページ自動分割
   - jsPDF + html2canvas使用

2. **展開図管理機能**
   - アップロード（Cloudinary経由）
   - 変更（既存画像の差し替え）
   - 削除
   - 管理ページからの操作

3. **ジャンルコード表示**
   - パーツページヘッダーに表示
   - `genre.genreId` フィールドを使用

4. **その他の主要機能**
   - カテゴリー・ジャンル・ユニット・パーツの階層管理
   - 画像アップロード（ジャンル画像、パーツ画像、展開図）
   - 在庫数管理（同一品番の自動同期）
   - 検索機能（収納ケース番号、品番）
   - CSVエクスポート/インポート
   - アカウント管理（管理者・一般ユーザー）

### 環境変数（ローカル用 `.env.local`）
```bash
# データベース（Neon）
DATABASE_URL="postgresql://..."  # Pooled接続

# バックエンド
PORT=8763
FRONTEND_URL=http://localhost:3589
SESSION_SECRET="..."  # 32文字以上のランダム文字列

# Cloudinary（画像ストレージ）
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."
```

---

## 🚀 デプロイ手順

### Step 1: 既存環境の完全削除

#### Vercel（フロントエンド）
```bash
# プロジェクトを削除（Vercel Dashboard から）
# または CLIで
vercel remove <project-name> --yes
```

#### Google Cloud Run（バックエンド）
```bash
# サービスを削除
gcloud run services delete inventory-backend \
  --region=asia-northeast1 \
  --quiet
```

#### Neon（データベース）
```bash
# プロジェクトを削除（Neon Dashboard から）
# 既存のデータベースを完全に削除
```

---

### Step 2: 新しいデータベース作成（Neon）

1. **Neonにログイン**: https://neon.tech
2. **新しいプロジェクト作成**
   - プロジェクト名: `inventory-system-production`
   - リージョン: `ap-southeast-1` (シンガポール - 日本に最も近い)
   - PostgreSQLバージョン: 15以上
3. **接続文字列をコピー**
   - **必ず「Pooled connection」を選択**
   - 形式: `postgresql://...?pgbouncer=true`
4. **環境変数に設定**（後述）

---

### Step 3: Cloudinaryアカウント設定

1. **Cloudinaryにログイン**: https://cloudinary.com
2. **ダッシュボードから取得**
   - Cloud Name
   - API Key
   - API Secret
3. **環境変数に設定**（後述）

---

### Step 4: バックエンドのデプロイ（Google Cloud Run）

#### 4.1 環境変数の準備

本番環境用の `.env.production` を作成（**ローカルには作成しないでください。以下はデプロイ時の参考情報**）：

```bash
# データベース（Neon Pooled接続）
DATABASE_URL="postgresql://...?pgbouncer=true"

# バックエンド
PORT=8080  # Cloud Runのデフォルト
FRONTEND_URL=https://<vercel-domain>.vercel.app  # 後で設定
SESSION_SECRET="<32文字以上のランダム文字列>"

# Cloudinary
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."
```

#### 4.2 Prismaマイグレーション

```bash
cd backend

# Prisma Client生成
npx prisma generate

# データベーススキーマ反映
npx prisma db push

# 初期管理者アカウント作成
npx ts-node create-admin.ts
```

#### 4.3 Google Cloud Runへデプロイ

```bash
# Google Cloud認証
gcloud auth login

# プロジェクトIDを設定
gcloud config set project <your-project-id>

# デプロイ（Dockerfileを使用）
gcloud run deploy inventory-backend \
  --source . \
  --region=asia-northeast1 \
  --platform=managed \
  --allow-unauthenticated \
  --set-env-vars="DATABASE_URL=...,SESSION_SECRET=...,CLOUDINARY_CLOUD_NAME=...,CLOUDINARY_API_KEY=...,CLOUDINARY_API_SECRET=..." \
  --min-instances=0 \
  --max-instances=10 \
  --memory=512Mi \
  --timeout=300s

# デプロイ完了後、URLをコピー
# 例: https://inventory-backend-xxxxx.run.app
```

---

### Step 5: フロントエンドのデプロイ（Vercel）

#### 5.1 環境変数の設定

Vercel Dashboardで設定（または `vercel env add`）：

```bash
VITE_API_URL=https://inventory-backend-xxxxx.run.app
```

#### 5.2 Vercelへデプロイ

```bash
cd frontend

# Vercel CLIでデプロイ
vercel --prod

# または、GitHub連携でデプロイ
# 1. GitHubにプッシュ
# 2. VercelでGitHubリポジトリをインポート
# 3. ビルド設定:
#    - Framework: Vite
#    - Root Directory: frontend
#    - Build Command: npm run build
#    - Output Directory: dist
```

---

### Step 6: 最終確認

#### 6.1 バックエンドの動作確認

```bash
# ヘルスチェック
curl https://inventory-backend-xxxxx.run.app/health

# API疎通確認
curl https://inventory-backend-xxxxx.run.app/api/categories
```

#### 6.2 フロントエンドの動作確認

1. Vercelのデプロイ完了URLにアクセス
2. ログイン画面が表示されるか確認
3. 初期管理者アカウントでログイン
   - Email: `admin@inventory-system.local`
   - Password: `InventoryAdmin2025!`

#### 6.3 統合テスト

1. カテゴリー作成
2. ジャンル作成（画像アップロード）
3. ユニット作成
4. パーツ作成（画像アップロード）
5. 展開図アップロード
6. PDFエクスポート
7. CSVエクスポート/インポート

---

## ⚠️ 重要な注意事項

### 1. データベース接続
- **必ずPooled接続を使用**: `?pgbouncer=true` をURLに含める
- Neonの無料プランでは同時接続数に制限があるため、Pooled接続が必須

### 2. 環境変数の管理
- **ローカル環境**: `.env.local` （既存のまま維持）
- **本番環境**: Vercel Dashboard、Google Cloud Runの環境変数設定から
- **絶対にコミットしない**: `.env*` は `.gitignore` に含まれている

### 3. セッション管理
- `SESSION_SECRET` は本番環境用に新しいランダム文字列を生成
- 最低32文字、英数字記号を含む複雑な文字列を使用

### 4. CORS設定
- バックエンドの `FRONTEND_URL` を正しく設定
- Vercelのドメインが確定してから設定

### 5. Cloudinary設定
- 既存のCloudinaryアカウントを使用する場合、フォルダ名で環境を分離推奨
- 本番環境: `production/`
- ローカル環境: `development/`

---

## 🔧 トラブルシューティング

### データベース接続エラー

```
Error: Can't reach database server
```

**原因**: Neonデータベースが自動停止している（無料プランは5分アイドルで停止）

**解決策**:
1. 再度アクセスすると自動起動（1〜3秒かかる）
2. 有料プランにアップグレードすると停止しない

### Prismaマイグレーションエラー

```
Error: P1001: Can't reach database server
```

**解決策**:
1. DATABASE_URLが正しいか確認
2. Pooled接続（`?pgbouncer=true`）を使用しているか確認
3. `npx prisma db push` を使用（`migrate` ではなく）

### Cloud Runデプロイエラー

```
Error: Service does not have the required permissions
```

**解決策**:
1. Google Cloudの課金が有効化されているか確認
2. Cloud RunとArtifact RegistryのAPIが有効化されているか確認

```bash
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

### Vercelビルドエラー

```
Error: Command "npm run build" exited with 1
```

**解決策**:
1. `VITE_API_URL` が設定されているか確認
2. ローカルで `npm run build` が成功するか確認
3. Node.jsバージョンを確認（20+）

---

## 📊 デプロイ後の確認項目

### チェックリスト

- [ ] **バックエンド**: Cloud RunのURLが正常に応答
- [ ] **フロントエンド**: VercelのURLでページが表示
- [ ] **データベース**: Neonで接続確認
- [ ] **認証**: ログイン機能が動作
- [ ] **画像アップロード**: Cloudinaryに保存される
- [ ] **PDFエクスポート**: PDFが正常に生成される
- [ ] **CSVエクスポート**: CSVがダウンロードできる
- [ ] **CORS**: フロントエンドからAPIが呼べる
- [ ] **セッション**: ログイン状態が維持される

---

## 📝 デプロイ完了後の報告事項

デプロイ完了後、以下の情報を報告してください：

1. **フロントエンドURL**: `https://...vercel.app`
2. **バックエンドURL**: `https://...run.app`
3. **データベース情報**: Neonプロジェクト名、リージョン
4. **初期管理者アカウント**: Email, Password（変更推奨）
5. **デプロイ時のエラー**: あれば詳細

---

## 🔗 参考リソース

- **Vercel Documentation**: https://vercel.com/docs
- **Google Cloud Run Documentation**: https://cloud.google.com/run/docs
- **Neon Documentation**: https://neon.tech/docs
- **Prisma Documentation**: https://www.prisma.io/docs
- **Cloudinary Documentation**: https://cloudinary.com/documentation

---

## 📞 連絡先・サポート

本デプロイで問題が発生した場合：

1. エラーメッセージの全文をコピー
2. 実行したコマンドを記録
3. ユーザーに報告し、ローカル環境で修正を依頼

---

**最終更新**: 2025-11-28
**作成者**: Claude (Phase 14完了時点)
**Git Commit**: `7f0bde2`
