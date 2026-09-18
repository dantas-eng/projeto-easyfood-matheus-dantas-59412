const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const INITIAL_RESTAURANTS = [
  { name: "Pizzaria Napoli", category: "Pizza", rating: 4.5 },
  { name: "Burger House", category: "Burger", rating: 4.2 },
  { name: "Sushi Express", category: "Japonesa", rating: 4.8 },
];

async function main() {
  let inserted = 0;

  for (const restaurant of INITIAL_RESTAURANTS) {
    const exists = await prisma.restaurant.findFirst({
      where: { name: restaurant.name },
    });
    if (exists) continue;

    await prisma.restaurant.create({ data: restaurant });
    inserted += 1;
  }

  if (inserted === 0) {
    console.log("Seed concluído: restaurantes iniciais já existem.");
    return;
  }

  console.log(`Dados inseridos com sucesso! (${inserted} restaurante(s) novo(s))`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
