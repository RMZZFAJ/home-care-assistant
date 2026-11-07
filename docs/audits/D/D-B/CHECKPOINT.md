# Checkpoint D-B

## DB.0 — autoridade, baseline e sequência

Ordem integral lida antes de intervenções. Meta persistente ativa. Base local e
GitHub: `aa9f168a790e1d1730f3134314132ac65fba6b14`, árvore limpa, branch
`feat/phase-d-implementation`, PR #7 OPEN/Draft, sem merge. Identidade CLI
Supabase fixada: RMZZFAJ, projeto `qwfrqychokvhdzakibid`, ACTIVE_HEALTHY,
PostgreSQL 17.11. CLI 2.121.0; Node exigido 24.22.0 encontrado e selecionado
por PATH da invocação, npm 11.21.1. Node padrão 24.13.0 não será usado para
implementação/validação. Nenhum segredo é copiado para este pacote.

CI `42307754118` do SHA aa9f168: validações Ubuntu/Windows, banco, Chromium,
Mobile Chromium, WebKit e agregado aprovados. SonarCloud do mesmo SHA ERROR:
Reliability D e Security B. Conector Sonar recusou credencial; API pública e
annotations GitHub permitiram identificar sete apontamentos. São três bugs
de UI (ordenação de datas e tipo explícito de botões) e quatro apontamentos
de resolução de executáveis por PATH em ferramentas. Triagem/correção ainda
pendentes; nenhuma regra ou Quality Gate foi desabilitado.

Vercel production READY permanece no SHA `8ec979aac340bbc19ec64288bf0acf3abea4711a`
(master/PR6). Inspeção não é deploy, liberação ou homologação. Compatibilidade
dos consumidores publicados integra o preflight anterior a qualquer migration.

Matriz C9 canônica: 36 D3, 8 D3/D4, 25 D4 e 6 D5 = **75**. Nome efetivo da
matriz complementar: `C9_GAP_AND_DECISION_MATRIX.csv`. A matriz D-B conserva as
colunas C9 e acrescenta rastreabilidade de implementação e prova. Nenhum
critério foi aprovado nesta reconciliação. Complementos da ordem têm IDs D-B.

Sequência verificável:

1. Reconciliação de contratos, baseline, critérios, CI e Sonar: em andamento.
2. Preflight, backup verificável e aplicação remota D-A: concluídos em DB.1.
3. D3, consumidores reais e contraprovas: em execução a partir de D3.1.
4. D4, fidelidade, emissão, PAdES-B-T interno e verificação: não iniciado.
5. D5, PWA, push e avisos internos: não iniciado.
6. Base operacional de backup/recuperação/monitoramento: não iniciada, salvo
   ferramentas necessárias ao backup de preflight.
7. Consolidação técnica e CI do candidato: não iniciada.
8. Preflight e aplicação remota D-B: não iniciada.
9. Encerramento documental/PR Draft: não iniciado.

Decisões ordinárias seguem a ordem vigente. Exigências externas bloqueiam
somente os ramos dependentes; nenhum estado pending se converte em PASS por
decurso de tempo. Commits/pushes serão incrementais e provas identificam seu
SHA e eventual árvore suja.

## DB.1 — backup e preflight remoto D-A

Reconciliação publicada em `0c5d414`; PR7 continua OPEN/Draft. Criados
arquivador cifrado, verificador de Storage, comparador de histórico e probe de
restore isolado, necessários ao preflight. 18 testes dirigidos passaram,
incluindo consumidores de preservação existentes; lint dos fontes passou.
Tipos dirigidos passaram após configurar explicitamente --ignoreConfig e
--types node exigidos pela CLI TypeScript 6 ao selecionar arquivos; falhas
anteriores eram da invocação do instrumento, sem alteração do produto.

Backup final e suas qualificações estão no [relatório de migrations](MIGRATIONS.md).
Restauração real verificou 122 tabelas, FKs, 29 objetos e 28 hashes de PDF;
oito migrations passaram na cópia. Não é restore operacional completo D6,
medição de RTO/RPO produtivo ou cobertura de segredos externos.

Histórico remoto 113/113 confrontado por SQL; nenhum drift de conteúdo. Catálogo
e grants coincidem sob as duas qualificações documentadas. Consulta imediata
anterior preservou 8 usuários, 12 documentos, 145 eventos e 29 objetos, com
alterações apenas nos dois controles do cron. Jobs remotos não foram pausados.

