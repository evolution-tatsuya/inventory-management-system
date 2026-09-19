// ABA-FK2 エンジン系ジャンルの日本語名を英語名にリネームする。
// - ジャンル名(name)のみ更新。ユニット・部品・展開図・並び順は一切変更しない。
// - 英語名は元サイト(parts-honda.uk)のENGINEセクション用語に寄せつつ、機能別の粒度を維持。
// - 冪等: 既に英語名になっているものはスキップ。対象カテゴリーは ABA-FK2 のみ。
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 現行(日本語) -> 英語
const RENAME: Record<string, string> = {
  'エミッション制御': 'EMISSION CONTROL',
  '補機ベルト・テンショナー': 'BELT & AUTO TENSIONER',
  'オルタネーター': 'ALTERNATOR',
  'ブローバイ・ブリーザー': 'BREATHER PIPE',
  'カムシャフト・チェーン': 'CAMSHAFT / CAM CHAIN',
  '点火系': 'IGNITION COIL',
  '吸気・スロットル': 'THROTTLE BODY / INTAKE MANIFOLD',
  'ペダル（クラッチ・ブレーキ）': 'CLUTCH PEDAL / BRAKE PEDAL',
  'クランクシャフト・ピストン': 'CRANKSHAFT / PISTON',
  'シリンダーブロック・オイルパン': 'CYLINDER BLOCK / OIL PAN',
  'シリンダーヘッド': 'CYLINDER HEAD',
  'エンジンカバー': 'ENGINE COVER',
  'エンジンハーネス': 'WIRE HARNESS',
  '燃料系': 'FUEL INJECTOR',
  'ガスケットキット': 'GASKET KIT',
  '冷却系（ウォーターポンプ）': 'WATER PUMP / THERMOSTAT',
  '潤滑系（オイルポンプ）': 'OIL PUMP',
  'バルブタイミング・油圧': 'SPOOL VALVE / OIL PRESSURE SENSOR',
  'スターターモーター': 'STARTER MOTOR',
  'トルクコンバーター': 'TORQUE CONVERTER',
  'ターボチャージャー': 'TURBOCHARGER',
};

async function main() {
  const category = await prisma.category.findFirst({ where: { name: 'ABA-FK2' } });
  if (!category) throw new Error('カテゴリー ABA-FK2 が見つかりません');

  const genres = await prisma.genre.findMany({ where: { categoryId: category.id } });
  let renamed = 0, skipped = 0;

  for (const [ja, en] of Object.entries(RENAME)) {
    const g = genres.find((x) => x.name === ja);
    if (!g) {
      // 既に英語化済み or 存在しない
      const alreadyEn = genres.find((x) => x.name === en);
      console.log(alreadyEn ? `  スキップ(英語済): ${en}` : `  未検出: ${ja}`);
      skipped++;
      continue;
    }
    // 衝突チェック
    const clash = genres.find((x) => x.name === en && x.id !== g.id);
    if (clash) {
      console.log(`  ⚠ 衝突のためスキップ: ${ja} -> ${en}（既存の同名ジャンルあり）`);
      skipped++;
      continue;
    }
    await prisma.genre.update({ where: { id: g.id }, data: { name: en } });
    console.log(`  ✓ ${ja} -> ${en}`);
    renamed++;
  }

  console.log(`\n✅ リネーム完了: ${renamed}件 / スキップ${skipped}件`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
