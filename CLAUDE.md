# プロジェクト設定 - 階層型在庫管理システム

## 基本設定
```yaml
プロジェクト名: 階層型在庫管理システム
開始日: 2025-11-13
技術スタック:
  frontend:
    - React 18
    - TypeScript 5
    - MUI v6
    - Zustand
    - React Query
    - React Router v6
    - Vite 5
    - react-pdf
    - Papa Parse
  backend:
    - Node.js 20+ (TypeScript 5)
    - Express.js
    - Prisma ORM
    - bcrypt
    - express-session
    - multer
  database:
    - PostgreSQL 15+ (Neon)
  storage:
    - Cloudinary
```

## 開発環境
```yaml
ポート設定:
  # 複数プロジェクト並行開発のため、一般的でないポートを使用
  frontend: 3589
  backend: 8763
  database: 5437

環境変数:
  設定ファイル: .env.local（ルートディレクトリ）
  必須項目:
    - DATABASE_URL (Neon接続文字列、Pooled接続必須)
    - SESSION_SECRET (ランダム文字列、32文字以上推奨)
    - PORT (バックエンドポート、デフォルト8763)
    - FRONTEND_URL (CORS設定用、デフォルトhttp://localhost:3589)
    - CLOUDINARY_CLOUD_NAME (Cloudinary Cloud Name)
    - CLOUDINARY_API_KEY (Cloudinary API Key)
    - CLOUDINARY_API_SECRET (Cloudinary API Secret)
```

## テスト認証情報
```yaml
開発用アカウント:
  email: admin@inventory-system.local
  password: InventoryAdmin2025!

開発用テストデータ:
  カテゴリー: GT3-048, GT3-049（テスト用）
  ジャンル: ENG ASSY, TRANSMISSION（テスト用）
  パーツ: 50個程度の在庫データ
```

## コーディング規約

### 命名規則
```yaml
ファイル名:
  - コンポーネント: PascalCase.tsx (例: CategoryList.tsx, GenreCard.tsx)
  - ユーティリティ: camelCase.ts (例: formatDate.ts, validatePartNumber.ts)
  - 定数: UPPER_SNAKE_CASE.ts (例: API_ENDPOINTS.ts, IMAGE_SETTINGS.ts)
  - API: kebab-case.ts (例: category-routes.ts, part-routes.ts)

変数・関数:
  - 変数: camelCase (例: partNumber, stockQuantity)
  - 関数: camelCase (例: createPart, updateStock)
  - 定数: UPPER_SNAKE_CASE (例: MAX_IMAGE_SIZE, DEFAULT_STORAGE_CASE)
  - 型/インターフェース: PascalCase (例: Part, Category, Genre)
```

### コード品質
```yaml
必須ルール:
  - TypeScript: strictモード有効
  - 未使用の変数/import禁止
  - console.log本番環境禁止（開発環境のみ許可）
  - エラーハンドリング必須（try-catch, Promise.catch）
  - 非同期処理は必ずasync/await使用

フォーマット:
  - インデント: スペース2つ
  - セミコロン: あり
  - クォート: シングル
  - 行末カンマ: あり（trailing comma）
  - 最大行長: 100文字
```

### コミットメッセージ
```yaml
形式: [type]: [description]

type:
  - feat: 新機能
  - fix: バグ修正
  - docs: ドキュメント
  - style: フォーマット
  - refactor: リファクタリング
  - test: テスト
  - chore: その他

例:
  - "feat: カテゴリー管理ページ実装"
  - "fix: 在庫数同期バグ修正"
  - "docs: API仕様書にエクスポートエンドポイント追加"
```

## プロジェクト固有ルール

