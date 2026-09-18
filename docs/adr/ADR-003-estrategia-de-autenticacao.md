# ADR-003 - Estratégia de autenticação

## Status
Aceito

## Data
03/09/2026

## Responsável
Equipe EasyFood

## Contexto
Na Missão 4 (arquitetura em camadas), a API foi reorganizada em módulos (`restaurants/`, `auth/`). Na Atividade 5, a autenticação JWT foi implementada: cadastro, login, rota `/auth/me` e proteção do `POST /restaurants`.

## Alternativas consideradas
1. JWT (JSON Web Token) com login próprio (email/senha + bcrypt)
2. AWS Cognito
3. Login com Google (OAuth 2.0 / OpenID Connect)
4. Sessão em cookie com express-session + Redis

## Decisão
Adotar **JWT com login próprio** na API Express, com senhas hasheadas (bcrypt) e token enviado no header `Authorization: Bearer <token>`.

## Justificativa
- **JWT:** controle total no monólito atual, sem custo de cloud, fácil de testar com curl/Postman, padrão de mercado para APIs REST. Trade-off: gestão de refresh token e revogação ficam por conta do time.
- **AWS Cognito:** bom para produção em AWS, mas adiciona dependência externa, configuração de console e custo; pesado para MVP acadêmico local.
- **Login Google:** ótimo UX para app público, mas exige fluxo OAuth, credenciais no Google Cloud e não cobre usuários sem conta Google; mistura identidade externa com domínio interno.
- **Sessão + Redis:** stateful, exige Redis rodando; JWT stateless combina melhor com API stateless atual.

Para o estágio atual da EasyFood (monólito Express + PostgreSQL, sem front dedicado), JWT é o melhor equilíbrio entre simplicidade, aprendizado e caminho para produção.

## Consequências

### Positivas
- Rotas podem ser protegidas com middleware `authenticate` antes do controller.
- Módulo `auth/` segue o mesmo padrão routes → controller → service.
- Sem vendor lock-in nem conta AWS obrigatória.
- Tokens permitem escalar para múltiplas instâncias da API sem sessão compartilhada.

### Negativas
- Senhas e segredos (`JWT_SECRET`) precisam de `.env` bem configurado.
- Revogar token antes do expiry exige lista negra ou refresh token (não implementado ainda).

## Critérios de revisão
Reavaliar quando:
1. A EasyFood integrar front mobile com login social obrigatório.
2. O deploy migrar para AWS com Cognito já disponível na organização.
3. Surgir requisito de SSO corporativo (Google Workspace, Azure AD).

## Notas
Implementação concluída na Atividade 5. Ver `docs/respostas/missao5-respostas.txt`.
