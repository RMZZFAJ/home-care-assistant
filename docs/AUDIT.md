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

1. Callback OAuth passou a rejeitar destinos externos em `next` e a tratar falhas de troca de código.
2. Página inicial e API passaram a distinguir falha de infraestrutura/autorização de ausência de perfil.
3. API passou a verificar e registrar erros nas consultas de perfil, pessoa assistida, idempotência, catálogo e itens extras.
4. A migração de grants existente foi preservada sem edição retroativa.
5. Foi criada a migração incremental `20261020000700_restrict_public_data_api_access.sql` para remover acesso público/anon às tabelas e funções expostas.
6. O workspace fixa PowerShell 7.6.7 sem carregamento de perfil para reduzir encerramentos externos do terminal da extensão.

## Estado de validação

Passaram localmente:

- `npm run typecheck`
- `npm run lint`
- `npm test` (9 testes)
- `npm run build`
- `git diff --check`

O deploy Production da Vercel foi validado anteriormente como `Ready`.

## Estado do banco remoto

A conta correta foi autenticada no Supabase CLI, o projeto foi vinculado e a migração
`20261020000700` foi aplicada com sucesso. A lista local/remota está sincronizada
com as sete migrações:

```powershell
supabase migration list
```

O projeto remoto continua sendo um ambiente de testes com seed fictício.

## Branches após a auditoria

O estado auditado foi consolidado em `master` e publicado em `origin/master`.
As branches legadas `hardening/home-care-assistant` e
`fix/mvp-hardening-2026-10-19` foram removidas local e remotamente. A partir de
agora, alterações devem ser feitas somente em `master`.

## Riscos ainda existentes antes de produção

- O projeto remoto atual contém seed fictício e deve ser separado de produção.
- Login Google depende da configuração do provedor no Supabase e Google Cloud.
- MFA para administradores, backups, retenção LGPD e revisão final de RLS ainda são necessários.
- Usuários OAuth novos precisam de perfil ativo em `public.profiles`; não existe provisionamento automático.
- O aviso da extensão Vercel é autenticação/cache da extensão em time diferente; a CLI e o projeto correto estão funcionais.
