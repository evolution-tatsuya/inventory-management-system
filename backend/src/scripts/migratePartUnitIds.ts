// ============================================================
// パーツのunitId移行スクリプト
// ============================================================
// 既存パーツデータに正しいunitIdを設定する
// 実行方法: npx ts-node src/scripts/migratePartUnitIds.ts
// ============================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migratePartUnitIds() {
  console.log('🚀 パーツのunitId移行を開始します...\n');

  try {
    // unitIdがnullのパーツを取得
    const partsWithoutUnitId = await prisma.part.findMany({
      where: {
        unitId: null,
      },
      include: {
        genre: {
          include: {
            units: true,
          },
        },
      },
    });

    console.log(`📋 unitIdがnullのパーツ: ${partsWithoutUnitId.length}件\n`);

    if (partsWithoutUnitId.length === 0) {
      console.log('✅ すべてのパーツにunitIdが設定されています。');
      return;
    }

    let updatedCount = 0;
    let skippedCount = 0;

    for (const part of partsWithoutUnitId) {
      // 同じジャンル内のユニットを検索
      const units = part.genre.units;

      if (units.length === 0) {
        console.log(`⚠️  スキップ: パーツ "${part.partName}" (${part.id}) - ジャンル内にユニットが存在しません`);
        skippedCount++;
        continue;
      }

      // ユニットが1つしかない場合は自動的にそのユニットに割り当て
      if (units.length === 1) {
        await prisma.part.update({
          where: { id: part.id },
          data: { unitId: units[0].id },
        });
        console.log(`✅ 更新: パーツ "${part.partName}" → ユニット "${units[0].unitName}" (${units[0].unitNumber})`);
        updatedCount++;
        continue;
      }

      // ユニットが複数ある場合、unitNumber（個別番号）から推測
      // 例: unitNumber が "1-2-1" の場合、ユニット番号が "1-2" のユニットを探す
      const partUnitPrefix = part.unitNumber.split('-').slice(0, 2).join('-'); // "1-2-1" → "1-2"
      const matchedUnit = units.find((unit) => {
        // ユニット番号の先頭部分が一致するか確認
        return unit.unitNumber.startsWith(partUnitPrefix);
      });

      if (matchedUnit) {
        await prisma.part.update({
          where: { id: part.id },
          data: { unitId: matchedUnit.id },
        });
        console.log(`✅ 更新: パーツ "${part.partName}" (${part.unitNumber}) → ユニット "${matchedUnit.unitName}" (${matchedUnit.unitNumber})`);
        updatedCount++;
      } else {
        // マッチするユニットが見つからない場合、最初のユニットに割り当て
        await prisma.part.update({
          where: { id: part.id },
          data: { unitId: units[0].id },
        });
        console.log(`⚠️  デフォルト割り当て: パーツ "${part.partName}" (${part.unitNumber}) → ユニット "${units[0].unitName}" (${units[0].unitNumber})`);
        updatedCount++;
      }
    }

    console.log(`\n📊 移行結果:`);
    console.log(`   ✅ 更新成功: ${updatedCount}件`);
    console.log(`   ⚠️  スキップ: ${skippedCount}件`);
    console.log(`\n🎉 移行完了!`);
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// スクリプト実行
migratePartUnitIds()
  .then(() => {
    console.log('\n✅ スクリプトが正常に終了しました。');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ スクリプトが失敗しました:', error);
    process.exit(1);
  });