Os quatro apontamentos Sonar de PATH passaram a resolver Git/Docker em locais
fixos de sistema no coletor e barreiras de concorrência. A suíte de preservação
existente e contraprova de Git injetado no PATH passaram. Um caso Auth real
exercitou os dois caminhos de barreira (advisory e FK/perfil), incluindo a
revogação observada durante espera, e passou após test:db:prepare sem reset.
Verificação Sonar do novo SHA ainda é necessária. Três apontamentos de UI
permanecem pendentes. Dois erros de lint no teste novo foram corrigidos no
próprio teste (nome reservado module e throw em finally), sem reduzir regras.

O fluxo oficial aplicou as oito pendências: remoto 113→121. Pós-verificação
confirmou dez seções de catálogo idênticas e uma constraint condicional
qualificada; zero mudança inesperada nos digests das tabelas anteriores. Usuários,
documentos, eventos, movimentos e Storage preservados. Nenhum reset, seed, Vault,
Auth config, cron ou deploy foi alterado. [Evidência por arquivo](INITIAL_REMOTE_MIGRATIONS.json).
D-B continua em execução; início de D3 está liberado pelas dependências técnicas.

## D3.1 — erro de consulta, intenção incerta e página não encontrada

Base publicada4315eb9. API cliente distingue consulta e comando também em
timeout, rede, abort e resposta JSON indecifrável. Erro de leitura orienta
reconsultar a seção; escrita sem resposta verificável conserva status técnico0
e estado incerto, inclusive quando um proxy apresenta400 após commit. Não se
limpa a intenção como se houvesse recusa comprovada. Método HTTP explicitamente
informado é respeitado mesmo sem payload. Respostas HTTP válidas preservam
código, status e correlação.

SQLSTATE42702 recebe INTERNAL_ERROR500 seguro antes da classificação por texto.
Ambiguidade legítima do catálogo mantém409. Resposta e log não expõem coluna,
SQL ou payload privado. Passaram28 unitários/API, incluindo17 casos de transporte
e11 guards; lint e tipos passaram. O typecheck geral local foi justificado pela
mudança transversal do cliente HTTP e nova convenção Next/configuração.

404 público em português usa global-not-found conforme guia Next16.4.2 instalado,
com flag experimental específica: evita depender do shell/contexto autenticado
para um endereço que não existe. Heading/main, título próprio, noindex, CTAs,
teclado e320/390/768/1440 conferidos nos três projetos. API sem sessão permanece
401; outra tarefa autenticada como profissional recebeu403 e preservou o nome
do paciente. Nada disso libera dados privados ou modifica autorização.

Dez casos browser distintos aprovados entre rodadas: recuperação GET/save nos
três projetos, 404 nos três,403 Auth Chromium e os consumidores existentes de
cadastro por convite, preferência e calendário. Primeira rodada:6/9; os três
404 falharam no coletor que exigia título único. O coletor agora aceita título
esperado explícito e conserva o default e todos os asserts anteriores. Recheck
somente404:3/3. A contraprova403 nova omitia isDevelopment obrigatório e recebeu
400 de validação; corrigido somente o payload de fixture, recheck1/1. Não houve
redução de regras, force click, sleep arbitrário ou ampliação de timeout.

A captura do resultado recuperado foi repetida em Chromium após fixar scroll0:
o primeiro full-page conservava a posição sticky do scroll anterior. Captura
anterior preservada; a nova mostra título, revisão2 e texto mantido. Capturas
390 do resultado e do404 mobile foram inspecionadas. Axe e geometria passaram;
isso não é homologação humana/AT/aparelho. Logs d3-request-first,
d3-public-404-recheck, d3-context-and-capture e d3-authorized-denial-recheck e
contraprovas ficam em output/playwright/phase-d. Fontes permaneceram estáveis
em cada runner, sem suíte mutável de banco em paralelo.

Os três apontamentos UI originais foram tratados, mas CI/Sonar do próximo SHA
continuam independentes. [Triagem S4790](SONAR_TRIAGE.md) documenta checksum
legado, controles fortes independentes e credencial do provedor indisponível.
Não se declara Sonar aprovado. Listas/administração, demais rascunhos/estados,
guias e critérios compartilhados ainda exigem seus próprios incrementos.

## D3.2 — propostas, comparação e recuperação administrativa

