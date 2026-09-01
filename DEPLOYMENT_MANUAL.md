# 階層型在庫管理システム - デプロイマニュアル

**作成日**: 2025年11月17日
**Phase**: Phase 10（本番デプロイ）
**対象環境**: 本番環境（Neon + Google Cloud Run + Vercel）

---

## 📋 目次

1. [前提条件](#前提条件)
2. [Neonデータベース設定](#neonデータベース設定)
3. [Google Cloud Runデプロイ](#google-cloud-runデプロイ)
4. [Vercelデプロイ](#vercelデプロイ)
5. [本番環境テスト](#本番環境テスト)
6. [トラブルシューティング](#トラブルシューティング)

---

## 前提条件

### 必要なツール

```bash
# Node.js 20以上
node --version  # v20.x.x

# Docker
docker --version  # 20.x.x以上

# Google Cloud CLI
gcloud --version  # 最新版推奨

# Vercel CLI（オプション）
npm install -g vercel
```

### アカウント準備

- ✅ **Neon**: [https://neon.tech](https://neon.tech) でアカウント作成
- ✅ **Google Cloud**: [https://cloud.google.com](https://cloud.google.com) でプロジェクト作成
- ✅ **Vercel**: [https://vercel.com](https://vercel.com) でアカウント作成
- ✅ **Cloudinary**: 既存アカウント使用（`dg30ioxcx`）

---

## Neonデータベース設定

### 1. 新規プロジェクト作成

1. [Neonダッシュボード](https://console.neon.tech)にログイン
2. 「New Project」をクリック
3. プロジェクト名: `inventory-system-prod`
4. リージョン: **Singapore (ap-southeast-1)** ※最寄りリージョン
5. PostgreSQLバージョン: **15以上**
6. 「Create Project」をクリック

### 2. 接続文字列取得

1. プロジェクトダッシュボードで「Connection Details」を開く
2. **「Pooled connection」を選択** ← 重要！
3. 接続文字列をコピー（例: `postgresql://username:password@xxx.neon.tech/neondb?sslmode=require&pgbouncer=true`）
4. 安全な場所に保存（後でCloud Runに設定）

### 3. マイグレーション実行

```bash
# プロジェクトルートに移動
cd /Users/gainertatsuya/Downloads/在庫管理

# 本番環境用の.envファイルを一時作成（マイグレーション用）
cat > backend/.env.production << 'EOF'
DATABASE_URL="<Neonの接続文字列をここに貼り付け>"
EOF

# Prismaマイグレーション実行
cd backend
DATABASE_URL="<Neonの接続文字列>" npx prisma db push

# Prismaクライアント生成
npx prisma generate

# 初期管理者アカウント作成（Prisma Studioで手動作成）
npx prisma studio
# ブラウザで http://localhost:5555 が開く
# 「Admin」テーブルで新規レコード作成:
#   email: admin@inventory.local
#   password: （bcryptハッシュ化済みパスワード）
#   createdAt: 現在日時
#   updatedAt: 現在日時
```

**bcryptハッシュ生成方法**:
```bash
# Node.jsで実行
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('YourSecurePassword123!', 10).then(h => console.log(h))"
```

### 4. マイグレーション確認

```bash
# データベース接続テスト
DATABASE_URL="<Neonの接続文字列>" npx prisma db execute --stdin <<< "SELECT 1"

# テーブル確認
DATABASE_URL="<Neonの接続文字列>" npx prisma db execute --stdin <<< "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
```

---

## Google Cloud Runデプロイ

### 1. Google Cloudプロジェクト準備

```bash
# 1. Google Cloudにログイン
gcloud auth login

# 2. プロジェクトID設定（既存プロジェクトまたは新規作成）
PROJECT_ID="inventory-system-prod"  # お好きな名前に変更可
gcloud config set project $PROJECT_ID

# 3. 必要なAPIを有効化
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com

# 4. リージョン設定
gcloud config set run/region asia-northeast1  # 東京
```

### 2. Dockerイメージビルド

```bash
# プロジェクトルートに移動
cd /Users/gainertatsuya/Downloads/在庫管理/backend

# Dockerイメージをビルド
docker build -t gcr.io/$PROJECT_ID/inventory-backend:v1.0.0 .

# ビルド確認
docker images | grep inventory-backend
```

### 3. Container Registryにプッシュ

```bash
# Docker認証設定
gcloud auth configure-docker

# イメージをプッシュ
docker push gcr.io/$PROJECT_ID/inventory-backend:v1.0.0
```

### 4. Cloud Runにデプロイ

```bash
# 環境変数を準備
DATABASE_URL="<Neonの接続文字列（Pooled）>"
SESSION_SECRET="<REDACTED>"  # 生成済み
CLOUDINARY_CLOUD_NAME="dg30ioxcx"
CLOUDINARY_API_KEY="<REDACTED>"
CLOUDINARY_API_SECRET="<REDACTED>"
CORS_ORIGIN="https://inventory-system.vercel.app"  # Vercel URLで後で更新

# Cloud Runにデプロイ
gcloud run deploy inventory-backend \
  --image gcr.io/$PROJECT_ID/inventory-backend:v1.0.0 \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --port 8763 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 300 \
  --set-env-vars "DATABASE_URL=$DATABASE_URL" \
  --set-env-vars "SESSION_SECRET=$SESSION_SECRET" \
  --set-env-vars "CLOUDINARY_CLOUD_NAME=$CLOUDINARY_CLOUD_NAME" \
  --set-env-vars "CLOUDINARY_API_KEY=$CLOUDINARY_API_KEY" \
  --set-env-vars "CLOUDINARY_API_SECRET=$CLOUDINARY_API_SECRET" \
  --set-env-vars "CORS_ORIGIN=$CORS_ORIGIN" \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "PORT=8763"
```

### 5. デプロイ確認

```bash
# サービスURL取得
gcloud run services describe inventory-backend --region asia-northeast1 --format 'value(status.url)'
# 例: https://inventory-backend-xxx-an.a.run.app

# ヘルスチェック
curl https://inventory-backend-xxx-an.a.run.app/api/auth/session
# 期待結果: {"authenticated":false} （401エラーではなく正常応答）
```

**重要**: このURL（`https://inventory-backend-xxx-an.a.run.app`）を保存！Vercelデプロイ時に使用します。

---

## Vercelデプロイ

### 1. Vercel CLIでデプロイ（方法A）

```bash
# フロントエンドディレクトリに移動
cd /Users/gainertatsuya/Downloads/在庫管理/frontend

# Vercelにログイン
vercel login

# デプロイ実行（初回は対話形式）
vercel --prod

# 質問に回答:
# Set up and deploy "~/Downloads/在庫管理/frontend"? [Y/n] → Y
# Which scope? → あなたのアカウント名
# Link to existing project? [y/N] → N
# What's your project's name? → inventory-system（または任意の名前）
# In which directory is your code located? → ./
# Want to override the settings? [y/N] → y
# Build Command: → npm run build
# Output Directory: → dist
# Development Command: → npm run dev

# 環境変数を設定
BACKEND_URL="https://inventory-backend-xxx-an.a.run.app"  # Cloud RunのURL
vercel env add VITE_API_URL production
# 値を入力: $BACKEND_URL
```

### 2. Vercelダッシュボードでデプロイ（方法B）

1. [Vercelダッシュボード](https://vercel.com/dashboard)にログイン
2. 「New Project」をクリック
3. 「Import Git Repository」または「Deploy from CLI」を選択

#### GitHubリポジトリから（推奨）

1. GitHubにリポジトリを作成してプッシュ
2. Vercelで「Import」
3. ルートディレクトリ: `frontend`
4. Framework Preset: **Vite**
5. Build Command: `npm run build`
6. Output Directory: `dist`
7. Install Command: `npm install`
8. 環境変数を追加:
   - `VITE_API_URL`: `https://inventory-backend-xxx-an.a.run.app`
9. 「Deploy」をクリック

### 3. デプロイ確認

```bash
# Vercel URLを取得（CLIの場合）
vercel ls

# ブラウザでアクセス
open https://inventory-system.vercel.app
# または
open https://your-project-name.vercel.app
```

### 4. CORS設定更新

Vercel URLが確定したら、Cloud RunのCORS設定を更新します。

```bash
# Vercel URLを確認
VERCEL_URL="https://inventory-system.vercel.app"  # 実際のURLに置き換え

# Cloud Runサービスを更新
gcloud run services update inventory-backend \
  --region asia-northeast1 \
  --update-env-vars "CORS_ORIGIN=$VERCEL_URL"

# 更新確認
gcloud run services describe inventory-backend --region asia-northeast1 --format 'value(spec.template.spec.containers[0].env[?(@.name=="CORS_ORIGIN")].value)'
```

---

## 本番環境テスト

### 1. 認証機能テスト

```bash
# ログインテスト
curl -X POST https://inventory-backend-xxx-an.a.run.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@inventory.local","password":"YourSecurePassword123!"}' \
  -c cookies.txt

# セッション確認
curl https://inventory-backend-xxx-an.a.run.app/api/auth/session \
  -b cookies.txt
```

### 2. ブラウザでE2E確認

1. **ログイン画面**: `https://inventory-system.vercel.app/login`
   - メールアドレス: `admin@inventory.local`
   - パスワード: `YourSecurePassword123!`
   - ✅ ログイン成功

2. **ダッシュボード**: `https://inventory-system.vercel.app/dashboard`
   - ✅ 統計データ表示
   - ✅ カテゴリー一覧表示

3. **カテゴリー管理**: `https://inventory-system.vercel.app/categories`
   - ✅ カテゴリー追加
   - ✅ カテゴリー編集
   - ✅ カテゴリー削除

4. **ジャンル管理**: カテゴリー選択 → ジャンル一覧
   - ✅ ジャンル追加
   - ✅ 画像アップロード（Cloudinary）
   - ✅ ジャンル編集
   - ✅ ジャンル削除

5. **パーツ管理**: ジャンル選択 → パーツ一覧
   - ✅ パーツ追加
   - ✅ 在庫数更新
   - ✅ パーツ編集
   - ✅ パーツ削除

6. **検索機能**: `https://inventory-system.vercel.app/search`
   - ✅ 収納ケース番号検索
   - ✅ 品番検索

7. **エクスポート機能**: ジャンル詳細ページ
   - ✅ CSVエクスポート
   - ✅ PDFエクスポート
   - ✅ CSVインポート

8. **アカウント設定**: `https://inventory-system.vercel.app/account`
   - ✅ メールアドレス変更
   - ✅ パスワード変更

### 3. パフォーマンステスト

```bash
# ページ読み込み時間計測（Chrome DevTools）
# 期待値: 初回 < 3秒、2回目以降 < 1秒

# API応答時間計測
time curl https://inventory-backend-xxx-an.a.run.app/api/auth/session
# 期待値: < 1秒（コールドスタート時は除く）
```

---

## トラブルシューティング

### 1. Cloud Runデプロイエラー

**エラー**: `Error: Container failed to start`

**解決策**:
```bash
# ログ確認
gcloud run services logs read inventory-backend --region asia-northeast1 --limit 50

# よくある原因:
# 1. DATABASE_URLが不正 → Pooled接続（pgbouncer=true）を確認
# 2. ポート設定ミス → Dockerfileで8763を公開、環境変数でPORT=8763
# 3. Prismaクライアント未生成 → Dockerfile内でnpx prisma generate実行
```

### 2. CORS エラー

**エラー**: `Access to XMLHttpRequest at 'https://inventory-backend-xxx' from origin 'https://inventory-system.vercel.app' has been blocked by CORS policy`

**解決策**:
```bash
# Cloud RunのCORS_ORIGINを更新
gcloud run services update inventory-backend \
  --region asia-northeast1 \
  --update-env-vars "CORS_ORIGIN=https://inventory-system.vercel.app"
```

### 3. Neonデータベース接続エラー

**エラー**: `P1001: Can't reach database server`

**解決策**:
```bash
# 1. Pooled接続を使用しているか確認
echo $DATABASE_URL | grep "pgbouncer=true"

# 2. Neonプロジェクトがアクティブか確認（無料プランは5分後にスリープ）
# → Neonダッシュボードで「Wake up」をクリック

# 3. 接続文字列の確認
# → Neonダッシュボードで「Connection Details」→「Pooled connection」を再コピー
```

### 4. 画像アップロードエラー

**エラー**: `Cloudinary upload failed`

**解決策**:
```bash
# Cloudinary環境変数を確認
gcloud run services describe inventory-backend --region asia-northeast1 --format 'yaml(spec.template.spec.containers[0].env)'

# 正しい値:
# CLOUDINARY_CLOUD_NAME: dg30ioxcx
# CLOUDINARY_API_KEY: <REDACTED>
# CLOUDINARY_API_SECRET: <REDACTED>
```

---

## セキュリティチェックリスト

- [ ] **SESSION_SECRET**: 開発環境と異なる値を使用（`<REDACTED>`）
- [ ] **管理者パスワード**: 強力なパスワードに変更済み
- [ ] **HTTPS接続**: Cloud RunとVercelは自動的にHTTPS
- [ ] **CORS設定**: `CORS_ORIGIN`がVercel URLと一致
- [ ] **環境変数**: `.env`ファイルをGitにコミットしていない
- [ ] **Neon接続**: Pooled接続（`pgbouncer=true`）を使用

---

## 運用情報

### コスト見積もり（月額）

| サービス | プラン | 料金 | 制限 |
|---------|-------|------|------|
| **Neon** | 無料 | $0 | CPU時間100時間、ストレージ0.5GB |
| **Cloud Run** | 従量課金 | ~$0-5 | 月200万リクエスト無料 |
| **Vercel** | Hobby | $0 | 非商用のみ、100GB帯域 |
| **Cloudinary** | 無料 | $0 | 25クレジット/月 |
| **合計** | - | **$0-5/月** | - |

### スケーリング

- **Cloud Run**: 自動スケーリング（0〜10インスタンス）
- **Neon**: 自動スケール（無料プランは制限あり）
- **Vercel**: エッジネットワーク（CDN）で高速配信

### バックアップ

```bash
# Neonデータベースバックアップ（週次推奨）
pg_dump "$DATABASE_URL" > backup-$(date +%Y%m%d).sql

# Cloudinary画像バックアップ
# → Cloudinaryダッシュボードで手動ダウンロード
```

---

## Phase 10完了条件

- [x] Dockerfile作成完了
- [x] .dockerignore作成完了
- [x] vercel.json作成完了
- [x] SESSION_SECRET生成完了
- [ ] Neonデータベース本番環境設定
- [ ] Google Cloud Runデプロイ成功
- [ ] Vercelデプロイ成功
- [ ] 全機能正常動作確認（8項目）
- [ ] パフォーマンステストPass
- [ ] セキュリティチェックPass
- [ ] Phase 10完了レポート作成

---

**作成者**: Phase 10 デプロイオーケストレーター
**最終更新**: 2025年11月17日
**次のアクション**: ユーザーによる手動デプロイ実施

---

## 📞 サポート

デプロイで問題が発生した場合:

1. このマニュアルの「トラブルシューティング」セクションを確認
2. Cloud Runログを確認: `gcloud run services logs read inventory-backend --region asia-northeast1`
3. Vercelログを確認: [https://vercel.com/dashboard](https://vercel.com/dashboard) → プロジェクト → Deployments
4. Neon接続確認: Neonダッシュボードで「Wake up」をクリック

**デプロイ成功を祈っています！🎉**
