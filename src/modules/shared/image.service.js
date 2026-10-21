const sharp = require("sharp");
const path = require("path");
const fs = require("fs/promises");
const crypto = require("crypto");

async function optimizeImage(buffer) {
  const filename = `${crypto.randomUUID()}.webp`;

  const directory = path.resolve(process.cwd(), "uploads", "dishes");

  await fs.mkdir(directory, { recursive: true });

  const filePath = path.join(directory, filename);

  await sharp(buffer)
    .rotate()
    .resize({ width: 800, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(filePath);

  return `/uploads/dishes/${filename}`;
}

module.exports = { optimizeImage };
