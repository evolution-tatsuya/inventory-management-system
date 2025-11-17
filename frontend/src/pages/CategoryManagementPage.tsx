import { useState } from 'react';
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
  Container,
  Avatar,
  Checkbox,
  Tooltip,
} from '@mui/material';
import {
  Edit,
  Delete,
  Add,
  DragIndicator,
  DeleteOutline,
  Image as ImageIcon,
} from '@mui/icons-material';
import { MainLayout } from '@/layouts/MainLayout';
import { ImageEditorDialog } from '@/components/ImageEditorDialog';

// ============================================================
// CategoryManagementPage (A-002)
// ============================================================
// カテゴリー管理ページ
// - カテゴリー一覧表示
// - 新規追加フォーム
// - 編集フォーム
// - 削除ボタン
// - 並び替え機能（ドラッグ&ドロップ）
// ============================================================

interface Category {
  id: string;
  name: string;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}

// TODO: バックエンド実装後、APIから取得
const MOCK_CATEGORIES: Category[] = [
  {
    id: '1',
    name: 'GT3-048',
    imageUrl: '',
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
  },
  {
    id: '2',
    name: 'GT3-049',
    imageUrl: '',
    createdAt: '2025-01-11T11:00:00Z',
    updatedAt: '2025-01-11T11:00:00Z',
  },
  {
    id: '3',
    name: '991 GT3 RS',
    imageUrl: '',
    createdAt: '2025-01-12T12:00:00Z',
    updatedAt: '2025-01-12T12:00:00Z',
  },
  {
    id: '4',
    name: 'Cayman GT4',
    imageUrl: '',
    createdAt: '2025-01-13T13:00:00Z',
    updatedAt: '2025-01-13T13:00:00Z',
  },
];

