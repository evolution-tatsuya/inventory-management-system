// ============================================================
// AdminShell
// ============================================================
// 管理画面ページ共通のヘッダー＋上部タブナビゲーション。
// 既存の各管理ページと同じ見た目を再利用可能にしたもの。
// （新規ページ＝棚卸し等で使用。既存ページは個別実装のまま）
// ============================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import { systemSettingsApi } from '@/services/api';
import { getLogoMaxHeight, getLogoMaxWidth } from '@/utils/logoSize';
import type { SystemSettings } from '@/types';

interface AdminShellProps {
  active: string; // アクティブなタブのpath（例: '/admin/inventory-count'）
  children: React.ReactNode;
}

const TABS = [
  { label: 'ダッシュボード', path: '/admin/dashboard' },
  { label: 'カテゴリー管理', path: '/admin/categories' },
  { label: 'ジャンル管理', path: '/admin/genres' },
  { label: 'ユニット管理', path: '/admin/units' },
  { label: 'パーツ管理', path: '/admin/parts' },
  { label: '棚卸し', path: '/admin/inventory-count' },
  { label: 'アカウント設定', path: '/admin/account-settings' },
  { label: 'QRコード', path: '/admin/qr' },
  { label: '運営者', path: '/admin/owner' },
];

export const AdminShell = ({ active, children }: AdminShellProps) => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  useEffect(() => {
    systemSettingsApi
      .getSystemSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
          background: settings?.headerColor || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '20px 30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {settings?.logoUrl && (
            <Box
              component="img"
              src={settings.logoUrl}
              alt="Logo"
              sx={{
                maxHeight: getLogoMaxHeight(settings?.logoSize),
                maxWidth: getLogoMaxWidth(settings?.logoSize),
                objectFit: 'contain',
                mr: 2,
              }}
            />
          )}
          <Typography sx={{ fontSize: '22px', fontWeight: 600, letterSpacing: '0.5px' }}>
            {settings?.systemName || '階層型在庫管理システム'} - 管理画面
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            onClick={() => navigate('/categories')}
            sx={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '2px solid white',
              color: 'white',
              padding: '10px 24px',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 600,
              textTransform: 'none',
              transition: 'all 0.3s ease',
              '&:hover': { background: 'white', color: '#667eea', transform: 'translateY(-2px)' },
            }}
          >
            ユーザー画面を見る
          </Button>
          <Button
            onClick={() => navigate('/login')}
            sx={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '2px solid white',
              color: 'white',
              padding: '10px 24px',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 600,
              transition: 'all 0.3s ease',
              '&:hover': { background: 'white', color: '#667eea', transform: 'translateY(-2px)' },
            }}
          >
            ログアウト
          </Button>
        </Box>
      </Box>

      {/* タブナビゲーション */}
      <Box sx={{ display: 'flex', background: '#f7f7f7', borderBottom: '2px solid #e0e0e0', overflowX: 'auto' }}>
        {TABS.map((tab) => {
          const isActive = tab.path === active;
          return (
            <Button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              sx={{
                padding: '16px 32px',
                background: isActive ? 'white' : 'transparent',
                borderBottom: isActive ? '3px solid #667eea' : '3px solid transparent',
                borderRadius: 0,
                fontSize: '15px',
                fontWeight: 600,
                color: isActive ? '#667eea' : '#666',
                whiteSpace: 'nowrap',
                transition: 'all 0.3s ease',
                '&:hover': { background: isActive ? 'white' : '#e9ecef', color: '#667eea' },
              }}
            >
              {tab.label}
            </Button>
          );
        })}
      </Box>

      {/* メインコンテンツ */}
      <Box sx={{ background: '#f5f5f5', minHeight: 'calc(100vh - 130px)', padding: '24px 32px 60px' }}>
        {children}
      </Box>
    </Box>
  );
};
