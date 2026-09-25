// ============================================================
// requireSnapshotKey: 日次使用量スナップショット専用の認証
// ============================================================
// EC連携キー(INTEGRATION_API_KEY)とは別系統の、スナップショット専用シークレット
// （x-snapshot-key ヘッダ）で認証する。値は env SNAPSHOT_API_KEY。
// GitHub Actions の日次ジョブからのみ呼ばれる想定。
// タイミング安全な比較で照合し、未設定時は全拒否（安全側）。
// ============================================================

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export const requireSnapshotKey = (req: Request, res: Response, next: NextFunction) => {
  const configured = process.env.SNAPSHOT_API_KEY;
  if (!configured) {
    return res.status(503).json({ error: 'Snapshot API is not configured' });
  }
  const provided = req.header('x-snapshot-key') || '';
  if (!provided || !safeEqual(provided, configured)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};
