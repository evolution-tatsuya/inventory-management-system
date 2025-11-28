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
import { unitsApi, genresApi, categoriesApi } from '@/services/api';
import type { Unit } from '@/types';
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
  unit: Unit & { genreName?: string; partsCount?: number };
  onEdit: (unit: Unit) => void;
  onDelete: (unit: Unit) => void;
  sortable?: boolean;
}

const SortableRow = ({ unit, onEdit, onDelete, sortable = true }: SortableRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: unit.id, disabled: !sortable });

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
        '&:hover': { background: '#f8f9fa' },
        cursor: isDragging ? 'grabbing' : 'default',
        transition: 'background 0.2s ease',
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
        {unit.imageUrl ? (
          <Box
            component="img"
            src={unit.imageUrl}
            alt={unit.unitName}
            sx={{
              width: '60px',
              height: '60px',
              borderRadius: '6px',
              objectFit: 'cover',
              objectPosition: `${(unit.cropPositionX ?? 0.5) * 100}% ${(unit.cropPositionY ?? 0.5) * 100}%`,
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
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '12px',
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              margin: '0 auto',
            }}
          >
            {unit.unitName ? unit.unitName.substring(0, 2) : 'UN'}
          </Box>
        )}
      </TableCell>
      <TableCell sx={{ padding: '12px 16px', textAlign: 'center' }}>{unit.unitNumber}</TableCell>
      <TableCell sx={{ padding: '12px 16px', fontWeight: 500 }}>{unit.unitName}</TableCell>
      <TableCell sx={{ padding: '12px 16px', textAlign: 'center' }}>{unit.genreName || '-'}</TableCell>
      <TableCell sx={{ padding: '12px 16px', textAlign: 'center' }}>{unit.partsCount || 0}</TableCell>
      <TableCell sx={{ padding: '12px 16px', textAlign: 'center' }}>
        {new Date(unit.createdAt).toLocaleDateString('ja-JP')}
      </TableCell>
      <TableCell sx={{ padding: '12px 16px', textAlign: 'center' }}>
        <Button
          onClick={() => onEdit(unit)}
          sx={{
            marginRight: '8px',
            background: '#667eea',
            color: 'white',
            padding: '6px 16px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            transition: 'all 0.3s ease',
            '&:hover': {
              background: '#5568d3',
              transform: 'translateY(-2px)',
            },
          }}
        >
          編集
        </Button>
        <Button
          onClick={() => onDelete(unit)}
          sx={{
            background: '#dc3545',
            color: 'white',
            padding: '6px 16px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            transition: 'all 0.3s ease',
            '&:hover': {
              background: '#c82333',
              transform: 'translateY(-2px)',
            },
          }}
        >
          削除
        </Button>
      </TableCell>
    </TableRow>
  );
};

// ============================================================
// UnitManagementPage (A-003)
// ============================================================
// ユニット管理ページ - モックアップ準拠の全画面表示版
// ============================================================

