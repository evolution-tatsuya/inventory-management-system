// ============================================================
// ロゴサイズ ユーティリティ
// ============================================================
// システム設定の logoSize (small/medium/large) を
// ヘッダーに表示するロゴの最大高さ・最大幅(px)に変換する。
// small が現状の基準（ヘッダー背景バーより少し小さい高さ）。
// 横長バナーロゴにも対応するため、幅も高さに連動して広げる。
// ============================================================

export const getLogoMaxHeight = (logoSize?: string): string => {
  switch (logoSize) {
    case 'large':
      return '112px';
    case 'medium':
      return '64px';
    case 'small':
    default:
      return '48px';
  }
};

export const getLogoMaxWidth = (logoSize?: string): string => {
  switch (logoSize) {
    case 'large':
      return '480px';
    case 'medium':
      return '300px';
    case 'small':
    default:
      return '200px';
  }
};
