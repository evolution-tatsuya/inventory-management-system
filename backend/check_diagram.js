const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function main() {
  const diagrams = await prisma.diagramImage.findMany({
    include: {
      genre: {
        select: {
          id: true,
          genreId: true,
          name: true,
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log('展開図一覧:');
  console.log(JSON.stringify(diagrams, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
