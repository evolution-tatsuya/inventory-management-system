// 通貨換算機能の動作確認用の最小テストデータ（開発DB専用）
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 管理者
  const hashed = await bcrypt.hash('InventoryAdmin2025!', 10);
  await prisma.admin.upsert({
    where: { email: 'admin@inventory-system.local' },
    update: { password: hashed },
    create: { email: 'admin@inventory-system.local', password: hashed, name: 'Admin' },
  });

  // カテゴリー ABA-FK2
  let category = await prisma.category.findFirst({ where: { name: 'ABA-FK2' } });
  if (!category) {
    category = await prisma.category.create({ data: { name: 'ABA-FK2', subtitle: 'Civic Type R', order: 0 } });
  }

  // ジャンル ENGINE
  let genre = await prisma.genre.findFirst({ where: { categoryId: category.id, name: 'ENGINE' } });
  if (!genre) {
    genre = await prisma.genre.create({ data: { categoryId: category.id, name: 'ENGINE', order: 0 } });
  }

  // ユニット THROTTLE BODY
  const unit = await prisma.unit.upsert({
    where: { genreId_unitNumber: { genreId: genre.id, unitNumber: 'E1' } },
    update: {},
    create: { genreId: genre.id, unitNumber: 'E1', unitName: 'THROTTLE BODY' },
  });

  // 在庫マスター（categoryId付き）
  const ensureMaster = async (partNumber: string) => {
    await prisma.partMaster.upsert({
      where: { categoryId_partNumber: { categoryId: category!.id, partNumber } },
      update: {},
      create: { categoryId: category!.id, partNumber, stockQuantity: 3 },
    });
  };

  // EURパーツ（円換算対象）
  await ensureMaster('16400-RPY-G01');
  await prisma.part.create({
    data: {
      genreId: genre.id,
      unitId: unit.id,
      unitNumber: '1',
      partNumber: '16400-RPY-G01',
      partName: '電子制御スロットルボディ (THROTTLE BODY ASSY.)',
      quantity: 1,
      currency: 'EUR',
      originalPrice: 371.57,
      sortOrder: 0,
    },
  });

  // JPYパーツ（換算不要）
  await ensureMaster('99999-JPY-001');
  await prisma.part.create({
    data: {
      genreId: genre.id,
      unitId: unit.id,
      unitNumber: '2',
      partNumber: '99999-JPY-001',
      partName: '国内価格パーツ（テスト）',
      quantity: 2,
      currency: 'JPY',
      price: 12800,
      sortOrder: 1,
    },
  });

  console.log('✅ 通貨テストデータ投入完了');
  console.log(`   category=${category.id} genre=${genre.id} unit=${unit.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