### APIエンドポイント
```yaml
命名規則:
  - RESTful形式を厳守
  - 複数形を使用 (/categories, /genres, /parts)
  - ケバブケース使用 (/part-master, /diagram-images)
  - 管理者用は /admin プレフィックス（認証必須）

エンドポイント一覧:
  認証:
    - POST /api/auth/login - ログイン
    - POST /api/auth/logout - ログアウト
    - GET /api/auth/session - セッション確認

  カテゴリー:
    - GET /api/categories - カテゴリー一覧取得
    - POST /api/admin/categories - カテゴリー追加
    - PUT /api/admin/categories/:id - カテゴリー更新
    - DELETE /api/admin/categories/:id - カテゴリー削除

  ジャンル:
    - GET /api/categories/:id/genres - ジャンル一覧取得
    - POST /api/admin/genres - ジャンル追加（画像含む）
    - PUT /api/admin/genres/:id - ジャンル更新（画像含む）
    - DELETE /api/admin/genres/:id - ジャンル削除

  パーツ:
    - GET /api/genres/:id/parts - パーツ一覧取得
    - POST /api/admin/parts - パーツ追加（画像含む）
    - PUT /api/admin/parts/:id - パーツ更新（画像含む）
    - DELETE /api/admin/parts/:id - パーツ削除
    - PUT /api/admin/parts/:partNumber/stock - 在庫数更新（同一品番すべて自動反映）

  検索:
    - GET /api/search/by-storage-case?case={caseNumber} - 収納ケース番号検索
    - GET /api/search/by-part-number?partNumber={partNumber} - 品番検索

  エクスポート:
    - GET /api/admin/genres/:id/export/csv - CSVエクスポート
    - GET /api/admin/genres/:id/export/pdf - PDFエクスポート（展開図+一覧表）
    - POST /api/admin/genres/:id/import/csv - CSV一括インポート

  画像:
    - POST /api/admin/images/upload - 画像アップロード（Cloudinary）
    - DELETE /api/admin/images/:id - 画像削除

  展開図:
    - GET /api/genres/:genreId/diagram - ジャンルの展開図取得
    - PUT /api/admin/genres/:genreId/diagram - 展開図作成/更新
    - DELETE /api/admin/genres/:genreId/diagram - 展開図削除

  アカウント:
    - PUT /api/admin/account/email - メールアドレス変更
    - PUT /api/admin/account/password - パスワード変更
```

### 型定義
```yaml
配置:
  frontend: src/types/index.ts
  backend: src/types/index.ts

同期ルール:
  - 両ファイルは常に同一内容を保つ
  - 片方を更新したら即座にもう片方も更新
  - 共通型は必ず両方で定義

主要型定義:
  - Category: カテゴリーデータ
  - Genre: ジャンルデータ
  - Part: パーツデータ
  - PartMaster: 在庫マスターデータ
  - DiagramImage: 展開図データ
  - Admin: 管理者データ
```

### データベース操作
```yaml
ルール:
  - Prisma ORMを使用、生SQLは禁止
  - トランザクション必須の操作:
    - 在庫数更新（PartMaster更新）
    - CSV一括インポート（複数パーツ作成 + PartMaster更新）
    - ジャンル削除（関連パーツ・画像も削除）
  - 集計クエリはインデックスを活用
  - Pooled接続を必ず使用（DATABASE_URL に ?pgbouncer=true）

トランザクション例:
  await prisma.$transaction(async (tx) => {
    // 在庫数更新
    const partMaster = await tx.partMaster.update({
      where: { partNumber },
      data: { stockQuantity: newQuantity },
    });

    // 確認
    console.log(`品番 ${partNumber} の在庫数を ${newQuantity} に更新`);
  });
```

### 画像管理
```yaml
保存方法:
  - Cloudinaryに保存（Base64ではなくURLをDBに保存）
  - 画像種類: ジャンル画像、展開図、パーツ画像
  - PDFもサポート（画像として表示）

制約:
  - 最大ファイルサイズ: 5MB（画像）、10MB（PDF）
  - 対応形式: JPG, PNG, SVG, PDF
  - 差し替え時: 古い画像を自動削除（Cloudinary API使用）

実装:
  - multer: ファイルアップロード処理
  - cloudinary: 画像保存・削除
  - react-pdf: PDF画像表示
```

