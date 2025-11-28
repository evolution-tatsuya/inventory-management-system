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
} from '@mui/material';
import {
  Edit,
  Delete,
  Add,
  DragIndicator,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi } from '@/services/api';
import type { Category } from '@/types';
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
  const queryClient = useQueryClient();
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [cropPosition, setCropPosition] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 }); // 0.0 ~ 1.0 の割合
  const [createdAt, setCreatedAt] = useState<string>(''); // 作成日
  const [addError, setAddError] = useState<string>(''); // 追加エラーメッセージ

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
      setImageFile(null);
      setImagePreview('');
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

  const handleLogout = () => {
    navigate('/admin/login');
  };

  const handleOpenAddDialog = () => {
    setCategoryId('');
    setCategoryName('');
    setSubtitle('');
    setImageFile(null);
    setImagePreview('');
    setCreatedAt(new Date().toISOString().split('T')[0]); // 今日の日付をデフォルト
    setAddError(''); // エラーをクリア
    setOpenAddDialog(true);
  };

  const handleAdd = async () => {
    createMutation.mutate({
      name: categoryName,
      categoryId: categoryId || undefined,
      subtitle: subtitle || undefined,
      createdAt: createdAt ? new Date(createdAt).toISOString() : undefined,
    });
  };

  const handleOpenEditDialog = (category: Category) => {
    setSelectedCategory(category);
    setCategoryId(category.categoryId || category.name); // カテゴリーIDの初期値
    setCategoryName(category.name);
    setSubtitle(category.subtitle || ''); // サブタイトルの初期値
    setCreatedAt(category.createdAt ? new Date(category.createdAt).toISOString().split('T')[0] : ''); // 作成日
    setImageFile(null);
    setImagePreview(category.imageUrl || ''); // 既存の画像URLがあれば設定

    // データベースに保存されているクロップ位置を復元（デフォルトは中央）
    setCropPosition({
      x: category.cropPositionX ?? 0.5,
      y: category.cropPositionY ?? 0.5
    });

    // 既存画像のサイズを取得してプレビュー表示
    if (category.imageUrl) {
      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height });
      };
      img.src = category.imageUrl;
    } else {
      setImageDimensions(null); // 画像がない場合はリセット
    }

    setOpenEditDialog(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);

        // 画像の実際のサイズを取得
        const img = new Image();
        img.onload = () => {
          setImageDimensions({ width: img.width, height: img.height });
          setCropPosition({ x: 0.5, y: 0.5 }); // 初期位置は中央
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = async () => {
    if (!selectedCategory) return;

    let uploadedImageUrl = imagePreview;

    // 新しい画像がアップロードされた場合、トリミングしてCloudinaryにアップロード
    if (imageFile && imageDimensions) {
      console.log('画像アップロード開始:', imageFile.name);
      console.log('cropPosition:', cropPosition);

      try {
        // Canvasで画像をトリミング
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          alert('Canvas初期化エラー');
          return;
        }

        // トリミング範囲を計算（objectFit: 'cover' と同じロジック）
        const targetSize = 120;
        const imgAspect = imageDimensions.width / imageDimensions.height;
        const targetAspect = 1;

        let visibleWidth, visibleHeight, cropLeft, cropTop;

        if (imgAspect > targetAspect) {
          // 横長の画像
          visibleHeight = imageDimensions.height;
          visibleWidth = imageDimensions.height * targetAspect;
          const maxCropX = imageDimensions.width - visibleWidth;
          cropLeft = maxCropX * cropPosition.x;
          cropTop = 0;
        } else {
          // 縦長の画像
          visibleWidth = imageDimensions.width;
          visibleHeight = imageDimensions.width / targetAspect;
          const maxCropY = imageDimensions.height - visibleHeight;
          cropLeft = 0;
          cropTop = maxCropY * cropPosition.y;
        }

        // Canvasサイズを正方形に設定
        canvas.width = visibleWidth;
        canvas.height = visibleHeight;

        // 元画像を読み込んでトリミング
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = imagePreview;
        });

        // トリミングして描画
        ctx.drawImage(
          img,
          cropLeft, cropTop, visibleWidth, visibleHeight,  // ソース範囲
          0, 0, visibleWidth, visibleHeight                // 描画範囲
        );

        // CanvasをBlobに変換
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => {
            if (b) resolve(b);
            else reject(new Error('Blob変換失敗'));
          }, 'image/jpeg', 0.9);
        });

        // Cloudinaryにアップロード
        const formData = new FormData();
        formData.append('file', blob, 'cropped-image.jpg');
        formData.append('upload_preset', 'ml_default');

        console.log('Cloudinary URL:', `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`);
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
          {
            method: 'POST',
            body: formData,
          }
        );

        const data = await response.json();
        console.log('Cloudinaryレスポンス:', data);

        // エラーチェック
        if (data.error) {
          console.error('Cloudinaryエラー:', data.error);
          alert(`画像のアップロードに失敗しました: ${data.error.message}`);
          return;
        }

        if (!data.secure_url) {
          console.error('secure_urlが見つかりません:', data);
          alert('画像のアップロードに失敗しました: URLが取得できませんでした');
          return;
        }

        uploadedImageUrl = data.secure_url;
        console.log('アップロード成功:', uploadedImageUrl);
      } catch (error) {
        console.error('画像アップロードエラー:', error);
        alert('画像のアップロードに失敗しました');
        return;
      }
    }

    console.log('カテゴリー更新データ:', {
      categoryId,
      name: categoryName,
      subtitle,
      imageUrl: uploadedImageUrl,
    });

    updateMutation.mutate({
      id: selectedCategory.id,
      data: {
        categoryId: categoryId,
        name: categoryName,
        subtitle: subtitle,
        imageUrl: uploadedImageUrl || undefined,
        cropPositionX: cropPosition.x,
        cropPositionY: cropPosition.y,
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
            <Button
              variant="outlined"
              component="label"
              fullWidth
              sx={{ py: 1.5 }}
            >
              画像を選択
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleImageChange}
              />
            </Button>
            {imagePreview && imageDimensions && (() => {
              // objectFit: 'cover' のトリミング計算
              const targetSize = 120; // 表示サイズ
              const imgAspect = imageDimensions.width / imageDimensions.height;
              const targetAspect = 1; // 正方形

              let visibleWidth, visibleHeight, cropLeft, cropTop, maxCropX, maxCropY;

              if (imgAspect > targetAspect) {
                // 横長の画像: 高さを基準に、左右がトリミングされる
                visibleHeight = imageDimensions.height;
                visibleWidth = imageDimensions.height * targetAspect;
                maxCropX = imageDimensions.width - visibleWidth;
                maxCropY = 0;
                cropLeft = maxCropX * cropPosition.x;
                cropTop = 0;
              } else {
                // 縦長の画像: 幅を基準に、上下がトリミングされる
                visibleWidth = imageDimensions.width;
                visibleHeight = imageDimensions.width / targetAspect;
                maxCropX = 0;
                maxCropY = imageDimensions.height - visibleHeight;
                cropLeft = 0;
                cropTop = maxCropY * cropPosition.y;
              }

              // プレビュー表示サイズの計算（最大300pxに収める）
              const maxPreviewSize = 300;
              const previewScale = Math.min(maxPreviewSize / imageDimensions.width, maxPreviewSize / imageDimensions.height);
              const previewWidth = imageDimensions.width * previewScale;
              const previewHeight = imageDimensions.height * previewScale;

              // トリミング範囲のプレビュー上での位置とサイズ
              const previewCropLeft = cropLeft * previewScale;
              const previewCropTop = cropTop * previewScale;
              const previewVisibleWidth = visibleWidth * previewScale;
              const previewVisibleHeight = visibleHeight * previewScale;

              // ドラッグハンドラー
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
                    // 横長の画像: X方向に移動可能
                    const newX = startPosX + deltaX / (maxCropX * previewScale);
                    setCropPosition({ x: Math.max(0, Math.min(1, newX)), y: 0.5 });
                  } else if (maxCropY > 0) {
                    // 縦長の画像: Y方向に移動可能
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
                  {/* 編集用プレビュー */}
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#666' }}>
                      編集（青い枠をドラッグして表示範囲を調整）
                    </Typography>
                    <Box
                      sx={{
                        position: 'relative',
                        display: 'inline-block',
                        width: `${previewWidth}px`,
                        height: `${previewHeight}px`,
                      }}
                    >
                      {/* 元画像 */}
                      <Box
                        component="img"
                        src={imagePreview}
                        alt="元画像"
                        sx={{
                          width: '100%',
                          height: '100%',
                          display: 'block',
                          borderRadius: '8px',
                          userSelect: 'none',
                        }}
                      />

                    {/* 表示範囲の枠線（ドラッグ可能） - 最前面に配置 */}
                    <Box
                      onMouseDown={handleMouseDown}
                      sx={{
                        position: 'absolute',
                        top: `${previewCropTop}px`,
                        left: `${previewCropLeft}px`,
                        width: `${previewVisibleWidth}px`,
                        height: `${previewVisibleHeight}px`,
                        border: '3px solid #667eea',
                        borderRadius: '8px',
                        boxSizing: 'border-box',
                        cursor: maxCropX > 0 ? 'ew-resize' : maxCropY > 0 ? 'ns-resize' : 'default',
                        transition: 'box-shadow 0.2s',
                        zIndex: 10,
                        '&:hover': {
                          boxShadow: '0 0 0 4px rgba(102, 126, 234, 0.2)',
                        },
                        '&:active': {
                          boxShadow: '0 0 0 4px rgba(102, 126, 234, 0.4)',
                        },
                      }}
                    >
                      {/* ドラッグハンドル表示 */}
                      <Box
                        sx={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          backgroundColor: 'rgba(102, 126, 234, 0.8)',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 600,
                          pointerEvents: 'none',
                          userSelect: 'none',
                        }}
                      >
                        ドラッグ
                      </Box>
                    </Box>

                    {/* トリミングマスク（斜線パターン） */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        pointerEvents: 'none',
                      }}
                    >
                      {/* 横長の画像: 左右にグレー斜線 */}
                      {maxCropX > 0 && (
                        <>
                          {/* 左側のグレー斜線 */}
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              bottom: 0,
                              width: `${previewCropLeft}px`,
                              background: `repeating-linear-gradient(
                                45deg,
                                rgba(128, 128, 128, 0.7),
                                rgba(128, 128, 128, 0.7) 8px,
                                rgba(160, 160, 160, 0.7) 8px,
                                rgba(160, 160, 160, 0.7) 16px
                              )`,
                              borderRadius: '8px 0 0 8px',
                            }}
                          />

                          {/* 右側のグレー斜線 */}
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 0,
                              right: 0,
                              bottom: 0,
                              width: `${previewWidth - previewCropLeft - previewVisibleWidth}px`,
                              background: `repeating-linear-gradient(
                                45deg,
                                rgba(128, 128, 128, 0.7),
                                rgba(128, 128, 128, 0.7) 8px,
                                rgba(160, 160, 160, 0.7) 8px,
                                rgba(160, 160, 160, 0.7) 16px
                              )`,
                              borderRadius: '0 8px 8px 0',
                            }}
                          />
                        </>
                      )}

                      {/* 縦長の画像: 上下にグレー斜線 */}
                      {maxCropY > 0 && (
                        <>
                          {/* 上側のグレー斜線 */}
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              height: `${previewCropTop}px`,
                              background: `repeating-linear-gradient(
                                45deg,
                                rgba(128, 128, 128, 0.7),
                                rgba(128, 128, 128, 0.7) 8px,
                                rgba(160, 160, 160, 0.7) 8px,
                                rgba(160, 160, 160, 0.7) 16px
                              )`,
                              borderRadius: '8px 8px 0 0',
                            }}
                          />

                          {/* 下側のグレー斜線 */}
                          <Box
                            sx={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              height: `${previewHeight - previewCropTop - previewVisibleHeight}px`,
                              background: `repeating-linear-gradient(
                                45deg,
                                rgba(128, 128, 128, 0.7),
                                rgba(128, 128, 128, 0.7) 8px,
                                rgba(160, 160, 160, 0.7) 8px,
                                rgba(160, 160, 160, 0.7) 16px
                              )`,
                              borderRadius: '0 0 8px 8px',
                            }}
                          />
                        </>
                      )}
                    </Box>
                  </Box>
                  </Box>

                  {/* 実際の表示プレビュー */}
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#666' }}>
                      実際の表示
                    </Typography>
                    <Box
                      component="img"
                      src={imagePreview}
                      alt="実際の表示"
                      sx={{
                        width: '120px',
                        height: '120px',
                        objectFit: 'cover',
                        objectPosition: `${cropPosition.x * 100}% ${cropPosition.y * 100}%`,
                        borderRadius: '8px',
                        border: '2px solid #e0e0e0',
                      }}
                    />
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
            <Button
              variant="outlined"
              component="label"
              fullWidth
              sx={{ py: 1.5 }}
            >
              画像を選択
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleImageChange}
              />
            </Button>
            {imagePreview && imageDimensions && (() => {
              // objectFit: 'cover' のトリミング計算
              const targetSize = 120; // 表示サイズ
              const imgAspect = imageDimensions.width / imageDimensions.height;
              const targetAspect = 1; // 正方形

              let visibleWidth, visibleHeight, cropLeft, cropTop, maxCropX, maxCropY;

              if (imgAspect > targetAspect) {
                // 横長の画像: 高さを基準に、左右がトリミングされる
                visibleHeight = imageDimensions.height;
                visibleWidth = imageDimensions.height * targetAspect;
                maxCropX = imageDimensions.width - visibleWidth;
                maxCropY = 0;
                cropLeft = maxCropX * cropPosition.x;
                cropTop = 0;
              } else {
                // 縦長の画像: 幅を基準に、上下がトリミングされる
                visibleWidth = imageDimensions.width;
                visibleHeight = imageDimensions.width / targetAspect;
                maxCropX = 0;
                maxCropY = imageDimensions.height - visibleHeight;
                cropLeft = 0;
                cropTop = maxCropY * cropPosition.y;
              }

              // プレビュー表示サイズの計算（最大300pxに収める）
              const maxPreviewSize = 300;
              const previewScale = Math.min(maxPreviewSize / imageDimensions.width, maxPreviewSize / imageDimensions.height);
              const previewWidth = imageDimensions.width * previewScale;
              const previewHeight = imageDimensions.height * previewScale;

              // トリミング範囲のプレビュー上での位置とサイズ
              const previewCropLeft = cropLeft * previewScale;
              const previewCropTop = cropTop * previewScale;
              const previewVisibleWidth = visibleWidth * previewScale;
              const previewVisibleHeight = visibleHeight * previewScale;

              // ドラッグハンドラー
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
                    // 横長の画像: X方向に移動可能
                    const newX = startPosX + deltaX / (maxCropX * previewScale);
                    setCropPosition({ x: Math.max(0, Math.min(1, newX)), y: 0.5 });
                  } else if (maxCropY > 0) {
                    // 縦長の画像: Y方向に移動可能
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
                  {/* 編集用プレビュー */}
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#666' }}>
                      編集（青い枠をドラッグして表示範囲を調整）
                    </Typography>
                    <Box
                      sx={{
                        position: 'relative',
                        display: 'inline-block',
                        width: `${previewWidth}px`,
                        height: `${previewHeight}px`,
                      }}
                    >
                      {/* 元画像 */}
                      <Box
                        component="img"
                        src={imagePreview}
                        alt="元画像"
                        sx={{
                          width: '100%',
                          height: '100%',
                          display: 'block',
                          borderRadius: '8px',
                          userSelect: 'none',
                        }}
                      />

                    {/* 表示範囲の枠線（ドラッグ可能） - 最前面に配置 */}
                    <Box
                      onMouseDown={handleMouseDown}
                      sx={{
                        position: 'absolute',
                        top: `${previewCropTop}px`,
                        left: `${previewCropLeft}px`,
                        width: `${previewVisibleWidth}px`,
                        height: `${previewVisibleHeight}px`,
                        border: '3px solid #667eea',
                        borderRadius: '8px',
                        boxSizing: 'border-box',
                        cursor: maxCropX > 0 ? 'ew-resize' : maxCropY > 0 ? 'ns-resize' : 'default',
                        transition: 'box-shadow 0.2s',
                        zIndex: 10,
                        '&:hover': {
                          boxShadow: '0 0 0 4px rgba(102, 126, 234, 0.2)',
                        },
                        '&:active': {
                          boxShadow: '0 0 0 4px rgba(102, 126, 234, 0.4)',
                        },
                      }}
                    >
                      {/* ドラッグハンドル表示 */}
                      <Box
                        sx={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          backgroundColor: 'rgba(102, 126, 234, 0.8)',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 600,
                          pointerEvents: 'none',
                          userSelect: 'none',
                        }}
                      >
                        ドラッグ
                      </Box>
                    </Box>

                    {/* トリミングマスク（斜線パターン） */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        pointerEvents: 'none',
                      }}
                    >
                      {/* 横長の画像: 左右にグレー斜線 */}
                      {maxCropX > 0 && (
                        <>
                          {/* 左側のグレー斜線 */}
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              bottom: 0,
                              width: `${previewCropLeft}px`,
                              background: `repeating-linear-gradient(
                                45deg,
                                rgba(128, 128, 128, 0.7),
                                rgba(128, 128, 128, 0.7) 8px,
                                rgba(160, 160, 160, 0.7) 8px,
                                rgba(160, 160, 160, 0.7) 16px
                              )`,
                              borderRadius: '8px 0 0 8px',
                            }}
                          />

                          {/* 右側のグレー斜線 */}
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 0,
                              right: 0,
                              bottom: 0,
                              width: `${previewWidth - previewCropLeft - previewVisibleWidth}px`,
                              background: `repeating-linear-gradient(
                                45deg,
                                rgba(128, 128, 128, 0.7),
                                rgba(128, 128, 128, 0.7) 8px,
                                rgba(160, 160, 160, 0.7) 8px,
                                rgba(160, 160, 160, 0.7) 16px
                              )`,
                              borderRadius: '0 8px 8px 0',
                            }}
                          />
                        </>
                      )}

                      {/* 縦長の画像: 上下にグレー斜線 */}
                      {maxCropY > 0 && (
                        <>
                          {/* 上側のグレー斜線 */}
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              height: `${previewCropTop}px`,
                              background: `repeating-linear-gradient(
                                45deg,
                                rgba(128, 128, 128, 0.7),
                                rgba(128, 128, 128, 0.7) 8px,
                                rgba(160, 160, 160, 0.7) 8px,
                                rgba(160, 160, 160, 0.7) 16px
                              )`,
                              borderRadius: '8px 8px 0 0',
                            }}
                          />

                          {/* 下側のグレー斜線 */}
                          <Box
                            sx={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              height: `${previewHeight - previewCropTop - previewVisibleHeight}px`,
                              background: `repeating-linear-gradient(
                                45deg,
                                rgba(128, 128, 128, 0.7),
                                rgba(128, 128, 128, 0.7) 8px,
                                rgba(160, 160, 160, 0.7) 8px,
                                rgba(160, 160, 160, 0.7) 16px
                              )`,
                              borderRadius: '0 0 8px 8px',
                            }}
                          />
                        </>
                      )}
                    </Box>
                  </Box>
                  </Box>

                  {/* 実際の表示プレビュー */}
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#666' }}>
                      実際の表示
                    </Typography>
                    <Box
                      component="img"
                      src={imagePreview}
                      alt="実際の表示"
                      sx={{
                        width: '120px',
                        height: '120px',
                        objectFit: 'cover',
                        objectPosition: `${cropPosition.x * 100}% ${cropPosition.y * 100}%`,
                        borderRadius: '8px',
                        border: '2px solid #e0e0e0',
                      }}
                    />
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
    </Box>
  );
};
