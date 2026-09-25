// ============================================================
// UploadButton
// ============================================================
// ファイル選択ボタン。ボタンクリックで隠しfile inputの.click()を
// 明示的に呼ぶ方式。
//
// 背景: MUI の `component="label"` + hidden input 方式は Safari では
// 動くが、Chrome の一部環境ではラベルクリックがネイティブのファイル
// 選択(Finder)をサイレントにブロックし、エラーも出さず無反応になる。
// useRef で input への参照を持ち、ボタンの onClick から
// inputRef.current.click() を直接呼ぶことで、どのブラウザでも確実に
// ファイル選択を起動する。
//
// 使い方（従来の <Button component="label">ラベル<input.../></Button> を置換）:
//   <UploadButton
//     accept="image/*"
//     onChange={handleImageChange}
//     variant="outlined"
//     fullWidth
//     sx={{ py: 1.5 }}
//   >
//     画像を選択
//   </UploadButton>
// ============================================================

import { useRef } from 'react';
import { Button } from '@mui/material';
import type { ButtonProps } from '@mui/material';

interface UploadButtonProps extends Omit<ButtonProps, 'component' | 'onChange'> {
  accept?: string;
  multiple?: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const UploadButton = ({
  accept,
  multiple,
  onChange,
  children,
  disabled,
  ...buttonProps
}: UploadButtonProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    // 明示的に file input をクリックしてネイティブのファイル選択を起動する
    inputRef.current?.click();
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event);
    // 同じファイルを連続で選べるように値をリセット
    event.target.value = '';
  };

  return (
    <Button {...buttonProps} disabled={disabled} onClick={handleClick}>
      {children}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        style={{ display: 'none' }}
      />
    </Button>
  );
};
