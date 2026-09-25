# 階層型在庫管理システム — システム設計図

最終更新: 2026-09-25
対象リポジトリ: `inventory-management-system`

このドキュメントは、システムの技術構成を実装に基づいて記述したものです。開発・運用・引き継ぎ時の技術リファレンスとして使用します。

---

## 1. 全体像

「**運営者（master）が全テナントを横断管理 → EC連携で自動発行 → 顧客がキー有効化 → テナント内で階層在庫管理**」という3層構造のマルチテナント型 SaaS。

```
┌─────────────────────────────────────────────────────────────┐
│  ECプラットフォーム（別システム）                              │
│  購入・決済・サブスク管理                                       │
└───────────────┬─────────────────────────────────────────────┘
                │ x-integration-key 認証
                │ provision / plan-change / suspend / unsuspend / reactivate
                ▼
┌─────────────────────────────────────────────────────────────┐
│  在庫管理システム（本システム）                                │
│                                                               │
│  ┌──────────────┐   ┌──────────────┐   ┌─────────────────┐  │
│  │ 運営者(master)│   │ 顧客管理者    │   │ 閲覧ユーザー     │  │
│  │ 全テナント横断 │   │ 自テナント管理 │   │ 自テナント閲覧のみ│  │
│  └──────┬───────┘   └──────┬───────┘   └────────┬────────┘  │
│         │ /api/master/*     │ /api/t/:slug/admin/* │ /api/t/:slug/* │
│         ▼                   ▼                      ▼           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Express + Prisma (Cloud Run)                             │ │
│  │  テナント単位でデータ分離（全モデルに tenantId）          │ │
│  └────────────────────────┬────────────────────────────────┘ │
│                            ▼                                  │
│         PostgreSQL (Neon)      Cloudinary (画像/PDF)          │
└─────────────────────────────────────────────────────────────┘
                ▲
                │ React (Vite) — Vercel
         ブラウザ（管理画面 / ユーザー画面 / 運営者総括ページ）
```

階層構造: **カテゴリー > ジャンル > ユニット > パーツ**。在庫数のみ `PartMaster` に分離して品番単位で同期。

---

## 2. 技術スタック

| 層 | 技術 |
|---|---|
| フロントエンド | React 19 / Vite 7 / TypeScript / MUI 7 / React Router 7 / TanStack Query 5 / Zustand / axios / @dnd-kit（並び替え）/ react-easy-crop（画像クロップ）/ qrcode.react / jspdf + html2canvas / xlsx |
| バックエンド | Node.js / Express 4 / TypeScript 5 / Prisma 5 / bcrypt / jsonwebtoken（JWT）/ cloudinary / multer / papaparse + xlsx / pdfkit |
| データベース | PostgreSQL（Neon、Pooled接続必須） |
| 画像/ファイル | Cloudinary（URLをDB保存、Base64不使用） |
| テスト | Playwright |

### デプロイ構成（本番）

| 対象 | 環境 | URL / 場所 |
|---|---|---|
| フロント | Vercel（Hobby） | `https://inventory-management-system-two-swart.vercel.app` |
| バックエンド | Google Cloud Run（asia-northeast1 / 512MB / 1CPU / 0-10インスタンス） | `https://inventory-backend-72579044624.asia-northeast1.run.app` |
| DB | Neon PostgreSQL（neondb / ap-southeast-1） | Pooled接続 `?pgbouncer=true` |
| 画像 | Cloudinary | — |

環境変数（Secret Manager管理）: `DATABASE_URL` / `SESSION_SECRET` / `FRONTEND_URL` / `CLOUDINARY_CLOUD_NAME`・`API_KEY`・`API_SECRET` / `INTEGRATION_API_KEY`（Secret Manager名: `integration-api-key`）。

デプロイ手順: 本番DB `prisma db push` → Cloud Build + Cloud Run（`gcloud run deploy inventory-backend --source .`）→ フロントは git push で Vercel 自動 → Playwright検証。

---

## 3. データベース構造

全モデルに `tenantId` を持つマルチテナント設計。テナント削除は `onDelete: Cascade` で全関連が連鎖削除。

### モデル一覧

| モデル | 役割 | 主な複合unique |
|---|---|---|
| **Tenant** | SaaSの中核。1テナント=1独立した在庫システム | slug / licenseKey / provisionOrderId（各単独unique） |
| **Admin** | 管理者（role: master / admin） | (tenantId, email) |
| **User** | 閲覧専用の一般ユーザー | (tenantId, email) |
| **Category** | カテゴリー（最上位階層） | — |
| **Genre** | ジャンル（カテゴリー配下） | — |
| **Unit** | ユニット（ジャンル配下） | (tenantId, genreId, unitNumber) |
| **Part** | パーツ本体（在庫数は持たない） | — |
| **PartMaster** | 在庫マスター（品番単位で在庫を一元管理） | (tenantId, categoryId, partNumber) |
| **DiagramImage** | 展開図（ユニット単位・最大10枚） | — |
| **SystemSettings** | テナントごとの表示設定・在庫モード | (tenantId) |
| **StockCountLog** | 棚卸し履歴 | — |

