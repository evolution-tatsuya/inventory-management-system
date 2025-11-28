import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardActionArea,
  Stack,
  CircularProgress,
  Alert,
} from '@mui/material';
import { ChevronRight } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/layouts/MainLayout';
import { categoriesApi } from '@/services/api';

// ============================================================
// CategorySelectionPage (Admin)
// ============================================================
// 管理画面のカテゴリー選択ページ
// - カテゴリー一覧表示（横長リスト形式）
// - カテゴリー選択 → ジャンル選択ページへ遷移
// ============================================================

export const CategorySelectionPage = () => {
  const navigate = useNavigate();

  // カテゴリー一覧取得
  const { data: categories, isLoading, error } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getCategories(),
  });

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/admin/parts/categories/${categoryId}/genres`);
  };

  return (
    <MainLayout>
      <Box>
        {/* ヘッダー */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
            カテゴリー選択
          </Typography>
          <Typography variant="body2" color="text.secondary">
            編集したいカテゴリーを選択してください
          </Typography>
        </Box>

        {/* ローディング状態 */}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* エラー状態 */}
        {error && (
          <Alert severity="error" sx={{ mb: 3, maxWidth: 800 }}>
            カテゴリーの取得に失敗しました。再度お試しください。
          </Alert>
        )}

        {/* カテゴリーリスト（横長リスト表示） */}
        {!isLoading && !error && categories && (
          <Box sx={{ maxWidth: 800 }}>
            <Stack spacing={2}>
              {categories.map((category) => (
                <Card
                  key={category.id}
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
                    onClick={() => handleCategoryClick(category.id)}
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
                        {category.name}
                      </Typography>
                      <ChevronRight sx={{ color: 'text.secondary' }} />
                    </Box>
                  </CardActionArea>
                </Card>
              ))}
            </Stack>
          </Box>
        )}
      </Box>
    </MainLayout>
  );
};
