# ADR-002 - Escolha do banco de dados

## Status
Aceita

## Data
24/08/2026

## Responsável
Equipe EasyFood

## Contexto
Na Sprint 03 testamos a API com array em memória (ADR-001). GET e POST funcionavam, mas ao reiniciar o servidor os cadastros sumiam. O MVP precisa manter restaurantes entre reinicializações sem exigir infraestrutura pesada para a disciplina.

## Alternativas consideradas
1. PostgreSQL
2. MongoDB
3. SQLite
4. Firebase
5. Arquivo JSON

## Decisão
Adotar SQLite como banco de dados da EasyFood, acessado via better-sqlite3 no server.js. Arquivo local: data/easyfood.db.

## Justificativa
- Persiste dados após reinício do servidor.
- Não precisa instalar nem administrar um servidor de banco separado.
- Cabe bem em projeto acadêmico e em MVP local.
- SQL relacional combina com entidades simples (restaurantes) e consultas futuras.
- Integração direta com Node.js, sem serviço externo.

## Consequências

### Positivas
- Cadastros sobrevivem a Ctrl+C e novo node server.js.
- Modelo claro: tabela restaurants com id, name, category, rating.
- Caminho natural para evoluir para PostgreSQL em produção, se necessário.
- Zero custo de hospedagem de banco nesta fase.

### Negativas
- Um arquivo .db por instância; várias instâncias da API precisariam de estratégia diferente.
- Writes concorrentes têm limites do SQLite comparado a PostgreSQL.
- Migrations e backup passam a ser responsabilidade do time.
- better-sqlite3 é dependência nativa; build pode variar entre ambientes.

## Critérios de revisão
Reavaliar quando:
1. A API rodar em mais de uma instância ao mesmo tempo.
2. Houver muitos writes simultâneos ou volume grande de dados.
3. Surgirem relacionamentos complexos (pedidos, usuários, cardápio).
4. A EasyFood for para produção com SLA e backup gerenciado.

## Notas
Substitui o armazenamento em memória descrito no ADR-001 para a versão atual do código.
O ADR-001 permanece como registro histórico da primeira decisão.


## Atualização

Substituído por `ADR-002-persistencia-com-postgresql.md` (PostgreSQL + Prisma), conforme Missão 3.
