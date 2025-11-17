# MUIテーマ設定

## 概要

このディレクトリには、階層型在庫管理システムのMUI v6テーマ設定が含まれています。

**選択されたテーマ**: テーマ1 - プロフェッショナル（ダークブルー基調）

## ファイル構成

```
src/theme/
├── index.ts        # メインテーマファイル（createTheme統合）
├── palette.ts      # カラーパレット定義
├── typography.ts   # タイポグラフィ設定
├── components.ts   # コンポーネントスタイル上書き
└── README.md       # このファイル
```

## 使い方

### 1. アプリケーション全体に適用

`src/main.tsx` または `src/App.tsx` でテーマをインポートし、`ThemeProvider`でラップします。

```tsx
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {/* アプリケーションのコンポーネント */}
    </ThemeProvider>
  );
}
```

### 2. コンポーネント内でテーマを使用

```tsx
import { useTheme } from '@mui/material/styles';
import { Box, Typography, Button } from '@mui/material';

function MyComponent() {
  const theme = useTheme();

  return (
    <Box sx={{ backgroundColor: theme.palette.background.default, p: 3 }}>
      <Typography variant="h4" color="primary">
        見出し
      </Typography>
      <Button variant="contained" color="primary">
        ボタン
      </Button>
    </Box>
  );
}
```

## テーマの特徴

### カラーパレット

| 色の種類 | カラーコード | 用途 |
|---------|-------------|------|
| Primary Main | `#1976d2` | メインカラー（ボタン、リンク等） |
| Primary Dark | `#1565c0` | ホバー、アクティブ状態 |
| Primary Light | `#42a5f5` | 背景、軽い強調 |
| Secondary Main | `#283593` | サブカラー |
| Background Default | `#f5f5f5` | メインコンテンツ背景 |
| Background Paper | `#ffffff` | カード、モーダル背景 |
| Text Primary | `#212121` | メインテキスト |
| Text Secondary | `#757575` | サブテキスト |

### タイポグラフィ

- **フォントファミリー**: システムフォント（macOS、Windows、日本語対応）
- **見出し**: h1（40px）〜 h6（18px）、fontWeight: 600
- **本文**: body1（16px）、body2（14px）、lineHeight: 1.6
- **ボタン**: 14px、fontWeight: 600、textTransform: 'none'（日本語対応）

### コンポーネントスタイル

#### 統一された角丸デザイン
- **Button**: 8px
- **Card**: 12px
- **Dialog**: 16px

#### カスタマイズされたコンポーネント
- Button（影なし、ホバー時に軽い影）
- Card（軽い影、ホバー時に強調）
- TextField（アウトライン、8px角丸）
- Alert（カスタムカラー）
- Tabs（太いインジケーター）
- その他20以上のコンポーネント

## カスタマイズ

テーマの一部を変更したい場合は、該当するファイルを編集してください。

### 例: プライマリーカラーを変更

`src/theme/palette.ts` を編集：

```typescript
primary: {
  main: '#1976d2',  // <- この値を変更
  dark: '#1565c0',
  light: '#42a5f5',
  contrastText: '#ffffff',
},
```

### 例: ボタンの角丸を変更

`src/theme/components.ts` を編集：

```typescript
MuiButton: {
  styleOverrides: {
    root: {
      borderRadius: 8,  // <- この値を変更
      // ...
    },
  },
},
```

## TypeScript対応

すべてのファイルは完全なTypeScript対応で、型安全性が保証されています。

- `PaletteOptions` 型を使用
- `ThemeOptions['typography']` 型を使用
- `Components<Theme>` 型を使用

## レスポンシブ対応

ブレークポイント:
- xs: 0px
- sm: 600px
- md: 900px
- lg: 1200px
- xl: 1536px

使用例:

```tsx
<Box
  sx={{
    width: { xs: '100%', sm: '80%', md: '60%' },
    padding: { xs: 2, sm: 3, md: 4 },
  }}
>
  {/* コンテンツ */}
</Box>
```

## トランジション設定

滑らかなアニメーションのために、統一されたトランジション設定を提供しています。

- standard: 300ms
- short: 250ms
- shortest: 150ms
- easing: cubic-bezier関数

## 参考リンク

- [MUI v6 公式ドキュメント](https://mui.com/material-ui/customization/theming/)
- [MUI カラーパレット](https://mui.com/material-ui/customization/palette/)
- [MUI タイポグラフィ](https://mui.com/material-ui/customization/typography/)
- [MUI コンポーネント](https://mui.com/material-ui/customization/how-to-customize/)