### 在庫数同期
```yaml
仕組み:
  - PartMasterテーブルで品番ごとの在庫数を一元管理
  - Partテーブルは在庫数を持たず、PartMasterから取得
  - 在庫数変更時はPartMasterのみ更新
  - 同一カテゴリー内の同一品番すべてに自動反映
  - 別カテゴリーには影響しない

データベース設計:
  - Part.partNumber → PartMaster.partNumber（外部キー）
  - PartMaster.stockQuantity: 唯一の真実（Single Source of Truth）
```

## 🆕 最新技術情報（知識カットオフ対応）
```yaml
Vercel無料プラン（Hobby）:
  - 商用利用: 禁止（本プロジェクトは非商用のため問題なし）
  - サーバーレス関数: 同時実行1000
  - プロジェクト数: 無制限
  - デプロイ: 無制限
  - 帯域: 100GB/月

Neon無料プラン:
  - ストレージ: 0.5GB
  - CPU時間: 月100時間
  - 同時接続: Pooled接続で10,000まで
  - リージョン: シンガポール（ap-southeast-1）が最寄り
  - 自動停止: アイドル5分で停止、再起動1〜3秒

Cloudinary無料プラン:
  - ストレージ: 25GB
  - 帯域: 25GB/月
  - 変換クレジット: 25単位/月
  - 画像最適化: 自動
  - PDF対応: サムネイル生成可能

Google Cloud Run無料枠:
  - リクエスト: 月200万回
  - CPU時間: 月18万vCPU秒
  - メモリ: 月36万GB秒
  - 自動スケーリング: 0〜1000インスタンス
  - タイムアウト: デフォルト5分、最大60分

MUI v6:
  - Autocompleteコンポーネント: カテゴリー・ジャンル検索に使用可能
  - Button: ボタン実装
  - DataGrid: パーツ一覧表示に使用
  - TextField: フォーム入力
  - Dialog: 確認ダイアログ、編集モーダル
  - Drawer: サイドバー式管理画面
  - Tabs: 管理画面のタブ切り替え

React Query:
  - useQuery: データ取得
  - useMutation: データ更新
  - キャッシング: 5分（デフォルト）
  - リフェッチ: ウィンドウフォーカス時
  - 在庫数更新後のキャッシュ無効化で全画面に自動反映

react-pdf:
  - PDF画像表示
  - ページ単位レンダリング
  - Worker設定必須（ブラウザクラッシュ防止）
  - Base64・URL両対応

Papa Parse:
  - CSV生成・解析
  - 日本語対応（UTF-8 BOM必須）
  - Excel互換
```

