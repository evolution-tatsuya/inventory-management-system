import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 管理者アカウント作成開始...');

  // 管理者アカウントを作成
  const hashedPassword = await bcrypt.hash('InventoryAdmin2025!', 10);
  
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@inventory-system.local' },
    update: {
      password: hashedPassword,
    },
    create: {
      email: 'admin@inventory-system.local',
      password: hashedPassword,
      name: '管理者',
    },
  });

  console.log('✅ 管理者アカウント作成完了:', admin.email);
  console.log('📧 Email: admin@inventory-system.local');
  console.log('🔑 Password: InventoryAdmin2025!');
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
