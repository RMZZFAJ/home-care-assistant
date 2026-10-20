# Estado completo do projeto

Atualizado em 20/10/2026, após a sincronização final do Supabase e limpeza das branches.

## Identificação

- Repositório: `RMZZFAJ/home-care-assistant`
- Branch de trabalho publicada: `master`
- Projeto Supabase de testes: `home-care-assistant`
- Supabase project-ref: `qwfrqychokvhdzakibid`
- Organização Supabase: `wfaicgnnirwsxzupchwo`
- Região Supabase: `us-east-1`
- Projeto Vercel: `home-care-assistant`
- Vercel project ID: `prj_GwdwNVay81iZ7ltM4Tg5IIXFLGPv`
- Proprietário Vercel: `rmzzfaj's projects`
- URL Vercel conhecida: `https://home-care-assistant.vercel.app`
- Último deploy Production validado: `dpl_2p9FXG8uoVz2WdTn9j8UXremB82w`

## O que foi implementado

- Fluxo de login, logout e proteção server-side com Supabase Auth.
- Botão de login Google e callback OAuth implementados; o provedor ainda depende de configuração no painel Supabase/Google Cloud.
- Autorização por perfil ativo (`admin`, `supervisor`, `professional` e `reader`).
- RLS nas tabelas de negócio.
- Validação de requisições, limites, JSON inválido, duplicidades e idempotência.
- Função SQL transacional `submit_requisition`.
- Catálogo com 29 produtos, unidades corrigidas e aliases.
- Nome canônico atual: `Fosfomicina`.
- Aliases de Fosfomicina: `Fosfomicina (Monuril) 3g`, `Monuril` e `Monuril 3g`.
- Interface responsiva para celular.
- O formulário registra itens, estoque informado e urgência; não existe quantidade de reposição na requisição.
- Etapa chamada `Itens extras`, iniciando sem campos vazios pré-abertos.
- Cartões de produtos inteiramente clicáveis.
- CLI Supabase atualizada e CLI Vercel instalada.
- Compatibilidade com `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e com a chave legada `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Banco remoto de testes

As migrações versionadas até `20261020001700` foram aplicadas no banco local durante a validação. Não houve
`supabase db push` nem sincronização de banco remoto nesta rodada:

1. `20261019000100_initial_schema.sql`
2. `20261019000200_catalog_and_submission_hardening.sql`
3. `20261020000300_update_product_units.sql`
4. `20261020000400_add_product_aliases.sql`
5. `20261020000500_set_fosfomicina_canonical_name.sql`
6. `20261020000600_grant_authenticated_permissions.sql`
7. `20261020000700_restrict_public_data_api_access.sql`

O seed fictício foi aplicado no remoto com autorização explícita para este ambiente de testes.

Estado atual:

- 29 produtos ativos.
- 1 pessoa assistida fictícia:
  `00000000-0000-4000-8000-000000000001`.
- Extensão `unaccent` instalada.
- Função `find_product_by_alias(text)` existente.
- O seed não deve ser usado em produção sem revisão dos dados.
- As branches legadas foram removidas; `master` é a única branch de trabalho.

## Vercel

O diretório local está vinculado ao projeto correto. O arquivo `.vercel/project.json` é local e ignorado pelo Git.

Variáveis configuradas em Preview e Production:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `CARE_RECIPIENT_ID`

`NEXT_PUBLIC_APP_URL` ainda precisa ser configurada com o domínio final antes do deploy definitivo.

Se a extensão da Vercel mostrar `project not found`, confirme que a conta ativa é `rmzzfaj` e que o projeto está no escopo `rmzzfajs-projects`. O vínculo foi regravado com o ID exato do projeto e a CLI confirma:

```powershell
vercel project inspect home-care-assistant --scope rmzzfajs-projects
```

Se o aviso continuar apenas na extensão, recarregue a janela do VS Code e faça login novamente na extensão com a mesma conta da CLI. Não crie outro projeto.

## Usuários e credenciais

Senhas nunca devem ser armazenadas no repositório, em documentação ou em commits.

Foi solicitado um master remoto com o e-mail `renatomazzarino10@gmail.com` e a senha fornecida pelo proprietário do projeto. Também foi preparado um usuário de teste comum `usuario.teste@home-care.test`, com perfil `professional`.

**Atenção:** os registros de teste antigos criados diretamente no schema interno `auth` continuam documentados como inválidos. Não reutilize esses registros sem recriá-los pelo fluxo oficial do Supabase Auth.

