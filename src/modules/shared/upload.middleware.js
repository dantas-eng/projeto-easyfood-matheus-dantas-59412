const multer = require("multer");

const upload = multer({
  storage: multer.memoryStorage(),

  limits: { fileSize: 5 * 1024 * 1024 },

  fileFilter: (req, file, callback) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.mimetype)) {
      return callback(new Error("Formato de imagem não permitido"));
    }

    callback(null, true);
  },
});

// Converte as falhas do Multer em respostas HTTP, sem derrubar a aplicação.
function singleImage(req, res, next) {
  upload.single("image")(req, res, (error) => {
    if (!error) return next();

    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "Imagem maior que o limite de 5 MB" });
    }

    return res.status(400).json({ error: error.message });
  });
}

upload.singleImage = singleImage;

module.exports = upload;
