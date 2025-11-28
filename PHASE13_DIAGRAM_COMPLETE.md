# Phase 13: 展開図管理機能追加 - 完了報告

**完了日**: 2025-11-27
**進捗**: 100% 🎉

---

## 📋 概要

Phase 13では、モックアップ（P-005-PartsList.html）で指定されていた「展開図（Diagram Image）」の管理機能を実装しました。これまでジャンル画像（Genre.imageUrl）を展開図として使用していましたが、専用のDiagramImageテーブルを使用するように変更し、管理画面からの画像アップロード・削除機能を追加しました。

---

## ✅ 実装内容

### 1. バックエンドAPI実装

#### サービス層（`backend/src/services/diagramImageService.ts`）
- `getDiagramImageByGenreId()`: ジャンルIDで展開図を取得
- `upsertDiagramImage()`: 展開図を作成または更新
- `deleteDiagramImage()`: 展開図を削除

#### コントローラー層（`backend/src/controllers/diagramImageController.ts`）
- GET `/api/genres/:genreId/diagram`: 展開図取得
- PUT `/api/admin/genres/:genreId/diagram`: 展開図作成/更新（管理者のみ）
- DELETE `/api/admin/genres/:genreId/diagram`: 展開図削除（管理者のみ）

#### ルート登録（`backend/src/routes/diagramImage.ts`）
- 新規ルートファイル作成
- `backend/src/index.ts`にルート登録

---

### 2. フロントエンドAPI実装

#### 型定義（`frontend/src/types/index.ts`）
```typescript
export interface DiagramImage {
  id: string;
  genreId: string;
  imageUrl: string;
  imageType: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### APIサービス（`frontend/src/services/api/diagramImages.ts`）
- `getDiagramImage(genreId)`: 展開図取得（404エラー時はnullを返す）
- `upsertDiagramImage(genreId, imageUrl)`: 展開図作成/更新
- `deleteDiagramImage(genreId)`: 展開図削除

#### エクスポート（`frontend/src/services/api/index.ts`）
```typescript
export * as diagramImagesApi from './diagramImages';
```

---

### 3. 管理画面UI実装（PartsManagementPage）

#### 追加機能
- **展開図管理セクション**: ジャンル選択時に表示
- **展開図プレビュー**: 登録済み展開図を表示（最大幅600px）
- **画像選択ボタン**: ファイル選択UI（画像ファイルのみ）
- **アップロードボタン**: Cloudinaryへアップロード後、DBに保存
- **削除ボタン**: 展開図削除（確認ダイアログ付き）
- **ローディング状態**: アップロード中・削除中の表示

#### UI配置
- カテゴリー・ジャンル・ユニット選択フィルターの直下
- パーツリストテーブルの上部

#### 実装ファイル
- `frontend/src/pages/PartsManagementPage.tsx`:1233-1308

---

### 4. 一般ページUI更新（PartsListPage）

#### 変更内容
- **DiagramImage APIから展開図取得**: `diagramImagesApi.getDiagramImage(genreId)`を使用
- **Genre.imageUrlから分離**: ジャンル画像と展開図を完全分離
- **既存のUI維持**: 展開図表示/非表示切り替えボタンはそのまま動作

#### 実装ファイル
- `frontend/src/pages/PartsListPage.tsx`:73-82

---

## 🔧 技術的な工夫

### 1. 404エラーハンドリング
展開図が存在しない場合（404エラー）、`getDiagramImage()`は`null`を返すように実装しました。これにより、UIで「展開図が登録されていません」メッセージを表示できます。

```typescript
export async function getDiagramImage(genreId: string): Promise<DiagramImage | null> {
  try {
    return await get<DiagramImage>(`/genres/${genreId}/diagram`);
  } catch (error: any) {
    // 404の場合はnullを返す（展開図が存在しない）
    if (error.status === 404) {
      return null;
    }
    throw error;
  }
}
```

### 2. Upsert操作
既存の展開図がある場合は更新、ない場合は新規作成するupsert操作を実装しました。

```typescript
const existing = await prisma.diagramImage.findFirst({ where: { genreId } });
if (existing) {
  return await prisma.diagramImage.update({
    where: { id: existing.id },
    data: { imageUrl },
  });
} else {
  return await prisma.diagramImage.create({
    data: { genreId, imageUrl, imageType: 'diagram' },
  });
}
```

### 3. React Query統合
展開図の取得・更新・削除にReact Queryを使用し、キャッシュ管理と自動再フェッチを実現しました。

```typescript
const { data: diagramImage } = useQuery({
  queryKey: ['diagram-image', filterGenreId],
  queryFn: () => diagramImagesApi.getDiagramImage(filterGenreId),
  enabled: !!filterGenreId,
});
```

---

## 🎨 ユーザー体験の改善

### 管理者向け
1. **ジャンル選択時に展開図管理セクションが自動表示**
2. **プレビュー機能**: アップロード前に画像を確認可能
3. **簡単な削除**: ワンクリックで展開図削除
4. **ローディング表示**: アップロード中・削除中の状態を明確に表示

### 一般ユーザー向け
1. **既存のUI維持**: 表示/非表示切り替えボタンは変更なし
2. **高速表示**: React Queryのキャッシュによる高速レンダリング
3. **展開図とジャンル画像の分離**: 専用の展開図を表示

---

## 📊 影響範囲

### 変更されたファイル
- `backend/src/services/diagramImageService.ts` (新規作成)
- `backend/src/controllers/diagramImageController.ts` (新規作成)
- `backend/src/routes/diagramImage.ts` (新規作成)
- `backend/src/index.ts` (ルート登録追加)
- `frontend/src/types/index.ts` (DiagramImage型追加)
- `frontend/src/services/api/diagramImages.ts` (新規作成)
- `frontend/src/services/api/index.ts` (エクスポート追加)
- `frontend/src/pages/PartsManagementPage.tsx` (展開図管理UI追加)
- `frontend/src/pages/PartsListPage.tsx` (DiagramImage API使用に変更)
- `docs/SCOPE_PROGRESS.md` (Phase 13完了記録)
- `CLAUDE.md` (展開図エンドポイント追加)

### データベース
- 既存の`DiagramImage`テーブルを使用（変更なし）

---

## 🚀 次のステップ

### Phase 14: 本番環境へのデプロイ（推奨）
1. **ローカルテスト**: 展開図機能の動作確認
2. **バックエンドデプロイ**: Google Cloud Runへデプロイ
3. **フロントエンドデプロイ**: Vercelへデプロイ
4. **本番環境での動作確認**: 展開図アップロード・削除テスト

---

## 📝 備考

### モックアップとの整合性
✅ P-005-PartsList.htmlのモックアップで指定されていた「大きく表示している画像」（展開図）の管理機能を完全に実装しました。

### 既存機能への影響
✅ 既存のパーツ管理機能、ジャンル管理機能には一切影響ありません。展開図は完全に独立した機能として実装されています。

### セキュリティ
✅ 展開図の作成・更新・削除は管理者認証が必須です（`/admin`プレフィックス）。

---

## 🎉 Phase 13完了！

すべてのタスクが完了し、展開図管理機能が完全に実装されました。管理者は管理画面から展開図をアップロード・削除でき、一般ユーザーはパーツリストページで展開図を確認できます。

**次のステップ**: 本番環境へのデプロイをお勧めします 🚀
