import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  AppBar,
  Toolbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import { ArrowBack, Visibility, VisibilityOff, PictureAsPdf, TableChart, Description, Search } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { partsApi, diagramImagesApi } from '@/services/api';

// ============================================================
// PartsListPage
// ============================================================
// パーツリストページ（P-004）
// - ジャンル内のパーツ一覧を展開図とともに表示
// - 展開図表示（大きな画像1枚、表示/非表示切り替え可能）
// - パーツ一覧表示（テーブル形式）
// - 各パーツ行に小さい画像表示（表示/非表示切り替え可能）
// - 画像位置選択（左端または右端）
// ============================================================

export const PartsListPage = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { categoryId, genreId, unitId } = useParams<{
    categoryId: string;
    genreId: string;
    unitId: string;
  }>();

  // パーツ一覧取得（ジャンル全体）
  const { data: allParts = [], isLoading, error } = useQuery({
    queryKey: ['parts', genreId],
    queryFn: () => partsApi.getParts(genreId!),
    enabled: !!genreId,
  });

  // ユニットIDでフィルタリング
  const parts = unitId
    ? allParts.filter((part: any) => part.unitId === unitId)
    : allParts;

  // ジャンル情報取得（展開図URL・ジャンル名取得用）
  const { data: genres } = useQuery({
    queryKey: ['genres'],
    queryFn: async () => {
      // すべてのカテゴリーのジャンルを取得する必要があるため、
      // まずgenreIdから逆引きする方法を使う
      // 実際にはgenreの詳細取得APIがあればそちらを使うべき
      if (!genreId) return [];
      const genre = parts.find((p) => p.genreId === genreId)?.genre;
      return genre ? [genre] : [];
    },
    enabled: !!genreId && parts.length > 0,
  });

  // 展開図取得（DiagramImage API使用、ユニットIDで取得）
  const { data: diagramImage } = useQuery({
    queryKey: ['diagram-image', unitId],
    queryFn: () => diagramImagesApi.getDiagramImage(unitId!),
    enabled: !!unitId,
  });

  const genre = genres?.[0] || parts[0]?.genre;
  const genreName = genre?.name || 'ジャンル';
  const diagramUrl = diagramImage?.imageUrl || ''; // DiagramImageから展開図URLを取得

  // ユニット情報を取得（unitIdでフィルタリングされている場合）
  const unit = unitId && parts.length > 0 ? (parts[0] as any).unit : null;
  const unitNumber = unit?.unitNumber || null;
  const unitName = unit?.unitName || null;

  // デバッグログ（本番環境で確認用）
  console.log('🔍 PartsListPage Debug:', {
    unitId,
    partsCount: parts.length,
    firstPart: parts[0],
    unit,
    unitNumber,
    unitName,
  });

  const [showDiagram, setShowDiagram] = useState(true);
  const [showPartImages, setShowPartImages] = useState(true);
  const [imagePosition, setImagePosition] = useState<'left' | 'right'>('left');

  const handleExportPDF = async () => {
    // 展開図のHTML（showDiagramがtrueの場合のみ）
    const diagramHTML = showDiagram && diagramUrl ? `
      <div style="margin-bottom: 10px; text-align: center;">
        <img src="${diagramUrl}" style="width: 200px; height: auto; display: inline-block;" crossorigin="anonymous" />
      </div>
    ` : '';

    // パーツ画像列のヘッダー（showPartImagesがtrueの場合のみ）
    const imageHeaderHTML = showPartImages ? '<th style="width: 50px;">画像<br/>Image</th>' : '';

    // 一時的なHTMLテーブルを作成
    const tableHTML = `
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif;
              margin: 0;
              padding: 10px;
            }
            .container {
              max-width: 100%;
              width: auto;
            }
            h1 { font-size: 10px; margin-bottom: 5px; font-weight: bold; }
            .info { font-size: 6px; margin-bottom: 10px; line-height: 1.4; }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 5px;
            }
            th, td {
              border: none;
              padding: 2px 1px;
              text-align: left;
              white-space: nowrap;
            }
            th {
              background-color: #f5f5f5;
              font-weight: bold;
              font-size: 5px;
              line-height: 1.2;
              border-bottom: 0.5px solid #ddd;
            }
            tr:not(:last-child) td {
              border-bottom: 0.5px solid #f0f0f0;
            }
            .stock-zero { color: #d32f2f; font-weight: bold; }
            .part-image { width: 40px; height: 30px; object-fit: cover; }
          </style>
        </head>
        <body>
          <h1>${genreName} パーツリスト / Parts List</h1>
          <div class="info">
            <div>ジャンル: ${genreName}</div>
            <div>件数: ${parts.length}件</div>
          </div>
          ${diagramHTML}
          <table>
            <thead>
              <tr>
                ${imageHeaderHTML}
                <th>ユニット番号<br/>Unit No.</th>
                <th>ユニット個別番号<br/>Unit Individual No.</th>
                <th>品番<br/>Part No.</th>
                <th>品名<br/>Part Name</th>
                <th>数量<br/>Units</th>
                <th>在庫数量<br/>Stock</th>
                <th>価格<br/>List Price</th>
                <th>収納ケース<br/>Storage</th>
                <th>発注日<br/>Order Date</th>
                <th>入荷予定日<br/>Arrival Date</th>
                <th>備考<br/>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${parts.map(part => `
                <tr>
                  ${showPartImages ? `<td><img src="${part.imageUrl || ''}" class="part-image" crossorigin="anonymous" /></td>` : ''}
                  <td>${(part as any).unit?.unitNumber || '-'}</td>
                  <td>${part.unitNumber}</td>
                  <td>${part.partNumber}</td>
                  <td>${part.partName}</td>
                  <td>${part.quantity || '-'}</td>
                  <td class="${(part.partMaster?.stockQuantity ?? 0) === 0 ? 'stock-zero' : ''}">${part.partMaster?.stockQuantity ?? 0}</td>
                  <td>${part.price ? `¥${part.price.toLocaleString()}` : '-'}</td>
                  <td>${part.storageCase || ''}</td>
                  <td>${part.orderDate ? new Date(part.orderDate).toLocaleDateString('ja-JP') : ''}</td>
                  <td>${part.expectedArrivalDate ? new Date(part.expectedArrivalDate).toLocaleDateString('ja-JP') : ''}</td>
                  <td>${part.notes || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    // 一時的なiframeを作成してHTMLをレンダリング
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(tableHTML);
      iframeDoc.close();

      // レンダリング完了を待つ
      await new Promise(resolve => setTimeout(resolve, 500));

      // html2canvasでキャプチャ（高解像度）
      const canvas = await html2canvas(iframeDoc.body, {
        scale: 6, // 解像度を6倍に上げる（より鮮明な文字）
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      // PDFに変換（A4縦、複数ページ対応）
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // A4サイズとマージン設定
      const pdfWidth = 210; // A4 portrait width (mm)
      const pdfHeight = 297; // A4 portrait height (mm)
      const marginX = 10; // 横の最小余白（10mm）
      const marginY = 10; // 縦の余白（10mm）
      const maxWidth = pdfWidth - (marginX * 2); // 190mm（最大幅）
      const contentHeight = pdfHeight - (marginY * 2); // 277mm（1ページあたりのコンテンツ高さ）

      // 画像の実際のサイズを計算（横幅基準、最大幅まで）
      let imgWidthInPdf = maxWidth;
      let imgHeightInPdf = (canvas.height * imgWidthInPdf) / canvas.width;

      // 横方向の中央配置のためのオフセット
      // maxWidthを使う場合でも、中央に配置
      const xOffset = (pdfWidth - imgWidthInPdf) / 2;

      // 画像を複数ページに分割して配置
      let remainingHeight = imgHeightInPdf;
      let sourceY = 0; // キャンバス上のY座標（ピクセル）
      let pageIndex = 0;

      while (remainingHeight > 0) {
        if (pageIndex > 0) {
          pdf.addPage();
        }

        // 今回のページで表示する高さ
        const heightInThisPage = Math.min(contentHeight, remainingHeight);

        // Canvas上での高さ（ピクセル単位）
        const sourceHeight = (heightInThisPage * canvas.width) / imgWidthInPdf;

        // この部分の画像データを切り出す
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sourceHeight;
        const pageCtx = pageCanvas.getContext('2d');

        if (pageCtx) {
          pageCtx.drawImage(
            canvas,
            0, sourceY, // ソース画像の開始位置
            canvas.width, sourceHeight, // ソース画像の切り出しサイズ
            0, 0, // 描画先の開始位置
            canvas.width, sourceHeight // 描画先のサイズ
          );

          const pageImgData = pageCanvas.toDataURL('image/png');
          pdf.addImage(pageImgData, 'PNG', xOffset, marginY, imgWidthInPdf, heightInThisPage);
        }

        sourceY += sourceHeight;
        remainingHeight -= heightInThisPage;
        pageIndex++;
      }

      pdf.save(`parts-list_${genreId}_${new Date().toISOString().slice(0, 10)}.pdf`);

      // iframeを削除
      document.body.removeChild(iframe);
    }
  };

  const handleExportCSV = () => {
    // TSVヘッダー（タブ区切り - 列が自動的に揃う）
    const header = showPartImages
      ? '画像URL\tユニット番号\tユニット個別番号\t品番\t品名\t数量\t在庫数量\t価格\t収納ケース\t発注日\t入荷予定日\t備考\n'
      : 'ユニット番号\tユニット個別番号\t品番\t品名\t数量\t在庫数量\t価格\t収納ケース\t発注日\t入荷予定日\t備考\n';

    // TSVデータ（タブ区切り、数値を文字列として扱う）
    const tsvData = parts.map((part) => {
      const baseData = [
        (part as any).unit?.unitNumber || '-',
        part.unitNumber,
        part.partNumber,
        part.partName,
        part.quantity || '-',
        `="${part.partMaster?.stockQuantity ?? 0}"`, // ="値" 形式で文字列として扱う
        part.price ? `¥${part.price.toLocaleString()}` : '-',
        part.storageCase || '',
        part.orderDate ? new Date(part.orderDate).toLocaleDateString('ja-JP') : '',
        part.expectedArrivalDate ? new Date(part.expectedArrivalDate).toLocaleDateString('ja-JP') : '',
        part.notes || '',
      ];

      // 画像表示中の場合、画像URLを先頭に追加
      if (showPartImages) {
        return [part.imageUrl || '', ...baseData].join('\t');
      }
      return baseData.join('\t'); // タブ区切り
    }).join('\n');

    // BOM付きUTF-8（Excelで文字化け防止）
    const bom = '\uFEFF';
    const tsvContent = bom + header + tsvData;

    // ダウンロード
    const blob = new Blob([tsvContent], { type: 'text/tab-separated-values;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `parts-list_${genreId}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    // ヘッダー行（画像表示中の場合は画像URLを含める）
    const headerRow = showPartImages
      ? ['画像URL', 'ユニット番号', 'ユニット個別番号', '品番', '品名', '数量', '在庫数量', '価格', '収納ケース', '発注日', '入荷予定日', '備考']
      : ['ユニット番号', 'ユニット個別番号', '品番', '品名', '数量', '在庫数量', '価格', '収納ケース', '発注日', '入荷予定日', '備考'];

    // ワークシートデータ作成（数値を文字列に変換して左寄せ）
    const wsData = [
      // ヘッダー行
      headerRow,
      // データ行
      ...parts.map((part) => {
        const baseData = [
          (part as any).unit?.unitNumber || '-',
          part.unitNumber,
          part.partNumber,
          part.partName,
          part.quantity || '-',
          String(part.partMaster?.stockQuantity ?? 0), // 文字列に変換
          part.price ? `¥${part.price.toLocaleString()}` : '-',
          part.storageCase || '',
          part.orderDate ? new Date(part.orderDate).toLocaleDateString('ja-JP') : '',
          part.expectedArrivalDate ? new Date(part.expectedArrivalDate).toLocaleDateString('ja-JP') : '',
          part.notes || '',
        ];

        // 画像表示中の場合、画像URLを先頭に追加
        if (showPartImages) {
          return [part.imageUrl || '', ...baseData];
        }
        return baseData;
      }),
    ];

    // 展開図URLを追加（showDiagramがtrueの場合）
    if (showDiagram && diagramUrl) {
      wsData.push([]); // 空行
      wsData.push(['展開図URL', diagramUrl]);
    }

    // ワークシート作成
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // 列幅設定（PDFと同じ比率で統一）
    const colWidths = showPartImages
      ? [
          { wch: 50 }, // 画像URL
          { wch: 12 }, // ユニット番号
          { wch: 15 }, // ユニット個別番号
          { wch: 18 }, // 品番
          { wch: 40 }, // 品名
          { wch: 10 }, // 数量
          { wch: 12 }, // 在庫数量
          { wch: 15 }, // 価格
          { wch: 15 }, // 収納ケース
          { wch: 15 }, // 発注日
          { wch: 15 }, // 入荷予定日
          { wch: 25 }, // 備考
        ]
      : [
          { wch: 12 }, // ユニット番号
          { wch: 15 }, // ユニット個別番号
          { wch: 18 }, // 品番
          { wch: 40 }, // 品名
          { wch: 10 }, // 数量
          { wch: 12 }, // 在庫数量
          { wch: 15 }, // 価格
          { wch: 15 }, // 収納ケース
          { wch: 15 }, // 発注日
          { wch: 15 }, // 入荷予定日
          { wch: 25 }, // 備考
        ];

    ws['!cols'] = colWidths;

    // 在庫数量列のインデックス（画像表示中は2列、ユニット番号分ずれる）
    const stockColumnIndex = showPartImages ? 6 : 5;

    // 全てのセルに左寄せスタイルを適用
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cellAddress]) continue;

        // 左寄せスタイル
        ws[cellAddress].s = {
          alignment: { horizontal: 'left', vertical: 'center' },
        };

        // 在庫0のセルは赤字・太字（左寄せは維持）
        if (C === stockColumnIndex && R > 0 && R <= parts.length) { // 在庫数量列でヘッダー以外
          const rowData = parts[R - 1];
          if (rowData && (rowData.partMaster?.stockQuantity ?? 0) === 0) {
            ws[cellAddress].s = {
              font: { color: { rgb: 'D32F2F' }, bold: true },
              alignment: { horizontal: 'left', vertical: 'center' },
            };
          }
        }

        // ヘッダー行は太字
        if (R === 0) {
          ws[cellAddress].s = {
            font: { bold: true },
            alignment: { horizontal: 'left', vertical: 'center' },
          };
        }
      }
    }

    // ワークブック作成
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'パーツリスト');

    // ファイル出力
    XLSX.writeFile(wb, `parts-list_${genreId}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleBackToCategory = () => {
    navigate('/categories');
  };

  const handleBackToGenre = () => {
    if (categoryId) {
      navigate(`/categories/${categoryId}/genres`);
    } else {
      navigate('/categories');
    }
  };

  const handleBackToUnit = () => {
    if (categoryId && genreId) {
      navigate(`/categories/${categoryId}/genres/${genreId}/units`);
    } else {
      navigate('/categories');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'auto',
      }}
    >
      {/* ヘッダー */}
      <AppBar position="static" elevation={0} sx={{ backgroundColor: '#3949ab', width: 'calc(100% - 48px)', mt: 6, mx: 3 }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem', mb: 0.5 }}>
              Genre Code: {genre?.genreId || genreId}
            </Typography>
            <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
              {genreName}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              color="inherit"
              onClick={() => navigate('/search')}
              startIcon={<Search />}
              sx={{ color: '#ffffff' }}
            >
              検索
            </Button>
            <Button
              color="inherit"
              onClick={handleLogout}
              sx={{ color: '#ffffff' }}
            >
              ログアウト
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* メインコンテンツ */}
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          p: 3,
        }}
      >
        {/* 展開図表示切り替えボタン */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button
            variant="contained"
            onClick={() => setShowDiagram(!showDiagram)}
            startIcon={showDiagram ? <VisibilityOff /> : <Visibility />}
            sx={{
              backgroundColor: '#424242',
              color: '#ffffff',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: '#616161',
              },
            }}
          >
            {showDiagram ? 'Hide' : 'Open'}
          </Button>
        </Box>

        {/* 展開図 */}
        {showDiagram && diagramUrl && (
          <Box
            sx={{
              width: '100%',
              mb: 3,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <Box
              sx={{
                width: '50%',
                backgroundColor: '#ffffff',
                borderRadius: 1,
                overflow: 'hidden',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              <img
                src={diagramUrl}
                alt="展開図"
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                }}
              />
            </Box>
          </Box>
        )}

        {/* ジャンル名とユニット情報 */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ color: '#757575', mb: 0.5 }}>
            {genreName}
          </Typography>
          {unitName && (
            <Typography variant="h6" sx={{ color: '#333', fontWeight: 600, mb: 0.5 }}>
              {unitName}
            </Typography>
          )}
          {unitNumber && (
            <Typography variant="body2" sx={{ color: '#757575' }}>
              Unit Code: {unitNumber}
            </Typography>
          )}
        </Box>

        {/* 出力説明文 */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <Typography variant="caption" sx={{ color: '#757575', fontSize: '0.75rem' }}>
            ※現在の表示状態（展開図・パーツ画像）が出力に反映されます
          </Typography>
        </Box>

        {/* 出力ボタン */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 2 }}>
          <Button
            variant="contained"
            color="error"
            onClick={handleExportPDF}
            startIcon={<PictureAsPdf />}
            sx={{
              px: 2,
              py: 1,
              fontSize: '0.875rem',
              fontWeight: 600,
              textTransform: 'none',
            }}
          >
            PDF
          </Button>
          <Button
            variant="contained"
            color="info"
            onClick={handleExportCSV}
            startIcon={<Description />}
            sx={{
              px: 2,
              py: 1,
              fontSize: '0.875rem',
              fontWeight: 600,
              textTransform: 'none',
            }}
          >
            CSV
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleExportExcel}
            startIcon={<TableChart />}
            sx={{
              px: 2,
              py: 1,
              fontSize: '0.875rem',
              fontWeight: 600,
              textTransform: 'none',
            }}
          >
            Excel
          </Button>
        </Box>

        {/* パーツ一覧テーブル */}
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                {showPartImages && imagePosition === 'left' && (
                  <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.75rem', width: 100, px: 0.5, py: 0.3, height: 48 }}></TableCell>
                )}
                <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.75rem', width: 80, px: 0.5, py: 0.3, height: 48 }}>ユニット番号<br />Unit No.</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.75rem', width: 80, px: 0.5, py: 0.3, height: 48 }}>ユニット個別番号<br />Unit Individual No.</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.75rem', width: 100, px: 0.5, py: 0.3, height: 48 }}>品番<br />Part No.</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.75rem', width: 450, px: 0.5, py: 0.3, height: 48 }}>品名<br />Part Name</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.75rem', width: 60, px: 0.5, py: 0.3, height: 48 }}>数量<br />Units</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.75rem', width: 70, px: 0.5, py: 0.3, height: 48 }}>在庫数量<br />Stock</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.75rem', width: 90, px: 0.5, py: 0.3, height: 48 }}>価格<br />List Price</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.75rem', width: 90, px: 0.5, py: 0.3, height: 48 }}>収納ケース<br />Storage</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.75rem', width: 100, px: 0.5, py: 0.3, height: 48 }}>発注日<br />Order Date</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.75rem', width: 100, px: 0.5, py: 0.3, height: 48 }}>入荷予定日<br />Arrival Date</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.75rem', px: 0.5, py: 0.3, height: 48 }}>備考<br />Notes</TableCell>
                {showPartImages && imagePosition === 'right' && (
                  <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.75rem', width: 100, px: 0.5, py: 0.3, height: 48 }}></TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                    <Alert severity="error">
                      パーツの取得に失敗しました。再度お試しください。
                    </Alert>
                  </TableCell>
                </TableRow>
              ) : parts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      パーツが登録されていません
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                parts.map((part) => (
                  <TableRow
                    key={part.id}
                    sx={{
                      '&:hover': {
                        backgroundColor: '#f5f5f5',
                      },
                    }}
                  >
                    {showPartImages && imagePosition === 'left' && (
                      <TableCell align="center" sx={{ width: 100, px: 0.5, py: 0.3, height: 68, verticalAlign: 'middle' }}>
                        {part.imageUrl && (
                          <Box
                            component="img"
                            src={part.imageUrl}
                            alt={part.partName}
                            sx={{
                              width: 60,
                              height: 60,
                              objectFit: 'cover',
                              objectPosition: `${(part.cropPositionX ?? 0.5) * 100}% ${(part.cropPositionY ?? 0.5) * 100}%`,
                              borderRadius: 0.5,
                              display: 'block',
                              margin: '0 auto',
                            }}
                          />
                        )}
                      </TableCell>
                    )}
                    <TableCell align="center" sx={{ fontSize: '0.75rem', width: 80, px: 0.5, py: 0.3, height: 48 }}>{(part as any).unit?.unitNumber || '-'}</TableCell>
                    <TableCell align="center" sx={{ fontSize: '0.75rem', width: 80, px: 0.5, py: 0.3, height: 48 }}>{part.unitNumber}</TableCell>
                    <TableCell align="center" sx={{ fontSize: '0.75rem', width: 100, px: 0.5, py: 0.3, height: 48 }}>{part.partNumber}</TableCell>
                    <TableCell align="center" sx={{ fontSize: '0.75rem', width: 450, px: 0.5, py: 0.3, height: 48 }}>{part.partName}</TableCell>
                    <TableCell align="center" sx={{ fontSize: '0.75rem', width: 60, px: 0.5, py: 0.3, height: 48 }}>{part.quantity || '-'}</TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        fontSize: '0.75rem',
                        width: 70,
                        px: 0.5,
                        py: 0.3,
                        height: 48,
                        color: (part.partMaster?.stockQuantity ?? 0) === 0 ? '#d32f2f' : '#212121',
                        fontWeight: (part.partMaster?.stockQuantity ?? 0) === 0 ? 600 : 400,
                      }}
                    >
                      {part.partMaster?.stockQuantity ?? 0}
                    </TableCell>
                    <TableCell align="center" sx={{ fontSize: '0.75rem', width: 90, px: 0.5, py: 0.3, height: 48 }}>{part.price ? `¥${part.price.toLocaleString()}` : '-'}</TableCell>
                    <TableCell align="center" sx={{ fontSize: '0.75rem', width: 90, px: 0.5, py: 0.3, height: 48 }}>{part.storageCase || ''}</TableCell>
                    <TableCell align="center" sx={{ fontSize: '0.75rem', width: 100, px: 0.5, py: 0.3, height: 48 }}>{part.orderDate ? new Date(part.orderDate).toLocaleDateString('ja-JP') : ''}</TableCell>
                    <TableCell align="center" sx={{ fontSize: '0.75rem', width: 100, px: 0.5, py: 0.3, height: 48 }}>{part.expectedArrivalDate ? new Date(part.expectedArrivalDate).toLocaleDateString('ja-JP') : ''}</TableCell>
                    <TableCell align="center" sx={{ fontSize: '0.75rem', px: 0.5, py: 0.3, height: 48 }}>{part.notes || ''}</TableCell>
                    {showPartImages && imagePosition === 'right' && (
                      <TableCell align="center" sx={{ width: 100, px: 0.5, py: 0.3, height: 68, verticalAlign: 'middle' }}>
                        {part.imageUrl && (
                          <Box
                            component="img"
                            src={part.imageUrl}
                            alt={part.partName}
                            sx={{
                              width: 60,
                              height: 60,
                              objectFit: 'cover',
                              objectPosition: `${(part.cropPositionX ?? 0.5) * 100}% ${(part.cropPositionY ?? 0.5) * 100}%`,
                              borderRadius: 0.5,
                              display: 'block',
                              margin: '0 auto',
                            }}
                          />
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* 画像表示設定ボタン */}
        <Box sx={{ display: 'flex', gap: 2, mt: 3, justifyContent: 'center' }}>
          <Button
            variant="outlined"
            onClick={() => setShowPartImages(!showPartImages)}
            size="small"
            sx={{ textTransform: 'none' }}
          >
            {showPartImages ? 'パーツ画像を非表示' : 'パーツ画像を表示'}
          </Button>
          {showPartImages && (
            <Button
              variant="outlined"
              onClick={() => setImagePosition(imagePosition === 'left' ? 'right' : 'left')}
              size="small"
              sx={{ textTransform: 'none' }}
            >
              画像位置: {imagePosition === 'left' ? '左端' : '右端'}
            </Button>
          )}
        </Box>

        {/* 戻るボタン */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 3, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={handleBackToCategory}
            size="large"
            sx={{
              px: 4,
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 600,
            }}
          >
            ← カテゴリー選択へ戻る
          </Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={handleBackToGenre}
            size="large"
            sx={{
              px: 4,
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 600,
            }}
          >
            ← ジャンル選択へ戻る
          </Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={handleBackToUnit}
            size="large"
            sx={{
              px: 4,
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 600,
            }}
          >
            ← ユニット選択へ戻る
          </Button>
        </Box>
      </Box>
    </Box>
  );
};
