// ============================================================
// 階層型在庫管理システム - Expressサーバー
// ============================================================
// メインエントリーポイント
// ============================================================

import express from 'express';
import session from 'express-session';
import cors from 'cors';
import dotenv from 'dotenv';
import { Router } from 'express';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import { authController } from './controllers/authController';
import masterRoutes from './routes/master';
import { masterController } from './controllers/masterController';
import integrationRoutes from './routes/integration';
import categoryRoutes from './routes/category';
import genreRoutes from './routes/genre';
import unitRoutes from './routes/unit';
import partRoutes from './routes/part';
import statsRoutes from './routes/stats';
import searchRoutes from './routes/search';
import accountRoutes from './routes/account';
import imageRoutes from './routes/image';
import exportRoutes from './routes/export';
import diagramImageRoutes from './routes/diagramImage';
import systemSettingsRoutes from './routes/systemSettings';
import inventoryCountRoutes from './routes/inventoryCount';
import ownerRoutes from './routes/owner';
import exchangeRateRoutes from './routes/exchangeRate';

// 環境変数読み込み（backendディレクトリの.env.localから）
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 8763;

// ============================================================
// CORS設定
// ============================================================
const allowedOrigins = [
  'http://localhost:3589',
  'http://localhost:3590',
  'http://localhost:3591',
  'http://localhost:3592', // フロントエンド起動ポート
  // 在庫管理システムの本番フロント（Vercel: inventory-management-system プロジェクト）
  'https://inventory-management-system-two-swart.vercel.app',
  'https://inventory-management-system-tatsuyas-projects-20cab125.vercel.app',
  'https://inventory-management-system-git-main-tatsuyas-projects-20cab125.vercel.app',
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGIN,
].filter(Boolean) as string[];

console.log('✅ CORS許可オリジン:', allowedOrigins);

app.use(cors({
  origin: (origin, callback) => {
    // リクエストにoriginがない場合（同一オリジンなど）は許可
    if (!origin) return callback(null, true);

    // 許可リストにあれば許可
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// ============================================================
// JSON解析
// ============================================================
app.use(express.json());

// ============================================================
// セッション設定
// ============================================================
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-key',
  resave: false,
  saveUninitialized: true, // trueに変更（セッションCookie強制設定）
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7日間
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 本番環境ではクロスオリジンCookie必須
  },
}));

// ============================================================
// ルート登録（マルチテナント: /api/t/:slug 配下にネスト）
// ============================================================

// 運営者(master)ログイン — テナント非依存の別導線
app.post('/api/master/login', authController.loginMaster);

// 運営者(master)のテナント管理 — requireMaster保護（全テナント横断）
app.use('/api/master', masterRoutes);
app.use('/api/integration', integrationRoutes);

// ライセンスキー有効化 — 購入者用・無認証（テナント配下ではない）
app.post('/api/tenants/activate', masterController.activate);

// テナント配下ルーター（:slug は各子ルーターに mergeParams で伝播）
const tenantRouter = Router({ mergeParams: true });
tenantRouter.use('/auth', authRoutes);
tenantRouter.use('/', categoryRoutes);
tenantRouter.use('/', genreRoutes);
tenantRouter.use('/', unitRoutes);
tenantRouter.use('/', partRoutes);
tenantRouter.use('/', statsRoutes);
tenantRouter.use('/', searchRoutes);
tenantRouter.use('/admin/account', accountRoutes);
tenantRouter.use('/', imageRoutes);
tenantRouter.use('/', exportRoutes);
tenantRouter.use('/', diagramImageRoutes);
tenantRouter.use('/', systemSettingsRoutes);
tenantRouter.use('/', inventoryCountRoutes);
tenantRouter.use('/', ownerRoutes);
tenantRouter.use('/', exchangeRateRoutes);

app.use('/api/t/:slug', tenantRouter);

// ============================================================
// エラーハンドリング
// ============================================================
app.use(errorHandler);

// ============================================================
// サーバー起動
// ============================================================
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📂 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS origin: ${process.env.FRONTEND_URL || 'http://localhost:3589'}`);
});
