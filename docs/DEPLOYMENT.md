# Deploy

## Pré-requisitos

- Conta Supabase com um projeto remoto criado.
- Conta Vercel com acesso ao projeto.
- Supabase CLI instalado (`supabase --version`).
- Vercel CLI instalado (`vercel --version`).

O Vercel CLI instalado para este ambiente é `64.7.0`. Se o comando não estiver no `PATH` do PowerShell, execute diretamente:

```powershell
& "$env:APPDATA\npm\vercel.cmd" --version
```

## Deixar o banco remoto igual ao local

O repositório usa migrações versionadas; não copie o banco manualmente e não use `db reset` no remoto.

1. Faça login no Supabase CLI:

   ```powershell
   supabase login
   ```

2. Entre na pasta do projeto e vincule o projeto remoto pelo `project-ref` exibido no painel Supabase:

   ```powershell
   supabase link --project-ref SEU_PROJECT_REF
   ```

3. Confirme que as migrações locais estão completas e aplique-as no remoto:

   ```powershell
   supabase db push
   ```

   O comando aplica somente migrações ainda ausentes na tabela de histórico remoto, em ordem. A migração `20261020000400_add_product_aliases.sql` cria aliases e a função de resolução por nome.

   Se `supabase link --project-ref` informar que a conta não tem privilégios, confirme no painel do Supabase que o projeto pertence à organização da conta autenticada no CLI ou aceite um convite de membro/administrador. Não use uma chave de outro projeto e não tente aplicar migrações até o vínculo funcionar.

4. Crie a pessoa assistida e o perfil administrativo no remoto por procedimento controlado. Não execute `supabase/seed.sql` em produção, pois ele contém dados fictícios.

5. Crie o usuário no Auth pelo painel Supabase ou pelo fluxo administrativo. Depois insira o perfil correspondente:

   ```sql
   insert into public.profiles (id, full_name, role, status)
   values ('UUID_DO_USUARIO_AUTH', 'Nome autorizado', 'admin', 'active');
   ```

6. Defina o UUID da pessoa assistida ativa em `CARE_RECIPIENT_ID`. Use o mesmo valor nas variáveis da Vercel.

Para reproduzir localmente, o comando destrutivo é permitido somente no banco local:

```powershell
supabase db reset
```

## Conectar e publicar na Vercel

1. Faça login. Se o comando `vercel` não for reconhecido no PowerShell, use o caminho completo abaixo:

   ```powershell
   & "$env:APPDATA\npm\vercel.cmd" login
   ```

   Para tornar `vercel` disponível nas próximas janelas do PowerShell, adicione o diretório global do npm ao PATH do usuário e abra um novo terminal:

   ```powershell
   [Environment]::SetEnvironmentVariable("Path", [Environment]::GetEnvironmentVariable("Path", "User") + ";$env:APPDATA\npm", "User")
   ```

   Cole somente os comandos dentro dos blocos; não cole as linhas ```powershell ou ```.

2. Na raiz do projeto, associe a pasta a um projeto Vercel existente ou crie um novo:

   ```powershell
   vercel link
   ```

3. Cadastre as variáveis nos ambientes desejados. A chave anon é pública por desenho; nunca cadastre uma service role como `NEXT_PUBLIC_*`:

   ```powershell
   vercel env add NEXT_PUBLIC_SUPABASE_URL production
   vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production
   vercel env add NEXT_PUBLIC_APP_URL production
   vercel env add CARE_RECIPIENT_ID production
   ```

   Repita para `preview` se quiser que previews usem um banco de staging. Prefira projetos Supabase separados para desenvolvimento, preview e produção.

4. Valide e faça o primeiro deploy:

   ```powershell
   npm run lint
   npm run typecheck
   npm test
   npm run build
   vercel deploy --prod
   ```

5. No painel Supabase Auth, configure as URLs permitidas para o domínio Vercel:

   - Site URL: `https://SEU_DOMINIO.vercel.app`
   - Redirect URLs: `https://SEU_DOMINIO.vercel.app/**`

6. Atualize `NEXT_PUBLIC_APP_URL` com o domínio final e redeploy:

   ```powershell
   vercel env add NEXT_PUBLIC_APP_URL production
   vercel deploy --prod
   ```

## Checklist antes de produção

- Migrações aplicadas com `supabase db push`.
- Perfil ativo e pessoa assistida autorizada criados no remoto.
- `CARE_RECIPIENT_ID` aponta para um registro ativo.
- Login, logout e sessão expirada testados.
- RLS validada com usuários de funções diferentes.
- Backups e retenção configurados no Supabase.
- Variáveis configuradas na Vercel sem segredos no cliente.
