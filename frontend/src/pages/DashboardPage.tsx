import { useNavigate } from 'react-router-dom';
import { Box, Typography, Grid, Card, CardContent, Container, Paper } from '@mui/material';
import {
  FolderOpen,
  Category,
  Build,
  Inventory,
  Settings,
  AccountCircle,
} from '@mui/icons-material';
import { MainLayout } from '@/layouts/MainLayout';

// ============================================================
// DashboardPage (A-001)
// ============================================================
// 管理ダッシュボード
// - 統計表示（カテゴリー数、ジャンル数、パーツ総数、在庫総数）
// - クイックアクセスボタン（各管理ページへのリンク）
// ============================================================

// TODO: バックエンド実装後、APIから統計データを取得
const MOCK_STATS = {
  categoriesCount: 4,
  genresCount: 12,
  partsCount: 156,
  totalStock: 842,
};

// クイックアクセスボタン定義
const QUICK_ACCESS_ITEMS = [
  {
    label: 'カテゴリー管理',
    icon: FolderOpen,
    path: '/admin/categories',
    color: '#1976d2',
    description: 'カテゴリーの追加・編集・削除',
  },
  {
    label: 'ジャンル管理',
    icon: Category,
    path: '/admin/genres',
    color: '#2e7d32',
    description: 'ジャンルの追加・編集・画像管理',
  },
  {
    label: 'パーツリスト管理',
    icon: Build,
    path: '/admin/parts/categories',
    color: '#ed6c02',
    description: 'パーツの追加・編集・CSV/PDF出力',
  },
  {
    label: '表示設定',
    icon: Settings,
    path: '/admin/display-settings',
    color: '#9c27b0',
    description: '画像表示のカスタマイズ',
  },
  {
    label: 'アカウント設定',
    icon: AccountCircle,
    path: '/admin/account-settings',
    color: '#d32f2f',
    description: 'ID・パスワード変更',
  },
];

export const DashboardPage = () => {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <Container maxWidth="lg">
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
            管理ダッシュボード
          </Typography>
          <Typography variant="body2" color="text.secondary">
            システム全体の状況を確認し、各管理機能にアクセスできます
          </Typography>
        </Box>

        {/* 統計カード */}
        <Grid container spacing={3} sx={{ mb: 5 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: '#e3f2fd',
                height: '100%',
              }}
            >
              <FolderOpen sx={{ fontSize: 48, color: '#1976d2', mb: 1 }} />
              <Typography variant="h3" sx={{ fontWeight: 600, color: '#1976d2' }}>
                {MOCK_STATS.categoriesCount}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                カテゴリー数
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: '#e8f5e9',
                height: '100%',
              }}
            >
              <Category sx={{ fontSize: 48, color: '#2e7d32', mb: 1 }} />
              <Typography variant="h3" sx={{ fontWeight: 600, color: '#2e7d32' }}>
                {MOCK_STATS.genresCount}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                ジャンル数
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: '#fff3e0',
                height: '100%',
              }}
            >
              <Build sx={{ fontSize: 48, color: '#ed6c02', mb: 1 }} />
              <Typography variant="h3" sx={{ fontWeight: 600, color: '#ed6c02' }}>
                {MOCK_STATS.partsCount.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                パーツ総数
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: '#f3e5f5',
                height: '100%',
              }}
            >
              <Inventory sx={{ fontSize: 48, color: '#9c27b0', mb: 1 }} />
              <Typography variant="h3" sx={{ fontWeight: 600, color: '#9c27b0' }}>
                {MOCK_STATS.totalStock.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                在庫総数
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* クイックアクセスボタン */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
            クイックアクセス
          </Typography>
          <Typography variant="body2" color="text.secondary">
            各管理機能へ素早くアクセスできます
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {QUICK_ACCESS_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Grid item xs={12} sm={6} md={4} key={item.label}>
                <Card
                  elevation={2}
                  sx={{
                    height: '100%',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4,
                    },
                  }}
                  onClick={() => navigate(item.path)}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        mb: 2,
                      }}
                    >
                      <Icon sx={{ fontSize: 40, color: item.color, mr: 2 }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {item.label}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {item.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Container>
    </MainLayout>
  );
};
