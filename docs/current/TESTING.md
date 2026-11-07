# Testes e reprodução

Contrato AS_IS da base funcional `37cb7f85e96e551d6419871f94dd950712e2565b`.
C não executou testes funcionais. D-A iniciou a correção dos instrumentos
de B8: NULL SQL, revisão axe, readiness e proteção de ferramentas/exportação.
O contrato de oráculo PDF foi criado em D0; integração ao renderer permanece
em D4. Resultados por incremento no
[checkpoint D-A](../audits/D/D-A/CHECKPOINT.md); verde parcial não homologa
produto.
Estado e limites: [PROJECT_STATUS](PROJECT_STATUS.md). Planejamento futuro
em [C](../audits/C/README.md); decisões aprovadas não equivalem a
implementação.

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

## Validação proporcional por incremento

O runner coleta os casos com --list antes do build e da criação das chaves
efêmeras. Erro de importação, sintaxe ou seleção termina com falha nessa etapa;
nenhum caso de navegador foi validado por essa coleta. --list explícito consulta
a seleção sem iniciar servidor ou provisionar chaves. Uma coleta válida segue
para o build de produção e a execução normal, com a mesma stack guardada.

Para diagnóstico local dirigido, HCA_E2E_DIAGNOSTIC=true no mesmo runner usa
Next dev e evita reconstruir toda a aplicação a cada hipótese. Verificação da
stack/origem, identidades fictícias e bloqueio de envio externo continuam
obrigatórios. Esse resultado deve ser rotulado DIAGNOSTIC_ONLY e não substitui
o aceite com build de produção. Sem a variável, o runner mantém build/start;
na CI o modo diagnóstico é sempre ignorado. Fontes ficam estáveis durante cada
execução. Consolidar alterações do mesmo fluxo antes da rodada de aceite.

Os comandos gerais acima continuam na CI da PR. Não é necessário executá-los
todos localmente a cada edição e repetir a mesma matriz após cada correção.
Antes de publicar um conjunto coerente, selecionar a evidência que discrimina
o defeito e percorre suas camadas afetadas. Localizar os consumidores do
contrato alterado, inclusive fixtures/seletores existentes; escolher os casos
afetados além dos novos, sem precisar duplicar a suíte inteira:

| Mudança | Evidência local | CI geral |
| --- | --- | --- |
| Regra/contrato | Regressão, negativa e fronteira/API | Checks e unitários |
| Banco/autorização | Preparo, Auth real, RLS e locks | Replay e integrações |
| Fluxo visual | Tarefa, teclado/layout e efeito no banco | Navegadores |
| Documento | Markdown, links e preservação | Checks documentais |

Depois de uma falha, corrigir a causa e repetir seus casos afetados. Uma
formatação, texto ou ajuste isolado não exige novo replay do banco ou repetição
de todos os navegadores. Ampliar a rodada local quando existir uma dependência
transversal, nova hipótese, falha comprovada ou indisponibilidade da CI
necessária; registrar a justificativa. Não diminuir asserções ou desativar
regras para economizar execução.

Registrar comandos/casos realmente executados, falhas intermediárias e limites
no checkpoint/matriz. Consultar a CI por SHA em pontos de entrega, sem polling
contínuo. Check pendente, execução cancelada ou verde de um commit anterior
não validam o novo SHA. A publicação progressiva pode continuar enquanto a CI
trabalha; a conclusão depende da cobertura exigida com resultado próprio.

Exemplos de seleção, conservando os guards do ambiente:

```sh
npm test -- tests/api/delivery-preparation-contract.test.ts
node --test --test-name-pattern="P06 late product FK" tests/integration/delivery-preparation.test.mjs
npm run e2e -- tests/e2e/delivery-preparation.spec.ts --project=chromium
```

Não alterar fontes durante E2E nem disputar as identidades/fixtures com outra
suíte mutável. Replay local conserva as exigências de consentimento e backup
abaixo; aproveitar o job efêmero de CI evita substituir dados locais novamente.

## Banco local de desenvolvimento

No PowerShell deste workspace, use npm.cmd quando repassar flags após --,
por exemplo `npm.cmd run test:migrations -- --replay-local --backup CAMINHO`.
Isso preserva os argumentos para os guards; o shim npm.ps1 observado omitiu
o separador nessa execução. A ausência de consentimento/backup continua
rejeitando replay. Os demais sistemas usam o npm da versão fixada normalmente.

