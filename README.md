# App DisÁgua — Electron + React + Vite + TypeScript + Express + Prisma (SQLite) + Tailwind + shadcn/ui

Projeto base com:

- Electron (app desktop) com servidor Express embutido
- React + Vite + TypeScript (renderer)
- Prisma + SQLite (banco local)
- Tailwind CSS + shadcn/ui (UI)
- Vitest (testes)

## Requisitos

- Node.js 18+
- npm 9+ (ou pnpm/yarn se preferir)

## Instalação

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Gere o client do Prisma:

   ```bash
   npm run generate
   ```

3. Execute as migrações (cria `prisma/dev.db`):

   ```bash
   npm run migrate
   ```

4. (Opcional) Rode o seed:

   ```bash
   npm run seed
   ```

## Scripts

- `npm run dev`: inicia Vite (renderer) e Electron (app), e o servidor Express embutido (porta 5174).
- `npm run server`: inicia somente o servidor Express (útil para testar APIs) em `http://localhost:5174`.
- `npm run migrate`: aplica migrações do Prisma (modo dev).
- `npm run seed`: executa o seed do Prisma.
- `npm run test`: executa testes com Vitest.

## Rotas do servidor

- `GET /health` → retorna `{ "status": "ok" }`.
- `GET /partners` → lista parceiros cadastrados ordenados por nome (aceita `?search=` para filtrar por nome, documento ou email).
- `GET /reports` → lista relatórios com parceiro associado e data de emissão (aceita `?partnerId=` para filtrar por parceiro).
- `GET /vouchers` → lista vouchers emitidos, com parceiro relacionado e status de resgate (aceita `?status=pending|redeemed` e `?partnerId=` para filtrar por parceiro).
- `GET /stats` → retorna contagens de parceiros, relatórios e vouchers (resgatados e pendentes).
- `GET /audit-logs` → consulta o histórico de auditoria com filtros opcionais (`entity`, `action`, `actor`, `from`, `to`, `page`, `pageSize`).

As rotas que criam, atualizam ou removem registros geram automaticamente entradas na tabela de auditoria. Para informar o usuário responsável pela alteração, envie o cabeçalho `X-Actor-Id` (ou `X-User-Id`) na requisição.

Servidor embutido é iniciado pelo processo principal do Electron. No modo `dev`, a UI roda em `http://localhost:5173` e o servidor em `http://localhost:5174`.

## Estrutura

- `electron/main.ts`: processo principal do Electron. Sobe o servidor Express e carrega a UI.
- `src/server/app.ts`: cria e configura o app Express.
- `src/server/index.ts`: ponto de entrada para rodar o servidor fora do Electron (script `server`).
- `src/renderer/`: código React + Tailwind + shadcn/ui.
- `prisma/schema.prisma`: schema do Prisma (SQLite em `prisma/dev.db`).

## Tailwind + shadcn/ui

- Tailwind configurado em `tailwind.config.ts` e `postcss.config.cjs`.
- Exemplo de componente shadcn: `src/renderer/components/ui/button.tsx`.
- Utilitários de classe: `src/renderer/lib/utils.ts` (usa `clsx`/`tailwind-merge`).

Para adicionar mais componentes shadcn no futuro, você pode usar o CLI oficial (`npx shadcn-ui@latest add button`), ajustando `components.json`, ou copiar padrões do repositório.

## Observações de desenvolvimento

- Em `dev`, Vite serve a UI na porta 5173; Electron carrega essa URL. O servidor Express escuta na 5174.
- Para produção/empacotamento de Electron, seria necessário adicionar um fluxo de build do processo principal e apontar para `dist/index.html` (fora do escopo atual).

## Testes

Exemplo de teste em `src/renderer/App.test.tsx` usando `@testing-library/react` e Vitest.

