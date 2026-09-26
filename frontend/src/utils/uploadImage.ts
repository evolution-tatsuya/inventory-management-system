// ============================================================
// uploadImage
// ============================================================
// 画像(base64データURL または Blob)を Cloudinary にアップロードし、
// 保存された画像のURL(secure_url)を返す共通関数。
//
// 従来は各ページで Canvas トリミング + fetch を重複実装していたが、
// 画像編集(拡大縮小・移動)を ImageEditorDialog に一本化したため、
// エディターが返す加工済み base64 PNG をそのまま渡してアップロードする。
// ============================================================

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = 'ml_default';

/**
 * base64データURL または Blob を Cloudinary にアップロードして secure_url を返す。
 * @param image base64データURL文字列 または Blob
 * @param fileName アップロード時のファイル名（任意）
 */
export const uploadImageToCloudinary = async (
  image: string | Blob,
  fileName = 'image.png',
): Promise<string> => {
  const formData = new FormData();
  if (typeof image === 'string') {
    // base64データURL文字列（Cloudinaryはdata URIを直接受け付ける）
    formData.append('file', image);
  } else {
    // Blob
    formData.append('file', image, fileName);
  }
  formData.append('upload_preset', UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData },
  );

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || '画像のアップロードに失敗しました');
  }
  if (!data.secure_url) {
    throw new Error('画像のアップロードに失敗しました: URLが取得できませんでした');
  }
  return data.secure_url as string;
};
