# デプロイ専門エージェントへの引き継ぎ

## 📋 ミッション概要

階層型在庫管理システムを、現在のローカル環境から**完全に新規の本番環境**にデプロイしてください。

---

## 🎯 デプロイ方針

### 重要事項（必読）

1. **既存の本番環境は完全削除**
   - 以前デプロイされたVercel、Cloud Run、Neonのリソースは全て削除
   - 理由: 以前のデプロイは現在のローカル環境と全く異なるため

2. **ローカル環境と完全同一**
   - `/Users/gainertatsuya/Downloads/在庫管理` の内容を**一切変更せず**そのまま本番に展開
   - コードの修正・変更は一切行わない

3. **データベースは新規作成**
   - 既存データは保持しない
   - 完全に新しいNeonデータベースを作成済み

4. **環境の完全分離**
   - ローカル環境: 開発・テスト用（ポート: frontend 3589, backend 8763）
   - 本番環境: 実運用・バグ洗い出し用（新規作成）

---

## 📦 プロジェクト情報

### ディレクトリ
```
/Users/gainertatsuya/Downloads/在庫管理/
```

### 最新のGitコミット
```
commit b9c8603
Author: Claude
Date: 2025-11-28

docs: 本番デプロイ引き継ぎ文書作成
```

### 技術スタック

**フロントエンド**:
- React 18 + TypeScript 5
- MUI v6, Zustand, React Query
- Vite 5
- デプロイ先: **Vercel**

**バックエンド**:
- Node.js 20+ + TypeScript 5
- Express.js, Prisma ORM
- デプロイ先: **Google Cloud Run**

**データベース**:
- PostgreSQL 15+ (Neon)
- **重要**: Pooled接続必須（`?pgbouncer=true`）

**画像ストレージ**:
- Cloudinary

---

## 🔐 環境変数情報

### 既に取得済みの情報

**データベース（Neon）**:
```
DATABASE_URL=postgresql://neondb_owner:npg_haZ1U3PzyQxL@ep-green-brook-a19ch2tk-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require&pgbouncer=true
```

**プロジェクト情報**:
- プロジェクト名: `inventory-system-production-new`
- リージョン: `ap-southeast-1` (シンガポール)

### ユーザーから取得が必要な情報

**Cloudinary**（画像ストレージ）:
- `CLOUDINARY_CLOUD_NAME`: ユーザーから取得してください
- `CLOUDINARY_API_KEY`: ユーザーから取得してください
- `CLOUDINARY_API_SECRET`: ユーザーから取得してください

取得方法: https://cloudinary.com/console のダッシュボードから

**セッションシークレット**:
- `SESSION_SECRET`: 32文字以上のランダム文字列を生成してください
- 例: `openssl rand -base64 32` で生成

---

## 🚀 デプロイ手順

### Phase 1: 事前準備

1. **ユーザーからCloudinary情報を取得**
   ```
   以下の情報を教えてください：
   1. Cloudinary Cloud Name
   2. Cloudinary API Key
   3. Cloudinary API Secret

   これらは https://cloudinary.com/console のダッシュボードから取得できます。
   ```

2. **Google Cloud認証確認**
   ```bash
   gcloud auth list
   # ログインしていない場合
   gcloud auth login
   ```

3. **Google Cloudプロジェクト確認**
   ```bash
   gcloud projects list
   # 既存のプロジェクトIDを確認
   # または新規作成: gcloud projects create inventory-prod-YYYYMMDD
   ```

---

### Phase 2: 既存環境の削除（必須）

**Vercel**:
```bash
# 既存のプロジェクトを確認
vercel ls

# 削除（もし存在すれば）
vercel remove <project-name> --yes
```

**Google Cloud Run**:
```bash
# 既存のサービスを確認
gcloud run services list --region=asia-northeast1

# 削除（もし存在すれば）
gcloud run services delete inventory-backend --region=asia-northeast1 --quiet
```

**Neon**:
- 旧プロジェクトがあれば、Neon Dashboardから削除
- 新しいプロジェクト `inventory-system-production-new` は既に作成済み

---

### Phase 3: バックエンドのデプロイ（Google Cloud Run）

#### 3.1 作業ディレクトリに移動
```bash
cd /Users/gainertatsuya/Downloads/在庫管理/backend
```

#### 3.2 Prismaマイグレーション

