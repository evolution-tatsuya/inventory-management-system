// ============================================================
// 階層型在庫管理システム - 検索ルート
// ============================================================
// 検索エンドポイント定義（認証不要）
// ============================================================

import { Router } from 'express';
import { searchController } from '../controllers/searchController';

const router = Router();

// ============================================================
// 検索エンドポイント（認証不要）
// ============================================================
// 収納ケース番号検索（全ジャンル横断）
router.get('/search/by-storage-case', searchController.searchByStorageCase);

// 品番検索（全ジャンル横断）
router.get('/search/by-part-number', searchController.searchByPartNumber);

export default router;
