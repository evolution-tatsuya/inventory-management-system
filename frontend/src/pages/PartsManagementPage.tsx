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
  Card,
  CardMedia,
  CardContent,
  CardActions,
} from '@mui/material';
import { Add, DragIndicator, Upload, Delete } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partsApi, genresApi, categoriesApi, unitsApi, diagramImagesApi } from '@/services/api';
import type { Part } from '@/types';
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
  part: Part & { genre?: { name: string }; partMaster?: { stockQuantity: number } };
  onEdit: (part: Part) => void;
  onDelete: (part: Part) => void;
  sortable?: boolean;
}

const SortableRow = ({ part, onEdit, onDelete, sortable = true }: SortableRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: part.id, disabled: !sortable });

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
      <TableCell sx={{ padding: '12px 16px' }}>
        {part.imageUrl ? (
          <Box
            component="img"
            src={part.imageUrl}
            alt={part.partName}
            sx={{
              width: '60px',
              height: '60px',
              borderRadius: '6px',
              objectFit: 'cover',
              objectPosition: `${(part.cropPositionX ?? 0.5) * 100}% ${(part.cropPositionY ?? 0.5) * 100}%`,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            }}
          />
        ) : (
          <Box
            sx={{
              width: '60px',
              height: '60px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '12px',
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            }}
          >
            {part.partName ? part.partName.substring(0, 2) : 'PA'}
          </Box>
        )}
      </TableCell>
      <TableCell sx={{ padding: '12px 16px', textAlign: 'center' }}>
        {(part as any).unit?.unitNumber || '-'}
      </TableCell>
      <TableCell sx={{ padding: '12px 16px', textAlign: 'center' }}>{part.unitNumber}</TableCell>
      <TableCell sx={{ padding: '12px 16px', textAlign: 'center' }}>{part.partNumber}</TableCell>
      <TableCell sx={{ padding: '12px 16px', fontWeight: 500 }}>{part.partName}</TableCell>
      <TableCell sx={{ padding: '12px 16px', textAlign: 'center' }}>{part.quantity || '-'}</TableCell>
      <TableCell sx={{
        padding: '12px 16px',
        textAlign: 'center',
        color: (part.partMaster?.stockQuantity || 0) === 0 ? '#d32f2f' : 'inherit',
        fontWeight: (part.partMaster?.stockQuantity || 0) === 0 ? 600 : 400
      }}>{part.partMaster?.stockQuantity || 0}</TableCell>
      <TableCell sx={{ padding: '12px 16px', textAlign: 'center' }}>{part.price ? `¥${part.price.toLocaleString()}` : '-'}</TableCell>
      <TableCell sx={{ padding: '12px 16px', textAlign: 'center' }}>{part.storageCase}</TableCell>
      <TableCell sx={{ padding: '12px 16px', textAlign: 'center' }}>{part.orderDate ? part.orderDate.toString().split('T')[0] : '-'}</TableCell>
      <TableCell sx={{ padding: '12px 16px', textAlign: 'center' }}>{part.expectedArrivalDate ? part.expectedArrivalDate.toString().split('T')[0] : '-'}</TableCell>
      <TableCell sx={{ padding: '12px 16px' }}>{part.notes || '-'}</TableCell>
      <TableCell sx={{ padding: '12px 16px', textAlign: 'right' }}>
        <Button
          onClick={() => onEdit(part)}
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
          onClick={() => onDelete(part)}
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
// PartsManagementPage (A-004)
// ============================================================
// パーツ管理ページ - モックアップ準拠の全画面表示版
// ============================================================

