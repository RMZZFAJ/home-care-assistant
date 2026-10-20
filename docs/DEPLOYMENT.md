# Deploy

1. Crie manualmente um projeto Supabase independente e configure Auth; mantenha o cadastro público desabilitado.
2. Aplique `supabase db push` e revise a migração antes de ambientes compartilhados. Não execute `supabase db reset` fora do desenvolvimento.
3. Crie o primeiro usuário administrador no painel Supabase e seu registro `profiles` por procedimento controlado.
4. Selecione uma pessoa assistida ativa autorizada e configure seu UUID em `CARE_RECIPIENT_ID`.
5. Na Vercel, configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL` e `CARE_RECIPIENT_ID`. Nunca configure service role no navegador.
6. Execute `npm run lint`, `npm run typecheck`, `npm test` e `npm run build` antes do deploy.

Nenhuma conta, projeto externo ou segredo é criado automaticamente por este repositório.