export const CategoryManagementPage = () => {
  const [categories, setCategories] = useState<Category[]>(MOCK_CATEGORIES);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [tempCategoryImage, setTempCategoryImage] = useState(''); // 編集ダイアログ用の一時画像
  const [originalCategoryImage, setOriginalCategoryImage] = useState(''); // 元の画像（編集前）
  const [editorSettings, setEditorSettings] = useState<{ scale: number; position: { x: number; y: number }; backgroundColor: string }>({
    scale: 1,
    position: { x: 0, y: 0 },
    backgroundColor: '#FFFFFF',
  }); // 画像エディターの設定

  // Image editor state
  const [openImageEditor, setOpenImageEditor] = useState(false);
  const [editingImageUrl, setEditingImageUrl] = useState<string>('');
  const [openImageDialog, setOpenImageDialog] = useState(false);

  // 新規追加ダイアログを開く
  const handleOpenAddDialog = () => {
    setCategoryName('');
    setImageFile(null);
    setImagePreview('');
    setTempCategoryImage(''); // 一時画像をクリア
    setOriginalCategoryImage(''); // 元の画像をクリア
    setEditorSettings({ scale: 1, position: { x: 0, y: 0 }, backgroundColor: '#FFFFFF' }); // 設定をリセット
    setOpenAddDialog(true);
  };

  // 画像選択
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result as string;
        setEditingImageUrl(imageUrl);
        setOpenImageEditor(true);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  // 新規追加
  const handleAdd = () => {
    const newCategory: Category = {
      id: Date.now().toString(),
      name: categoryName,
      imageUrl: tempCategoryImage || 'https://picsum.photos/seed/default/200/150',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCategories([...categories, newCategory]);
    setOpenAddDialog(false);
    setCategoryName('');
    setImageFile(null);
    setImagePreview('');
    setTempCategoryImage(''); // 一時画像をクリア
    setOriginalCategoryImage(''); // 元の画像をクリア
  };

  // 編集ダイアログを開く
  const handleOpenEditDialog = (category: Category) => {
    setSelectedCategory(category);
    setCategoryName(category.name);
    setImagePreview(category.imageUrl);
    setTempCategoryImage(category.imageUrl); // 一時画像に現在の画像をセット
    setOriginalCategoryImage(category.imageUrl); // 元の画像を保存（編集用）
    setImageFile(null);
    setOpenEditDialog(true);
  };

  // 編集
  const handleEdit = () => {
    if (!selectedCategory) return;

    setCategories(
      categories.map((cat) =>
        cat.id === selectedCategory.id
          ? {
              ...cat,
              name: categoryName,
              imageUrl: tempCategoryImage || cat.imageUrl, // 空の場合は元の画像を保持
              updatedAt: new Date().toISOString(),
            }
          : cat
      )
    );
    setOpenEditDialog(false);
    setSelectedCategory(null);
    setCategoryName('');
    setImageFile(null);
    setImagePreview('');
    setTempCategoryImage(''); // 一時画像をクリア
    setOriginalCategoryImage(''); // 元の画像をクリア
  };

  // 削除確認ダイアログを開く
  const handleOpenDeleteDialog = (category: Category) => {
    setSelectedCategory(category);
    setOpenDeleteDialog(true);
  };

  // 削除
  const handleDelete = () => {
    if (!selectedCategory) return;

    setCategories(categories.filter((cat) => cat.id !== selectedCategory.id));
    setOpenDeleteDialog(false);
    setSelectedCategory(null);
  };

  // ドラッグ開始
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index.toString());
  };

  // ドラッグオーバー
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // ドロップ
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/html'), 10);

    if (dragIndex === dropIndex) return;

    const newCategories = [...categories];
    const [removed] = newCategories.splice(dragIndex, 1);
    newCategories.splice(dropIndex, 0, removed);

    setCategories(newCategories);
  };

  // チェックボックス選択
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(categories.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
    }
  };

  // 一括削除
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setCategories(categories.filter((cat) => !selectedIds.includes(cat.id)));
    setSelectedIds([]);
  };

  // 画像編集ダイアログを開く
  const handleOpenImageDialog = () => {
    setOpenImageDialog(true);
  };

  // 画像アップロード（画像編集ダイアログ内から）
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      setEditingImageUrl(imageUrl);
      setOpenImageEditor(true);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  // 編集ダイアログ内の画像アップロード
  const handleEditDialogImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      setOriginalCategoryImage(imageUrl); // 新しい画像を元の画像として保存
      setEditingImageUrl(imageUrl);
      // 新しい画像の場合は設定をリセット
      setEditorSettings({ scale: 1, position: { x: 0, y: 0 }, backgroundColor: '#FFFFFF' });
      setOpenImageEditor(true);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  // 画像エディターから保存
  const handleSaveEditedImage = (editedImageUrl: string, settings?: { scale: number; position: { x: number; y: number }; backgroundColor: string }) => {
    // 設定を保存
    if (settings) {
      setEditorSettings(settings);
    }

    // 編集ダイアログから呼ばれた場合は一時画像に保存
    if (openEditDialog || openAddDialog) {
      setTempCategoryImage(editedImageUrl);
      // selectedCategoryはクリアしない（編集ダイアログで必要）
    }
    // テーブルから直接編集した場合（selectedCategoryがある＋編集ダイアログが開いていない）
    else if (selectedCategory) {
      setCategories(
        categories.map((cat) =>
          cat.id === selectedCategory.id
            ? { ...cat, imageUrl: editedImageUrl, updatedAt: new Date().toISOString() }
            : cat
        )
      );
      setSelectedCategory(null);
    }
    // 画像編集専用ダイアログから呼ばれた場合
    else {
      setImagePreview(editedImageUrl);
    }
    setOpenImageEditor(false);
  };

  // 画像エディターキャンセル
  const handleCancelImageEditor = () => {
    setOpenImageEditor(false);
    // 編集ダイアログが開いていない場合のみselectedCategoryをクリア
    if (!openEditDialog && !openAddDialog) {
      setSelectedCategory(null);
    }
  };

  // 画像削除
  const handleImageDelete = () => {
    setImagePreview('');
  };

  // 編集ダイアログ用画像削除
  const handleEditDialogImageDelete = () => {
    setTempCategoryImage('');
    setOriginalCategoryImage('');
  };

  // 編集キャンセル
  const handleCancelEdit = () => {
    setOpenEditDialog(false);
    setSelectedCategory(null);
    setCategoryName('');
    setImageFile(null);
    setImagePreview('');
    setTempCategoryImage(''); // 一時画像をクリア
    setOriginalCategoryImage(''); // 元の画像をクリア
  };

  // 追加キャンセル
  const handleCancelAdd = () => {
    setOpenAddDialog(false);
    setCategoryName('');
    setImageFile(null);
    setImagePreview('');
    setTempCategoryImage(''); // 一時画像をクリア
    setOriginalCategoryImage(''); // 元の画像をクリア
  };

  // 画像ダイアログを閉じる
  const handleCloseImageDialog = () => {
    setOpenImageDialog(false);
  };

  return (
    <MainLayout>
      <Container maxWidth="lg">
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                カテゴリー管理
              </Typography>
              <Typography variant="body2" color="text.secondary">
                カテゴリーの追加、編集、削除、並び替えができます
              </Typography>
            </Box>
          </Box>

          {/* アクションボタン */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleOpenAddDialog}
              size="large"
            >
              新規追加
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<DeleteOutline />}
              onClick={handleBulkDelete}
              disabled={selectedIds.length === 0}
              size="large"
            >
              一括削除 ({selectedIds.length})
            </Button>
          </Box>
        </Box>

        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'grey.100' }}>
                <TableCell padding="checkbox" width={50}>
                  <Checkbox
                    checked={selectedIds.length === categories.length && categories.length > 0}
                    indeterminate={selectedIds.length > 0 && selectedIds.length < categories.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableCell>
                <TableCell width={50}></TableCell>
                <TableCell width={100} sx={{ fontWeight: 600 }}>画像</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>カテゴリー名</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>作成日時</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>更新日時</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.map((category, index) => (
                <TableRow
                  key={category.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  sx={{
                    cursor: 'move',
                    '&:hover': { backgroundColor: 'grey.50' },
                  }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedIds.includes(category.id)}
                      onChange={(e) => handleSelectOne(category.id, e.target.checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <DragIndicator sx={{ color: 'grey.400' }} />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="クリックして編集" arrow>
                      <Avatar
                        src={category.imageUrl}
                        variant="rounded"
                        imgProps={{
                          style: { objectFit: 'contain' },
                        }}
                        sx={{
                          width: 160,
                          height: 90,
                          cursor: 'pointer',
                          bgcolor: 'grey.100',
                          '&:hover': {
                            opacity: 0.7,
                            boxShadow: '0 0 0 2px #1976d2',
                          },
                        }}
                        onClick={() => {
                          if (category.imageUrl) {
                            // 既存画像がある場合は編集
                            setSelectedCategory(category);
                            setEditingImageUrl(category.imageUrl);
                            setOpenImageEditor(true);
                          } else {
                            // 画像がない場合は新規アップロードダイアログを開く
                            setSelectedCategory(category);
                            document.getElementById(`category-image-upload-${category.id}`)?.click();
                          }
                        }}
                      >
                        <ImageIcon />
                      </Avatar>
                    </Tooltip>
                    {/* 非表示のファイル入力 */}
                    <input
                      id={`category-image-upload-${category.id}`}
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const imageUrl = event.target?.result as string;
                          setSelectedCategory(category);
                          setEditingImageUrl(imageUrl);
                          setOpenImageEditor(true);
                        };
                        reader.readAsDataURL(file);
                        e.target.value = '';
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: 500 }}>{category.name}</Typography>
                  </TableCell>
                  <TableCell>
                    {new Date(category.createdAt).toLocaleString('ja-JP')}
                  </TableCell>
                  <TableCell>
                    {new Date(category.updatedAt).toLocaleString('ja-JP')}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleOpenEditDialog(category)}
                      sx={{ mr: 1 }}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleOpenDeleteDialog(category)}
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* 新規追加ダイアログ */}
        <Dialog open={openAddDialog} onClose={handleCancelAdd} maxWidth="sm" fullWidth>
          <DialogTitle>カテゴリー新規追加</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="カテゴリー名"
              fullWidth
              variant="outlined"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              sx={{ mt: 2 }}
            />

            <Box sx={{ mt: 3 }}>
              {/* 現在の画像 */}
              <Typography variant="subtitle2" gutterBottom>
                現在の画像
              </Typography>
              {tempCategoryImage ? (
                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                  <Box
                    onClick={() => {
                      setEditingImageUrl(tempCategoryImage);
                      setOriginalCategoryImage(tempCategoryImage); // 編集済み画像を新しい元画像にする
                      setEditorSettings({ scale: 1, position: { x: 0, y: 0 }, backgroundColor: '#FFFFFF' }); // 設定リセット
                      setOpenImageEditor(true);
                    }}
                    sx={{
                      cursor: 'pointer',
                      position: 'relative',
                      display: 'inline-block',
                      '&:hover': {
                        opacity: 0.8,
                      },
                      '&::after': {
                        content: '"クリックして編集"',
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        bgcolor: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        padding: '8px 16px',
                        borderRadius: 1,
                        opacity: 0,
                        transition: 'opacity 0.3s',
                        pointerEvents: 'none',
                        fontSize: '14px',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      },
                      '&:hover::after': {
                        opacity: 1,
                      },
                    }}
                  >
                    <img
                      src={tempCategoryImage}
                      alt="プレビュー"
                      style={{ width: '100%', height: 'auto', borderRadius: 4, display: 'block' }}
                    />
                  </Box>
                  <Button
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      bgcolor: 'background.paper',
                      '&:hover': { bgcolor: 'error.light', color: 'white' },
                      minWidth: 'auto',
                      px: 1,
                      zIndex: 1,
                    }}
                    size="small"
                    onClick={handleEditDialogImageDelete}
                    startIcon={<Delete />}
                    title="画像を削除"
                  >
                    削除
                  </Button>
                </Box>
              ) : (
                <Box
                  sx={{
                    border: '2px dashed',
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 3,
                    textAlign: 'center',
                    color: 'text.secondary',
                  }}
                >
                  <Typography variant="body2">画像が設定されていません</Typography>
                </Box>
              )}

              <Button
                variant="outlined"
                component="label"
                startIcon={<ImageIcon />}
                fullWidth
                sx={{ mt: 2 }}
              >
                {tempCategoryImage ? '画像を変更' : '画像をアップロード'}
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleEditDialogImageUpload}
                />
              </Button>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancelAdd}>キャンセル</Button>
            <Button
              onClick={handleAdd}
              variant="contained"
              disabled={!categoryName.trim()}
            >
              追加
            </Button>
          </DialogActions>
        </Dialog>

        {/* 編集ダイアログ */}
        <Dialog open={openEditDialog} onClose={handleCancelEdit} maxWidth="sm" fullWidth>
          <DialogTitle>カテゴリー編集</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="カテゴリー名"
              fullWidth
              variant="outlined"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              sx={{ mt: 2 }}
            />

            <Box sx={{ mt: 3 }}>
              {/* 現在の画像 */}
              <Typography variant="subtitle2" gutterBottom>
                現在の画像
              </Typography>
              {tempCategoryImage ? (
                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                  <Box
                    onClick={() => {
                      setEditingImageUrl(tempCategoryImage);
                      setOriginalCategoryImage(tempCategoryImage); // 編集済み画像を新しい元画像にする
                      setEditorSettings({ scale: 1, position: { x: 0, y: 0 }, backgroundColor: '#FFFFFF' }); // 設定リセット
                      setOpenImageEditor(true);
                    }}
                    sx={{
                      cursor: 'pointer',
                      position: 'relative',
                      display: 'inline-block',
                      '&:hover': {
                        opacity: 0.8,
                      },
                      '&::after': {
                        content: '"クリックして編集"',
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        bgcolor: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        padding: '8px 16px',
                        borderRadius: 1,
                        opacity: 0,
                        transition: 'opacity 0.3s',
                        pointerEvents: 'none',
                        fontSize: '14px',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      },
                      '&:hover::after': {
                        opacity: 1,
                      },
                    }}
                  >
                    <img
                      src={tempCategoryImage}
                      alt="プレビュー"
                      style={{ width: '100%', height: 'auto', borderRadius: 4, display: 'block' }}
                    />
                  </Box>
                  <Button
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      bgcolor: 'background.paper',
                      '&:hover': { bgcolor: 'error.light', color: 'white' },
                      minWidth: 'auto',
                      px: 1,
                      zIndex: 1,
                    }}
                    size="small"
                    onClick={handleEditDialogImageDelete}
                    startIcon={<Delete />}
                    title="画像を削除"
                  >
                    削除
                  </Button>
                </Box>
              ) : (
                <Box
                  sx={{
                    border: '2px dashed',
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 3,
                    textAlign: 'center',
                    color: 'text.secondary',
                  }}
                >
                  <Typography variant="body2">画像が設定されていません</Typography>
                </Box>
              )}

              <Button
                variant="outlined"
                component="label"
                startIcon={<ImageIcon />}
                fullWidth
                sx={{ mt: 2 }}
              >
                {tempCategoryImage ? '画像を変更' : '画像をアップロード'}
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleEditDialogImageUpload}
                />
              </Button>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancelEdit}>キャンセル</Button>
            <Button
              onClick={handleEdit}
              variant="contained"
            >
              保存
            </Button>
          </DialogActions>
        </Dialog>

        {/* 削除確認ダイアログ */}
        <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>カテゴリー削除確認</DialogTitle>
          <DialogContent>
            <Typography>
              カテゴリー「{selectedCategory?.name}」を削除してもよろしいですか？
            </Typography>
            <Typography variant="body2" color="error" sx={{ mt: 2 }}>
              ※ このカテゴリーに紐づくジャンルとパーツもすべて削除されます。
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDeleteDialog(false)}>キャンセル</Button>
            <Button onClick={handleDelete} variant="contained" color="error">
              削除
            </Button>
          </DialogActions>
        </Dialog>

        {/* 画像編集ダイアログ */}
        <Dialog open={openImageDialog} onClose={handleCloseImageDialog} maxWidth="md" fullWidth>
          <DialogTitle>カテゴリー画像を編集</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              {/* 現在の画像 */}
              {imagePreview ? (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    現在の画像
                  </Typography>
                  <Box sx={{ position: 'relative', display: 'inline-block' }}>
                    <img
                      src={imagePreview}
                      alt="現在の画像"
                      style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 4 }}
                    />
                    <Button
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        bgcolor: 'background.paper',
                        '&:hover': { bgcolor: 'error.light', color: 'white' },
                        minWidth: 'auto',
                        px: 1,
                      }}
                      size="small"
                      onClick={handleImageDelete}
                      startIcon={<Delete />}
                      title="画像を削除"
                    >
                      削除
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  画像が設定されていません
                </Typography>
              )}

              {/* 画像を変更ボタン */}
              <Button
                variant="contained"
                component="label"
                startIcon={<ImageIcon />}
                fullWidth
                size="large"
              >
                画像を変更
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </Button>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseImageDialog} variant="outlined">
              キャンセル
            </Button>
            <Button onClick={handleCloseImageDialog} variant="contained" color="primary">
              保存
            </Button>
          </DialogActions>
        </Dialog>

        {/* ImageEditorDialog */}
        <ImageEditorDialog
          open={openImageEditor}
          imageUrl={editingImageUrl}
          onClose={handleCancelImageEditor}
          onSave={handleSaveEditedImage}
          title="カテゴリー画像を編集"
          initialScale={editorSettings.scale}
          initialPosition={editorSettings.position}
          initialBackgroundColor={editorSettings.backgroundColor}
        />
      </Container>
    </MainLayout>
  );
};