Requisitos: Docker e Supabase CLI 2.121.0. O harness usa o projeto
home-care-assistant neste repositório: API 54321, banco 54322 e Mailpit 54324.
Esse é o mesmo banco utilizado no desenvolvimento. Não cria outro projeto.
O preparo verifica os destinos locais antes de aplicar migrations.

`npm run test:db:sql -- --sql-file service-role.sql` executa uma regressão SQL
com rollback e sem reset. As suítes transacionais operacionais precisam das
fixtures controladas iniciais; não suponha que um banco de desenvolvimento com
documentos já criados possui esse estado. A instalação limpa e o upgrade
legado
da CI usam somente a stack efêmera do job, sem substituir os dados locais.

```sh
npm run test:db:prepare
```

test:db:prepare inicia o ambiente e aplica a cadeia incremental local.
test:migrations **recria os dados desse banco local**: primeiro com a cadeia
completa e depois na versão 019 com fixtures legadas antes do upgrade.
Guarde backup antes de autorizar a substituição de dados a preservar.
Os helpers recusam hosts remotos e selecionam explicitamente o destino local.
Fixtures pausam os jobs hca-operational-lifecycle/hca-notification-worker pela
API cron.alter_job, após reset e upgrade inclusive. Isso evita que cron
consuma a fila ou altere estado durante os controles. Registrar/reconciliar a
situação anterior dos jobs ao encerrar a missão; não reativar destinos
externos por consequência do teste.
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
supabase_db_home-care-assistant, hash real e data válida antes de recriar
dados.
Não renomeie um arquivo qualquer como backup para contornar essas
verificações.

São criadas contas Auth reais fictícias: administradores globais e A/B,
supervisor, profissional, familiar, leitor, revogado, compartilhado e sem
vínculo.
SQL testa políticas e transações. HTTP/RPC testa caminhos diretos e
concorrência,
incluindo a proteção simultânea do último administrador global.

O helper SQL seleciona sessões criadas pela API oficial Auth e seu contexto
explícito. Não fabrica sessões nem deriva autorização do papel global. As
suítes
de banco, MFA e revogação alteram as mesmas identidades de fixture: execute-as
sequencialmente antes do E2E. Não rode essas suítes em paralelo com
navegadores.

A integração V4 verifica ciência independente, necessidade compartilhada,
recebimento parcial, versões canônicas, governança, concorrência do último
administrador local, Realtime privado, agendador, TOTP/AAL2 e Flows de uso
único.
O contrato WhatsApp local testa leitura e confirmação correlacionadas; aprovar
registro local de template nesse teste não representa aprovação pela Meta.

Ao mudar configurações de Auth, use `npm run test:db:prepare -- --restart`.
O comando reinicia somente o projeto local verificado e mantém seus dados.
Confirmação de e-mail e Mailpit permitem testar jornadas sem entrega externa.
As configurações e limites de Auth locais não são aplicados ao remoto pelo
comando de migrations; a configuração remota deve ser verificada
separadamente.

## Navegador

`npm run test:harness` executa somente controles sintéticos, sem aplicação,
banco ou fixtures, nos três projetos. Verifica navegação pronta, tardia e
indisponível; não substitui E2E do produto. A CI executa esses controles antes
do projeto E2E correspondente. O helper aguarda a variante real do shell,
sem escolher o menu móvel durante a hidratação desktop.

Axe mantém violações como falha e anexa JSON com incomplete por regra,
superfície e estado, além de anotação de revisão pendente. Incomplete não é
violação automática nem conformidade: exige revisão específica, separada de
aceite humano de foco/reflow/AT. Asserções SQL compartilhadas têm controles
que reprovam quantidade incorreta, NULL e linha ausente.

```sh
npx playwright install chromium webkit
npm run e2e
```

O runner injeta credenciais exclusivamente da stack local verificada,
desabilita
envio externo e gera build separado em `.next-e2e`. Inicia servidor em 3100,
sem reaproveitar processo desconhecido. Os projetos Chromium desktop, Pixel 7
e WebKit/iPhone 13 usam dados fictícios. Relatórios não são versionados;
traces ficam desabilitados para evitar registrar credenciais de Auth.