## ⚠️ プロジェクト固有の注意事項
```yaml
在庫数管理:
  - 同一カテゴリー内の同一品番は在庫数を共有
  - 1箇所で変更すると全て自動反映
  - 別カテゴリーには影響しない
  - PartMasterが唯一の真実
  - 在庫数0の場合は赤字表示（管理ページ）
  - パーツダイアログ内で在庫数の編集可能（+/-ボタン付き）

画像管理:
  - ジャンル画像: 各ジャンルに1枚（任意）
  - 展開図: 各ジャンルに1枚（任意）
  - パーツ画像: 各パーツに1枚（任意）
  - 差し替え時に古い画像を自動削除

パーツリスト表示設定:
  - 展開図: 表示/非表示切り替え可能
  - パーツ画像: 表示/非表示切り替え可能
  - 画像位置: 左端/右端選択可能
  - 設定は管理画面で変更

ユニットフィルタリング:
  - App.tsxのルートパラメータは :unitId を使用（:unitNumber ではない）
  - UnitListPageからPartsListPageへの遷移時は unitId を使用
  - バックエンドpartServiceはunit relationをincludeして返す

ユニット番号表示:
  - 管理ページ: 画像とユニット個別番号の間に表示
  - 一般ページ: 管理ページと同じレイアウト
  - 目的: パーツがどのユニットに属しているか確認用

検索機能:
  - 収納ケース番号検索: 全ジャンルを横断検索
  - 品番検索: 全ジャンルを横断検索、複数ジャンルで使用されている場合はすべて表示
  - 検索結果: ジャンル名、リスト内番号、収納ケース番号、在庫数を表示

エクスポート機能:
  - CSV: パーツリストの全データをエクスポート
  - PDF: 展開図 + パーツ一覧表を1つのPDFファイルに出力
  - CSV一括インポート: 1000行まで

認証システム:
  - bcrypt + express-session
  - パスワード: 8文字以上
  - セッション有効期限: 7日間
  - ID/パスワード変更: 管理画面から変更可能

UIコンポーネント設計:
  - 数値入力フィールド: ブラウザデフォルトのスピンボタンを非表示化
    - CSS: MozAppearance: 'textfield'
    - CSS: ::-webkit-inner/outer-spin-button { WebkitAppearance: 'none' }
  - 数量・在庫数量フィールド: +/-ボタンで1ずつ増減
  - 価格フィールド: +/-ボタンなし、手入力のみ

セキュリティ:
  - 管理者パスワード: bcryptでハッシュ化
  - セッション: express-session使用
  - CORS: フロントエンドURLのみ許可
  - 環境変数: .env.localで管理、Gitにコミットしない

マルチテナント対応（将来）:
  - tenantIdをAdmin, Category, Genre, Partテーブルに追加
  - 行レベルでデータ分離
  - 1アカウント = 1独立した在庫管理システム
```

## 🚀 本番環境デプロイ情報（完全新規デプロイ - 2025-11-28）
```yaml
デプロイ完了日: 2025-11-28
デプロイ方法: Dockerfile + Cloud Build + Secret Manager + Vercel

本番環境URL:
  フロントエンド: https://inventory-management-system-two-swart.vercel.app
  バックエンド: https://inventory-backend-72579044624.asia-northeast1.run.app
  データベース: Neon PostgreSQL (neondb)

Google Cloud:
  プロジェクトID: inventory-prod-7959116f
  リージョン: asia-northeast1 (東京)
  サービス名: inventory-backend
  ビルド方法: Cloud Build (Dockerfile使用)
  環境変数管理: Secret Manager (9個のシークレット)

Vercel:
  プロジェクト名: inventory-management-system  # ※旧記載の"frontend"はEC等が混在した別プロジェクトなので誤り。正しくはこちら
  環境変数: VITE_API_URL設定済み (バックエンドURL)
  デプロイURL: https://inventory-management-system-two-swart.vercel.app

Neon:
  データベース名: neondb
  リージョン: ap-southeast-1 (シンガポール)
  接続方式: Pooled接続
  データ: シードデータ投入済み（管理者アカウント、テストカテゴリー/ジャンル/パーツ）

デプロイ構成:
  - バックエンド: Cloud Run (512MB RAM, 1 CPU, 0-10インスタンス)
  - フロントエンド: Vercel (静的ホスティング)
  - データベース: Neon PostgreSQL (Pooled接続、プロダクション用)
  - 画像ストレージ: Cloudinary (有効)

セキュリティ:
  - Secret Manager使用（全環境変数を暗号化保存）
  - CORS設定: フロントエンドURLのみ許可
  - セッション管理: express-session + bcrypt

デプロイ手順:
  1. TypeScriptエラー0件確認
  2. ビルド検証（フロント・バック）
  3. 既存環境削除（クリーン状態から再構築）
  4. Dockerfile作成・更新（ポート8080対応）
  5. Secret Manager自動登録（9個の環境変数）
  6. バックエンドデプロイ（Cloud Build + Cloud Run）
  7. フロントエンドデプロイ（Vercel）
  8. CORS設定更新（バックエンド再デプロイ）
  9. データベースマイグレーション（スキーマ + シード）
  10. Playwright自動検証（2テスト成功）
```

