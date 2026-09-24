const assert = require("assert");
const {
  MAILERSEND_URL,
  buildWelcomeEmail,
  sendWelcomeEmail,
  registerActivity,
  notifyCommercial,
} = require("./notifications");

const from = "remetente-verificado@seudominio.com";
const body = buildWelcomeEmail({
  to: "aluno@easyfood.com",
  restaurantName: 'A&B <Cantina> "Roma"',
  from,
});

assert.strictEqual(MAILERSEND_URL, "https://api.mailersend.com/v1/email");
assert.deepStrictEqual(body.from, { email: from, name: "EasyFood" });
assert.deepStrictEqual(body.to, [{ email: "aluno@easyfood.com" }]);
assert.deepStrictEqual(body.reply_to, { email: from, name: "EasyFood" });
assert.strictEqual(body.subject, "Restaurante cadastrado na EasyFood");
assert.strictEqual(
  body.text,
  'O restaurante A&B <Cantina> "Roma" foi cadastrado na EasyFood.'
);
assert.strictEqual(
  body.html,
  "<p>O restaurante <strong>A&amp;B &lt;Cantina&gt; &quot;Roma&quot;</strong> foi cadastrado na EasyFood.</p>"
);
assert.ok(!body.html.includes("<Cantina>"));

async function main() {
  let called = false;
  const logs = [];
  const logger = {
    error(message) {
      logs.push(String(message));
    },
    log() {},
  };

  await sendWelcomeEmail({
    to: "aluno@easyfood.com",
    restaurantName: "Cantina",
    env: {},
    fetchImpl: async () => {
      called = true;
    },
    logger,
  });
  assert.strictEqual(called, false);
  assert.ok(logs.some((line) => line.includes("API_KEY") && line.includes("ausente")));

  const apiKey = "secret-key-do-not-log";
  const leaked = `${"x".repeat(50)}${apiKey}${"y".repeat(600)}`;
  await sendWelcomeEmail({
    to: "aluno@easyfood.com",
    restaurantName: "Cantina",
    env: { API_KEY: apiKey, MAIL_FROM: from },
    fetchImpl: async (url, options) => {
      assert.strictEqual(url, MAILERSEND_URL);
      assert.strictEqual(options.method, "POST");
      assert.strictEqual(options.headers.Authorization, `Bearer ${apiKey}`);
      assert.strictEqual(options.headers["Content-Type"], "application/json");
      const sent = JSON.parse(options.body);
      assert.strictEqual(sent.subject, "Restaurante cadastrado na EasyFood");
      return { ok: false, status: 422, text: async () => leaked };
    },
    logger,
  });

  const errorLine = logs[logs.length - 1];
  assert.ok(errorLine.includes("422"));
  assert.ok(!errorLine.includes(apiKey));
  assert.ok(errorLine.length <= "MailerSend respondeu 422: ".length + 500);

  const lines = [];
  const originalLog = console.log;
  console.log = (message) => lines.push(message);
  try {
    registerActivity({ restaurantId: 3, restaurantName: "Cantina" });
    notifyCommercial({ restaurantId: 3, restaurantName: "Cantina" });
  } finally {
    console.log = originalLog;
  }
  assert.deepStrictEqual(lines, [
    "Atividade: restaurante 3 (Cantina) cadastrado.",
    "Comercial: restaurante 3 (Cantina) cadastrado.",
  ]);

  console.log("notifications.check ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
