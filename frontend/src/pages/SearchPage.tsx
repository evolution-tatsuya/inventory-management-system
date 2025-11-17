import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  AppBar,
  Toolbar,
  Card,
  Stack,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { ArrowBack, Search as SearchIcon, PictureAsPdf, TableChart, Description } from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { GENRE_NAMES } from '@/data/partsData';
import { usePartsStore } from '@/stores/partsStore';

// ============================================================
// SearchPage
// ============================================================
// 検索ページ（P-005）
// - キーワード検索機能（部分一致 / ケース番号のみ完全一致）
// - 検索条件選択：全て、品番、品名、ジャンル、ケース番号
// - ジャンル名、品番、品名、ケース番号で横断検索
// - 検索結果を詳細情報付きで一覧表示
//   - パーツ: 品番、ケース番号、ユニット番号、数量、在庫数量
// - 検索結果を複数形式で出力（PDF/CSV/Excel）
//   - PDF: html2canvas使用、高解像度、日本語対応、枠線なし
//   - CSV: タブ区切り（TSV）、BOM付きUTF-8、列が自動的に揃う
//   - Excel: xlsx使用、在庫0を赤字表示、列幅統一
// - 検索結果カードをクリックでパーツリストページへ遷移
// - 戻るボタン（カテゴリー選択へ）
// ============================================================

// 検索アイテムの型定義
interface SearchItem {
  id: string;
  type: 'genre' | 'part';
  categoryId: string;
  genreId: string;
  name: string;
  partNumber: string;
  storageCase: string;
  unitNumber: string;
  quantity: number;
  stockQuantity: number;
  price: number;
  image: string;
}

const TYPE_LABELS: Record<string, string> = {
  genre: 'ジャンル',
  part: 'パーツ',
};

type SearchFilter = 'all' | 'partNumber' | 'name' | 'genre' | 'storageCase';

