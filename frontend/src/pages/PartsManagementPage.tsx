import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  TablePagination,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  FileUpload,
  FileDownload,
  PictureAsPdf,
  AddPhotoAlternate,
  Close,
  Image,
} from '@mui/icons-material';
import { ImageEditorDialog } from '@/components/ImageEditorDialog';
import { MainLayout } from '@/layouts/MainLayout';
import { GENRE_NAMES, type PartData } from '@/data/partsData';
import { usePartsStore } from '@/stores/partsStore';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

// ============================================================
// PartsManagementPage (A-004)
// ============================================================
// パーツリスト管理ページ（管理者専用）
// - パーツ一覧表示（チェックボックス付き）
// - 新規追加フォーム
// - 編集フォーム
// - 削除機能（単一削除・一括削除）
// - CSV一括インポート
// - CSV/PDFエクスポート
// ============================================================

export const PartsManagementPage = () => {
  const { genreId } = useParams<{ genreId: string }>();
  const { partsData, updatePartsData, diagramUrls, updateDiagramUrl } = usePartsStore();
  const parts = genreId ? partsData[genreId] || [] : [];
  const diagramUrl = genreId ? diagramUrls[genreId] || '' : '';

  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDiagramDialog, setOpenDiagramDialog] = useState(false);
  const [openPartImageDialog, setOpenPartImageDialog] = useState(false);
  const [editingPart, setEditingPart] = useState<PartData | null>(null);
  const [editingPartId, setEditingPartId] = useState<string>('');
  const [formData, setFormData] = useState<Partial<PartData>>({});
  const [tempDiagramUrl, setTempDiagramUrl] = useState<string>('');
  const [tempPartImage, setTempPartImage] = useState<string>('');

  // 画像エディター用state
  const [openImageEditor, setOpenImageEditor] = useState(false);
  const [editingImageUrl, setEditingImageUrl] = useState<string>('');
  const [imageEditorTarget, setImageEditorTarget] = useState<'diagram' | 'part' | 'form'>('diagram');

  const genreName = genreId ? GENRE_NAMES[genreId] || 'ジャンル' : 'ジャンル';

  // 全選択/解除
  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = parts.map((n) => n.id);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  // 個別選択
  const handleClick = (id: string) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected: string[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1)
      );
    }

    setSelected(newSelected);
  };

  const isSelected = (id: string) => selected.indexOf(id) !== -1;

  // ページネーション
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // 新規追加ダイアログを開く
  const handleAddClick = () => {
    setFormData({});
    setOpenAddDialog(true);
  };

  // 編集ダイアログを開く
  const handleEditClick = (part: PartData) => {
    setEditingPart(part);
    setFormData(part);
    setOpenEditDialog(true);
  };

  // 単一削除
  const handleDeleteClick = (id: string) => {
    if (confirm('このパーツを削除してもよろしいですか？')) {
      const updatedParts = parts.filter((p) => p.id !== id);
      if (genreId) {
        updatePartsData(genreId, updatedParts);
      }
    }
  };

  // 一括削除
  const handleBulkDelete = () => {
    if (selected.length === 0) {
      alert('削除するパーツを選択してください');
      return;
    }

    if (confirm(`${selected.length}件のパーツを削除してもよろしいですか？`)) {
      const updatedParts = parts.filter((p) => !selected.includes(p.id));
      if (genreId) {
        updatePartsData(genreId, updatedParts);
      }
      setSelected([]);
    }
  };

  // パーツ追加
  const handleAddSubmit = () => {
    const newPart: PartData & { id: string } = {
      id: `${Date.now()}`,
      unitNumber: formData.unitNumber || '',
      partNumber: formData.partNumber || '',
      partName: formData.partName || '',
      quantity: formData.quantity || 0,
      stockQuantity: formData.stockQuantity || 0,
      price: formData.price || 0,
      notes: formData.notes || '',
      storageCase: formData.storageCase || '',
      orderDate: formData.orderDate || '',
      expectedArrivalDate: formData.expectedArrivalDate || '',
      imageUrl: formData.imageUrl || 'https://picsum.photos/seed/default/100/80',
    };

    const updatedParts = [...parts, newPart];
    if (genreId) {
      updatePartsData(genreId, updatedParts);
    }

    setOpenAddDialog(false);
    setFormData({});
  };

  // パーツ編集
  const handleEditSubmit = () => {
    if (!editingPart) return;

    const updatedParts = parts.map((p) =>
      p.id === editingPart.id ? { ...p, ...formData } : p
    );
    if (genreId) {
      updatePartsData(genreId, updatedParts);
    }

    setOpenEditDialog(false);
    setEditingPart(null);
    setFormData({});
  };

  // フォーム内の画像アップロード
  const handleFormImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      setEditingImageUrl(imageUrl);
      setImageEditorTarget('form');
      setOpenImageEditor(true);
    };
    reader.readAsDataURL(file);
    // イベントターゲットをリセット（同じファイルを再選択できるように）
    event.target.value = '';
  };

  // 展開図ダイアログを開く
  const handleOpenDiagramDialog = () => {
    setTempDiagramUrl(diagramUrl);
    setOpenDiagramDialog(true);
  };

  // 展開図アップロード（一時保存）
  const handleDiagramUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      setEditingImageUrl(imageUrl);
      setImageEditorTarget('diagram');
      setOpenImageEditor(true);
    };
    reader.readAsDataURL(file);
    // イベントターゲットをリセット（同じファイルを再選択できるように）
    event.target.value = '';
  };

  // 展開図削除（一時保存）
  const handleDiagramDelete = () => {
    if (confirm('展開図を削除してもよろしいですか？')) {
      setTempDiagramUrl('');
    }
  };

  // 展開図保存
  const handleSaveDiagram = () => {
    if (genreId) {
      updateDiagramUrl(genreId, tempDiagramUrl);
    }
    setOpenDiagramDialog(false);
  };

  // 展開図キャンセル
  const handleCancelDiagram = () => {
    setOpenDiagramDialog(false);
  };

  // パーツ画像編集ダイアログを開く
  const handleOpenPartImageDialog = (partId: string, currentImage: string) => {
    setEditingPartId(partId);
    setTempPartImage(currentImage);
    setOpenPartImageDialog(true);
  };

  // パーツ画像アップロード（一時保存）
  const handlePartImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      setEditingImageUrl(imageUrl);
      setImageEditorTarget('part');
      setOpenImageEditor(true);
    };
    reader.readAsDataURL(file);
    // イベントターゲットをリセット（同じファイルを再選択できるように）
    event.target.value = '';
  };

  // パーツ画像削除（一時保存）
  const handlePartImageDelete = () => {
    if (confirm('画像を削除してもよろしいですか？')) {
      setTempPartImage('');
    }
  };

  // パーツ画像保存
  const handleSavePartImage = () => {
    if (!genreId) return;

    const updatedParts = parts.map((part) =>
      part.id === editingPartId ? { ...part, imageUrl: tempPartImage } : part
    );
    updatePartsData(genreId, updatedParts);
    setOpenPartImageDialog(false);
  };

  // パーツ画像キャンセル
  const handleCancelPartImage = () => {
    setOpenPartImageDialog(false);
  };

  // 画像エディター保存
  const handleSaveEditedImage = (editedImageUrl: string) => {
    if (imageEditorTarget === 'diagram') {
      setTempDiagramUrl(editedImageUrl);
    } else if (imageEditorTarget === 'part') {
      setTempPartImage(editedImageUrl);
    } else if (imageEditorTarget === 'form') {
      setFormData({ ...formData, imageUrl: editedImageUrl });
    }
    setOpenImageEditor(false);
  };

  // 画像エディターキャンセル
  const handleCancelImageEditor = () => {
    setOpenImageEditor(false);
  };

  // CSV一括インポート
  const handleCSVImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const rows = text.split('\n').slice(1); // ヘッダー行をスキップ

        // 既存のパーツの重複チェック用マップ（ユニット番号+品番の組み合わせ）
        const existingKeys = new Set(
          parts.map((p) => `${p.unitNumber}-${p.partNumber}`)
        );

        let skippedCount = 0;
        const imported = rows
          .filter((row) => row.trim())
          .map((row, index) => {
            const cols = row.split('\t').map((col) => col.trim());

            // 価格のパース（¥と,を除去して数値化）
            const priceStr = cols[5] || '0';
            const price = parseInt(priceStr.replace(/[¥,]/g, '')) || 0;

            return {
              id: `import-${Date.now()}-${index}`,
              unitNumber: cols[0] || '',
              partNumber: cols[1] || '',
              partName: cols[2] || '',
              quantity: parseInt(cols[3]) || 0,
              stockQuantity: parseInt(cols[4]) || 0,
              price: price,
              storageCase: cols[6] || '',
              orderDate: cols[7] || '',
              expectedArrivalDate: cols[8] || '',
              notes: cols[9] || '',
              imageUrl: 'https://picsum.photos/seed/import/100/80',
            };
          })
          .filter((part) => {
            // 重複チェック（ユニット番号+品番の組み合わせ）
            const key = `${part.unitNumber}-${part.partNumber}`;
            if (existingKeys.has(key)) {
              skippedCount++;
              return false; // 重複する場合はスキップ
            }
            existingKeys.add(key); // 追加済みマップに登録
            return true;
          });

        if (genreId) {
          updatePartsData(genreId, [...parts, ...imported]);
        }

        const message = skippedCount > 0
          ? `${imported.length}件のパーツをインポートしました（${skippedCount}件は重複のためスキップ）`
          : `${imported.length}件のパーツをインポートしました`;
        alert(message);
      };

      reader.readAsText(file);
    };

    input.click();
  };

  // CSVエクスポート
  const handleCSVExport = () => {
    const header = 'ユニット番号\t品番\t品名\t数量\t在庫数量\t価格\t収納ケース\t発注日\t入荷予定日\t備考\n';
    const csvData = parts
      .map((part) =>
        [
          part.unitNumber,
          part.partNumber,
          part.partName,
          part.quantity,
          part.stockQuantity,
          `¥${part.price.toLocaleString()}`,
          part.storageCase,
          part.orderDate,
          part.expectedArrivalDate,
          part.notes,
        ].join('\t')
      )
      .join('\n');

    const bom = '\uFEFF';
    const blob = new Blob([bom + header + csvData], {
      type: 'text/tab-separated-values;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `parts-management_${genreId}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // PDFエクスポート
  const handlePDFExport = async () => {
    const tableHTML = `
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: sans-serif; margin: 20px; }
            h1 { font-size: 18px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
          </style>
        </head>
        <body>
          <h1>${genreName} パーツリスト（管理用）</h1>
          <table>
            <thead>
              <tr>
                <th>ユニット番号</th>
                <th>品番</th>
                <th>品名</th>
                <th>数量</th>
                <th>在庫数量</th>
                <th>価格</th>
                <th>収納ケース</th>
                <th>発注日</th>
                <th>入荷予定日</th>
                <th>備考</th>
              </tr>
            </thead>
            <tbody>
              ${parts
                .map(
                  (part) => `
                <tr>
                  <td>${part.unitNumber}</td>
                  <td>${part.partNumber}</td>
                  <td>${part.partName}</td>
                  <td>${part.quantity}</td>
                  <td>${part.stockQuantity}</td>
                  <td>¥${part.price.toLocaleString()}</td>
                  <td>${part.storageCase}</td>
                  <td>${part.orderDate}</td>
                  <td>${part.expectedArrivalDate}</td>
                  <td>${part.notes}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(tableHTML);
      iframeDoc.close();

      await new Promise((resolve) => setTimeout(resolve, 500));

      const canvas = await html2canvas(iframeDoc.body, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = 297;
      const pdfHeight = 210;
      const margin = 10;
      const maxWidth = pdfWidth - margin * 2;
      const maxHeight = pdfHeight - margin * 2;

      const aspectRatio = canvas.width / canvas.height;
      let imgWidth = maxWidth;
      let imgHeight = imgWidth / aspectRatio;

      if (imgHeight > maxHeight) {
        imgHeight = maxHeight;
        imgWidth = imgHeight * aspectRatio;
      }

      const xOffset = margin + (maxWidth - imgWidth) / 2;
      const yOffset = margin + (maxHeight - imgHeight) / 2;

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight);
      pdf.save(`parts-management_${genreId}_${new Date().toISOString().slice(0, 10)}.pdf`);

      document.body.removeChild(iframe);
    }
  };

  const emptyRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - parts.length) : 0;
  const visibleRows = parts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <MainLayout>
      <Box sx={{ width: '100%' }}>
        {/* ヘッダー */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
            パーツリスト管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {genreName} のパーツを管理します
          </Typography>
        </Box>

        {/* アクションボタン */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            onClick={handleAddClick}
          >
            新規追加
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<Delete />}
            onClick={handleBulkDelete}
            disabled={selected.length === 0}
          >
            一括削除 ({selected.length})
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<Image />}
            onClick={handleOpenDiagramDialog}
          >
            展開図を編集
          </Button>
          <Button
            variant="contained"
            color="warning"
            startIcon={<FileUpload />}
            onClick={handleCSVImport}
          >
            CSV一括インポート
          </Button>
          <Button
            variant="contained"
            color="info"
            startIcon={<FileDownload />}
            onClick={handleCSVExport}
          >
            CSVエクスポート
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<PictureAsPdf />}
            onClick={handlePDFExport}
          >
            PDFエクスポート
          </Button>
        </Box>

        {/* 説明 */}
        {selected.length > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {selected.length}件のパーツが選択されています
          </Alert>
        )}

        {/* テーブル */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selected.length > 0 && selected.length < parts.length}
                    checked={parts.length > 0 && selected.length === parts.length}
                    onChange={handleSelectAllClick}
                  />
                </TableCell>
                <TableCell>画像</TableCell>
                <TableCell>ユニット番号</TableCell>
                <TableCell>品番</TableCell>
                <TableCell>品名</TableCell>
                <TableCell align="center">数量</TableCell>
                <TableCell align="center">在庫数量</TableCell>
                <TableCell align="right">価格</TableCell>
                <TableCell>収納ケース</TableCell>
                <TableCell>発注日</TableCell>
                <TableCell>入荷予定日</TableCell>
                <TableCell>備考</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleRows.map((row) => {
                const isItemSelected = isSelected(row.id);
                return (
                  <TableRow
                    key={row.id}
                    hover
                    role="checkbox"
                    aria-checked={isItemSelected}
                    selected={isItemSelected}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isItemSelected}
                        onChange={() => handleClick(row.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {row.imageUrl ? (
                          <Box
                            component="img"
                            src={row.imageUrl}
                            alt="Part"
                            sx={{
                              width: 50,
                              height: 40,
                              objectFit: 'cover',
                              borderRadius: 0.5,
                              cursor: 'pointer',
                              '&:hover': { opacity: 0.8 }
                            }}
                            onClick={() => handleOpenPartImageDialog(row.id, row.imageUrl || '')}
                            title="画像を編集"
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 50,
                              height: 40,
                              bgcolor: 'grey.200',
                              borderRadius: 0.5,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              '&:hover': { bgcolor: 'grey.300' }
                            }}
                            onClick={() => handleOpenPartImageDialog(row.id, '')}
                            title="画像を追加"
                          >
                            <Typography variant="caption" color="text.secondary">
                              なし
                            </Typography>
                          </Box>
                        )}
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleOpenPartImageDialog(row.id, row.imageUrl || '')}
                          title="画像を編集"
                        >
                          <AddPhotoAlternate fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                    <TableCell>{row.unitNumber}</TableCell>
                    <TableCell>{row.partNumber}</TableCell>
                    <TableCell>{row.partName}</TableCell>
                    <TableCell align="center">{row.quantity}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={row.stockQuantity}
                        color={row.stockQuantity === 0 ? 'error' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">¥{row.price.toLocaleString()}</TableCell>
                    <TableCell>{row.storageCase}</TableCell>
                    <TableCell>{row.orderDate}</TableCell>
                    <TableCell>{row.expectedArrivalDate}</TableCell>
                    <TableCell>{row.notes}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleEditClick(row)}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteClick(row.id)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
              {emptyRows > 0 && (
                <TableRow style={{ height: 53 * emptyRows }}>
                  <TableCell colSpan={13} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* ページネーション */}
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={parts.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="表示件数:"
          labelDisplayedRows={({ from, to, count }) =>
            `${count}件中 ${from}-${to}件を表示`
          }
        />

        {/* 新規追加ダイアログ */}
        <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>パーツを追加</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="ユニット番号"
                value={formData.unitNumber || ''}
                onChange={(e) => setFormData({ ...formData, unitNumber: e.target.value })}
                fullWidth
              />
              <TextField
                label="品番"
                value={formData.partNumber || ''}
                onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                fullWidth
              />
              <TextField
                label="品名"
                value={formData.partName || ''}
                onChange={(e) => setFormData({ ...formData, partName: e.target.value })}
                fullWidth
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="数量"
                  type="number"
                  value={formData.quantity || 0}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                  fullWidth
                />
                <TextField
                  label="在庫数量"
                  type="number"
                  value={formData.stockQuantity || 0}
                  onChange={(e) =>
                    setFormData({ ...formData, stockQuantity: parseInt(e.target.value) })
                  }
                  fullWidth
                />
                <TextField
                  label="価格"
                  type="number"
                  value={formData.price || 0}
                  onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
                  fullWidth
                />
              </Box>
              <TextField
                label="収納ケース"
                value={formData.storageCase || ''}
                onChange={(e) => setFormData({ ...formData, storageCase: e.target.value })}
                fullWidth
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="発注日"
                  type="date"
                  value={formData.orderDate || ''}
                  onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="入荷予定日"
                  type="date"
                  value={formData.expectedArrivalDate || ''}
                  onChange={(e) => setFormData({ ...formData, expectedArrivalDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Box>
              <TextField
                label="備考"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                multiline
                rows={3}
                fullWidth
              />

              {/* 画像アップロード */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  画像
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {formData.imageUrl ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        component="img"
                        src={formData.imageUrl}
                        alt="Preview"
                        sx={{ width: 100, height: 80, objectFit: 'cover', borderRadius: 1 }}
                      />
                      <Button
                        size="small"
                        color="error"
                        onClick={() => setFormData({ ...formData, imageUrl: '' })}
                        startIcon={<Close />}
                        title="画像を削除"
                        sx={{ minWidth: 'auto', px: 1 }}
                      >
                        削除
                      </Button>
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        width: 100,
                        height: 80,
                        bgcolor: 'grey.200',
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        なし
                      </Typography>
                    </Box>
                  )}
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<AddPhotoAlternate />}
                  >
                    画像を選択
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleFormImageUpload}
                    />
                  </Button>
                </Box>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAddDialog(false)}>キャンセル</Button>
            <Button onClick={handleAddSubmit} variant="contained" color="primary">
              追加
            </Button>
          </DialogActions>
        </Dialog>

        {/* 編集ダイアログ */}
        <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>パーツを編集</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="ユニット番号"
                value={formData.unitNumber || ''}
                onChange={(e) => setFormData({ ...formData, unitNumber: e.target.value })}
                fullWidth
              />
              <TextField
                label="品番"
                value={formData.partNumber || ''}
                onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                fullWidth
              />
              <TextField
                label="品名"
                value={formData.partName || ''}
                onChange={(e) => setFormData({ ...formData, partName: e.target.value })}
                fullWidth
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="数量"
                  type="number"
                  value={formData.quantity || 0}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                  fullWidth
                />
                <TextField
                  label="在庫数量"
                  type="number"
                  value={formData.stockQuantity || 0}
                  onChange={(e) =>
                    setFormData({ ...formData, stockQuantity: parseInt(e.target.value) })
                  }
                  fullWidth
                />
                <TextField
                  label="価格"
                  type="number"
                  value={formData.price || 0}
                  onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
                  fullWidth
                />
              </Box>
              <TextField
                label="収納ケース"
                value={formData.storageCase || ''}
                onChange={(e) => setFormData({ ...formData, storageCase: e.target.value })}
                fullWidth
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="発注日"
                  type="date"
                  value={formData.orderDate || ''}
                  onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="入荷予定日"
                  type="date"
                  value={formData.expectedArrivalDate || ''}
                  onChange={(e) => setFormData({ ...formData, expectedArrivalDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Box>
              <TextField
                label="備考"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                multiline
                rows={3}
                fullWidth
              />

              {/* 画像アップロード */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  画像
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {formData.imageUrl ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        component="img"
                        src={formData.imageUrl}
                        alt="Preview"
                        sx={{ width: 100, height: 80, objectFit: 'cover', borderRadius: 1 }}
                      />
                      <Button
                        size="small"
                        color="error"
                        onClick={() => setFormData({ ...formData, imageUrl: '' })}
                        startIcon={<Close />}
                        title="画像を削除"
                        sx={{ minWidth: 'auto', px: 1 }}
                      >
                        削除
                      </Button>
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        width: 100,
                        height: 80,
                        bgcolor: 'grey.200',
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        なし
                      </Typography>
                    </Box>
                  )}
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<AddPhotoAlternate />}
                  >
                    画像を選択
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleFormImageUpload}
                    />
                  </Button>
                </Box>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenEditDialog(false)}>キャンセル</Button>
            <Button onClick={handleEditSubmit} variant="contained" color="primary">
              保存
            </Button>
          </DialogActions>
        </Dialog>

        {/* 展開図編集ダイアログ */}
        <Dialog
          open={openDiagramDialog}
          onClose={() => setOpenDiagramDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>展開図を編集</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              {/* 現在の展開図 */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  現在の展開図
                </Typography>
                {tempDiagramUrl ? (
                  <Box sx={{ position: 'relative' }}>
                    <Box
                      component="img"
                      src={tempDiagramUrl}
                      alt="展開図"
                      sx={{
                        width: '100%',
                        height: 'auto',
                        maxHeight: 400,
                        objectFit: 'contain',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
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
                      onClick={handleDiagramDelete}
                      startIcon={<Close />}
                      title="展開図を削除"
                    >
                      削除
                    </Button>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      width: '100%',
                      height: 200,
                      bgcolor: 'grey.100',
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px dashed',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      展開図が設定されていません
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* アップロードボタン */}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  component="label"
                  startIcon={<AddPhotoAlternate />}
                  fullWidth
                >
                  {tempDiagramUrl ? '展開図を変更' : '展開図をアップロード'}
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleDiagramUpload}
                  />
                </Button>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancelDiagram} variant="outlined">
              キャンセル
            </Button>
            <Button onClick={handleSaveDiagram} variant="contained" color="primary">
              保存
            </Button>
          </DialogActions>
        </Dialog>

        {/* パーツ画像編集ダイアログ */}
        <Dialog
          open={openPartImageDialog}
          onClose={handleCancelPartImage}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>パーツ画像を編集</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              {/* 現在の画像 */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  現在の画像
                </Typography>
                {tempPartImage ? (
                  <Box sx={{ position: 'relative' }}>
                    <Box
                      component="img"
                      src={tempPartImage}
                      alt="パーツ画像"
                      sx={{
                        width: '100%',
                        height: 'auto',
                        maxHeight: 300,
                        objectFit: 'contain',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
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
                      onClick={handlePartImageDelete}
                      startIcon={<Close />}
                      title="画像を削除"
                    >
                      削除
                    </Button>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      width: '100%',
                      height: 150,
                      bgcolor: 'grey.100',
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px dashed',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      画像が設定されていません
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* アップロードボタン */}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  component="label"
                  startIcon={<AddPhotoAlternate />}
                  fullWidth
                >
                  {tempPartImage ? '画像を変更' : '画像をアップロード'}
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handlePartImageUpload}
                  />
                </Button>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancelPartImage} variant="outlined">
              キャンセル
            </Button>
            <Button onClick={handleSavePartImage} variant="contained" color="primary">
              保存
            </Button>
          </DialogActions>
        </Dialog>

        {/* 画像エディターダイアログ */}
        <ImageEditorDialog
          open={openImageEditor}
          imageUrl={editingImageUrl}
          onClose={handleCancelImageEditor}
          onSave={handleSaveEditedImage}
          title={
            imageEditorTarget === 'diagram'
              ? '展開図を編集'
              : imageEditorTarget === 'part'
              ? 'パーツ画像を編集'
              : '画像を編集'
          }
        />
      </Box>
    </MainLayout>
  );
};
