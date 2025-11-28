import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { Box, Typography, Button } from '@mui/material';
import { Logout, Print, Download, ContentCopy } from '@mui/icons-material';

// ============================================================
// QRCodePage (A-006)
// ============================================================
// QRコードページ - 全画面表示版
// ============================================================

export const QRCodePage = () => {
  const navigate = useNavigate();
  const qrCodeRef = useRef<HTMLCanvasElement>(null);

  // ログインページURL
  const loginUrl = `${window.location.protocol}//${window.location.host}/login`;

  const handleLogout = async () => {
    try {
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const canvas = qrCodeRef.current;
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'login-qrcode.png';
      link.href = url;
      link.click();
      alert('QRコードをダウンロードしました');
    } else {
      alert('QRコードのダウンロードに失敗しました。');
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(loginUrl);
      alert(`URLをクリップボードにコピーしました\n\n${loginUrl}`);
    } catch (error) {
      const textarea = document.createElement('textarea');
      textarea.value = loginUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert(`URLをクリップボードにコピーしました\n\n${loginUrl}`);
    }
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
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '20px 30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        <Typography
          sx={{
            fontSize: '22px',
            fontWeight: 600,
            letterSpacing: '0.5px',
          }}
        >
          階層型在庫管理システム
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

      {/* タブナビゲーションバー */}
      <Box
        sx={{
          display: 'flex',
          background: '#f7f7f7',
          borderBottom: '2px solid #e0e0e0',
          overflowX: 'auto',
        }}
      >
        <Button
          onClick={() => navigate('/admin/dashboard')}
          sx={{
            padding: '16px 32px',
            background: 'transparent',
            borderBottom: '3px solid transparent',
            borderRadius: 0,
            fontSize: '15px',
            fontWeight: 600,
            color: '#666',
            transition: 'all 0.3s ease',
            whiteSpace: 'nowrap',
            '&:hover': {
              background: '#e9ecef',
              color: '#667eea',
            },
          }}
        >
          ダッシュボード
        </Button>
        <Button
          onClick={() => navigate('/admin/categories')}
          sx={{
            padding: '16px 32px',
            background: 'transparent',
            borderBottom: '3px solid transparent',
            borderRadius: 0,
            fontSize: '15px',
            fontWeight: 600,
            color: '#666',
            transition: 'all 0.3s ease',
            whiteSpace: 'nowrap',
            '&:hover': {
              background: '#e9ecef',
              color: '#667eea',
            },
          }}
        >
          カテゴリー管理
        </Button>
        <Button
          onClick={() => navigate('/admin/genres')}
          sx={{
            padding: '16px 32px',
            background: 'transparent',
            borderBottom: '3px solid transparent',
            borderRadius: 0,
            fontSize: '15px',
            fontWeight: 600,
            color: '#666',
            transition: 'all 0.3s ease',
            whiteSpace: 'nowrap',
            '&:hover': {
              background: '#e9ecef',
              color: '#667eea',
            },
          }}
        >
          ジャンル管理
        </Button>
        <Button
          onClick={() => navigate('/admin/units')}
          sx={{
            padding: '16px 32px',
            background: 'transparent',
            borderBottom: '3px solid transparent',
            borderRadius: 0,
            fontSize: '15px',
            fontWeight: 600,
            color: '#666',
            transition: 'all 0.3s ease',
            whiteSpace: 'nowrap',
            '&:hover': {
              background: '#e9ecef',
              color: '#667eea',
            },
          }}
        >
          ユニット管理
        </Button>
        <Button
          onClick={() => navigate('/admin/parts')}
          sx={{
            padding: '16px 32px',
            background: 'transparent',
            borderBottom: '3px solid transparent',
            borderRadius: 0,
            fontSize: '15px',
            fontWeight: 600,
            color: '#666',
            transition: 'all 0.3s ease',
            whiteSpace: 'nowrap',
            '&:hover': {
              background: '#e9ecef',
              color: '#667eea',
            },
          }}
        >
          パーツ管理
        </Button>
        <Button
          onClick={() => navigate('/admin/account-settings')}
          sx={{
            padding: '16px 32px',
            background: 'transparent',
            borderBottom: '3px solid transparent',
            borderRadius: 0,
            fontSize: '15px',
            fontWeight: 600,
            color: '#666',
            transition: 'all 0.3s ease',
            whiteSpace: 'nowrap',
            '&:hover': {
              background: '#e9ecef',
              color: '#667eea',
            },
          }}
        >
          アカウント設定
        </Button>
        <Button
          onClick={() => navigate('/admin/qr')}
          sx={{
            padding: '16px 32px',
            background: 'white',
            borderBottom: '3px solid #667eea',
            borderRadius: 0,
            fontSize: '15px',
            fontWeight: 600,
            color: '#667eea',
            whiteSpace: 'nowrap',
          }}
        >
          QRコード
        </Button>
      </Box>

      {/* メインコンテンツ */}
      <Box
        sx={{
          background: '#f5f5f5',
          minHeight: 'calc(100vh - 130px)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            padding: '20px 40px 60px 40px',
          }}
        >
          {/* 中央配置コンテナ */}
          <Box sx={{ width: '100%', maxWidth: '800px' }}>
            {/* ページタイトル */}
            <Typography
              sx={{
                fontSize: '21px',
                fontWeight: 700,
                marginTop: '16px',
                marginBottom: '8px',
                color: '#333',
              }}
            >
              ログインページQRコード
            </Typography>
            <Typography
              sx={{
                fontSize: '14px',
                color: '#666',
                marginBottom: '16px',
              }}
            >
              一般ユーザー向けログインページへのアクセス用QRコードです
            </Typography>

            {/* QRカード */}
            <Box
              sx={{
                background: 'white',
                borderRadius: '16px',
                padding: '32px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                textAlign: 'center',
              }}
            >
              {/* QRコード */}
              <Box
                sx={{
                  background: 'white',
                  padding: '24px',
                  borderRadius: '12px',
                  display: 'inline-block',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  marginBottom: '24px',
                }}
              >
                <QRCodeCanvas
                  ref={qrCodeRef}
                  value={loginUrl}
                  size={256}
                  level="H"
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </Box>

              {/* URL情報 */}
              <Box
                sx={{
                  background: '#f7f7f7',
                  padding: '16px',
                  borderRadius: '8px',
                  marginBottom: '24px',
                }}
              >
                <Typography
                  sx={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#666',
                    marginBottom: '6px',
                  }}
                >
                  アクセスURL
                </Typography>
                <Typography
                  sx={{
                    fontSize: '14px',
                    color: '#667eea',
                    fontWeight: 600,
                    wordBreak: 'break-all',
                  }}
                >
                  {loginUrl}
                </Typography>
              </Box>

              {/* アクションボタン */}
              <Box
                sx={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <Button
                  onClick={handlePrint}
                  startIcon={<Print />}
                  variant="contained"
                  sx={{
                    padding: '10px 24px',
                    fontSize: '13px',
                    fontWeight: 600,
                    textTransform: 'none',
                    borderRadius: '8px',
                    background: '#667eea',
                    '&:hover': {
                      background: '#5568d3',
                    },
                  }}
                >
                  印刷
                </Button>
                <Button
                  onClick={handleDownload}
                  startIcon={<Download />}
                  variant="contained"
                  sx={{
                    padding: '10px 24px',
                    fontSize: '13px',
                    fontWeight: 600,
                    textTransform: 'none',
                    borderRadius: '8px',
                    background: '#3182ce',
                    '&:hover': {
                      background: '#2c5282',
                    },
                  }}
                >
                  QRコードをダウンロード
                </Button>
                <Button
                  onClick={handleCopyUrl}
                  startIcon={<ContentCopy />}
                  variant="contained"
                  sx={{
                    padding: '10px 24px',
                    fontSize: '13px',
                    fontWeight: 600,
                    textTransform: 'none',
                    borderRadius: '8px',
                    background: '#38a169',
                    '&:hover': {
                      background: '#2f855a',
                    },
                  }}
                >
                  URLをコピー
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
