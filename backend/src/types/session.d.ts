// ============================================================
// 階層型在庫管理システム - Session型定義拡張
// ============================================================
// express-sessionのSessionData型を拡張
// ============================================================

import 'express-session';

declare module 'express-session' {
  interface SessionData {
    adminId: string;
  }
}