## 📝 作業ログ（最新5件）
```yaml
- 2026-09-21: 運営者総括ページの作り込みを本番反映。①各テナントへの直接アクセス(管理/ユーザー画面を
  別タブ・master横断権限で)②全幅レイアウト化(index.cssのbody中央寄せ残骸が原因、既存の全画面
  パターンに統一)③管理者の登録日表示④新規発行ダイアログに在庫モードの簡易説明⑤送付情報ダイアログ
  (有効化/管理/ユーザーの3URL・?key/?tenant自動入力・コピー/別タブ/QR)。壊れたgainer-copyを
  停止→バックアップ→削除し、新規テナントgainer-parts-list(GAINER在庫管理)を作成→有効化→全カテゴリー
  複製(10539部品・在庫一致)まで検証。複製ロジックにバグ無しと判明(default在庫のshared/perCategory分裂が
  誤診の元)。複製スクリプトclone-into-existing-tenant.ts追加。default(10539)は全作業通じて無傷。
  ＋段階B: Admin.lastLoginAt追加→ログイン時記録→総括に最終ログイン表示(未ログインは警告色)。
  ＋段階C: Tenantに課金6項目(plan/monthlyFee/billingStatus/契約日/次回請求日/メモ)追加、
  更新API・課金編集ダイアログ・課金列。＋データ量監視(画像枚数集計を件数列に追加)。
  本番DB db push→Cloud Run(00033→00034)デプロイ→Vercel→本番フル検証済み。
  ＋企業向け登録: Admin に companyName/department追加。有効化フォームに会社名・部署欄＋お名前必須化、
  アカウント設定で会社名/部署/名前を後から変更可(PUT /account/profile)、総括に会社名・部署・名前表示。
  Cloud Run(00035)まで本番反映済み。
  ＋バグ修正3件: ①ログアウトがlocalStorageを消さず別テナントにログイン不可→AuthContext.logoutで
  全キークリアに統一+AccountSettingsPageの独自ログアウトも統一(a5339e3)②アカウント設定で対象
  アカウント未取得時に保存すると500→フロントでブロック+バックはAppError(404/400)化(6934f5b,00036)
  ③入力例から実在名除去(株式会社ゲイナー→◯◯◯、tanaka-parts→my-parts)(5ec76df)。全て本番検証済み。
  ＋閲覧専用ユーザー機能: accountService.createUser/deleteUser、POST/DELETE /account/users(管理者用)、
  POST /master/tenants/:id/users(運営者代理作成)。管理画面アカウント設定に一覧・追加・削除UI、
  総括に代理作成ダイアログ。閲覧ユーザーは在庫閲覧のみ(編集不可)。Cloud Run(00037)まで本番検証済み。
  ＋EC連携P1: 発行API POST /api/integration/provision(x-integration-keyシークレット認証・冪等)。
  TenantにprovisionOrderId(unique)/billingType追加。注文からpendingテナント発行→キー/有効化URL返却。
  同一orderIdは二重発行しない。Secret Manager integration-api-key→Cloud Run(00038)マウント。本番検証済み。
  EC設計書Artifact/連携ロードマップは[[inventory-sales-roadmap]]。EC側P2連携も本番稼働成功。
  ＋顧客向け3プラン確定(登録パーツ数/画像容量/閲覧人数で課金・ベーシック¥3980〜)。
  ＋プラン上限のブロック実装(Cloud Run rev00040): TenantにmaxParts/maxImageMB/maxUsers、
  limitServiceで作成/CSVインポート/ユーザー追加/画像アップロード時に上限超は403拒否。既存は全null(無制限)。
  ＋EC連携の上限受け入れ(rev00041): provision APIにproductId/limits受取・Tenant.ecProductId追加、
  プラン変更API POST /api/integration/plan-change(双方向アップ/ダウン)。「EC=マスター/在庫=適用」で本番連携。
  詳細は[[inventory-sales-roadmap]]
- 2026-09-20: マルチテナント化(フェーズ3 S1-S4)を本番反映完了。全10モデルにtenantId、
  URLパス方式(/api/t/:slug)、master別導線(/api/master/*)、ライセンスキー方式でテナント発行→
  顧客が有効化時に自分でアカウント登録→総括ページで確認。多段階削除(suspended/pending・名前一致・
  バックアップDL必須)。既存データは既定テナント(slug=default,GAINER)に移行(parts10539無傷)。
  本番: Neon backfill→db push(NOT NULL化)→Cloud Run/Vercelデプロイ→Playwright検証。
  ログインレスポンスにトップレベルrole追加のバグ修正含む。詳細: 通貨換算(2026-09-16)以降の一連
- 2026-09-14: 棚卸し機能追加（範囲=収納ケース/ユニット/全件、実数入力→確認→在庫上書き＋履歴、
  PDF/CSVチェックリスト）。ダッシュボード数値の既存バグ修正（実データ表示・stats APIに
  unitCount/lowStockCount追加）。管理ヘッダーに「ユーザー画面を見る」ボタン追加。本番反映済み
- 2026-09-01: Phase 14完了（GT3-049 R35 GTRデータ投入 30ジャンル/177ユニット/2471パーツ、
  全ユニット展開図登録、画像編集ラインカット機能追加、開発/本番DB分離、
  ログイン導線分離、requireAuth脆弱性修正）詳細: PHASE14_GT3_DATA_IMPORT.md
- 2025-11-28: 完全新規デプロイ成功（Dockerfile + Cloud Build + Secret Manager）
```

