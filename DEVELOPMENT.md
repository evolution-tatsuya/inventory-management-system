# ローカル開発環境セットアップガイド

## 🎯 目的

本番データベースを保護しながら、安全にローカル開発を行うための環境構築手順です。

---

## 📋 前提条件

- Docker Desktop がインストール済み
- Node.js 20+ がインストール済み
- PostgreSQL 17 クライアントツールがインストール済み（バックアップ用）

---

## 🚀 セットアップ手順

### 1. Docker PostgreSQL を起動

```bash
# プロジェクトルートで実行
docker-compose up -d

# 起動確認
docker-compose ps
```

**期待される出力:**
```
NAME                       COMMAND                  SERVICE    STATUS     PORTS
inventory-postgres-dev     "docker-entrypoint.s…"   postgres   Up         0.0.0.0:5437->5432/tcp
```

---

### 2. 環境変数ファイルをコピー

```bash
# ローカル開発用の環境変数を使用
cp .env.development .env.local
```

**重要**: `.env.local` は本番データベースに接続しないように設定されています。

---

### 3. データベースマイグレーション

```bash
cd backend

# Prismaスキーマをデータベースに反映
npm run db:push

# Prisma Clientを生成
npm run db:generate
```

---

### 4. テストデータ投入（オプション）

```bash
# シードスクリプトを実行してテストデータを投入
npm run db:seed
```

---

### 5. 開発サーバー起動

#### バックエンド

```bash
cd backend
npm run dev
```

**起動URL**: http://localhost:8763

#### フロントエンド

```bash
cd frontend
npm run dev
```

**起動URL**: http://localhost:3589

---

## 🔄 本番データをローカルに復元（オプション）

本番データのバックアップをローカル開発環境に復元する場合：

```bash
cd backend

# バックアップスクリプトを実行
./scripts/backup-production.sh

# プロンプトで「ローカルDBに復元しますか?」に「y」と答える
```

---

## 📊 データベース管理

### Prisma Studio でデータを確認

```bash
cd backend
npm run db:studio
```

**起動URL**: http://localhost:5555

GUIでデータベースの内容を確認・編集できます。

---

### Docker PostgreSQL に直接接続

```bash
docker exec -it inventory-postgres-dev psql -U inventory_dev -d inventory_dev
```

---

## 🛠️ よく使うコマンド

```bash
# Docker起動
docker-compose up -d

# Docker停止
docker-compose down

# Dockerログ確認
docker-compose logs -f postgres

# データベースリセット
cd backend
npm run db:reset

# データベース接続確認
npm run db:execute -- "SELECT 1"
```

---

## 🔐 環境変数の説明

| 変数名 | 値 | 説明 |
|--------|-----|------|
| `DATABASE_URL` | `postgresql://inventory_dev:dev_password_2025@localhost:5437/inventory_dev` | ローカルDockerのPostgreSQL |
| `NODE_ENV` | `development` | 開発モード |
| `PORT` | `8763` | バックエンドポート |
| `FRONTEND_URL` | `http://localhost:3589` | フロントエンドURL（CORS用） |
| `VITE_API_URL` | `http://localhost:8763` | バックエンドURL（フロントエンド用） |

---

## ⚠️ 重要な注意事項

### ✅ やっていいこと

- ローカル環境で自由にコードを変更
- テストデータを追加・削除
- データベーススキーマを変更
- エラーを発生させて動作確認

### ❌ やってはいけないこと

- `.env.local` を本番データベースURLに変更
- 本番データベースに直接接続して開発
- `.env.local` をGitにコミット

---

## 🌍 環境の切り替え

### 本番環境にデプロイ前の確認

1. **TypeScriptビルドエラーがないか確認**
   ```bash
   cd frontend && npm run build
   cd backend && npm run build
   ```

2. **環境変数が正しいか確認**
   - `.env.local` は本番データベースに接続していないか
   - Vercel/Cloud Runの環境変数は正しいか

3. **テストを実行**（今後実装予定）
   ```bash
   npm test
   ```

---

## 🆘 トラブルシューティング

### Docker が起動しない

```bash
# Docker Desktopが起動しているか確認
docker ps

# コンテナを削除して再起動
docker-compose down -v
docker-compose up -d
```

### データベース接続エラー

```bash
# 接続確認
docker exec inventory-postgres-dev pg_isready -U inventory_dev

# ログ確認
docker-compose logs postgres
```

### Prisma Client エラー

```bash
# Prisma Clientを再生成
cd backend
npm run db:generate
```

---

## 📚 関連ドキュメント

- [CLAUDE.md](./CLAUDE.md) - プロジェクト全体設定
- [DEPLOYMENT_MANUAL.md](./docs/DEPLOYMENT_MANUAL.md) - 本番環境デプロイ手順
- [backend/scripts/backup-production.sh](./backend/scripts/backup-production.sh) - バックアップスクリプト

---

## 🎉 セットアップ完了！

これで安全にローカル開発ができるようになりました。

本番データを誤って変更する心配なく、自由に開発できます！
