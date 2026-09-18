const authService = require("./auth.service");

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function register(req, res) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Nome, email e senha são obrigatórios" });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Email inválido" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Senha deve ter no mínimo 6 caracteres" });
  }

  try {
    const user = await authService.registerUser({ name, email, password });
    res.status(201).json(user);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    console.error("Erro ao cadastrar usuário:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email e senha são obrigatórios" });
  }

  try {
    const result = await authService.loginUser({ email, password });
    res.json(result);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    console.error("Erro ao autenticar usuário:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

module.exports = { register, login };
