# App DisÁgua — Electron + React + Vite + TypeScript + Express + Prisma (SQLite) + Tailwind + shadcn/ui

Projeto base com:

- Electron (app desktop) com servidor Express embutido
- React + Vite + TypeScript (renderer)
- Prisma + SQLite (banco local)
- Tailwind CSS + shadcn/ui (UI)
- Vitest (testes)

## Sumário

- [Requisitos](#requisitos)
- [Instalação](#instalação)
- [Configuração de ambiente](#configuração-de-ambiente)
- [Scripts](#scripts)
- [Importação e deduplicação de lojas](#importação-e-deduplicação-de-lojas)
  - [Importar XLSX pela API/UI](#importar-xlsx-pela-apiui)
  - [Importar XLSX pelo script CLI](#importar-xlsx-pelo-script-cli)
  - [Deduplicação](#deduplicação)
- [Rotas do servidor](#rotas-do-servidor)
- [Auditoria e diretórios de dados](#auditoria-e-diretórios-de-dados)
- [Estrutura](#estrutura)
- [Tailwind + shadcn/ui](#tailwind--shadcnui)
- [Observações de desenvolvimento](#observações-de-desenvolvimento)
- [Testes](#testes)

## Requisitos

- Node.js 18+
- npm 9+ (ou pnpm/yarn se preferir)
- Bibliotecas de sistema necessárias para o Electron (Ubuntu/Debian):

  ```bash
  sudo apt-get install -y libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libgbm1 libgtk-3-0 libnss3 libxss1 libxkbfile1 libasound2
  ```

  Essas bibliotecas garantem que o `npm run dev` consiga iniciar o Electron localmente.

## Instalação

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Gere o client do Prisma:

   ```bash
   npm run generate
   ```

3. Execute as migrações (cria/atualiza `prisma/dev.db`) e alimente os dados iniciais:

   ```bash
   npm run db:setup
   ```

   O comando executa `npm run migrate` antes de `prisma db seed`, garantindo um schema atualizado antes de popular a base. Caso queira rodar em etapas, execute `npm run migrate` seguido de `npm run seed`.

## Configuração de ambiente

- `PORT`: porta usada pelo servidor Express. Por padrão é `5174` tanto para o script `npm run server` quanto para o processo principal do Electron.
- `ELECTRON_START_URL`: URL carregada pelo Electron em produção. Útil para apontar para um build hospedado externamente.
- `VITE_DEV_SERVER_URL`: URL alternativa utilizada durante o desenvolvimento com Vite. Geralmente não precisa ser alterada.
- `CORS_ALLOWED_ORIGINS`: lista separada por vírgulas com as origens permitidas pelo servidor. Em desenvolvimento, se não informado, o fallback é `http://localhost:5173`. Em produção, configure explicitamente (ex.: `https://app.empresa.com,https://painel.empresa.com`).

Variáveis podem ser definidas em um arquivo `.env` na raiz do projeto ou exportadas diretamente no shell antes de executar os scripts.

## Scripts

- `npm run dev`: inicia Vite (renderer) e Electron (app), e o servidor Express embutido (porta 5174).
- `npm run server`: inicia somente o servidor Express (útil para testar APIs) em `http://localhost:5174`.
- `npm run migrate`: aplica as migrações pendentes do Prisma em modo desenvolvimento (sem regenerar o client).
- `npm run seed`: garante que as migrações foram aplicadas e executa o seed (`prisma db seed`).
- `npm run db:setup`: fluxo completo de preparação do banco (migrate + seed).
- `npm run generate`: gera o client do Prisma.
- `npm run lint` / `npm run lint:fix`: verifica/aplica correções automáticas com ESLint.
- `npm run format` / `npm run format:check`: aplica ou verifica o formato com Prettier.
- `npm run test`: executa os testes com Vitest em modo `run` (não-watch). Use `npm run test:watch` durante o desenvolvimento.
- `npm run build:main`: compila o processo principal (Electron + servidor Express) para `dist-electron/` via TypeScript.
- `npm run build:renderer`: gera os assets da UI com Vite.
- `npm run build`: executa `build:main` e `build:renderer` para um pacote completo.

## Rotas do servidor

- `GET /health` → retorna `{ "ok": true }`.
- `GET /partners` → lista parceiros cadastrados ordenados por nome (aceita `?search=` para filtrar por nome, documento ou email).
- `GET /reports` → lista relatórios com parceiro associado e data de emissão (aceita `?partnerId=` para filtrar por parceiro).
- `GET /vouchers` → lista vouchers emitidos, com parceiro relacionado e status de resgate (aceita `?status=pending|redeemed`, `?partnerId=` para filtrar por parceiro e `?reportId=` para filtrar por relatório).
- `POST /reports/:id/export` → gera um arquivo consolidado (PDF ou ZIP) com os comprovantes do relatório informado, registra o evento na auditoria e retorna o caminho gerado.
- `GET /stats` → retorna contagens de parceiros, relatórios e vouchers (resgatados e pendentes).
- `GET /audit-logs` → consulta o histórico de auditoria com filtros opcionais (`entity`, `action`, `actor`, `from`, `to`, `page`, `pageSize`).
- `GET /api/brands` → busca marcas por parceiro com filtros `q`, `page` e `pageSize`.
- `POST /api/brands` → cria marca vinculada a um parceiro (valida duplicidade por nome/código).
- `PATCH /api/brands/:id` → atualiza nome/código da marca.
- `DELETE /api/brands/:id` → remove uma marca (cascata nas lojas).
- `GET /api/stores` → lista lojas com filtros por parceiro, marca, cidade, UF, shopping, status e busca livre.
- `GET /api/stores/:id` → carrega uma loja com marca, parceiro e grade de preços.
- `POST /api/stores` → cria loja (opcionalmente cria marca rápida) calculando `normalizedName` e salvando preços em centavos.
- `PATCH /api/stores/:id` → atualiza dados e substitui preços vigentes.
- `DELETE /api/stores/:id` → remove loja e preços associados.
- `POST /api/stores/import` → importa/atualiza lojas via XLSX (vide seção abaixo) com resumo de criados/atualizados/ignorados.
- `POST /api/stores/detect-duplicates` → retorna grupos candidatos a duplicidade por CNPJ ou nome/cidade.
- `POST /api/stores/merge` → mescla registros duplicados, movendo preços e vouchers para o alvo.

As rotas que criam, atualizam ou removem registros geram automaticamente entradas na tabela de auditoria, incluindo operações em lote (`createMany`, `updateMany`, `deleteMany`). Para informar o usuário responsável pela alteração, envie o cabeçalho `X-Actor-Id` (ou `X-User-Id`) na requisição.

Servidor embutido é iniciado pelo processo principal do Electron. No modo `dev`, a UI roda em `http://localhost:5173` e o servidor em `http://localhost:5174`. Em produção, configure a variável `CORS_ALLOWED_ORIGINS` (lista separada por vírgulas) para liberar apenas origens confiáveis.

## Importação e deduplicação de lojas

### Importar XLSX pela API/UI

1. Acesse `/stores/import` na UI ou envie `POST /api/stores/import` com `multipart/form-data` contendo `file` (planilha) e `mapping` (JSON com as colunas, ex.: `{ "colPartner": "Parceiro", "colStoreName": "Nome", "colCity": "Cidade", "colState": "UF" }`).
2. Campos opcionais incluem marca, shopping, endereço e preços (`colValue20L`, `colValue10L`, `colValue1500`, `colValueCopo`, `colValueVasilhame`).
3. Use `allowCreateBrand=true` para criar marcas automaticamente quando inexistentes para o parceiro.
4. A resposta retorna `{ created, updated, skipped, conflicts[] }` com detalhes de linhas ignoradas ou conflitos de unicidade.

### Importar XLSX pelo script CLI

Para sincronizar lojas diretamente via linha de comando, utilize o script `npm run import:stores`. Ele processa `data/LISTA DE LOJAS.xlsx` (primeira aba) e executa um _upsert_ de lojas, atualizando preços relacionados.

- Ajuste a planilha conforme os cabeçalhos esperados (`MARCA`, `LOJA`, `COD da Disagua`, `LOCAL DA ENTREGA`, `MUNICIPIO`, `UF`, e colunas de preço como `VALOR 20L`, `VALOR 10L`, etc.).
- O script normaliza o endereço com `parseBrazilAddress`, atualiza marcas existentes e reescreve a tabela de preços (`storePrice`) para cada loja sincronizada.
- Para usar outra planilha ou caminho, edite `scripts/import-stores.ts` antes da execução ou crie uma cópia do arquivo adequando os cabeçalhos.
- O output no terminal indica cada loja criada/atualizada e reporta linhas inválidas.

### Deduplicação

1. A UI `/stores/duplicates` consome `POST /api/stores/detect-duplicates` para listar candidatos por CNPJ ou combinação nome/cidade/mall.
2. Acione o merge pelo botão “Mesclar registros”, que chama `POST /api/stores/merge` com `targetId`, `sourceIds[]` e `fieldsStrategy` (`target`, `source` ou `mostRecent`).
3. Durante o merge, vouchers e preços dos registros fonte são migrados para o alvo e os duplicados são excluídos ao final da transação.

## Auditoria e diretórios de dados

- Logs de auditoria são gravados automaticamente para ações de escrita individuais e em lote, incluindo snapshots do payload enviado e do resultado retornado.
- Diretórios `data/uploads/` e `data/exports/` são criados automaticamente em tempo de execução e estão ignorados no Git para evitar o versionamento de arquivos sensíveis.

## Estrutura

- `electron/main.ts`: processo principal do Electron. Sobe o servidor Express e carrega a UI.
- `src/server/app.ts`: cria e configura o app Express (middleware, CORS, rotas).
- `src/server/index.ts`: ponto de entrada para rodar o servidor fora do Electron (script `server`).
- `src/renderer/`: código React + Tailwind + shadcn/ui.
- `prisma/schema.prisma`: schema do Prisma (SQLite em `prisma/dev.db`).

> Observação: este repositório concentra o app desktop diretamente na raiz (`electron/`, `src/`, `prisma/`), diferente do padrão sugerido `apps/desktop/`. Todos os scripts e instruções já consideram essa organização.

## Tailwind + shadcn/ui

- Tailwind configurado em `tailwind.config.ts` e `postcss.config.cjs`.
- Exemplo de componente shadcn: `src/renderer/components/ui/button.tsx`.
- Utilitários de classe: `src/renderer/lib/utils.ts` (usa `clsx`/`tailwind-merge`).

Para adicionar mais componentes shadcn no futuro, você pode usar o CLI oficial (`npx shadcn-ui@latest add button`), ajustando `components.json`, ou copiar padrões do repositório.

## Observações de desenvolvimento

- Em `dev`, Vite serve a UI na porta 5173; Electron carrega essa URL. O servidor Express escuta na 5174.
- O script `npm run build` produz a UI final e compila o processo principal do Electron para distribuição local.

## Testes

- `npm run test` executa a suíte com Vitest em modo não interativo.
- Exemplos de testes de API estão em `tests/server/*.test.ts`.
