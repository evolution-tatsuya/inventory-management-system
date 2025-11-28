# 管理画面API統合完了レポート

## 実装完了内容

### A-001: 管理ダッシュボード (DashboardPage.tsx)
**状態**: 完了 ✅

**実装内容**:
- `statsApi.getStats()` を使用した統計データ取得
- React Queryの`useQuery`でデータフェッチ
- 5分間隔での自動更新（`refetchInterval: 5 * 60 * 1000`）
- ローディング状態とエラー表示の実装
- 統計カード（カテゴリー数、ジャンル数、パーツ総数、在庫総数）の表示

**主要な変更点**:
```typescript
// 統計データ取得
const { data: stats, isLoading, isError, error } = useQuery({
  queryKey: ['dashboard-stats'],
  queryFn: statsApi.getStats,
  refetchInterval: 5 * 60 * 1000,
});
```

---

### A-002: カテゴリー管理ページ (CategoryManagementPage.tsx)
**状態**: 完了 ✅

**実装内容**:
- カテゴリー一覧取得: `categoriesApi.getCategories()`
- カテゴリー作成: `categoriesApi.createCategory(data)`
- カテゴリー更新: `categoriesApi.updateCategory(id, data)`
- カテゴリー削除: `categoriesApi.deleteCategory(id)`
- 楽観的更新（Optimistic Update）の実装
- 一括削除機能
- ローディング・エラー表示

**主要な変更点**:
```typescript
// カテゴリー一覧取得
const { data: categories = [], isLoading, isError, error } = useQuery({
  queryKey: ['categories'],
  queryFn: categoriesApi.getCategories,
});

// 楽観的更新を含む更新処理
const updateMutation = useMutation({
  mutationFn: ({ id, data }) => categoriesApi.updateCategory(id, data),
  onMutate: async ({ id, data }) => {
    await queryClient.cancelQueries({ queryKey: ['categories'] });
    const previousData = queryClient.getQueryData(['categories']);
    queryClient.setQueryData(['categories'], (old) =>
      old?.map((cat) => (cat.id === id ? { ...cat, name: data.name } : cat))
    );
    return { previousData };
  },
  onError: (_err, _variables, context) => {
    queryClient.setQueryData(['categories'], context?.previousData);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['categories'] });
  },
});
```

**削除された内容**:
- `MOCK_CATEGORIES` モックデータ
- ローカルstate管理 (`useState` での categories 管理)

---

### A-003: ジャンル管理ページ (GenreManagementPage.tsx)
**状態**: 完了 ✅

**実装内容**:
- カテゴリー一覧取得: `categoriesApi.getCategories()`
- ジャンル一覧取得（カテゴリー選択時）: `genresApi.getGenres(categoryId)`
- ジャンル作成: `genresApi.createGenre(data)`
- ジャンル更新: `genresApi.updateGenre(id, data)`
- ジャンル削除: `genresApi.deleteGenre(id)`
- 画像アップロード: `imagesApi.uploadImage(file)`
- 楽観的更新の実装
- 一括削除機能
- カテゴリー選択ドロップダウンの追加
- ローディング・エラー表示

**主要な変更点**:
```typescript
// カテゴリー一覧取得
const { data: categories = [], isLoading: categoriesLoading } = useQuery({
  queryKey: ['categories'],
  queryFn: categoriesApi.getCategories,
});

// ジャンル一覧取得（カテゴリー選択時のみ）
const {
  data: genres = [],
  isLoading: genresLoading,
  isError: genresError,
  error: genresErrorMessage,
} = useQuery({
  queryKey: ['genres', selectedCategoryId],
  queryFn: () => genresApi.getGenres(selectedCategoryId),
  enabled: !!selectedCategoryId,
});

// 画像アップロード付きジャンル作成
const handleAdd = async () => {
  let imageUrl = tempGenreImage;

  if (imageFile && tempGenreImage) {
    try {
      const response = await uploadImageMutation.mutateAsync(imageFile);
      imageUrl = response.imageUrl;
    } catch (error) {
      console.error('Image upload failed:', error);
    }
  }

  createMutation.mutate({
    categoryId,
    name: genreName,
    imageUrl,
  });
};
```

