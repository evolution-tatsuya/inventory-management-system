import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Add, DragIndicator } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { genresApi, categoriesApi } from '@/services/api';
import type { Genre } from '@/types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ============================================================
// SortableRow - ドラッグ可能なテーブル行コンポーネント
// ============================================================
interface SortableRowProps {
  genre: Genre;
  categoryName: string;
  onEdit: (genre: Genre) => void;
  onDelete: (genre: Genre) => void;
  sortable?: boolean;
}

const SortableRow = ({ genre, categoryName, onEdit, onDelete, sortable = true }: SortableRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: genre.id, disabled: !sortable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      sx={{
        '&:hover': { backgroundColor: '#fafafa' },
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      {sortable && (
        <TableCell sx={{ padding: '12px 8px', width: '40px' }}>
          <IconButton
            {...attributes}
            {...listeners}
            size="small"
            sx={{ cursor: 'grab', '&:active': { cursor: 'grabbing' } }}
          >
            <DragIndicator />
          </IconButton>
        </TableCell>
      )}
      <TableCell sx={{ padding: '12px 16px', textAlign: 'center' }}>
        {genre.imageUrl ? (
          <Box
            component="img"
            src={genre.imageUrl}
            alt={genre.name}
            sx={{
              width: '60px',
              height: '60px',
              borderRadius: '6px',
              objectFit: 'cover',
              objectPosition: `${(genre.cropPositionX ?? 0.5) * 100}% ${(genre.cropPositionY ?? 0.5) * 100}%`,
              margin: '0 auto',
              display: 'block',
            }}
          />
        ) : (
          <Box
            sx={{
              width: 60,
              height: 60,
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '12px',
              fontWeight: 600,
              margin: '0 auto',
            }}
          >
            {genre.name.substring(0, 2)}
          </Box>
        )}
      </TableCell>
      <TableCell sx={{ fontSize: '14px', color: '#666', textAlign: 'center' }}>{genre.genreId || '-'}</TableCell>
      <TableCell sx={{ fontSize: '14px', fontWeight: 500 }}>{genre.name}</TableCell>
      <TableCell sx={{ fontSize: '14px', color: '#666' }}>{categoryName}</TableCell>
      <TableCell sx={{ fontSize: '14px', color: '#666' }}>{genre.subtitle || '-'}</TableCell>
      <TableCell sx={{ fontSize: '14px', color: '#666', textAlign: 'center' }}>0</TableCell>
      <TableCell sx={{ fontSize: '14px', color: '#666', textAlign: 'center' }}>
        {new Date(genre.createdAt).toLocaleDateString('ja-JP')}
      </TableCell>
      <TableCell sx={{ textAlign: 'center' }}>
        <Button
          size="small"
          variant="contained"
          onClick={() => onEdit(genre)}
          sx={{
            mr: 1,
            background: '#2196f3',
            minWidth: '70px',
            '&:hover': { background: '#1976d2' },
          }}
        >
          編集
        </Button>
        <Button
          size="small"
          variant="contained"
          color="error"
          onClick={() => onDelete(genre)}
          sx={{ minWidth: '70px' }}
        >
          削除
        </Button>
      </TableCell>
    </TableRow>
  );
};

// ============================================================
// GenreManagementPage (A-002)
// ============================================================
// ジャンル管理ページ - モックアップ準拠の全画面表示版
// ============================================================

export const GenreManagementPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<Genre | null>(null);
  const [genreId, setGenreId] = useState('');
  const [genreName, setGenreName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState<string>(''); // カテゴリーフィルター用

  // 画像クロップ用
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [cropPosition, setCropPosition] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

  // ジャンル一覧取得（全ジャンル）
  const { data: genres = [], isLoading, isError, error } = useQuery({
    queryKey: ['genres'],
    queryFn: genresApi.getAllGenres,
  });

  // カテゴリー一覧取得（ドロップダウン用）
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getCategories,
  });

  // フィルターされたジャンル一覧
  const filteredGenres = filterCategoryId
    ? genres.filter((genre) => genre.categoryId === filterCategoryId)
    : genres;

  // ジャンル作成
  const createMutation = useMutation({
    mutationFn: genresApi.createGenre,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['genres'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setOpenAddDialog(false);
      setGenreId('');
      setGenreName('');
      setCategoryId('');
      setSubtitle('');
    },
  });

  // ジャンル更新
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; categoryId: string; imageUrl?: string; cropPositionX?: number; cropPositionY?: number } }) =>
      genresApi.updateGenre(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['genres'] });
      setOpenEditDialog(false);
      setSelectedGenre(null);
      setGenreName('');
      setCategoryId('');
      setSubtitle('');
    },
  });

  // ジャンル削除
  const deleteMutation = useMutation({
    mutationFn: genresApi.deleteGenre,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['genres'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setOpenDeleteDialog(false);
      setSelectedGenre(null);
    },
  });

  // ジャンル並び順更新
  const orderMutation = useMutation({
    mutationFn: genresApi.updateGenreOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['genres'] });
    },
  });

  // ドラッグ＆ドロップセンサー設定
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ドラッグ終了時のハンドラー
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = filteredGenres.findIndex((g) => g.id === active.id);
      const newIndex = filteredGenres.findIndex((g) => g.id === over.id);
      const newOrder = arrayMove(filteredGenres, oldIndex, newIndex);

      // 楽観的更新
      queryClient.setQueryData(['genres'], (old: Genre[] | undefined) => {
        if (!old) return newOrder;
        // フィルターされていない場合は全体を更新
        if (!filterCategoryId) return newOrder;
        // フィルターされている場合は該当部分のみ更新
        const otherGenres = old.filter((g) => g.categoryId !== filterCategoryId);
        return [...otherGenres, ...newOrder];
      });

      // サーバーに保存
      orderMutation.mutate(newOrder.map((g) => g.id));
    }
  };

  const handleLogout = () => {
    navigate('/admin/login');
  };

  const handleOpenAddDialog = () => {
    setGenreId('');
    setGenreName('');
    // カテゴリーが選択されている場合、カテゴリーを自動選択
    if (filterCategoryId) {
      setCategoryId(filterCategoryId);
    } else {
      setCategoryId('');
    }
    setSubtitle('');
    setImageFile(null);
    setImagePreview('');
    setImageDimensions(null);
    setCropPosition({ x: 0.5, y: 0.5 });
    setOpenAddDialog(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        const img = new Image();
        img.onload = () => {
          setImageDimensions({ width: img.width, height: img.height });
          setCropPosition({ x: 0.5, y: 0.5 });
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdd = async () => {
    let uploadedImageUrl = imagePreview;
    if (imageFile && imageDimensions) {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) { alert('Canvas非対応のブラウザです'); return; }
        const imgAspect = imageDimensions.width / imageDimensions.height;
        const targetAspect = 1;
        let visibleWidth, visibleHeight, cropLeft, cropTop;
        if (imgAspect > targetAspect) {
          visibleHeight = imageDimensions.height;
          visibleWidth = imageDimensions.height * targetAspect;
          const maxCropX = imageDimensions.width - visibleWidth;
          cropLeft = maxCropX * cropPosition.x;
          cropTop = 0;
        } else {
          visibleWidth = imageDimensions.width;
          visibleHeight = imageDimensions.width / targetAspect;
          const maxCropY = imageDimensions.height - visibleHeight;
          cropLeft = 0;
          cropTop = maxCropY * cropPosition.y;
        }
        canvas.width = visibleWidth;
        canvas.height = visibleHeight;
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = imagePreview;
        });
        ctx.drawImage(img, cropLeft, cropTop, visibleWidth, visibleHeight, 0, 0, visibleWidth, visibleHeight);
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => { if (b) resolve(b); else reject(new Error('Blob変換失敗')); }, 'image/jpeg', 0.9);
        });
        const formData = new FormData();
        formData.append('file', blob, 'cropped-image.jpg');
        formData.append('upload_preset', 'ml_default');
        const response = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
        const data = await response.json();
        if (data.error) { alert(`画像のアップロードに失敗しました: ${data.error.message}`); return; }
        uploadedImageUrl = data.secure_url;
      } catch (error) {
        console.error('画像アップロードエラー:', error);
        alert('画像のアップロードに失敗しました');
        return;
      }
    }
    createMutation.mutate({ genreId: genreId || undefined, name: genreName, subtitle: subtitle || undefined, categoryId, imageUrl: uploadedImageUrl || undefined, cropPositionX: cropPosition.x, cropPositionY: cropPosition.y });
  };

  const handleOpenEditDialog = (genre: Genre) => {
    setSelectedGenre(genre);
    setGenreId(genre.genreId || '');
    setGenreName(genre.name);
    setCategoryId(genre.categoryId);
    setSubtitle(genre.subtitle || '');
    setImageFile(null);
    setImagePreview(genre.imageUrl || '');
    setCropPosition({
      x: genre.cropPositionX ?? 0.5,
      y: genre.cropPositionY ?? 0.5
    });
    if (genre.imageUrl) {
      const img = new Image();
      img.onload = () => { setImageDimensions({ width: img.width, height: img.height }); };
      img.src = genre.imageUrl;
    } else {
      setImageDimensions(null);
    }
    setOpenEditDialog(true);
  };

  const handleEdit = async () => {
    if (!selectedGenre) return;
    let uploadedImageUrl = imagePreview;
    if (imageFile && imageDimensions) {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) { alert('Canvas非対応のブラウザです'); return; }
        const imgAspect = imageDimensions.width / imageDimensions.height;
        const targetAspect = 1;
        let visibleWidth, visibleHeight, cropLeft, cropTop;
        if (imgAspect > targetAspect) {
          visibleHeight = imageDimensions.height;
          visibleWidth = imageDimensions.height * targetAspect;
          const maxCropX = imageDimensions.width - visibleWidth;
          cropLeft = maxCropX * cropPosition.x;
          cropTop = 0;
        } else {
          visibleWidth = imageDimensions.width;
          visibleHeight = imageDimensions.width / targetAspect;
          const maxCropY = imageDimensions.height - visibleHeight;
          cropLeft = 0;
          cropTop = maxCropY * cropPosition.y;
        }
        canvas.width = visibleWidth;
        canvas.height = visibleHeight;
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = imagePreview;
        });
        ctx.drawImage(img, cropLeft, cropTop, visibleWidth, visibleHeight, 0, 0, visibleWidth, visibleHeight);
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => { if (b) resolve(b); else reject(new Error('Blob変換失敗')); }, 'image/jpeg', 0.9);
        });
        const formData = new FormData();
        formData.append('file', blob, 'cropped-image.jpg');
        formData.append('upload_preset', 'ml_default');
        const response = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
        const data = await response.json();
        if (data.error) { alert(`画像のアップロードに失敗しました: ${data.error.message}`); return; }
        uploadedImageUrl = data.secure_url;
      } catch (error) {
        console.error('画像アップロードエラー:', error);
        alert('画像のアップロードに失敗しました');
        return;
      }
    }
    updateMutation.mutate({
      id: selectedGenre.id,
      data: {
        genreId: genreId || undefined,
        name: genreName,
        subtitle: subtitle || undefined,
        categoryId,
        imageUrl: uploadedImageUrl || undefined,
        cropPositionX: cropPosition.x,
        cropPositionY: cropPosition.y,
      }
    });
  };

  const handleOpenDeleteDialog = (genre: Genre) => {
    setSelectedGenre(genre);
    setOpenDeleteDialog(true);
  };

  const handleDelete = () => {
    if (!selectedGenre) return;
    deleteMutation.mutate(selectedGenre.id);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '20px 30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        <Typography
          sx={{
            fontSize: '22px',
            fontWeight: 600,
            letterSpacing: '0.5px',
          }}
        >
          在庫管理システム - 管理画面
        </Typography>
        <Button
          onClick={handleLogout}
          sx={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: '2px solid white',
            color: 'white',
            padding: '10px 24px',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: 600,
            textTransform: 'none',
            transition: 'all 0.3s ease',
            '&:hover': {
              background: 'white',
              color: '#667eea',
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            },
          }}
        >
          ログアウト
        </Button>
      </Box>

      {/* メインコンテンツ */}
      <Box
        sx={{
          background: 'white',
          minHeight: 'calc(100vh - 120px)',
        }}
      >
        {/* ナビゲーションタブ */}
        <Box
          sx={{
            display: 'flex',
            background: '#f7f7f7',
            borderBottom: '2px solid #e0e0e0',
            overflowX: 'auto',
            '&::-webkit-scrollbar': {
              height: '8px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#ccc',
              borderRadius: '4px',
            },
          }}
        >
          <Button
            onClick={() => navigate('/admin/dashboard')}
            sx={{
              padding: '16px 32px',
              background: '#f7f7f7',
              color: '#666',
              fontSize: '15px',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 0,
              minWidth: 'fit-content',
              '&:hover': {
                background: '#e0e0e0',
              },
            }}
          >
            ダッシュボード
          </Button>
          <Button
            onClick={() => navigate('/admin/categories')}
            sx={{
              padding: '16px 32px',
              background: '#f7f7f7',
              color: '#666',
              fontSize: '15px',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 0,
              minWidth: 'fit-content',
              '&:hover': {
                background: '#e0e0e0',
              },
            }}
          >
            カテゴリー管理
          </Button>
          <Button
            onClick={() => navigate('/admin/genres')}
            sx={{
              padding: '16px 32px',
              background: 'white',
              borderBottom: '3px solid #667eea',
              color: '#667eea',
              fontSize: '15px',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 0,
              minWidth: 'fit-content',
              '&:hover': {
                background: '#f0f0f0',
              },
            }}
          >
            ジャンル管理
          </Button>
          <Button
            onClick={() => navigate('/admin/units')}
            sx={{
              padding: '16px 32px',
              background: '#f7f7f7',
              color: '#666',
              fontSize: '15px',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 0,
              minWidth: 'fit-content',
              '&:hover': {
                background: '#e0e0e0',
              },
            }}
          >
            ユニット管理
          </Button>
          <Button
            onClick={() => navigate('/admin/parts')}
            sx={{
              padding: '16px 32px',
              background: '#f7f7f7',
              color: '#666',
              fontSize: '15px',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 0,
              minWidth: 'fit-content',
              '&:hover': {
                background: '#e0e0e0',
              },
            }}
          >
            パーツ管理
          </Button>
          <Button
            onClick={() => navigate('/admin/account-settings')}
            sx={{
              padding: '16px 32px',
              background: '#f7f7f7',
              color: '#666',
              fontSize: '15px',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 0,
              minWidth: 'fit-content',
              '&:hover': {
                background: '#e0e0e0',
              },
            }}
          >
            アカウント設定
          </Button>
          <Button
            onClick={() => navigate('/admin/qr')}
            sx={{
              padding: '16px 32px',
              background: '#f7f7f7',
              color: '#666',
              fontSize: '15px',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 0,
              minWidth: 'fit-content',
              '&:hover': {
                background: '#e0e0e0',
              },
            }}
          >
            QRコード
          </Button>
        </Box>

        {/* ジャンル管理コンテンツ */}
        <Box sx={{ padding: '30px' }}>
          {/* ページタイトルとアクション */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <Typography
              sx={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#333',
              }}
            >
              ジャンル管理
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleOpenAddDialog}
              disabled={!filterCategoryId}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #6a4190 100%)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 16px rgba(102, 126, 234, 0.4)',
                },
                '&.Mui-disabled': {
                  background: '#e0e0e0',
                  color: '#9e9e9e',
                },
              }}
            >
              新規ジャンル追加
            </Button>
          </Box>

          {/* カテゴリー選択 */}
          <Box
            sx={{
              padding: '20px 0',
              marginBottom: '20px',
              background: '#f7f7f7',
              borderRadius: '8px',
              paddingLeft: '20px',
              paddingRight: '20px',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography
                sx={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#333',
                }}
              >
                カテゴリー選択:
              </Typography>
              <FormControl size="small" sx={{ minWidth: 250 }}>
                <Select
                  value={filterCategoryId}
                  onChange={(e) => setFilterCategoryId(e.target.value)}
                  displayEmpty
                  sx={{
                    background: 'white',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#e0e0e0',
                      borderWidth: '2px',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#667eea',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#667eea',
                    },
                  }}
                >
                  <MenuItem value="">すべてのカテゴリー</MenuItem>
                  {categories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.id}>
                      {cat.categoryId ? `${cat.categoryId} - ${cat.name}` : cat.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>

          {/* ローディング・エラー表示 */}
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {isError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              ジャンルの取得に失敗しました: {error instanceof Error ? error.message : '不明なエラー'}
            </Alert>
          )}

          {/* テーブル */}
          {!isLoading && !isError && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <TableContainer component={Paper} elevation={2} sx={{ borderRadius: '12px' }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      {filterCategoryId && (
                        <TableCell sx={{ fontWeight: 600, fontSize: '14px', padding: '16px', width: '40px', textAlign: 'center' }}></TableCell>
                      )}
                      <TableCell sx={{ fontWeight: 600, fontSize: '14px', padding: '16px', textAlign: 'center' }}>画像</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '14px', textAlign: 'center' }}>ジャンルID</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '14px', textAlign: 'center' }}>ジャンル名</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '14px', textAlign: 'center' }}>カテゴリー</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '14px', textAlign: 'center' }}>サブタイトル</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '14px', textAlign: 'center' }}>ユニット数</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '14px', textAlign: 'center' }}>作成日</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '14px', textAlign: 'center' }}>
                        操作
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <SortableContext
                    items={filteredGenres.map((g) => g.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <TableBody>
                      {filteredGenres.map((genre) => {
                        const category = categories.find((c) => c.id === genre.categoryId);
                        return (
                          <SortableRow
                            key={genre.id}
                            genre={genre}
                            categoryName={category?.name || '-'}
                            onEdit={handleOpenEditDialog}
                            onDelete={handleOpenDeleteDialog}
                            sortable={!!filterCategoryId}
                          />
                        );
                      })}
                    </TableBody>
                  </SortableContext>
                </Table>
              </TableContainer>
            </DndContext>
          )}
        </Box>
      </Box>

      {/* 新規追加ダイアログ */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>ジャンル新規追加</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="ジャンルID（任意）"
            fullWidth
            variant="outlined"
            value={genreId}
            onChange={(e) => setGenreId(e.target.value)}
            sx={{ mt: 2 }}
            placeholder="例: GEN-001"
          />
          <TextField
            margin="dense"
            label="ジャンル名"
            fullWidth
            variant="outlined"
            value={genreName}
            onChange={(e) => setGenreName(e.target.value)}
            sx={{ mt: 2 }}
          />
          <TextField
            margin="dense"
            label="サブタイトル（任意）"
            fullWidth
            variant="outlined"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            sx={{ mt: 2 }}
            placeholder="例: Racing Car"
          />
          <FormControl fullWidth margin="dense" sx={{ mt: 2 }}>
            <InputLabel>カテゴリー</InputLabel>
            <Select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              label="カテゴリー"
            >
              {categories.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>
                  {cat.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ mt: 2 }}>
            <Button variant="outlined" component="label" fullWidth sx={{ py: 1.5 }}>
              画像を選択
              <input type="file" hidden accept="image/*" onChange={handleImageChange} />
            </Button>
            {imagePreview && imageDimensions && (() => {
              const targetAspect = 1;
              const imgAspect = imageDimensions.width / imageDimensions.height;
              let visibleWidth, visibleHeight, cropLeft, cropTop, maxCropX, maxCropY;
              if (imgAspect > targetAspect) {
                visibleHeight = imageDimensions.height;
                visibleWidth = imageDimensions.height * targetAspect;
                maxCropX = imageDimensions.width - visibleWidth;
                maxCropY = 0;
                cropLeft = maxCropX * cropPosition.x;
                cropTop = 0;
              } else {
                visibleWidth = imageDimensions.width;
                visibleHeight = imageDimensions.width / targetAspect;
                maxCropX = 0;
                maxCropY = imageDimensions.height - visibleHeight;
                cropLeft = 0;
                cropTop = maxCropY * cropPosition.y;
              }
              const maxPreviewSize = 300;
              const previewScale = Math.min(maxPreviewSize / imageDimensions.width, maxPreviewSize / imageDimensions.height);
              const previewWidth = imageDimensions.width * previewScale;
              const previewHeight = imageDimensions.height * previewScale;
              const previewCropLeft = cropLeft * previewScale;
              const previewCropTop = cropTop * previewScale;
              const previewVisibleWidth = visibleWidth * previewScale;
              const previewVisibleHeight = visibleHeight * previewScale;
              const handleMouseDown = (e: React.MouseEvent) => {
                e.preventDefault();
                const startX = e.clientX;
                const startY = e.clientY;
                const startPosX = cropPosition.x;
                const startPosY = cropPosition.y;
                const handleMouseMove = (moveEvent: MouseEvent) => {
                  const deltaX = moveEvent.clientX - startX;
                  const deltaY = moveEvent.clientY - startY;
                  if (maxCropX > 0) {
                    const newX = startPosX + deltaX / (maxCropX * previewScale);
                    setCropPosition({ x: Math.max(0, Math.min(1, newX)), y: 0.5 });
                  } else if (maxCropY > 0) {
                    const newY = startPosY + deltaY / (maxCropY * previewScale);
                    setCropPosition({ x: 0.5, y: Math.max(0, Math.min(1, newY)) });
                  }
                };
                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              };
              return (
                <Box sx={{ mt: 2, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, justifyContent: 'center', alignItems: 'flex-start' }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#666' }}>
                      編集（青い枠をドラッグして表示範囲を調整）
                    </Typography>
                    <Box sx={{ position: 'relative', display: 'inline-block', width: `${previewWidth}px`, height: `${previewHeight}px` }}>
                      <Box component="img" src={imagePreview} alt="元画像" sx={{ width: '100%', height: '100%', display: 'block', borderRadius: '8px', userSelect: 'none' }} />
                      <Box onMouseDown={handleMouseDown} sx={{ position: 'absolute', top: `${previewCropTop}px`, left: `${previewCropLeft}px`, width: `${previewVisibleWidth}px`, height: `${previewVisibleHeight}px`, border: '3px solid #667eea', borderRadius: '8px', boxSizing: 'border-box', cursor: maxCropX > 0 ? 'ew-resize' : maxCropY > 0 ? 'ns-resize' : 'default', transition: 'box-shadow 0.2s', zIndex: 10, '&:hover': { boxShadow: '0 0 0 4px rgba(102, 126, 234, 0.2)' }, '&:active': { boxShadow: '0 0 0 4px rgba(102, 126, 234, 0.4)' } }}>
                        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'rgba(102, 126, 234, 0.8)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, pointerEvents: 'none', userSelect: 'none' }}>ドラッグ</Box>
                      </Box>
                      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
                        {maxCropX > 0 && (<><Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${previewCropLeft}px`, background: `repeating-linear-gradient(45deg, rgba(128, 128, 128, 0.7), rgba(128, 128, 128, 0.7) 8px, rgba(160, 160, 160, 0.7) 8px, rgba(160, 160, 160, 0.7) 16px)`, borderRadius: '8px 0 0 8px' }} /><Box sx={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: `${previewWidth - previewCropLeft - previewVisibleWidth}px`, background: `repeating-linear-gradient(45deg, rgba(128, 128, 128, 0.7), rgba(128, 128, 128, 0.7) 8px, rgba(160, 160, 160, 0.7) 8px, rgba(160, 160, 160, 0.7) 16px)`, borderRadius: '0 8px 8px 0' }} /></>)}
                        {maxCropY > 0 && (<><Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: `${previewCropTop}px`, background: `repeating-linear-gradient(45deg, rgba(128, 128, 128, 0.7), rgba(128, 128, 128, 0.7) 8px, rgba(160, 160, 160, 0.7) 8px, rgba(160, 160, 160, 0.7) 16px)`, borderRadius: '8px 8px 0 0' }} /><Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${previewHeight - previewCropTop - previewVisibleHeight}px`, background: `repeating-linear-gradient(45deg, rgba(128, 128, 128, 0.7), rgba(128, 128, 128, 0.7) 8px, rgba(160, 160, 160, 0.7) 8px, rgba(160, 160, 160, 0.7) 16px)`, borderRadius: '0 0 8px 8px' }} /></>)}
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#666' }}>
                      実際の表示
                    </Typography>
                    <Box component="img" src={imagePreview} alt="実際の表示" sx={{ width: '120px', height: '120px', objectFit: 'cover', objectPosition: `${cropPosition.x * 100}% ${cropPosition.y * 100}%`, borderRadius: '8px', border: '2px solid #e0e0e0' }} />
                  </Box>
                </Box>
              );
            })()}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddDialog(false)}>キャンセル</Button>
          <Button
            onClick={handleAdd}
            variant="contained"
            disabled={!genreName.trim() || !categoryId || createMutation.isPending}
          >
            {createMutation.isPending ? '追加中...' : '追加'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 編集ダイアログ */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>ジャンル編集</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="ジャンルID（任意）"
            fullWidth
            variant="outlined"
            value={genreId}
            onChange={(e) => setGenreId(e.target.value)}
            sx={{ mt: 2 }}
            placeholder="例: GEN-001"
          />
          <TextField
            margin="dense"
            label="ジャンル名"
            fullWidth
            variant="outlined"
            value={genreName}
            onChange={(e) => setGenreName(e.target.value)}
            sx={{ mt: 2 }}
          />
          <TextField
            margin="dense"
            label="サブタイトル（任意）"
            fullWidth
            variant="outlined"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            sx={{ mt: 2 }}
            placeholder="例: Racing Car"
          />
          <FormControl fullWidth margin="dense" sx={{ mt: 2 }}>
            <InputLabel>カテゴリー</InputLabel>
            <Select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              label="カテゴリー"
            >
              {categories.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>
                  {cat.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ mt: 2 }}>
            <Button variant="outlined" component="label" fullWidth sx={{ py: 1.5 }}>
              画像を選択
              <input type="file" hidden accept="image/*" onChange={handleImageChange} />
            </Button>
            {imagePreview && imageDimensions && (() => {
              const targetAspect = 1;
              const imgAspect = imageDimensions.width / imageDimensions.height;
              let visibleWidth, visibleHeight, cropLeft, cropTop, maxCropX, maxCropY;
              if (imgAspect > targetAspect) {
                visibleHeight = imageDimensions.height;
                visibleWidth = imageDimensions.height * targetAspect;
                maxCropX = imageDimensions.width - visibleWidth;
                maxCropY = 0;
                cropLeft = maxCropX * cropPosition.x;
                cropTop = 0;
              } else {
                visibleWidth = imageDimensions.width;
                visibleHeight = imageDimensions.width / targetAspect;
                maxCropX = 0;
                maxCropY = imageDimensions.height - visibleHeight;
                cropLeft = 0;
                cropTop = maxCropY * cropPosition.y;
              }
              const maxPreviewSize = 300;
              const previewScale = Math.min(maxPreviewSize / imageDimensions.width, maxPreviewSize / imageDimensions.height);
              const previewWidth = imageDimensions.width * previewScale;
              const previewHeight = imageDimensions.height * previewScale;
              const previewCropLeft = cropLeft * previewScale;
              const previewCropTop = cropTop * previewScale;
              const previewVisibleWidth = visibleWidth * previewScale;
              const previewVisibleHeight = visibleHeight * previewScale;
              const handleMouseDown = (e: React.MouseEvent) => {
                e.preventDefault();
                const startX = e.clientX;
                const startY = e.clientY;
                const startPosX = cropPosition.x;
                const startPosY = cropPosition.y;
                const handleMouseMove = (moveEvent: MouseEvent) => {
                  const deltaX = moveEvent.clientX - startX;
                  const deltaY = moveEvent.clientY - startY;
                  if (maxCropX > 0) {
                    const newX = startPosX + deltaX / (maxCropX * previewScale);
                    setCropPosition({ x: Math.max(0, Math.min(1, newX)), y: 0.5 });
                  } else if (maxCropY > 0) {
                    const newY = startPosY + deltaY / (maxCropY * previewScale);
                    setCropPosition({ x: 0.5, y: Math.max(0, Math.min(1, newY)) });
                  }
                };
                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              };
              return (
                <Box sx={{ mt: 2, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, justifyContent: 'center', alignItems: 'flex-start' }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#666' }}>
                      編集（青い枠をドラッグして表示範囲を調整）
                    </Typography>
                    <Box sx={{ position: 'relative', display: 'inline-block', width: `${previewWidth}px`, height: `${previewHeight}px` }}>
                      <Box component="img" src={imagePreview} alt="元画像" sx={{ width: '100%', height: '100%', display: 'block', borderRadius: '8px', userSelect: 'none' }} />
                      <Box onMouseDown={handleMouseDown} sx={{ position: 'absolute', top: `${previewCropTop}px`, left: `${previewCropLeft}px`, width: `${previewVisibleWidth}px`, height: `${previewVisibleHeight}px`, border: '3px solid #667eea', borderRadius: '8px', boxSizing: 'border-box', cursor: maxCropX > 0 ? 'ew-resize' : maxCropY > 0 ? 'ns-resize' : 'default', transition: 'box-shadow 0.2s', zIndex: 10, '&:hover': { boxShadow: '0 0 0 4px rgba(102, 126, 234, 0.2)' }, '&:active': { boxShadow: '0 0 0 4px rgba(102, 126, 234, 0.4)' } }}>
                        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'rgba(102, 126, 234, 0.8)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, pointerEvents: 'none', userSelect: 'none' }}>ドラッグ</Box>
                      </Box>
                      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
                        {maxCropX > 0 && (<><Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${previewCropLeft}px`, background: `repeating-linear-gradient(45deg, rgba(128, 128, 128, 0.7), rgba(128, 128, 128, 0.7) 8px, rgba(160, 160, 160, 0.7) 8px, rgba(160, 160, 160, 0.7) 16px)`, borderRadius: '8px 0 0 8px' }} /><Box sx={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: `${previewWidth - previewCropLeft - previewVisibleWidth}px`, background: `repeating-linear-gradient(45deg, rgba(128, 128, 128, 0.7), rgba(128, 128, 128, 0.7) 8px, rgba(160, 160, 160, 0.7) 8px, rgba(160, 160, 160, 0.7) 16px)`, borderRadius: '0 8px 8px 0' }} /></>)}
                        {maxCropY > 0 && (<><Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: `${previewCropTop}px`, background: `repeating-linear-gradient(45deg, rgba(128, 128, 128, 0.7), rgba(128, 128, 128, 0.7) 8px, rgba(160, 160, 160, 0.7) 8px, rgba(160, 160, 160, 0.7) 16px)`, borderRadius: '8px 8px 0 0' }} /><Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${previewHeight - previewCropTop - previewVisibleHeight}px`, background: `repeating-linear-gradient(45deg, rgba(128, 128, 128, 0.7), rgba(128, 128, 128, 0.7) 8px, rgba(160, 160, 160, 0.7) 8px, rgba(160, 160, 160, 0.7) 16px)`, borderRadius: '0 0 8px 8px' }} /></>)}
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#666' }}>
                      実際の表示
                    </Typography>
                    <Box component="img" src={imagePreview} alt="実際の表示" sx={{ width: '120px', height: '120px', objectFit: 'cover', objectPosition: `${cropPosition.x * 100}% ${cropPosition.y * 100}%`, borderRadius: '8px', border: '2px solid #e0e0e0' }} />
                  </Box>
                </Box>
              );
            })()}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>キャンセル</Button>
          <Button onClick={handleEdit} variant="contained" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>ジャンル削除確認</DialogTitle>
        <DialogContent>
          <Typography>ジャンル「{selectedGenre?.name}」を削除してもよろしいですか?</Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            ※ このジャンルに紐づくユニットとパーツもすべて削除されます。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>キャンセル</Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? '削除中...' : '削除'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
