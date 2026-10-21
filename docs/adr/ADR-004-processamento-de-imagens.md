# ADR-004 - Processamento de imagens dentro da API

## Status
Aceita

## Data
21/10/2026

## Responsável
Equipe EasyFood

## Contexto
Com o cadastro de pratos (módulo `dishes`), cada prato passa a poder ter uma imagem. Imagens enviadas por usuários costumam ser grandes e em formatos variados, o que aumenta o tempo de carregamento e o consumo de dados de quem consulta o cardápio. Por isso a EasyFood precisa reduzir e padronizar a imagem antes de armazená-la.

## Alternativas consideradas
1. Processar dentro da API EasyFood.
2. Criar um serviço independente de imagens.
3. Utilizar Serverless/FaaS (por exemplo, uma função disparada pelo upload).

## Decisão
Manter o processamento dentro da API EasyFood. O arquivo chega por Multer (em memória, limite de 5 MB, JPEG/PNG/WebP), é processado pelo Sharp em `src/modules/shared/image.service.js` (rotação conforme EXIF, largura máxima de 800 px, conversão para WebP com qualidade 80) e salvo em `uploads/dishes/`. O caminho resultante é gravado em `Dish.imageUrl`.

## Justificativa
- Simplicidade: nenhum componente novo para configurar ou operar.
- Baixo volume inicial de imagens, compatível com o contexto acadêmico do projeto.
- Aproveita a infraestrutura existente (Express, Prisma, JWT).
- Facilidade de implementação e de depuração em um único processo.
- O serviço fica em `shared/`, pronto para ser reutilizado por outros módulos (logotipos, fotos de perfil).

## Consequências

### Vantagens
- Menor complexidade inicial.
- Menos componentes para configurar.
- Aproveitamento da infraestrutura existente.

### Limitações
- O processamento consome CPU e memória da API.
- Um upload pesado pode afetar outras requisições.
- O armazenamento local não serve para várias instâncias nem para sistemas de arquivos temporários; nesses cenários seria necessário um armazenamento externo, como S3.
- A solução precisa ser reavaliada caso o volume de imagens cresça.

## Critérios de revisão
Reavaliar quando:
1. O volume de uploads começar a degradar o tempo de resposta das demais rotas.
2. A API passar a rodar em múltiplas instâncias.
3. Surgirem outros tipos de arquivo ou transformações mais pesadas.

## Notas
Esta decisão não significa que Serverless seja inadequado. Significa que, neste momento, processar dentro da API atende melhor às necessidades do projeto.
Falhas no processamento não removem o prato já cadastrado: ele permanece sem imagem e o envio pode ser repetido.