Base publicada3d9afdf. A consulta de governança passa a filtrar antes de paginar,
com ordem created_at/id determinística, total, páginas limitadas, busca por
referência/conteúdo e estados distintos. O percurso inicial mantém propostas
aguardando aprovação e convites aprovados aguardando aceite. Filtros ficam na
URL. Nenhuma leitura decide proposta, cria vínculo ou concede capacidade.

As duas entradas HTTP conservam chave e versão da intenção. O alias /api/admin
deixa de inventar chave/versão a cada envio. O banco compara também a versão
original; conteúdo/versão diferentes conflitam, e uma versão nova exige revisão
explícita. A revisão aguarda a leitura autoritativa antes de liberar outra ação.
Resultado incerto congela o pacote. Reenvio recusado ou JSON200 sem confirmação
reconhecível conserva a incerteza da primeira tentativa. Falha no GET posterior
a um resultado válido informa ação confirmada e consulta falha, separadamente.

Cinco tipos têm comparação em leitura, autor, referência e versões. Nomes de
pessoas e do catálogo são resolvidos pelo modelo autorizado. Herança de
capacidade identifica a regra da função; ausência de valor específico fica
explícita. Tipo/campo desconhecido não é aprovável. Não há textarea de payload.
Convite já aprovado mantém a reemissão explícita que invalida o segredo anterior.

Foram criadas quatro migrations incrementais, apenas locais: governança,
compatibilidade, transição própria e filtro de propostas abertas. Os arquivos
anteriores não foram reescritos. Revalidação após esperas é mantida. A exceção
estreita para alteração deliberada do próprio vínculo exige sessão válida,
assurance, contexto selecionado, resultado aplicado e correspondência exata
da linha modificada; a proteção do último administrador continua obrigatória.
As duas possibilidades de transição própria passaram com Auth real. A hipótese
foi antes reproduzida e preservada; diagnóstico transacional sob proprietário do
banco foi somente investigação, separado dessa prova Auth.

Oito testes Auth distintos passaram, com 51 registros, duas identidades
administrativas, concorrência, conflito, negativas de escopo/grants, dois pontos
de espera observados, seis operações administrativas e convite aguardando aceite.
Vinte e sete casos unitários passaram. Tipos e lint dos fontes afetados passaram.
Os ensaios usaram a stack existente em54321/54322, dados fictícios e nenhum reset.

Os nove casos novos de browser foram aprovados entre as rodadas dirigidas nos
três projetos. Permanecem as contraprovas iniciais: botão de recuperação herdava
fieldset disabled; select excedia320px; fixture de negativa exigia403 para um
UUID inexistente cujo contrato é404. O último foi substituído por outro paciente
real da fixture, com referência própria, negado pela RLS sem expor conteúdo.
O botão passou para fora do fieldset bloqueado; regras de acessibilidade e
largura foram preservadas. A aprovação real conserva requestId/versão e torna
as demais propostas antigas não aprováveis por conflito.

A rodada dos consumidores existentes também revelou convite escondido pelo
filtro pending e liberação prematura antes da leitura vigente após conflito.
As duas causas foram corrigidas no produto, sem alterar o oráculo dos convites.
O consumidor de duas sessões também comprovou um fechamento tardio sobre editor
aberto depois da gravação anterior: agora o retorno só encerra o editor da própria
ação. Recheck dirigido desse consumidor passou, incluindo preservação de9,
revisão explícita para10, foco no acionador, recuperação da mesma alteração de
notificação e compatibilidade dos demais horários. Os três consumidores existentes
passaram. Capturas, logs e falhas conservados em output/playwright/phase-d; cartão
de comparação em390 inspecionado. Não equivalem a aprovação
humana, AT ou aparelho físico. O restante de D3, D4, D5 e a base operacional
continua em execução; aplicação remota final D-B ainda não iniciada.

O responsável adiou expressamente configuração e tratamento específico do
SonarCloud para depois de sua configuração adequada. [Complemento da ordem](OWNER_AMENDMENTS.md)
preserva a instrução e marca OWNER_DEFERRED_SONAR_CONFIGURATION. Isso não declara
o provedor aprovado nem adia CI funcional, testes ou implementação D-B.

## D3.3 — histórico alcançável e limites explícitos de leitura

