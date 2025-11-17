# Phase 4 エージェントへの引き継ぎ文書

## 📋 プロジェクト概要

**プロジェクト名**: 階層型在庫管理システム
**現在のフェーズ**: Phase 3完了 → Phase 4開始準備完了
**最終更新日**: 2025-11-17

---

## ✅ 完了済みPhase

### Phase 1: 要件定義 ✅
- 完了日: 2025-11-13
- 成果物: `docs/requirements.md`, `CLAUDE.md`

### Phase 2: Git/GitHub管理 ✅
- 完了日: 2025-11-13
- GitHubリポジトリ: https://github.com/evolution-tatsuya/inventory-management-system
- ブランチ: main

### Phase 3: フロントエンド基盤 ✅
- 完了日: 2025-11-17
- 実装済み:
  - React 18 + Vite 5 + TypeScript 5 基盤
  - MUI v6 セットアップ完了
  - React Router v6 ルーティング
  - Zustand + React Query 状態管理
  - 認証システム（AuthContext）
  - 全12ページ実装完了
  - Playwright E2Eテスト設定完了

---

## 🎯 Phase 4 で実施すべきこと

Phase 4では**バックエンド基盤を構築**します。

### 1. バックエンドプロジェクト作成

```bash
cd /Users/gainertatsuya/Downloads/在庫管理
mkdir backend
cd backend
npm init -y
```

### 2. 必要パッケージのインストール

```bash
npm install express cors bcrypt express-session multer
npm install @prisma/client
npm install -D typescript @types/node @types/express @types/cors @types/bcrypt @types/express-session @types/multer ts-node nodemon prisma
```

### 3. TypeScript設定

`backend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### 4. Prismaセットアップ

```bash
npx prisma init
```

### 5. 環境変数設定（ルートの.env.localを参照）

ルートディレクトリ（`/Users/gainertatsuya/Downloads/在庫管理/.env.local`）に以下が設定済み:
- `DATABASE_URL`: Neon接続文字列（Pooled接続必須）
- `SESSION_SECRET`: ランダム文字列
- `PORT`: 8763（バックエンドポート）
- `FRONTEND_URL`: http://localhost:3589

### 6. Prismaスキーマ作成

`backend/prisma/schema.prisma` に以下のモデルを定義:
- Admin（管理者）
- Category（カテゴリー）
- Genre（ジャンル）
- Part（パーツ）
- PartMaster（在庫マスター）
- DiagramImage（展開図）

詳細は `docs/requirements.md` のデータベース設計セクションを参照。

### 7. Express基盤構築

以下のディレクトリ構造を作成:
```
backend/
├── src/
│   ├── index.ts          # エントリーポイント
│   ├── types/            # 型定義（frontend/src/types/index.tsと同期）
│   ├── routes/           # APIルート
│   ├── middlewares/      # ミドルウェア（認証など）
│   ├── controllers/      # コントローラー
│   └── utils/            # ユーティリティ
├── prisma/
│   └── schema.prisma     # Prismaスキーマ
├── package.json
└── tsconfig.json
```

### 8. CORSとセッション設定

```typescript
import express from 'express';
import cors from 'cors';
import session from 'express-session';

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

app.use(session({
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 } // 7日間
}));

app.use(express.json());
```

---

## 📂 正しいプロジェクトパス（重要）

```
作業ディレクトリ: /Users/gainertatsuya/Downloads/在庫管理/
```

**注意**: 以下のパスは**別プロジェクト**です。混同しないでください:
- `/Users/gainertatsuya/Downloads/投票/` ← 「車イベント投票システム」（触らない）

---

## 📄 参照ドキュメント

Phase 4以降の作業で参照すべきドキュメント:

1. **CLAUDE.md**: プロジェクト設定の詳細
   - パス: `/Users/gainertatsuya/Downloads/在庫管理/CLAUDE.md`

2. **requirements.md**: 要件定義書
   - パス: `/Users/gainertatsuya/Downloads/在庫管理/docs/requirements.md`
   - 内容: データベース設計、API仕様、全10ページの詳細仕様

3. **SCOPE_PROGRESS.md**: 進捗管理表
   - パス: `/Users/gainertatsuya/Downloads/在庫管理/docs/SCOPE_PROGRESS.md`
   - 内容: Phase 1-10の進捗状況、ページ管理表

---

## 🎯 Phase 4 完了条件

以下がすべて完了したらPhase 4完了:

- [x] バックエンドプロジェクト作成
- [x] TypeScript + Express基盤構築
- [x] Prismaセットアップ
- [x] CORSとセッション設定
- [x] 認証ミドルウェア実装
- [x] 基本的なAPIルート構造作成

---

## 🚀 Phase 5-6 へのステップ

Phase 4完了後は:

1. **Phase 5**: Prismaスキーマ作成 → Neon接続 → マイグレーション
2. **Phase 6**: 認証API実装（ログイン・ログアウト・セッション確認）

---

## ⚠️ 重要な注意事項

### 1. 型定義の同期

フロントエンドとバックエンドの型定義は**常に同一内容**を保つこと:
- `frontend/src/types/index.ts`
- `backend/src/types/index.ts`

片方を更新したら、即座にもう片方も更新する。

### 2. データベース操作

- Prisma ORMを使用、生SQLは禁止
- トランザクションが必要な操作は必ず `prisma.$transaction()` を使用
- Pooled接続を必ず使用（`DATABASE_URL` に `?pgbouncer=true`）

### 3. セキュリティ

- パスワードは必ずbcryptでハッシュ化
- 環境変数は `.env.local` で管理、Gitにコミットしない
- CORS設定でフロントエンドURLのみ許可

---

## 🔗 外部サービス（未登録）

以下のアカウント登録が必要（Phase 5以降）:
- **Neon**: https://neon.tech （PostgreSQLデータベース）
- **Cloudinary**: https://cloudinary.com （画像保存、Phase 9で使用）

---

## ✅ Phase 4 開始前チェックリスト

Phase 4を開始する前に、以下を確認してください:

- [ ] 正しいディレクトリにいる（`/Users/gainertatsuya/Downloads/在庫管理/`）
- [ ] フロントエンドが実装済み（`frontend/` ディレクトリ存在）
- [ ] `.env.local` が設定済み
- [ ] 以下のドキュメントが存在する:
  - [ ] `CLAUDE.md`
  - [ ] `docs/requirements.md`
  - [ ] `docs/SCOPE_PROGRESS.md`
- [ ] 投票プロジェクト（`/Users/gainertatsuya/Downloads/投票/`）には触れない

すべてチェックが完了したら、Phase 4を開始してください。

---

**作成日**: 2025-11-17
**作成者**: Phase 3 完了後の引き継ぎ担当（適応型委任オーケストレーター）
**引き継ぎ先**: Phase 4 バックエンド基盤構築エージェント

---

## 📞 問題が発生した場合

### 問題1: 投票プロジェクトと混同してしまった
```bash
# 正しいディレクトリに戻る
cd /Users/gainertatsuya/Downloads/在庫管理/
```

### 問題2: 型定義の同期を忘れた
```bash
# フロントエンドの型定義をバックエンドにコピー
cp frontend/src/types/index.ts backend/src/types/index.ts
```

### 問題3: Prismaの接続エラー
```bash
# Prismaクライアント再生成
npx prisma generate
```

---

**重要**: この引き継ぎ文書を読んだら、必ず正しいディレクトリ（`/Users/gainertatsuya/Downloads/在庫管理/`）で作業を開始してください。
