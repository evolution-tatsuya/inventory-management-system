# フェーズ3 詳細設計：マルチテナント化（tenantId導入）＋見積り

作成日: 2026-09-15 / 対象: 階層型在庫管理システム
方針: 「いいとこ取り」= テナント対応コード ＋ デプロイ形態(共有/専用)を選べる
販売モデル: 空納品＋オプションでデータ代行入力（原本の全顧客配信は不要）

---

## 1. ゴール

- 1つのアプリ・1つのDBで複数顧客(テナント)を **tenantId で完全分離**。
- コード修正は1回で全テナントに反映。データは他テナントに絶対影響しない。
- 運営者(master)は総括ページから全テナントを横断管理・発行。
- 将来、特定顧客は「専用インスタンス(別DB/別アプリ)」でも同じコードで動かせる。

## 2. 権限階層（既存メモリ構想と統合）

```
master(運営者/あなた)  … 全テナント横断。総括ページ。テナント発行。
  └ admin(各テナントの管理者)  … 自テナントのデータのみ
      └ user(閲覧のみ)         … 自テナントの閲覧のみ
```
- master は「マスターキー」= どのテナントにも入れる最上位（[[inventory-master-key-vision]]）。

## 3. データモデル変更

### 3-1. 新テーブル
```
model Tenant {
  id          String   @id @default(cuid())
  name        String              // 顧客名/インスタンス名
  slug        String   @unique    // URL識別子(サブドメイン等に使える)
  stockMode   String   @default("perCategory") // このテナントの在庫モード(発行時に固定)
  status      String   @default("active")      // active/suspended 等
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 3-2. tenantId を追加するテーブル（全10モデル）
`Admin, User, Category, Genre, Unit, Part, PartMaster, DiagramImage, SystemSettings, StockCountLog`
- 各テーブルに `tenantId String` を追加（Tenantへの外部キー）。
- SystemSettings は「テナントごとに1つ」にする（現在は全体で1レコード → tenant単位へ）。
- 一意制約の見直し:
  - PartMaster: `@@unique([tenantId, categoryId, partNumber])`
  - Admin/User の email 一意: `@@unique([tenantId, email])`（同一emailを別テナントで許容）
  - Unit: `@@unique([tenantId, genreId, unitNumber])` 等、既存uniqueにtenantIdを前置。

### 3-3. Admin に role 追加
- `Admin.role String @default("admin")`（master/admin）。master=運営者。

## 4. 既存データの移行

- 現在のデータは全て「既定テナント」(例: name=GAINER, slug=default)に属させる。
  1. Tenant を1件作成（既定）。
  2. 全10テーブルの既存行に、その tenantId をセット（UPDATE）。
  3. 現 admin(admin@inventory-system.local) を role=master に。
- データ規模: 本番 parts=5104, categories=5, admin/user=各1。移行はUPDATEのみで軽い。
- 開発DBで検証 → 本番。フルバックアップ必須。

## 5. アプリ改修（影響範囲）

- **Prismaクエリ 82箇所** を tenantスコープ化（全 where に tenantId、create に tenantId 付与）。
  - 内訳: genre12/part11/diagramImage11/user9/unit9/admin9/systemSettings8/partMaster6/category6/stockCountLog1。
- **認証**: JWTに tenantId・role を載せる。requireAuth で req.tenantId を確立。
  - master は「対象テナントを選ぶ/切り替える」導線（総括ページ）。
- **認可**: admin/user は自 tenantId 以外を触れない（全クエリで強制）。
  - 安全策: Prisma拡張(query extension)で tenantId を自動注入し、付け忘れを防ぐ設計を推奨。
- **既存機能の全再検証**: パーツ管理/棚卸し/検索/エクスポート/展開図/ダッシュボード/複製。

## 6. 総括ページ(master)本格化

- テナント一覧・発行(空 or テンプレから)・在庫モード固定・停止/再開。
- 全テナント横断サマリー（在庫・利用状況）。
- 将来: 契約・サブスク課金連携。

## 7. デプロイ形態（いいとこ取りの実現）

- 共有インスタンス: 現行の1 Cloud Run + 1 Neon に複数テナント相乗り。
- 専用インスタンス: 同じコードを顧客専用の別Neon+別Cloud Run+別Vercelへ。
  - 専用でも tenantId は付く（単一テナント運用）ので、コードは共通のまま。

---

## 8. 見積り（規模感・段階・リスク）

**総評: 非常に大規模。安全にやるなら 5段階・各段階で開発検証→本番。**

| 段階 | 内容 | 規模感 | 主なリスク |
|---|---|---|---|
| S1 | Tenantテーブル＋全10テーブルにtenantId追加、既定テナントへ移行 | 中 | スキーマ移行・既存データ破損 → バックアップと開発検証で担保 |
| S2 | 認証にtenantId/role、requireAuthでスコープ確立 | 中 | 認可の穴（他テナント参照）。Prisma拡張で自動注入し防ぐ |
| S3 | 全82クエリのtenantスコープ化＋全機能再検証 | 大 | 付け忘れ＝情報漏洩。機能回帰。最も慎重に |
| S4 | 総括ページ(master)本格化: テナント発行・固定・停止 | 中 | UI/権限設計 |
| S5 | 専用インスタンスのデプロイ手順整備 | 小〜中 | 運用手順・秘密情報管理 |

**リスクの本丸は S3**（tenant付け忘れによる情報漏洩）。→ Prisma Client Extensions で
「全クエリに自動で tenantId を差し込む」土台を先に入れると、付け忘れを構造的に防げる。

**進め方の推奨**: S1→S2→S3 を1つずつ、各段階で開発DB検証→本番反映→コミット。
S3完了までは既存の単一テナント運用と完全互換（既定テナントのみ）を維持し、
S4で初めて2つ目のテナントを作って検証する。

---

## 9. 未確定・要決定事項（着手前に詰める）

- テナントの識別方法: サブドメイン(顧客A.example.com) / パスプレフィックス(/t/顧客A) / ログイン時選択 のどれか。
- master のログインを既存adminと同じ画面にするか、別導線にするか。
- 専用インスタンス発行の自動化レベル（手動デプロイ許容か、スクリプト化するか）。
- 課金/サブスクは今回スコープ外か（別フェーズ）。
