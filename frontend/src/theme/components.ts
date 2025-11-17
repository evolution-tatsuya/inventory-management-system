import type { Components, Theme } from '@mui/material/styles';

/**
 * MUIコンポーネントのデフォルトスタイル上書き
 * ビジネスライクで統一感のあるデザイン
 */
const components: Components<Theme> = {
  // ボタン
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        textTransform: 'none',
        fontWeight: 600,
        padding: '8px 16px',
      },
      contained: {
        boxShadow: 'none',
        '&:hover': {
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
        },
      },
      outlined: {
        borderWidth: 2,
        '&:hover': {
          borderWidth: 2,
        },
      },
    },
    defaultProps: {
      disableElevation: true,
    },
  },

  // カード
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 12,
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
        '&:hover': {
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.12)',
        },
      },
    },
  },

  // ペーパー（モーダル、ポップアップ等）
  MuiPaper: {
    styleOverrides: {
      root: {
        borderRadius: 12,
      },
      elevation1: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.08)',
      },
      elevation2: {
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
      },
      elevation3: {
        boxShadow: '0px 6px 12px rgba(0, 0, 0, 0.12)',
      },
    },
  },

  // テキストフィールド
  MuiTextField: {
    defaultProps: {
      variant: 'outlined',
    },
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: 8,
        },
      },
    },
  },

  // ダイアログ
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 16,
        padding: 8,
      },
    },
  },

  // チップ
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        fontWeight: 500,
      },
    },
  },

  // アラート
  MuiAlert: {
    styleOverrides: {
      root: {
        borderRadius: 8,
      },
      standardError: {
        backgroundColor: '#ffebee',
        color: '#c62828',
      },
      standardWarning: {
        backgroundColor: '#fff3e0',
        color: '#e65100',
      },
      standardInfo: {
        backgroundColor: '#e3f2fd',
        color: '#01579b',
      },
      standardSuccess: {
        backgroundColor: '#e8f5e9',
        color: '#1b5e20',
      },
    },
  },

  // タブ
  MuiTabs: {
    styleOverrides: {
      root: {
        borderBottom: '2px solid #e0e0e0',
      },
      indicator: {
        height: 3,
        borderRadius: '3px 3px 0 0',
      },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontWeight: 600,
        fontSize: '0.9375rem',
        minHeight: 56,
        '&.Mui-selected': {
          fontWeight: 700,
        },
      },
    },
  },

  // アイコンボタン
  MuiIconButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        '&:hover': {
          backgroundColor: 'rgba(25, 118, 210, 0.08)',
        },
      },
    },
  },

  // テーブル
  MuiTableCell: {
    styleOverrides: {
      root: {
        borderBottom: '1px solid #e0e0e0',
      },
      head: {
        fontWeight: 600,
        backgroundColor: '#f5f5f5',
      },
    },
  },

  // リスト
  MuiListItem: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        '&.Mui-selected': {
          backgroundColor: 'rgba(25, 118, 210, 0.08)',
          '&:hover': {
            backgroundColor: 'rgba(25, 118, 210, 0.12)',
          },
        },
      },
    },
  },

  // アバター
  MuiAvatar: {
    styleOverrides: {
      root: {
        backgroundColor: '#1976d2',
        fontWeight: 600,
      },
    },
  },

  // バッジ
  MuiBadge: {
    styleOverrides: {
      badge: {
        fontWeight: 600,
      },
    },
  },

  // スイッチ
  MuiSwitch: {
    styleOverrides: {
      root: {
        padding: 8,
      },
      track: {
        borderRadius: 12,
      },
      thumb: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.15)',
      },
    },
  },

  // チェックボックス
  MuiCheckbox: {
    defaultProps: {
      color: 'primary',
    },
  },

  // ラジオボタン
  MuiRadio: {
    defaultProps: {
      color: 'primary',
    },
  },

  // リンク
  MuiLink: {
    styleOverrides: {
      root: {
        textDecoration: 'none',
        '&:hover': {
          textDecoration: 'underline',
        },
      },
    },
  },

  // ツールチップ
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.87)',
        fontSize: '0.75rem',
        borderRadius: 6,
        padding: '8px 12px',
      },
    },
  },

  // メニュー
  MuiMenuItem: {
    styleOverrides: {
      root: {
        borderRadius: 6,
        margin: '2px 8px',
        '&:hover': {
          backgroundColor: 'rgba(25, 118, 210, 0.08)',
        },
        '&.Mui-selected': {
          backgroundColor: 'rgba(25, 118, 210, 0.12)',
          '&:hover': {
            backgroundColor: 'rgba(25, 118, 210, 0.16)',
          },
        },
      },
    },
  },
};

export default components;
