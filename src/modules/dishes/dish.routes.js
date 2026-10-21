const express = require("express");
const dishController = require("./dish.controller");
const authenticate = require("../auth/auth.middleware");
const upload = require("../shared/upload.middleware");

const router = express.Router();

router.get("/restaurants/:restaurantId/dishes", dishController.list);

router.post(
  "/restaurants/:restaurantId/dishes",
  authenticate,
  dishController.create
);

// A autenticação vem antes do upload, para não processar arquivo de quem não tem token.
router.post(
  "/dishes/:dishId/image",
  authenticate,
  upload.singleImage,
  dishController.uploadImage
);

module.exports = router;
