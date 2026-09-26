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
} from '@mui/material';
import {
  Edit,
  Delete,
  Add,
  DragIndicator,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi, systemSettingsApi } from '@/services/api';
import { getLogoMaxHeight, getLogoMaxWidth } from '@/utils/logoSize';
import type { Category, SystemSettings } from '@/types';
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
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

const SortableRow = ({ category, onEdit, onDelete }: SortableRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

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
      <TableCell sx={{ padding: '12px 8px', width: '40px', textAlign: 'center' }}>
        <IconButton
          {...attributes}
          {...listeners}
          size="small"
          sx={{ cursor: 'grab', '&:active': { cursor: 'grabbing' } }}
        >
          <DragIndicator />
        </IconButton>
      </TableCell>
      <TableCell sx={{ padding: '12px 16px', textAlign: 'center' }}>
        {category.imageUrl ? (
          <Box
            component="img"
            src={category.imageUrl}
            alt={category.name}
            sx={{
              width: '60px',
              height: '60px',
              borderRadius: '6px',
              objectFit: 'cover',
              objectPosition: `${(category.cropPositionX ?? 0.5) * 100}% ${(category.cropPositionY ?? 0.5) * 100}%`,
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
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '12px',
              fontWeight: 600,
              margin: '0 auto',
            }}
          >
            {category.name.substring(0, 2)}
          </Box>
        )}
      </TableCell>
      <TableCell sx={{ fontSize: '14px', color: '#666', textAlign: 'center' }}>
        {category.categoryId || '-'}
      </TableCell>
      <TableCell sx={{ fontSize: '14px', fontWeight: 500, textAlign: 'center' }}>{category.name}</TableCell>
      <TableCell sx={{ fontSize: '14px', color: '#666', textAlign: 'center' }}>
        {category.subtitle || '-'}
      </TableCell>
      <TableCell sx={{ fontSize: '14px', color: '#666', textAlign: 'center' }}>
        {(category as any).genres?.length || 0}
      </TableCell>
      <TableCell sx={{ fontSize: '14px', color: '#666', textAlign: 'center' }}>
        {new Date(category.createdAt).toLocaleDateString('ja-JP')}
      </TableCell>
      <TableCell sx={{ textAlign: 'center' }}>
        <Button
          size="small"
          variant="contained"
          onClick={() => onEdit(category)}
          sx={{
            mr: 1,
            background: '#2196f3',
            minWidth: '70px',
            '&:hover': {
              background: '#1976d2',
            },
          }}
        >
          編集
        </Button>
        <Button
          size="small"
          variant="contained"
          color="error"
          onClick={() => onDelete(category)}
          sx={{
            minWidth: '70px',
          }}
        >
          削除
        </Button>
      </TableCell>
    </TableRow>
  );
};

// ============================================================
// CategoryManagementPage (A-001)
// ============================================================
// カテゴリー管理ページ - モックアップ準拠の全画面表示版
// ============================================================

