# ADR-002 - Persistência com PostgreSQL

## Status
Aceita

## Data
31/08/2026

## Responsável
Equipe EasyFood

## Contexto
Na Missão 2 (Sprint 03) registramos no ADR-001 que os restaurantes ficavam em memória. GET e POST funcionavam, mas ao reiniciar o servidor os cadastros sumiam. Na Missão 3 precisamos manter os dados entre reinicializações e deploys, com base relacional e caminho claro para evoluir a API.

## Alternativas consideradas
1. PostgreSQL
2. MongoDB
3. SQLite
4. Firebase
5. Arquivo JSON

## Decisão
Adotar PostgreSQL como banco de dados da EasyFood, acessado via Prisma ORM na camada Service (`src/modules/restaurants/restaurant.service.js`). Conexão configurada em `DATABASE_URL` apontando para o banco `easyfood`.

## Justificativa
- Persiste dados após reinício do servidor e do processo Node.js.
- Modelo relacional combina com a entidade Restaurant e consultas futuras.
- Prisma centraliza schema, migrations e acesso tipado ao banco.
- PostgreSQL é adequado para ambientes acadêmicos com setup local e para evolução em produção.
- Migrations versionadas em `prisma/migrations` documentam a evolução do schema.

## Consequências

### Positivas
- Cadastros sobrevivem a Ctrl+C e novo `npm start`.
- GET e POST passam a usar `prisma.restaurant.findMany()` e `prisma.restaurant.create()`.
- Prisma Studio permite inspecionar dados visualmente.
- Seed inicial (`prisma/seed.js`) popula restaurantes de exemplo.
- Caminho natural para novas entidades (pedidos, cardápio, usuários).

### Negativas
- Exige PostgreSQL instalado e banco `easyfood` criado.
- `DATABASE_URL` e credenciais precisam estar corretas no `.env`.
- Maior complexidade operacional que array em memória ou SQLite em arquivo único.
- Falhas de conexão com o banco derrubam GET/POST com HTTP 500.

## Critérios de revisão
Reavaliar quando:
1. A API rodar em múltiplas instâncias com alta concorrência de escrita.
2. Surgirem relacionamentos complexos ou necessidade de réplicas/read replicas.
3. O volume de dados exigir particionamento ou cache dedicado.
4. A EasyFood migrar para infraestrutura gerenciada (RDS, Cloud SQL, etc.).

## Notas
Substitui o armazenamento em memória descrito no ADR-001 para a versão atual do código.
O ADR-001 permanece como registro histórico da primeira decisão.
Arquitetura atual (Missão 4): Cliente → Routes → Controller → Service → Prisma → PostgreSQL.
Detalhes da organização em camadas: `docs/respostas/missao4-respostas.txt`.
