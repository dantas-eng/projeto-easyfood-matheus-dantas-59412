const assert = require("assert");

const servicePath = require.resolve("./restaurant.service");
let captured;
require.cache[servicePath] = {
  id: servicePath,
  filename: servicePath,
  loaded: true,
  exports: {
    createRestaurant: async (input) => {
      captured = input;
      return { id: 1, name: input.name, category: input.category, rating: 0 };
    },
  },
};

const { create } = require("./restaurant.controller");

function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

async function main() {
  const res = mockRes();
  await create(
    {
      body: { name: "Cantina", category: "Italiana" },
      user: { id: 1, email: "aluno@easyfood.com" },
    },
    res
  );
  assert.strictEqual(res.statusCode, 201);
  assert.strictEqual(res.body.name, "Cantina");
  assert.strictEqual(captured.ownerEmail, "aluno@easyfood.com");
  assert.strictEqual(captured.category, "Italiana");
  console.log("restaurant.controller.check ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
