// ============================================================
// DiagramImage Controller
// ============================================================
// 展開図のリクエストハンドラー
// ============================================================

import { Request, Response } from 'express';
import { diagramImageService } from '../services/diagramImageService';

/**
 * ユニットの展開図を取得
 * GET /api/units/:unitId/diagram
 */
export async function getDiagramImage(req: Request, res: Response) {
  try {
    const { unitId } = req.params;

    if (!unitId) {
      return res.status(400).json({ error: 'unitId is required' });
    }

    const diagramImage = await diagramImageService.getDiagramImageByUnitId(unitId);

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
 * PUT /api/admin/units/:unitId/diagram
 */
export async function upsertDiagramImage(req: Request, res: Response) {
  try {
    const { unitId } = req.params;
    const { imageUrl } = req.body;

    if (!unitId) {
      return res.status(400).json({ error: 'unitId is required' });
    }

    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl is required' });
    }

    const diagramImage = await diagramImageService.upsertDiagramImage(unitId, imageUrl);

    res.status(200).json(diagramImage);
  } catch (error: any) {
    console.error('[upsertDiagramImage] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to upsert diagram image' });
  }
}

/**
 * 展開図を削除
 * DELETE /api/admin/units/:unitId/diagram
 */
export async function deleteDiagramImage(req: Request, res: Response) {
  try {
    const { unitId } = req.params;

    if (!unitId) {
      return res.status(400).json({ error: 'unitId is required' });
    }

    await diagramImageService.deleteDiagramImage(unitId);

    res.status(204).send();
  } catch (error: any) {
    console.error('[deleteDiagramImage] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete diagram image' });
  }
}
