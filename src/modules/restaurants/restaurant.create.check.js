const assert = require("assert");
const { createRestaurant } = require("./restaurant.service");

async function main() {
  const calls = [];
  const restaurant = await createRestaurant(
    {
      name: "Cantina",
      category: "Italiana",
      rating: 4,
      ownerEmail: "aluno@easyfood.com",
    },
    {
      prisma: {
        restaurant: {
          create: async ({ data }) => ({ id: 9, ...data }),
        },
      },
      notifications: {
        sendWelcomeEmail: async ({ to, restaurantName }) => {
          calls.push(["email", to, restaurantName]);
          throw new Error("smtp down");
        },
        registerActivity: ({ restaurantId, restaurantName }) => {
          calls.push(["activity", restaurantId, restaurantName]);
        },
        notifyCommercial: ({ restaurantId, restaurantName }) => {
          calls.push(["commercial", restaurantId, restaurantName]);
        },
      },
      logger: { error() {} },
    }
  );

  assert.strictEqual(restaurant.id, 9);
  assert.strictEqual(restaurant.name, "Cantina");
  assert.deepStrictEqual(calls, [
    ["email", "aluno@easyfood.com", "Cantina"],
    ["activity", 9, "Cantina"],
    ["commercial", 9, "Cantina"],
  ]);
  console.log("restaurant.create.check ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
