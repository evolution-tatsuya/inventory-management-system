// ============================================================
// 棚卸しページ（InventoryCountPage）
// ============================================================
// 収納ケース / ユニット / 全件 の範囲を選び、理論在庫と実数を
// 突き合わせて在庫を更新する。保存時に確認ダイアログ→上書き＋履歴記録。
// 紙用にチェックリストのPDF/CSV出力にも対応。
// ============================================================

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { AdminShell } from '@/components/AdminShell';
import {
  partsApi,
  categoriesApi,
  genresApi,
  unitsApi,
  inventoryCountApi,
} from '@/services/api';

type Scope = 'case' | 'unit' | 'all';

interface RowDetail {
  partName: string;
  genreName: string;
  unitName: string;
  storageCase: string;
}

interface Row {
  // 集約キー（品番×カテゴリー）。同一品番が複数パーツ行にまたがっても1行に集約する。
  key: string;
  partId: string; // 代表Part.id（保存・入力状態の識別に使用）
  partNumber: string;
  partName: string;
  unitName: string;
  storageCase: string;
  theoretical: number; // 理論在庫（PartMaster.stockQuantity・品番共有）
  counted: string; // 実数（未入力は空文字）
  partCount: number; // この品番に紐づくパーツ行数（表示用）
  details: RowDetail[]; // この品番が使われている各箇所（ジャンル/ユニット/パーツ名/収納ケース）
}

