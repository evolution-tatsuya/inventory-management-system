// ============================================================
// 運営者向け総括ページ（OwnerPage）
// ============================================================
// 運営者(オーナー)が在庫モード等の上位設定を管理する。
// まずは在庫モード(shared/perCategory)の表示・切替のみ。
// ============================================================

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Radio,
  Typography,
} from '@mui/material';
import { AdminShell } from '@/components/AdminShell';
import { ownerApi } from '@/services/api';
import type { StockMode } from '@/services/api/owner';

export default function OwnerPage() {
  const [mode, setMode] = useState<StockMode | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<StockMode | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const r = await ownerApi.getStockMode();
      setMode(r.mode);
    } catch (e: any) {
      setMsg(`取得に失敗しました: ${e.message || ''}`);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const confirmSwitch = async () => {
    if (!pending) return;
    setSaving(true);
    try {
      const r = await ownerApi.setStockMode(pending);
      setMode(r.mode);
      setMsg(
        r.mode === 'perCategory'
          ? `カテゴリー独立モードに切り替えました（在庫レコードを${r.migrated}件カテゴリー別に用意）`
          : '全カテゴリー共有モードに切り替えました',
      );
      setPending(null);
    } catch (e: any) {
      setMsg(`切替に失敗しました: ${e.message || ''}`);
    } finally {
      setSaving(false);
    }
  };

  const ModeCard = ({
    value,
    title,
    desc,
    caution,
  }: {
    value: StockMode;
    title: string;
    desc: string;
    caution?: string;
  }) => {
    const active = mode === value;
    return (
      <Card
        variant="outlined"
        sx={{
          flex: 1,
          minWidth: 260,
          borderColor: active ? '#667eea' : undefined,
          borderWidth: active ? 2 : 1,
          cursor: active ? 'default' : 'pointer',
        }}
        onClick={() => !active && setPending(value)}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Radio checked={active} readOnly size="small" />
            <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
            {active && <Chip label="現在" size="small" color="primary" />}
          </Box>
          <Typography variant="body2" color="text.secondary">
            {desc}
          </Typography>
          {caution && (
            <Typography variant="caption" sx={{ color: '#b7791f', display: 'block', mt: 1 }}>
              {caution}
            </Typography>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <AdminShell active="/admin/owner">
      <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
          運営者ページ
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          販売・運用に関わる上位設定を管理します（運営者専用）。
        </Typography>

        {msg && (
          <Alert
            severity={msg.includes('失敗') ? 'error' : 'success'}
            sx={{ mb: 2 }}
            onClose={() => setMsg('')}
          >
            {msg}
          </Alert>
        )}

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography sx={{ fontWeight: 700, fontSize: 18, mb: 0.5 }}>在庫モード</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              在庫を「全カテゴリーで共有」するか「カテゴリーごとに独立」させるかを設定します。
              この設定は運営者のみが変更でき、顧客の管理者は触れません。
            </Typography>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <ModeCard
                  value="shared"
                  title="全カテゴリー共有"
                  desc="同じ品番はカテゴリーを跨いで在庫を共有します（従来の動作）。"
                />
                <ModeCard
                  value="perCategory"
                  title="カテゴリー独立（推奨）"
                  desc="在庫はカテゴリーごとに独立。同じ品番でも別カテゴリーには影響しません。"
                  caution="切替時、現在の在庫値を各カテゴリーへコピーします。"
                />
              </Box>
            )}
          </CardContent>
        </Card>

        <Divider sx={{ my: 2 }} />
        <Typography variant="caption" color="text.secondary">
          ※ 今後、顧客インスタンスの発行・契約管理などをこのページに追加していく予定です。
        </Typography>
      </Box>

      {/* 切替確認ダイアログ */}
      <Dialog open={!!pending} onClose={() => !saving && setPending(null)}>
        <DialogTitle>在庫モードを切り替えますか？</DialogTitle>
        <DialogContent>
          <DialogContentText component="div">
            {pending === 'perCategory' ? (
              <>
                <b>カテゴリー独立</b>モードに切り替えます。
                <br />
                現在の在庫値を各カテゴリーへコピーし、以後は在庫がカテゴリーごとに独立します。
                <br />
                （同じ品番でも別カテゴリーの在庫には影響しなくなります）
              </>
            ) : (
              <>
                <b>全カテゴリー共有</b>モードに戻します。
                <br />
                同じ品番はカテゴリーを跨いで在庫を共有するようになります。
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPending(null)} disabled={saving}>
            キャンセル
          </Button>
          <Button onClick={confirmSwitch} variant="contained" disabled={saving}>
            {saving ? '切替中...' : 'OK'}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminShell>
  );
}
