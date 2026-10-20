# Auditoria técnica

Data: 20/10/2026

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

## Pendência bloqueada

A aplicação da migração `20261020000700` no Supabase remoto não foi concluída nesta auditoria porque `supabase db push` retornou HTTP 403 ao inicializar o login role. A conta do CLI precisa recuperar permissão de gerenciamento do projeto. Depois disso, execute:

```powershell
supabase link --project-ref qwfrqychokvhdzakibid
supabase db push
```

Confirme com `supabase migration list` que a migração `20261020000700` aparece em local e remoto.

## Riscos ainda existentes antes de produção

- O projeto remoto atual contém seed fictício e deve ser separado de produção.
- Login Google depende da configuração do provedor no Supabase e Google Cloud.
- MFA para administradores, backups, retenção LGPD e revisão final de RLS ainda são necessários.
- Usuários OAuth novos precisam de perfil ativo em `public.profiles`; não existe provisionamento automático.
- O aviso da extensão Vercel é autenticação/cache da extensão em time diferente; a CLI e o projeto correto estão funcionais.
