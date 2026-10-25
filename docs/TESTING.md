# Testes e reprodução

## Qualidade sem banco remoto

Use a versão de Node de .nvmrc e npm de packageManager. npm ci deve funcionar
com o lockfile, sem force ou legacy-peer-deps. O CI testa Windows e Linux.

```sh
npm run check:contracts
npm run lint
npm run lint:markdown
npm run typecheck
npm test
npm run build
```

O guard verifica migrations históricas e o contrato removido no código ativo.
Testes unitários cobrem validação, redirects, limites, erros, snapshots e
worker/provedor com transporte falso. Não utilizam credenciais reais.

## Banco local de desenvolvimento

Requisitos: Docker e Supabase CLI 2.121.0. O harness usa o projeto
home-care-assistant neste repositório: API 54321, banco 54322 e Mailpit 54324.
Esse é o mesmo banco utilizado no desenvolvimento. Não cria outro projeto.
O preparo verifica os destinos locais antes de aplicar migrations.

`npm run test:db:sql -- --sql-file service-role.sql` executa uma regressão SQL
com rollback e sem reset. As suítes transacionais operacionais precisam das
fixtures controladas iniciais; não suponha que um banco de desenvolvimento com
documentos já criados possui esse estado. A instalação limpa e o upgrade legado
da CI usam somente a stack efêmera do job, sem substituir os dados locais.

```sh
npm run test:db:prepare
```

test:db:prepare inicia o ambiente e aplica a cadeia incremental local.
test:migrations **recria os dados desse banco local**: primeiro com a cadeia
completa e depois na versão 019 com fixtures legadas antes do upgrade.
Guarde backup antes de autorizar a substituição de dados a preservar.
Os helpers recusam hosts remotos e selecionam explicitamente o destino local.
O vínculo administrativo do CLI com um projeto remoto não muda o destino
da suíte. Nunca executar reset, fixtures ou E2E no remoto.

balance-idempotency.test.mjs força duas requisições HTTP Auth reais a esperar
pelo mesmo lock, cobrindo criação, revisão e envio com a mesma chave.
balance-scheduler-fairness.sql usa rollback para verificar 101 regimes ativos,
habilitação posterior, deduplicação e os privilégios do cursor privado.
Testes de notificações percorrem lotes limitados para localizar suas fixtures
mesmo quando o ambiente local conserva avisos de execuções anteriores.

Para consentir com o replay, informe explicitamente a operação e um backup
local já gerado, armazenado fora do repositório:

```sh
npm run db:backup:local
npm run test:migrations -- --replay-local --backup CAMINHO_DO_BACKUP
npm run test:integration
```

O primeiro comando gera um arquivo pg_dump em formato custom e seu manifesto
em LOCALAPPDATA/home-care-assistant/backups no Windows, ou no diretório local
de dados do usuário em outros sistemas. Use o caminho impresso como
CAMINHO_DO_BACKUP. A verificação pg_restore --list comprova a leitura do
arquivo; não equivale a um ensaio completo de restauração.

`test:db:clean` usa os mesmos argumentos de proteção. O backup deve ser não
vazio e possuir um arquivo adjacente `<backup>.json` com projectId, container,
sha256 e createdAt. O harness verifica projeto home-care-assistant, container
supabase_db_home-care-assistant, hash real e data válida antes de recriar dados.
Não renomeie um arquivo qualquer como backup para contornar essas verificações.

São criadas contas Auth reais fictícias: administradores globais e A/B,
supervisor, profissional, familiar, leitor, revogado, compartilhado e sem vínculo.
SQL testa políticas e transações. HTTP/RPC testa caminhos diretos e concorrência,
incluindo a proteção simultânea do último administrador global.

O helper SQL seleciona sessões criadas pela API oficial Auth e seu contexto
explícito. Não fabrica sessões nem deriva autorização do papel global. As suítes
de banco, MFA e revogação alteram as mesmas identidades de fixture: execute-as
sequencialmente antes do E2E. Não rode essas suítes em paralelo com navegadores.

A integração V4 verifica ciência independente, necessidade compartilhada,
recebimento parcial, versões canônicas, governança, concorrência do último
administrador local, Realtime privado, agendador, TOTP/AAL2 e Flows de uso único.
O contrato WhatsApp local testa leitura e confirmação correlacionadas; aprovar
registro local de template nesse teste não representa aprovação pela Meta.

Ao mudar configurações de Auth, use `npm run test:db:prepare -- --restart`.
O comando reinicia somente o projeto local verificado e mantém seus dados.
Confirmação de e-mail e Mailpit permitem testar jornadas sem entrega externa.
As configurações e limites de Auth locais não são aplicados ao remoto pelo
comando de migrations; a configuração remota deve ser verificada separadamente.

## Navegador

```sh
npx playwright install chromium webkit
npm run e2e
```

O runner injeta credenciais exclusivamente da stack local verificada, desabilita
envio externo e gera build separado em .next-e2e. Inicia servidor em 3100,
sem reaproveitar processo desconhecido. Os projetos Chromium desktop, Pixel 7
e WebKit/iPhone 13 usam dados fictícios. Relatórios não são versionados;
traces ficam desabilitados para evitar registrar credenciais de Auth.

A extensão Playwright do VS Code pode descobrir testes sem banco ou variáveis
do runner. Ao executar, tanto o servidor quanto o globalSetup verificam a stack
local e substituem qualquer configuração herdada por credenciais locais, com
envio externo desligado. O servidor compila o build isolado antes de iniciá-lo.
Descobrir testes não inicia servidor, autentica usuários ou modifica o banco.

Os IDs ficam em supabase/.temp/hca-fixtures.json. A senha aleatória de cada
workspace fica em supabase/.temp/hca-test-credentials.json. Ambos são ignorados
pelo Git e excluídos do upload Vercel. O provisionamento usa Auth Admin oficial;
não inserir hashes de senha manualmente. A conta profissional local recebe
telefone fictício confirmado via Auth Admin para testar autorização de desafio;
isso não constitui homologação de SMS real.

E2E e análise axe verificam jornadas completas e acessibilidade. Falha de rede
após persistência deve recuperar o mesmo registro. Resultado de provedor real,
OAuth externo e novo run publicado do CI dependem de homologação separada.

Antes da suíte completa, autorize o replay local e execute test:migrations e
test:integration. A importação E2E aloca o próximo protocolo físico disponível
em dados fictícios, preservando protocolos e eventos confirmados anteriores.
Mailpit valida cadastro, confirmação e recuperação sem entrega externa.

## Isolamento na CI

Instalação limpa, evolução legada, SQL/RLS e integrações Auth executam uma vez
no job de banco. Após sua aprovação, Chromium desktop, Pixel 7 e iPhone 13
executam em jobs isolados, com a mesma stack local e provisionamento Auth
fictício em cada runner efêmero. Cada projeto mantém todos os seus cenários.
O check agregado database-and-browser exige sucesso no banco e nos três
projetos. Não há exclusão de testes nem uso do Supabase remoto na suíte.

## Linux local

scripts/verify-linux.sh roda dentro de container Node 24.22.0 com o repositório
montado somente para leitura em /workspace. Copia código para área temporária,
exclui .env, Git e caches e executa instalação limpa, lint, tipos, testes e build.
Não utiliza banco nem credenciais remotas.
