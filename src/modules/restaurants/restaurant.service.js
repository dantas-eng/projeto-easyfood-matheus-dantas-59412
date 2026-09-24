const prisma = require("../../database/prisma");
const notifications = require("../notifications/notifications");

async function listRestaurants() {
  return prisma.restaurant.findMany({ orderBy: { id: "asc" } });
}

async function createRestaurant(
  { name, category, rating, ownerEmail },
  deps = {}
) {
  const db = deps.prisma || prisma;
  const notify = deps.notifications || notifications;
  const logger = deps.logger || console;

  const restaurant = await db.restaurant.create({
    data: {
      name,
      category,
      rating: rating === undefined || rating === null ? 0 : Number(rating),
    },
  });

  try {
    await notify.sendWelcomeEmail({ to: ownerEmail, restaurantName: restaurant.name });
  } catch (error) {
    logger.error(error.message);
  }

  try {
    notify.registerActivity({
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
    });
  } catch (error) {
    logger.error(error.message);
  }

  try {
    notify.notifyCommercial({
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
    });
  } catch (error) {
    logger.error(error.message);
  }

  return restaurant;
}

module.exports = { listRestaurants, createRestaurant };
