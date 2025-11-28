// ============================================================
// パーツ表示問題デバッグスクリプト
// ============================================================
// 一般ページとパーツ管理ページでの表示の違いを確認
// ============================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugPartsVisibility() {
  console.log('🔍 パーツ表示問題をデバッグします...\n');

  try {
    // 全パーツ数
    const allParts = await prisma.part.findMany({
      include: {
        genre: {
          include: {
            category: true,
          },
        },
        unit: true,
        partMaster: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`📊 全パーツ数: ${allParts.length}件\n`);

    // ジャンルごとにグループ化
    const partsByGenre = allParts.reduce((acc: any, part) => {
      const genreName = part.genre?.name || 'Unknown';
      if (!acc[genreName]) {
        acc[genreName] = [];
      }
      acc[genreName].push(part);
      return acc;
    }, {});

    console.log('📋 ジャンル別パーツ数:');
    Object.keys(partsByGenre).forEach((genreName) => {
      console.log(`  ${genreName}: ${partsByGenre[genreName].length}件`);
    });
    console.log('');

    // unitIdがnullのパーツ
    const partsWithoutUnit = allParts.filter((p) => !p.unitId);
    console.log(`❌ unitIdがnullのパーツ: ${partsWithoutUnit.length}件`);
    if (partsWithoutUnit.length > 0) {
      partsWithoutUnit.forEach((p) => {
        console.log(`  - ${p.partName} (${p.partNumber}) | ジャンル: ${p.genre?.name}`);
      });
    }
    console.log('');

    // unitIdがあるパーツ
    const partsWithUnit = allParts.filter((p) => p.unitId);
    console.log(`✅ unitIdがあるパーツ: ${partsWithUnit.length}件`);
    console.log('');

    // TRANSMISSIONジャンルのパーツ詳細
    const transmissionParts = allParts.filter((p) => p.genre?.name === 'TRANSMISSION');
    console.log(`🔧 TRANSMISSIONジャンルのパーツ (${transmissionParts.length}件):`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    transmissionParts.forEach((part, idx) => {
      console.log(`${idx + 1}. ${part.partName}`);
      console.log(`   品番: ${part.partNumber}`);
      console.log(`   ユニット個別番号: ${part.unitNumber}`);
      console.log(`   unitId: ${part.unitId || '❌ NULL'}`);
      console.log(`   ユニット名: ${part.unit?.unitName || '❌ 未設定'} (${part.unit?.unitNumber || 'N/A'})`);
      console.log(`   カテゴリー: ${part.genre?.category?.name || 'N/A'}`);
      console.log('');
    });

    console.log('✅ デバッグ完了!');
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// スクリプト実行
debugPartsVisibility()
  .then(() => {
    console.log('\n✅ スクリプトが正常に終了しました。');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ スクリプトが失敗しました:', error);
    process.exit(1);
  });
