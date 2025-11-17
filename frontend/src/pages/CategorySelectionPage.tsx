import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardActionArea,
  Stack,
} from '@mui/material';
import { ChevronRight } from '@mui/icons-material';
import { MainLayout } from '@/layouts/MainLayout';

// ============================================================
// CategorySelectionPage (Admin)
// ============================================================
// 管理画面のカテゴリー選択ページ
// - カテゴリー一覧表示（横長リスト形式）
// - カテゴリー選択 → ジャンル選択ページへ遷移
// ============================================================

const CATEGORIES = [
  { id: '1', name: 'GT3-048' },
  { id: '2', name: 'GT3-049' },
  { id: '3', name: '991 GT3 RS' },
  { id: '4', name: 'Cayman GT4' },
];

export const CategorySelectionPage = () => {
  const navigate = useNavigate();

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

        {/* カテゴリーリスト（横長リスト表示） */}
        <Box sx={{ maxWidth: 800 }}>
          <Stack spacing={2}>
            {CATEGORIES.map((category) => (
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
      </Box>
    </MainLayout>
  );
};
