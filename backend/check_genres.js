const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function main() {
  const genres = await prisma.genre.findMany({
    where: {
      OR: [
        { name: { contains: 'ENG' } },
        { name: { contains: 'OIL' } },
      ]
    },
    select: {
      id: true,
      genreId: true,
      name: true,
      categoryId: true,
    },
    orderBy: {
      name: 'asc'
    }
  });

  console.log('ENGとOIL PAN関連ジャンル:');
  console.log(JSON.stringify(genres, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
