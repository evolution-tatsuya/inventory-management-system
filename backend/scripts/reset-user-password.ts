// ============================================================
// ユーザーパスワードリセットスクリプト
// ============================================================
// 一般ユーザーのメールアドレスとパスワードを確認・リセット
// ============================================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('📋 現在の一般ユーザー一覧:');

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  users.forEach((user, index) => {
    console.log(`${index + 1}. ID: ${user.id}`);
    console.log(`   メール: ${user.email}`);
    console.log(`   名前: ${user.name}`);
    console.log('');
  });

  if (users.length === 0) {
    console.log('❌ 一般ユーザーが見つかりません');
    return;
  }

  // 最初のユーザーのパスワードをリセット
  const user = users[0];
  const newPassword = 'TestUser2025!';
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  console.log('✅ パスワードをリセットしました:');
  console.log(`   メール: ${user.email}`);
  console.log(`   パスワード: ${newPassword}`);
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