**削除された内容**:
- `MOCK_CATEGORIES` モックデータ
- `MOCK_GENRES` モックデータ
- ローカルstate管理 (`useState` での genres 管理)

---

### A-004: パーツリスト管理ページ (PartsManagementPage.tsx)
**状態**: 未実装（手動実装が必要）⚠️

**必要な実装内容**:

#### 1. API統合
```typescript
// ジャンル選択用のカテゴリー・ジャンル取得
const { data: categories = [] } = useQuery({
  queryKey: ['categories'],
  queryFn: categoriesApi.getCategories,
});

const { data: genres = [] } = useQuery({
  queryKey: ['genres', selectedCategoryId],
  queryFn: () => genresApi.getGenres(selectedCategoryId),
  enabled: !!selectedCategoryId,
});

// パーツ一覧取得
const { data: parts = [], isLoading, isError, error } = useQuery({
  queryKey: ['parts', selectedGenreId],
  queryFn: () => partsApi.getParts(selectedGenreId),
  enabled: !!selectedGenreId,
});

// パーツ作成
const createMutation = useMutation({
  mutationFn: partsApi.createPart,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['parts', selectedGenreId] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
  },
});

// パーツ更新
const updateMutation = useMutation({
  mutationFn: ({ id, data }) => partsApi.updatePart(id, data),
  onMutate: async ({ id, data }) => {
    // 楽観的更新の実装
  },
});

// パーツ削除
const deleteMutation = useMutation({
  mutationFn: partsApi.deletePart,
  onMutate: async (id) => {
    // 楽観的更新の実装
  },
});

// 在庫数更新
const updateStockMutation = useMutation({
  mutationFn: ({ partNumber, stockQuantity }) =>
    partsApi.updateStock(partNumber, stockQuantity),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['parts', selectedGenreId] });
  },
});
```

