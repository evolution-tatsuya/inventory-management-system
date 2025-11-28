// ============================================================
// 階層型在庫管理システム - エラーハンドリングミドルウェア
// ============================================================
// Expressアプリケーション全体のエラー処理を一元管理
// ============================================================

import { Request, Response, NextFunction } from 'express';

// ============================================================
// カスタムエラークラス
// ============================================================
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// ============================================================
// エラーハンドリングミドルウェア
// ============================================================
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('🔴 エラー発生:', err);

  const isDevelopment = process.env.NODE_ENV === 'development';

  // AppErrorの場合
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      stack: isDevelopment ? err.stack : undefined,
    });
  }

  // Prismaエラーの場合
  if (err.name === 'PrismaClientKnownRequestError') {
    return res.status(400).json({
      error: 'データベースエラーが発生しました',
      stack: isDevelopment ? err.stack : undefined,
    });
  }

  // バリデーションエラーの場合
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: err.message,
      stack: isDevelopment ? err.stack : undefined,
    });
  }

  // その他のエラー（500 Internal Server Error）
  res.status(500).json({
    error: isDevelopment ? err.message : 'Internal Server Error',
    stack: isDevelopment ? err.stack : undefined,
  });
};

// ============================================================
// 非同期エラーハンドリングヘルパー
// ============================================================
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
