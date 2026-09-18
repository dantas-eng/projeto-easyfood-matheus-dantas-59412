const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../../database/prisma");

const SALT_ROUNDS = 10;
const TOKEN_EXPIRES_IN = "1d";

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw createHttpError("JWT_SECRET não configurado no servidor", 500);
  }
  return secret;
}

async function registerUser({ name, email, password }) {
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
    };
  } catch (error) {
    if (error.code === "P2002") {
      throw createHttpError("Email já cadastrado", 409);
    }
    throw error;
  }
}

async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw createHttpError("Email ou senha inválidos", 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.password);

  if (!passwordMatches) {
    throw createHttpError("Email ou senha inválidos", 401);
  }

  const token = jwt.sign(
    { sub: user.id, email: user.email },
    getJwtSecret(),
    { expiresIn: TOKEN_EXPIRES_IN }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  };
}

module.exports = { registerUser, loginUser };
