// ============================================================
// DiagramImage Controller
// ============================================================
// 展開図のリクエストハンドラー（1ユニット最大10枚対応）
// ============================================================

import { Request, Response } from 'express';
import { diagramImageService } from '../services/diagramImageService';

// ============================================================
// 複数枚対応
// ============================================================

/**
 * ユニットの展開図を全件取得
 * GET /api/units/:unitId/diagrams
 */
export async function listDiagramImages(req: Request, res: Response) {
  try {
    const { unitId } = req.params;
    if (!unitId) {
      return res.status(400).json({ error: 'unitId is required' });
    }
    const diagrams = await diagramImageService.listDiagramImages(unitId);
    res.status(200).json(diagrams);
  } catch (error: any) {
    console.error('[listDiagramImages] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to list diagram images' });
  }
}

/**
 * 展開図を1枚追加
 * POST /api/admin/units/:unitId/diagrams
 */
export async function addDiagramImage(req: Request, res: Response) {
  try {
    const { unitId } = req.params;
    const { imageUrl } = req.body;
    if (!unitId) {
      return res.status(400).json({ error: 'unitId is required' });
    }
    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl is required' });
    }
    const diagram = await diagramImageService.addDiagramImage(unitId, imageUrl);
    res.status(201).json(diagram);
  } catch (error: any) {
    console.error('[addDiagramImage] Error:', error);
    // 上限超過はクライアントエラーとして返す
    const status = /最大/.test(error.message || '') ? 400 : 500;
    res.status(status).json({ error: error.message || 'Failed to add diagram image' });
  }
}

/**
 * 展開図を1枚更新（画像差し替え）
 * PUT /api/admin/diagrams/:id
 */
export async function updateDiagramImageById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body;
    if (!id) {
      return res.status(400).json({ error: 'id is required' });
    }
    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl is required' });
    }
    const diagram = await diagramImageService.updateDiagramImage(id, imageUrl);
    res.status(200).json(diagram);
  } catch (error: any) {
    console.error('[updateDiagramImageById] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to update diagram image' });
  }
}

/**
 * 展開図を1枚削除（IDで指定）
 * DELETE /api/admin/diagrams/:id
 */
export async function deleteDiagramImageById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'id is required' });
    }
    await diagramImageService.deleteDiagramImageById(id);
    res.status(204).send();
  } catch (error: any) {
    console.error('[deleteDiagramImageById] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete diagram image' });
  }
}

/**
 * メイン展開図を設定
 * PUT /api/admin/units/:unitId/diagrams/main
 * body: { id }
 */
export async function setMainDiagramImage(req: Request, res: Response) {
  try {
    const { unitId } = req.params;
    const { id } = req.body;
    if (!unitId || !id) {
      return res.status(400).json({ error: 'unitId and id are required' });
    }
    const diagrams = await diagramImageService.setMainDiagramImage(unitId, id);
    res.status(200).json(diagrams);
  } catch (error: any) {
    console.error('[setMainDiagramImage] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to set main diagram image' });
  }
}

/**
 * 展開図の並び順を一括更新
 * PUT /api/admin/units/:unitId/diagrams/order
 * body: { orderedIds: string[] }
 */
export async function reorderDiagramImages(req: Request, res: Response) {
  try {
    const { unitId } = req.params;
    const { orderedIds } = req.body;
    if (!unitId || !Array.isArray(orderedIds)) {
      return res.status(400).json({ error: 'unitId and orderedIds are required' });
    }
    const diagrams = await diagramImageService.reorderDiagramImages(unitId, orderedIds);
    res.status(200).json(diagrams);
  } catch (error: any) {
    console.error('[reorderDiagramImages] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to reorder diagram images' });
  }
}

// ============================================================
// 後方互換（単数：メイン1枚）
// ============================================================

/**
 * ユニットの展開図を取得（メイン1枚）
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
 * 展開図を作成または更新（後方互換：メイン1枚差し替え）
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
 * 展開図を削除（後方互換：メイン1枚）
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
