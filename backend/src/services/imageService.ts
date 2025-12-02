import cloudinary from '../config/cloudinary';

export const imageService = {
  /**
   * 画像アップロード
   * @param fileBuffer 画像ファイルのバッファ
   * @param folder Cloudinaryのフォルダ名（デフォルト: 'inventory'）
   * @returns アップロード結果
   */
  async uploadImage(fileBuffer: Buffer, folder: string = 'inventory') {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
          // 画像圧縮・最適化設定（画質はほぼ同じで容量5分の1）
          quality: 'auto:good',      // 自動品質調整（良好な画質を維持）
          fetch_format: 'auto',      // 最適フォーマット自動選択（WebP等）
          flags: 'progressive',      // プログレッシブJPEG（読み込み高速化）
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      uploadStream.end(fileBuffer);
    });
  },

  /**
   * 画像削除
   * @param publicId Cloudinaryの public_id
   * @returns 削除結果
   */
  async deleteImage(publicId: string) {
    return await cloudinary.uploader.destroy(publicId);
  },

  /**
   * URLから public_id を抽出
   * @param url Cloudinaryの画像URL
   * @returns public_id または null
   */
  extractPublicId(url: string): string | null {
    // 例: https://res.cloudinary.com/<cloud_name>/image/upload/v<version>/<public_id>.<ext>
    const match = url.match(/\/v\d+\/(.+)\.\w+$/);
    return match ? match[1] : null;
  },
};
