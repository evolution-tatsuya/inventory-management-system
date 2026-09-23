// ============================================================
// 階層型在庫管理システム - 検索ルート
// ============================================================
// 検索エンドポイント定義（認証不要）
// ============================================================

import { Router } from 'express';
import { searchController } from '../controllers/searchController';
import { publicTenant } from '../middleware/tenantContext';
import { requireFeature } from '../middleware/requireFeature';

const router = Router({ mergeParams: true });

// ============================================================
// 検索エンドポイント（認証不要）＋プラン機能フラグ
// ============================================================
// 収納ケース番号検索（全ジャンル横断）
router.get(
  '/search/by-storage-case',
  publicTenant,
  requireFeature('search'),
  searchController.searchByStorageCase,
);

// 品番検索（全ジャンル横断）
router.get(
  '/search/by-part-number',
  publicTenant,
  requireFeature('search'),
  searchController.searchByPartNumber,
);

export default router;