**重要**: 環境変数を設定してから実行
```bash
# DATABASE_URLを一時的に設定
export DATABASE_URL="postgresql://neondb_owner:npg_haZ1U3PzyQxL@ep-green-brook-a19ch2tk-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require&pgbouncer=true"

# Prisma Client生成
npx prisma generate

# データベーススキーマ反映（migrateではなくpushを使用）
npx prisma db push

# 確認
npx prisma db execute --stdin <<< "SELECT 1"
```

#### 3.3 初期管理者アカウント作成

**重要**: `create-admin.ts` が存在するか確認
```bash
ls -la create-admin.ts

# 存在する場合
npx ts-node create-admin.ts

# 存在しない場合、以下のスクリプトを作成
```

初期管理者アカウント情報:
- Email: `admin@inventory-system.local`
- Password: `InventoryAdmin2025!`

#### 3.4 Cloud Runへデプロイ

```bash
# プロジェクトIDを設定（既存のプロジェクトIDを使用）
gcloud config set project <your-project-id>

# セッションシークレット生成
SESSION_SECRET=$(openssl rand -base64 32)
echo "Generated SESSION_SECRET: $SESSION_SECRET"

# デプロイ（環境変数を設定）
gcloud run deploy inventory-backend \
  --source . \
  --region=asia-northeast1 \
  --platform=managed \
  --allow-unauthenticated \
  --set-env-vars="DATABASE_URL=postgresql://neondb_owner:npg_haZ1U3PzyQxL@ep-green-brook-a19ch2tk-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require&pgbouncer=true,SESSION_SECRET=$SESSION_SECRET,CLOUDINARY_CLOUD_NAME=<取得した値>,CLOUDINARY_API_KEY=<取得した値>,CLOUDINARY_API_SECRET=<取得した値>,FRONTEND_URL=https://TBD" \
  --min-instances=0 \
  --max-instances=10 \
  --memory=512Mi \
  --cpu=1 \
  --timeout=300s \
  --port=8080

# デプロイ完了後、URLをメモ
# 例: https://inventory-backend-xxxxx-an.a.run.app
```

**重要**: デプロイ完了後のURLを保存してください。

---

### Phase 4: フロントエンドのデプロイ（Vercel）

#### 4.1 作業ディレクトリに移動
```bash
cd /Users/gainertatsuya/Downloads/在庫管理/frontend
```

#### 4.2 環境変数の設定

バックエンドのURLを使用して環境変数を設定:

```bash
# 環境変数ファイル作成（一時的）
echo "VITE_API_URL=https://inventory-backend-xxxxx-an.a.run.app" > .env.production

# Vercel CLIで環境変数を設定
vercel env add VITE_API_URL production
# プロンプトで入力: https://inventory-backend-xxxxx-an.a.run.app
```

#### 4.3 Vercelへデプロイ

```bash
# Vercel CLIでデプロイ
vercel --prod

# デプロイ完了後、URLをメモ
# 例: https://inventory-frontend-xxxxx.vercel.app
```

#### 4.4 バックエンドのFRONTEND_URL更新

フロントエンドのURLが確定したら、バックエンドの環境変数を更新:

```bash
# Cloud Runサービスの環境変数を更新
gcloud run services update inventory-backend \
  --region=asia-northeast1 \
  --update-env-vars="FRONTEND_URL=https://inventory-frontend-xxxxx.vercel.app"
```

#### 4.5 .env.production削除

```bash
# 一時的に作成したファイルを削除（ローカル環境を汚さないため）
rm .env.production
```

---

### Phase 5: 動作確認

#### 5.1 バックエンドの確認

```bash
# ヘルスチェック（存在する場合）
curl https://inventory-backend-xxxxx-an.a.run.app/health

# API疎通確認
curl https://inventory-backend-xxxxx-an.a.run.app/api/categories
```

#### 5.2 フロントエンドの確認

ブラウザで以下を確認:

1. **ログイン画面表示**: `https://inventory-frontend-xxxxx.vercel.app`
2. **ログイン成功**:
   - Email: `admin@inventory-system.local`
   - Password: `InventoryAdmin2025!`
3. **ダッシュボード表示**: ログイン後、ダッシュボードが表示される

#### 5.3 主要機能の確認

- [ ] カテゴリー作成
- [ ] ジャンル作成（画像アップロード）
- [ ] ユニット作成
- [ ] パーツ作成（画像アップロード）
- [ ] 展開図アップロード
- [ ] PDFエクスポート
- [ ] CSVエクスポート

