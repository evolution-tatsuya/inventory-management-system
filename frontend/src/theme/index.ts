import { createTheme } from '@mui/material/styles';
import palette from './palette';
import typography from './typography';
import components from './components';

/**
 * MUIテーマ設定
 * テーマ1: プロフェッショナル（ダークブルー基調）
 *
 * 特徴:
 * - ビジネスライクで信頼感のあるデザイン
 * - 視認性と使いやすさを重視
 * - 管理者向け業務用システムとして最適化
 * - ダークブルー × インディゴの配色
 * - 統一感のある角丸デザイン（8px, 12px, 16px）
 */
const theme = createTheme({
  palette,
  typography,
  components,

  // ブレークポイント（レスポンシブ対応）
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },

  // スペーシング（デフォルト: 8px）
  spacing: 8,

  // シェイプ（角丸の基準値）
  shape: {
    borderRadius: 8,
  },

  // z-index
  zIndex: {
    mobileStepper: 1000,
    fab: 1050,
    speedDial: 1050,
    appBar: 1100,
    drawer: 1200,
    modal: 1300,
    snackbar: 1400,
    tooltip: 1500,
  },

  // トランジション
  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },
  },
});

export default theme;
