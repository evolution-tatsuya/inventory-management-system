# API Endpoints - 階層型在庫管理システム

**最終更新**: 2025-11-17
**バックエンドURL**: http://localhost:8763
**総エンドポイント数**: 26

---

## 📋 目次

1. [認証](#認証)
2. [カテゴリー管理](#カテゴリー管理)
3. [ジャンル管理](#ジャンル管理)
4. [パーツ管理](#パーツ管理)
5. [検索機能](#検索機能)
6. [統計機能](#統計機能)
7. [エクスポート/インポート](#エクスポートインポート)
8. [画像管理](#画像管理)
9. [アカウント設定](#アカウント設定)
10. [CORS設定](#cors設定)
11. [エラーコード](#エラーコード)

---

## 認証

### 1. ログイン
**エンドポイント**: `POST /api/auth/login`
**認証**: 不要

**リクエスト**:
```json
{
  "email": "admin@inventory-system.local",
  "password": "InventoryAdmin2025!"
}
```

**レスポンス** (200):
```json
{
  "success": true,
  "admin": {
    "id": "admin-id-uuid",
    "email": "admin@inventory-system.local"
  }
}
```

**エラー** (400):
```json
{
  "error": "Invalid email format"
}
```

**エラー** (401):
```json
{
  "error": "Invalid credentials"
}
```

---

### 2. ログアウト
**エンドポイント**: `POST /api/auth/logout`
**認証**: 必須

**レスポンス** (200):
```json
{
  "success": true
}
```

**エラー** (500):
```json
{
  "error": "Logout failed"
}
```

---

### 3. セッション確認
**エンドポイント**: `GET /api/auth/session`
**認証**: 必須

**レスポンス** (200) - ログイン中:
```json
{
  "authenticated": true,
  "adminId": "admin-id-uuid"
}
```

**レスポンス** (401) - 未ログイン:
```json
{
  "authenticated": false
}
```

---

## カテゴリー管理

### 4. カテゴリー一覧取得
**エンドポイント**: `GET /api/categories`
**認証**: 不要

**レスポンス** (200):
```json
[
  {
    "id": "category-id-uuid",
    "name": "GT3-048",
    "order": 1,
    "createdAt": "2025-11-17T00:00:00.000Z",
    "updatedAt": "2025-11-17T00:00:00.000Z",
    "genres": []
  },
  {
    "id": "category-id-uuid-2",
    "name": "GT3-049",
    "order": 2,
    "createdAt": "2025-11-17T00:00:00.000Z",
    "updatedAt": "2025-11-17T00:00:00.000Z",
    "genres": []
  }
]
```

---

### 5. カテゴリー作成
**エンドポイント**: `POST /api/admin/categories`
**認証**: 必須

**リクエスト**:
```json
{
  "name": "GT3-050"
}
```

**レスポンス** (201):
```json
{
  "id": "new-category-id-uuid",
  "name": "GT3-050",
  "order": 3,
  "createdAt": "2025-11-17T01:00:00.000Z",
  "updatedAt": "2025-11-17T01:00:00.000Z"
}
```

**エラー** (400):
```json
{
  "error": "Invalid category name (must be 1-255 characters)"
}
```

**エラー** (409):
```json
{
  "error": "Category name already exists"
}
```

---

### 6. カテゴリー更新
**エンドポイント**: `PUT /api/admin/categories/:id`
**認証**: 必須

**リクエスト**:
```json
{
  "name": "GT3-051"
}
```

**レスポンス** (200):
```json
{
  "id": "category-id-uuid",
  "name": "GT3-051",
  "order": 1,
  "createdAt": "2025-11-17T00:00:00.000Z",
  "updatedAt": "2025-11-17T02:00:00.000Z"
}
```

**エラー** (400):
```json
{
  "error": "Invalid category ID"
}
```

**エラー** (409):
```json
{
  "error": "Category name already exists"
}
```

---

### 7. カテゴリー削除
**エンドポイント**: `DELETE /api/admin/categories/:id`
**認証**: 必須

**レスポンス** (204):
```
（レスポンスボディなし）
```

**エラー** (400):
```json
{
  "error": "Invalid category ID"
}
```

---

## ジャンル管理

### 8. ジャンル一覧取得
**エンドポイント**: `GET /api/categories/:id/genres`
**認証**: 不要

**レスポンス** (200):
```json
[
  {
    "id": "genre-id-uuid",
    "categoryId": "category-id-uuid",
    "name": "ENG ASSY",
    "imageUrl": "https://res.cloudinary.com/xxxxx/image/upload/v123456/genre_image.jpg",
    "order": 1,
    "createdAt": "2025-11-17T00:00:00.000Z",
    "updatedAt": "2025-11-17T00:00:00.000Z"
  },
  {
    "id": "genre-id-uuid-2",
    "categoryId": "category-id-uuid",
    "name": "TRANSMISSION",
    "imageUrl": null,
    "order": 2,
    "createdAt": "2025-11-17T00:00:00.000Z",
    "updatedAt": "2025-11-17T00:00:00.000Z"
  }
]
```

---

### 9. ジャンル作成
**エンドポイント**: `POST /api/admin/genres`
**認証**: 必須

**リクエスト**:
```json
{
  "categoryId": "category-id-uuid",
  "name": "SUSPENSION",
  "imageUrl": "https://res.cloudinary.com/xxxxx/image/upload/v123456/genre.jpg"
}
```

**レスポンス** (201):
```json
{
  "id": "new-genre-id-uuid",
  "categoryId": "category-id-uuid",
  "name": "SUSPENSION",
  "imageUrl": "https://res.cloudinary.com/xxxxx/image/upload/v123456/genre.jpg",
  "order": 3,
  "createdAt": "2025-11-17T01:00:00.000Z",
  "updatedAt": "2025-11-17T01:00:00.000Z"
}
```

**エラー** (400):
```json
{
  "error": "Invalid genre name"
}
```

**エラー** (409):
```json
{
  "error": "Genre name already exists in this category"
}
```

---

### 10. ジャンル更新
**エンドポイント**: `PUT /api/admin/genres/:id`
**認証**: 必須

**リクエスト**:
```json
{
  "name": "SUSPENSION ASSY",
  "imageUrl": "https://res.cloudinary.com/xxxxx/image/upload/v123457/updated.jpg"
}
```

**レスポンス** (200):
```json
{
  "id": "genre-id-uuid",
  "categoryId": "category-id-uuid",
  "name": "SUSPENSION ASSY",
  "imageUrl": "https://res.cloudinary.com/xxxxx/image/upload/v123457/updated.jpg",
  "order": 3,
  "createdAt": "2025-11-17T01:00:00.000Z",
  "updatedAt": "2025-11-17T02:00:00.000Z"
}
```

**エラー** (400):
```json
{
  "error": "Invalid genre ID"
}
```

---

### 11. ジャンル削除
**エンドポイント**: `DELETE /api/admin/genres/:id`
**認証**: 必須

**レスポンス** (204):
```
（レスポンスボディなし）
```

**注意**: 関連するパーツ・展開図も自動削除されます

**エラー** (400):
```json
{
  "error": "Invalid genre ID"
}
```

---

## パーツ管理

### 12. パーツ一覧取得
**エンドポイント**: `GET /api/genres/:id/parts`
**認証**: 不要

**レスポンス** (200):
```json
[
  {
    "id": "part-id-uuid",
    "genreId": "genre-id-uuid",
    "unitNumber": "1.1",
    "partNumber": "12345-ABC-001",
    "partName": "Crankshaft",
    "storageCase": "A-001",
    "notes": "予備在庫2個",
    "orderDate": "2025-11-01T00:00:00.000Z",
    "expectedArrivalDate": "2025-11-15T00:00:00.000Z",
    "imageUrl": "https://res.cloudinary.com/xxxxx/image/upload/v123456/part.jpg",
    "createdAt": "2025-11-17T00:00:00.000Z",
    "updatedAt": "2025-11-17T00:00:00.000Z",
    "partMaster": {
      "id": "part-master-id-uuid",
      "partNumber": "12345-ABC-001",
      "stockQuantity": 5,
      "createdAt": "2025-11-17T00:00:00.000Z",
      "updatedAt": "2025-11-17T01:00:00.000Z"
    }
  }
]
```

---

### 13. パーツ作成
**エンドポイント**: `POST /api/admin/parts`
**認証**: 必須

**リクエスト**:
```json
{
  "genreId": "genre-id-uuid",
  "unitNumber": "1.2",
  "partNumber": "12345-ABC-002",
  "partName": "Piston",
  "storageCase": "A-002",
  "notes": "要注意",
  "orderDate": "2025-11-10T00:00:00.000Z",
  "expectedArrivalDate": null,
  "imageUrl": "https://res.cloudinary.com/xxxxx/image/upload/v123456/piston.jpg"
}
```

**レスポンス** (201):
```json
{
  "id": "new-part-id-uuid",
  "genreId": "genre-id-uuid",
  "unitNumber": "1.2",
  "partNumber": "12345-ABC-002",
  "partName": "Piston",
  "storageCase": "A-002",
  "notes": "要注意",
  "orderDate": "2025-11-10T00:00:00.000Z",
  "expectedArrivalDate": null,
  "imageUrl": "https://res.cloudinary.com/xxxxx/image/upload/v123456/piston.jpg",
  "createdAt": "2025-11-17T02:00:00.000Z",
  "updatedAt": "2025-11-17T02:00:00.000Z"
}
```

**エラー** (400):
```json
{
  "error": "Invalid part data"
}
```

---

### 14. パーツ更新
**エンドポイント**: `PUT /api/admin/parts/:id`
**認証**: 必須

**リクエスト**:
```json
{
  "unitNumber": "1.3",
  "partNumber": "12345-ABC-002-REV1",
  "partName": "Piston (Revised)",
  "storageCase": "A-003",
  "notes": "改良版",
  "orderDate": "2025-11-12T00:00:00.000Z",
  "expectedArrivalDate": "2025-11-20T00:00:00.000Z",
  "imageUrl": "https://res.cloudinary.com/xxxxx/image/upload/v123457/piston_rev.jpg"
}
```

**レスポンス** (200):
```json
{
  "id": "part-id-uuid",
  "genreId": "genre-id-uuid",
  "unitNumber": "1.3",
  "partNumber": "12345-ABC-002-REV1",
  "partName": "Piston (Revised)",
  "storageCase": "A-003",
  "notes": "改良版",
  "orderDate": "2025-11-12T00:00:00.000Z",
  "expectedArrivalDate": "2025-11-20T00:00:00.000Z",
  "imageUrl": "https://res.cloudinary.com/xxxxx/image/upload/v123457/piston_rev.jpg",
  "createdAt": "2025-11-17T02:00:00.000Z",
  "updatedAt": "2025-11-17T03:00:00.000Z"
}
```

**エラー** (400):
```json
{
  "error": "Invalid part ID"
}
```

---

### 15. パーツ削除
**エンドポイント**: `DELETE /api/admin/parts/:id`
**認証**: 必須

**レスポンス** (204):
```
（レスポンスボディなし）
```

**エラー** (400):
```json
{
  "error": "Invalid part ID"
}
```

---

### 16. 在庫数更新（同一品番すべて自動反映）
**エンドポイント**: `PUT /api/admin/parts/:partNumber/stock`
**認証**: 必須

**リクエスト**:
```json
{
  "stockQuantity": 10
}
```

**レスポンス** (200):
```json
{
  "id": "part-master-id-uuid",
  "partNumber": "12345-ABC-001",
  "stockQuantity": 10,
  "createdAt": "2025-11-17T00:00:00.000Z",
  "updatedAt": "2025-11-17T03:00:00.000Z"
}
```

**注意**: 同一カテゴリー内の同一品番すべてに自動反映されます

**エラー** (400):
```json
{
  "error": "Invalid stock quantity"
}
```

---

## 検索機能

### 17. 収納ケース番号検索
**エンドポイント**: `GET /api/search/by-storage-case?case={caseNumber}`
**認証**: 不要

**リクエスト例**:
```
GET /api/search/by-storage-case?case=A-001
```

**レスポンス** (200):
```json
[
  {
    "part": {
      "id": "part-id-uuid",
      "genreId": "genre-id-uuid",
      "unitNumber": "1.1",
      "partNumber": "12345-ABC-001",
      "partName": "Crankshaft",
      "storageCase": "A-001",
      "notes": "予備在庫2個",
      "orderDate": "2025-11-01T00:00:00.000Z",
      "expectedArrivalDate": "2025-11-15T00:00:00.000Z",
      "imageUrl": "https://res.cloudinary.com/xxxxx/image/upload/v123456/part.jpg",
      "createdAt": "2025-11-17T00:00:00.000Z",
      "updatedAt": "2025-11-17T00:00:00.000Z",
      "partMaster": {
        "id": "part-master-id-uuid",
        "partNumber": "12345-ABC-001",
        "stockQuantity": 5,
        "createdAt": "2025-11-17T00:00:00.000Z",
        "updatedAt": "2025-11-17T01:00:00.000Z"
      }
    },
    "genre": {
      "id": "genre-id-uuid",
      "categoryId": "category-id-uuid",
      "name": "ENG ASSY",
      "imageUrl": "https://res.cloudinary.com/xxxxx/image/upload/v123456/genre.jpg",
      "order": 1,
      "createdAt": "2025-11-17T00:00:00.000Z",
      "updatedAt": "2025-11-17T00:00:00.000Z"
    },
    "category": {
      "id": "category-id-uuid",
      "name": "GT3-048",
      "order": 1,
      "createdAt": "2025-11-17T00:00:00.000Z",
      "updatedAt": "2025-11-17T00:00:00.000Z"
    }
  }
]
```

**注意**: 全ジャンルを横断検索します

---

### 18. 品番検索
**エンドポイント**: `GET /api/search/by-part-number?partNumber={partNumber}`
**認証**: 不要

**リクエスト例**:
```
GET /api/search/by-part-number?partNumber=12345-ABC-001
```

**レスポンス** (200):
```json
[
  {
    "part": {
      "id": "part-id-uuid",
      "genreId": "genre-id-uuid",
      "unitNumber": "1.1",
      "partNumber": "12345-ABC-001",
      "partName": "Crankshaft",
      "storageCase": "A-001",
      "notes": "予備在庫2個",
      "orderDate": "2025-11-01T00:00:00.000Z",
      "expectedArrivalDate": "2025-11-15T00:00:00.000Z",
      "imageUrl": "https://res.cloudinary.com/xxxxx/image/upload/v123456/part.jpg",
      "createdAt": "2025-11-17T00:00:00.000Z",
      "updatedAt": "2025-11-17T00:00:00.000Z",
      "partMaster": {
        "id": "part-master-id-uuid",
        "partNumber": "12345-ABC-001",
        "stockQuantity": 5,
        "createdAt": "2025-11-17T00:00:00.000Z",
        "updatedAt": "2025-11-17T01:00:00.000Z"
      }
    },
    "genre": {
      "id": "genre-id-uuid",
      "categoryId": "category-id-uuid",
      "name": "ENG ASSY",
      "imageUrl": "https://res.cloudinary.com/xxxxx/image/upload/v123456/genre.jpg",
      "order": 1,
      "createdAt": "2025-11-17T00:00:00.000Z",
      "updatedAt": "2025-11-17T00:00:00.000Z"
    },
    "category": {
      "id": "category-id-uuid",
      "name": "GT3-048",
      "order": 1,
      "createdAt": "2025-11-17T00:00:00.000Z",
      "updatedAt": "2025-11-17T00:00:00.000Z"
    }
  }
]
```

**注意**:
- 全ジャンルを横断検索します
- 複数ジャンルで使用されている場合はすべて表示します

---

## 統計機能

### 19. 統計情報取得
**エンドポイント**: `GET /api/admin/stats`
**認証**: 必須

**レスポンス** (200):
```json
{
  "categoriesCount": 5,
  "genresCount": 23,
  "partsCount": 456,
  "totalStock": 1234
}
```

**注意**: 管理ダッシュボードの概要表示に使用

---

## エクスポート/インポート

### 20. CSVエクスポート
**エンドポイント**: `GET /api/admin/genres/:id/export/csv`
**認証**: 必須

**レスポンス** (200):
```csv
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="parts_ENG_ASSY_20251117.csv"

リスト内番号,品番,品名,収納ケース番号,在庫数,備考,発注日,入荷予定日
1.1,12345-ABC-001,Crankshaft,A-001,5,予備在庫2個,2025-11-01,2025-11-15
1.2,12345-ABC-002,Piston,A-002,10,要注意,2025-11-10,
```

**注意**: UTF-8 BOM付きで出力（Excel互換）

---

### 21. PDFエクスポート
**エンドポイント**: `GET /api/admin/genres/:id/export/pdf`
**認証**: 必須

**レスポンス** (200):
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="parts_ENG_ASSY_20251117.pdf"

（バイナリデータ）
```

**注意**:
- 展開図（1ページ目）+ パーツ一覧表（2ページ目以降）
- 展開図がない場合は一覧表のみ

---

### 22. CSVインポート
**エンドポイント**: `POST /api/admin/genres/:id/import/csv`
**認証**: 必須

**リクエスト**:
```
Content-Type: multipart/form-data

file: （CSVファイル）
```

**CSVフォーマット例**:
```csv
リスト内番号,品番,品名,収納ケース番号,在庫数,備考,発注日,入荷予定日
1.1,12345-ABC-001,Crankshaft,A-001,5,予備在庫2個,2025-11-01,2025-11-15
1.2,12345-ABC-002,Piston,A-002,10,要注意,2025-11-10,
```

**レスポンス** (200):
```json
{
  "success": true,
  "imported": 50,
  "failed": 0
}
```

**注意**:
- 最大1000行まで
- 既存データはすべて削除されます（要注意）
- エラー行があっても可能な限りインポート続行

**エラー** (400):
```json
{
  "error": "CSV file required"
}
```

---

## 画像管理

### 23. 画像アップロード
**エンドポイント**: `POST /api/admin/images/upload`
**認証**: 必須

**リクエスト**:
```
Content-Type: multipart/form-data

image: （画像ファイル）
```

**レスポンス** (200):
```json
{
  "imageUrl": "https://res.cloudinary.com/xxxxx/image/upload/v123456/uploaded.jpg",
  "publicId": "xxxxx/uploaded"
}
```

**注意**:
- 対応形式: JPG, PNG, SVG, PDF
- 最大サイズ: 5MB（画像）、10MB（PDF）
- Cloudinaryに保存

**エラー** (400):
```json
{
  "error": "Image file required"
}
```

**エラー** (413):
```json
{
  "error": "File too large (max 5MB for images, 10MB for PDFs)"
}
```

---

### 24. 画像削除
**エンドポイント**: `DELETE /api/admin/images/:id`
**認証**: 必須

**レスポンス** (204):
```
（レスポンスボディなし）
```

**注意**: Cloudinaryからも削除されます

**エラー** (400):
```json
{
  "error": "Invalid image ID"
}
```

---

## アカウント設定

### 25. メールアドレス変更
**エンドポイント**: `PUT /api/admin/account/email`
**認証**: 必須

**リクエスト**:
```json
{
  "newEmail": "new-admin@inventory-system.local",
  "currentPassword": "InventoryAdmin2025!"
}
```

**レスポンス** (200):
```json
{
  "success": true,
  "admin": {
    "id": "admin-id-uuid",
    "email": "new-admin@inventory-system.local"
  }
}
```

**エラー** (400):
```json
{
  "error": "Invalid email format"
}
```

**エラー** (401):
```json
{
  "error": "Invalid current password"
}
```

---

### 26. パスワード変更
**エンドポイント**: `PUT /api/admin/account/password`
**認証**: 必須

**リクエスト**:
```json
{
  "currentPassword": "InventoryAdmin2025!",
  "newPassword": "NewPassword2025!"
}
```

**レスポンス** (200):
```json
{
  "success": true
}
```

**エラー** (400):
```json
{
  "error": "New password must be at least 8 characters"
}
```

**エラー** (401):
```json
{
  "error": "Invalid current password"
}
```

---

## CORS設定

**許可オリジン**: `http://localhost:3589`（開発環境）
**Credentials**: `true`（セッションCookie送信必須）
**許可メソッド**: GET, POST, PUT, DELETE
**許可ヘッダー**: Content-Type, Authorization

**フロントエンド設定例**:
```typescript
fetch('http://localhost:8763/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // 重要: セッションCookie送信
  body: JSON.stringify({ email, password }),
});
```

---

## エラーコード

| コード | 意味 | 例 |
|--------|------|-----|
| 200 | 成功 | データ取得成功 |
| 201 | 作成成功 | リソース作成成功 |
| 204 | 成功（レスポンスなし） | 削除成功 |
| 400 | リクエストエラー | バリデーションエラー、不正なデータ |
| 401 | 認証エラー | 未ログイン、パスワード不一致 |
| 404 | Not Found | リソースが存在しない |
| 409 | 競合 | 重複データ（カテゴリー名、ジャンル名） |
| 413 | ファイルサイズ超過 | 画像アップロード時 |
| 500 | サーバーエラー | 内部エラー、データベースエラー |

---

## 補足情報

### セッション管理
- **有効期限**: 7日間
- **Cookie名**: `connect.sid`（デフォルト）
- **httpOnly**: `true`（XSS対策）
- **secure**: 本番環境のみ `true`（HTTPS必須）
- **sameSite**: `lax`（CSRF対策）

### 在庫数同期
- **PartMasterテーブル**: 品番ごとの在庫数を一元管理
- **同期方法**: PUT `/api/admin/parts/:partNumber/stock` で更新
- **自動反映**: 同一カテゴリー内の同一品番すべてに即座に反映
- **別カテゴリー**: 影響なし（独立管理）

### 画像管理（Cloudinary）
- **保存先**: Cloudinary（無料プラン: 25GB）
- **画像種類**: ジャンル画像、展開図、パーツ画像
- **自動削除**: 画像差し替え時に古い画像を自動削除
- **最適化**: Cloudinaryが自動で最適化（WebP変換など）

### CSVインポート
- **最大行数**: 1000行
- **エンコーディング**: UTF-8 BOM必須（Excel互換）
- **日付形式**: YYYY-MM-DD
- **エラーハンドリング**: エラー行があっても可能な限りインポート続行

### トランザクション
- **在庫数更新**: PartMaster更新時にトランザクション使用
- **CSV一括インポート**: 複数パーツ作成 + PartMaster更新をトランザクション化
- **ジャンル削除**: 関連パーツ・展開図も一括削除（カスケード）

---

**ドキュメント作成日**: 2025-11-17
**作成者**: AI Assistant
**バージョン**: 1.0.0