---

## ⚠️ トラブルシューティング

### データベース接続エラー

```
Error: Can't reach database server
```

**原因**: Neonデータベースが自動停止（5分アイドル）

**解決策**:
- 再度アクセスすると自動起動（1〜3秒）
- 数回リトライで解決

### Prismaエラー

```
Error: P1001
```

**確認事項**:
1. DATABASE_URLに `?pgbouncer=true` が含まれているか
2. `npx prisma db push` を使用しているか（`migrate` ではない）
3. 環境変数が正しく設定されているか

### Cloud Runデプロイエラー

```
Error: Service does not have the required permissions
```

**解決策**:
```bash
# APIを有効化
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com

# 課金が有効化されているか確認
gcloud beta billing accounts list
```

### Vercelビルドエラー

```
Error: Command "npm run build" exited with 1
```

**確認事項**:
1. `VITE_API_URL` が設定されているか
2. ローカルで `npm run build` が成功するか確認
   ```bash
   cd frontend
   VITE_API_URL=https://inventory-backend-xxxxx-an.a.run.app npm run build
   ```

### CORSエラー

```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**解決策**:
- バックエンドの `FRONTEND_URL` が正しく設定されているか確認
- Cloud Runの環境変数を再確認
  ```bash
  gcloud run services describe inventory-backend --region=asia-northeast1 --format="value(spec.template.spec.containers[0].env)"
  ```

---

## 📊 デプロイ完了後の報告

デプロイ完了後、以下の情報をユーザーに報告してください:

```
✅ デプロイ完了しました！

【本番環境URL】
- フロントエンド: https://inventory-frontend-xxxxx.vercel.app
- バックエンド: https://inventory-backend-xxxxx-an.a.run.app

【データベース情報】
- ホスティング: Neon
- プロジェクト名: inventory-system-production-new
- リージョン: ap-southeast-1 (シンガポール)

【初期管理者アカウント】
- Email: admin@inventory-system.local
- Password: InventoryAdmin2025!
（本番運用前に必ず変更してください）

【動作確認結果】
- ログイン: ✅
- カテゴリー作成: ✅
- ジャンル作成: ✅
- 画像アップロード: ✅
- PDFエクスポート: ✅
- その他: （結果を記載）

【注意事項】
- ローカル環境と本番環境のデータベースは完全に分離されています
- 本番環境で見つかった問題は、ローカル環境で修正してから再デプロイしてください
- 初期管理者パスワードは必ず変更してください
```

---

## 🔧 デプロイ後の運用フロー

1. **本番環境で問題発見**
2. **ローカル環境で修正・テスト**
3. **動作確認OK → Git コミット**
4. **本番環境に再デプロイ**
   ```bash
   # バックエンド
   cd backend
   gcloud run deploy inventory-backend --source . --region=asia-northeast1

   # フロントエンド
   cd frontend
   vercel --prod
   ```

---

## 📝 参考資料

- **詳細な手順**: `/Users/gainertatsuya/Downloads/在庫管理/DEPLOYMENT_HANDOFF.md`
- **プロジェクト設定**: `/Users/gainertatsuya/Downloads/在庫管理/CLAUDE.md`
- **API仕様**: `/Users/gainertatsuya/Downloads/在庫管理/docs/API_ENDPOINTS.md`

---

## ✅ チェックリスト

デプロイ前:
- [ ] Cloudinary情報を取得
- [ ] Google Cloud認証確認
- [ ] 既存環境の削除

デプロイ中:
- [ ] Prismaマイグレーション成功
- [ ] 初期管理者アカウント作成
- [ ] Cloud Runデプロイ成功
- [ ] Vercelデプロイ成功
- [ ] 環境変数の相互参照更新

デプロイ後:
- [ ] バックエンドAPI疎通確認
- [ ] フロントエンドログイン確認
- [ ] 画像アップロード確認
- [ ] PDFエクスポート確認
- [ ] CSVエクスポート確認

---

**最終更新**: 2025-11-28
**Git Commit**: `b9c8603`
**作成者**: Claude

---

## 🎯 最優先タスク

1. **ユーザーからCloudinary情報を取得**
2. **バックエンドをCloud Runにデプロイ**
3. **フロントエンドをVercelにデプロイ**
4. **動作確認して報告**

それでは、よろしくお願いします！
