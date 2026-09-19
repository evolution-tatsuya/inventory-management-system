// ============================================================
// 階層型在庫管理システム - エクスポートコントローラー
// ============================================================
// エクスポート関連のHTTPリクエスト処理
// ============================================================

import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { exportService } from '../services/exportService';
import { validateId } from '../utils/validators';

// ============================================================
// Multer設定 - CSV/Excelファイルアップロード
// ============================================================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB制限
  },
  fileFilter: (req, file, cb) => {
    // CSV, Excel形式のみ許可
    const allowedMimes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    const allowedExtensions = ['.csv', '.xls', '.xlsx'];
    const hasValidMime = allowedMimes.includes(file.mimetype);
    const hasValidExtension = allowedExtensions.some((ext) =>
      file.originalname.toLowerCase().endsWith(ext),
    );

    if (hasValidMime || hasValidExtension) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'));
    }
  },
});

export const uploadCSVMiddleware = upload.single('file');

// ============================================================
// エクスポートコントローラー
// ============================================================
export const exportController = {
  // CSVエクスポート
  async exportCSV(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { unitId } = req.query;

      if (!validateId(id)) {
        return res.status(400).json({ error: 'Invalid genre ID' });
      }

      if (unitId && typeof unitId !== 'string') {
        return res.status(400).json({ error: 'Invalid unit ID' });
      }

      const csvContent = await exportService.exportToCSV(req.tenantId!, id, unitId as string | undefined);

      // CSVファイルとしてダウンロード
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="parts-${id}.csv"`);
      res.send(csvContent);
    } catch (error) {
      if (error instanceof Error && error.message === 'Genre not found') {
        return res.status(404).json({ error: 'Genre not found' });
      }
      next(error);
    }
  },

  // PDFエクスポート
  async exportPDF(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { unitId } = req.query;

      if (!validateId(id)) {
        return res.status(400).json({ error: 'Invalid genre ID' });
      }

      if (unitId && typeof unitId !== 'string') {
        return res.status(400).json({ error: 'Invalid unit ID' });
      }

      const pdfStream = await exportService.exportToPDF(req.tenantId!, id, unitId as string | undefined);

      // PDFファイルとしてダウンロード（タイムスタンプ付きでキャッシュ回避）
      const timestamp = new Date().getTime();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="parts-${id}-${timestamp}.pdf"`);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      pdfStream.pipe(res);
    } catch (error) {
      if (error instanceof Error && error.message === 'Genre not found') {
        return res.status(404).json({ error: 'Genre not found' });
      }
      next(error);
    }
  },

  // CSV一括インポート（FormData対応）
  async importCSV(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { unitId } = req.query;
      const file = req.file;

      if (!validateId(id)) {
        return res.status(400).json({ error: 'Invalid genre ID' });
      }

      if (unitId && typeof unitId !== 'string') {
        return res.status(400).json({ error: 'Invalid unit ID' });
      }

      if (!file) {
        return res.status(400).json({ error: 'CSV or Excel file is required' });
      }

      // ファイル形式に応じて処理
      let csvContent: string;

      // Excelファイルの場合、CSV形式に変換
      const isExcel =
        file.mimetype ===
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.toLowerCase().endsWith('.xlsx') ||
        file.originalname.toLowerCase().endsWith('.xls');

      if (isExcel) {
        try {
          csvContent = exportService.convertExcelToCSV(file.buffer);
        } catch (error) {
          return res.status(400).json({
            error: error instanceof Error ? error.message : 'Excel conversion failed',
          });
        }
      } else {
        // CSVファイルの場合、そのまま文字列として取得
        csvContent = file.buffer.toString('utf-8');
      }

      if (!csvContent || csvContent.trim().length === 0) {
        return res.status(400).json({ error: 'File is empty' });
      }

      const result = await exportService.importFromCSV(req.tenantId!, id, csvContent, unitId as string | undefined);

      if (result.errors.length > 0) {
        return res.status(207).json({
          success: true,
          message: 'Import completed with some errors',
          created: result.created,
          updated: result.updated,
          errors: result.errors,
        });
      }

      res.json({
        success: true,
        message: 'Import completed successfully',
        created: result.created,
        updated: result.updated,
        errors: [],
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Genre not found') {
        return res.status(404).json({ error: 'Genre not found' });
      }
      if (error instanceof Error && error.message.startsWith('CSV parse error')) {
        return res.status(400).json({ error: error.message });
      }
      if (error instanceof Error && error.message === 'Only CSV and Excel files are allowed') {
        return res.status(400).json({ error: 'Only CSV and Excel files are allowed' });
      }
      next(error);
    }
  },
};
