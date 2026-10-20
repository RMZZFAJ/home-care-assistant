# Deploy

1. Crie manualmente um projeto Supabase independente e configure Auth.
2. Aplique a migração SQL e revise o seed antes de ambientes compartilhados.
3. Crie o primeiro usuário administrador no painel Supabase e seu registro `profiles` por procedimento controlado.
4. Na Vercel, configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `NEXT_PUBLIC_APP_URL`.
5. Execute `npm run lint`, `npm run typecheck`, `npm test` e `npm run build` antes do deploy.

Nenhuma conta, projeto externo ou segredo é criado automaticamente por este repositório.

