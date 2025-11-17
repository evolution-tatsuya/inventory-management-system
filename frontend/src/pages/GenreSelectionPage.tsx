import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardActionArea,
  Stack,
  Button,
  Alert,
} from '@mui/material';
import { ArrowBack, ChevronRight } from '@mui/icons-material';
import { MainLayout } from '@/layouts/MainLayout';

// ============================================================
// GenreSelectionPage (Admin)
// ============================================================
// 管理画面のジャンル選択ページ
// - カテゴリーID別にジャンル一覧表示（横長リスト形式）
// - ジャンル選択 → パーツ管理ページへ遷移
// ============================================================

const GENRES: Record<string, Array<{ id: string; name: string }>> = {
  '1': [
    { id: '1', name: 'エンジン' },
    { id: '2', name: 'トランスミッション' },
    { id: '3', name: 'サスペンション' },
    { id: '4', name: 'ブレーキ' },
  ],
  '2': [
    { id: '5', name: 'エンジン' },
    { id: '6', name: 'トランスミッション' },
    { id: '7', name: 'サスペンション' },
    { id: '8', name: 'ブレーキ' },
  ],
  '3': [
    { id: '9', name: 'エンジン' },
    { id: '10', name: 'トランスミッション' },
    { id: '11', name: 'サスペンション' },
    { id: '12', name: 'ブレーキ' },
  ],
  '4': [
    { id: '13', name: 'エンジン' },
    { id: '14', name: 'トランスミッション' },
    { id: '15', name: 'サスペンション' },
    { id: '16', name: 'ブレーキ' },
  ],
};

const CATEGORY_NAMES: Record<string, string> = {
  '1': 'GT3-048',
  '2': 'GT3-049',
  '3': '991 GT3 RS',
  '4': 'Cayman GT4',
};

export const GenreSelectionPage = () => {
  const navigate = useNavigate();
  const { categoryId } = useParams<{ categoryId: string }>();

  const genres = categoryId ? GENRES[categoryId] || [] : [];
  const categoryName = categoryId ? CATEGORY_NAMES[categoryId] || 'カテゴリー' : 'カテゴリー';

  const handleGenreClick = (genreId: string) => {
    navigate(`/admin/parts/${genreId}`);
  };

  const handleBackClick = () => {
    navigate('/admin/parts/categories');
  };

  return (
    <MainLayout>
      <Box>
        {/* ヘッダー */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
            ジャンル選択 - {categoryName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            編集したいジャンルを選択してください
          </Typography>
        </Box>

        {/* ジャンルが見つからない場合 */}
        {genres.length === 0 && (
          <Alert severity="warning" sx={{ mb: 3, maxWidth: 800 }}>
            このカテゴリーにはジャンルが登録されていません
          </Alert>
        )}

        {/* ジャンルリスト（横長リスト表示） */}
        <Box sx={{ maxWidth: 800, mb: 4 }}>
          <Stack spacing={2}>
            {genres.map((genre) => (
              <Card
                key={genre.id}
                elevation={1}
                sx={{
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    boxShadow: 3,
                    transform: 'translateX(4px)',
                  },
                }}
              >
                <CardActionArea
                  onClick={() => handleGenreClick(genre.id)}
                  sx={{ p: 2.5 }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        color: 'text.primary',
                      }}
                    >
                      {genre.name}
                    </Typography>
                    <ChevronRight sx={{ color: 'text.secondary' }} />
                  </Box>
                </CardActionArea>
              </Card>
            ))}
          </Stack>
        </Box>

        {/* 戻るボタン */}
        <Box>
          <Button
            variant="outlined"
            color="primary"
            onClick={handleBackClick}
            startIcon={<ArrowBack />}
            sx={{
              px: 3,
              py: 1,
            }}
          >
            カテゴリー選択へ戻る
          </Button>
        </Box>
      </Box>
    </MainLayout>
  );
};
