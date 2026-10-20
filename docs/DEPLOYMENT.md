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

   O comando aplica somente migrações ainda ausentes na tabela de histórico remoto, em ordem. Revise especialmente as migrações `20261020000800` a `20261020001000`: elas alteram o contrato de itens, adicionam escopo multipaciente e criam funções transacionais de estoque. Faça primeiro em um projeto local/staging e verifique dependências antes de promover.

   Se `supabase link --project-ref` informar que a conta não tem privilégios, confirme no painel do Supabase que o projeto pertence à organização da conta autenticada no CLI ou aceite um convite de membro/administrador. Não use uma chave de outro projeto e não tente aplicar migrações até o vínculo funcionar.

### Resultado da aplicação em 20/10/2026

O projeto local está vinculado ao ref `qwfrqychokvhdzakibid`. Depois da renovação
da sessão do Supabase CLI, os comandos abaixo foram executados com sucesso:

```powershell
supabase db push --yes
```

Resultado esperado após renovar a sessão:

```text
Remote database is up to date.
```

Na correção do erro `42501` de submissão, a tentativa de executar o novo
`20261020001900_submit_requisition_security_definer.sql` voltou a receber
`DbConfigLoginRoleStatusError`/HTTP 403 antes da execução. Renove a sessão com
`supabase logout` e `supabase login`, confirme `supabase projects list` e então
execute novamente `supabase db push --yes`. A migração transforma a RPC de
submissão em `SECURITY DEFINER`, sem conceder `UPDATE` direto de
`public.requisitions` ao papel `authenticated`.

`supabase migration list` deve confirmar que as migrações `20261020001300` até
`20261020001900` estão presentes no remoto. Não foi usada chave de outro projeto,
`SUPABASE_SERVICE_ROLE_KEY` ou conexão desconhecida.

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

O projeto Vercel `home-care-assistant` está vinculado ao escopo `rmzzfajs-projects`,
com URL atual `https://home-care-assistant.vercel.app`. As variáveis
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`NEXT_PUBLIC_APP_URL` e `CARE_RECIPIENT_ID` existem em Production e Preview.
Os valores não são reproduzidos nesta documentação.

Não publique uma versão que exija migrações ainda não aplicadas. A ordem segura
validada nesta rodada foi:

1. corrigir o acesso do Supabase;
2. executar `supabase db push --yes`;
3. validar Auth, perfil ativo e `CARE_RECIPIENT_ID`;
4. executar as validações locais;
5. executar `vercel deploy --prod` ou deixar o push acionar o deploy automático;
6. verificar o alias `https://home-care-assistant.vercel.app` e testar login,
   histórico e uma operação administrativa autorizada.

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

7. Para habilitar login com Google, em Supabase abra `Authentication > Providers > Google`, habilite o provedor e informe o Client ID e o Client Secret criados no Google Cloud. Adicione como callback autorizado do Google:

   `https://SEU_PROJECT_REF.supabase.co/auth/v1/callback`

   O botão Google já está disponível na tela de login e usa `/auth/callback` para concluir a sessão. O usuário OAuth ainda precisa ter um perfil ativo em `public.profiles`; para contas novas, crie o perfil após o primeiro login.

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
- Consulte [PROJECT_STATUS.md](./PROJECT_STATUS.md) para o estado atual, pendências, decisões e limitações conhecidas.
