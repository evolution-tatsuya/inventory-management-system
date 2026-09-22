import { Request, Response, NextFunction } from 'express';
import { imageService } from '../services/imageService';
import { limitService } from '../services/limitService';
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

export const imageUploadMiddleware = upload.single('image');

export const imageController = {
  /**
   * 画像アップロード
   * POST /api/admin/images/upload
   */
  async uploadImage(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      // プラン上限チェック（画像容量。tenantId は requireAuth で確立済み）
      const tenantId = (req as any).tenantId;
      if (tenantId) {
        await limitService.assertImageLimit(tenantId, 1);
      }

      const result: any = await imageService.uploadImage(req.file.buffer);

      res.json({
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * 画像削除
   * DELETE /api/admin/images/:id
   */
  async deleteImage(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const result = await imageService.deleteImage(id);

      if (result.result === 'ok') {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'Image not found' });
      }
    } catch (error) {
      next(error);
    }
  },
};
