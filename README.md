# EasyFood

API REST para consulta e cadastro de restaurantes e dos pratos de cada cardápio (com upload de imagens otimizadas), com autenticação por JWT e uma interface web simples para consumir os endpoints.

O projeto foi desenvolvido na disciplina de Software Architecture & Design Patterns da UniFECAF e evoluiu ao longo das aulas. Começou como um servidor Express com os dados em um array em memória, passou a persistir em PostgreSQL via Prisma, foi reorganizado em camadas e recebeu autenticação de usuários.

## Tecnologias

- Node.js e Express 5
- PostgreSQL
- Prisma ORM
- jsonwebtoken e bcrypt
- Multer e Sharp (upload e otimização de imagens)
- HTML, CSS e JavaScript sem framework no front-end

## Pré-requisitos

- Node.js 18 ou superior
- PostgreSQL 14 ou superior em execução

## Como rodar

Instale as dependências:

```bash
npm install
```

Copie o arquivo de exemplo das variáveis de ambiente e ajuste os valores:

```bash
cp .env.example .env
```

O `.env` precisa destas entradas:

```
DATABASE_URL="postgresql://usuario:senha@localhost:5432/easyfood"
JWT_SECRET="uma-chave-longa-e-aleatoria"
API_KEY="cole-a-chave-do-mailersend"
MAIL_FROM="remetente-verificado@seudominio.com"
```

Se o banco `easyfood` ainda não existir, há um script auxiliar que o cria no PostgreSQL local:

```bash
./scripts/setup-linux-postgres.sh
```

As imagens enviadas ficam em `uploads/dishes/`. Aplique as migrations e insira três restaurantes de exemplo:

```bash
npx prisma migrate dev
npm run seed
```

Suba o servidor:

```bash
npm start
```

A interface fica em `http://localhost:3000` e a API responde na mesma porta.

## Endpoints

| Método | Rota | Autenticação | Descrição |
| --- | --- | --- | --- |
| GET | `/restaurants` | não | Lista os restaurantes ordenados por id |
| POST | `/restaurants` | Bearer | Cadastra um restaurante |
| POST | `/auth/register` | não | Cria um usuário |
| POST | `/auth/login` | não | Autentica e devolve o token |
| GET | `/auth/me` | Bearer | Retorna os dados do usuário do token |
| GET | `/restaurants/:restaurantId/dishes` | não | Lista o cardápio de um restaurante |
| POST | `/restaurants/:restaurantId/dishes` | Bearer | Cadastra um prato (`name`, `description`, `price`) |
| POST | `/dishes/:dishId/image` | Bearer | Envia a imagem do prato (multipart, campo `image`) |

### Exemplos

Listar os restaurantes:

```bash
curl http://localhost:3000/restaurants
```

Criar um usuário. Nome, e-mail e senha são obrigatórios, e a senha precisa de no mínimo 6 caracteres:

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Aluno","email":"aluno@easyfood.com","password":"123456"}'
```

Autenticar para obter o token:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"aluno@easyfood.com","password":"123456"}'
```

Cadastrar um restaurante com o token. Os campos `name` e `category` são obrigatórios; `rating` é opcional e assume 0 quando omitido:

```bash
curl -X POST http://localhost:3000/restaurants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{"name":"Cantina Roma","category":"Italiana","rating":4.5}'
```

Enviar a imagem de um prato (JPEG, PNG ou WebP, até 5 MB). A API reduz para no máximo 800 px de largura, converte para WebP e devolve o prato com `imageUrl`:

```bash
curl -X POST http://localhost:3000/dishes/1/image \
  -H "Authorization: Bearer SEU_TOKEN" \
  -F "image=@foto.jpg"
```

Arquivo inválido ou ausente retorna 400, e acima do limite retorna 413. A imagem fica em `http://localhost:3000/uploads/dishes/<arquivo>.webp`.

## Estrutura do projeto

```
├── docs/
│   ├── adr/                 registros das decisões de arquitetura
│   └── respostas/           respostas das atividades da disciplina
├── prisma/
│   ├── migrations/          histórico de alterações do schema
│   ├── schema.prisma        models Restaurant, Dish e User
│   └── seed.js              dados iniciais
├── public/
│   └── index.html           interface web
├── scripts/                 scripts de setup do PostgreSQL
├── src/
│   ├── database/
│   │   └── prisma.js        instância única do PrismaClient
│   ├── modules/
│   │   ├── auth/            cadastro, login e middleware de token
│   │   ├── dishes/          cardápio e upload da imagem dos pratos
│   │   ├── restaurants/     listagem e cadastro de restaurantes
│   │   └── shared/          e-mail, processamento de imagens e middleware de upload
│   └── app.js               middlewares e registro das rotas
├── uploads/dishes/          imagens otimizadas (não versionadas)
└── server.js                carrega o .env, conecta ao banco e escuta a porta
```

## Arquitetura

Cada módulo em `src/modules` segue a mesma divisão de responsabilidades:

```
requisição → routes → controller → service → database → PostgreSQL
```

As rotas apenas associam método e caminho à função correspondente do controller. O controller cuida do que é HTTP: lê o corpo da requisição, valida a entrada e escolhe o status da resposta. O service concentra as operações de domínio e não conhece `req` nem `res`, o que permite reaproveitá-lo fora de uma rota, em um script ou em um teste. A camada de database expõe uma única instância do PrismaClient para o restante da aplicação.

Essa separação deixou o `server.js` com uma responsabilidade só: carregar as variáveis de ambiente, abrir a conexão com o banco e escutar a porta. O `src/app.js` monta o Express e registra as rotas sem subir o servidor, o que permite importar a aplicação isoladamente.

## Autenticação

O cadastro salva a senha com hash bcrypt e a resposta devolve apenas id, nome e e-mail. No login, `bcrypt.compare` confere a senha e, quando ela bate, a API assina um JWT com validade de um dia usando o `JWT_SECRET` do `.env`.

As rotas protegidas esperam o token no header `Authorization: Bearer <token>`. O middleware em `src/modules/auth/auth.middleware.js` valida a assinatura e preenche `req.user` antes de chamar o controller. Sem token válido a resposta é 401.

A leitura do catálogo continua aberta: `GET /restaurants` é público e `POST /restaurants` exige autenticação.

## Decisões de arquitetura

As decisões tomadas durante o desenvolvimento estão registradas em `docs/adr`:

- [ADR-001](docs/adr/ADR-001-armazenar-restaurantes-em-memoria.md): armazenar os restaurantes em memória na primeira versão
- [ADR-002](docs/adr/ADR-002-escolha-do-banco-de-dados.md): adoção do SQLite para persistir os dados, substituída em seguida
- [ADR-002](docs/adr/ADR-002-persistencia-com-postgresql.md): migração para PostgreSQL com Prisma
- [ADR-003](docs/adr/ADR-003-estrategia-de-autenticacao.md): JWT com login próprio em vez de Cognito ou login social
- [ADR-004](docs/adr/ADR-004-processamento-de-imagens.md): processar as imagens dentro da própria API

## Autor

Matheus Dantas, RA 59412
UniFECAF, 8º semestre
