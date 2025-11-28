import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 一般ユーザーアカウント作成開始...');

  // テスト用の一般ユーザーを作成
  const hashedPassword = await bcrypt.hash('UserTest2025!', 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'user-test-2@inventory-system.local' },
    update: {
      password: hashedPassword,
    },
    create: {
      email: 'user-test-2@inventory-system.local',
      password: hashedPassword,
      name: 'テストユーザー',
    },
  });

  console.log('✅ 一般ユーザーアカウント作成完了:', user.email);
  console.log('📧 Email: user-test-2@inventory-system.local');
  console.log('🔑 Password: UserTest2025!');
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