## 🎯 次のアクション
```yaml
優先度: 高（Phase 12完了に向けて）
  1. パーツ管理ダイアログに数量・価格入力欄を追加
  2. 一般ページ（PartsListPage）のテーブル表示更新
  3. 数量・価格フィールドのバリデーション追加
  4. Phase 12完了後、本番環境へデプロイ

優先度: 中
  5. ユーザーフィードバック収集
  6. パフォーマンス最適化
  7. セキュリティ監査

優先度: 低
  8. マルチテナント機能実装準備
  9. 高度な検索機能追加
  10. レポート機能実装
```

## 🔄 マイグレーション手順（重要）

### Prismaを使用している場合
```bash
# 1. スキーマ変更後のDB更新
npm run db:push
# または
npx prisma db push

# 2. Prismaクライアント生成
npm run db:generate
# または
npx prisma generate
```

**注意事項**:
- **`npx prisma migrate` コマンドは使用禁止**
- **常に `npx prisma db push` を使用**
- エラー時は `npx prisma generate` を実行後再試行
- マイグレーション履歴は自動管理されません（開発用）
- 本番環境では `prisma migrate deploy` を使用（将来的に）

### データベース接続確認
```bash
# 接続テスト
npx prisma db execute --stdin <<< "SELECT 1"

# Prisma Studio起動（GUIでDB確認）
npm run db:studio
# または
npx prisma studio
```

## 🔗 参考リンク
```yaml
ドキュメント:
  - 要件定義書: docs/inventory-requirements.md
  - 進捗管理: docs/inventory-progress.md
  - このファイル: INVENTORY_CLAUDE.md

外部サービス:
  - GitHub: https://github.com
  - Vercel: https://vercel.com
  - Google Cloud: https://cloud.google.com
  - Neon: https://neon.tech
  - Cloudinary: https://cloudinary.com

技術ドキュメント:
  - React: https://react.dev
  - MUI: https://mui.com
  - Prisma: https://www.prisma.io
  - react-pdf: https://github.com/wojtekmaj/react-pdf
  - Papa Parse: https://www.papaparse.com
```
