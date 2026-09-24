# E-mail de boas-vindas no cadastro de restaurante

## Contexto

A Aula 6 pede que, ao cadastrar um restaurante, a EasyFood faça três coisas em sequência: enviar um e-mail de boas-vindas, registrar a atividade e avisar o time comercial. A decisão da aula é comunicação direta entre componentes. A EasyFood não publica evento e não usa fila.

O envio usa a API do MailerSend, `POST https://api.mailersend.com/v1/email`. O projeto é CommonJS (`require`). O cliente HTTP é o `fetch` do Node 18. O pacote `mailersend` fica de fora.

## Comportamento

`POST /restaurants` continua exigindo `Authorization: Bearer <token>`. O corpo continua `name`, `category` e `rating` opcional.

Depois que o restaurante é gravado no PostgreSQL, o service chama, nesta ordem:

1. `sendWelcomeEmail({ to, restaurantName })`
2. `registerActivity({ restaurantId, restaurantName })`
3. `notifyCommercial({ restaurantId, restaurantName })`

O destinatário do e-mail é `req.user.email`, o e-mail do usuário autenticado. O model `Restaurant` não ganha campo de e-mail.

A resposta de sucesso continua `201` com o restaurante criado. Falha no MailerSend, atividade ou aviso comercial não altera esse status e não apaga o restaurante. O erro vai para `console.error`.

`GET /restaurants` não muda.

## Módulo

Um arquivo, `src/modules/notifications/notifications.js`, exporta as três funções. O `restaurant.controller.js` lê `req.user.email` e repassa ao `createRestaurant`. O `restaurant.service.js` grava e depois chama as três funções. Rotas e middleware de token permanecem como estão.

Quem chama o módulo novo: `createRestaurant` em `src/modules/restaurants/restaurant.service.js` (hoje linhas 7–15, só grava no Prisma) e `create` em `src/modules/restaurants/restaurant.controller.js` (hoje linhas 13–26, não repassa o e-mail do token).

### E-mail

`sendWelcomeEmail` faz `POST` em `https://api.mailersend.com/v1/email` com:

- header `Authorization: Bearer <API_KEY>`
- header `Content-Type: application/json`
- `from.email` = `MAIL_FROM`
- `from.name` = `EasyFood`
- `to` = um item com o e-mail do usuário
- `reply_to` = o mesmo remetente
- `subject` = `Restaurante cadastrado na EasyFood`
- `text` = `O restaurante {nome} foi cadastrado na EasyFood.`
- `html` = `<p>O restaurante <strong>{nome}</strong> foi cadastrado na EasyFood.</p>`, com `{nome}` escapado (`&`, `<`, `>`, `"`)

Se `API_KEY` ou `MAIL_FROM` estiver ausente, a função registra o motivo no log e retorna sem chamar a API. Resposta HTTP do MailerSend fora de 2xx também é erro de log, com o status e no máximo os primeiros 500 caracteres do corpo. A chave da API nunca é logada.

`MAIL_FROM` precisa ser um remetente verificado na conta MailerSend. A conta de teste do MailerSend só entrega para destinatários autorizados por ela. Isso é limite da conta, não da EasyFood.

### Atividade e comercial

`registerActivity` escreve `Atividade: restaurante {id} ({nome}) cadastrado.` `notifyCommercial` escreve `Comercial: restaurante {id} ({nome}) cadastrado.` Não há tabela nova, fila nem CRM.

## Variáveis de ambiente

`.env.example` ganha:

```
API_KEY="cole-a-chave-do-mailersend"
MAIL_FROM="remetente-verificado@seudominio.com"
```

Os valores reais ficam só no `.env`, que já está fora do Git. Não há arquivo de dados com data. O restaurante continua com `id`, `name`, `category` e `rating`.

## Erros

Ordem fixa: gravar o restaurante, depois as três chamadas. Cada chamada tem o próprio `try/catch`, para uma falha não impedir as seguintes. Qualquer falha depois do `create` do Prisma é logada e engolida. O controller recebe o restaurante e responde `201`.

Validação de `name` e `category`, `401` sem token e `500` se o banco falhar continuam iguais.

## Verificação

Um script `node src/modules/notifications/notifications.check.js` confere, sem rede:

- o corpo do e-mail contém o nome escapado no HTML
- `from`, `to`, `subject` e o endpoint estão preenchidos
- nome com `<` não entra cru no HTML

O envio real depende de `API_KEY` e `MAIL_FROM` válidos. Sem eles, um `POST /restaurants` autenticado ainda retorna `201` e o log explica a configuração ausente.

## Fora deste trabalho

- Pacote npm `mailersend`
- Evento `restaurant.created`, fila, RabbitMQ ou Kafka
- Coluna de e-mail em `Restaurant`
- Desfazer o cadastro quando o e-mail falha
- Interface web nova
