# ============================================
# 階層型在庫管理システム - バックエンド Dockerfile
# ============================================
# Node.js 20（Debian Slim）をベースイメージとして使用
# Alpine LinuxではなくDebianを使用することで、Prismaエンジンの互換性問題を回避
FROM node:20-slim

# Prisma用の必須ライブラリをインストール
RUN apt-get update -y && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

# 作業ディレクトリを設定
WORKDIR /app

# パッケージファイルとPrismaスキーマをコピー
COPY package*.json ./
COPY prisma ./prisma/

# 全ての依存関係をインストール（ビルドにはdevDependenciesが必要）
RUN npm ci

# Prismaクライアントを生成
RUN npx prisma generate

# アプリケーションコード全体をコピー
COPY . .

# TypeScriptをJavaScriptにコンパイル
RUN npm run build

# ポート8763を公開
EXPOSE 8763

# ヘルスチェック（Cloud Run用）
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8763/api/auth/session', (r) => {process.exit(r.statusCode === 200 || r.statusCode === 401 ? 0 : 1)})"

# アプリケーションを起動
CMD ["node", "dist/index.js"]