export default function InventoryCountPage() {
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<Scope>('unit');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [filterGenreId, setFilterGenreId] = useState('');
  const [filterUnitId, setFilterUnitId] = useState('');
  const [filterCase, setFilterCase] = useState('');
  const [rows, setRows] = useState<Record<string, { counted: string; storageCase: string }>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  // 「◯箇所」クリックで開く内訳モーダル
  const [detailRow, setDetailRow] = useState<Row | null>(null);

  // データ取得
  const { data: parts = [], isLoading } = useQuery({
    queryKey: ['parts'],
    queryFn: partsApi.getAllParts,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getCategories,
  });
  const { data: genres = [] } = useQuery({
    queryKey: ['genres'],
    queryFn: genresApi.getAllGenres,
  });
  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: unitsApi.getAllUnits,
  });

  const filteredGenres = filterCategoryId
    ? genres.filter((g: any) => g.categoryId === filterCategoryId)
    : genres;
  const filteredUnits = filterGenreId
    ? units.filter((u: any) => u.genreId === filterGenreId)
    : filterCategoryId
    ? units.filter((u: any) => {
        const g = genres.find((gg: any) => gg.id === u.genreId);
        return g?.categoryId === filterCategoryId;
      })
    : units;

  // 収納ケース候補（現データにある値）
  const caseOptions = useMemo(() => {
    const set = new Set<string>();
    parts.forEach((p: any) => {
      if (p.storageCase) set.add(p.storageCase);
    });
    return Array.from(set).sort();
  }, [parts]);

  // 対象パーツを範囲に応じて抽出
  const targetParts = useMemo(() => {
    let list = parts as any[];
    if (scope === 'case') {
      list = filterCase ? list.filter((p) => p.storageCase === filterCase) : [];
    } else if (scope === 'unit') {
      list = filterUnitId ? list.filter((p) => p.unitId === filterUnitId) : [];
    }
    // all はそのまま全件
    return list;
  }, [parts, scope, filterCase, filterUnitId]);

  // genreId -> categoryId の対応表（品番の在庫は「品番×カテゴリー」単位で共有されるため）
  const genreToCategory = useMemo(() => {
    const m = new Map<string, string>();
    genres.forEach((g: any) => m.set(g.id, g.categoryId));
    return m;
  }, [genres]);

  // 集約キー: 品番 × カテゴリー（在庫共有の単位）
  const rowKeyOf = (p: any) => `${genreToCategory.get(p.genreId) ?? 'null'}::${p.partNumber}`;

  // genreId -> ジャンル名（内訳表示用）
  const genreName = useMemo(() => {
    const m = new Map<string, string>();
    genres.forEach((g: any) => m.set(g.id, g.name));
    return m;
  }, [genres]);

  // 表示用の行データ（品番×カテゴリーで集約。同一品番の複数パーツ行を1行にまとめる）
  const displayRows: Row[] = useMemo(() => {
    const map = new Map<string, Row & { _units: Set<string> }>();
    targetParts.forEach((p) => {
      const key = rowKeyOf(p);
      const edit = rows[key];
      const detail: RowDetail = {
        partName: p.partName,
        genreName: genreName.get(p.genreId) || '-',
        unitName: p.unit?.unitName || '-',
        storageCase: p.storageCase || '',
      };
      const existing = map.get(key);
      if (existing) {
        existing.partCount += 1;
        existing.details.push(detail);
        if (p.unit?.unitName) existing._units.add(p.unit.unitName);
      } else {
        map.set(key, {
          key,
          partId: p.id, // 代表（収納ケース更新の対象。集約時は先頭を代表とする）
          partNumber: p.partNumber,
          partName: p.partName,
          unitName: p.unit?.unitName || '-',
          storageCase: edit?.storageCase ?? p.storageCase ?? '',
          theoretical: p.partMaster?.stockQuantity ?? 0,
          counted: edit?.counted ?? '',
          partCount: 1,
          details: [detail],
          _units: new Set(p.unit?.unitName ? [p.unit.unitName] : []),
        });
      }
    });
    // 複数ユニット/ケースにまたがる場合の表示を整える
    return Array.from(map.values()).map((r) => {
      const units = Array.from(r._units);
      return {
        key: r.key,
        partId: r.partId,
        partNumber: r.partNumber,
        partName: r.partName,
        unitName: units.length > 1 ? `${units[0]} 他${units.length - 1}` : r.unitName,
        storageCase: r.storageCase,
        theoretical: r.theoretical,
        counted: r.counted,
        partCount: r.partCount,
        details: r.details,
      };
    });
  }, [targetParts, rows, genreToCategory]);

  const setCounted = (key: string, value: string, fallbackCase: string) => {
    const v = value.replace(/[^0-9]/g, '');
    setRows((prev) => ({
      ...prev,
      [key]: { counted: v, storageCase: prev[key]?.storageCase ?? fallbackCase },
    }));
  };
  const setCase = (key: string, value: string, fallbackCounted: string) => {
    setRows((prev) => ({
      ...prev,
      [key]: { counted: prev[key]?.counted ?? fallbackCounted, storageCase: value },
    }));
  };

  // 差異計算
  const diffOf = (r: Row): number | null => (r.counted === '' ? null : Number(r.counted) - r.theoretical);

  // 進捗集計
  const countedRows = displayRows.filter((r) => r.counted !== '');
  const diffRows = countedRows.filter((r) => (diffOf(r) ?? 0) !== 0);
  const progress = displayRows.length
    ? Math.round((countedRows.length / displayRows.length) * 100)
    : 0;

  // 保存対象（実数入力あり）
  const itemsToSave = displayRows
    .filter((r) => r.counted !== '')
    .map((r) => ({
      partId: r.partId,
      countedQty: Number(r.counted),
      storageCase: r.storageCase || null,
    }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await inventoryCountApi.saveCounts(itemsToSave);
      setSavedMsg(`保存しました（在庫更新 ${result.updated}件 / 履歴記録 ${result.logged}件）`);
      setConfirmOpen(false);
      setRows({});
      // キャッシュ無効化で在庫を再取得
      queryClient.invalidateQueries({ queryKey: ['parts'] });
    } catch (e: any) {
      setSavedMsg(`保存に失敗しました: ${e.message || ''}`);
    } finally {
      setSaving(false);
    }
  };

  const scopeReady =
    scope === 'all' ||
    (scope === 'unit' && !!filterUnitId) ||
    (scope === 'case' && !!filterCase);

  // ---- PDF/CSV出力 ----
  const rangeLabel = () => {
    if (scope === 'case') return `収納ケース ${filterCase}`;
    if (scope === 'unit') {
      const u = units.find((x: any) => x.id === filterUnitId);
      return `ユニット ${u?.unitName || ''}`;
    }
    return '全件';
  };

  const handleExportCSV = () => {
    const header = '№\t品番\t品名\tユニット\t収納ケース\t理論在庫\t実数記入\n';
    const body = displayRows
      .map(
        (r, i) =>
          `${i + 1}\t${r.partNumber}\t${r.partName}\t${r.unitName}\t${r.storageCase}\t${r.theoretical}\t`,
      )
      .join('\n');
    const bom = '﻿';
    const blob = new Blob([bom + header + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `棚卸しリスト_${rangeLabel()}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const rowsHtml = displayRows
      .map(
        (r, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${r.partNumber}</td>
          <td>${escapeHtml(r.partName)}</td>
          <td>${escapeHtml(r.unitName)}</td>
          <td>${escapeHtml(r.storageCase)}</td>
          <td style="text-align:right">${r.theoretical}</td>
          <td style="width:70px"></td>
          <td style="width:28px;text-align:center">☐</td>
        </tr>`,
      )
      .join('');
    const html = `
      <html><head><meta charset="utf-8"><title>棚卸しチェックリスト</title>
      <style>
        body{font-family:'Noto Sans JP',sans-serif;padding:16px;color:#1f2328}
        h1{font-size:16px;margin:0 0 4px}
        .meta{font-size:11px;color:#666;margin-bottom:12px;display:flex;gap:18px;flex-wrap:wrap}
        table{width:100%;border-collapse:collapse;font-size:11px}
        th,td{border:1px solid #bbb;padding:4px 6px;text-align:left}
        th{background:#f0f0f0}
      </style></head><body>
      <h1>棚卸しチェックリスト</h1>
      <div class="meta"><span>範囲: ${escapeHtml(rangeLabel())}</span><span>件数: ${displayRows.length}</span><span>日付: __________</span><span>担当: __________</span></div>
      <table><thead><tr>
        <th>№</th><th>品番</th><th>品名</th><th>ユニット</th><th>収納ケース</th><th>理論在庫</th><th>実数記入</th><th>✓</th>
      </tr></thead><tbody>${rowsHtml}</tbody></table>
      </body></html>`;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 300);
    }
  };

  return (
    <AdminShell active="/admin/inventory-count">
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
            棚卸し
          </Typography>
          <Typography variant="body2" color="text.secondary">
            範囲を選んで実数を入力し、在庫を更新します。収納ケース番号は空欄でもよく、ここで入力・修正できます。
          </Typography>
        </Box>

        {savedMsg && (
          <Alert severity={savedMsg.includes('失敗') ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setSavedMsg('')}>
            {savedMsg}
          </Alert>
        )}

        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          {/* 範囲選択 */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
            <ToggleButtonGroup
              value={scope}
              exclusive
              size="small"
              onChange={(_, v) => v && setScope(v)}
            >
              <ToggleButton value="case">収納ケース別</ToggleButton>
              <ToggleButton value="unit">ユニット別</ToggleButton>
              <ToggleButton value="all">全件</ToggleButton>
            </ToggleButtonGroup>

            {scope === 'case' && (
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel>収納ケース</InputLabel>
                <Select
                  label="収納ケース"
                  value={filterCase}
                  onChange={(e) => setFilterCase(e.target.value)}
                >
                  {caseOptions.length === 0 && (
                    <MenuItem value="" disabled>
                      （収納ケース番号が未入力です）
                    </MenuItem>
                  )}
                  {caseOptions.map((c) => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {scope === 'unit' && (
              <>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>カテゴリー</InputLabel>
                  <Select
                    label="カテゴリー"
                    value={filterCategoryId}
                    onChange={(e) => {
                      setFilterCategoryId(e.target.value);
                      setFilterGenreId('');
                      setFilterUnitId('');
                    }}
                  >
                    {categories.map((c: any) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 180 }} disabled={!filterCategoryId}>
                  <InputLabel>ジャンル</InputLabel>
                  <Select
                    label="ジャンル"
                    value={filterGenreId}
                    onChange={(e) => {
                      setFilterGenreId(e.target.value);
                      setFilterUnitId('');
                    }}
                  >
                    {filteredGenres.map((g: any) => (
                      <MenuItem key={g.id} value={g.id}>
                        {g.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 200 }} disabled={!filterGenreId}>
                  <InputLabel>ユニット</InputLabel>
                  <Select
                    label="ユニット"
                    value={filterUnitId}
                    onChange={(e) => setFilterUnitId(e.target.value)}
                  >
                    {filteredUnits.map((u: any) => (
                      <MenuItem key={u.id} value={u.id}>
                        {u.unitName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}

            <Box sx={{ flex: 1 }} />
            <Button variant="outlined" size="small" onClick={handlePrint} disabled={!displayRows.length}>
              PDF/印刷
            </Button>
            <Button variant="outlined" size="small" onClick={handleExportCSV} disabled={!displayRows.length}>
              CSV
            </Button>
            <Button
              variant="contained"
              onClick={() => setConfirmOpen(true)}
              disabled={itemsToSave.length === 0}
              sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            >
              保存（{itemsToSave.length}件）
            </Button>
          </Box>

          {/* 進捗 */}
          {scopeReady && displayRows.length > 0 && (
            <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant="body2">
                対象 <b>{displayRows.length}</b> / カウント済 <b style={{ color: '#2f855a' }}>{countedRows.length}</b> / 差異{' '}
                <b style={{ color: '#b7791f' }}>{diffRows.length}</b>
              </Typography>
              <Box sx={{ flex: 1, minWidth: 160 }}>
                <LinearProgress variant="determinate" value={progress} />
              </Box>
              <Typography variant="body2">{progress}%</Typography>
            </Box>
          )}
        </Paper>

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
            <CircularProgress />
          </Box>
        )}

        {!isLoading && !scopeReady && (
          <Alert severity="info">
            {scope === 'case'
              ? '収納ケースを選択してください。'
              : scope === 'unit'
              ? 'カテゴリー・ジャンル・ユニットを選択してください。'
              : ''}
          </Alert>
        )}

        {!isLoading && scopeReady && (
          <TableContainer component={Paper} elevation={2}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>品番</TableCell>
                  <TableCell>品名</TableCell>
                  {scope === 'all' && <TableCell>ユニット</TableCell>}
                  <TableCell>収納ケース</TableCell>
                  <TableCell align="right">理論在庫</TableCell>
                  <TableCell align="right">実数</TableCell>
                  <TableCell align="center">差異</TableCell>
                  <TableCell align="center">状態</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayRows.map((r) => {
                  const d = diffOf(r);
                  const status =
                    r.counted === ''
                      ? { label: '未', color: 'default' as const }
                      : d === 0
                      ? { label: '一致', color: 'success' as const }
                      : (d ?? 0) > 0
                      ? { label: '過剰', color: 'info' as const }
                      : { label: '不足', color: 'warning' as const };
                  return (
                    <TableRow
                      key={r.key}
                      sx={{
                        background:
                          r.counted === ''
                            ? 'transparent'
                            : d === 0
                            ? 'rgba(47,133,90,0.06)'
                            : 'rgba(183,121,31,0.08)',
                      }}
                    >
                      <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {r.partNumber}
                        {r.partCount > 1 && (
                          <Chip
                            label={`${r.partCount}箇所`}
                            size="small"
                            variant="outlined"
                            clickable
                            onClick={() => setDetailRow(r)}
                            title="使用箇所の内訳を表示"
                            sx={{
                              ml: 0.5,
                              height: 18,
                              fontSize: 10,
                              cursor: 'pointer',
                              '&:hover': { bgcolor: 'primary.main', color: '#fff' },
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell>{r.partName}</TableCell>
                      {scope === 'all' && <TableCell>{r.unitName}</TableCell>}
                      <TableCell>
                        <TextField
                          size="small"
                          variant="standard"
                          placeholder="—"
                          value={r.storageCase}
                          onChange={(e) => setCase(r.key, e.target.value, r.counted)}
                          sx={{ width: 90 }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {r.theoretical}
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          type="text"
                          inputMode="numeric"
                          value={r.counted}
                          onChange={(e) => setCounted(r.key, e.target.value, r.storageCase)}
                          placeholder="—"
                          sx={{ width: 70, '& input': { textAlign: 'right', fontVariantNumeric: 'tabular-nums' } }}
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {d === null ? '' : d > 0 ? `+${d}` : d}
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={status.label} size="small" color={status.color} variant={r.counted === '' ? 'outlined' : 'filled'} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* 使用箇所の内訳モーダル（「◯箇所」クリックで開く） */}
      <Dialog open={!!detailRow} onClose={() => setDetailRow(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          品番 {detailRow?.partNumber} の使用箇所（{detailRow?.partCount}箇所）
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            この品番は同じカテゴリー内で以下の箇所に登録されています。在庫はこれらで共有されます。
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>№</TableCell>
                  <TableCell>ジャンル</TableCell>
                  <TableCell>ユニット</TableCell>
                  <TableCell>品名</TableCell>
                  <TableCell>収納ケース</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detailRow?.details.map((d, i) => (
                  <TableRow key={i}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{d.genreName}</TableCell>
                    <TableCell>{d.unitName}</TableCell>
                    <TableCell>{d.partName}</TableCell>
                    <TableCell>{d.storageCase || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailRow(null)}>閉じる</Button>
        </DialogActions>
      </Dialog>

      {/* 保存確認ダイアログ */}
      <Dialog open={confirmOpen} onClose={() => !saving && setConfirmOpen(false)}>
        <DialogTitle>在庫を更新しますか？</DialogTitle>
        <DialogContent>
          <DialogContentText component="div">
            実数を入力した <b>{itemsToSave.length}件</b> の在庫を上書きします。
            <br />
            うち差異あり: <b style={{ color: '#b7791f' }}>{diffRows.length}件</b>
            <br />
            <Box sx={{ mt: 1, maxHeight: 200, overflow: 'auto', fontSize: 13 }}>
              {diffRows.slice(0, 20).map((r) => (
                <div key={r.key}>
                  {r.partNumber}：{r.theoretical} → {r.counted}（
                  {(diffOf(r) ?? 0) > 0 ? '+' : ''}
                  {diffOf(r)}）
                </div>
              ))}
              {diffRows.length > 20 && <div>…ほか {diffRows.length - 20} 件</div>}
            </Box>
            この操作は在庫数を実数で上書きし、履歴に記録します。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={saving}>
            キャンセル
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? '保存中...' : 'OK（上書き）'}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminShell>
  );
}

function escapeHtml(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