### Tenant の主要フィールド

- 基本: `slug`（URL識別子）/ `licenseKey`（有効化キー）/ `status`（pending / active / suspended）/ `stockMode`
- 課金: `plan` / `monthlyFee` / `billingStatus` / `contractStartDate` / `nextBillingDate` / `billingNote` / `billingType`
- EC連携: `provisionOrderId`（注文ID・冪等キー）/ `ecProductId` / `suspendReason`
- プラン上限: `maxParts` / `maxImageMB` / `maxUsers`（**null = 無制限**）
- 機能フラグ: `features`（カンマ区切り機能キー・**null = 全機能ON**）

### 在庫同期の設計（重要）

在庫数は Part には持たせず、`PartMaster` を **(tenantId, categoryId, partNumber)** で解決する。

- **shared モード**: `categoryId = null` で品番をテナント全体で共有（同じ品番はどこでも同じ在庫数）
- **perCategory モード**: カテゴリー単位で在庫を独立管理（別カテゴリーの同じ品番は別在庫）

在庫数を変更すると、同一品番の全パーツ表示に自動反映される（`partService.updateStock` が `affectedCount` を返す）。在庫モードは運営者が総括ページで切り替え、切替時は `stockModeService.migrateToPerCategory` が既存在庫を移行する。

---

## 4. 認証・認可

JWT（Bearerトークン）が認可の主体。ミドルウェアで区分。

| ミドルウェア | 条件 | 用途 |
|---|---|---|
| `publicTenant` | URLの `:slug` からテナント解決のみ（JWT不要）。停止/未有効化は403 | 一般閲覧GET |
| `requireAuth` | JWT必須 + `userType=admin` + slugとJWTの tenantId 一致強制 | 管理API |
| `requireMaster` | JWT `role=master` + DB再確認（全テナント横断） | 運営者API |
| `requireIntegration` | `x-integration-key` を定数時間比較（未設定は503） | EC連携API |
| `requireFeature('key')` | テナントのプラン機能フラグで403ガード | 機能別ガード |

テナント越境防止: `requireAuth` は URL の slug と JWT の tenantId の一致を強制する（master のみ横断可）。停止（suspended）・未有効化（pending）のテナントは閲覧含め403。

---

## 5. API エンドポイント一覧

### (A) テナント配下 `/api/t/:slug/*`

**認証** — `/auth/login`（ログイン）, `/auth/logout`, `/auth/session`

**カテゴリー** — `GET /categories`（閲覧）, `POST/PUT/DELETE /admin/categories[/order|/:id]`（管理）

**ジャンル** — `GET /categories/:id/genres`（閲覧）, `GET/POST/PUT/DELETE /admin/genres[...]`（管理）

**ユニット** — `GET /genres/:genreId/units`（閲覧）, `GET/POST/PUT/DELETE /admin/units[...]`（管理）

**パーツ** — `GET /genres/:id/parts`（閲覧・在庫付き）, `POST/PUT/DELETE /admin/parts[...]`（管理）, `PUT /admin/parts/:partNumber/stock`（在庫更新・品番単位）

**統計** — `GET /admin/stats`（ダッシュボード）

**検索** — `GET /search/by-storage-case`, `GET /search/by-part-number`（`search` 機能フラグ）

**アカウント** — `/admin/account/*`（一覧・情報取得・メール/パスワード/表示名/プロフィール変更・閲覧ユーザー作成/削除）

**画像** — `POST /admin/images/upload`, `DELETE /admin/images/:id`（Cloudinary）

**エクスポート/インポート** — `GET /admin/genres/:id/export/csv`（`csv_export`）, `.../export/pdf`（`pdf_export`）, `POST .../import/csv`（`csv_import`）

**展開図** — `/units/:unitId/diagrams`（閲覧）, `/admin/units/:unitId/diagrams[...]`（追加/メイン/並び替え/更新/削除）

**システム設定** — `GET /system-settings`（有効機能一覧も同梱）, `PUT /admin/system-settings`

**棚卸し** — `POST /admin/inventory-count/save`, `GET /admin/inventory-count/history`（`stocktake` 機能フラグ）

**在庫モード** — `GET/PUT /admin/owner/stock-mode`

**為替** — `GET /exchange-rates`（無認証・24hキャッシュ）

### (B) 運営者 `/api/master/*`（全て `requireMaster`）

`POST /api/master/login`（トップレベル） / `GET /tenants`（一覧）/ `POST /tenants`（発行）/ `GET /summary`（サマリー）/ `GET /cloudinary-usage` / `GET /tenants/:id`（詳細）/ `GET /tenants/:id/backup`（バックアップ）/ `PUT /tenants/:id/status`（状態変更）/ `PUT /tenants/:id/billing`（課金）/ `POST /tenants/:id/users`（ユーザー代理作成）/ `POST /tenants/:id/regenerate-key`（キー再発行）/ `DELETE /tenants/:id`（削除・confirmName必須）

