const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function main() {
  const units = await prisma.unit.findMany({
    where: {
      genreId: 'cmiiy4wul0004147zn933rjst' // ENG genre
    },
    select: {
      id: true,
      unitNumber: true,
      unitName: true,
      genre: {
        select: {
          name: true,
          genreId: true,
        }
      }
    },
    orderBy: {
      unitNumber: 'asc'
    }
  });

  console.log('ENGジャンルのユニット:');
  console.log(JSON.stringify(units, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
