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
   * Cloudinary全体の使用量を取得（運営者総括用）。
   * ストレージ・帯域・クレジット・保存リソース数などを返す。
   */
  async getUsage() {
    const u: any = await cloudinary.api.usage();
    const toGB = (bytes: number) => Math.round((bytes / 1e9) * 100) / 100;
    return {
      plan: u.plan,
      lastUpdated: u.last_updated,
      storageGB: toGB(u.storage?.usage ?? 0),
      bandwidthGB: toGB(u.bandwidth?.usage ?? 0),
      creditsUsed: u.credits?.usage ?? 0,
      creditsLimit: u.credits?.limit ?? 25,
      creditsPercent: u.credits?.used_percent ?? 0,
      resources: u.resources ?? 0, // 保存リソース数（画像・PDF等）
      // 無料枠の目安（Free: ストレージ25GB/帯域25GB/クレジット25）
      storageLimitGB: 25,
      bandwidthLimitGB: 25,
    };
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
