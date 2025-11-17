import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardActionArea,
  Button,
  AppBar,
  Toolbar,
  Stack,
} from '@mui/material';
import { useAuth } from '@/hooks/useAuth';

// ============================================================
// CategoryListPage
// ============================================================
// カテゴリー選択ページ（P-002）
// - カスタムヘッダー（ログアウトボタン付き）
// - カテゴリーカードのグリッド表示（4カラム）
// - 検索ボタン（中央下部）
// ============================================================

// モックデータ
const MOCK_CATEGORIES = [
  { id: '1', name: 'GT3-048', image: 'https://picsum.photos/seed/gt3-048/400/300' },
  { id: '2', name: 'GT3-049', image: 'https://picsum.photos/seed/gt3-049/400/300' },
  { id: '3', name: '991 GT3 RS', image: 'https://picsum.photos/seed/991gt3rs/400/300' },
  { id: '4', name: 'Cayman GT4', image: 'https://picsum.photos/seed/cayman/400/300' },
];

export const CategoryListPage = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/categories/${categoryId}/genres`);
  };

  const handleSearchClick = () => {
    navigate('/search');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'auto',
      }}
    >
      {/* ヘッダー */}
      <AppBar position="static" elevation={0} sx={{ backgroundColor: '#3949ab', width: 'calc(100% - 48px)', mt: 6, mx: 3 }}>
        <Toolbar sx={{ justifyContent: 'center', position: 'relative' }}>
          <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
            カテゴリー
          </Typography>
          <Button
            color="inherit"
            onClick={handleLogout}
            sx={{ color: '#ffffff', position: 'absolute', right: 16 }}
          >
            ログアウト
          </Button>
        </Toolbar>
      </AppBar>

      {/* メインコンテンツ */}
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          width: '100%',
          pt: 6,
          pb: 6,
          px: 3,
        }}
      >
        {/* カテゴリーリスト（縦並び） */}
        <Box sx={{ width: '100%', maxWidth: 1200, mb: 6 }}>
          <Stack spacing={3}>
            {MOCK_CATEGORIES.map((category) => (
              <Box
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  cursor: 'pointer',
                  transition: 'transform 0.3s ease',
                  position: 'relative',
                  '&:hover': {
                    transform: 'translateX(8px)',
                  },
                }}
              >
                {/* 青いブロック（左端） */}
                <Box
                  sx={{
                    width: 40,
                    height: 160,
                    backgroundColor: '#2196F3',
                    flexShrink: 0,
                    position: 'relative',
                    zIndex: 1,
                  }}
                />

                {/* 画像エリア */}
                <Box
                  sx={{
                    width: 220,
                    height: 160,
                    borderRadius: 0,
                    overflow: 'hidden',
                    flexShrink: 0,
                    backgroundImage: category.image ? `url(${category.image})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundColor: '#ffffff',
                    position: 'relative',
                    zIndex: 2,
                    marginLeft: '-40px',
                  }}
                />

                {/* グラデーションバー（斜めカット） */}
                <Box
                  sx={{
                    flex: 1,
                    height: 70,
                    background: 'linear-gradient(90deg, #2196F3 0%, #9C27B0 50%, #E91E63 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: '210px',
                    paddingRight: '50px',
                    marginLeft: '-150px',
                    marginRight: '80px',
                    marginBottom: '-10px',
                    clipPath: 'polygon(30px 0, 100% 0, calc(100% - 30px) 100%, 0 100%)',
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 600,
                      color: '#ffffff',
                      letterSpacing: 2,
                    }}
                  >
                    {category.name}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>

        {/* 検索ボタン（中央下部） */}
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSearchClick}
            size="large"
            sx={{
              px: 6,
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 600,
            }}
          >
            検索ページへ
          </Button>
        </Box>
      </Box>
    </Box>
  );
};