Base publicada b7c4f30, PR7 Draft. Migration incremental
20261107022731_phase_d3_complete_scoped_history.sql aplicada somente no projeto
local existente, sem reset. Local126/remoto121. O modelo documental original
foi mantido atrás de um limite validado: defaults1/20, página até100000,
tamanho1–100 e recusa explícita de NULL. O nome anterior não é executável por
authenticated. Contraprova anterior preservada: p_page=NULL retornava sucesso.
Após a correção, Auth real recusou NULL/fora do teto, preservou defaults e
contagem/ordem; a consulta não mudou documentos nem movimentos.

Auditoria troca o corte100 por total, paginação, período civil de São Paulo,
busca por referência de evento/recurso e filtros. A mesma capacidade audit.read
é exigida na API e RPC, inclusive quando delegada a profissional. Não se concede
leitura clínica em modo global; outro paciente, revogação, anônimo e helper
antigo continuam negados. Predicado por paciente da consulta anterior foi
preservado, sem abrir grants de tabela/RLS. Metadata continua no contrato HTTP,
e o cartão apresenta texto e rastreio sem editor de payload. Nome da pessoa é
rotulado como cadastro atual, sem inventar snapshot histórico.

Foram usados201 eventos históricos sintéticos num paciente fictício novo, com
empates de timestamp para conferir a ordem created_at/id. Não são prova de
convites realmente enviados. Onze páginas e as duas referências conferiram com
um oráculo SQL independente; períodos, vazios, limite100 e escopos passaram.
Três testes Auth reais aprovados. Dezesseis unitários de histórico e14 guards
de API passaram, total30 casos dirigidos. Tipos/lint afetados passaram.

Na primeira rodada browser,2/6: os três testes de consulta chegaram à contraprova
de HTTP inválido, que revelou ZodError de query classificado como500; um teste
Chromium também mostrou CTA de repetição removido durante reconsulta. Agora
parseQuery converte somente input de consulta inválido para400 seguro. Schema
inválido de resultado interno continua500 no controle unitário. A última falha
da mesma seleção permanece visível durante atualização, sem virar vazio.

Recheck dos seis casos afetados:6/6 nos três projetos. Abrangem201 IDs em onze
páginas, referência, reload/filtros, período, respostas inválidas, atraso,503,
vazio200 e B antes de A. O teste adversarial ignora AbortSignal para A, mantendo
Auth/HTTP reais: A vazia tardia não substitui B com201 registros. A retomada foi
sincronizada com o clique real no CTA, preservando o sinal de atualização e
eliminando a troca prematura do modo de transporte no teste. Foco no filtro,
320/390/768/1440 e axe conferidos; cartão390 inspecionado. Primeiras falhas e
logs mantidos em output/playwright/phase-d/d3-history-*. Não houve teste mutável
de banco em paralelo com o runner nem mudança de fonte durante cada execução.

Um erro DATABASE_UNAVAILABLE do sino foi observado no log Chromium do recheck,
correlação02d283f4-3d6f-4b49-aecd-bbecb3ad849a. Esse consumidor não é certificado
por este resultado de histórico; diagnóstico próprio permanece na tarefa C-AC-020.
PostgreSQL registrou dois statement timeouts na mesma janela, às02:47:19UTC;
a relação com a consulta exata ainda requer confirmação. O resumo de diagnóstico
foi reduzido a classes/nomes de funções, sem SQL completo ou claims.
Demais estados, formulários/guias e rascunhos D3 continuam em execução.

## D3.4a — compatibilidade encontrada na CI

A [CI de bd8747b](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/42331578984)
passou validate em Ubuntu/Windows e falhou em dois testes de integração; browser
foi pulado. SonarCloud falhou e permanece OWNER_DEFERRED_SONAR_CONFIGURATION,
sem tentativa de configuração ou aprovação presumida.

balance-shifts dependia de data.definitions, removido pela substituição D3.2
de patient_governance. A nova migration
20261107031505_phase_d3_governance_read_compatibility.sql restaura o campo e
mantém a matriz efetiva também no topo, com a mesma autorização/grants.
Foi criada pelo CLI e aplicada com test:db:prepare somente no projeto local
existente, sem reset: local127/remoto121. O binário instalado permanece2.121.0;
a criação do arquivo usou uma invocação temporária npx3.0.0, sem alteração
de versão do binário, stack ou destino remoto. Os demais comandos usam o
binário fixo do projeto.

