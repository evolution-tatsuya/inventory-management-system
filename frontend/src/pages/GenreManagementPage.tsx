import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { UploadButton } from '@/components/UploadButton';
import { ImageEditorDialog } from '@/components/ImageEditorDialog';
import { uploadImageToCloudinary } from '@/utils/uploadImage';
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
import { genresApi, categoriesApi, systemSettingsApi } from '@/services/api';
import { getLogoMaxHeight, getLogoMaxWidth } from '@/utils/logoSize';
import type { Genre, SystemSettings } from '@/types';
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
  const { logout: authLogout } = useAuth();
  const queryClient = useQueryClient();
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<Genre | null>(null);
  const [genreId, setGenreId] = useState('');
  const [genreName, setGenreName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState<string>(''); // カテゴリーフィルター用
  const [showAll, setShowAll] = useState<boolean>(false); // 「全件表示」で絞り込み無視して全件表示するフラグ

  // システム設定取得
  useEffect(() => {
    const fetchSystemSettings = async () => {
      try {
        const settings = await systemSettingsApi.getSystemSettings();
        setSystemSettings(settings);
      } catch (error) {
        console.error('システム設定取得エラー:', error);
        setSystemSettings({
          id: '',
          systemName: '階層型在庫管理システム',
          logoUrl: null,
          headerColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          createdAt: '',
          updatedAt: '',
        });
      }
    };
    fetchSystemSettings();
  }, []);

  // 画像編集用
  const [imagePreview, setImagePreview] = useState<string>(''); // 表示用プレビュー（加工済み or 既存URL）
  const [editorOpen, setEditorOpen] = useState(false); // 画像エディターの開閉
  const [rawImageUrl, setRawImageUrl] = useState<string>(''); // エディターに渡す元画像(base64)
  const [editedImage, setEditedImage] = useState<string>(''); // エディターで加工した画像(base64 PNG)。保存時にアップロード

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

  // 一覧を描画してよいか（カテゴリー選択、または「全件表示」ON時のみ）
  // ※件数が増えた場合に一括描画でブラウザが固まるのを防ぐためのゲート
  const shouldShowTable = showAll || !!filterCategoryId;

  // カテゴリー選択変更（全件表示はリセット）
  const handleFilterCategoryChange = (newCategoryId: string) => {
    setFilterCategoryId(newCategoryId);
    setShowAll(false);
  };

  // 「全件表示」：件数が多い場合は確認してから表示
  const handleShowAll = () => {
    const total = genres.length;
    if (total > 300) {
      const ok = window.confirm(
        `全 ${total.toLocaleString()} 件を表示します。件数が多いと動作が重くなる場合があります。表示しますか？`,
      );
      if (!ok) return;
    }
    setFilterCategoryId('');
    setShowAll(true);
  };

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
      setImagePreview('');
      setEditedImage('');
      setRawImageUrl('');
    },
  });

  // ジャンル更新
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { genreId?: string; name: string; subtitle?: string; categoryId: string; imageUrl?: string; cropPositionX?: number; cropPositionY?: number } }) =>
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

  const handleLogout = async () => {
    try {
      await authLogout();
    } catch (error) {
      console.error('ログアウトエラー:', error);
    } finally {
      navigate('/admin/login');
    }
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
    setImagePreview('');
    setEditedImage('');
    setRawImageUrl('');
    setOpenAddDialog(true);
  };

  // 画像選択時: base64化してエディターを開く
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setRawImageUrl(reader.result as string);
      setEditorOpen(true);
    };
    reader.readAsDataURL(file);
  };

  // エディターで「適用」したとき: 加工済み画像をプレビュー＆保存対象にする
  const handleEditorSave = (editedImageUrl: string) => {
    setEditedImage(editedImageUrl);
    setImagePreview(editedImageUrl);
    setEditorOpen(false);
  };

  const handleAdd = async () => {
    let uploadedImageUrl = imagePreview;
    // エディターで加工した画像がある場合、そのままCloudinaryにアップロード
    if (editedImage) {
      try {
        uploadedImageUrl = await uploadImageToCloudinary(editedImage, 'genre.png');
      } catch (error) {
        alert(error instanceof Error ? error.message : '画像のアップロードに失敗しました');
        return;
      }
    }
    createMutation.mutate({ genreId: genreId || undefined, name: genreName, subtitle: subtitle || undefined, categoryId, imageUrl: uploadedImageUrl || undefined, cropPositionX: 0.5, cropPositionY: 0.5 });
  };

  const handleOpenEditDialog = (genre: Genre) => {
    setSelectedGenre(genre);
    setGenreId(genre.genreId || '');
    setGenreName(genre.name);
    setCategoryId(genre.categoryId);
    setSubtitle(genre.subtitle || '');
    setImagePreview(genre.imageUrl || '');
    setEditedImage('');
    setRawImageUrl('');
    setOpenEditDialog(true);
  };

  const handleEdit = async () => {
    if (!selectedGenre) return;
    let uploadedImageUrl = imagePreview;
    // エディターで加工した新しい画像がある場合、Cloudinaryにアップロード
    if (editedImage) {
      try {
        uploadedImageUrl = await uploadImageToCloudinary(editedImage, 'genre.png');
      } catch (error) {
        alert(error instanceof Error ? error.message : '画像のアップロードに失敗しました');
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
        cropPositionX: 0.5,
        cropPositionY: 0.5,
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
          background: systemSettings?.headerColor || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '20px 30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {systemSettings?.logoUrl && (
          <Box
            component="img"
            src={systemSettings.logoUrl}
            alt="Logo"
            sx={{
              maxHeight: getLogoMaxHeight(systemSettings?.logoSize),
              maxWidth: getLogoMaxWidth(systemSettings?.logoSize),
              objectFit: 'contain',
              mr: 2,
            }}
          />
        )}
        <Typography
          sx={{
            fontSize: '22px',
            fontWeight: 600,
            letterSpacing: '0.5px',
          }}
        >
          {systemSettings?.systemName || '階層型在庫管理システム'} - 管理画面
        </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            onClick={() => navigate('/categories')}
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
            ユーザー画面を見る
          </Button>
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
            onClick={() => navigate('/admin/inventory-count')}
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
            棚卸し
          </Button>
          <Button
            onClick={() => navigate('/admin/owner')}
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
            運営者
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
                  onChange={(e) => handleFilterCategoryChange(e.target.value)}
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
              <Button
                variant={showAll ? 'contained' : 'outlined'}
                size="small"
                onClick={handleShowAll}
                sx={{
                  fontWeight: 600,
                  textTransform: 'none',
                  borderWidth: '2px',
                  whiteSpace: 'nowrap',
                  ...(showAll
                    ? { background: '#667eea', '&:hover': { background: '#5568d3' } }
                    : { borderColor: '#667eea', color: '#667eea', '&:hover': { borderColor: '#5568d3', background: 'rgba(102,126,234,0.04)' } }),
                }}
              >
                全件表示
              </Button>
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

          {/* 範囲未選択時の案内（カテゴリーを選ぶか「全件表示」を押すまでリストは描画しない） */}
          {!isLoading && !isError && !shouldShowTable && (
            <Alert severity="info">
              カテゴリーを選択するか、「全件表示」を押してください。
            </Alert>
          )}

          {/* テーブル */}
          {!isLoading && !isError && shouldShowTable && (
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
            <UploadButton variant="outlined" fullWidth sx={{ py: 1.5 }} accept="image/*" onChange={handleImageChange}>
              画像を選択
            </UploadButton>
            {imagePreview && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#666' }}>プレビュー</Typography>
                <Box component="img" src={imagePreview} alt="プレビュー" sx={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #e0e0e0' }} />
              </Box>
            )}
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
            <UploadButton variant="outlined" fullWidth sx={{ py: 1.5 }} accept="image/*" onChange={handleImageChange}>
              画像を選択
            </UploadButton>
            {imagePreview && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#666' }}>プレビュー</Typography>
                <Box component="img" src={imagePreview} alt="プレビュー" sx={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #e0e0e0' }} />
              </Box>
            )}
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

      {/* 画像編集ダイアログ（拡大縮小・移動のみの簡易モード / 正方形枠） */}
      <ImageEditorDialog
        open={editorOpen}
        imageUrl={rawImageUrl}
        onClose={() => setEditorOpen(false)}
        onSave={handleEditorSave}
        title="画像を調整"
        simple
        aspectRatio="100%"
      />
    </Box>
  );
};
