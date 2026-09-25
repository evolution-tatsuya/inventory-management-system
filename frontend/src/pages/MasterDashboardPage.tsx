import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QRCodeCanvas } from 'qrcode.react';
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
import {
  ContentCopy,
  Delete,
  Logout,
  ManageAccounts,
  OpenInNew,
  Payments,
  PersonAddAlt,
  QrCode2,
  Refresh,
  Send,
  Visibility,
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import * as masterApi from '@/services/api/master';
import type { TenantListItem } from '@/services/api/master';

// status → Chip色
const statusColor = (s: string): 'warning' | 'success' | 'default' =>
  s === 'pending' ? 'warning' : s === 'active' ? 'success' : 'default';

const statusLabel = (s: string): string =>
  s === 'pending' ? '未有効化' : s === 'active' ? '稼働中' : '停止中';

// 課金ステータス → ラベル・色
const billingLabel = (s: string | null): string => {
  switch (s) {
    case 'trial':
      return '試用';
    case 'paid':
      return '支払い済み';
    case 'unpaid':
      return '未払い';
    case 'free':
      return '無料';
    default:
      return '未設定';
  }
};

const billingColor = (s: string | null): 'info' | 'success' | 'error' | 'default' => {
  switch (s) {
    case 'trial':
      return 'info';
    case 'paid':
      return 'success';
    case 'unpaid':
      return 'error';
    default:
      return 'default';
  }
};

// ISO日時 → YYYY/MM/DD 表示（不正値は '—'）
function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

// ISO日時 → YYYY/MM/DD HH:mm 表示（最終ログイン用。未ログインは '未ログイン'）
function formatLastLogin(iso: string | null | undefined): string {
  if (!iso) return '未ログイン';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '未ログイン';
  return d.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

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
  // 送付情報（URL/QR）ダイアログの対象テナント、QR表示中のラベル
  const [shareTarget, setShareTarget] = useState<TenantListItem | null>(null);
  const [qrShown, setQrShown] = useState<string | null>(null);
  // QRコード canvas への参照（PNG保存用。ラベルごとに保持）
  const qrRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
  // 課金編集ダイアログの対象テナントとフォーム値
  const [billingTarget, setBillingTarget] = useState<TenantListItem | null>(null);
  const [billingForm, setBillingForm] = useState({
    plan: '',
    monthlyFee: '',
    billingStatus: '',
    contractStartDate: '',
    nextBillingDate: '',
    billingNote: '',
  });
  // 一般ユーザー代理作成ダイアログの対象テナントとフォーム
  const [userTarget, setUserTarget] = useState<TenantListItem | null>(null);
  const [userForm, setUserForm] = useState({ email: '', password: '', name: '' });

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
  const cloudinaryQuery = useQuery({
    queryKey: ['master-cloudinary-usage'],
    queryFn: masterApi.getCloudinaryUsage,
    staleTime: 60 * 60 * 1000, // 1時間キャッシュ（Cloudinary側も日次更新のため頻繁に叩かない）
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

  const billingMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: masterApi.UpdateBillingRequest }) =>
      masterApi.updateBilling(id, data),
    onSuccess: () => {
      invalidate();
      setBillingTarget(null);
      setSnack('課金情報を更新しました');
    },
    onError: (e: Error) => setSnack(e.message),
  });

  // 一般ユーザー代理作成
  const createUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { email: string; password: string; name?: string } }) =>
      masterApi.createTenantUser(id, data),
    onSuccess: () => {
      setUserTarget(null);
      setUserForm({ email: '', password: '', name: '' });
      setSnack('閲覧専用ユーザーを追加しました');
    },
    onError: (e: Error) => setSnack(e.message),
  });

  // 課金編集ダイアログを開く（現在値をフォームに反映）
  const openBilling = (t: TenantListItem) => {
    setBillingForm({
      plan: t.plan || '',
      monthlyFee: t.monthlyFee != null ? String(t.monthlyFee) : '',
      billingStatus: t.billingStatus || '',
      contractStartDate: t.contractStartDate ? t.contractStartDate.slice(0, 10) : '',
      nextBillingDate: t.nextBillingDate ? t.nextBillingDate.slice(0, 10) : '',
      billingNote: t.billingNote || '',
    });
    setBillingTarget(t);
  };

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

  // 任意テキスト（URL等）をコピー
  const copyText = (text: string) => {
    navigator.clipboard.writeText(text).then(() => setSnack('URLをコピーしました'));
  };

  // テナントの各種URLを生成（オリジンは現在のドメイン＝本番/開発どちらでも正しい）。
  // ログイン系は共通URL＋?tenant= でテナントを自動指定、有効化は?key= でキー自動入力。
  // 受け取り側（/login /admin/login /activate）はいずれもこのクエリに対応済み。
  const tenantUrls = (t: TenantListItem) => {
    const origin = window.location.origin;
    return {
      activate: t.licenseKey ? `${origin}/activate?key=${t.licenseKey}` : null,
      admin: `${origin}/admin/login?tenant=${t.slug}`,
      user: `${origin}/login?tenant=${t.slug}`,
    };
  };

  // QRコードをPNGでダウンロード
  const downloadQr = (label: string, filename: string) => {
    const canvas = qrRefs.current[label];
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
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

  // 対象テナントを別タブで開く（サポート・入力代行時の動作確認用）。
  // master のトークン(adminAuthToken)は全テナント横断可のため流用できる。
  // currentTenantSlug を対象テナントに切り替えてから新規タブで開く。
  // 総括ページ自体は master API を使うため、この slug 書き換えの影響を受けない。
  const openTenantView = (t: TenantListItem, view: 'admin' | 'user') => {
    if (t.status !== 'active') {
      setSnack('稼働中のテナントのみ閲覧できます（未有効化/停止中は不可）');
      return;
    }
    // master の閲覧は常に admin トークンで通す（user画面もmaster権限で閲覧可）
    localStorage.setItem('currentTenantSlug', t.slug);
    localStorage.setItem('currentUserType', 'admin');
    const path = view === 'admin' ? '/admin/dashboard' : '/categories';
    window.open(path, '_blank', 'noopener');
    setSnack(`「${t.name}」の${view === 'admin' ? '管理画面' : 'ユーザー画面'}を新しいタブで開きました`);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/master/login');
  };

  const s = summaryQuery.data;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        bgcolor: 'grey.50',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'auto',
      }}
    >
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

      <Box sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
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

        {/* Cloudinary(画像ストレージ)使用量 */}
        {cloudinaryQuery.data && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              画像ストレージ使用量（Cloudinary / {cloudinaryQuery.data.plan}プラン）
              <Typography component="span" variant="caption" sx={{ color: 'text.secondary', ml: 1 }}>
                更新日: {cloudinaryQuery.data.lastUpdated}
              </Typography>
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
              <UsageBar
                label="ストレージ"
                used={cloudinaryQuery.data.storageGB}
                limit={cloudinaryQuery.data.storageLimitGB}
                unit="GB"
              />
              <UsageBar
                label="帯域(今月)"
                used={cloudinaryQuery.data.bandwidthGB}
                limit={cloudinaryQuery.data.bandwidthLimitGB}
                unit="GB"
              />
              <UsageBar
                label="クレジット(今月)"
                used={Math.round(cloudinaryQuery.data.creditsUsed * 100) / 100}
                limit={cloudinaryQuery.data.creditsLimit}
                unit=""
              />
            </Stack>
            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
              保存画像・PDF: {cloudinaryQuery.data.resources.toLocaleString()} 個 ／
              クレジットは変換・帯域・ストレージの合算。無料枠は各25です。
            </Typography>
          </Paper>
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
                  <TableCell>件数(cat/genre/unit/part/画像 ≈容量)</TableCell>
                  <TableCell>課金</TableCell>
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
                      {t._count.categories}/{t._count.genres}/{t._count.units}/{t._count.parts}/
                      {t.imageCount}
                      {typeof t.imageMB === 'number' && (
                        <span style={{ color: '#8a86a3', fontSize: '0.85em', marginLeft: 4 }}>
                          (≈
                          {t.imageMB >= 1024
                            ? (t.imageMB / 1024).toFixed(2) + 'GB'
                            : t.imageMB.toFixed(1) + 'MB'}
                          )
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={billingLabel(t.billingStatus)}
                        color={billingColor(t.billingStatus)}
                        variant={t.billingStatus ? 'filled' : 'outlined'}
                      />
                      {t.plan && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          {t.plan}
                          {t.monthlyFee != null ? ` ・¥${t.monthlyFee.toLocaleString()}/月` : ''}
                        </Typography>
                      )}
                      {t.nextBillingDate && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          次回: {formatDate(t.nextBillingDate)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {t.admins.length === 0 ? (
                        <Typography variant="caption" color="text.secondary">
                          未登録
                        </Typography>
                      ) : (
                        t.admins.map((a) => (
                          <Box key={a.id} sx={{ mb: 0.5 }}>
                            {(a.companyName || a.department) && (
                              <Typography
                                variant="caption"
                                display="block"
                                sx={{ fontWeight: 600 }}
                              >
                                {a.companyName || ''}
                                {a.companyName && a.department ? ' / ' : ''}
                                {a.department || ''}
                              </Typography>
                            )}
                            {a.name && (
                              <Typography variant="caption" display="block">
                                {a.name}
                              </Typography>
                            )}
                            <Typography
                              variant="caption"
                              display="block"
                              color="text.secondary"
                            >
                              {a.email}
                              {a.role === 'master' ? '（運営者）' : ''}
                            </Typography>
                            <Typography
                              variant="caption"
                              display="block"
                              color="text.secondary"
                            >
                              登録: {formatDate(a.createdAt)}
                            </Typography>
                            <Typography
                              variant="caption"
                              display="block"
                              color={a.lastLoginAt ? 'text.secondary' : 'warning.main'}
                            >
                              最終ログイン: {formatLastLogin(a.lastLoginAt)}
                            </Typography>
                          </Box>
                        ))
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Tooltip title="送付情報（ログイン/有効化URL・QR）">
                          <IconButton
                            size="small"
                            color="secondary"
                            onClick={() => {
                              setShareTarget(t);
                              setQrShown(null);
                            }}
                          >
                            <Send fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="課金情報を編集">
                          <IconButton
                            size="small"
                            color="secondary"
                            onClick={() => openBilling(t)}
                          >
                            <Payments fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip
                          title={
                            t.status === 'active'
                              ? '閲覧専用ユーザーを追加'
                              : '稼働中のみ追加可'
                          }
                        >
                          <span>
                            <IconButton
                              size="small"
                              color="secondary"
                              disabled={t.status !== 'active'}
                              onClick={() => {
                                setUserForm({ email: '', password: '', name: '' });
                                setUserTarget(t);
                              }}
                            >
                              <PersonAddAlt fontSize="inherit" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip
                          title={
                            t.status === 'active'
                              ? '管理画面を別タブで開く'
                              : '稼働中のみ閲覧可'
                          }
                        >
                          <span>
                            <IconButton
                              size="small"
                              color="primary"
                              disabled={t.status !== 'active'}
                              onClick={() => openTenantView(t, 'admin')}
                            >
                              <ManageAccounts fontSize="inherit" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip
                          title={
                            t.status === 'active'
                              ? 'ユーザー画面を別タブで開く'
                              : '稼働中のみ閲覧可'
                          }
                        >
                          <span>
                            <IconButton
                              size="small"
                              color="primary"
                              disabled={t.status !== 'active'}
                              onClick={() => openTenantView(t, 'user')}
                            >
                              <Visibility fontSize="inherit" />
                            </IconButton>
                          </span>
                        </Tooltip>
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
      </Box>

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
            helperText="顧客希望の識別子。例: my-parts / sample-shop"
            sx={{ mb: 2 }}
          />
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            在庫モード
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            同じ品番が複数カテゴリーに登場したとき、在庫数を分けるか共有するか
          </Typography>
          <RadioGroup
            value={stockMode}
            onChange={(e) => setStockMode(e.target.value as 'perCategory' | 'shared')}
            sx={{ mb: 2 }}
          >
            <FormControlLabel
              value="perCategory"
              control={<Radio />}
              sx={{ alignItems: 'flex-start', mb: 1 }}
              label={
                <Box sx={{ pt: 0.5 }}>
                  <Typography variant="body2">カテゴリー独立（推奨）</Typography>
                  <Typography variant="caption" color="text.secondary">
                    同じ品番でもカテゴリーごとに在庫を別々に管理。車種・案件ごとに在庫を分ける場合はこちら。
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="shared"
              control={<Radio />}
              sx={{ alignItems: 'flex-start' }}
              label={
                <Box sx={{ pt: 0.5 }}>
                  <Typography variant="body2">全カテゴリー共有</Typography>
                  <Typography variant="caption" color="text.secondary">
                    同じ品番の在庫を全カテゴリーで1つの数字として共有。倉庫に在庫が1箇所だけの場合はこちら。
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>
          <Divider sx={{ my: 2 }} />
          <TextField
            label="複製元カテゴリーID（任意・空なら空テナント）"
            fullWidth
            value={sourceCategoryId}
            onChange={(e) => setSourceCategoryId(e.target.value)}
            helperText="空欄＝データなしの空テナント。IDを入れると既定テナントのそのカテゴリー1件を複製します"
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

      {/* 送付情報（ログイン/有効化URL・QR）ダイアログ */}
      <Dialog
        open={!!shareTarget}
        onClose={() => setShareTarget(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          送付情報 — {shareTarget?.name}（{shareTarget?.slug}）
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            顧客に渡すURLです。コピー・別タブで確認・QRコードで送付できます。
            ログインURLはテナントIDが、有効化URLはライセンスキーが自動で入ります。
          </DialogContentText>
          {shareTarget &&
            (() => {
              const urls = tenantUrls(shareTarget);
              const rows: { label: string; url: string; hint: string }[] = [];
              if (shareTarget.status === 'pending' && urls.activate) {
                rows.push({
                  label: '有効化URL',
                  url: urls.activate,
                  hint: '購入者が最初にアカウント登録する画面（未有効化のみ）',
                });
              }
              rows.push({
                label: '管理ログインURL',
                url: urls.admin,
                hint: '管理者（顧客）がログインする画面',
              });
              rows.push({
                label: 'ユーザーログインURL',
                url: urls.user,
                hint: '閲覧用の一般ユーザーがログインする画面',
              });
              return rows.map((r) => (
                <Box key={r.label} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">{r.label}</Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {r.hint}
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      bgcolor: 'grey.100',
                      borderRadius: 1,
                      px: 1,
                      py: 0.5,
                      mt: 0.5,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontFamily: 'monospace',
                        flex: 1,
                        wordBreak: 'break-all',
                      }}
                    >
                      {r.url}
                    </Typography>
                    <Tooltip title="URLをコピー">
                      <IconButton size="small" onClick={() => copyText(r.url)}>
                        <ContentCopy fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="別タブで開く">
                      <IconButton
                        size="small"
                        onClick={() => window.open(r.url, '_blank', 'noopener')}
                      >
                        <OpenInNew fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="QRコード">
                      <IconButton
                        size="small"
                        color={qrShown === r.label ? 'primary' : 'default'}
                        onClick={() =>
                          setQrShown(qrShown === r.label ? null : r.label)
                        }
                      >
                        <QrCode2 fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  {qrShown === r.label && (
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        mt: 1.5,
                      }}
                    >
                      <Box sx={{ bgcolor: 'white', p: 1.5, borderRadius: 1 }}>
                        <QRCodeCanvas
                          value={r.url}
                          size={200}
                          ref={(el) => {
                            qrRefs.current[r.label] = el;
                          }}
                        />
                      </Box>
                      <Button
                        size="small"
                        startIcon={<QrCode2 />}
                        sx={{ mt: 1 }}
                        onClick={() =>
                          downloadQr(
                            r.label,
                            `${shareTarget.slug}-${r.label}.png`,
                          )
                        }
                      >
                        QRをPNGで保存
                      </Button>
                    </Box>
                  )}
                </Box>
              ));
            })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareTarget(null)}>閉じる</Button>
        </DialogActions>
      </Dialog>

      {/* 課金編集ダイアログ */}
      <Dialog
        open={!!billingTarget}
        onClose={() => setBillingTarget(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          課金情報 — {billingTarget?.name}（{billingTarget?.slug}）
        </DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" sx={{ mb: 1, mt: 1 }}>
            課金ステータス
          </Typography>
          <RadioGroup
            row
            value={billingForm.billingStatus}
            onChange={(e) =>
              setBillingForm({ ...billingForm, billingStatus: e.target.value })
            }
            sx={{ mb: 2 }}
          >
            <FormControlLabel value="" control={<Radio />} label="未設定" />
            <FormControlLabel value="trial" control={<Radio />} label="試用" />
            <FormControlLabel value="paid" control={<Radio />} label="支払い済み" />
            <FormControlLabel value="unpaid" control={<Radio />} label="未払い" />
            <FormControlLabel value="free" control={<Radio />} label="無料" />
          </RadioGroup>
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <TextField
              label="プラン名"
              fullWidth
              value={billingForm.plan}
              onChange={(e) => setBillingForm({ ...billingForm, plan: e.target.value })}
              placeholder="例: basic / pro"
            />
            <TextField
              label="月額料金（円）"
              type="number"
              fullWidth
              value={billingForm.monthlyFee}
              onChange={(e) =>
                setBillingForm({ ...billingForm, monthlyFee: e.target.value })
              }
            />
          </Stack>
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <TextField
              label="契約開始日"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={billingForm.contractStartDate}
              onChange={(e) =>
                setBillingForm({ ...billingForm, contractStartDate: e.target.value })
              }
            />
            <TextField
              label="次回請求日"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={billingForm.nextBillingDate}
              onChange={(e) =>
                setBillingForm({ ...billingForm, nextBillingDate: e.target.value })
              }
            />
          </Stack>
          <TextField
            label="メモ（連絡先・請求状況など）"
            fullWidth
            multiline
            minRows={2}
            value={billingForm.billingNote}
            onChange={(e) =>
              setBillingForm({ ...billingForm, billingNote: e.target.value })
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBillingTarget(null)}>キャンセル</Button>
          <Button
            variant="contained"
            disabled={billingMutation.isPending}
            onClick={() =>
              billingTarget &&
              billingMutation.mutate({
                id: billingTarget.id,
                data: {
                  plan: billingForm.plan,
                  monthlyFee:
                    billingForm.monthlyFee === '' ? null : Number(billingForm.monthlyFee),
                  billingStatus: billingForm.billingStatus,
                  contractStartDate: billingForm.contractStartDate,
                  nextBillingDate: billingForm.nextBillingDate,
                  billingNote: billingForm.billingNote,
                },
              })
            }
          >
            {billingMutation.isPending ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 閲覧専用ユーザー代理作成ダイアログ */}
      <Dialog
        open={!!userTarget}
        onClose={() => setUserTarget(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          閲覧専用ユーザーを追加 — {userTarget?.name}（{userTarget?.slug}）
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            このテナントの在庫を閲覧のみできるユーザーを作成します。
            ログイン用のメールアドレスとパスワードを設定してください。
          </DialogContentText>
          <TextField
            label="メールアドレス"
            type="email"
            fullWidth
            required
            value={userForm.email}
            onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            label="パスワード（8文字以上）"
            type="text"
            fullWidth
            required
            value={userForm.password}
            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
            helperText="このパスワードを利用者に伝えてください"
            sx={{ mb: 2 }}
          />
          <TextField
            label="表示名（任意）"
            fullWidth
            value={userForm.name}
            onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserTarget(null)}>キャンセル</Button>
          <Button
            variant="contained"
            disabled={
              !userForm.email.trim() ||
              userForm.password.length < 8 ||
              createUserMutation.isPending
            }
            onClick={() =>
              userTarget &&
              createUserMutation.mutate({
                id: userTarget.id,
                data: {
                  email: userForm.email.trim(),
                  password: userForm.password,
                  name: userForm.name.trim() || undefined,
                },
              })
            }
          >
            {createUserMutation.isPending ? '追加中...' : '追加'}
          </Button>
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

// 使用量バー（Cloudinary使用量の表示用）。使用率に応じて色が変わる。
const UsageBar = ({
  label,
  used,
  limit,
  unit,
}: {
  label: string;
  used: number;
  limit: number;
  unit: string;
}) => {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const color = pct >= 90 ? '#d32f2f' : pct >= 70 ? '#ed6c02' : '#2e7d32';
  return (
    <Box sx={{ flex: 1, minWidth: 160 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {label}
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          {used}
          {unit} / {limit}
          {unit}（{pct}%）
        </Typography>
      </Box>
      <Box sx={{ height: 8, borderRadius: 4, background: '#eee', overflow: 'hidden' }}>
        <Box sx={{ width: `${pct}%`, height: '100%', background: color, transition: 'width .3s' }} />
      </Box>
    </Box>
  );
};

export default MasterDashboardPage;
