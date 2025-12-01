// ============================================================
// 階層型在庫管理システム - エクスポートコントローラー
// ============================================================
// エクスポート関連のHTTPリクエスト処理
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { exportService } from '../services/exportService';
import { validateId } from '../utils/validators';

// ============================================================
// エクスポートコントローラー
// ============================================================
export const exportController = {
  // CSVエクスポート
  async exportCSV(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!validateId(id)) {
        return res.status(400).json({ error: 'Invalid genre ID' });
      }

      const csvContent = await exportService.exportToCSV(id);

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

      const pdfStream = await exportService.exportToPDF(id, unitId as string | undefined);

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

  // CSV一括インポート
  async importCSV(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { csvContent } = req.body;

      if (!validateId(id)) {
        return res.status(400).json({ error: 'Invalid genre ID' });
      }

      if (!csvContent || typeof csvContent !== 'string') {
        return res.status(400).json({ error: 'CSV content is required' });
      }

      const result = await exportService.importFromCSV(id, csvContent);

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
      next(error);
    }
  },
};