O segundo teste procurava uma proposta aplicada na página padrão aberta. Foi
direcionado à RPC paginada com status applied e referência da mesma proposta,
mantendo a prova de aceite, estado e vínculos. Não se reabriu o histórico
resolvido na consulta inicial. Recheck local com Auth real:6/6, incluindo os
dois casos que falharam e quatro de governança, autorização após espera e
grants. Log preservado em output/phase-d-work/d3-ci-compatibility-recheck.log;
falha original em ci-bd8747b-failed.log. A CI do próximo SHA ainda deve confirmar
instalação/evolução e suíte completa. Ajustes do sino/central continuam em
andamento e têm validação própria; este checkpoint não os declara concluídos.

## D3.4 — leitura do sino, central, perfil e consumo

Base2865b45. Consulta pessoal de notificações agora exige a seleção revogável
do banco e restringe as duas consultas ao paciente e destinatário, mantendo
RLS/leitura documental. Parâmetro de outro paciente retorna409 e alteração de
contexto durante leitura impede disponibilizar o resultado. Modo global,
inclusive com paciente lembrado no seletor, informa vínculo necessário; não
consulta a caixa clínica. API não converte contagem/dados ausentes em zero.

O probe anterior preservado em d3-notification-query-before.json mediu as mesmas
duas leituras com Auth real no conjunto local retido:973/904ms sem filtro e
20/11ms com filtro, para adminA/global respectivamente. O timeout anterior não
foi reproduzido; esses tempos não comprovam sua causa exata nem representam
SLA em produção. Não foi criado índice por inferência ou alterada a RLS.

Sino e central compartilham leitura validada, cancelamento/seleção, recuperação
e distinção de demora, falha e vazio confirmado. A marcação usa “vista”, separada
da ciência. Contagem zero não aparece antes de consulta válida; resultado
anterior do mesmo escopo é explicitamente rotulado, e perda de autorização
oculta dados anteriores. O sino usa Popover Fluent com foco contido, botão de
fechar e retorno ao acionador. A primeira contraprova de axe encontrou ação
de fundo parcialmente coberta pelo painel antigo. A adaptação modal revelou
uma limitação do helper de teclado, que procurava main oculto. O helper passou
a iniciar no modal ativo e exigir que o Tab permaneça em conteúdo acessível,
mantendo as verificações de sentinela/aria-hidden e todas as regras axe.

Perfil deixa de manter spinner após500 inicial, separa leitura de gravação,
rejeita resposta inválida, recupera por GET e preserva formulário ainda não
salvo durante reconsulta. Modelo aceita dados opcionais/dispositivo ausentes
sem inventar identidade ou instante. Consumo vincula resultado aos filtros e
revisão consultados, oculta vazio antigo durante nova leitura, valida página e
cursor e preserva a geração de paginação contra retorno tardio. Falha não cria
movimentação nem confirma um relato. Estados de Flow/fila administrativa têm
execução separada em C-AC-095; não são certificados por estes testes.

Unitários dos três modelos de leitura:23/23. CI2865b45 aprovou banco, instalação/
evolução e validate Ubuntu/Windows; browsers ainda em andamento na observação.
Essa CI valida a correção de compatibilidade publicada e não o código UI ainda
em validação local. [Manifesto final D3.4](D3_4_EVIDENCE.json) registra17 fontes,
23 unitários e24 casos browser distintos entre rodadas:15 novos e9 consumidores
existentes. Chrome5/5; mobile/WebKit15/16, com falha de teclado do sino mantida.
A hipótese Alt+Tab não resolveu o caso. Tab stops explícitos nos links
corrigiram travessia; foco no acionador clicado corrigiu retorno por Escape.
Diagnóstico local1/1 é DIAGNOSTIC_ONLY. Rodada final com build de produção7/7,
selecionada por lista: sino nos três projetos e os quatro consumidores Chrome
pendentes. C-AC-020 tem comprovação local, sem equivaler a AT/aparelho humano.
Perfil sem dados opcionais e coleções vazias foi transporte HTTP controlado;
os demais resultados consultaram Auth/banco reais. Código do sino não alterou
seen_at/eventos ao apenas abrir, e a falta reportada não gerou movimento.

