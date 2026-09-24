const MAILERSEND_URL = "https://api.mailersend.com/v1/email";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildWelcomeEmail({ to, restaurantName, from }) {
  const name = String(restaurantName);
  return {
    from: { email: from, name: "EasyFood" },
    to: [{ email: to }],
    reply_to: { email: from, name: "EasyFood" },
    subject: "Restaurante cadastrado na EasyFood",
    text: `O restaurante ${name} foi cadastrado na EasyFood.`,
    html: `<p>O restaurante <strong>${escapeHtml(name)}</strong> foi cadastrado na EasyFood.</p>`,
  };
}

async function sendWelcomeEmail({
  to,
  restaurantName,
  env = process.env,
  fetchImpl = fetch,
  logger = console,
}) {
  const apiKey = env.API_KEY;
  const from = env.MAIL_FROM;
  const missing = [];
  if (!apiKey) missing.push("API_KEY");
  if (!from) missing.push("MAIL_FROM");
  if (missing.length > 0) {
    logger.error(`MailerSend: ${missing.join(" e ")} ausente`);
    return;
  }

  const response = await fetchImpl(MAILERSEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildWelcomeEmail({ to, restaurantName, from })),
  });

  if (!response.ok) {
    const raw = await response.text();
    const safe = raw.replaceAll(apiKey, "[redacted]").slice(0, 500);
    logger.error(`MailerSend respondeu ${response.status}: ${safe}`);
  }
}

function registerActivity({ restaurantId, restaurantName }) {
  console.log(`Atividade: restaurante ${restaurantId} (${restaurantName}) cadastrado.`);
}

function notifyCommercial({ restaurantId, restaurantName }) {
  console.log(`Comercial: restaurante ${restaurantId} (${restaurantName}) cadastrado.`);
}

module.exports = {
  MAILERSEND_URL,
  buildWelcomeEmail,
  sendWelcomeEmail,
  registerActivity,
  notifyCommercial,
};
