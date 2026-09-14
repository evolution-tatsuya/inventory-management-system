import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Card, CardContent, Button } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { statsApi, systemSettingsApi, inventoryCountApi } from '@/services/api';
import { getLogoMaxHeight, getLogoMaxWidth } from '@/utils/logoSize';
import type { SystemSettings } from '@/types';

// ============================================================
// DashboardPage (A-000)
// ============================================================
// 管理ダッシュボード - モックアップ準拠の全画面表示版
// ============================================================

// 相対時間の簡易表示
const relativeTime = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'たった今';
  if (min < 60) return `${min}分前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}時間前`;
  const day = Math.floor(hr / 24);
  return `${day}日前`;
};

export const DashboardPage = () => {
  const navigate = useNavigate();
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);

  // 統計データ取得（5分間隔で自動更新）
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: statsApi.getStats,
    refetchInterval: 5 * 60 * 1000, // 5分間隔
  });

  // 棚卸し履歴（最近の活動として表示）
  const { data: countHistory = [] } = useQuery({
    queryKey: ['inventory-count-history'],
    queryFn: () => inventoryCountApi.getHistory(20),
  });

  // システム設定取得
  useEffect(() => {
    const fetchSystemSettings = async () => {
      try {
        const settings = await systemSettingsApi.getSystemSettings();
        setSystemSettings(settings);
      } catch (error) {
        console.error('システム設定取得エラー:', error);
        // エラー時はデフォルト値を使用
        setSystemSettings({
          id: '',
          systemName: '階層型在庫管理システム',
          logoUrl: null,
          headerColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          createdAt: '',
          updatedAt: '',
        });
      }
    };
    fetchSystemSettings();
  }, []);

  const handleLogout = () => {
    // ログアウト処理
    navigate('/admin/login');
  };

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
          background: systemSettings?.headerColor || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '20px 30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        {systemSettings?.logoUrl && (
          <Box
            component="img"
            src={systemSettings.logoUrl}
            alt="Logo"
            sx={{
              maxHeight: getLogoMaxHeight(systemSettings?.logoSize),
              maxWidth: getLogoMaxWidth(systemSettings?.logoSize),
              objectFit: 'contain',
              mr: 2,
            }}
          />
        )}
        <Typography
          sx={{
            fontSize: '22px',
            fontWeight: 600,
            letterSpacing: '0.5px',
          }}
        >
          {systemSettings?.systemName || '階層型在庫管理システム'} - 管理画面
        </Typography>
        <Button
          onClick={handleLogout}
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
            '&:hover': {
              background: 'white',
              color: '#667eea',
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            },
          }}
        >
          ログアウト
        </Button>
      </Box>

      {/* メインコンテンツ */}
      <Box
        sx={{
          background: 'white',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        {/* ナビゲーションタブ */}
        <Box
          sx={{
            display: 'flex',
            background: '#f7f7f7',
            borderBottom: '2px solid #e0e0e0',
            overflowX: 'auto',
            '&::-webkit-scrollbar': {
              height: '8px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#ccc',
              borderRadius: '4px',
            },
          }}
        >
          <Button
            onClick={() => navigate('/admin/dashboard')}
            sx={{
              padding: '16px 32px',
              background: 'white',
              borderBottom: '3px solid #667eea',
              color: '#667eea',
              fontSize: '15px',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 0,
              minWidth: 'fit-content',
              '&:hover': {
                background: '#f0f0f0',
              },
            }}
          >
            ダッシュボード
          </Button>
          <Button
            onClick={() => navigate('/admin/categories')}
            sx={{
              padding: '16px 32px',
              background: '#f7f7f7',
              color: '#666',
              fontSize: '15px',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 0,
              minWidth: 'fit-content',
              '&:hover': {
                background: '#e0e0e0',
              },
            }}
          >
            カテゴリー管理
          </Button>
          <Button
            onClick={() => navigate('/admin/genres')}
            sx={{
              padding: '16px 32px',
              background: '#f7f7f7',
              color: '#666',
              fontSize: '15px',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 0,
              minWidth: 'fit-content',
              '&:hover': {
                background: '#e0e0e0',
              },
            }}
          >
            ジャンル管理
          </Button>
          <Button
            onClick={() => navigate('/admin/units')}
            sx={{
              padding: '16px 32px',
              background: '#f7f7f7',
              color: '#666',
              fontSize: '15px',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 0,
              minWidth: 'fit-content',
              '&:hover': {
                background: '#e0e0e0',
              },
            }}
          >
            ユニット管理
          </Button>
          <Button
            onClick={() => navigate('/admin/parts')}
            sx={{
              padding: '16px 32px',
              background: '#f7f7f7',
              color: '#666',
              fontSize: '15px',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 0,
              minWidth: 'fit-content',
              '&:hover': {
                background: '#e0e0e0',
              },
            }}
          >
            パーツ管理
          </Button>
          <Button
            onClick={() => navigate('/admin/inventory-count')}
            sx={{
              padding: '16px 32px',
              background: '#f7f7f7',
              color: '#666',
              fontSize: '15px',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 0,
              minWidth: 'fit-content',
              '&:hover': {
                background: '#e0e0e0',
              },
            }}
          >
            棚卸し
          </Button>
          <Button
            onClick={() => navigate('/admin/account-settings')}
            sx={{
              padding: '16px 32px',
              background: '#f7f7f7',
              color: '#666',
              fontSize: '15px',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 0,
              minWidth: 'fit-content',
              '&:hover': {
                background: '#e0e0e0',
              },
            }}
          >
            アカウント設定
          </Button>
          <Button
            onClick={() => navigate('/admin/qr')}
            sx={{
              padding: '16px 32px',
              background: '#f7f7f7',
              color: '#666',
              fontSize: '15px',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 0,
              minWidth: 'fit-content',
              '&:hover': {
                background: '#e0e0e0',
              },
            }}
          >
            QRコード
          </Button>
          <Button
            onClick={() => navigate('/categories')}
            sx={{
              padding: '16px 32px',
              background: '#e8f5e9',
              color: '#2e7d32',
              fontSize: '15px',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 0,
              minWidth: 'fit-content',
              '&:hover': {
                background: '#c8e6c9',
              },
            }}
          >
            ユーザー画面を見る
          </Button>
        </Box>

        {/* ダッシュボードコンテンツ */}
        <Box sx={{ padding: '40px 50px' }}>
          {/* ページタイトル */}
          <Typography
            sx={{
              fontSize: '28px',
              fontWeight: 700,
              color: '#333',
              marginBottom: '30px',
            }}
          >
            ダッシュボード
          </Typography>

          {/* 統計カードグリッド */}
          <Box sx={{ display: 'flex', gap: 3, marginBottom: '40px', flexWrap: 'wrap' }}>
            {/* カテゴリー総数 */}
            <Box sx={{ flex: '1 1 calc(25% - 18px)', minWidth: '200px' }}>
              <Card
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  borderRadius: '12px',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 8px 20px rgba(102, 126, 234, 0.4)',
                  },
                }}
              >
                <CardContent>
                  <Typography sx={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>
                    カテゴリー総数
                  </Typography>
                  <Typography sx={{ fontSize: '36px', fontWeight: 700 }}>
                    {stats?.categoryCount ?? '—'}
                  </Typography>
                  <Typography sx={{ fontSize: '12px', opacity: 0.8, marginTop: '8px' }}>
                    登録済みカテゴリー
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            {/* ジャンル総数 */}
            <Box sx={{ flex: '1 1 calc(25% - 18px)', minWidth: '200px' }}>
              <Card
                sx={{
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  color: 'white',
                  borderRadius: '12px',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 8px 20px rgba(79, 172, 254, 0.4)',
                  },
                }}
              >
                <CardContent>
                  <Typography sx={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>
                    ジャンル総数
                  </Typography>
                  <Typography sx={{ fontSize: '36px', fontWeight: 700 }}>
                    {stats?.genreCount ?? '—'}
                  </Typography>
                  <Typography sx={{ fontSize: '12px', opacity: 0.8, marginTop: '8px' }}>
                    全カテゴリー合計
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            {/* ユニット総数 */}
            <Box sx={{ flex: '1 1 calc(25% - 18px)', minWidth: '200px' }}>
              <Card
                sx={{
                  background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                  color: 'white',
                  borderRadius: '12px',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 8px 20px rgba(67, 233, 123, 0.4)',
                  },
                }}
              >
                <CardContent>
                  <Typography sx={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>
                    ユニット総数
                  </Typography>
                  <Typography sx={{ fontSize: '36px', fontWeight: 700 }}>
                    {stats?.unitCount ?? '—'}
                  </Typography>
                  <Typography sx={{ fontSize: '12px', opacity: 0.8, marginTop: '8px' }}>
                    全ジャンル合計
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            {/* 在庫切れパーツ */}
            <Box sx={{ flex: '1 1 calc(25% - 18px)', minWidth: '200px' }}>
              <Card
                sx={{
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  color: 'white',
                  borderRadius: '12px',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 8px 20px rgba(240, 147, 251, 0.4)',
                  },
                }}
              >
                <CardContent>
                  <Typography sx={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>
                    在庫切れパーツ
                  </Typography>
                  <Typography sx={{ fontSize: '36px', fontWeight: 700 }}>
                    {stats?.lowStockCount ?? '—'}
                  </Typography>
                  <Typography sx={{ fontSize: '12px', opacity: 0.8, marginTop: '8px' }}>
                    在庫5以下：要発注の目安
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>

          {/* クイックアクション */}
          <Box sx={{ marginBottom: '40px' }}>
            <Typography
              sx={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#333',
                marginBottom: '20px',
              }}
            >
              クイックアクション
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 calc(20% - 12.8px)', minWidth: '150px' }}>
                <Button
                  fullWidth
                  onClick={() => navigate('/admin/categories')}
                  sx={{
                    padding: '16px 24px',
                    background: 'white',
                    border: '2px solid #667eea',
                    color: '#667eea',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: 600,
                    textTransform: 'none',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      background: '#667eea',
                      color: 'white',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                    },
                  }}
                >
                  + 新規カテゴリー追加
                </Button>
              </Box>
              <Box sx={{ flex: '1 1 calc(20% - 12.8px)', minWidth: '150px' }}>
                <Button
                  fullWidth
                  onClick={() => navigate('/admin/genres')}
                  sx={{
                    padding: '16px 24px',
                    background: 'white',
                    border: '2px solid #667eea',
                    color: '#667eea',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: 600,
                    textTransform: 'none',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      background: '#667eea',
                      color: 'white',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                    },
                  }}
                >
                  + 新規ジャンル追加
                </Button>
              </Box>
              <Box sx={{ flex: '1 1 calc(20% - 12.8px)', minWidth: '150px' }}>
                <Button
                  fullWidth
                  onClick={() => navigate('/admin/units')}
                  sx={{
                    padding: '16px 24px',
                    background: 'white',
                    border: '2px solid #667eea',
                    color: '#667eea',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: 600,
                    textTransform: 'none',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      background: '#667eea',
                      color: 'white',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                    },
                  }}
                >
                  + 新規ユニット追加
                </Button>
              </Box>
              <Box sx={{ flex: '1 1 calc(20% - 12.8px)', minWidth: '150px' }}>
                <Button
                  fullWidth
                  onClick={() => navigate('/admin/parts/categories')}
                  sx={{
                    padding: '16px 24px',
                    background: 'white',
                    border: '2px solid #667eea',
                    color: '#667eea',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: 600,
                    textTransform: 'none',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      background: '#667eea',
                      color: 'white',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                    },
                  }}
                >
                  + 新規パーツ追加
                </Button>
              </Box>
              <Box sx={{ flex: '1 1 calc(20% - 12.8px)', minWidth: '150px' }}>
                <Button
                  fullWidth
                  onClick={() => navigate('/admin/qr')}
                  sx={{
                    padding: '16px 24px',
                    background: 'white',
                    border: '2px solid #667eea',
                    color: '#667eea',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: 600,
                    textTransform: 'none',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      background: '#667eea',
                      color: 'white',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                    },
                  }}
                >
                  QRコード表示
                </Button>
              </Box>
            </Box>
          </Box>

          {/* 最近の更新履歴 */}
          <Box
            sx={{
              background: '#f7f7f7',
              padding: '25px',
              borderRadius: '12px',
            }}
          >
            <Typography
              sx={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#333',
                marginBottom: '20px',
              }}
            >
              最近の棚卸し履歴
            </Typography>
            <Box>
              {countHistory.length === 0 && (
                <Typography sx={{ fontSize: '14px', color: '#999', padding: '15px' }}>
                  棚卸しの記録はまだありません。
                </Typography>
              )}
              {countHistory.slice(0, 8).map((log, index, arr) => (
                <Box
                  key={log.id}
                  sx={{
                    padding: '15px',
                    background: 'white',
                    marginBottom: index < arr.length - 1 ? '10px' : 0,
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                      transform: 'translateX(5px)',
                    },
                  }}
                >
                  <Typography sx={{ fontSize: '14px', color: '#444' }}>
                    {log.unitName ? `［${log.unitName}］ ` : ''}
                    {log.partNumber} の在庫を {log.beforeQty} → {log.afterQty}（
                    {log.diff > 0 ? '+' : ''}
                    {log.diff}）
                  </Typography>
                  <Typography sx={{ fontSize: '12px', color: '#999' }}>
                    {relativeTime(log.countedAt)}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
