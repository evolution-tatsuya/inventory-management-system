const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // PART-001のパーツを探す
  const part = await prisma.part.findFirst({
    where: { partNumber: 'PART-001' },
    include: {
      genre: {
        include: {
          category: true,
        },
      },
      unit: true,
    },
  });

  if (part) {
    console.log('=== パーツ情報 ===');
    console.log('品番:', part.partNumber);
    console.log('品名:', part.partName);
    console.log('ユニット個別番号:', part.unitNumber);
    console.log('');
    console.log('=== カテゴリー情報 ===');
    console.log('カテゴリー名:', part.genre.category.name);
    console.log('カテゴリーコード:', part.genre.category.categoryId || '(なし)');
    console.log('');
    console.log('=== ジャンル情報 ===');
    console.log('ジャンル名:', part.genre.name);
    console.log('ジャンルコード:', part.genre.genreId || '(なし)');
    console.log('');
    if (part.unit) {
      console.log('=== ユニット情報 ===');
      console.log('ユニット番号:', part.unit.unitNumber);
      console.log('ユニット名:', part.unit.unitName);
    } else {
      console.log('⚠️ ユニット情報なし（unitId が null）');
    }
    
    console.log('\n=== 一般ページでの辿り方 ===');
    const categoryName = part.genre.category.categoryId ? 
      `${part.genre.category.categoryId} - ${part.genre.category.name}` : 
      part.genre.category.name;
    console.log(`1. カテゴリー選択: "${categoryName}"`);
    console.log(`2. ジャンル選択: "${part.genre.genreId || part.genre.name}"`);
    if (part.unit) {
      console.log(`3. ユニット選択: "${part.unit.unitNumber}" (${part.unit.unitName})`);
    }
  } else {
    console.log('パーツが見つかりません');
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
