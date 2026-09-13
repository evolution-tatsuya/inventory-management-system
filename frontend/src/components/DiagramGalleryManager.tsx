// ============================================================
// DiagramGalleryManager
// ============================================================
// ユニットの展開図を最大10枚（メイン1＋サブ9）管理するギャラリーUI。
// 追加（複数選択可）／削除／メイン指定／並び替え／画像編集に対応。
// ============================================================

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Upload,
  Delete,
  Edit as EditIcon,
  Star,
  StarBorder,
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material';
import { diagramImagesApi } from '@/services/api';
import { MAX_DIAGRAMS_PER_UNIT } from '@/services/api/diagramImages';
import type { DiagramImage } from '@/types';
import { ImageEditorDialog } from './ImageEditorDialog';

interface DiagramGalleryManagerProps {
  unitId: string;
  unitName?: string;
}

const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
}/image/upload`;

// Cloudinaryへ1枚アップロードしてsecure_urlを返す
async function uploadToCloudinary(fileOrDataUrl: File | string): Promise<string> {
  const formData = new FormData();
  formData.append('file', fileOrDataUrl);
  formData.append('upload_preset', 'ml_default');
  const response = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || 'アップロードに失敗しました');
  }
  return data.secure_url as string;
}

const DiagramGalleryManager = ({ unitId, unitName }: DiagramGalleryManagerProps) => {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: diagrams = [], isLoading } = useQuery({
    queryKey: ['diagram-images', unitId],
    queryFn: () => diagramImagesApi.listDiagramImages(unitId),
    enabled: !!unitId,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['diagram-images', unitId] });
    // 後方互換の単数キャッシュも更新（一般ページ等が参照）
    queryClient.invalidateQueries({ queryKey: ['diagram-image', unitId] });
  };

  // 複数ファイル追加
  const handleAddFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ''; // 同じファイルを連続選択できるようにリセット
    if (files.length === 0) return;

    const remaining = MAX_DIAGRAMS_PER_UNIT - diagrams.length;
    if (remaining <= 0) {
      alert(`展開図は最大${MAX_DIAGRAMS_PER_UNIT}枚までです`);
      return;
    }
    const targets = files.slice(0, remaining);
    if (files.length > remaining) {
      alert(
        `残り${remaining}枚まで追加できます。先頭の${remaining}枚のみアップロードします。`,
      );
    }

    setBusy(true);
    try {
      for (const file of targets) {
        const url = await uploadToCloudinary(file);
        await diagramImagesApi.addDiagramImage(unitId, url);
      }
      refresh();
    } catch (error: any) {
      console.error('展開図アップロードエラー:', error);
      alert(`展開図のアップロードに失敗しました: ${error.message || ''}`);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (d: DiagramImage) => {
    if (!confirm('この展開図を削除してもよろしいですか?')) return;
    setBusy(true);
    try {
      await diagramImagesApi.deleteDiagramImageById(d.id);
      refresh();
    } catch (error: any) {
      console.error('展開図削除エラー:', error);
      alert('削除に失敗しました');
    } finally {
      setBusy(false);
    }
  };

  const handleSetMain = async (d: DiagramImage) => {
    if (d.isMain) return;
    setBusy(true);
    try {
      await diagramImagesApi.setMainDiagramImage(unitId, d.id);
      refresh();
    } catch (error: any) {
      console.error('メイン設定エラー:', error);
      alert('メイン設定に失敗しました');
    } finally {
      setBusy(false);
    }
  };

  // 並び替え（up: -1 / down: +1）
  const handleMove = async (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= diagrams.length) return;
    const ids = diagrams.map((d) => d.id);
    [ids[index], ids[next]] = [ids[next], ids[index]];
    setBusy(true);
    try {
      await diagramImagesApi.reorderDiagramImages(unitId, ids);
      refresh();
    } catch (error: any) {
      console.error('並び替えエラー:', error);
      alert('並び替えに失敗しました');
    } finally {
      setBusy(false);
    }
  };

  // 画像編集の保存（編集後Base64 → Cloudinary → 該当IDを差し替え）
  const handleSaveEdit = async (editedImageUrl: string) => {
    if (!editingId) return;
    setBusy(true);
    try {
      const url = await uploadToCloudinary(editedImageUrl);
      await diagramImagesApi.updateDiagramImageById(editingId, url);
      refresh();
    } catch (error: any) {
      console.error('展開図編集の保存エラー:', error);
      alert('編集の保存に失敗しました');
    } finally {
      setBusy(false);
      setEditingId(null);
    }
  };

  const editingDiagram = diagrams.find((d) => d.id === editingId) || null;
  const canAddMore = diagrams.length < MAX_DIAGRAMS_PER_UNIT;

  return (
    <Card sx={{ marginBottom: '20px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}>
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
            marginBottom: '16px',
          }}
        >
          <Typography sx={{ fontSize: '18px', fontWeight: 700, color: '#333' }}>
            展開図管理 - {unitName || 'ユニット'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={`${diagrams.length} / ${MAX_DIAGRAMS_PER_UNIT} 枚`}
              size="small"
              color={diagrams.length >= MAX_DIAGRAMS_PER_UNIT ? 'error' : 'default'}
            />
            <Button
              variant="contained"
              component="label"
              startIcon={<Upload />}
              disabled={busy || !canAddMore}
              sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            >
              画像を追加
              <input
                type="file"
                hidden
                accept="image/*"
                multiple
                onChange={handleAddFiles}
              />
            </Button>
          </Box>
        </Box>

        {(isLoading || busy) && (
          <Box sx={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {!isLoading && diagrams.length === 0 && !busy && (
          <Typography sx={{ color: '#666' }}>
            展開図が登録されていません。「画像を追加」から最大{MAX_DIAGRAMS_PER_UNIT}
            枚まで登録できます（1枚目が自動的にメインになります）。
          </Typography>
        )}

        {diagrams.length > 0 && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 2,
            }}
          >
            {diagrams.map((d, index) => (
              <Box
                key={d.id}
                sx={{
                  border: d.isMain ? '2px solid #667eea' : '1px solid #e0e0e0',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  position: 'relative',
                  background: '#fff',
                }}
              >
                {d.isMain && (
                  <Chip
                    label="メイン"
                    size="small"
                    color="primary"
                    sx={{ position: 'absolute', top: 6, left: 6, zIndex: 1 }}
                  />
                )}
                <CardMedia
                  component="img"
                  image={d.imageUrl}
                  alt={`展開図 ${index + 1}`}
                  sx={{
                    width: '100%',
                    height: '130px',
                    objectFit: 'contain',
                    background: '#fafafa',
                  }}
                />
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-around',
                    alignItems: 'center',
                    padding: '4px',
                    borderTop: '1px solid #f0f0f0',
                  }}
                >
                  <Tooltip title={d.isMain ? 'メイン展開図' : 'メインにする'}>
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => handleSetMain(d)}
                        disabled={busy || d.isMain}
                        color="primary"
                      >
                        {d.isMain ? (
                          <Star fontSize="small" />
                        ) : (
                          <StarBorder fontSize="small" />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="前へ">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => handleMove(index, -1)}
                        disabled={busy || index === 0}
                      >
                        <ArrowUpward fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="後へ">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => handleMove(index, 1)}
                        disabled={busy || index === diagrams.length - 1}
                      >
                        <ArrowDownward fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="編集（トリミング・カット）">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => setEditingId(d.id)}
                        disabled={busy}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="削除">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(d)}
                        disabled={busy}
                        color="error"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {editingDiagram && (
          <ImageEditorDialog
            open={!!editingId}
            imageUrl={editingDiagram.imageUrl}
            onClose={() => setEditingId(null)}
            onSave={handleSaveEdit}
            title={`展開図を編集 - ${unitName || 'ユニット'}`}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default DiagramGalleryManager;
