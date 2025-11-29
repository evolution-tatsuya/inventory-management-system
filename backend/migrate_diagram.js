const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function main() {
  console.log('===== 展開図データ移行開始 =====');
  
  // 1. 既存の展開図データを取得
  const diagrams = await prisma.$queryRaw`SELECT * FROM diagram_images`;
  console.log('既存の展開図データ:', diagrams);
  
  // 2. 各genreに属するunitを取得し、最初のunitに展開図を移行
  for (const diagram of diagrams) {
    const units = await prisma.unit.findMany({
      where: { genreId: diagram.genreId },
      orderBy: { sortOrder: 'asc' },
      take: 1, // 最初のユニットのみ
    });
    
    if (units.length > 0) {
      console.log(`Genre ${diagram.genreId} の展開図を Unit ${units[0].id} に移行`);
      console.log(`- Unit Number: ${units[0].unitNumber}`);
      console.log(`- Unit Name: ${units[0].unitName}`);
    } else {
      console.log(`Warning: Genre ${diagram.genreId} にユニットが存在しません`);
    }
  }
  
  console.log('===== 移行プラン確認完了 =====');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
