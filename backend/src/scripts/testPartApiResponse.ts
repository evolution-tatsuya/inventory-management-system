// ============================================================
// パーツAPI レスポンステスト
// ============================================================
// 実際のAPI応答を確認してunitデータが含まれているかチェック
// ============================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testPartApiResponse() {
  console.log('🔍 パーツAPI レスポンスを確認します...\n');

  try {
    // TRANSMISSIONジャンルを取得
    const transmissionGenre = await prisma.genre.findFirst({
      where: { name: 'TRANSMISSION' },
    });

    if (!transmissionGenre) {
      console.log('❌ TRANSMISSIONジャンルが見つかりません');
      return;
    }

    console.log(`✅ ジャンルID: ${transmissionGenre.id}\n`);

    // 実際のAPIと同じデータを取得（partService.getByGenreと同じロジック）
    const parts = await prisma.part.findMany({
      where: { genreId: transmissionGenre.id },
      orderBy: [{ unitNumber: 'asc' }, { sortOrder: 'asc' }],
      include: {
        partMaster: {
          select: { stockQuantity: true },
        },
        genre: true,
        unit: {
          select: { id: true, unitNumber: true, unitName: true },
        },
      },
    });

    console.log(`📊 取得されたパーツ数: ${parts.length}件\n`);

    // 最初の5件を詳しく表示
    console.log('📋 最初の5件の詳細:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    parts.slice(0, 5).forEach((part, idx) => {
      console.log(`${idx + 1}. パーツ名: ${part.partName}`);
      console.log(`   品番: ${part.partNumber}`);
      console.log(`   ユニット個別番号: ${part.unitNumber}`);
      console.log(`   unitId: ${part.unitId}`);
      console.log(`   unitデータ:`, part.unit);
      console.log(`   ユニット番号: ${part.unit?.unitNumber || 'N/A'}`);
      console.log('');
    });

    // JSONレスポンスのシミュレーション
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📤 API レスポンス（最初の2件）:\n');
    console.log(JSON.stringify(parts.slice(0, 2), null, 2));

    console.log('\n✅ テスト完了!');
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// スクリプト実行
testPartApiResponse()
  .then(() => {
    console.log('\n✅ スクリプトが正常に終了しました。');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ スクリプトが失敗しました:', error);
    process.exit(1);
  });
