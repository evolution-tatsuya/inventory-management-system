import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardActionArea,
  Stack,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { ArrowBack, ChevronRight } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/layouts/MainLayout';
import { genresApi, categoriesApi } from '@/services/api';

// ============================================================
// GenreSelectionPage (Admin)
// ============================================================
// 管理画面のジャンル選択ページ
// - カテゴリーID別にジャンル一覧表示（横長リスト形式）
// - ジャンル選択 → パーツ管理ページへ遷移
// ============================================================

export const GenreSelectionPage = () => {
  const navigate = useNavigate();
  const { categoryId } = useParams<{ categoryId: string }>();

  // ジャンル一覧取得
  const { data: genres, isLoading: genresLoading, error: genresError } = useQuery({
    queryKey: ['genres', categoryId],
    queryFn: () => genresApi.getGenres(categoryId!),
    enabled: !!categoryId,
  });

  // カテゴリー情報取得（カテゴリー名表示用）
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getCategories(),
  });

  const category = categories?.find((c) => c.id === categoryId);
  const categoryName = category?.name || 'カテゴリー';

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

        {/* ローディング状態 */}
        {genresLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* エラー状態 */}
        {genresError && (
          <Alert severity="error" sx={{ mb: 3, maxWidth: 800 }}>
            ジャンルの取得に失敗しました。再度お試しください。
          </Alert>
        )}

        {/* ジャンルが見つからない場合 */}
        {!genresLoading && !genresError && genres && genres.length === 0 && (
          <Alert severity="warning" sx={{ mb: 3, maxWidth: 800 }}>
            このカテゴリーにはジャンルが登録されていません
          </Alert>
        )}

        {/* ジャンルリスト（横長リスト表示） */}
        {!genresLoading && !genresError && genres && genres.length > 0 && (
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
        )}

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