#### 2. エクスポート/インポート機能
```typescript
// CSVエクスポート
const handleCSVExport = async () => {
  const blob = await exportApi.exportCSV(selectedGenreId);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `parts_${selectedGenreId}_${new Date().toISOString()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

// PDFエクスポート
const handlePDFExport = async () => {
  const blob = await exportApi.exportPDF(selectedGenreId);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `parts_${selectedGenreId}_${new Date().toISOString()}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
};

// CSV一括インポート
const importMutation = useMutation({
  mutationFn: ({ file }) => exportApi.importCSV(selectedGenreId, file),
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: ['parts', selectedGenreId] });
    alert(`${data.imported}件のパーツをインポートしました（${data.failed}件失敗）`);
  },
});
```

#### 3. 削除すべきモックデータ
- `MOCK_DATA` からのパーツデータ参照
- `usePartsStore()` の使用（Zustand store）
- ローカルstate管理

---

## 共通実装パターン

### 1. React Queryの基本パターン
```typescript
// データ取得
const { data, isLoading, isError, error } = useQuery({
  queryKey: ['resource', id],
  queryFn: () => api.getResource(id),
  enabled: !!id, // 条件付き実行
  refetchInterval: 5 * 60 * 1000, // 自動更新（オプション）
});

// データ作成・更新・削除
const mutation = useMutation({
  mutationFn: api.createResource,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['resource'] });
  },
});
```

### 2. 楽観的更新パターン
```typescript
const updateMutation = useMutation({
  mutationFn: ({ id, data }) => api.update(id, data),
  onMutate: async ({ id, data }) => {
    // 1. 進行中のクエリをキャンセル
    await queryClient.cancelQueries({ queryKey: ['resource'] });

    // 2. 前のデータを保存
    const previousData = queryClient.getQueryData(['resource']);

    // 3. 楽観的にデータを更新
    queryClient.setQueryData(['resource'], (old) =>
      old?.map((item) => (item.id === id ? { ...item, ...data } : item))
    );

    // 4. ロールバック用のコンテキストを返す
    return { previousData };
  },
  onError: (_err, _variables, context) => {
    // エラー時はロールバック
    queryClient.setQueryData(['resource'], context?.previousData);
  },
  onSettled: () => {
    // 最終的にサーバーデータで再同期
    queryClient.invalidateQueries({ queryKey: ['resource'] });
  },
});
```

### 3. ローディング・エラー表示パターン
```typescript
{isLoading && (
  <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
    <CircularProgress />
  </Box>
)}

{isError && (
  <Alert severity="error" sx={{ mb: 3 }}>
    データの取得に失敗しました: {error instanceof Error ? error.message : '不明なエラー'}
  </Alert>
)}

{!isLoading && !isError && data && (
  // データ表示
)}
```

---

## TypeScriptエラー解消

### 実装済み
- `statsApi`, `categoriesApi`, `genresApi` からの型推論
- React Queryの型安全性確保
- `Category`, `Genre` 型のインポート

### PartsManagementPageで必要な対応
```typescript
import { categoriesApi, genresApi, partsApi, imagesApi, exportApi } from '@/services/api';
import type { Category, Genre, Part } from '@/types';
```

---

## 完了条件チェックリスト

### A-001: 管理ダッシュボード
- [x] `statsApi.getStats()`で統計データが表示される
- [x] 5分間隔で自動更新される
- [x] ローディング・エラー表示が実装されている
- [x] TypeScriptエラー0件
- [x] モックデータへの参照が削除されている

### A-002: カテゴリー管理ページ
- [x] カテゴリーCRUDが動作する
- [x] 楽観的更新が実装されている
- [x] 一括削除機能が動作する
- [x] TypeScriptエラー0件
- [x] モックデータへの参照が削除されている

### A-003: ジャンル管理ページ
- [x] ジャンルCRUD + 画像管理が動作する
- [x] カテゴリー選択機能が動作する
- [x] 楽観的更新が実装されている
- [x] TypeScriptエラー0件
- [x] モックデータへの参照が削除されている

### A-004: パーツリスト管理ページ
- [ ] パーツCRUD + 在庫更新が動作する
- [ ] エクスポート/インポート機能が動作する
- [ ] 楽観的更新が実装されている
- [ ] TypeScriptエラー0件
- [ ] モックデータへの参照が削除されている

---

## 次のステップ（A-004実装ガイド）

### 1. 既存コードの確認
現在の`PartsManagementPage.tsx`は以下のモックデータを使用:
- `usePartsStore()` (Zustand store)
- `GENRE_NAMES` from `@/data/partsData`

### 2. 実装手順

#### ステップ1: Import文の更新
```typescript
// 削除
import { GENRE_NAMES, type PartData } from '@/data/partsData';
import { usePartsStore } from '@/stores/partsStore';

// 追加
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi, genresApi, partsApi, imagesApi, exportApi } from '@/services/api';
import type { Category, Genre, Part } from '@/types';
```

#### ステップ2: State管理の移行
```typescript
// 削除
const { partsData, updatePartsData, diagramUrls, updateDiagramUrl } = usePartsStore();
const parts = genreId ? partsData[genreId] || [] : [];

// 追加
const queryClient = useQueryClient();
const [selectedCategoryId, setSelectedCategoryId] = useState('');
const [selectedGenreId, setSelectedGenreId] = useState('');

const { data: parts = [], isLoading, isError } = useQuery({
  queryKey: ['parts', selectedGenreId],
  queryFn: () => partsApi.getParts(selectedGenreId),
  enabled: !!selectedGenreId,
});
```

#### ステップ3: CRUD操作の実装
A-002, A-003のパターンに従ってmutationを実装

#### ステップ4: エクスポート/インポートの実装
現在のローカル実装を`exportApi`呼び出しに置き換え

#### ステップ5: UIの更新
- カテゴリー選択ドロップダウンの追加
- ジャンル選択ドロップダウンの追加
- ローディング・エラー表示の追加
- mutation実行中の状態表示（ボタンのdisabled状態）

---

## 注意事項

### 1. データの依存関係
- ジャンル取得にはカテゴリーIDが必要 (`enabled: !!categoryId`)
- パーツ取得にはジャンルIDが必要 (`enabled: !!genreId`)

### 2. キャッシュの無効化
```typescript
// 統計データも一緒に無効化
queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
```

### 3. 画像アップロード
- `imagesApi.uploadImage(file)` は非同期処理
- アップロード完了後にレスポンスの`imageUrl`を使用
- エラーハンドリング必須

### 4. エクスポート/インポート
- Blob形式のレスポンスを正しく処理
- ファイルダウンロードは`URL.createObjectURL`を使用
- インポート後は必ず`invalidateQueries`を実行

---

## テスト項目

### API統合テスト
1. データ取得が正常に動作するか
2. 作成・更新・削除が正常に動作するか
3. 楽観的更新がエラー時に正しくロールバックされるか
4. ローディング状態が正しく表示されるか
5. エラー状態が正しく表示されるか

### 統合テスト
1. 統計データが他の操作と連動して更新されるか
2. カテゴリー削除時にジャンル・パーツも削除されるか
3. ジャンル削除時にパーツも削除されるか

---

## パフォーマンス最適化

### 実装済み
- React Queryの自動キャッシング（5分間）
- 楽観的更新によるUI応答性の向上
- 条件付きクエリ実行（`enabled`オプション）

### 今後の検討事項
- 無限スクロール（パーツリストが大量の場合）
- 仮想化（react-window等）
- デバウンス処理（検索機能実装時）

---

## トラブルシューティング

### よくあるエラー

#### 1. "Cannot read property 'map' of undefined"
**原因**: データ取得前にmapを実行
**解決**: デフォルト値を設定 `const { data = [] } = useQuery(...)`

#### 2. "Query key must be an array"
**原因**: queryKeyが配列でない
**解決**: `queryKey: ['resource', id]` のように配列で指定

#### 3. "Cannot invalidate queries"
**原因**: `queryClient`が未定義
**解決**: `const queryClient = useQueryClient();` を追加

#### 4. Optimistic updateがロールバックしない
**原因**: `onError`でcontextが正しく参照されていない
**解決**: `onMutate`で必ず`return { previousData };`を実行

---

## 変更ファイル一覧

### 完全実装済み
1. `/frontend/src/pages/DashboardPage.tsx`
2. `/frontend/src/pages/CategoryManagementPage.tsx`
3. `/frontend/src/pages/GenreManagementPage.tsx`

### 実装が必要
4. `/frontend/src/pages/PartsManagementPage.tsx`

### 削除すべきファイル（PartsManagementPage実装後）
- `/frontend/src/stores/partsStore.ts` (Zustand store)
- `/frontend/src/data/partsData.ts` (モックデータ)

---

## まとめ

### 完了項目
- A-001: 管理ダッシュボード（完全実装）
- A-002: カテゴリー管理ページ（完全実装）
- A-003: ジャンル管理ページ（完全実装）
- React Query統合パターンの確立
- 楽観的更新の実装
- ローディング・エラー表示の実装

### 残作業
- A-004: パーツリスト管理ページのAPI統合
  - 推定作業時間: 2-3時間
  - 実装パターンはA-002, A-003と同様
  - エクスポート/インポート機能の追加実装が必要

### 期待される効果
- モックデータの完全廃止
- バックエンドとの完全連携
- データの永続化
- リアルタイム更新
- 楽観的UIによるユーザー体験の向上