export const SearchPage = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  // Zustandストア全体を監視（セレクター使用）
  const partsData = usePartsStore((state) => state.partsData);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchFilter, setSearchFilter] = useState<SearchFilter>('all');

  // Zustandストアから検索用アイテムリストを生成（partsDataが更新されると自動的に再生成）
  const ALL_ITEMS = useMemo((): SearchItem[] => {
    const items: SearchItem[] = [];

    // ジャンルを追加
    Object.entries(GENRE_NAMES).forEach(([genreId, genreName]) => {
      items.push({
        id: `g${genreId}`,
        type: 'genre',
        categoryId: '1',
        genreId,
        name: genreName,
        partNumber: '',
        storageCase: '',
        unitNumber: '',
        quantity: 0,
        stockQuantity: 0,
        price: 0,
        image: `https://picsum.photos/seed/genre${genreId}/400/300`,
      });
    });

    // Zustandストアからパーツを追加
    Object.entries(partsData).forEach(([genreId, parts]) => {
      parts.forEach((part) => {
        items.push({
          id: part.id,
          type: 'part',
          categoryId: '1',
          genreId,
          name: part.partName,
          partNumber: part.partNumber,
          storageCase: part.storageCase,
          unitNumber: part.unitNumber,
          quantity: part.quantity,
          stockQuantity: part.stockQuantity,
          price: part.price,
          image: part.imageUrl,
        });
      });
    });

    return items;
  }, [partsData]);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    const query = searchQuery.toLowerCase();
    let results: typeof ALL_ITEMS = [];

    if (searchFilter === 'all') {
      // 全て：部分一致で全フィールド検索
      results = ALL_ITEMS.filter((item) =>
        item.name.toLowerCase().includes(query) ||
        item.partNumber.toLowerCase().includes(query) ||
        item.storageCase.toLowerCase().includes(query)
      );
    } else if (searchFilter === 'partNumber') {
      // 品番：部分一致
      results = ALL_ITEMS.filter((item) =>
        item.partNumber.toLowerCase().includes(query)
      );
    } else if (searchFilter === 'name') {
      // 品名：部分一致
      results = ALL_ITEMS.filter((item) =>
        item.name.toLowerCase().includes(query)
      );
    } else if (searchFilter === 'genre') {
      // ジャンル：部分一致
      results = ALL_ITEMS.filter((item) =>
        item.type === 'genre' && item.name.toLowerCase().includes(query)
      );
    } else if (searchFilter === 'storageCase') {
      // ケース番号：完全一致
      results = ALL_ITEMS.filter((item) =>
        item.storageCase.toLowerCase() === query
      );
    }

    setSearchResults(results);
    setHasSearched(true);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const handleItemClick = (item: typeof ALL_ITEMS[0]) => {
    // ジャンルまたはパーツの詳細ページ（パーツリストページ）へ遷移
    if (item.genreId) {
      navigate(`/genres/${item.genreId}/parts`);
    }
  };

  const handleBackClick = () => {
    navigate('/categories');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleExportPDF = async () => {
    // パーツのみをフィルタリング
    const partsData = searchResults.filter(item => item.type === 'part');

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
          </style>
        </head>
        <body>
          <h1>検索結果一覧 / Search Results</h1>
          <div class="info">
            <div>検索クエリ: ${searchQuery}</div>
            <div>検索条件: ${searchFilter}</div>
            <div>結果件数: ${searchResults.length}件</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>ユニット番号<br/>Unit No.</th>
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
              ${partsData.map(item => `
                <tr>
                  <td>${item.unitNumber}</td>
                  <td>${item.partNumber}</td>
                  <td>${item.name}</td>
                  <td>${item.quantity}</td>
                  <td class="${item.stockQuantity === 0 ? 'stock-zero' : ''}">${item.stockQuantity}</td>
                  <td>¥${item.price.toLocaleString()}</td>
                  <td>${item.storageCase}</td>
                  <td></td>
                  <td></td>
                  <td></td>
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

      // PDFに変換
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 277; // A4横幅（mm）
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`search-results_${new Date().toISOString().slice(0, 10)}.pdf`);

      // iframeを削除
      document.body.removeChild(iframe);
    }
  };

  const handleExportCSV = () => {
    // パーツのみをフィルタリング
    const partsData = searchResults.filter(item => item.type === 'part');

    // TSVヘッダー（タブ区切り - 列が自動的に揃う）
    const header = 'ユニット番号\t品番\t品名\t数量\t在庫数量\t価格\t収納ケース\t発注日\t入荷予定日\t備考\n';

    // TSVデータ（タブ区切り、数値を文字列として扱う）
    const tsvData = partsData.map((item) => {
      return [
        item.unitNumber,
        item.partNumber,
        item.name,
        `="${item.quantity}"`, // ="値" 形式で文字列として扱う
        `="${item.stockQuantity}"`, // ="値" 形式で文字列として扱う
        `¥${item.price.toLocaleString()}`,
        item.storageCase,
        '', // 発注日
        '', // 入荷予定日
        '', // 備考
      ].join('\t'); // タブ区切り
    }).join('\n');

    // BOM付きUTF-8（Excelで文字化け防止）
    const bom = '\uFEFF';
    const tsvContent = bom + header + tsvData;

    // ダウンロード
    const blob = new Blob([tsvContent], { type: 'text/tab-separated-values;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `search-results_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    // パーツのみをフィルタリング
    const partsData = searchResults.filter(item => item.type === 'part');

    // ワークシートデータ作成（数値を文字列に変換して左寄せ）
    const wsData = [
      // ヘッダー行
      ['ユニット番号', '品番', '品名', '数量', '在庫数量', '価格', '収納ケース', '発注日', '入荷予定日', '備考'],
      // データ行
      ...partsData.map((item) => [
        item.unitNumber,
        item.partNumber,
        item.name,
        String(item.quantity), // 文字列に変換
        String(item.stockQuantity), // 文字列に変換
        `¥${item.price.toLocaleString()}`,
        item.storageCase,
        '', // 発注日
        '', // 入荷予定日
        '', // 備考
      ]),
    ];

    // ワークシート作成
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // 列幅設定（PDFと同じ比率で統一）
    ws['!cols'] = [
      { wch: 15 }, // ユニット番号
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
        if (C === 4 && R > 0) { // 在庫数量列（インデックス4）でヘッダー以外
          const rowData = partsData[R - 1];
          if (rowData && rowData.stockQuantity === 0) {
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
    XLSX.utils.book_append_sheet(wb, ws, '検索結果');

    // ファイル出力
    XLSX.writeFile(wb, `search-results_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
        <Toolbar sx={{ justifyContent: 'center', position: 'relative' }}>
          <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
            検索
          </Typography>
          <Button
            color="inherit"
            onClick={handleLogout}
            sx={{ color: '#ffffff', position: 'absolute', right: 16 }}
          >
            ログアウト
          </Button>
        </Toolbar>
      </AppBar>

      {/* メインコンテンツ */}
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          width: '100%',
          pt: 6,
          pb: 6,
          px: 3,
        }}
      >
        {/* 検索ボックス */}
        <Box sx={{ width: '100%', maxWidth: 800, mb: 4 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="品番、品名、ジャンル名、ケース番号で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#757575' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              backgroundColor: '#ffffff',
              borderRadius: 1,
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: '#e0e0e0',
                },
                '&:hover fieldset': {
                  borderColor: '#1976d2',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#1976d2',
                },
              },
            }}
          />

          {/* 検索条件ボタン */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 2 }}>
            <ToggleButtonGroup
              value={searchFilter}
              exclusive
              onChange={(_, newFilter) => {
                if (newFilter !== null) {
                  setSearchFilter(newFilter);
                }
              }}
              size="small"
              sx={{
                backgroundColor: '#ffffff',
                '& .MuiToggleButton-root': {
                  px: 2,
                  py: 0.5,
                  fontSize: '0.875rem',
                  textTransform: 'none',
                  '&.Mui-selected': {
                    backgroundColor: '#1976d2',
                    color: '#ffffff',
                    '&:hover': {
                      backgroundColor: '#1565c0',
                    },
                  },
                },
              }}
            >
              <ToggleButton value="all">全て</ToggleButton>
              <ToggleButton value="partNumber">品番</ToggleButton>
              <ToggleButton value="name">品名</ToggleButton>
              <ToggleButton value="genre">ジャンル</ToggleButton>
              <ToggleButton value="storageCase">ケース番号</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSearch}
              size="large"
              sx={{
                px: 6,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 600,
              }}
            >
              検索
            </Button>
          </Box>
        </Box>

        {/* 検索結果 */}
        {hasSearched && (
          <Box sx={{ width: '100%', maxWidth: 800, mb: 6 }}>
            {searchResults.length === 0 ? (
              <Card
                elevation={0}
                sx={{
                  p: 4,
                  textAlign: 'center',
                  border: '2px solid #e0e0e0',
                  borderRadius: 2,
                }}
              >
                <Typography variant="h6" sx={{ color: '#757575' }}>
                  検索結果が見つかりませんでした
                </Typography>
              </Card>
            ) : (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ color: '#212121' }}>
                    検索結果: {searchResults.length}件
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
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
                </Box>
                <Stack spacing={2}>
                  {searchResults.map((item) => (
                    <Card
                      key={item.id}
                      elevation={0}
                      sx={{
                        border: '2px solid #e0e0e0',
                        borderRadius: 2,
                        transition: 'all 0.3s ease',
                        overflow: 'hidden',
                        '&:hover': {
                          border: '2px solid #1976d2',
                          boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                          transform: 'translateX(4px)',
                        },
                      }}
                    >
                      <Box
                        onClick={() => handleItemClick(item)}
                        sx={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'flex-start',
                          p: 2,
                          cursor: 'pointer',
                        }}
                      >
                        {/* 画像 */}
                        {item.image && (
                          <Box
                            sx={{
                              width: 150,
                              height: 100,
                              borderRadius: 1,
                              overflow: 'hidden',
                              mr: 3,
                              flexShrink: 0,
                              backgroundImage: `url(${item.image})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }}
                          />
                        )}

                        {/* テキスト */}
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              color: '#757575',
                              fontSize: '0.875rem',
                              mb: 0.5,
                            }}
                          >
                            {TYPE_LABELS[item.type]}
                            {item.partNumber && ` / 品番: ${item.partNumber}`}
                            {item.storageCase && ` / ケース: ${item.storageCase}`}
                          </Typography>
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 600,
                              color: '#212121',
                              mb: item.type === 'part' ? 1 : 0,
                            }}
                          >
                            {item.name}
                          </Typography>
                          {item.type === 'part' && (
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                              {item.unitNumber && (
                                <Typography variant="body2" sx={{ color: '#424242' }}>
                                  ユニット番号: {item.unitNumber}
                                </Typography>
                              )}
                              <Typography variant="body2" sx={{ color: '#424242' }}>
                                数量: {item.quantity}
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{
                                  color: item.stockQuantity === 0 ? '#d32f2f' : '#424242',
                                  fontWeight: item.stockQuantity === 0 ? 600 : 400,
                                }}
                              >
                                在庫: {item.stockQuantity}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </Card>
                  ))}
                </Stack>
              </>
            )}
          </Box>
        )}

        {/* 戻るボタン（中央下部） */}
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={handleBackClick}
            size="large"
            startIcon={<ArrowBack />}
            sx={{
              px: 6,
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 600,
            }}
          >
            カテゴリー選択へ戻る
          </Button>
        </Box>
      </Box>
    </Box>
  );
};