O usuário `renatomazzarinocorp@gmail.com` foi criado pelo painel Supabase, confirmado por e-mail e recebeu perfil `admin` ativo em `public.profiles`.

O usuário deve acessar a aplicação com a senha definida no painel Auth. A senha não é registrada neste repositório nem nesta documentação.

Perfis planejados:

- Master: `admin`, acesso ao formulário e administração.
- Usuário comum: `professional`, acesso operacional ao formulário sem privilégios administrativos.

## O que falta concluir

1. Remover os dois registros Auth inválidos de teste, após confirmação explícita.
2. Confirmar login do novo admin pela tela `/login`.
3. Configurar o provedor Google no Supabase e Google Cloud.
4. Criar perfil ativo para novos usuários OAuth.
5. Configurar Site URL e Redirect URLs no Supabase Auth.
6. Cadastrar Client ID/Secret do Google e testar o login OAuth.
7. Testar criação de uma requisição no ambiente remoto.
8. Remover ou bloquear os registros Auth antigos inválidos, após confirmação.
9. Antes de produção, criar outro projeto Supabase sem dados fictícios e separar Preview/Production.

Se a aplicação exibir acesso não autorizado para `renatomazzarinocorp@gmail.com`, use o botão `Sair`, abra uma janela anônima e entre novamente com esse e-mail. O perfil remoto está ativo; uma sessão antiga ou outro e-mail não recebe autorização.

Correção importante publicada no commit `f58b383`: o `proxy.ts` também precisava aceitar `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Sem isso, o login podia ser aceito pelo Supabase, mas a sessão não era renovada corretamente no deploy e a página mostrava acesso não autorizado.

O erro da extensão Vercel mostra um `teamId` diferente do projeto (`team_nK1ZiKkOiazduF3bVY9q3b22` versus o time correto `team_X3JshR4ahuzIk95k6JMAYhq2`). Isso é estado de autenticação/cache da extensão, não erro do deploy. Saia da extensão, entre com `rmzzfaj`, recarregue o VS Code e selecione `rmzzfajs-projects`.

A CLI Vercel foi deslogada deliberadamente para permitir uma nova autenticação limpa. Para publicar a correção:

```powershell
vercel login
vercel link --yes --scope rmzzfajs-projects --project prj_GwdwNVay81iZ7ltM4Tg5IIXFLGPv
vercel deploy --prod --scope rmzzfajs-projects
```

## PowerShell no VS Code

O PowerShell 7.6.7 está instalado e inicia corretamente com `-NoProfile`. O log de 20/10/2026 não indica falha de inicialização: o processo iniciou e foi encerrado depois, quando o terminal da extensão foi fechado ou terminado externamente.

O workspace fixa o executável `C:\Program Files\PowerShell\7\pwsh.exe`, desativa carregamento de perfil para a sessão da extensão e usa `-NoLogo -NoProfile` no terminal integrado. Para aplicar a configuração:

1. Execute `Developer: Reload Window`.
2. Feche terminais antigos pelo ícone de lixeira.
3. Execute `PowerShell: Restart Session`.
4. Abra um novo terminal integrado com `Terminal: Create New Terminal`.

Se o aviso reaparecer, não encerre o terminal chamado `PowerShell Extension Terminal`; ele é usado pelo IntelliSense. Feche somente terminais integrados comuns quando necessário.

## Decisões e itens descartados

- Não foi usado `supabase db reset` no remoto.
- O seed foi levado ao remoto somente porque o projeto foi declarado como ambiente de testes.
- O seed não deve ser aplicado em produção.
- Não foi colocada service role em `NEXT_PUBLIC_*`.
- `.env.local`, `.vercel` e tokens locais não entram no Git.
- O nome canônico é `Fosfomicina`; Monuril é alias, não um segundo produto.
- O projeto não deve criar tabelas automaticamente pela Data API.
- RLS permanece controlado pelas migrações versionadas.
- Postgres padrão foi escolhido; OrioleDB não foi escolhido.

## Comandos principais

```powershell
supabase link --project-ref qwfrqychokvhdzakibid
supabase db push
supabase migration list
vercel link --yes --scope rmzzfajs-projects --project prj_GwdwNVay81iZ7ltM4Tg5IIXFLGPv
vercel env ls
vercel deploy --prod
```

## Validações já realizadas

- `npm run typecheck`
- `npm run lint`
- `npm test` (9 testes)
- `npm run build`
- `git diff --check`
- Migrações locais e remotas conferidas.
- Projeto remoto confirmado como `ACTIVE_HEALTHY`.