export const UnitManagementPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [unitNumber, setUnitNumber] = useState('');
  const [unitName, setUnitName] = useState('');
  const [genreId, setGenreId] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState<string>(''); // カテゴリーフィルター用
  const [filterGenreId, setFilterGenreId] = useState<string>(''); // ジャンルフィルター用

  // 画像クロップ用
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [cropPosition, setCropPosition] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

  // ユニット一覧取得（全ユニット）
  const { data: units = [], isLoading, isError, error } = useQuery({
    queryKey: ['units'],
    queryFn: unitsApi.getAllUnits,
  });

  // ジャンル一覧取得（ドロップダウン用）
  const { data: genres = [] } = useQuery({
    queryKey: ['genres'],
    queryFn: genresApi.getAllGenres,
  });

  // カテゴリー一覧取得（ドロップダウン用）
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getCategories,
  });

  // フィルターされたジャンル一覧（選択されたカテゴリーに属するジャンルのみ）
  const filteredGenresForSelect = filterCategoryId
    ? genres.filter((genre) => genre.categoryId === filterCategoryId)
    : genres;

  // フィルターされたユニット一覧
  const filteredUnits = units.filter((unit) => {
    // ジャンルフィルターが設定されている場合
    if (filterGenreId) {
      return unit.genreId === filterGenreId;
    }
    // カテゴリーフィルターのみ設定されている場合
    if (filterCategoryId) {
      const genre = genres.find((g) => g.id === unit.genreId);
      return genre?.categoryId === filterCategoryId;
    }
    // フィルターなし
    return true;
  });

  // カテゴリー変更時にジャンルフィルターをリセット
  const handleFilterCategoryChange = (newCategoryId: string) => {
    setFilterCategoryId(newCategoryId);
    setFilterGenreId(''); // ジャンルフィルターをリセット
  };

  // ユニット作成
  const createMutation = useMutation({
    mutationFn: unitsApi.createUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setOpenAddDialog(false);
      setUnitNumber('');
      setUnitName('');
      setGenreId('');
    },
  });

  // ユニット更新
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { unitNumber?: string; unitName: string; imageUrl?: string; cropPositionX?: number; cropPositionY?: number } }) =>
      unitsApi.updateUnit(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      setOpenEditDialog(false);
      setSelectedUnit(null);
      setUnitNumber('');
      setUnitName('');
      setGenreId('');
    },
  });

  // ユニット削除
  const deleteMutation = useMutation({
    mutationFn: unitsApi.deleteUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setOpenDeleteDialog(false);
      setSelectedUnit(null);
    },
  });

  // ユニット並び順更新
  const orderMutation = useMutation({
    mutationFn: unitsApi.updateUnitOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
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
      const oldIndex = filteredUnits.findIndex((u: any) => u.id === active.id);
      const newIndex = filteredUnits.findIndex((u: any) => u.id === over.id);
      const newOrder = arrayMove(filteredUnits, oldIndex, newIndex);

      // 楽観的更新
      queryClient.setQueryData(['units'], (old: any[] | undefined) => {
        if (!old) return newOrder;
        if (!filterGenreId && !filterCategoryId) return newOrder;
        // フィルターされている場合は該当部分のみ更新
        const otherUnits = old.filter((u: any) => !filteredUnits.find((fu: any) => fu.id === u.id));
        return [...otherUnits, ...newOrder];
      });

      // サーバーに保存
      orderMutation.mutate(newOrder.map((u: any) => u.id));
    }
  };

  const handleLogout = () => {
    navigate('/admin/login');
  };

  const handleOpenAddDialog = () => {
    setUnitNumber('');
    setUnitName('');
    // カテゴリーとジャンルが両方選択されている場合、ジャンルを自動選択
    if (filterCategoryId && filterGenreId) {
      setGenreId(filterGenreId);
    } else {
      setGenreId('');
    }
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
    createMutation.mutate({ genreId, unitNumber, unitName, imageUrl: uploadedImageUrl || undefined });
  };

  const handleOpenEditDialog = (unit: Unit) => {
    setSelectedUnit(unit);
    setUnitNumber(unit.unitNumber);
    setUnitName(unit.unitName);
    setGenreId(unit.genreId);
    setImageFile(null);
    setImagePreview(unit.imageUrl || '');
    setCropPosition({
      x: unit.cropPositionX ?? 0.5,
      y: unit.cropPositionY ?? 0.5
    });
    if (unit.imageUrl) {
      const img = new Image();
      img.onload = () => { setImageDimensions({ width: img.width, height: img.height }); };
      img.src = unit.imageUrl;
    } else {
      setImageDimensions(null);
    }
    setOpenEditDialog(true);
  };

  const handleEdit = async () => {
    if (!selectedUnit) return;
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
      id: selectedUnit.id,
      data: {
        unitNumber,
        unitName,
        imageUrl: uploadedImageUrl || undefined,
        cropPositionX: cropPosition.x,
        cropPositionY: cropPosition.y,
      }
    });
  };

  const handleOpenDeleteDialog = (unit: Unit) => {
    setSelectedUnit(unit);
    setOpenDeleteDialog(true);
  };

  const handleDelete = () => {
    if (!selectedUnit) return;
    deleteMutation.mutate(selectedUnit.id);
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
      {/* Header */}
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
          階層型在庫管理システム
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

      {/* Navigation Tabs */}
      <Box
        sx={{
          display: 'flex',
          background: '#f7f7f7',
          borderBottom: '2px solid #e0e0e0',
          overflowX: 'auto',
        }}
      >
        <Button
          onClick={() => navigate('/admin/dashboard')}
          sx={{
            padding: '16px 32px',
            background: 'transparent',
            borderBottom: '3px solid transparent',
            borderRadius: 0,
            fontSize: '15px',
            fontWeight: 600,
            color: '#666',
            transition: 'all 0.3s ease',
            whiteSpace: 'nowrap',
            '&:hover': {
              background: '#e9ecef',
              color: '#667eea',
            },
          }}
        >
          ダッシュボード
        </Button>
        <Button
          onClick={() => navigate('/admin/categories')}
          sx={{
            padding: '16px 32px',
            background: 'transparent',
            borderBottom: '3px solid transparent',
            borderRadius: 0,
            fontSize: '15px',
            fontWeight: 600,
            color: '#666',
            transition: 'all 0.3s ease',
            whiteSpace: 'nowrap',
            '&:hover': {
              background: '#e9ecef',
              color: '#667eea',
            },
          }}
        >
          カテゴリー管理
        </Button>
        <Button
          onClick={() => navigate('/admin/genres')}
          sx={{
            padding: '16px 32px',
            background: 'transparent',
            borderBottom: '3px solid transparent',
            borderRadius: 0,
            fontSize: '15px',
            fontWeight: 600,
            color: '#666',
            transition: 'all 0.3s ease',
            whiteSpace: 'nowrap',
            '&:hover': {
              background: '#e9ecef',
              color: '#667eea',
            },
          }}
        >
          ジャンル管理
        </Button>
        <Button
          onClick={() => navigate('/admin/units')}
          sx={{
            padding: '16px 32px',
            background: 'white',
            borderBottom: '3px solid #667eea',
            borderRadius: 0,
            fontSize: '15px',
            fontWeight: 600,
            color: '#667eea',
            whiteSpace: 'nowrap',
          }}
        >
          ユニット管理
        </Button>
        <Button
          onClick={() => navigate('/admin/parts')}
          sx={{
            padding: '16px 32px',
            background: 'transparent',
            borderBottom: '3px solid transparent',
            borderRadius: 0,
            fontSize: '15px',
            fontWeight: 600,
            color: '#666',
            transition: 'all 0.3s ease',
            whiteSpace: 'nowrap',
            '&:hover': {
              background: '#e9ecef',
              color: '#667eea',
            },
          }}
        >
          パーツ管理
        </Button>
        <Button
          onClick={() => navigate('/admin/account-settings')}
          sx={{
            padding: '16px 32px',
            background: 'transparent',
            borderBottom: '3px solid transparent',
            borderRadius: 0,
            fontSize: '15px',
            fontWeight: 600,
            color: '#666',
            transition: 'all 0.3s ease',
            whiteSpace: 'nowrap',
            '&:hover': {
              background: '#e9ecef',
              color: '#667eea',
            },
          }}
        >
          アカウント設定
        </Button>
        <Button
          onClick={() => navigate('/admin/qr')}
          sx={{
            padding: '16px 32px',
            background: 'transparent',
            borderBottom: '3px solid transparent',
            borderRadius: 0,
            fontSize: '15px',
            fontWeight: 600,
            color: '#666',
            transition: 'all 0.3s ease',
            whiteSpace: 'nowrap',
            '&:hover': {
              background: '#e9ecef',
              color: '#667eea',
            },
          }}
        >
          QRコード
        </Button>
      </Box>

      {/* Content Area */}
      <Box
        sx={{
          background: 'white',
          margin: 0,
          minHeight: 'calc(100vh - 120px)',
          padding: '30px',
        }}
      >
        {/* Page Header */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <Typography
            sx={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#333',
            }}
          >
            ユニット管理
          </Typography>
          <Button
            onClick={handleOpenAddDialog}
            startIcon={<Add />}
            disabled={!filterCategoryId || !filterGenreId}
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
              '&.Mui-disabled': {
                background: '#e0e0e0',
                color: '#9e9e9e',
              },
            }}
          >
            新規ユニット追加
          </Button>
        </Box>

        {/* カテゴリー・ジャンル選択 */}
        <Box
          sx={{
            padding: '20px',
            marginBottom: '20px',
            background: '#f7f7f7',
            borderRadius: '8px',
            display: 'flex',
            gap: '20px',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography
              sx={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#333',
                whiteSpace: 'nowrap',
              }}
            >
              カテゴリー選択:
            </Typography>
            <FormControl size="small" sx={{ minWidth: 220 }}>
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
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography
              sx={{
                fontSize: '14px',
                fontWeight: 600,
                color: filterCategoryId ? '#333' : '#999',
                whiteSpace: 'nowrap',
              }}
            >
              ジャンル選択:
            </Typography>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <Select
                value={filterGenreId}
                onChange={(e) => setFilterGenreId(e.target.value)}
                displayEmpty
                disabled={!filterCategoryId}
                sx={{
                  background: filterCategoryId ? 'white' : '#f5f5f5',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#e0e0e0',
                    borderWidth: '2px',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: filterCategoryId ? '#667eea' : '#e0e0e0',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#667eea',
                  },
                }}
              >
                <MenuItem value="">すべてのジャンル</MenuItem>
                {filteredGenresForSelect.map((genre) => (
                  <MenuItem key={genre.id} value={genre.id}>
                    {genre.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* Error Alert */}
        {isError && (
          <Alert severity="error" sx={{ marginBottom: '20px' }}>
            ユニットの取得に失敗しました: {error?.message || 'エラーが発生しました'}
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <CircularProgress />
          </Box>
        )}

        {/* Table */}
        {!isLoading && !isError && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <TableContainer component={Paper} sx={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}>
              <Table>
                <TableHead sx={{ background: '#f8f9fa' }}>
                  <TableRow>
                    {filterGenreId && (
                      <TableCell sx={{ fontWeight: 700, color: '#495057', fontSize: '14px', padding: '16px', width: '40px', textAlign: 'center' }}></TableCell>
                    )}
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: '#495057',
                        fontSize: '14px',
                        padding: '16px',
                        textAlign: 'center',
                      }}
                    >
                      画像
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: '#495057',
                        fontSize: '14px',
                        padding: '16px',
                        textAlign: 'center',
                      }}
                    >
                      ユニット番号
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: '#495057',
                        fontSize: '14px',
                        padding: '16px',
                        textAlign: 'center',
                      }}
                    >
                      ユニット名
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: '#495057',
                        fontSize: '14px',
                        padding: '16px',
                        textAlign: 'center',
                      }}
                    >
                      ジャンル名
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: '#495057',
                        fontSize: '14px',
                        padding: '16px',
                        textAlign: 'center',
                      }}
                    >
                      パーツ数
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: '#495057',
                        fontSize: '14px',
                        padding: '16px',
                        textAlign: 'center',
                      }}
                    >
                      作成日
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: '#495057',
                        fontSize: '14px',
                        padding: '16px',
                        textAlign: 'center',
                      }}
                    >
                      操作
                    </TableCell>
                  </TableRow>
                </TableHead>
                <SortableContext
                  items={filteredUnits.map((u: any) => u.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <TableBody>
                    {filteredUnits.map((unit: any) => (
                      <SortableRow
                        key={unit.id}
                        unit={unit}
                        onEdit={handleOpenEditDialog}
                        onDelete={handleOpenDeleteDialog}
                        sortable={!!filterGenreId}
                      />
                    ))}
                    {units.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} sx={{ textAlign: 'center', padding: '40px' }}>
                          <Typography sx={{ color: '#999', fontSize: '14px' }}>
                            ユニットがありません
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </SortableContext>
              </Table>
            </TableContainer>
          </DndContext>
        )}
      </Box>

      {/* Add Dialog */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: '20px', fontWeight: 700 }}>新規ユニット追加</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ marginTop: '16px' }}>
            <InputLabel>ジャンル</InputLabel>
            <Select
              value={genreId}
              onChange={(e) => setGenreId(e.target.value)}
              label="ジャンル"
            >
              {genres.map((genre: any) => (
                <MenuItem key={genre.id} value={genre.id}>
                  {genre.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="ユニット番号"
            value={unitNumber}
            onChange={(e) => setUnitNumber(e.target.value)}
            sx={{ marginTop: '16px' }}
          />
          <TextField fullWidth label="ユニット名" value={unitName} onChange={(e) => setUnitName(e.target.value)} sx={{ marginTop: '16px' }} />
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
        <DialogActions sx={{ padding: '16px 24px' }}>
          <Button onClick={() => setOpenAddDialog(false)}>キャンセル</Button>
          <Button onClick={handleAdd} variant="contained" disabled={!genreId || !unitNumber || !unitName}>追加</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontSize: '20px', fontWeight: 700 }}>ユニット編集</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ marginTop: '16px' }} disabled>
            <InputLabel>ジャンル</InputLabel>
            <Select
              value={genreId}
              label="ジャンル"
            >
              {genres.map((genre: any) => (
                <MenuItem key={genre.id} value={genre.id}>
                  {genre.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="ユニット番号"
            value={unitNumber}
            onChange={(e) => setUnitNumber(e.target.value)}
            sx={{ marginTop: '16px' }}
          />
          <TextField fullWidth label="ユニット名" value={unitName} onChange={(e) => setUnitName(e.target.value)} sx={{ marginTop: '16px' }} />
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
        <DialogActions sx={{ padding: '16px 24px' }}>
          <Button onClick={() => setOpenEditDialog(false)}>キャンセル</Button>
          <Button onClick={handleEdit} variant="contained" disabled={!unitName}>更新</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontSize: '20px', fontWeight: 700 }}>ユニット削除</DialogTitle>
        <DialogContent>
          <Typography>このユニットを削除してもよろしいですか？</Typography>
          {selectedUnit && (
            <Typography sx={{ marginTop: '8px', fontWeight: 600 }}>
              {selectedUnit.unitName}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ padding: '16px 24px' }}>
          <Button onClick={() => setOpenDeleteDialog(false)}>キャンセル</Button>
          <Button onClick={handleDelete} variant="contained" color="error">
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