### (C) 有効化（無認証）

`POST /api/tenants/activate` — 購入者がキー入力 → admin登録 → active化

### (D) EC連携 `/api/integration/*`（全て `requireIntegration`）

| エンドポイント | 役割 |
|---|---|
| `POST /provision` | 注文からテナント発行（冪等・limits/features受取） |
| `POST /plan-change` | プラン変更（上限・機能フラグの上書き。下げても既存データ保持） |
| `POST /suspend` | 解約/一時停止（データ保持・冪等） |
| `POST /unsuspend` | 再契約で再開（冪等） |
| `POST /reactivate` | 解約後の再購入で旧データ引き継ぎ（冪等） |

---

## 6. 画面（フロント）一覧

| パス | ページ | 役割 | 区分 |
|---|---|---|---|
| `/login` `/admin/login` `/master/login` | 各ログイン | 認証 | 公開 |
| `/activate` | 有効化 | キー入力→admin登録 | 公開 |
| `/master/dashboard` | 運営者総括 | 全テナント管理 | master |
| `/categories` | カテゴリー一覧 | 閲覧 | 一般 |
| `/categories/.../genres` | ジャンル一覧 | 閲覧 | 一般 |
| `/categories/.../units` | ユニット一覧 | 閲覧 | 一般 |
| `/categories/.../parts` | パーツ一覧 | 在庫閲覧・詳細モーダル | 一般 |
| `/search` | 検索 | 収納ケース/品番 横断検索 | 一般 |
| `/admin/dashboard` | ダッシュボード | 統計 | 管理者 |
| `/admin/categories` `/admin/genres` `/admin/parts` `/admin/units` | 各管理 | CRUD | 管理者 |
| `/admin/inventory-count` | 棚卸し | 理論在庫vs実数 | 管理者 |
| `/admin/owner` | 在庫モード | shared/perCategory切替 | 管理者 |
| `/admin/display-settings` | 表示設定 | システム名/ロゴ/色 | 管理者 |
| `/admin/account-settings` | アカウント | アカウント/ユーザー管理 | 管理者 |
| `/admin/qr` | QRコード | QR生成 | 管理者 |

---

## 7. プラン管理（上限 & 機能フラグ）

設計思想: **「EC = マスター、在庫 = 適用」**。プランの定義（名前・価格・上限・機能）のマスターはEC側が持ち、在庫側は発行/変更時にECから値を受け取って保存・判定する。

### 上限（limitService）

`maxParts` / `maxImageMB` / `maxUsers`（**null = 無制限 = プロ相当**）。作成前にチェックし、超過は403でブロック。上限を下げても既存データは消さず、新規追加のみブロックする。

### 機能フラグ（featureService / 7キー）

| キー | 機能 |
|---|---|
| `stocktake` | 棚卸し |
| `csv_import` | CSV一括インポート |
| `csv_export` | CSVエクスポート |
| `pdf_export` | PDFエクスポート |
| `qr_code` | QRコード |
| `search` | 横断検索 |
| `part_detail` | パーツ詳細（商品説明・制作手順・画像/PDF資料） |

`features` は有効な機能キーのカンマ区切り。**null / 空 / 全キー揃い = 全機能ON**（後方互換）。`requireFeature` が各エンドポイントを403でガードし、フロントは `GET /system-settings` に同梱される有効機能一覧を見てボタン/UIを出し分ける。

**「消さず隠す」原則**: 機能をOFFにしてもデータは削除しない（表示・登録を止めるだけ）。特にパーツ詳細（description/pdfUrl）は、プランを下げても保持され、プロに戻せばそのまま復活する。

---

## 8. テナントのライフサイクル

```
[EC購入・決済確定]
      │ provision（EC → 在庫、冪等）
      ▼
  status=pending（キー発行済み・未有効化）
      │ 購入者がキー入力（POST /api/tenants/activate）
      ▼
  status=active（admin登録済み・稼働中）
      │
      ├── plan-change ──→ 上限・機能フラグを変更（既存顧客に即反映）
      │
      ├── suspend（解約/一時停止）──→ status=suspended（ログイン403・データ保持）
      │        │ unsuspend（再契約）
      │        └──→ status=active（同一テナント復活）
      │
      └── reactivate（解約後の再購入・新注文ID）──→ 旧テナントを引き継ぎ active化
```

- 発行は EC連携（provision）または運営者手動（総括ページ）
- テナント削除は運営者のみ・active不可（先に停止）・confirmName確認・バックアップDL必須の多段階
- データ保持方針: 解約後もデータは消さず、目安1年後に運営者が総括ページで手動削除を判断

---

## 9. 残る将来スコープ

- **Stripe自動継続課金（案B = 固定変更先行）**: 毎月の自動課金・支払い失敗時の自動停止。主にEC側の作業で、在庫側の受け皿（suspend/plan-change）は稼働済み。

---

## 参考

- プロジェクト設定・本番環境情報・作業ログ: リポジトリ内 `CLAUDE.md`
- 品番採番ルール: `docs/PART_NUMBER_RULE.md`
