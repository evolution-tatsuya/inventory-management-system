# 階層型在庫管理システム - 進捗管理

## プロジェクト概要

**プロジェクト名**: 階層型在庫管理システム
**開始日**: 2025-11-13
**要件定義書**: [inventory-requirements.md](./inventory-requirements.md)

---

## Phase進捗

### Phase 1: 要件定義 ✅
- [x] Step#1: 得たい成果の精密な特定
- [x] Step#2: 実現可能性調査
- [x] Step#3: 認証・権限設計
- [x] Step#4: ページリスト作成
- [x] Step#5: 技術スタック最終決定
- [x] Step#6: 外部API最終決定
- [x] Step#7: 要件定義書作成
- [x] Step#8: SCOPE_PROGRESS更新
- [x] Step#9: CLAUDE.md生成

**完了日**: 2025-11-13

---

### Phase 2: Git/GitHub管理 ⏳
- [ ] リポジトリ作成
- [ ] 初期コミット
- [ ] README作成

---

### Phase 3: フロントエンド基盤 ⏳
- [ ] Reactプロジェクト作成（Vite）
- [ ] MUI v6セットアップ
- [ ] ルーティング設定
- [ ] 状態管理設定（Zustand, React Query）

---

### Phase 4: バックエンド基盤 ⏳
- [ ] Node.js + Expressプロジェクト作成
- [ ] Prismaセットアップ
- [ ] Neonデータベース接続
- [ ] 認証ミドルウェア実装

---

### Phase 5: データベース設計 ⏳
- [ ] Prismaスキーマ作成
- [ ] マイグレーション実行
- [ ] 初期データ投入

---

### Phase 6: 認証機能 ⏳
- [ ] ログインAPI実装
- [ ] セッション管理
- [ ] ログインページ実装

---

### Phase 7: ユーザー向けページ実装 ⏳
- [ ] P-002: カテゴリー選択ページ
- [ ] P-003: ジャンル一覧ページ
- [ ] P-004: パーツリストページ
- [ ] P-005: 検索ページ

---

### Phase 8: 管理画面実装 ⏳
- [ ] A-001: 管理ダッシュボード
- [ ] A-002: カテゴリー管理ページ
- [ ] A-003: ジャンル管理ページ
- [ ] A-004: パーツリスト管理ページ
- [ ] A-005: 表示設定ページ
- [ ] A-006: アカウント設定ページ

---

### Phase 9: 画像管理機能 ⏳
- [ ] Cloudinaryセットアップ
- [ ] 画像アップロード実装
- [ ] 画像表示実装
- [ ] PDF画像表示実装（react-pdf）

---

### Phase 10: エクスポート機能 ⏳
- [ ] CSVエクスポート実装（Papa Parse）
- [ ] PDFエクスポート実装（jsPDF/pdfmake）
- [ ] CSV一括インポート実装

---

## ページ管理表

| ID | ページ名 | ルート | 権限レベル | 機能 | 着手 | 完了 |
|----|---------|-------|----------|------|------|------|
| P-001 | ログインページ | `/login` | ゲスト | ログイン認証 | [ ] | [ ] |
| P-002 | カテゴリー選択ページ | `/categories` | 管理者 | カテゴリー一覧表示、検索ボタン | [ ] | [ ] |
| P-003 | ジャンル一覧ページ | `/categories/:id/genres` | 管理者 | ジャンル一覧表示（画像付き） | [ ] | [ ] |
| P-004 | パーツリストページ | `/genres/:id/parts` | 管理者 | 展開図+パーツ一覧表示 | [ ] | [ ] |
| P-005 | 検索ページ | `/search` | 管理者 | 収納ケース番号/品番検索 | [ ] | [ ] |
| A-001 | 管理ダッシュボード | `/admin` | 管理者 | 統計表示、クイックアクセス | [ ] | [ ] |
| A-002 | カテゴリー管理ページ | `/admin/categories` | 管理者 | カテゴリー追加/編集/削除 | [ ] | [ ] |
| A-003 | ジャンル管理ページ | `/admin/genres` | 管理者 | ジャンル追加/編集/削除/画像管理 | [ ] | [ ] |
| A-004 | パーツリスト管理ページ | `/admin/parts` | 管理者 | パーツ追加/編集/削除/一括操作/CSV/PDF出力 | [ ] | [ ] |
| A-005 | 表示設定ページ | `/admin/settings/display` | 管理者 | 画像表示切り替え、画像位置選択 | [ ] | [ ] |
| A-006 | アカウント設定ページ | `/admin/settings/account` | 管理者 | ID/パスワード変更 | [ ] | [ ] |

---

## 主要マイルストーン

- [x] **2025-11-13**: Phase 1 完了（要件定義）
- [ ] **TBD**: Phase 2-4 完了（基盤構築）
- [ ] **TBD**: Phase 5-6 完了（データベース・認証）
- [ ] **TBD**: Phase 7-8 完了（ページ実装）
- [ ] **TBD**: Phase 9-10 完了（画像・エクスポート機能）
- [ ] **TBD**: MVP完成

---

## 技術スタック

### フロントエンド
- React 18
- TypeScript 5
- MUI v6
- React Router v6
- Zustand
- React Query
- Vite 5
- react-pdf
- Papa Parse

### バックエンド
- Node.js 20+ (TypeScript 5)
- Express.js
- Prisma ORM
- bcrypt
- express-session
- multer

### インフラ
- Database: PostgreSQL 15+ (Neon)
- Image Storage: Cloudinary
- Frontend Hosting: Vercel
- Backend Hosting: Google Cloud Run

---

## 外部サービス

| サービス | 用途 | 状態 |
|---------|------|------|
| Cloudinary | 画像・PDF保存 | ⏳ 未登録 |
| Neon | PostgreSQLデータベース | ⏳ 未登録 |

---

**最終更新日**: 2025-11-13
