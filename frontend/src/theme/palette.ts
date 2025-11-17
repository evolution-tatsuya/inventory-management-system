import type { PaletteOptions } from '@mui/material/styles';

/**
 * テーマ1: プロフェッショナル（ダークブルー基調）
 * ビジネスライクで信頼感のあるデザイン
 */
const palette: PaletteOptions = {
  primary: {
    main: '#1976d2',      // ライトブルー（メインカラー）
    dark: '#1565c0',      // より濃いブルー（ホバー、アクティブ）
    light: '#42a5f5',     // より明るいブルー（背景、軽い強調）
    contrastText: '#ffffff', // 白（ボタンテキスト等）
  },
  secondary: {
    main: '#283593',      // インディゴ（サブカラー）
    dark: '#1a237e',      // より濃いインディゴ（ホバー、アクティブ）
    light: '#3f51b5',     // より明るいインディゴ（背景、軽い強調）
    contrastText: '#ffffff', // 白（ボタンテキスト等）
  },
  background: {
    default: '#f5f5f5',   // 明るいグレー（メインコンテンツ背景）
    paper: '#ffffff',     // 白（カード、モーダル等）
  },
  text: {
    primary: '#212121',   // ダークグレー（メインテキスト）
    secondary: '#757575', // ミディアムグレー（サブテキスト）
    disabled: '#bdbdbd',  // 薄いグレー（無効化テキスト）
  },
  error: {
    main: '#d32f2f',      // 赤（エラー）
    dark: '#c62828',      // より濃い赤
    light: '#ef5350',     // より明るい赤
    contrastText: '#ffffff',
  },
  warning: {
    main: '#ed6c02',      // オレンジ（警告）
    dark: '#e65100',      // より濃いオレンジ
    light: '#ff9800',     // より明るいオレンジ
    contrastText: '#ffffff',
  },
  info: {
    main: '#0288d1',      // 明るいブルー（情報）
    dark: '#01579b',      // より濃いブルー
    light: '#03a9f4',     // より明るいブルー
    contrastText: '#ffffff',
  },
  success: {
    main: '#2e7d32',      // グリーン（成功）
    dark: '#1b5e20',      // より濃いグリーン
    light: '#4caf50',     // より明るいグリーン
    contrastText: '#ffffff',
  },
  divider: '#e0e0e0',     // 薄いグレー（区切り線）
  action: {
    active: 'rgba(0, 0, 0, 0.54)',
    hover: 'rgba(0, 0, 0, 0.04)',
    selected: 'rgba(0, 0, 0, 0.08)',
    disabled: 'rgba(0, 0, 0, 0.26)',
    disabledBackground: 'rgba(0, 0, 0, 0.12)',
  },
};

export default palette;