A extensão Playwright do VS Code pode descobrir testes sem banco ou variáveis
do runner. Ao executar, tanto o servidor quanto o globalSetup verificam a
stack
local e substituem qualquer configuração herdada por credenciais locais, com
envio externo desligado. O servidor compila o build isolado antes de
iniciá-lo.
Descobrir testes não inicia servidor, autentica usuários ou modifica o banco.

Os IDs ficam em supabase/.temp/hca-fixtures.json. A senha aleatória de cada
workspace fica em supabase/.temp/hca-test-credentials.json. Ambos são
ignorados
pelo Git e excluídos do upload Vercel. O provisionamento usa Auth Admin
oficial;
não inserir hashes de senha manualmente. A conta profissional local recebe
telefone fictício confirmado via Auth Admin para testar autorização de
desafio;
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
O check agregado database-and-browser exige sucesso no banco e em todos os
jobs browser. iOS divide a coleção completa em shard1/2 e shard2/2, cada um
com stack própria e execução serial; Chromium/mobile mantêm shard1/1.
A união das partes precisa cobrir toda a coleção sem interseção. Não há
exclusão de testes nem uso do Supabase remoto na suíte.

Suítes web comuns usam serviceWorkers=block para interceptações HTTP chegarem
ao consumidor. pwa.spec.ts habilita workers reais nos três projetos e verifica
manifesto, cache estritamente público, navegação offline, atualização com duas
abas, preservação e recuperação do mesmo rascunho. O fault adapter do contrato
público é explícito e limitado; não simula Auth, persistência ou estado do worker.
Convite controlado não comprova instalação física no sistema operacional.
Ver [contrato e limites PWA](../audits/D/D-B/PWA_RUNTIME.md).

O workflow agrupa execuções por PR e cancela as superadas quando chega outro
commit. O SHA mais recente continua executando a matriz inteira. Pushes na
master usam grupos únicos por run_id; não são cancelados por essa regra.
Cancelamento e execução pendente não aprovam um SHA. A configuração usa a
[concorrência nativa do GitHub](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency).

## Linux local

scripts/verify-linux.sh roda dentro de container Node 24.22.0 com o
repositório
montado somente para leitura em /workspace. Copia código para área temporária,
exclui .env, Git, caches, .private, .venv e arquivos de backup conforme
scripts/verification-export.exclude. Teste de sentinelas usa a mesma lista,
sem copiar conteúdo privado do workspace. O objetivo é instalação limpa,
lint, tipos, testes e build; não equivale à homologação de produção.

Ferramentas de relatório reutilizáveis exigem `--output-dir` explícito e
registram SHA/data em RUN_METADATA.json. Saída no repositório usa output/ ou
docs/audits/D/; destinos históricos são recusados. Arquivo existente só pode
ser substituído com `--overwrite`. Verificador legado que cria fixtures
exige `--replay-local --backup` antes de provisionar. A ferramenta combinada
Meta está bloqueada até a separação inspect/submit e autorização D7.

## Documentação e auditorias datadas

Para C/editorial, validar Markdown, links, matrizes e hashes. Não executar
probes históricos para atualizar relatórios: podem alterar fixtures ou
sobrescrever evidência. Caminhos anteriores ficam no mapa de relocação;
scripts datados exigem adaptação/guardas antes de reutilizar em D0.

## Rascunhos privados REQ/BAL

A suíte Auth private-drafts cobre save parcial, privacidade, CAS, descarte e
consumo nativo; private-bal-reference cobre snapshot de ledger sem efeito,
conflito após espera e perda real de sessão. session-deadline observa expiração
Auth durante locks. Execute somente o arquivo/caso afetado após preparo local.
O runner scripts/run-e2e.mjs com tests/e2e/private-creation-drafts.spec.ts cobre
dois aparelhos, conflito5/6/7, respostas perdidas de save/descarte, arquivo
ready preservado, BAL legado e reconto. Os consumidores anteriores em
requisition-observation.spec.ts, presentation-provenance.spec.ts e
workflows.spec.ts mantêm os contratos de observação, conversão e histórico.
Replay limpo/legado e suites gerais permanecem nos jobs da CI por SHA;
novos casos dirigidos não exigem repetir localmente suites gerais inalteradas.

