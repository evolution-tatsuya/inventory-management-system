// ============================================================
// Unit Controller
// ============================================================
// ユニット管理のビジネスロジック
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 全ユニット一覧取得（管理画面用）
 *
 * Unitテーブルから直接取得
 */
export async function getAllUnits(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const units = await prisma.unit.findMany({
      orderBy: [{ genreId: 'asc' }, { createdAt: 'asc' }],
      include: {
        genre: {
          select: { id: true, name: true },
        },
      },
    });

    // レスポンス形式を整形
    const formattedUnits = units.map((unit) => ({
      id: unit.id,
      genreId: unit.genreId,
      genreName: unit.genre.name,
      unitNumber: unit.unitNumber,
      unitName: unit.unitName,
      imageUrl: unit.imageUrl,
      cropPositionX: unit.cropPositionX ?? 0.5,
      cropPositionY: unit.cropPositionY ?? 0.5,
      partsCount: unit.partsCount,
      createdAt: unit.createdAt,
      updatedAt: unit.updatedAt,
    }));

    res.json(formattedUnits);
  } catch (error) {
    next(error);
  }
}

/**
 * ユニット一覧取得
 *
 * genreIdに基づいてUnitテーブルから取得
 */
export async function getUnits(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { genreId } = req.params;

    if (!genreId) {
      res.status(400).json({ error: 'genreId is required' });
      return;
    }

    const units = await prisma.unit.findMany({
      where: { genreId },
      orderBy: [{ createdAt: 'asc' }],
    });

    res.json(units);
  } catch (error) {
    next(error);
  }
}

/**
 * ユニット作成
 */
export async function createUnit(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { genreId, unitNumber, unitName, imageUrl, cropPositionX, cropPositionY } = req.body;

    if (!genreId || !unitNumber || !unitName) {
      res.status(400).json({ error: 'genreId, unitNumber, and unitName are required' });
      return;
    }

    // Unitテーブルに作成
    const unit = await prisma.unit.create({
      data: {
        genreId,
        unitNumber,
        unitName,
        imageUrl: imageUrl || null,
        cropPositionX: cropPositionX ?? 0.5,
        cropPositionY: cropPositionY ?? 0.5,
        partsCount: 0,
      },
    });

    res.status(201).json(unit);
  } catch (error) {
    next(error);
  }
}

/**
 * ユニット更新
 */
export async function updateUnit(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const { unitNumber, unitName, imageUrl, cropPositionX, cropPositionY } = req.body;

    if (!id) {
      res.status(400).json({ error: 'id is required' });
      return;
    }

    // Unitテーブルを更新
    const unit = await prisma.unit.update({
      where: { id },
      data: {
        unitNumber,
        unitName,
        imageUrl: imageUrl || null,
        cropPositionX: cropPositionX ?? 0.5,
        cropPositionY: cropPositionY ?? 0.5,
      },
    });

    res.json(unit);
  } catch (error) {
    next(error);
  }
}

/**
 * ユニット削除
 */
export async function deleteUnit(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'id is required' });
      return;
    }

    // Unitテーブルから削除
    await prisma.unit.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * ユニット並び順更新
 */
export async function updateOrder(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds)) {
      res.status(400).json({ error: 'orderedIds must be an array' });
      return;
    }

    // トランザクションで一括更新
    await prisma.$transaction(
      orderedIds.map((id: string, index: number) =>
        prisma.unit.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}
