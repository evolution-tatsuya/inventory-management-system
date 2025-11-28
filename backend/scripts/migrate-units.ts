// ============================================================
// データ移行スクリプト: Part → Unit
// ============================================================
// partNumber = unitNumber のPartレコードを新しいUnitテーブルに移行
// ============================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateUnits() {
  try {
    console.log('🚀 ユニットデータ移行開始...');

    // すべてのPartを取得
    const allParts = await prisma.part.findMany({
      orderBy: [{ genreId: 'asc' }, { unitNumber: 'asc' }],
    });

    console.log(`📊 全パーツ数: ${allParts.length}件`);

    // genreId + unitNumber の組み合わせでグループ化
    const unitMap = new Map<string, any>();

    allParts.forEach((part) => {
      const key = `${part.genreId}-${part.unitNumber}`;
      if (!unitMap.has(key)) {
        unitMap.set(key, {
          genreId: part.genreId,
          unitNumber: part.unitNumber,
          unitName: `${part.unitNumber}`, // unitNumberをunitNameとして使用
          imageUrl: part.imageUrl,
          cropPositionX: part.cropPositionX ?? 0.5,
          cropPositionY: part.cropPositionY ?? 0.5,
          createdAt: part.createdAt,
          updatedAt: part.updatedAt,
        });
      }
    });

    const uniqueUnits = Array.from(unitMap.values());
    console.log(`📊 移行対象: ${uniqueUnits.length}件のユニット`);

    let successCount = 0;
    let skipCount = 0;

    for (const unitData of uniqueUnits) {
      try {
        // Unitテーブルに既存チェック
        const existingUnit = await prisma.unit.findUnique({
          where: {
            genreId_unitNumber: {
              genreId: unitData.genreId,
              unitNumber: unitData.unitNumber,
            },
          },
        });

        if (existingUnit) {
          console.log(`⏭️  スキップ: ${unitData.unitNumber} (既存)`);
          skipCount++;
          continue;
        }

        // Unitレコードを作成
        await prisma.unit.create({
          data: {
            genreId: unitData.genreId,
            unitNumber: unitData.unitNumber,
            unitName: unitData.unitName,
            imageUrl: unitData.imageUrl,
            cropPositionX: unitData.cropPositionX,
            cropPositionY: unitData.cropPositionY,
            partsCount: 0, // あとでカウント
            createdAt: unitData.createdAt,
            updatedAt: unitData.updatedAt,
          },
        });

        console.log(`✅ 移行完了: ${unitData.unitNumber} → Unit`);
        successCount++;
      } catch (error) {
        console.error(`❌ エラー: ${unitData.unitNumber}`, error);
      }
    }

    // 各Unitのパーツ数をカウント
    console.log('\n📊 パーツ数カウント中...');
    const units = await prisma.unit.findMany();
    for (const unit of units) {
      const partsCount = await prisma.part.count({
        where: {
          genreId: unit.genreId,
          unitNumber: unit.unitNumber,
        },
      });

      await prisma.unit.update({
        where: { id: unit.id },
        data: { partsCount },
      });

      console.log(`  ${unit.unitNumber}: ${partsCount}個のパーツ`);
    }

    console.log(`\n✅ 移行完了: ${successCount}件成功, ${skipCount}件スキップ`);
  } catch (error) {
    console.error('❌ 移行エラー:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateUnits();
