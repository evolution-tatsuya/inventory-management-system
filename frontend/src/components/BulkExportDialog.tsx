// ============================================================
// BulkExportDialog
// ============================================================
// カテゴリー配下の複数ユニットを1つのPDFにまとめて出力する設定ダイアログ。
// 対象ユニット選択・レイアウト・出力項目・展開図・画質を指定できる。
// ============================================================

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  LinearProgress,
  Radio,
  RadioGroup,
  Typography,
} from '@mui/material';
import {
  EXPORT_COLUMNS,
  QUALITY_PRESETS,
  exportBulkPdf,
  type ExportColumnKey,
  type ExportLayout,
  type ExportQuality,
  type ExportUnit,
} from '@/utils/bulkPdfExport';

interface BulkExportDialogProps {
  open: boolean;
  onClose: () => void;
  categoryName: string;
  units: ExportUnit[]; // カテゴリー配下の全ユニット（parts付き）
}

const DEFAULT_COLUMNS: ExportColumnKey[] = [
  'image',
  'unitIndividualNumber',
  'partNumber',
  'partName',
  'quantity',
  'stock',
  'price',
  'storageCase',
];

const BulkExportDialog = ({
  open,
  onClose,
  categoryName,
  units,
}: BulkExportDialogProps) => {
  // 対象ユニット（デフォルト全選択）
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(
    () => new Set(units.map((u) => u.unitId)),
  );
  const [columns, setColumns] = useState<Set<ExportColumnKey>>(
    () => new Set(DEFAULT_COLUMNS),
  );
  const [layout, setLayout] = useState<ExportLayout>('mixed');
  const [quality, setQuality] = useState<ExportQuality>('standard');
  const [includeDiagram, setIncludeDiagram] = useState(true);

  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; label: string }>(
    { done: 0, total: 0, label: '' },
  );
  const [errorMsg, setErrorMsg] = useState('');

  // ダイアログを開いたとき（対象ユニットが変わったとき）に全選択へ戻す
  useEffect(() => {
    if (open) {
      setSelectedUnitIds(new Set(units.map((u) => u.unitId)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, units.map((u) => u.unitId).join(',')]);

  const allSelected = selectedUnitIds.size === units.length && units.length > 0;

  const toggleUnit = (unitId: string) => {
    setSelectedUnitIds((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) setSelectedUnitIds(new Set());
    else setSelectedUnitIds(new Set(units.map((u) => u.unitId)));
  };

  const toggleColumn = (key: ExportColumnKey) => {
    setColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleExport = async () => {
    setErrorMsg('');
    const targetUnits = units.filter((u) => selectedUnitIds.has(u.unitId));
    if (targetUnits.length === 0) {
      setErrorMsg('出力するユニットを1つ以上選択してください。');
      return;
    }
    // 画像列を含む場合のみincludeに反映（列としての画像）
    const orderedColumns = EXPORT_COLUMNS.map((c) => c.key).filter((k) =>
      columns.has(k),
    );
    if (orderedColumns.length === 0) {
      setErrorMsg('出力する項目を1つ以上選択してください。');
      return;
    }

    setExporting(true);
    setProgress({ done: 0, total: targetUnits.length, label: '' });
    try {
      await exportBulkPdf({
        categoryName,
        units: targetUnits,
        columns: orderedColumns,
        layout,
        quality,
        includeDiagram,
        onProgress: (done, total, label) => setProgress({ done, total, label }),
      });
      onClose();
    } catch (error: any) {
      console.error('一括PDF出力エラー:', error);
      setErrorMsg(`出力に失敗しました: ${error.message || ''}`);
    } finally {
      setExporting(false);
    }
  };

  const totalParts = units
    .filter((u) => selectedUnitIds.has(u.unitId))
    .reduce((sum, u) => sum + u.parts.length, 0);

  return (
    <Dialog open={open} onClose={exporting ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        カテゴリー一括PDF出力 - {categoryName}
      </DialogTitle>
      <DialogContent dividers>
        {errorMsg && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMsg}
          </Alert>
        )}

        {/* 対象ユニット */}
        <FormLabel sx={{ fontWeight: 700, color: '#333' }}>対象ユニット</FormLabel>
        <Box sx={{ mt: 1, mb: 1 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={allSelected}
                indeterminate={!allSelected && selectedUnitIds.size > 0}
                onChange={toggleAll}
                disabled={exporting}
              />
            }
            label={`全て選択（${units.length}ユニット）`}
          />
        </Box>
        <Box
          sx={{
            maxHeight: 180,
            overflowY: 'auto',
            border: '1px solid #e0e0e0',
            borderRadius: 1,
            p: 1,
            mb: 2,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          }}
        >
          {units.map((u) => (
            <FormControlLabel
              key={u.unitId}
              control={
                <Checkbox
                  size="small"
                  checked={selectedUnitIds.has(u.unitId)}
                  onChange={() => toggleUnit(u.unitId)}
                  disabled={exporting}
                />
              }
              label={
                <Typography sx={{ fontSize: 13 }}>
                  {u.unitName || u.unitNumber || u.unitId}
                  <span style={{ color: '#999' }}> （{u.parts.length}件）</span>
                </Typography>
              }
            />
          ))}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* レイアウト */}
        <FormControl sx={{ mb: 2, display: 'block' }} disabled={exporting}>
          <FormLabel sx={{ fontWeight: 700, color: '#333' }}>レイアウト</FormLabel>
          <RadioGroup
            row
            value={layout}
            onChange={(e) => setLayout(e.target.value as ExportLayout)}
          >
            <FormControlLabel
              value="mixed"
              control={<Radio />}
              label="1枚に画像＋リスト混在"
            />
            <FormControlLabel
              value="two-page"
              control={<Radio />}
              label="2枚構成（画像ページ＋リストページ）"
            />
          </RadioGroup>
        </FormControl>

        <Divider sx={{ my: 2 }} />

        {/* 出力項目 */}
        <FormLabel sx={{ fontWeight: 700, color: '#333' }}>出力する項目</FormLabel>
        <Box
          sx={{
            mt: 1,
            mb: 2,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          }}
        >
          {EXPORT_COLUMNS.map((c) => (
            <FormControlLabel
              key={c.key}
              control={
                <Checkbox
                  size="small"
                  checked={columns.has(c.key)}
                  onChange={() => toggleColumn(c.key)}
                  disabled={exporting}
                />
              }
              label={<Typography sx={{ fontSize: 13 }}>{c.label}</Typography>}
            />
          ))}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* 展開図 */}
        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={includeDiagram}
                onChange={(e) => setIncludeDiagram(e.target.checked)}
                disabled={exporting}
              />
            }
            label="展開図を含める（メイン＋サブ画像）"
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* 画質 */}
        <FormControl sx={{ mb: 1, display: 'block' }} disabled={exporting}>
          <FormLabel sx={{ fontWeight: 700, color: '#333' }}>画質</FormLabel>
          <RadioGroup
            row
            value={quality}
            onChange={(e) => setQuality(e.target.value as ExportQuality)}
          >
            {(
              Object.keys(QUALITY_PRESETS) as ExportQuality[]
            ).map((q) => (
              <FormControlLabel
                key={q}
                value={q}
                control={<Radio />}
                label={`${QUALITY_PRESETS[q].label}（幅${QUALITY_PRESETS[q].cloudinaryWidth}px）`}
              />
            ))}
          </RadioGroup>
          <Typography sx={{ fontSize: 12, color: '#888' }}>
            軽量＝ファイル小・確認用／高画質＝きれいに印刷（ファイル大）
          </Typography>
        </FormControl>

        {/* 進捗 */}
        {exporting && (
          <Box sx={{ mt: 2 }}>
            <Typography sx={{ fontSize: 13, mb: 0.5 }}>
              {progress.done} / {progress.total} ユニット処理中
              {progress.label ? `：${progress.label}` : ''}
            </Typography>
            <LinearProgress
              variant={progress.total ? 'determinate' : 'indeterminate'}
              value={progress.total ? (progress.done / progress.total) * 100 : 0}
            />
          </Box>
        )}

        <Alert severity="info" sx={{ mt: 2 }}>
          選択中: {selectedUnitIds.size}ユニット / 合計{totalParts}件のパーツ
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={exporting}>
          キャンセル
        </Button>
        <Button
          variant="contained"
          onClick={handleExport}
          disabled={exporting}
          sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          {exporting ? '出力中...' : 'PDFを出力'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BulkExportDialog;
