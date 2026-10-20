# Auditoria técnica

Data: 20/10/2026 (atualizado após sincronização remota)

## Escopo revisado

- Aplicação Next.js/React/TypeScript em `src`.
- Sessão Supabase, callback OAuth, proxy e autorização server-side.
- Route handler de requisições e validação Zod.
- Migrações, grants, RLS, funções SQL e seed.
- Testes unitários, E2E, lint, typecheck e build.
- Configuração do VS Code/PowerShell e documentação de deploy.

## Correções realizadas nesta auditoria

## Segunda auditoria — implementação incremental

- O contrato ativo de requisição não contém quantidade de reposição; o estoque informado e a urgência permanecem. A migração `20261020000800` remove a coluna legada sem editar migrações aplicadas.
- A migração `20261020001200` mantém a compatibilidade com protocolos históricos `HC-YYYYMMDD-XXXXXXXX` e aceita os novos protocolos sequenciais `HC-000012`.
- As migrações `20261020001600` e `20261020001700` adicionam importação histórica idempotente, operações administrativas protegidas e fluxo de inventário com submissão/aprovação.
- A submissão usa hash SHA-256 do payload canônico, rejeita reuso da chave com conteúdo diferente, usa sequência de protocolo iniciando em 12 e reconstrói o comprovante a partir de itens/observações persistidos.
- O histórico possui API e telas server-side por paciente, busca por protocolo, status, paginação, detalhe e impressão. RLS foi ampliada por memberships.
- O banco possui memberships, saldos derivados por paciente/custódia, movimentos transacionais, inventários propostos e notificações individualizadas nas migrações `20261020000900` e `20261020001000`; `20261020001100` adiciona a função `family`.
- Logout passou a exibir falha explicitamente e o login oferece recuperação de senha pelo fluxo Supabase.
- CI foi criado em `.github/workflows/ci.yml`.

1. Callback OAuth passou a rejeitar destinos externos em `next` e a tratar falhas de troca de código.
2. Página inicial e API passaram a distinguir falha de infraestrutura/autorização de ausência de perfil.
3. API passou a verificar e registrar erros nas consultas de perfil, pessoa assistida, idempotência, catálogo e itens extras.
4. A migração de grants existente foi preservada sem edição retroativa.
5. Foi criada a migração incremental `20261020000700_restrict_public_data_api_access.sql` para remover acesso público/anon às tabelas e funções expostas.
6. O workspace fixa PowerShell 7.6.7 sem carregamento de perfil para reduzir encerramentos externos do terminal da extensão.

## Estado de validação desta rodada

Passaram localmente:

- `npm run typecheck`
- `npm run lint`
- `npm test` (10 testes)
- `npm run build`
- `git diff --check`
- `supabase db reset --local` com as quinze migrações e seed fictício
- `supabase db lint --local` sem erros de schema
- `npm run build`

O deploy Production da Vercel foi validado anteriormente como `Ready`.

## Estado do banco remoto

Não foi feita aplicação de migrações, push, deploy ou alteração em banco remoto nesta
rodada. A validação descrita aqui é exclusivamente local.

## Branches após a auditoria

O estado auditado nesta rodada está apenas no working tree local de `master`.
O commit `4256ae6` foi enviado para `origin/master`. O push acionou o deploy
automático da Vercel, que terminou `Ready` em 20/10/2026 e assumiu o alias de
produção `https://home-care-assistant.vercel.app`. O banco remoto, porém, não
aceitou `supabase db push`; portanto a publicação existe, mas as funcionalidades
que dependem das migrações novas ainda aguardam aplicação no banco remoto.

## Limitações e pendências verificadas

- O projeto remoto atual contém seed fictício e deve ser separado de produção.
- Login Google depende da configuração do provedor no Supabase e Google Cloud.
- MFA para administradores, backups, retenção LGPD e revisão final de RLS ainda são necessários.
- Usuários OAuth novos precisam de perfil ativo em `public.profiles`; não existe provisionamento automático.
- O aviso da extensão Vercel é autenticação/cache da extensão em time diferente; a CLI e o projeto correto estão funcionais.
- A submissão agora cria uma notificação interna pendente e a API administrativa
  `/api/admin/notifications` processa lotes internos idempotentemente. Ainda não existe
  worker externo ou integração WhatsApp; canais externos permanecem pendentes até
  provedor e credenciais serem configurados.
- A administração possui API server-side e página protegida para perfis, pacientes e catálogo; operações de escrita passam por funções `SECURITY DEFINER` com auditoria.
- A importação histórica aceita no máximo 1.000 linhas, preserva protocolos `1..11` como `HC-000001..HC-000011`, não consome a sequência nova, rejeita duplicidades e retorna relatório por linha.
- O inventário possui criação, inclusão/atualização de itens, submissão e aprovação administrativa; a aprovação gera ajustes de estoque somente para divergências.
- A migração `20261020001300` registra automaticamente o primeiro estado e todas as
  transições futuras de requisição; `20261020001400` limita transições a uma matriz
  autorizada e exige justificativa para cancelamento.
- A migração `20261020001500` bloqueia saídas acima do saldo para usuários não
  administradores e serializa a verificação por paciente/produto/custódia.
- Ainda não há UI administrativa completa para usuários, pacientes e catálogo; as tabelas/RLS e contratos incrementais estão preparados.
- Não foi executado teste E2E autenticado nem uma suíte RLS com múltiplos usuários reais nesta rodada; o reset/lint local validou a aplicação das migrações, não substitui esses testes.
- A importação foi validada quanto a schema, funções e contrato da API, mas ainda não foi executada com usuários autenticados reais no ambiente local.
- A regra confirmada de negócio permite saldo negativo somente para administrador
  global, com justificativa e auditoria; demais perfis são bloqueados.
- A tentativa de aplicar o banco remoto em 20/10/2026 foi bloqueada por HTTP 403 do
  Supabase CLI (`DbConfigLoginRoleStatusError`). Nenhuma migração remota foi executada.
- A Vercel possui as quatro variáveis esperadas em Production e Preview. A página de
  produção respondeu HTTP 200 e o deployment ficou `Ready`, mas as migrações
  `20261020001300`–`20261020001800` continuam pendentes no banco remoto.
