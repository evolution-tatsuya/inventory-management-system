// ============================================================
// 階層型在庫管理システム - シードデータ
// ============================================================
// 開発環境用のテストデータを投入
// 実行: npm run db:seed または ts-node prisma/seed.ts
// ============================================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 シードデータ投入開始...');

  // ============================================================
  // 管理者アカウント作成
  // ============================================================
  const hashedPassword = await bcrypt.hash('InventoryAdmin2025!', 10);
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@inventory-system.local' },
    update: {},
    create: {
      email: 'admin@inventory-system.local',
      password: hashedPassword,
    },
  });
  console.log('✅ 管理者アカウント作成完了:', admin.email);

  // ============================================================
  // カテゴリー作成
  // ============================================================
  const category1 = await prisma.category.upsert({
    where: { name: 'GT3-048' },
    update: {},
    create: {
      name: 'GT3-048',
      order: 1,
    },
  });

  const category2 = await prisma.category.upsert({
    where: { name: 'GT3-049' },
    update: {},
    create: {
      name: 'GT3-049',
      order: 2,
    },
  });

  console.log('✅ カテゴリー作成完了:', category1.name, category2.name);

  // ============================================================
  // ジャンル作成
  // ============================================================
  const genre1 = await prisma.genre.create({
    data: {
      name: 'ENG ASSY',
      categoryId: category1.id,
      order: 1,
    },
  });

  const genre2 = await prisma.genre.create({
    data: {
      name: 'TRANSMISSION',
      categoryId: category1.id,
      order: 2,
    },
  });

  const genre3 = await prisma.genre.create({
    data: {
      name: 'SUSPENSION',
      categoryId: category2.id,
      order: 1,
    },
  });

  console.log('✅ ジャンル作成完了:', genre1.name, genre2.name, genre3.name);

  // ============================================================
  // PartMaster作成（品番ごとの在庫マスター）
  // ============================================================
  const partMasters = [];
  for (let i = 1; i <= 50; i++) {
    const partNumber = `PART-${String(i).padStart(3, '0')}`;
    const partMaster = await prisma.partMaster.upsert({
      where: { partNumber },
      update: {},
      create: {
        partNumber,
        stockQuantity: Math.floor(Math.random() * 100),
      },
    });
    partMasters.push(partMaster);
  }
  console.log('✅ PartMaster作成完了: 50件');

  // ============================================================
  // Parts作成（ENG ASSYジャンル）
  // ============================================================
  for (let i = 1; i <= 20; i++) {
    await prisma.part.create({
      data: {
        genreId: genre1.id,
        unitNumber: String(i),
        partNumber: `PART-${String(i).padStart(3, '0')}`,
        partName: `Engine Part ${i}`,
        storageCase: `BOX-${String(Math.floor((i - 1) / 5) + 1).padStart(2, '0')}`,
      },
    });
  }
  console.log('✅ Parts作成完了 (ENG ASSY): 20件');

  // ============================================================
  // Parts作成（TRANSMISSIONジャンル）
  // ============================================================
  for (let i = 21; i <= 35; i++) {
    await prisma.part.create({
      data: {
        genreId: genre2.id,
        unitNumber: String(i - 20),
        partNumber: `PART-${String(i).padStart(3, '0')}`,
        partName: `Transmission Part ${i - 20}`,
        storageCase: `BOX-${String(Math.floor((i - 21) / 5) + 5).padStart(2, '0')}`,
      },
    });
  }
  console.log('✅ Parts作成完了 (TRANSMISSION): 15件');

  // ============================================================
  // Parts作成（SUSPENSIONジャンル）
  // ============================================================
  for (let i = 36; i <= 50; i++) {
    await prisma.part.create({
      data: {
        genreId: genre3.id,
        unitNumber: String(i - 35),
        partNumber: `PART-${String(i).padStart(3, '0')}`,
        partName: `Suspension Part ${i - 35}`,
        storageCase: `BOX-${String(Math.floor((i - 36) / 5) + 8).padStart(2, '0')}`,
      },
    });
  }
  console.log('✅ Parts作成完了 (SUSPENSION): 15件');

  console.log('🎉 シードデータ投入完了！');
}

main()
  .catch((e) => {
    console.error('❌ シードデータ投入エラー:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
