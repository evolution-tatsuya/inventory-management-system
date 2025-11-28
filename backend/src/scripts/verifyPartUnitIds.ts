// ============================================================
// パーツのunitId確認スクリプト
// ============================================================
// 既存パーツデータのunitIdが正しく設定されているか確認
// 実行方法: npx ts-node src/scripts/verifyPartUnitIds.ts
// ============================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyPartUnitIds() {
  console.log('🔍 パーツのunitId設定状況を確認します...\n');

  try {
    // 全パーツ取得
    const allParts = await prisma.part.findMany({
      include: {
        unit: true,
        genre: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    console.log(`📋 全パーツ数: ${allParts.length}件\n`);

    // unitIdがnullのパーツ
    const partsWithoutUnitId = allParts.filter((p) => !p.unitId);
    console.log(`❌ unitIdがnull: ${partsWithoutUnitId.length}件`);

    // unitIdが設定されているパーツ
    const partsWithUnitId = allParts.filter((p) => p.unitId);
    console.log(`✅ unitIdが設定済み: ${partsWithUnitId.length}件\n`);

    if (partsWithUnitId.length > 0) {
      console.log('📊 最初の10件のパーツ:');
      console.log('---');
      partsWithUnitId.slice(0, 10).forEach((part) => {
        console.log(`  ID: ${part.id}`);
        console.log(`  パーツ名: ${part.partName}`);
        console.log(`  ユニット個別番号: ${part.unitNumber}`);
        console.log(`  ユニットID: ${part.unitId}`);
        console.log(`  ユニット名: ${part.unit?.unitName || 'N/A'}`);
        console.log(`  ユニット番号: ${part.unit?.unitNumber || 'N/A'}`);
        console.log(`  ジャンル: ${part.genre?.name || 'N/A'}`);
        console.log('---');
      });
    }

    console.log('\n✅ 確認完了!');
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// スクリプト実行
verifyPartUnitIds()
  .then(() => {
    console.log('\n✅ スクリプトが正常に終了しました。');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ スクリプトが失敗しました:', error);
    process.exit(1);
  });
