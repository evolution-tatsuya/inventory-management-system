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
    select: {
      id: true,
      genreId: true,
      name: true,
    },
    orderBy: {
      name: 'asc'
    }
  });

  console.log('全ジャンル:');
  genres.forEach(g => {
    console.log(`${g.name} (ID: ${g.id}, genreId: ${g.genreId})`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
