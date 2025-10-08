Guia de Agentes de Desenvolvimento (IA-First)
Projeto: Gerenciador de Parceiros

Repositório: gerenciador-parceiros
Estrutura: Electron + React + TypeScript + Tailwind + Express + Prisma + SQLite

🧠 Visão Geral

Este projeto é desenvolvido com suporte total de Inteligência Artificial (IA), sem necessidade de programar manualmente.
A estratégia usa prompts, issues e agentes especializados para construir e evoluir o sistema em fases (MVP → Automação → Escalabilidade).

Cada agente IA tem uma função específica, operando dentro de limites e responsabilidades bem definidos.
O objetivo é manter consistência, segurança e velocidade durante o desenvolvimento.

🤖 1. Estrutura de Agentes
Agente	Função	Ferramenta	Responsabilidade
Codex Dev	Engenheiro de Código	GitHub Copilot / Cursor / Claude	Gera e ajusta código de frontend/backend conforme prompts e issues.
Prompt Architect	Especificador Técnico	ChatGPT	Escreve prompts precisos e detalhados para orientar o Codex.
UI Designer	Prototipador de Interface	ChatGPT / Figma / Penpot	Gera wireframes, componentes visuais e diretrizes de UX.
Data Modeler	Arquiteto de Banco de Dados	ChatGPT + Prisma	Cria e ajusta o schema prisma/schema.prisma, migrations e seeds.
Test Runner	Auditor Técnico	Codex / Jest	Escreve testes unitários e e2e, garante que o projeto roda sem erros.
Docs Writer	Redator Técnico	ChatGPT	Gera e atualiza documentação (README.md, AGENTS.md, CONTRIBUTING.md).
Ops Assistant	DevOps IA	ChatGPT / Node	Cria scripts de build, backup, logs e empacotamento.
🧩 2. Fluxo de Trabalho dos Agentes

Prompt Architect escreve uma issue no GitHub (ou documento interno) com:

Contexto (por exemplo: “Tela de Upload de Comprovantes”)

Critérios de Aceitação (DoD)

Dependências de código

Prompt para Codex gerar o código

Codex Dev lê a issue e o prompt, gera os arquivos necessários:

Cria código em blocos pequenos (commit incremental)

Adiciona comentários explicativos

Escreve testes básicos (Jest ou Vitest)

Atualiza README quando necessário

Data Modeler ajusta migrations, relações e seeds.

Test Runner executa os testes:

npm run test

Corrige ou pede correção de falhas ao Codex

Docs Writer atualiza a documentação técnica.

Ops Assistant cria scripts automatizados (backup, logs, PDF, etc.).

🧭 3. Padrões e Convenções
3.1 Código

Linguagem padrão: TypeScript

Estilo: Prettier + ESLint

UI: React + shadcn/ui + Tailwind

Nome de pastas: kebab-case (report-list, partner-form)

Nome de componentes: PascalCase (ReportList, PartnerForm)

Imports absolutos via @/ prefixo (configurado no tsconfig.json)

3.2 Commits

Seguir o padrão:

feat: adicionar upload de comprovantes
fix: corrigir status automático dos relatórios
refactor: separar hook useReports
docs: atualizar README com novo fluxo

3.3 Testes

Todos os módulos devem incluir:

Teste unitário (Jest/Vitest)

Teste de integração básico

Script npm run test executando localmente

3.4 Segurança

Nenhum arquivo de upload é executável.

Nenhum dado sensível deve ser hardcoded.

Log de auditoria obrigatório em ações CRUD.

🔧 4. Ciclo de Desenvolvimento IA-First
Etapa	Descrição	Ferramenta	Entregável
🧱 Planejamento	Criar Issues detalhadas com prompts claros	ChatGPT	Issues no GitHub
⚙️ Geração	IA escreve código (frontend/backend)	Codex / Copilot	Pull Request / Commit
🧪 Validação	Testes e correções automáticas	Jest / Codex	Código rodando
🧭 Documentação	Atualização automática de docs	ChatGPT / Docs Writer	README / CHANGELOG
🚀 Deploy Local	Build Electron + SQLite local	Node / Electron	App .exe ou .AppImage
🔁 Revisão IA	Revisão cruzada por outro agente (auditoria)	ChatGPT	Sugestões de refatoração
🧰 5. Prompts Padrão
💬 Prompt: Criação de CRUD
Gere rotas Express + Prisma para o recurso <nome>. 
Inclua validação com Zod, paginação (?page, ?limit), e testes Jest. 
Use TypeScript, organize em `src/server/routes/<nome>.ts`. 
Atualize README.md com os endpoints criados.

💬 Prompt: Componente React
Crie um componente React `<NomeComponente>` com TypeScript e Tailwind.
Use shadcn/ui. 
Inclua tipagem de props, estado controlado e exemplo de uso.
Adicione o arquivo em `src/renderer/components/`.

💬 Prompt: Geração de PDF/ZIP
Implemente uma rota POST `/api/reports/:id/export` que gera um PDF consolidado
com todos os comprovantes (usando pdf-lib). Inclua capa com nome do parceiro e período.
Salve em `/data/exports/` e retorne o caminho relativo.

💬 Prompt: Dashboard com Barra de Progresso
Crie página Dashboard mostrando lista de relatórios.
Cada relatório deve exibir:
- Nome, status, período
- Barra de progresso (com % de vouchers válidos)
- Filtros por status e período.
Use Tailwind + shadcn/ui.

🧱 6. Estrutura de Pastas Reforçada
apps/desktop/
  ├── src/
  │   ├── renderer/         # React Frontend
  │   │   ├── components/
  │   │   ├── pages/
  │   │   └── hooks/
  │   ├── server/           # Express Backend
  │   │   ├── routes/
  │   │   ├── middleware/
  │   │   └── utils/
  │   └── shared/           # Tipos e helpers
  ├── prisma/
  │   ├── schema.prisma
  │   └── seed.ts
  ├── data/uploads/
  ├── data/exports/
  ├── tests/
  ├── package.json
  └── README.md

🧩 7. Diretrizes para Issues

Cada issue deve conter:

### Descrição
Breve explicação da funcionalidade.

### Objetivo
O que deve estar pronto ao final da tarefa.

### Critérios de Aceitação
- [ ] Endpoint funcional / Página visível
- [ ] Teste básico passando
- [ ] Sem erros no console
- [ ] Código limpo e documentado

### Prompt para Codex
<colar prompt de geração>

🧠 8. Recomendações Gerais

Sempre usar prompts curtos e objetivos: “Corrija sem quebrar o build” é melhor que “Veja o erro e tente corrigir”.

Evitar mudanças simultâneas em backend e frontend na mesma issue.

Priorizar feedback incremental: testar e ajustar antes de seguir.

Manter logs e seed atualizados (npm run seed).

Salvar os prompts usados na pasta /docs/prompts/.

✅ 9. Objetivo Final

Com este sistema de agentes:

O projeto pode evoluir quase inteiramente via IA, sem codificação manual.

Cada módulo é reproduzível, testável e auditável.

A documentação serve de base para qualquer colaborador humano ou IA.