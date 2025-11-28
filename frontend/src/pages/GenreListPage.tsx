import { useNavigate, useParams } from 'react-router-dom';
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
import { genresApi, categoriesApi } from '@/services/api';

// ============================================================
// GenreListPage
// ============================================================
// P-003: ジャンル一覧ページ（一般ユーザー向け）
// ============================================================

export const GenreListPage = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { categoryId } = useParams<{ categoryId: string }>();

  // ジャンル一覧取得
  const {
    data: genres = [],
    isLoading: genresLoading,
    error: genresError,
  } = useQuery({
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
    navigate(`/categories/${categoryId}/genres/${genreId}/units`);
  };

  const handleBackClick = () => {
    navigate('/categories');
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
            {categoryName} - ジャンル一覧
          </Typography>
          <Typography
            sx={{
              fontSize: '1rem',
              color: '#666',
            }}
          >
            管理するジャンルを選択してください
          </Typography>
        </Box>

        {/* ローディング表示 */}
        {genresLoading && (
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
        {genresError && (
          <Box sx={{ marginBottom: '20px' }}>
            <Alert severity="error">
              ジャンルデータの取得に失敗しました
            </Alert>
          </Box>
        )}

        {/* ジャンルが見つからない場合 */}
        {!genresLoading && !genresError && genres.length === 0 && (
          <Box sx={{ marginBottom: '20px' }}>
            <Alert severity="warning">
              このカテゴリーにはジャンルが登録されていません
            </Alert>
          </Box>
        )}

        {/* ジャンルグリッド */}
        {!genresLoading && !genresError && genres.length > 0 && (
          <>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)',
                  md: 'repeat(3, 1fr)',
                },
                gap: { xs: '15px', md: '20px' },
                marginBottom: '40px',
              }}
            >
              {genres.map((genre) => (
                <Box
                  key={genre.id}
                  onClick={() => handleGenreClick(genre.id)}
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
                  {/* ジャンル画像 */}
                  <Box
                    component="img"
                    src={
                      genre.imageUrl ||
                      'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=300&h=300&fit=crop'
                    }
                    alt={genre.name}
                    sx={{
                      width: '120px',
                      height: '120px',
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />

                  {/* ジャンル情報 */}
                  <Box
                    sx={{
                      flex: 1,
                      padding: { xs: '15px', md: '20px' },
                      textAlign: 'center',
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: { xs: '0.75rem', sm: '0.85rem' },
                        color: '#999',
                        marginBottom: '2px',
                      }}
                    >
                      Genre Code: {genre.genreId || genre.id}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: { xs: '1.1rem', sm: '1.3rem', md: '1.5rem' },
                        fontWeight: 700,
                        color: '#333',
                      }}
                    >
                      {genre.name}
                    </Typography>
                    {genre.subtitle && (
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: { xs: '0.8rem', sm: '0.9rem' },
                          color: '#666',
                          marginTop: '4px',
                        }}
                      >
                        {genre.subtitle}
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>

            {/* 戻るボタン */}
            <Box sx={{ textAlign: 'center' }}>
              <Button
                onClick={handleBackClick}
                sx={{
                  padding: '12px 40px',
                  background: 'white',
                  color: '#667eea',
                  border: '2px solid #667eea',
                  borderRadius: '25px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: '#667eea',
                    color: 'white',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 5px 15px rgba(102, 126, 234, 0.3)',
                  },
                }}
              >
                ← カテゴリー選択へ戻る
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};
