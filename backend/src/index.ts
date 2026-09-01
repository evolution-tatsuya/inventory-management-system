// ============================================================
// 階層型在庫管理システム - Expressサーバー
// ============================================================
// メインエントリーポイント
// ============================================================

import express from 'express';
import session from 'express-session';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
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
  'https://frontend-tatsuyas-projects-20cab125.vercel.app', // Vercel本番URL
  process.env.FRONTEND_URL,
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
// ルート登録
// ============================================================
app.use('/api/auth', authRoutes);
app.use('/api', categoryRoutes);
app.use('/api', genreRoutes);
app.use('/api', unitRoutes);
app.use('/api', partRoutes);
app.use('/api', statsRoutes);
app.use('/api', searchRoutes);
app.use('/api/admin/account', accountRoutes);
app.use('/api', imageRoutes);
app.use('/api', exportRoutes);
app.use('/api', diagramImageRoutes);
app.use('/api', systemSettingsRoutes);

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