Captura390 inspecionada, sem conteúdo cortado. Tipos, lint afetado e os modelos
passaram. Fontes ficaram estáveis e não houve suíte mutável de banco em paralelo
com E2E. O modo diagnóstico do runner conserva as guardas, usa Next dev só
localmente e é ignorado na CI; aceite continua build/start. Next dev reformatou
o bloco gerado de AGENTS; apenas sua quebra de linha foi restaurada para MD013,
sem alterar instruções ou reduzir regras. Por orientação do responsável, os
próximos incrementos serão agrupados por fluxo e terão validação conjunta,
conforme [complemento de eficiência](OWNER_AMENDMENTS.md). Outros critérios D3,
D4, D5 e infraestrutura permanecem em execução; remoto final não iniciado.

## D3.5 — continuidade entre sessões, preparação e guias

Base dfdc7de, cuja CI42335739149 terminou SUCCESS em banco, validate Windows/
Ubuntu e três projetos browser. Essa aprovação não valida o candidato posterior.
Local130/remoto121; nove migrations D-B aguardam o lote remoto final autorizado.
Migrations128–130 aplicadas à stack existente com test:db:prepare, sem reset.

Preparação global privada salva antes de criar paciente, retoma em outra sessão,
usa CAS e apresenta comparação integral antes de reter valores locais para nova
revisão. Criação respeita isActive=false, vincula só a administração inicial
confirmada e não concede vínculo ao criador global. Perda de resposta recupera
a mesma intenção sem duplicar paciente. Resumo expõe metadados registrados e
pendências humanas, sem quantidades clínicas ou aprovação de produção.

Guias derivam papel/contexto do banco. Progresso próprio e configuração local
não alteram SCI, documentos ou permissões. O comando vincula expectedScope,
revisão, etapa e escolha; resposta200 de outro contexto não confirma a intenção.
Entrada antiga tornou-se helper privado fechado. Recuperação mantém a chave.

Consumo, Flow e fila administrativa têm casos de duas sessões Auth, com edição
ou conciliação aberta preservada durante atualização. Trocar paciente limpa
dados/seleção e ignora resposta antiga entregue integralmente, mesmo quando o
transporte controlado ignora AbortSignal. Flow tem total/páginas limitadas e
alcança a mais antiga entre101 pendências, conforme ordenação SQL independente.
Ingresso Flow e aviso externo incerto são fixtures SQL locais; não provam Meta,
WhatsApp ou entrega externa. A conciliação incerta permaneceu intocada.

Sete casos Auth finais e cinco unitários passaram. Incluem101 preparações,
CAS concorrente, negativas, grants, replay, responsáveis ativos e rollback após
espera observada em profiles: perder o contexto global não deixou paciente,
vínculo, revisão ou journal parcial. Voltar legitimamente permitiu a intenção.
Erros dos instrumentos actor/whitelist anteriores continuam preservados.

Aceite browser:15/18 na rodada conjunta de produção; os três casos de preparação
foram repetidos e passaram3/3. São18 execuções, seis cenários em cada um dos três
projetos, com quatro larguras/axe em preparação e guia. A primeira rodada errou
a expectativa403: operação inativa retorna PATIENT_INACTIVE/409 sem documento.
Mobile/WebKit preservaram scroll ao redimensionar e deixaram passos parcialmente
sob o cabeçalho. A auditoria por largura agora começa na origem de scroll, com
todas as regras axe mantidas; isso não aprova todo estado rolado/foco da aplicação.
Capturas e contextos da falha foram copiados para output/phase-d-work.

Diagnóstico encontrou drawer visível porém aria-hidden: cleanup substituído pelo
Strict Mode restaurava o acionador durante a edição. Cancelar o frame substituído
corrigiu o caso dirigido. O fallback captura apenas o alvo conectado do efeito
que fecha; consumidores restantes são gate da CI candidata. Preparação confirmada
limpa o erro de comando antigo. Tipos e lint passaram; lint final afetado sem avisos.

[Manifesto D3.5](D3_5_EVIDENCE.json) registra fontes, logs, contraprovas e limites.
C-AC-085/095 têm comprovação local conjunta. C7-AC-006/007 e D-B-AC-004 continuam
parciais: faltam controles próprios de adoção de materiais/abertura física em
GUI-02, delegação local completa e convergência integral dos guias por papel.
Diagnóstico não é aceite. Fontes ficaram estáveis durante cada E2E e não houve
suíte mutável de banco paralela. CI do novo SHA, demais D3, D4, D5, operação e
gates D-C/D6 permanecem pendentes; sem merge, deploy ou liberação operacional.
