import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Paper,
  Radio,
  RadioGroup,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { ContentCopy, Delete, Logout, Refresh } from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import * as masterApi from '@/services/api/master';
import type { TenantListItem } from '@/services/api/master';

// status → Chip色
const statusColor = (s: string): 'warning' | 'success' | 'default' =>
  s === 'pending' ? 'warning' : s === 'active' ? 'success' : 'default';

const statusLabel = (s: string): string =>
  s === 'pending' ? '未有効化' : s === 'active' ? '稼働中' : '停止中';

// BOM付きCSV文字列を生成（Excel互換）
function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '﻿';
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown): string => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ];
  return '﻿' + lines.join('\r\n');
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export const MasterDashboardPage = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const queryClient = useQueryClient();

  const [snack, setSnack] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [keyDialog, setKeyDialog] = useState<{ slug: string; key: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TenantListItem | null>(null);
  const [confirmName, setConfirmName] = useState('');
  const [backedUp, setBackedUp] = useState(false);

  // 発行フォーム
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [stockMode, setStockMode] = useState<'perCategory' | 'shared'>('perCategory');
  const [sourceCategoryId, setSourceCategoryId] = useState('');
  const [formError, setFormError] = useState('');

  const tenantsQuery = useQuery({
    queryKey: ['master-tenants'],
    queryFn: masterApi.listTenants,
  });
  const summaryQuery = useQuery({
    queryKey: ['master-summary'],
    queryFn: masterApi.getSummary,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['master-tenants'] });
    queryClient.invalidateQueries({ queryKey: ['master-summary'] });
  };

  const createMutation = useMutation({
    mutationFn: masterApi.createTenant,
    onSuccess: (res) => {
      setCreateOpen(false);
      setName('');
      setSlug('');
      setSourceCategoryId('');
      setFormError('');
      invalidate();
      setKeyDialog({ slug: res.tenant.slug, key: res.tenant.licenseKey || '' });
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'suspended' }) =>
      masterApi.setStatus(id, status),
    onSuccess: () => {
      invalidate();
      setSnack('状態を更新しました');
    },
    onError: (e: Error) => setSnack(e.message),
  });

  const regenerateMutation = useMutation({
    mutationFn: (id: string) => masterApi.regenerateKey(id),
    onSuccess: (res, id) => {
      invalidate();
      const t = tenantsQuery.data?.find((x) => x.id === id);
      setKeyDialog({ slug: t?.slug || '', key: res.licenseKey });
    },
    onError: (e: Error) => setSnack(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, confirm }: { id: string; confirm: string }) =>
      masterApi.deleteTenant(id, confirm),
    onSuccess: () => {
      invalidate();
      closeDelete();
      setSnack('テナントを削除しました');
    },
    onError: (e: Error) => setSnack(e.message),
  });

  const closeDelete = () => {
    setDeleteTarget(null);
    setConfirmName('');
    setBackedUp(false);
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key).then(() => setSnack('コピーしました'));
  };

  // 削除前バックアップ（JSON + CSV両方）
  const downloadBackup = async (t: TenantListItem) => {
    try {
      const backup = await masterApi.getBackup(t.id);
      downloadBlob(
        JSON.stringify(backup, null, 2),
        `backup-${t.slug}.json`,
        'application/json',
      );
      const parts = (backup.parts as Record<string, unknown>[]) || [];
      downloadBlob(toCsv(parts), `backup-${t.slug}-parts.csv`, 'text/csv;charset=utf-8');
      setBackedUp(true);
      setSnack('バックアップをダウンロードしました');
    } catch (e) {
      setSnack(e instanceof Error ? e.message : 'バックアップ失敗');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/master/login');
  };

  const s = summaryQuery.data;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* ヘッダー */}
      <Box
        sx={{
          bgcolor: '#6a1b9a',
          color: 'white',
          px: 3,
          py: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          運営者総括ページ
        </Typography>
        <Button
          color="inherit"
          startIcon={<Logout />}
          onClick={handleLogout}
          variant="outlined"
        >
          ログアウト
        </Button>
      </Box>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* サマリー */}
        {s && (
          <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
            <SummaryCard label="テナント総数" value={s.total} />
            <SummaryCard label="稼働中" value={s.active} />
            <SummaryCard label="未有効化" value={s.pending} />
            <SummaryCard label="停止中" value={s.suspended} />
            <SummaryCard label="総パーツ数" value={s.partTotal} />
          </Stack>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">テナント一覧</Typography>
          <Button variant="contained" onClick={() => setCreateOpen(true)}>
            + 新規テナント発行
          </Button>
        </Box>

        {tenantsQuery.isLoading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : tenantsQuery.isError ? (
          <Alert severity="error">テナント一覧の取得に失敗しました</Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>テナント名</TableCell>
                  <TableCell>slug</TableCell>
                  <TableCell>状態</TableCell>
                  <TableCell>ライセンスキー</TableCell>
                  <TableCell>件数(cat/genre/unit/part)</TableCell>
                  <TableCell>管理者</TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tenantsQuery.data?.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.name}</TableCell>
                    <TableCell>{t.slug}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={statusLabel(t.status)}
                        color={statusColor(t.status)}
                      />
                    </TableCell>
                    <TableCell>
                      {t.licenseKey ? (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            {t.licenseKey}
                          </Typography>
                          <Tooltip title="コピー">
                            <IconButton size="small" onClick={() => copyKey(t.licenseKey!)}>
                              <ContentCopy fontSize="inherit" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {t._count.categories}/{t._count.genres}/{t._count.units}/{t._count.parts}
                    </TableCell>
                    <TableCell>
                      {t.admins.length === 0 ? (
                        <Typography variant="caption" color="text.secondary">
                          未登録
                        </Typography>
                      ) : (
                        t.admins.map((a) => (
                          <Typography key={a.id} variant="caption" display="block">
                            {a.email}
                            {a.role === 'master' ? '（運営者）' : ''}
                          </Typography>
                        ))
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {t.status === 'active' && (
                          <Button
                            size="small"
                            color="warning"
                            onClick={() =>
                              statusMutation.mutate({ id: t.id, status: 'suspended' })
                            }
                          >
                            停止
                          </Button>
                        )}
                        {t.status === 'suspended' && (
                          <Button
                            size="small"
                            color="success"
                            onClick={() =>
                              statusMutation.mutate({ id: t.id, status: 'active' })
                            }
                          >
                            再開
                          </Button>
                        )}
                        <Tooltip title="キー再発行">
                          <IconButton
                            size="small"
                            onClick={() => regenerateMutation.mutate(t.id)}
                          >
                            <Refresh fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip
                          title={
                            t.slug === 'default'
                              ? '既定テナントは削除不可'
                              : t.status === 'active'
                                ? '稼働中は削除不可（先に停止）'
                                : '削除'
                          }
                        >
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={t.slug === 'default' || t.status === 'active'}
                              onClick={() => setDeleteTarget(t)}
                            >
                              <Delete fontSize="inherit" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Container>

      {/* 発行フォーム */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新規テナント発行</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <TextField
            label="テナント名"
            fullWidth
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            label="slug（URL識別子・英小文字/数字/ハイフン）"
            fullWidth
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            helperText="顧客希望の識別子。例: tanaka-parts"
            sx={{ mb: 2 }}
          />
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            在庫モード
          </Typography>
          <RadioGroup
            value={stockMode}
            onChange={(e) => setStockMode(e.target.value as 'perCategory' | 'shared')}
            sx={{ mb: 2 }}
          >
            <FormControlLabel
              value="perCategory"
              control={<Radio />}
              label="カテゴリー独立（推奨）"
            />
            <FormControlLabel value="shared" control={<Radio />} label="全カテゴリー共有" />
          </RadioGroup>
          <Divider sx={{ my: 2 }} />
          <TextField
            label="複製元カテゴリーID（任意・空なら空テナント）"
            fullWidth
            value={sourceCategoryId}
            onChange={(e) => setSourceCategoryId(e.target.value)}
            helperText="既定テナントのカテゴリーIDを指定するとその内容を複製します"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>キャンセル</Button>
          <Button
            variant="contained"
            disabled={!name || !slug || createMutation.isPending}
            onClick={() =>
              createMutation.mutate({
                name,
                slug: slug.trim().toLowerCase(),
                stockMode,
                sourceCategoryId: sourceCategoryId.trim() || undefined,
              })
            }
          >
            {createMutation.isPending ? '発行中...' : '発行'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ライセンスキー表示 */}
      <Dialog open={!!keyDialog} onClose={() => setKeyDialog(null)}>
        <DialogTitle>ライセンスキー</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            テナント「{keyDialog?.slug}」のライセンスキーです。購入者に伝えてください。
            購入者はこのキーで有効化画面から自分のアカウントを登録します。
          </DialogContentText>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              bgcolor: 'grey.100',
              p: 2,
              borderRadius: 1,
            }}
          >
            <Typography variant="h6" sx={{ fontFamily: 'monospace', flex: 1 }}>
              {keyDialog?.key}
            </Typography>
            <IconButton onClick={() => keyDialog && copyKey(keyDialog.key)}>
              <ContentCopy />
            </IconButton>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setKeyDialog(null)}>閉じる</Button>
        </DialogActions>
      </Dialog>

      {/* 多段階削除ダイアログ */}
      <Dialog open={!!deleteTarget} onClose={closeDelete} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: 'error.main' }}>テナント削除（取り消し不可）</DialogTitle>
        <DialogContent>
          {deleteTarget && (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>
                この操作は取り消せません。以下のデータが完全に削除されます。
              </Alert>
              <Typography variant="body2" sx={{ mb: 2 }}>
                テナント: <strong>{deleteTarget.name}</strong>（{deleteTarget.slug}）<br />
                カテゴリー {deleteTarget._count.categories} / ジャンル {deleteTarget._count.genres}{' '}
                / ユニット {deleteTarget._count.units} / パーツ {deleteTarget._count.parts}
              </Typography>

              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                ① 削除前バックアップ（必須）
              </Typography>
              <Button
                variant="outlined"
                onClick={() => downloadBackup(deleteTarget)}
                sx={{ mb: 2 }}
              >
                バックアップDL（JSON + CSV）
              </Button>
              {backedUp && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  バックアップ済み
                </Alert>
              )}

              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                ② 確認のためテナント名を入力
              </Typography>
              <TextField
                fullWidth
                placeholder={deleteTarget.name}
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                sx={{ mb: 1 }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDelete}>キャンセル</Button>
          <Button
            color="error"
            variant="contained"
            disabled={
              !deleteTarget ||
              !backedUp ||
              confirmName !== deleteTarget.name ||
              deleteMutation.isPending
            }
            onClick={() =>
              deleteTarget &&
              deleteMutation.mutate({ id: deleteTarget.id, confirm: confirmName })
            }
          >
            {deleteMutation.isPending ? '削除中...' : '完全に削除する'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snack}
        autoHideDuration={3000}
        onClose={() => setSnack('')}
        message={snack}
      />
    </Box>
  );
};

const SummaryCard = ({ label, value }: { label: string; value: number }) => (
  <Paper sx={{ p: 2, minWidth: 120, textAlign: 'center' }}>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="h5" sx={{ fontWeight: 600 }}>
      {value}
    </Typography>
  </Paper>
);

export default MasterDashboardPage;
