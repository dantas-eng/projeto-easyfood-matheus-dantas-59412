const prisma = require("../../database/prisma");
const imageService = require("../shared/image.service");

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parseId(value, label) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw httpError(400, `${label} inválido`);
  }
  return id;
}

function validateDish(data = {}) {
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const description =
    typeof data.description === "string" ? data.description.trim() : "";
  const price = Number(data.price);

  if (!name || !description) {
    throw httpError(400, "Nome e descrição são obrigatórios");
  }
  if (data.price === undefined || data.price === null || data.price === "" ||
      !Number.isFinite(price) || price <= 0 || price >= 100000000) {
    throw httpError(400, "Preço deve ser um número maior que zero");
  }

  return { name, description, price };
}

async function createDish(restaurantId, data, deps = {}) {
  const db = deps.prisma || prisma;
  const id = parseId(restaurantId, "ID do restaurante");
  const dishData = validateDish(data);

  const restaurant = await db.restaurant.findUnique({ where: { id } });

  if (!restaurant) {
    throw httpError(404, "Restaurante não encontrado");
  }

  return db.dish.create({
    data: { ...dishData, restaurantId: id },
  });
}

async function listDishes(restaurantId, deps = {}) {
  const db = deps.prisma || prisma;
  return db.dish.findMany({
    where: { restaurantId: parseId(restaurantId, "ID do restaurante") },
    orderBy: { id: "asc" },
  });
}

async function uploadDishImage(dishId, buffer, deps = {}) {
  const db = deps.prisma || prisma;
  const images = deps.imageService || imageService;
  const id = parseId(dishId, "ID do prato");

  const dish = await db.dish.findUnique({ where: { id } });

  if (!dish) {
    throw httpError(404, "Prato não encontrado");
  }

  let imageUrl;
  try {
    imageUrl = await images.optimizeImage(buffer);
  } catch (error) {
    // O Sharp não conseguiu decodificar: o arquivo não é uma imagem válida.
    // O prato continua cadastrado e o envio pode ser repetido.
    throw httpError(400, "Arquivo enviado não é uma imagem válida");
  }

  return db.dish.update({ where: { id }, data: { imageUrl } });
}

module.exports = { createDish, listDishes, uploadDishImage };
