import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Search } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { categoriesApi } from '@/services/api';

// ============================================================
// CategoryListPage
// ============================================================
// カテゴリー選択ページ（P-002）
// - 紫グラデーション背景
// - 白い丸角コンテンツエリア
// - カテゴリーカードのグリッド表示（3カラム）
// ============================================================

export const CategoryListPage = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  // カテゴリー一覧取得
  const { data: categories = [], isLoading, error } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getCategories(),
  });

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/categories/${categoryId}/genres`);
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
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'auto',
      }}
    >
      {/* ヘッダー */}
      <Box
        sx={{
          background: 'white',
          borderRadius: '12px',
          padding: { xs: '16px 20px', md: '20px 30px' },
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px',
          flexDirection: { xs: 'column', md: 'row' },
          gap: { xs: '12px', md: 0 },
          maxWidth: '1200px',
          margin: '0 auto 30px auto',
          width: '100%',
        }}
      >
        <Typography
          sx={{
            fontSize: { xs: '18px', md: '22px' },
            fontWeight: 600,
            color: '#667eea',
            letterSpacing: '0.5px',
          }}
        >
          在庫管理システム - Inventory Management System
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            onClick={() => navigate('/search')}
            startIcon={<Search />}
            sx={{
              background: 'rgba(102, 126, 234, 0.1)',
              border: '2px solid #667eea',
              color: '#667eea',
              padding: '10px 24px',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 600,
              transition: 'all 0.3s ease',
              '&:hover': {
                background: '#667eea',
                color: 'white',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
              },
            }}
          >
            検索
          </Button>
          <Button
            onClick={handleLogout}
            sx={{
              background: 'rgba(102, 126, 234, 0.1)',
              border: '2px solid #667eea',
              color: '#667eea',
              padding: '10px 24px',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 600,
              transition: 'all 0.3s ease',
              '&:hover': {
                background: '#667eea',
                color: 'white',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
              },
            }}
          >
            ログアウト
          </Button>
        </Box>
      </Box>

      {/* メインコンテンツ */}
      <Box
        sx={{
          background: 'white',
          borderRadius: '20px',
          padding: { xs: '30px 20px', md: '40px' },
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        {/* ページヘッダー */}
        <Box
          sx={{
            textAlign: 'center',
            marginBottom: '40px',
          }}
        >
          <Typography
            sx={{
              fontSize: { xs: '1.8rem', md: '2.5rem' },
              fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '10px',
            }}
          >
            カテゴリー一覧
          </Typography>
          <Typography
            sx={{
              fontSize: '1rem',
              color: '#666',
            }}
          >
            管理するカテゴリーを選択してください
          </Typography>
        </Box>

        {/* ローディング表示 */}
        {isLoading && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '400px',
            }}
          >
            <CircularProgress />
          </Box>
        )}

        {/* エラー表示 */}
        {error && (
          <Box sx={{ marginBottom: '20px' }}>
            <Alert severity="error">カテゴリーデータの取得に失敗しました</Alert>
          </Box>
        )}

        {/* カテゴリーグリッド */}
        {!isLoading && !error && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
              },
              gap: { xs: '15px', md: '20px' },
              marginBottom: '20px',
            }}
          >
            {categories.map((category) => (
              <Box
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                sx={{
                  background: 'white',
                  border: '2px solid #e0e0e0',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  height: '120px',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
                    borderColor: '#667eea',
                  },
                }}
              >
                {/* カテゴリー画像 */}
                <Box
                  component="img"
                  src={
                    category.imageUrl ||
                    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=300&h=300&fit=crop'
                  }
                  alt={category.name}
                  sx={{
                    width: '120px',
                    height: '120px',
                    objectFit: 'cover', // アップロード時に正方形にトリミング済み
                    flexShrink: 0,
                  }}
                />

                {/* カテゴリー情報 */}
                <Box
                  sx={{
                    flex: 1,
                    padding: { xs: '15px', md: '20px' },
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {/* カテゴリーID */}
                  {category.categoryId && (
                    <Typography
                      sx={{
                        fontSize: { xs: '1.1rem', sm: '1.3rem', md: '1.4rem' },
                        fontWeight: 700,
                        color: '#333',
                      }}
                    >
                      {category.categoryId}
                    </Typography>
                  )}

                  {/* カテゴリー名 */}
                  <Typography
                    sx={{
                      fontSize: { xs: '0.75rem', sm: '0.85rem' },
                      fontWeight: 500,
                      color: '#667eea',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {category.name}
                  </Typography>

                  {/* サブタイトル */}
                  {category.subtitle && (
                    <Typography
                      sx={{
                        fontSize: { xs: '0.8rem', sm: '0.9rem' },
                        color: '#666',
                        fontStyle: 'italic',
                      }}
                    >
                      {category.subtitle}
                    </Typography>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};