export const PartsManagementPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [genreId, setGenreId] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [unitIndividualNumber, setUnitIndividualNumber] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [partName, setPartName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [stockQuantity, setStockQuantity] = useState('0'); // 在庫数量
  const [price, setPrice] = useState('');
  const [storageCase, setStorageCase] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [expectedArrivalDate, setExpectedArrivalDate] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState<string>(''); // カテゴリーフィルター用
  const [filterGenreId, setFilterGenreId] = useState<string>(''); // ジャンルフィルター用
  const [filterUnitId, setFilterUnitId] = useState<string>(''); // ユニットフィルター用

  // 画像クロップ用
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [cropPosition, setCropPosition] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

  // 展開図管理用
  const [diagramFile, setDiagramFile] = useState<File | null>(null);
  const [diagramPreview, setDiagramPreview] = useState<string>('');
  const [uploadingDiagram, setUploadingDiagram] = useState(false);

  // パーツ一覧取得（全パーツ）
  const { data: parts = [], isLoading, isError, error } = useQuery({
    queryKey: ['parts'],
    queryFn: partsApi.getAllParts,
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

  // ユニット一覧取得（ドロップダウン用）
  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: unitsApi.getAllUnits,
  });

  // 展開図取得（選択されたユニットに基づく）
  const { data: diagramImage } = useQuery({
    queryKey: ['diagram-image', filterUnitId],
    queryFn: () => diagramImagesApi.getDiagramImage(filterUnitId),
    enabled: !!filterUnitId,
  });

  // フィルターされたジャンル一覧（選択されたカテゴリーに属するジャンルのみ）
  const filteredGenresForSelect = filterCategoryId
    ? genres.filter((genre) => genre.categoryId === filterCategoryId)
    : genres;

  // フィルターされたユニット一覧（選択されたジャンルに属するユニットのみ）
  const filteredUnitsForSelect = filterGenreId
    ? units.filter((unit: any) => unit.genreId === filterGenreId)
    : filterCategoryId
    ? units.filter((unit: any) => {
        const genre = genres.find((g) => g.id === unit.genreId);
        return genre?.categoryId === filterCategoryId;
      })
    : units;

  // フィルターされたパーツ一覧
  const filteredParts = parts.filter((part: any) => {
    // ユニットフィルターが設定されている場合
    if (filterUnitId) {
      return part.unitId === filterUnitId;
    }
    // ジャンルフィルターが設定されている場合
    if (filterGenreId) {
      return part.genreId === filterGenreId;
    }
    // カテゴリーフィルターのみ設定されている場合
    if (filterCategoryId) {
      const genre = genres.find((g) => g.id === part.genreId);
      return genre?.categoryId === filterCategoryId;
    }
    // フィルターなし
    return true;
  });

  // カテゴリー変更時にジャンル・ユニットフィルターをリセット
  const handleFilterCategoryChange = (newCategoryId: string) => {
    setFilterCategoryId(newCategoryId);
    setFilterGenreId('');
    setFilterUnitId('');
  };

  // ジャンル変更時にユニットフィルターをリセット
  const handleFilterGenreChange = (newGenreId: string) => {
    setFilterGenreId(newGenreId);
    setFilterUnitId('');
  };

  // 選択されたユニットの名前を取得
  const selectedUnit = units.find((u: any) => u.id === filterUnitId);
  const pageTitle = selectedUnit ? `パーツ管理 - ${selectedUnit.unitName}` : 'パーツ管理';

  // パーツ作成
  const createMutation = useMutation({
    mutationFn: partsApi.createPart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setOpenAddDialog(false);
      resetForm();
    },
  });

  // パーツ更新
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => partsApi.updatePart(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      setOpenEditDialog(false);
      setSelectedPart(null);
      resetForm();
    },
  });

  // パーツ削除
  const deleteMutation = useMutation({
    mutationFn: partsApi.deletePart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setOpenDeleteDialog(false);
      setSelectedPart(null);
    },
  });

  // パーツ並び順更新
  const orderMutation = useMutation({
    mutationFn: partsApi.updatePartOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
    },
  });

  // 展開図削除
  const deleteDiagramMutation = useMutation({
    mutationFn: diagramImagesApi.deleteDiagramImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagram-image', filterUnitId] });
      setDiagramFile(null);
      setDiagramPreview('');
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
      const oldIndex = filteredParts.findIndex((p: any) => p.id === active.id);
      const newIndex = filteredParts.findIndex((p: any) => p.id === over.id);
      const newOrder = arrayMove(filteredParts, oldIndex, newIndex);

      // 楽観的更新
      queryClient.setQueryData(['parts'], (old: any[] | undefined) => {
        if (!old) return newOrder;
        if (!filterUnitId && !filterGenreId && !filterCategoryId) return newOrder;
        // フィルターされている場合は該当部分のみ更新
        const otherParts = old.filter((p: any) => !filteredParts.find((fp: any) => fp.id === p.id));
        return [...otherParts, ...newOrder];
      });

      // サーバーに保存
      orderMutation.mutate(newOrder.map((p: any) => p.id));
    }
  };

  const resetForm = () => {
    setGenreId('');
    setUnitNumber('');
    setUnitIndividualNumber('');
    setPartNumber('');
    setPartName('');
    setQuantity('');
    setStockQuantity('0'); // 在庫数量を0にリセット
    setPrice('');
    setStorageCase('');
    setOrderDate('');
    setExpectedArrivalDate('');
    setImageUrl('');
    setNotes('');
    setImageFile(null);
    setImagePreview('');
    setImageDimensions(null);
    setCropPosition({ x: 0.5, y: 0.5 });
  };

  const handleLogout = () => {
    navigate('/admin/login');
  };

  const handleOpenAddDialog = () => {
    resetForm();

    // カテゴリー、ジャンル、ユニットが全て選択されている場合、ジャンルとユニット番号を自動入力
    if (filterCategoryId && filterGenreId && filterUnitId) {
      const selectedUnit = units.find((u: any) => u.id === filterUnitId);
      if (selectedUnit) {
        setGenreId(filterGenreId); // ジャンルを自動選択
        setUnitNumber(selectedUnit.unitNumber); // ユニット番号を自動入力
      }
    }

    setOpenAddDialog(true);
  };

  const handleAdd = async () => {
    let uploadedImageUrl = imagePreview;

    if (imageFile && imageDimensions) {
      try {
        // Calculate crop area based on objectFit: 'cover'
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          alert('Canvas非対応のブラウザです');
          return;
        }

        const imgAspect = imageDimensions.width / imageDimensions.height;
        const targetAspect = 1; // Square

        let visibleWidth, visibleHeight, cropLeft, cropTop;

        if (imgAspect > targetAspect) {
          // Landscape: crop left/right
          visibleHeight = imageDimensions.height;
          visibleWidth = imageDimensions.height * targetAspect;
          const maxCropX = imageDimensions.width - visibleWidth;
          cropLeft = maxCropX * cropPosition.x;
          cropTop = 0;
        } else {
          // Portrait: crop top/bottom
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

        ctx.drawImage(
          img,
          cropLeft,
          cropTop,
          visibleWidth,
          visibleHeight,
          0,
          0,
          visibleWidth,
          visibleHeight
        );

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => {
              if (b) resolve(b);
              else reject(new Error('Blob変換失敗'));
            },
            'image/jpeg',
            0.9
          );
        });

        // Upload to Cloudinary
        const formData = new FormData();
        formData.append('file', blob, 'cropped-image.jpg');
        formData.append('upload_preset', 'ml_default');

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${
            import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
          }/image/upload`,
          { method: 'POST', body: formData }
        );

        const data = await response.json();
        if (data.error) {
          alert(`画像のアップロードに失敗しました: ${data.error.message}`);
          return;
        }

        uploadedImageUrl = data.secure_url;
      } catch (error) {
        console.error('画像アップロードエラー:', error);
        alert('画像のアップロードに失敗しました');
        return;
      }
    }

    // パーツを作成（在庫数量も一緒に送る）
    createMutation.mutate({
      genreId,
      unitId: filterUnitId || undefined,
      unitNumber: unitIndividualNumber,
      partNumber,
      partName,
      quantity: quantity ? parseInt(quantity) : undefined,
      price: price ? parseFloat(price) : undefined,
      storageCase,
      orderDate: orderDate || undefined,
      expectedArrivalDate: expectedArrivalDate || undefined,
      imageUrl: uploadedImageUrl || undefined,
      notes: notes || undefined,
      stockQuantity: stockQuantity ? parseInt(stockQuantity) : undefined, // 在庫数量を追加
    });
  };

  const handleOpenEditDialog = (part: Part) => {
    setSelectedPart(part);
    setGenreId(part.genreId);

    // ユニット番号（表示用）とユニット個別番号（DB用）を分離
    // パーツに紐付いているユニットのunitNumberを表示
    const partUnit = (part as any).unit;
    setUnitNumber(partUnit?.unitNumber || '未割り当て');
    setUnitIndividualNumber(part.unitNumber);

    setPartNumber(part.partNumber);
    setPartName(part.partName);
    setQuantity(part.quantity?.toString() || '');
    // 在庫数量をpartMasterから取得して自動セット
    const partMaster = (part as any).partMaster;
    setStockQuantity(partMaster?.stockQuantity?.toString() || '0');
    setPrice(part.price?.toString() || '');
    setStorageCase(part.storageCase || '');
    setOrderDate(part.orderDate || '');
    setExpectedArrivalDate(part.expectedArrivalDate || '');
    setImageUrl(part.imageUrl || '');
    setNotes(part.notes || '');
    setImageFile(null);
    setImagePreview(part.imageUrl || '');
    setCropPosition({
      x: part.cropPositionX ?? 0.5,
      y: part.cropPositionY ?? 0.5
    });

    // 既存画像のサイズを取得してプレビュー表示
    if (part.imageUrl) {
      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height });
      };
      img.src = part.imageUrl;
    } else {
      setImageDimensions(null);
    }

    setOpenEditDialog(true);
  };

  const handleEdit = async () => {
    if (!selectedPart) return;
    let uploadedImageUrl = imagePreview;

    if (imageFile && imageDimensions) {
      try {
        // Calculate crop area based on objectFit: 'cover'
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          alert('Canvas非対応のブラウザです');
          return;
        }

        const imgAspect = imageDimensions.width / imageDimensions.height;
        const targetAspect = 1; // Square

        let visibleWidth, visibleHeight, cropLeft, cropTop;

        if (imgAspect > targetAspect) {
          // Landscape: crop left/right
          visibleHeight = imageDimensions.height;
          visibleWidth = imageDimensions.height * targetAspect;
          const maxCropX = imageDimensions.width - visibleWidth;
          cropLeft = maxCropX * cropPosition.x;
          cropTop = 0;
        } else {
          // Portrait: crop top/bottom
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

        ctx.drawImage(
          img,
          cropLeft,
          cropTop,
          visibleWidth,
          visibleHeight,
          0,
          0,
          visibleWidth,
          visibleHeight
        );

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => {
              if (b) resolve(b);
              else reject(new Error('Blob変換失敗'));
            },
            'image/jpeg',
            0.9
          );
        });

        // Upload to Cloudinary
        const formData = new FormData();
        formData.append('file', blob, 'cropped-image.jpg');
        formData.append('upload_preset', 'ml_default');

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${
            import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
          }/image/upload`,
          { method: 'POST', body: formData }
        );

        const data = await response.json();
        if (data.error) {
          alert(`画像のアップロードに失敗しました: ${data.error.message}`);
          return;
        }

        uploadedImageUrl = data.secure_url;
      } catch (error) {
        console.error('画像アップロードエラー:', error);
        alert('画像のアップロードに失敗しました');
        return;
      }
    }

    // パーツ情報を更新
    updateMutation.mutate({
      id: selectedPart.id,
      data: {
        unitNumber: unitIndividualNumber,
        partNumber,
        partName,
        quantity: quantity ? parseInt(quantity) : undefined,
        price: price ? parseFloat(price) : undefined,
        storageCase,
        orderDate: orderDate || undefined,
        expectedArrivalDate: expectedArrivalDate || undefined,
        imageUrl: uploadedImageUrl || undefined,
        notes: notes || undefined,
        cropPositionX: cropPosition.x,
        cropPositionY: cropPosition.y,
        stockQuantity: stockQuantity ? parseInt(stockQuantity) : undefined, // 在庫数量を追加
      },
    });
  };

  const handleOpenDeleteDialog = (part: Part) => {
    setSelectedPart(part);
    setOpenDeleteDialog(true);
  };

  const handleDelete = () => {
    if (!selectedPart) return;
    deleteMutation.mutate(selectedPart.id);
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

  // 展開図ファイル選択ハンドラー
  const handleDiagramChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDiagramFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setDiagramPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 展開図アップロードハンドラー
  const handleUploadDiagram = async () => {
    if (!diagramFile || !filterUnitId) return;

    setUploadingDiagram(true);
    try {
      // Cloudinaryにアップロード
      const formData = new FormData();
      formData.append('file', diagramFile);
      formData.append('upload_preset', 'ml_default');

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );

      const data = await response.json();
      if (data.error) {
        alert(`画像のアップロードに失敗しました: ${data.error.message}`);
        return;
      }

      // DBに保存（unitIdで保存）
      await diagramImagesApi.upsertDiagramImage(filterUnitId, data.secure_url);
      queryClient.invalidateQueries({ queryKey: ['diagram-image', filterUnitId] });

      setDiagramFile(null);
      setDiagramPreview('');
      alert('展開図をアップロードしました');
    } catch (error) {
      console.error('展開図アップロードエラー:', error);
      alert('展開図のアップロードに失敗しました');
    } finally {
      setUploadingDiagram(false);
    }
  };

  // 展開図削除ハンドラー
  const handleDeleteDiagram = async () => {
    if (!filterUnitId || !confirm('展開図を削除してもよろしいですか?')) return;
    deleteDiagramMutation.mutate(filterUnitId);
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
          ユニット管理
        </Button>
        <Button
          onClick={() => navigate('/admin/parts')}
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
            {pageTitle}
          </Typography>
          <Button
            onClick={handleOpenAddDialog}
            startIcon={<Add />}
            disabled={!filterCategoryId || !filterGenreId || !filterUnitId}
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
            新規パーツ追加
          </Button>
        </Box>

        {/* カテゴリー・ジャンル・ユニット選択 */}
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
            <FormControl size="small" sx={{ minWidth: 200 }}>
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
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <Select
                value={filterGenreId}
                onChange={(e) => handleFilterGenreChange(e.target.value)}
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

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography
              sx={{
                fontSize: '14px',
                fontWeight: 600,
                color: filterGenreId ? '#333' : '#999',
                whiteSpace: 'nowrap',
              }}
            >
              ユニット選択:
            </Typography>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <Select
                value={filterUnitId}
                onChange={(e) => setFilterUnitId(e.target.value)}
                displayEmpty
                disabled={!filterGenreId}
                sx={{
                  background: filterGenreId ? 'white' : '#f5f5f5',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#e0e0e0',
                    borderWidth: '2px',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: filterGenreId ? '#667eea' : '#e0e0e0',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#667eea',
                  },
                }}
              >
                <MenuItem value="">すべてのユニット</MenuItem>
                {filteredUnitsForSelect.map((unit: any) => (
                  <MenuItem key={unit.id} value={unit.id}>
                    {unit.unitName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* 展開図管理セクション（カテゴリー・ジャンル・ユニット全て選択時のみ表示） */}
        {filterCategoryId && filterGenreId && filterUnitId && (
          <Card sx={{ marginBottom: '20px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}>
            <CardContent>
              <Typography
                sx={{
                  fontSize: '18px',
                  fontWeight: 700,
                  marginBottom: '16px',
                  color: '#333',
                }}
              >
                展開図管理 - {selectedUnit?.unitName || 'ユニット'}
              </Typography>

              {diagramImage ? (
                <Box>
                  <CardMedia
                    component="img"
                    image={diagramPreview || diagramImage.imageUrl}
                    alt="展開図"
                    sx={{
                      width: '100%',
                      maxWidth: '600px',
                      height: 'auto',
                      borderRadius: '8px',
                      marginBottom: '16px',
                      objectFit: 'contain',
                      border: '1px solid #e0e0e0',
                    }}
                  />
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<Upload />}
                      disabled={uploadingDiagram}
                    >
                      画像を変更
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={handleDiagramChange}
                      />
                    </Button>

                    {diagramFile && (
                      <Button
                        variant="contained"
                        onClick={handleUploadDiagram}
                        disabled={uploadingDiagram}
                        sx={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        }}
                      >
                        {uploadingDiagram ? 'アップロード中...' : '変更を保存'}
                      </Button>
                    )}

                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<Delete />}
                      onClick={handleDeleteDiagram}
                      disabled={deleteDiagramMutation.isPending}
                    >
                      {deleteDiagramMutation.isPending ? '削除中...' : '削除'}
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box>
                  <Typography sx={{ color: '#666', marginBottom: '16px' }}>
                    展開図が登録されていません
                  </Typography>

                  {diagramPreview && (
                    <CardMedia
                      component="img"
                      image={diagramPreview}
                      alt="プレビュー"
                      sx={{
                        width: '100%',
                        maxWidth: '600px',
                        height: 'auto',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        objectFit: 'contain',
                        border: '1px solid #e0e0e0',
                      }}
                    />
                  )}

                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<Upload />}
                      disabled={uploadingDiagram}
                    >
                      画像を選択
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={handleDiagramChange}
                      />
                    </Button>

                    {diagramFile && (
                      <Button
                        variant="contained"
                        onClick={handleUploadDiagram}
                        disabled={uploadingDiagram}
                        sx={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        }}
                      >
                        {uploadingDiagram ? 'アップロード中...' : '展開図をアップロード'}
                      </Button>
                    )}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {/* Error Alert */}
        {isError && (
          <Alert severity="error" sx={{ marginBottom: '20px' }}>
            パーツの取得に失敗しました: {error?.message || 'エラーが発生しました'}
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
                    {filterUnitId && (
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
                      ユニット番号<br />Unit No.
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
                      ユニット個別番号<br />Unit Individual No.
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
                      品番<br />Part No.
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
                      品名<br />Part Name
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
                      数量<br />Quantity
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
                      在庫数量<br />Stock
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
                      価格<br />Price
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
                      収納ケース<br />Storage
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
                      発注日<br />Order Date
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
                      入荷予定日<br />Arrival Date
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
                      備考<br />Notes
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
                  items={filteredParts.map((p: any) => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <TableBody>
                    {filteredParts.map((part: any) => (
                      <SortableRow
                        key={part.id}
                        part={part}
                        onEdit={handleOpenEditDialog}
                        onDelete={handleOpenDeleteDialog}
                        sortable={!!filterUnitId}
                      />
                    ))}
                    {parts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} sx={{ textAlign: 'center', padding: '40px' }}>
                          <Typography sx={{ color: '#999', fontSize: '14px' }}>
                            パーツがありません
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
      <Dialog
        open={openAddDialog}
        onClose={() => setOpenAddDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontSize: '20px', fontWeight: 700 }}>新規パーツ追加</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="ユニット番号"
            value={unitNumber}
            InputProps={{ readOnly: true }}
            sx={{ marginTop: '16px' }}
          />
          <TextField
            fullWidth
            label="ユニット個別番号"
            value={unitIndividualNumber}
            onChange={(e) => setUnitIndividualNumber(e.target.value)}
            sx={{ marginTop: '16px' }}
          />
          <TextField
            fullWidth
            label="パーツ番号"
            value={partNumber}
            onChange={(e) => setPartNumber(e.target.value)}
            sx={{ marginTop: '16px' }}
          />
          <TextField
            fullWidth
            label="パーツ名"
            value={partName}
            onChange={(e) => setPartName(e.target.value)}
            sx={{ marginTop: '16px' }}
          />
          {/* 数量フィールド（+/-ボタン付き） */}
          <Box sx={{ marginTop: '16px', display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              fullWidth
              label="数量"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              sx={{
                '& input[type=number]': {
                  MozAppearance: 'textfield',
                },
                '& input[type=number]::-webkit-outer-spin-button': {
                  WebkitAppearance: 'none',
                  margin: 0,
                },
                '& input[type=number]::-webkit-inner-spin-button': {
                  WebkitAppearance: 'none',
                  margin: 0,
                },
              }}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setQuantity(String(Math.max(0, parseInt(quantity || '0') + 1)))}
                sx={{ minWidth: '40px', padding: '4px' }}
              >
                +
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setQuantity(String(Math.max(0, parseInt(quantity || '0') - 1)))}
                sx={{ minWidth: '40px', padding: '4px' }}
              >
                -
              </Button>
            </Box>
          </Box>
          {/* 在庫数量フィールド（+/-ボタン付き） */}
          <Box sx={{ marginTop: '16px', display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              fullWidth
              label="在庫数量"
              type="number"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
              sx={{
                '& input[type=number]': {
                  MozAppearance: 'textfield',
                },
                '& input[type=number]::-webkit-outer-spin-button': {
                  WebkitAppearance: 'none',
                  margin: 0,
                },
                '& input[type=number]::-webkit-inner-spin-button': {
                  WebkitAppearance: 'none',
                  margin: 0,
                },
              }}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setStockQuantity(String(Math.max(0, parseInt(stockQuantity || '0') + 1)))}
                sx={{ minWidth: '40px', padding: '4px' }}
              >
                +
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setStockQuantity(String(Math.max(0, parseInt(stockQuantity || '0') - 1)))}
                sx={{ minWidth: '40px', padding: '4px' }}
              >
                -
              </Button>
            </Box>
          </Box>
          <TextField
            fullWidth
            label="価格"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            sx={{ marginTop: '16px' }}
          />
          <TextField
            fullWidth
            label="収納ケース"
            value={storageCase}
            onChange={(e) => setStorageCase(e.target.value)}
            sx={{ marginTop: '16px' }}
          />
          <TextField
            fullWidth
            label="発注日"
            type="date"
            value={orderDate}
            onChange={(e) => setOrderDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ marginTop: '16px' }}
          />
          <TextField
            fullWidth
            label="入荷予定日"
            type="date"
            value={expectedArrivalDate}
            onChange={(e) => setExpectedArrivalDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ marginTop: '16px' }}
          />
          <TextField
            fullWidth
            label="備考"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            rows={3}
            sx={{ marginTop: '16px' }}
          />
          <Box sx={{ marginTop: '16px' }}>
            <Button variant="outlined" component="label" fullWidth sx={{ py: 1.5 }}>
              画像を選択
              <input type="file" hidden accept="image/*" onChange={handleImageChange} />
            </Button>
            {imagePreview && imageDimensions && (() => {
              const imgAspect = imageDimensions.width / imageDimensions.height;
              const targetAspect = 1;
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
          <Button onClick={handleAdd} variant="contained" disabled={!genreId || !unitIndividualNumber || !partNumber || !partName || quantity === ''}>
            追加
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontSize: '20px', fontWeight: 700 }}>パーツ編集</DialogTitle>
        <DialogContent>
          {/* ユニット番号（表示のみ） */}
          <TextField
            fullWidth
            label="ユニット番号"
            value={unitNumber}
            InputProps={{ readOnly: true }}
            sx={{ marginTop: '16px' }}
          />
          {/* ユニット個別番号（編集可能） */}
          <TextField
            fullWidth
            label="ユニット個別番号"
            value={unitIndividualNumber}
            onChange={(e) => setUnitIndividualNumber(e.target.value)}
            sx={{ marginTop: '16px' }}
          />
          <TextField
            fullWidth
            label="パーツ番号"
            value={partNumber}
            onChange={(e) => setPartNumber(e.target.value)}
            sx={{ marginTop: '16px' }}
          />
          <TextField
            fullWidth
            label="パーツ名"
            value={partName}
            onChange={(e) => setPartName(e.target.value)}
            sx={{ marginTop: '16px' }}
          />
          {/* 数量フィールド（+/-ボタン付き） */}
          <Box sx={{ marginTop: '16px', display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              fullWidth
              label="数量"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              sx={{
                '& input[type=number]': {
                  MozAppearance: 'textfield',
                },
                '& input[type=number]::-webkit-outer-spin-button': {
                  WebkitAppearance: 'none',
                  margin: 0,
                },
                '& input[type=number]::-webkit-inner-spin-button': {
                  WebkitAppearance: 'none',
                  margin: 0,
                },
              }}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setQuantity(String(Math.max(0, parseInt(quantity || '0') + 1)))}
                sx={{ minWidth: '40px', padding: '4px' }}
              >
                +
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setQuantity(String(Math.max(0, parseInt(quantity || '0') - 1)))}
                sx={{ minWidth: '40px', padding: '4px' }}
              >
                -
              </Button>
            </Box>
          </Box>
          {/* 在庫数量フィールド（+/-ボタン付き） */}
          <Box sx={{ marginTop: '16px', display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              fullWidth
              label="在庫数量"
              type="number"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
              sx={{
                '& input[type=number]': {
                  MozAppearance: 'textfield',
                },
                '& input[type=number]::-webkit-outer-spin-button': {
                  WebkitAppearance: 'none',
                  margin: 0,
                },
                '& input[type=number]::-webkit-inner-spin-button': {
                  WebkitAppearance: 'none',
                  margin: 0,
                },
              }}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setStockQuantity(String(Math.max(0, parseInt(stockQuantity || '0') + 1)))}
                sx={{ minWidth: '40px', padding: '4px' }}
              >
                +
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setStockQuantity(String(Math.max(0, parseInt(stockQuantity || '0') - 1)))}
                sx={{ minWidth: '40px', padding: '4px' }}
              >
                -
              </Button>
            </Box>
          </Box>
          <TextField
            fullWidth
            label="価格"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            sx={{ marginTop: '16px' }}
          />
          <TextField
            fullWidth
            label="収納ケース"
            value={storageCase}
            onChange={(e) => setStorageCase(e.target.value)}
            sx={{ marginTop: '16px' }}
          />
          <TextField
            fullWidth
            label="発注日"
            type="date"
            value={orderDate}
            onChange={(e) => setOrderDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ marginTop: '16px' }}
          />
          <TextField
            fullWidth
            label="入荷予定日"
            type="date"
            value={expectedArrivalDate}
            onChange={(e) => setExpectedArrivalDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ marginTop: '16px' }}
          />
          <TextField
            fullWidth
            label="備考"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            rows={3}
            sx={{ marginTop: '16px' }}
          />
          <Box sx={{ marginTop: '16px' }}>
            <Button variant="outlined" component="label" fullWidth sx={{ py: 1.5 }}>
              画像を選択
              <input type="file" hidden accept="image/*" onChange={handleImageChange} />
            </Button>
            {imagePreview && imageDimensions && (() => {
              const imgAspect = imageDimensions.width / imageDimensions.height;
              const targetAspect = 1;
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
          <Button onClick={handleEdit} variant="contained" disabled={!unitIndividualNumber || !partNumber || !partName || quantity === ''}>
            更新
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontSize: '20px', fontWeight: 700 }}>パーツ削除</DialogTitle>
        <DialogContent>
          <Typography>このパーツを削除してもよろしいですか？</Typography>
          {selectedPart && (
            <Typography sx={{ marginTop: '8px', fontWeight: 600 }}>
              {selectedPart.partName}
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
