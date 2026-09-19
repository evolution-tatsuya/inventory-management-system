// ============================================================
// JWT ユーティリティ（一元化）
// ============================================================
// JWT_SECRET と sign/verify を1箇所へ集約。
// 従来 authController / requireAuth / accountController / index.ts に
// JWT_SECRET が重複していたのを解消する。
//
// マルチテナント化(S2)により payload に tenantId / role を追加。
// ============================================================
import jwt from 'jsonwebtoken';

// 本番で SESSION_SECRET 未設定のまま起動すると、fallback キーで署名され
// トークン偽造のリスクがあるため起動を停止する。
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  throw new Error(
    'SESSION_SECRET is required in production (JWT signing key). 起動を中止します。',
  );
}

const JWT_SECRET = process.env.SESSION_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = '7d'; // 7日間有効

// JWT ペイロード（S2でtenantId/roleを追加）
export interface JwtPayload {
  userId: string;
  email: string;
  userType: 'admin' | 'user';
  tenantId: string; // 所属テナント（masterは選択中/URLのテナント）
  role: 'master' | 'admin' | 'user'; // master=運営者(全テナント横断)
}

// トークン発行
export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// トークン検証（失敗時は例外）
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
