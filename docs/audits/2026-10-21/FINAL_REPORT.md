# Relatório da consolidação

Este relatório reúne as entregas e os limites comprovados da cadeia final de
35 migrations. O [PR #1][pr] publica os blocos lógicos, e o
[CI completo][ci] aprovou o código 8fe30fe em Windows/Linux e banco/navegador.
O estado posterior do merge e da implantação é rastreado no PR.
Os resultados por requisito ficam na
[matriz](../2026-10-20/REQUIREMENTS.csv), com critérios completos preservados em
[SOURCE_REQUIREMENTS.json](../2026-10-20/SOURCE_REQUIREMENTS.json).

Dos 74 requisitos consolidados, 72 têm aceite individual registrado. AUTH-04
e NOT-06 dependem de homologação externa. A preparação de IA está aceita
somente como contratos e limites,
sem declarar um agente completo implementado.

## Preservação e escopo

A intervenção começou em fc04de4, com os commits locais 7f79ebb e fc04de4
preservados. A referência publicada inicial era 408bf68. O snapshot 527cef4,
publicado pelo usuário para visualizar a Vercel, permanece na branch anterior
e na tag local checkpoint/home-care-user-preview-527cef4. A consolidação em
codex/home-care-consolidacao permite publicar blocos lógicos sem descartar esse
conteúdo ou forçar a reescrita da branch anterior.

Em 21/10, o usuário autorizou atualizar os bancos local/remoto, publicar commits
lógicos e abrir PR/merge quando os checks confirmassem prontidão. Foram mantidos
os limites: sem reset remoto, fixtures remotas, envios reais nos testes ou
reescrita de migrations aplicadas. Backups e credenciais ficam fora do Git.

## Implementações e correções

- Autorização: papel por vínculo separado da identidade global; revogação
  efetiva; administrador local restrito ao próprio paciente; proteção
  transacional do último administrador global, inclusive sob concorrência.
- Catálogo: definição canônica por paciente, IDs estáveis, propriedade de
  itens exclusivos, FKs compostas, aliases e inativação. Unidade com histórico
  exige substituição explícita; não reinterpreta saldos anteriores.
- Requisições: contrato sem quantidade solicitada; protocolo e hash no banco;
  intenção normalizada, rollback e idempotência concorrente; snapshots do
  comprovante e recuperação da mesma tentativa após resposta perdida.
- Histórico: leitura de todo o paciente autorizado, filtros, paginação,
  transições justificadas, notificações e impressão dos dados persistidos.
- Estoque: ledger por paciente/produto/FAMILY/CARE_TEAM; transferências atômicas,
  compensações justificadas e bloqueio de saldo insuficiente. A exceção negativa
  é ajuste global extraordinário confirmado, nunca saída comum liberada.
- Inventário: referência/revisão estáveis, contagem explícita, divergência,
  revisão, rejeição, recontagem, cancelamento e aprovação idempotente.
- Administração: pacientes, vínculos locais, convites, catálogo, alertas,
  destinatários, auditoria e importação revisada. Novos usuários criam a própria
  conta Auth e confirmam e-mail; administradores não recebem suas credenciais.
- Importação: protocolos físicos 1–11, relatório por registro, idempotência e
  rollback de linha inválida. Dados desconhecidos permanecem ausentes; extras
  livres não recebem associação inventada; não há mensagens retroativas.
- Mensagens: outbox individual com lease, backoff, concorrência e revogação
  revalidada; aceitação, entrega, leitura e incerteza distintas. Retry incerto
  exige confirmação e auditoria também na RPC. Adaptador oficial e webhook
  assinado testados com transporte falso, sem homologação externa presumida.
- API e UI: contexto revalidado, limites de corpo, origem controlada, erros
  seguros e correlação; catálogo central com categoria, ação recomendada,
  status e retry; navegação por domínio, feedback e estados de rede.
  Prévias Vercel aceitam somente hosts exatos de metadata confiável.
- Ferramentas: Node/npm e dependências fixados após verificar compatibilidade;
  instalações limpas Windows/Linux e novos gates de banco/navegador em CI.

O guard impede reintroduzir o conceito removido em código ativo e novas
migrations e confere os hashes das primeiras 19. Quantidades de movimentos e
contagens continuam pertencendo ao domínio de estoque. A sequência emite
HC-000012 no banco limpo e aceita crescimento além de seis dígitos.

## Banco e identidade Supabase

Uma instalação Windows do CLI foi identificada. A conta padrão era diferente
daquela com acesso ao projeto. O perfil nomeado, home externo e wrapper com
pin de identidade/projeto resolveram essa seleção. Novos processos, doctor e
oito testes negativos validaram a proteção. Não se declarou bug de Windows,
Linux ou instalação duplicada sem evidência.

O banco de desenvolvimento home-care-assistant é o único alvo da suíte,
em API 54321/PostgreSQL 54322. O harness verifica container, projeto e origem
antes de comandos mutáveis. Replay local exige backup e consentimento explícito.
A stack auxiliar antiga foi parada e deixou de ser pré-requisito.

Os 35 arquivos, até a versão 034, foram aplicados local e remotamente. Backups
públicos e SHA256, dry-run, consulta agregada antes/depois e comparação de
metadados estão na [execução](EXECUTION.md). Os registros originais, identificados
pelo backup externo, preservaram seus hashes; o administrador global ativo
permaneceu. O total remoto passou de uma requisição/um item para três/seis por
acréscimos durante a inspeção; isso não identifica sua autoria. Os hashes
totais são diferentes e não substituem a verificação individual do baseline.
Nenhuma origem de dados legados foi inventada.

| Migrations novas | Objetivo |
| --- | --- |
| 020 | Escopo, catálogo, FKs, último administrador e grants |
| 02050 e 032 | Compatibilidade temporária de pgcrypto e remoção da ponte |
| 021 | Intenção, snapshots, estoque, inventário e importação |
| 022–025 | Convites, outbox, propriedade, diretório e revogação |
| 026–029 | Capacidades, cadastro, desconhecidos e alertas por custódia |
| 030–031 | Leitura segura das notificações e retry incerto confirmado |
| 033 | Privilégios mínimos do serviço e fallback do worker |
| 034 | Revogação do default global EXECUTE de PUBLIC |

A comparação final confirmou igualdade de 21 tabelas, 22 policies, 60 funções,
119 constraints, 48 índices, 19 grants de clientes e quatro default ACLs.
As correções de service_role e PUBLIC foram aplicadas e testadas: não há
privilégios diretos de tabela/sequence do serviço nem EXECUTE público nas funções
da aplicação; as cinco RPCs do worker/webhook têm autorização explícita.
Os hashes de funções normalizam somente finais de linha CRLF para LF.

## Evidências de validação

| Procedimento | Resultado comprovado |
| --- | --- |
| npm ci e peers | Windows e Linux aprovados com lock idêntico |
| check:contracts | 19 hashes históricos e contrato removido aprovados |
| lint, typecheck, test, build | Windows: aprovados; 69 testes unitários |
| test:migrations | Cadeia 35 limpa e 019→034 aprovadas |
| SQL | Seis suítes e caso de search_path aprovados |
| test:integration | Seis testes HTTP/Auth reais aprovados |
| E2E desktop/celular | 32/32 aprovados em rodada única no CI publicado |
| Linux | Instalação, sete checks, 69 unitários e build aprovados |
| Documentação e matriz | Revisadas; aceites individuais e Markdown |
| CI Windows/Linux e banco/navegador | Todos aprovados; run 39697862144 |
| Prévia Vercel | READY; login 200 e contexto sem sessão 401 |

A suíte SQL cobre RLS, grants, associação cruzada, idempotência, estoque,
inventário, importação, convites, alertas e notificações. Os seis testes HTTP
exercitam concorrência entre conexões reais. Testes de provedor com mocks
comprovam somente os contratos locais do adaptador e worker.

A rodada E2E completa teve 29 aprovações e três falhas. Foram corrigidos o
seletor de alerta ambíguo e o foco por teclado da região de estoque; os seis casos
afetados/regressões passaram em seguida, cobrindo desktop e celular. O conjunto
combinado cobre os 32 casos únicos, conforme [E2E_RESULTS.json](E2E_RESULTS.json).
Posteriormente, o CI publicou a rodada única completa de 32/32 aprovações,
sem retries, conforme [CI_RESULTS.json](CI_RESULTS.json).

O Linux foi verificado antes do atributo final de acessibilidade da tabela de
estoque, sem credenciais, conforme [LINUX_RESULTS.json](LINUX_RESULTS.json).
O ajuste posterior passou nos checks Windows pertinentes e na regressão de
navegador. O CI confirmou posteriormente o código final em ambas as plataformas.

O smoke da prévia preservou a proteção da Vercel: a CLI autorizada recebeu
login 200 e SESSION_EXPIRED/401 na API sem sessão da aplicação. Esse teste
HTTP não equivale à homologação de OAuth, SMTP ou mensagens externas.
O merge exige checks aprovados também após o fechamento documental.

## Riscos residuais e dependências externas

- OAuth Google e configuração Auth remota: homologar redirects, confirmação,
  SMTP, convite e recuperação no ambiente externo. Mailpit comprova a jornada
  local, sem provar entrega do serviço remoto.
- WhatsApp: configurar credenciais, template, webhook, destinatários e
  agendamento; homologar a entrega real. E-mail de notificações ainda requer
  adaptador próprio. Não há envio externo ativado por padrão.
- Privacidade/operação: o controlador define base legal, retenção, operadores,
  atendimento ao titular, monitoração e política de recuperação. Os backups
  registrados não foram apresentados como ensaio completo de restauração.
- Dependências: zero advisories no audit de produção; seis avisos altos dev
  derivados de braces sem patch publicado. Padrões são fixos no repositório,
  sem entrada de usuários da aplicação. Risco e override limitado de KaTeX
  estão documentados em [DEPENDENCY_REVIEW.md](../2026-10-20/DEPENDENCY_REVIEW.md).
- IA: contratos e limites preparatórios documentados. Agente autônomo, decisões
  clínicas, organizações e faturamento SaaS não foram implementados.

Esses limites não autorizam classificar a operação externa como homologada
apenas porque banco, API, componentes ou testes locais existem.

## Reprodução e arquivos

O [README](../../../README.md) inicia o desenvolvimento; [Testes](../../TESTING.md)
explica instalação, preparo, backup, replay e E2E. [Implantação](../../DEPLOYMENT.md)
registra a aplicação incremental e as configurações externas. O inventário
[CHANGED_FILES.md](CHANGED_FILES.md) agrupa arquivos criados, alterados e removidos
por motivo; os nomes completos das migrations ficam no próprio inventário.

[pr]: https://github.com/RMZZFAJ/home-care-assistant/pull/1
[ci]: https://github.com/RMZZFAJ/home-care-assistant/actions/runs/39697862144
