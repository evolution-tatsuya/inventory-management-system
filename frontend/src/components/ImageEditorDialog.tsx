import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Slider,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';

interface ImageEditorDialogProps {
  open: boolean;
  imageUrl: string;
  onClose: () => void;
  onSave: (editedImageUrl: string, settings?: { scale: number; position: { x: number; y: number }; backgroundColor: string }) => void;
  title?: string;
  initialScale?: number;
  initialPosition?: { x: number; y: number };
  initialBackgroundColor?: string;
}

const BACKGROUND_COLORS = [
  { label: '白', value: '#FFFFFF' },
  { label: '黒', value: '#000000' },
  { label: '赤', value: '#FF0000' },
  { label: '青', value: '#0000FF' },
  { label: '黄色', value: '#FFFF00' },
];

export const ImageEditorDialog = ({
  open,
  imageUrl,
  onClose,
  onSave,
  title = '画像を編集',
  initialScale = 1,
  initialPosition = { x: 0, y: 0 },
  initialBackgroundColor = '#FFFFFF',
}: ImageEditorDialogProps) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // ダイアログが開いたときに初期化
  useEffect(() => {
    if (open) {
      setScale(initialScale);
      setPosition(initialPosition);
      setBackgroundColor(initialBackgroundColor);

      // 画像のサイズを取得
      const img = new Image();
      img.onload = () => {
        setImageSize({ width: img.width, height: img.height });
      };
      img.src = imageUrl;
    }
  }, [open, imageUrl, initialScale, initialPosition, initialBackgroundColor]);

  // マウスダウン（ドラッグ開始）
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  // マウスムーブ（ドラッグ中）
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  // マウスアップ（ドラッグ終了）
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 保存処理
  const handleSave = async () => {
    if (!containerRef.current || !imageRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // clientWidthを使用してborder分を除外した実際の描画領域サイズを取得
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    // キャンバスサイズを設定
    canvas.width = containerWidth;
    canvas.height = containerHeight;

    // 背景色を塗りつぶし
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 画像を読み込んで描画
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      // 拡大・縮小後の画像サイズ
      const scaledWidth = imageSize.width * scale;
      const scaledHeight = imageSize.height * scale;

      // 画像の中央位置を計算
      const centerX = containerWidth / 2;
      const centerY = containerHeight / 2;

      // 画像の描画位置（中央 + オフセット）
      const drawX = centerX - scaledWidth / 2 + position.x;
      const drawY = centerY - scaledHeight / 2 + position.y;

      // 画像を描画
      ctx.drawImage(image, drawX, drawY, scaledWidth, scaledHeight);

      // Base64に変換
      const base64 = canvas.toDataURL('image/jpeg', 0.9);
      onSave(base64, { scale, position, backgroundColor });
      onClose();
    };
    image.src = imageUrl;
  };

  // キャンセル処理
  const handleCancel = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setBackgroundColor('#FFFFFF');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {/* 画像エディター */}
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              mb: 3,
            }}
          >
            <Box
              ref={containerRef}
              sx={{
                position: 'relative',
                width: '100%',
                paddingTop: '56.25%', // 16:9 = 9/16 = 56.25%
                bgcolor: backgroundColor,
                borderRadius: 1,
                overflow: 'hidden',
                cursor: isDragging ? 'grabbing' : 'grab',
                border: '3px solid',
                borderColor: 'primary.main',
                boxShadow: '0 0 0 4px rgba(25, 118, 210, 0.1)',
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <img
                ref={imageRef}
                src={imageUrl}
                alt="編集中の画像"
                draggable={false}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${scale})`,
                  transformOrigin: 'center',
                  width: imageSize.width > 0 ? `${imageSize.width}px` : 'auto',
                  height: imageSize.height > 0 ? `${imageSize.height}px` : 'auto',
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
              />

              {/* 四隅にコーナーマーク */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  width: 20,
                  height: 20,
                  borderTop: '3px solid',
                  borderLeft: '3px solid',
                  borderColor: 'primary.main',
                  pointerEvents: 'none',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  width: 20,
                  height: 20,
                  borderTop: '3px solid',
                  borderRight: '3px solid',
                  borderColor: 'primary.main',
                  pointerEvents: 'none',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 8,
                  left: 8,
                  width: 20,
                  height: 20,
                  borderBottom: '3px solid',
                  borderLeft: '3px solid',
                  borderColor: 'primary.main',
                  pointerEvents: 'none',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 8,
                  right: 8,
                  width: 20,
                  height: 20,
                  borderBottom: '3px solid',
                  borderRight: '3px solid',
                  borderColor: 'primary.main',
                  pointerEvents: 'none',
                }}
              />
            </Box>

            {/* 説明テキスト */}
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                textAlign: 'center',
                mt: 1,
                color: 'primary.main',
                fontWeight: 600,
              }}
            >
              青い枠内の領域が保存されます
            </Typography>
          </Box>

          {/* ズームスライダー */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              拡大・縮小
            </Typography>
            <Slider
              value={scale}
              min={0.3}
              max={3}
              step={0.1}
              onChange={(e, value) => setScale(value as number)}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
            />
          </Box>

          {/* 背景色選択 */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              背景色
            </Typography>
            <ToggleButtonGroup
              value={backgroundColor}
              exclusive
              onChange={(e, value) => {
                if (value !== null) {
                  setBackgroundColor(value);
                }
              }}
              sx={{ flexWrap: 'wrap', gap: 1 }}
            >
              {BACKGROUND_COLORS.map((color) => (
                <ToggleButton
                  key={color.value}
                  value={color.value}
                  sx={{
                    border: '2px solid',
                    borderColor: 'divider',
                    '&.Mui-selected': {
                      borderColor: 'primary.main',
                      bgcolor: 'action.selected',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      bgcolor: color.value,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 0.5,
                      mr: 1,
                    }}
                  />
                  {color.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} variant="outlined">
          キャンセル
        </Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          適用
        </Button>
      </DialogActions>
    </Dialog>
  );
};
