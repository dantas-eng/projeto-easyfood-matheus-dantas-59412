# E-mail de boas-vindas no cadastro de restaurante — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Depois de gravar um restaurante, enviar e-mail de boas-vindas pelo MailerSend ao usuário logado, registrar a atividade e avisar o comercial, sem derrubar o `201`.

**Architecture:** Um módulo CommonJS chama a API do MailerSend com `fetch`. O service de restaurante grava no Prisma e então chama as três funções, cada uma no próprio `try/catch`. O controller só repassa `req.user.email`.

**Tech Stack:** Node.js 18 (fetch nativo), Express 5, CommonJS. Sem pacote `mailersend`.

## Global Constraints

- Envio: `POST https://api.mailersend.com/v1/email`
- Projeto CommonJS (`require`). Cliente HTTP: `fetch` do Node 18. Pacote `mailersend` fica de fora.
- Destinatário: `req.user.email`. O model `Restaurant` não ganha campo de e-mail.
- `from.name` = `EasyFood`
- `subject` = `Restaurante cadastrado na EasyFood`
- `text` = `O restaurante {nome} foi cadastrado na EasyFood.`
- `html` = `<p>O restaurante <strong>{nome}</strong> foi cadastrado na EasyFood.</p>`, com `{nome}` escapado (`&`, `<`, `>`, `"`)
- `reply_to` = o mesmo remetente (`MAIL_FROM`, nome `EasyFood`)
- Header `Authorization: Bearer <API_KEY>` e `Content-Type: application/json`
- Se `API_KEY` ou `MAIL_FROM` estiver ausente, registrar o motivo no log e retornar sem chamar a API.
- Resposta fora de 2xx: logar o status e no máximo os primeiros 500 caracteres do corpo. A chave da API nunca é logada.
- `registerActivity` escreve `Atividade: restaurante {id} ({nome}) cadastrado.`
- `notifyCommercial` escreve `Comercial: restaurante {id} ({nome}) cadastrado.`
- Ordem: gravar o restaurante, depois e-mail, atividade e comercial. Cada chamada tem o próprio `try/catch`. Falha depois do Prisma não altera o `201` e não apaga o restaurante.
- `GET /restaurants`, validação de `name`/`category`, `401` sem token e `500` se o banco falhar continuam iguais.
- `.env.example` ganha `API_KEY="cole-a-chave-do-mailersend"` e `MAIL_FROM="remetente-verificado@seudominio.com"`.
- Fora: evento, fila, coluna de e-mail, rollback do cadastro, interface web nova.

---

## File structure

- Create: `src/modules/notifications/notifications.js` — escape, corpo do e-mail, `sendWelcomeEmail`, `registerActivity`, `notifyCommercial`.
- Create: `src/modules/notifications/notifications.check.js` — confere o módulo sem rede.
- Modify: `src/modules/restaurants/restaurant.service.js` — grava e chama as três funções.
- Create: `src/modules/restaurants/restaurant.create.check.js` — confere a ordem e o isolamento das falhas sem banco.
- Modify: `src/modules/restaurants/restaurant.controller.js` — repassa `req.user.email`.
- Create: `src/modules/restaurants/restaurant.controller.check.js` — confere que o controller envia `ownerEmail`.
- Modify: `.env.example` — documenta `API_KEY` e `MAIL_FROM`.

### Task 1: Módulo de notificação

**Files:**
- Create: `src/modules/notifications/notifications.js`
- Test: `src/modules/notifications/notifications.check.js`

**Interfaces:**
- Consumes: nada do restante da EasyFood.
- Produces:
  - `MAILERSEND_URL` = `"https://api.mailersend.com/v1/email"`
  - `buildWelcomeEmail({ to, restaurantName, from })` → objeto JSON do corpo
  - `sendWelcomeEmail({ to, restaurantName, env, fetchImpl, logger })` → `Promise<void>`. `env`, `fetchImpl` e `logger` são opcionais e valem `process.env`, `fetch` e `console`.
  - `registerActivity({ restaurantId, restaurantName })` → `void`, escreve no `console.log`
  - `notifyCommercial({ restaurantId, restaurantName })` → `void`, escreve no `console.log`

- [ ] **Step 1: Write the failing check**

Create `src/modules/notifications/notifications.check.js`:

```js
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
```

- [ ] **Step 2: Run the check to verify it fails**

Run: `node src/modules/notifications/notifications.check.js`

Expected: FAIL with `Cannot find module './notifications'`

- [ ] **Step 3: Write the module**

Create `src/modules/notifications/notifications.js`:

```js
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
```

- [ ] **Step 4: Run the check to verify it passes**

Run: `node src/modules/notifications/notifications.check.js`

Expected: `notifications.check ok` and exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/modules/notifications/notifications.js src/modules/notifications/notifications.check.js
git commit -m "$(cat <<'EOF'
Adiciona o envio de boas-vindas pelo MailerSend.

