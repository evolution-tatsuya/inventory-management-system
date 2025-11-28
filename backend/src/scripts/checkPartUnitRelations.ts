// ============================================================
// パーツとユニットの関連確認スクリプト
// ============================================================
// 最近追加されたパーツのunitId設定状況を詳しく確認
// ============================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPartUnitRelations() {
  console.log('🔍 パーツとユニットの関連を詳しく確認します...\n');

  try {
    // 全パーツを取得（最新10件）
    const allParts = await prisma.part.findMany({
      include: {
        unit: true,
        genre: {
          include: {
            units: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });

    console.log(`📋 最新20件のパーツ:\n`);

    for (const part of allParts) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`パーツID: ${part.id}`);
      console.log(`パーツ名: ${part.partName}`);
      console.log(`品番: ${part.partNumber}`);
      console.log(`ユニット個別番号: ${part.unitNumber}`);
      console.log(`作成日時: ${part.createdAt.toISOString()}`);
      console.log(`---`);
      console.log(`ジャンルID: ${part.genreId}`);
      console.log(`ジャンル名: ${part.genre?.name || 'N/A'}`);
      console.log(`---`);
      console.log(`unitID: ${part.unitId || '❌ NULL'}`);
      console.log(`ユニット名: ${part.unit?.unitName || '❌ 未設定'}`);
      console.log(`ユニット番号: ${part.unit?.unitNumber || '❌ 未設定'}`);
      console.log(`---`);
      console.log(`このジャンル内のユニット一覧 (${part.genre?.units.length || 0}件):`);
      part.genre?.units.forEach((u, idx) => {
        console.log(`  ${idx + 1}. ID: ${u.id}, 番号: ${u.unitNumber}, 名前: ${u.unitName}`);
      });
      console.log('');
    }

    // unitIdがnullのパーツを確認
    const partsWithoutUnitId = await prisma.part.findMany({
      where: {
        unitId: null,
      },
      include: {
        genre: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`❌ unitIdがnullのパーツ: ${partsWithoutUnitId.length}件\n`);

    if (partsWithoutUnitId.length > 0) {
      partsWithoutUnitId.forEach((p) => {
        console.log(`  - ${p.partName} (${p.partNumber}) | ユニット個別番号: ${p.unitNumber} | ジャンル: ${p.genre?.name}`);
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
checkPartUnitRelations()
  .then(() => {
    console.log('\n✅ スクリプトが正常に終了しました。');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ スクリプトが失敗しました:', error);
    process.exit(1);
  });
