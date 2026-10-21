const assert = require("assert");
const { createDish, listDishes, uploadDishImage } = require("./dish.service");

const restaurants = { 1: { id: 1, name: "Cantina" } };
const dishes = { 5: { id: 5, name: "Pizza", restaurantId: 1, imageUrl: null } };
const fakePrisma = {
  restaurant: { findUnique: async ({ where }) => restaurants[where.id] || null },
  dish: {
    create: async ({ data }) => ({ id: 6, imageUrl: null, ...data }),
    findMany: async ({ where }) =>
      Object.values(dishes).filter((d) => d.restaurantId === where.restaurantId),
    findUnique: async ({ where }) => dishes[where.id] || null,
    update: async ({ where, data }) => ({ ...dishes[where.id], ...data }),
  },
};
const deps = { prisma: fakePrisma };
const valid = { name: " Margherita ", description: "Tomate e queijo", price: "49.90" };

async function rejects(promise, status) {
  await assert.rejects(promise, (error) => error.statusCode === status);
}

async function main() {
  const dish = await createDish("1", valid, deps);
  assert.strictEqual(dish.name, "Margherita");
  assert.strictEqual(dish.price, 49.9);
  assert.strictEqual(dish.restaurantId, 1);

  await rejects(createDish("99", valid, deps), 404);
  await rejects(createDish("abc", valid, deps), 400);
  await rejects(createDish("1", { ...valid, name: "" }, deps), 400);
  await rejects(createDish("1", { ...valid, price: -1 }, deps), 400);
  await rejects(createDish("1", { ...valid, price: undefined }, deps), 400);

  assert.strictEqual((await listDishes("1", deps)).length, 1);
  await rejects(listDishes("x", deps), 400);

  const ok = await uploadDishImage("5", Buffer.from("x"), {
    ...deps,
    imageService: { optimizeImage: async () => "/uploads/dishes/a.webp" },
  });
  assert.strictEqual(ok.imageUrl, "/uploads/dishes/a.webp");

  await rejects(uploadDishImage("404", Buffer.from("x"), deps), 404);
  await rejects(
    uploadDishImage("5", Buffer.from("x"), {
      ...deps,
      imageService: { optimizeImage: async () => { throw new Error("bad"); } },
    }),
    400
  );

  console.log("dish.check ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
