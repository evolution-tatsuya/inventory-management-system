import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

// 環境変数読み込み
dotenv.config({ path: '../.env.local' });

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@inventory-system.local';
  const passwordPlain = 'Admin2025Pass';
  
  // パスワードをハッシュ化
  const hashedPassword = await bcrypt.hash(passwordPlain, 10);
  
  // 既存の管理者を削除（あれば）
  await prisma.admin.deleteMany({
    where: { email }
  });
  
  // 新しい管理者を作成
  const admin = await prisma.admin.create({
    data: {
      email,
      password: hashedPassword,
    }
  });
  
  console.log('✅ 管理者アカウント作成完了');
  console.log('📧 Email:', email);
  console.log('🔑 Password:', passwordPlain);
  console.log('🆔 ID:', admin.id);
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
