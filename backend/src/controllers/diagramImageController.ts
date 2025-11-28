// ============================================================
// DiagramImage Controller
// ============================================================
// 展開図のリクエストハンドラー
// ============================================================

import { Request, Response } from 'express';
import { diagramImageService } from '../services/diagramImageService';

/**
 * ジャンルの展開図を取得
 * GET /api/genres/:genreId/diagram
 */
export async function getDiagramImage(req: Request, res: Response) {
  try {
    const { genreId } = req.params;

    if (!genreId) {
      return res.status(400).json({ error: 'genreId is required' });
    }

    const diagramImage = await diagramImageService.getDiagramImageByGenreId(genreId);

    if (!diagramImage) {
      return res.status(404).json({ error: 'Diagram image not found' });
    }

    res.status(200).json(diagramImage);
  } catch (error: any) {
    console.error('[getDiagramImage] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to get diagram image' });
  }
}

/**
 * 展開図を作成または更新
 * PUT /api/admin/genres/:genreId/diagram
 */
export async function upsertDiagramImage(req: Request, res: Response) {
  try {
    const { genreId } = req.params;
    const { imageUrl } = req.body;

    if (!genreId) {
      return res.status(400).json({ error: 'genreId is required' });
    }

    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl is required' });
    }

    const diagramImage = await diagramImageService.upsertDiagramImage(genreId, imageUrl);

    res.status(200).json(diagramImage);
  } catch (error: any) {
    console.error('[upsertDiagramImage] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to upsert diagram image' });
  }
}

/**
 * 展開図を削除
 * DELETE /api/admin/genres/:genreId/diagram
 */
export async function deleteDiagramImage(req: Request, res: Response) {
  try {
    const { genreId } = req.params;

    if (!genreId) {
      return res.status(400).json({ error: 'genreId is required' });
    }

    await diagramImageService.deleteDiagramImage(genreId);

    res.status(204).send();
  } catch (error: any) {
    console.error('[deleteDiagramImage] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete diagram image' });
  }
}