export const CategoryManagementPage = () => {
  const navigate = useNavigate();
  const { logout: authLogout } = useAuth();
  const queryClient = useQueryClient();
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [imagePreview, setImagePreview] = useState<string>(''); // 表示用プレビュー（加工済み or 既存URL）
  const [editorOpen, setEditorOpen] = useState(false); // 画像エディターの開閉
  const [rawImageUrl, setRawImageUrl] = useState<string>(''); // エディターに渡す元画像(base64)
  const [editedImage, setEditedImage] = useState<string>(''); // エディターで加工した画像(base64 PNG)。保存時にアップロード
  const [createdAt, setCreatedAt] = useState<string>(''); // 作成日
  const [addError, setAddError] = useState<string>(''); // 追加エラーメッセージ

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

  // カテゴリー一覧取得
  const { data: categories = [], isLoading, isError, error } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getCategories,
  });

  // カテゴリー作成
  const createMutation = useMutation({
    mutationFn: categoriesApi.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setOpenAddDialog(false);
      setCategoryName('');
      setSubtitle('');
      setCategoryId('');
      setCreatedAt('');
      setAddError('');
    },
    onError: (error: any) => {
      console.error('カテゴリー作成エラー:', error);
      if (error?.message?.includes('already exists')) {
        setAddError('このカテゴリー名は既に使用されています');
      } else {
        setAddError('カテゴリー作成に失敗しました: ' + (error?.message || '不明なエラー'));
      }
    },
  });

  // カテゴリー更新
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof categoriesApi.updateCategory>[1] }) =>
      categoriesApi.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setOpenEditDialog(false);
      setSelectedCategory(null);
      setCategoryId('');
      setCategoryName('');
      setSubtitle('');
      setImagePreview('');
      setEditedImage('');
      setRawImageUrl('');
    },
  });

  // カテゴリー削除
  const deleteMutation = useMutation({
    mutationFn: categoriesApi.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setOpenDeleteDialog(false);
      setSelectedCategory(null);
    },
  });

  // カテゴリー並び順更新
  const orderMutation = useMutation({
    mutationFn: categoriesApi.updateCategoryOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
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
      const oldIndex = categories.findIndex((cat) => cat.id === active.id);
      const newIndex = categories.findIndex((cat) => cat.id === over.id);
      const newOrder = arrayMove(categories, oldIndex, newIndex);

      // 楽観的更新
      queryClient.setQueryData(['categories'], newOrder);

      // サーバーに保存
      orderMutation.mutate(newOrder.map((cat) => cat.id));
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
    setCategoryId('');
    setCategoryName('');
    setSubtitle('');
    setImagePreview('');
    setEditedImage('');
    setRawImageUrl('');
    setCreatedAt(new Date().toISOString().split('T')[0]); // 今日の日付をデフォルト
    setAddError(''); // エラーをクリア
    setOpenAddDialog(true);
  };

  const handleAdd = async () => {
    let uploadedImageUrl = '';

    // エディターで加工した画像がある場合、そのままCloudinaryにアップロード
    if (editedImage) {
      try {
        uploadedImageUrl = await uploadImageToCloudinary(editedImage, 'category.png');
      } catch (error) {
        alert(error instanceof Error ? error.message : '画像のアップロードに失敗しました');
        return;
      }
    }

    createMutation.mutate({
      name: categoryName,
      categoryId: categoryId || undefined,
      subtitle: subtitle || undefined,
      imageUrl: uploadedImageUrl || undefined,
      // 画像は編集済みで保存するため位置補正は不要（中央固定）
      cropPositionX: uploadedImageUrl ? 0.5 : undefined,
      cropPositionY: uploadedImageUrl ? 0.5 : undefined,
      createdAt: createdAt ? new Date(createdAt).toISOString() : undefined,
    });
  };

  const handleOpenEditDialog = (category: Category) => {
    setSelectedCategory(category);
    setCategoryId(category.categoryId || category.name); // カテゴリーIDの初期値
    setCategoryName(category.name);
    setSubtitle(category.subtitle || ''); // サブタイトルの初期値
    setCreatedAt(category.createdAt ? new Date(category.createdAt).toISOString().split('T')[0] : ''); // 作成日
    setImagePreview(category.imageUrl || ''); // 既存の画像URLがあれば設定
    setEditedImage(''); // 未編集
    setRawImageUrl('');
    setOpenEditDialog(true);
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

  const handleEdit = async () => {
    if (!selectedCategory) return;

    let uploadedImageUrl = imagePreview;

    // エディターで加工した新しい画像がある場合、Cloudinaryにアップロード
    if (editedImage) {
      try {
        uploadedImageUrl = await uploadImageToCloudinary(editedImage, 'category.png');
      } catch (error) {
        alert(error instanceof Error ? error.message : '画像のアップロードに失敗しました');
        return;
      }
    }

    updateMutation.mutate({
      id: selectedCategory.id,
      data: {
        categoryId: categoryId,
        name: categoryName,
        subtitle: subtitle,
        imageUrl: uploadedImageUrl || undefined,
        // 画像は編集済みで保存するため位置補正は不要（中央固定）
        cropPositionX: 0.5,
        cropPositionY: 0.5,
        createdAt: createdAt ? new Date(createdAt).toISOString() : undefined,
      },
    });
  };

  const handleOpenDeleteDialog = (category: Category) => {
    setSelectedCategory(category);
    setOpenDeleteDialog(true);
  };

  const handleDelete = () => {
    if (!selectedCategory) return;
    deleteMutation.mutate(selectedCategory.id);
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
            カテゴリー管理
          </Button>
          <Button
            onClick={() => navigate('/admin/genres')}
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

        {/* カテゴリー管理コンテンツ */}
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
              カテゴリー管理
            </Typography>
            <Button
              startIcon={<Add />}
              onClick={handleOpenAddDialog}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 16px rgba(102, 126, 234, 0.4)',
                },
              }}
            >
              新規カテゴリー追加
            </Button>
          </Box>

          {/* ローディング・エラー表示 */}
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {isError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              カテゴリーの取得に失敗しました: {error instanceof Error ? error.message : '不明なエラー'}
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
                      <TableCell sx={{ fontWeight: 600, fontSize: '14px', padding: '16px', width: '40px', textAlign: 'center' }}></TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '14px', padding: '16px', textAlign: 'center' }}>画像</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '14px', textAlign: 'center' }}>カテゴリーID</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '14px', textAlign: 'center' }}>カテゴリー名</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '14px', textAlign: 'center' }}>サブタイトル</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '14px', textAlign: 'center' }}>ジャンル数</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '14px', textAlign: 'center' }}>作成日</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '14px', textAlign: 'center' }}>
                        操作
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <SortableContext
                    items={categories.map((cat) => cat.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <TableBody>
                      {categories.map((category) => (
                        <SortableRow
                          key={category.id}
                          category={category}
                          onEdit={handleOpenEditDialog}
                          onDelete={handleOpenDeleteDialog}
                        />
                      ))}
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
        <DialogTitle>カテゴリー新規追加</DialogTitle>
        <DialogContent>
          {addError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {addError}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="カテゴリーID"
            fullWidth
            variant="outlined"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            sx={{ mt: 2 }}
          />
          <TextField
            margin="dense"
            label="カテゴリー名"
            fullWidth
            variant="outlined"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            sx={{ mt: 2 }}
          />
          <TextField
            margin="dense"
            label="サブタイトル"
            fullWidth
            variant="outlined"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            sx={{ mt: 2 }}
          />
          <TextField
            margin="dense"
            label="作成日"
            type="date"
            fullWidth
            variant="outlined"
            value={createdAt}
            onChange={(e) => setCreatedAt(e.target.value)}
            sx={{ mt: 2 }}
            InputLabelProps={{ shrink: true }}
          />
          <Box sx={{ mt: 2 }}>
            <UploadButton
              variant="outlined"
              fullWidth
              sx={{ py: 1.5 }}
              accept="image/*"
              onChange={handleImageChange}
            >
              画像を選択
            </UploadButton>
            {imagePreview && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#666' }}>
                  プレビュー
                </Typography>
                <Box
                  component="img"
                  src={imagePreview}
                  alt="プレビュー"
                  sx={{
                    width: '120px',
                    height: '120px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: '2px solid #e0e0e0',
                  }}
                />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddDialog(false)}>キャンセル</Button>
          <Button
            onClick={handleAdd}
            variant="contained"
            disabled={!categoryName.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? '追加中...' : '追加'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 編集ダイアログ */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>カテゴリー編集</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="カテゴリーID"
            fullWidth
            variant="outlined"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            sx={{ mt: 2 }}
          />
          <TextField
            margin="dense"
            label="カテゴリー名"
            fullWidth
            variant="outlined"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            sx={{ mt: 2 }}
          />
          <TextField
            margin="dense"
            label="サブタイトル"
            fullWidth
            variant="outlined"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            sx={{ mt: 2 }}
          />
          <TextField
            margin="dense"
            label="作成日"
            type="date"
            fullWidth
            variant="outlined"
            value={createdAt}
            onChange={(e) => setCreatedAt(e.target.value)}
            sx={{ mt: 2 }}
            InputLabelProps={{ shrink: true }}
          />
          <Box sx={{ mt: 2 }}>
            <UploadButton
              variant="outlined"
              fullWidth
              sx={{ py: 1.5 }}
              accept="image/*"
              onChange={handleImageChange}
            >
              画像を選択
            </UploadButton>
            {imagePreview && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#666' }}>
                  プレビュー
                </Typography>
                <Box
                  component="img"
                  src={imagePreview}
                  alt="プレビュー"
                  sx={{
                    width: '120px',
                    height: '120px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: '2px solid #e0e0e0',
                  }}
                />
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
        <DialogTitle>カテゴリー削除確認</DialogTitle>
        <DialogContent>
          <Typography>カテゴリー「{selectedCategory?.name}」を削除してもよろしいですか?</Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            ※ このカテゴリーに紐づくジャンルとパーツもすべて削除されます。
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