EOF
)"
```

### Task 2: Ligar o cadastro de restaurante

**Files:**
- Modify: `src/modules/restaurants/restaurant.service.js`
- Modify: `src/modules/restaurants/restaurant.controller.js`
- Modify: `.env.example`
- Test: `src/modules/restaurants/restaurant.create.check.js`
- Test: `src/modules/restaurants/restaurant.controller.check.js`

**Interfaces:**
- Consumes: `sendWelcomeEmail({ to, restaurantName })`, `registerActivity({ restaurantId, restaurantName })`, `notifyCommercial({ restaurantId, restaurantName })` de `src/modules/notifications/notifications.js`.
- Produces: `createRestaurant({ name, category, rating, ownerEmail }, deps)` → restaurante criado. `deps` é opcional. Sem `deps`, usa o Prisma e o módulo de notificação reais. `create(req, res)` passa `ownerEmail: req.user.email`.

- [ ] **Step 1: Write the failing service check**

Create `src/modules/restaurants/restaurant.create.check.js`:

```js
const assert = require("assert");
const { createRestaurant } = require("./restaurant.service");

async function main() {
  const calls = [];
  const restaurant = await createRestaurant(
    {
      name: "Cantina",
      category: "Italiana",
      rating: 4,
      ownerEmail: "aluno@easyfood.com",
    },
    {
      prisma: {
        restaurant: {
          create: async ({ data }) => ({ id: 9, ...data }),
        },
      },
      notifications: {
        sendWelcomeEmail: async ({ to, restaurantName }) => {
          calls.push(["email", to, restaurantName]);
          throw new Error("smtp down");
        },
        registerActivity: ({ restaurantId, restaurantName }) => {
          calls.push(["activity", restaurantId, restaurantName]);
        },
        notifyCommercial: ({ restaurantId, restaurantName }) => {
          calls.push(["commercial", restaurantId, restaurantName]);
        },
      },
      logger: { error() {} },
    }
  );

  assert.strictEqual(restaurant.id, 9);
  assert.strictEqual(restaurant.name, "Cantina");
  assert.deepStrictEqual(calls, [
    ["email", "aluno@easyfood.com", "Cantina"],
    ["activity", 9, "Cantina"],
    ["commercial", 9, "Cantina"],
  ]);
  console.log("restaurant.create.check ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 2: Run the service check to verify it fails**

Run: `node src/modules/restaurants/restaurant.create.check.js`

Expected: FAIL. O service ainda ignora `deps` e chama o Prisma de verdade. Com o banco no ar, a asserção de `calls` falha (`[]` contra as três chamadas). Com o banco fora, o Prisma lança antes da asserção. Os dois resultados são falha. Não trate erro de conexão como teste passando.

- [ ] **Step 3: Write the failing controller check**

Create `src/modules/restaurants/restaurant.controller.check.js`:

```js
const assert = require("assert");

const servicePath = require.resolve("./restaurant.service");
let captured;
require.cache[servicePath] = {
  id: servicePath,
  filename: servicePath,
  loaded: true,
  exports: {
    createRestaurant: async (input) => {
      captured = input;
      return { id: 1, name: input.name, category: input.category, rating: 0 };
    },
  },
};

const { create } = require("./restaurant.controller");

function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

async function main() {
  const res = mockRes();
  await create(
    {
      body: { name: "Cantina", category: "Italiana" },
      user: { id: 1, email: "aluno@easyfood.com" },
    },
    res
  );
  assert.strictEqual(res.statusCode, 201);
  assert.strictEqual(res.body.name, "Cantina");
  assert.strictEqual(captured.ownerEmail, "aluno@easyfood.com");
  assert.strictEqual(captured.category, "Italiana");
  console.log("restaurant.controller.check ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 4: Run the controller check to verify it fails**

Run: `node src/modules/restaurants/restaurant.controller.check.js`

Expected: FAIL with `captured.ownerEmail` `undefined`.

- [ ] **Step 5: Update the service**

Replace `src/modules/restaurants/restaurant.service.js` with:

```js
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
```

- [ ] **Step 6: Update the controller**

In `create`, pass the token email. The call becomes:

```js
    const restaurant = await restaurantService.createRestaurant({
      name,
      category,
      rating,
      ownerEmail: req.user.email,
    });
```

Leave `list`, the `name`/`category` validation, and the `500` catch as they are.

- [ ] **Step 7: Document the env vars**

Append to `.env.example`:

```
API_KEY="cole-a-chave-do-mailersend"
MAIL_FROM="remetente-verificado@seudominio.com"
```

- [ ] **Step 8: Run the checks**

Run:

```bash
node src/modules/restaurants/restaurant.create.check.js
node src/modules/restaurants/restaurant.controller.check.js
node src/modules/notifications/notifications.check.js
```

Expected: each prints its `ok` line and exits 0.

- [ ] **Step 9: Commit**

```bash
git add src/modules/restaurants/restaurant.service.js src/modules/restaurants/restaurant.controller.js src/modules/restaurants/restaurant.create.check.js src/modules/restaurants/restaurant.controller.check.js .env.example
git commit -m "$(cat <<'EOF'
Dispara e-mail, atividade e comercial ao cadastrar restaurante.

EOF
)"
```
