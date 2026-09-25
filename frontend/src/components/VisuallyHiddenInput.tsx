// ============================================================
// VisuallyHiddenInput
// ============================================================
// ファイル選択用の <input type="file">。
// `hidden` 属性ではなく「視覚的に隠す(clip)」方式で描画する。
//
// 背景: MUI の `component="label"` ボタン内で `<input hidden>` を使うと、
// 一部ブラウザ環境でラベルクリックがネイティブのファイル選択(Finder)を
// 起動しないことがある。MUI公式が推奨するこの clip 方式なら、要素は
// クリック可能なまま画面から見えなくなるため、どの環境でも確実に発火する。
//
// 使い方（従来の <input type="file" hidden ... /> をそのまま置換）:
//   <Button component="label">
//     画像を選択
//     <VisuallyHiddenInput accept="image/*" onChange={handleImageChange} />
//   </Button>
// ============================================================

import { styled } from '@mui/material/styles';

export const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});