## Datas escolhidas e BAL em janela nova

selected-shift-dates.test.mjs cobre12 datas em45 dias,19–07 por instantes UTC,
tipo obsoleto, conflito reservado com rollback integral, corte, proposta após
corte e perda real de sessão durante espera. bal-new-window.test.mjs cobre
contadoras1/2, revisões independentes e ajuste físico causal.
selected-dates-new-window.spec.ts verifica calendário entre meses, retorno da
revisão, exceção/corte e reconto; schedules.spec.ts e
schedule-decisions.spec.ts preservam consumidores anteriores.

Nos painéis, overflow apenas do documento não detecta recorte interno. A
tarefa de datas confronta os limites horizontais de campos/dias com o drawer e
exige números em uma linha, além de axe e inspeção da captura. Essas
verificações não substituem avaliação humana de AT.

## Pares finais D-A

requisition-pdf-personal-receipt.spec.ts confronta extra M1/SCI/PDF antigo e
novo, expedição ENT em leitura com duas linhas e aceite2/3 pessoal, retirada
familiar5→4 e programação BAL sexta/noturno/fuso. Emissões intermediárias
legítimas não são duplicação: cada versão solicitada precisa de registro,
caminho e SHA próprios. O arquivo anterior precisa permanecer idêntico.
return-transfer-equivalence.test.mjs compara seis pacientes em três pares de
percursos: integral, parcial e consumo anterior com inativação antes do aceite.

Consumidores anteriores são selecionados conforme componente alterado.
Rechecks repetem somente falhas/caminhos afetados. Checkpoint preserva as
falhas de fixture/oráculo e a correção real de foco; não se reduz axe, grants,
RLS ou asserção material para obter verde. Clean/legado e suítes gerais ficam
na CI por SHA. Testes locais não atestam AT/aparelho/provedor/restore.

O audit anexa geometria dos elementos quando há transbordamento horizontal;
asserções de largura e axe permanecem obrigatórias. Para seleção pontual por
--test-list, os caminhos são relativos a tests/e2e; conferir --list e exigir a
contagem esperada antes de executar. Saída0 com zero casos não é evidência.

## Web Push e compatibilidade PWA

tests/integration/web-push.test.mjs usa Auth real local para isolamento,
reconsentimento, produtor REQ nativo, concorrência, leases e revogação. O runner
oficial prepara a stack existente; não execute a suíte junto com E2E mutável.
O SQL de grants pode ser dirigido com
node scripts/test-migrations.mjs --sql-only --sql-file service-role.sql.

tests/e2e/web-push.spec.ts usa worker/API/banco reais, com capacidade nativa e
transporte explicitamente controlados. O runner força envio externo desligado e
gera VAPID efêmero protegido. Esses casos não comprovam permissão do sistema,
recebimento físico ou provedor. Unidade confere RFC8291 e VAPID independentemente
com Node crypto, além dos controles de cache/ativação e payload genérico.
As coortes, contraprovas e fontes congeladas constam em
[D5.2](../audits/D/D-B/D5_2_EVIDENCE.json). CI do novo SHA permanece obrigatória.

## Lembretes legados e backup

legacy-reminder-scheduler.test.mjs cobre101 configurações elegíveis em três
rodadas, downtime, backlog, fonte alterada, falha isolada, rollback e BAL moderno.
notice-reference.test.mjs e requisition-scheduler.test.mjs são consumidores
compatíveis obrigatórios desse produtor; o lote dirigido passou16/16 com Auth
real/serviço. Não há mudança de interface que exija novo build E2E local.

backup-retention.test.mjs usa filesystem real/crypto e calendário controlado;
backup-snapshots.test.mjs acrescenta SQL real e mutantes de versão/causa/negócio.
O lote final9/9 não é47 dias de operação nem perda do computador. CLI/captura e
restore reais são evidência separada em [OPS.2](../audits/D/D-B/OPS_2_EVIDENCE.json).
Não executar testes mutáveis de banco junto ao E2E. Agenda e fornecedor externo
permanecem desligados; captura/probe não fazem reset ou importação de roles.
