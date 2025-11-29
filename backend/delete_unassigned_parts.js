const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // unitIdがnullのパーツを削除
  const result = await prisma.part.deleteMany({
    where: {
      unitId: null,
    },
  });

  console.log(`✅ ${result.count}件のユニット未割り当てパーツを削除しました`);
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
