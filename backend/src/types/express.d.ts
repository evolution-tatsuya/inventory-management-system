// ============================================================
// Express Request 型拡張（マルチテナント）
// ============================================================
// requireAuth / publicTenant ミドルウェアが確立する tenantId と
// 認証ペイロードを Request に持たせる。
// ============================================================

import 'express';
import type { JwtPayload } from '../lib/jwt';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      auth?: JwtPayload;
    }
  }
}
