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

  // モード: 'move'=移動/拡大, 'cut'=ラインでカット（自由曲線トリミング）
  const [mode, setMode] = useState<'move' | 'cut'>('move');
  // カット用: 描いた線のパス（コンテナ座標）
  const [cutPath, setCutPath] = useState<{ x: number; y: number }[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  // 画像を枠にフィットさせる基準スケール（これを1.0倍とみなす）
  const [fitScale, setFitScale] = useState(1);

  // ダイアログが開いたときに初期化
  useEffect(() => {
    if (open) {
      setPosition(initialPosition);
      setBackgroundColor(initialBackgroundColor);
      setMode('move');
      setCutPath([]);

      // 画像のサイズを取得し、枠にフィットする初期スケールを計算
      const img = new Image();
      img.onload = () => {
        setImageSize({ width: img.width, height: img.height });
        // コンテナ（枠）のサイズに画像全体が収まるスケールを計算
        const container = containerRef.current;
        if (container && img.width > 0 && img.height > 0) {
          const cw = container.clientWidth;
          const ch = container.clientHeight;
          const fit = Math.min(cw / img.width, ch / img.height);
          setFitScale(fit);
          // initialScale指定があればそれを優先、なければフィットスケール（画像全体が枠に収まる）
          setScale(initialScale && initialScale !== 1 ? initialScale : fit);
        } else {
          setFitScale(1);
          setScale(initialScale);
        }
      };
      img.src = imageUrl;
    }
    // ダイアログが開いた時・画像が変わった時だけ初期化する。
    // initialPosition等のオブジェクトを依存に入れると毎レンダー新規生成で無限ループになるため除外。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, imageUrl]);

  // コンテナ内のマウス座標を取得
  const getLocalPoint = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  // マウスダウン
  const handleMouseDown = (e: React.MouseEvent) => {
    if (mode === 'cut') {
      // カットモード: 新しい線を描き始める
      setIsDrawing(true);
      setCutPath([getLocalPoint(e)]);
    } else {
      // 移動モード: ドラッグ開始
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  // マウスムーブ
  const handleMouseMove = (e: React.MouseEvent) => {
    if (mode === 'cut') {
      if (!isDrawing) return;
      setCutPath((prev) => [...prev, getLocalPoint(e)]);
    } else {
      if (!isDragging) return;
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  // マウスアップ
  const handleMouseUp = () => {
    setIsDragging(false);
    setIsDrawing(false);
  };

  // カット線をオーバーレイに描画
  useEffect(() => {
    const canvas = overlayRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (cutPath.length > 1) {
      ctx.beginPath();
      ctx.moveTo(cutPath[0].x, cutPath[0].y);
      for (const p of cutPath.slice(1)) ctx.lineTo(p.x, p.y);
      // 描画中でなければ閉じる
      if (!isDrawing) ctx.closePath();
      ctx.strokeStyle = '#e53935';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      // 囲み領域を薄く塗る
      if (!isDrawing) {
        ctx.fillStyle = 'rgba(229, 57, 53, 0.08)';
        ctx.fill();
      }
    }
  }, [cutPath, isDrawing]);

  // カット線をクリア
  const clearCut = () => setCutPath([]);

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

      // カットパスがある場合: パス内側だけを残す（クリッピング）
      if (cutPath.length > 2) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cutPath[0].x, cutPath[0].y);
        for (const p of cutPath.slice(1)) ctx.lineTo(p.x, p.y);
        ctx.closePath();
        ctx.clip();
        // クリップ内に画像を描画
        ctx.drawImage(image, drawX, drawY, scaledWidth, scaledHeight);
        ctx.restore();
      } else {
        // 通常描画
        ctx.drawImage(image, drawX, drawY, scaledWidth, scaledHeight);
      }

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
    setMode('move');
    setCutPath([]);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {/* モード切替: 移動/拡大 か ラインでカット */}
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={(_, value) => {
                if (value !== null) setMode(value);
              }}
              size="small"
            >
              <ToggleButton value="move">移動・拡大</ToggleButton>
              <ToggleButton value="cut">ラインでカット</ToggleButton>
            </ToggleButtonGroup>
            {mode === 'cut' && (
              <>
                <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 600 }}>
                  画像上をなぞって残したい範囲を囲んでください
                </Typography>
                <Button size="small" onClick={clearCut} variant="outlined" color="error">
                  線をクリア
                </Button>
              </>
            )}
          </Box>

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
                cursor: mode === 'cut' ? 'crosshair' : isDragging ? 'grabbing' : 'grab',
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

              {/* カット用オーバーレイcanvas（描いた線を表示） */}
              <canvas
                ref={overlayRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
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
              {mode === 'cut'
                ? '赤い線で囲んだ内側だけが残ります（線を閉じるように囲んでください）'
                : '青い枠内の領域が保存されます'}
            </Typography>
          </Box>

          {/* ズームスライダー */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              拡大・縮小
            </Typography>
            <Slider
              // フィット状態を100%として、その倍率(0.5〜4倍)で拡大縮小
              value={fitScale > 0 ? scale / fitScale : 1}
              min={0.5}
              max={4}
              step={0.05}
              onChange={(_, value) => setScale((value as number) * fitScale)}
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
              onChange={(_, value) => {
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
