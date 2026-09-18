require("dotenv").config();

const app = require("./src/app");
const prisma = require("./src/database/prisma");

const PORT = 3000;

async function start() {
  try {
    await prisma.$connect();
    app.listen(PORT, () => {
      console.log("EasyFood rodando na porta 3000");
      console.log("Banco: PostgreSQL + Prisma");
    });
  } catch (error) {
    console.error("Falha ao conectar:", error.message);
    console.error("Rode: ./scripts/setup-linux-postgres.sh");
    console.error("Depois: npx prisma migrate dev --name criar-tabela-restaurants");
    process.exit(1);
  }
}

start();
