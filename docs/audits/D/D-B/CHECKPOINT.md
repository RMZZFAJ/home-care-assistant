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

## D3.6 — rascunhos COM/ENT e conferência contextual

Base publicada5ab4864. CI42344391368 aprovou banco e validate Windows/Ubuntu,
mas falhou em13 casos browser. Essa CI não valida este conjunto posterior.
Local131/remoto121, sem reset; dez migrations aguardam o lote remoto final.

Migration20261107055526 estende a tabela privada por propósito/alvo sem ampliar
as entradas REQ/BAL. COM/ENT têm slots de criação/revisão; recebimento/divergência
ENT é pessoal e vinculado ao alvo. Novos helpers/entradas seguem grants fechados
e verificação viva de permissão. Save/descarte não emitem ficha nem movimentam
estoque. Confirmar consome a revisão privada com journal e recuperação própria.

A revisão seguida de submit agora ocorre em uma RPC atômica para intenções novas,
mesmo sem draftCommit. Uma falha na segunda etapa reverte essa revisão nova.
Isso não prova o ramo legado em que a primeira etapa já havia sido confirmada;
C-AC-077 permanece parcial e esse ramo precisa de comprovação específica.
COM, ENT e BAL passaram pela
contraprova de trigger local restrito ao documento fictício, com snapshot
independente antes/depois, replay da mesma intenção e conflito de outra segunda
chave. O trigger/helper do instrumento foi removido em finally.

Oito casos Auth distintos passaram entre a rodada inicial7/8 e o recheck1/1.
A falha inicial era instrumento: profissional não possui com.read; a negativa
ficou explícita, e ENT continua verificando ausência de rascunho alheio. Casos
incluem CAS, dois aparelhos Auth, dois alvos ENT, propósito separado, consumo/
descarte, grants, entrada legada fechada e rollback após espera observada com
troca de paciente. Logs d3-supply-drafts-auth-* preservados em output/phase-d-work.

Onze unitários/modelos/API passaram após atualizar expectativas antigas que
limitavam o contrato a REQ/BAL, mantendo negativas de tipos/intenção/alvo.
A rodada de produção passou19/19: cinco cenários novos nos três projetos e
quatro consumidores existentes REQ/BAL em Chromium. Inclui decimal incompleto,
CAS entre sessões, duas entregas independentes, descarte sem recebimento,
200 inválido após emissão real,403 na recuperação, revogação Auth real e
reabertura sem revelar cache. Restaurar autoridade recupera a mesma chave.
Regressões antigas preservaram observação, arquivo ready e reconto único.

A CI5ab4864 revelou a apresentação opcional em páginas operacionais, alterando
posições/áreas de controles. A apresentação agora fica na Visão geral; ajuda
manual permanece disponível. O teste do guia percorre home → tarefa → home
sem registrar progresso/SCI por navegar. Treze falhas exatas da CI mais três
casos do guia e três do formulário privado foram rechecados em produção:
18/19. A falha restante era o seletor spinbutton do consumidor de transferência;
o campo decimal textual agora requer textbox. Recheck dirigido1/1 passou,
conservando autores, quantidades, recuperação e oráculos de estoque/PDF.
Nenhuma regra axe nem asserção de negócio foi removida. São35 casos distintos
aprovados entre as duas seleções e a repetição afetada, com quatro larguras.

[Manifesto D3.6](D3_6_EVIDENCE.json) guarda hashes do primeiro conjunto e do
candidato final, logs e contraprovas. C7-AC-004 tem prova local de slots e alvos.
C-AC-032, C7-AC-005 e D-B-AC-001 continuam parciais: matriz completa de sessão/
24h/troca de usuário, consumidores adicionais e contextos de aprovação/correção/
pedido ainda precisam de implementação ou comprovação. Tipos/lint passaram;
CI do novo SHA e instalação/evolução continuam gates. Não houve fonte mutável
ou suíte DB concorrente com E2E. Remoto final, D4, D5 e operação não iniciados
por este lote; PR segue Draft sem merge ou promoção operacional.

## D3.7 — revisão legada confirmada e submissão pendente

Base publicada10e6111; o banco e validate Windows/Ubuntu da CI42349487904
passaram. Os três browsers ainda estavam em andamento na observação anterior
ao push deste candidato. Essa CI não aprova as fontes novas.

Local133/remoto121, sem reset;12 migrations D-B aguardam o lote remoto final.
20261107070558 acrescenta comprovante mínimo de revisão: evento do próprio
ator, documento, chave, conteúdo, ação e versão originais, sob leitura viva.
Não executa comandos para descobrir se uma etapa foi gravada. A API distingue
REVISION_SAVED_SUBMISSION_PENDING, com confirmedStage tipado e correlação,
sem identidade/chave/payload nos logs. Ausência de comprovante não prova falha.

20261107072253 conserva a versão esperada da revisão original na submissão.
O replay da primeira etapa pode ler uma edição posterior; isso não autoriza
submetê-la. A segunda chave recupera uma submissão antiga já confirmada antes
da comparação de versão. Chave diferente após vinculação continua409.
O formulário preserva as duas chaves, conteúdo e recuperação após recarga/409;
a confirmação usa a versão da intenção, inclusive quando ambas as etapas
legadas já estavam concluídas. Ramo BAL nativo também retém intenção incerta.

Auth final17/17; contratos da API15/15; tipos/lint passaram. Rodada de produção
inicial9/15 revelou ENT409 voltando à etapa0 e um alvo BAL errado no teste.
Corrigidos o ramo incerto e a rota do instrumento, o recheck passou9/9.
A proteção de versão posterior passou no recheck final12/12. São24 casos
browser distintos aprovados entre rodadas, nos três projetos, com quatro
larguras e axe nas revisões pendentes. Inclui falta real de saldo ENT30→31,
reposição autorizada e recuperação sem repetir revisão, além de falhas
provocadas restritas ao documento fictício para os demais ramos.

[Manifesto D3.7](D3_7_EVIDENCE.json) conserva fontes por rodada, falhas e
contraprovas. Todos os triggers/helpers de falha foram removidos; os dois
crons locais originais continuam ativos e com o mesmo agendamento.
C-AC-077 passa a PASS_LOCAL_AUTH_HTTP_BROWSER. Outros consumidores D3,
sessões/24h, rascunhos de decisões, guias e navegação continuam pendentes.
CI do candidato, reconciliação remota final e gates humanos/externos D-C/D6
permanecem separados. D4, D5 e operação não foram concluídos por este lote.

## D3.8 — vocabulário, destinos e consultas por filtro

Base publicadaebc4464; CI42351683111 aprovou banco e validate Windows/Ubuntu,
com browsers ainda em andamento na observação anterior ao novo push. Nenhuma
migration nova: local133/remoto121;12 D-B aguardam reconciliação final.

Histórico traduz chips/anúncios e conserva outros filtros ao remover uma data.
Papéis locais compartilham cinco rótulos, sem incluir administração global.
Situação/função desconhecida tem fallback humano e selo neutro. Os dez eventos
de escala e os tipos de proposta têm apresentação e fallback testados; produtor
SQL da escala conferido. Mais/sino/central nomeiam a tarefa efetiva, preservando
paciente/ref. Corrigido Badge dentro de parágrafo na central. Navegação pelos
seis perfis Auth e abertura de compra real mantiveram as capacidades vigentes.

Entregas/estoque já protegiam a consulta por chave/abort e não foram reescritos.
Respostas vazias antigas, liberadas após dados atuais com fetch sem abort, não
substituem entrega pendente/saldo familiar30. Erro500, vazio e retry preservam
foco e fatos originais. Estoque testado com administração e família; entregas
com recebedor profissional. Vazio de estoque e situação futura são respostas
controladas: o banco mantém saldo/situação originais, sem fato físico novo.

Tipos/lint passaram.46 unitários/apresentação, sendo19 de linguagem/destinos e
27 de governança. Produção21/21, incluindo duas regressões existentes de
sino/central nos três projetos. Rechecks3/3 do selo desconhecido e3/3 do estoque
familiar:21 casos nominais distintos e27 execuções aprovadas. Quatro larguras
e axe nas superfícies do [manifesto D3.8](D3_8_EVIDENCE.json). Diagnóstico rápido
não é aceite; falhas de foco do instrumento, seletor do anunciador Next e grep
ancorado foram preservadas. Explicação do grep D3.7 corrigida sem apagar o log.

C-AC-013/021 têm prova local. C-AC-014 segue parcial: cada tela ainda precisa
resolver o ref individual, incluindo período do plantão e alerta de estoque;
conservar a URL não prova essa tarefa. Matriz105×29 e84 migrations históricas
preservadas; crons originais inalterados e helpers/triggers de falha ausentes.
CI do candidato, demais D3, D4/D5/operação, remoto final e gates humanos/externos
continuam pendentes. Sem merge, deploy comandado ou liberação operacional.

## D3.9 — referências individuais e resposta ao lembrete pessoal

Base639b5cb. A CI42354352749 aprovou banco e validate Windows/Ubuntu, mas
reprovou preparação global em Chromium e largura de entregas em WebKit;
central teve uma tentativa instável. Corrigidos: min-height de página aplicado
indevidamente ao portal Fluent, largura mínima dos seletores e troca de modo
do instrumento antes de a consulta controlada terminar. A aceitação dirigida
do candidato passou27/27 nos três projetos, incluindo esses casos.

Avisos agora resolvem o recurso exato com autorização vigente: plantão futuro
no dia/fuso próprio, evento BAL/atribuição/semanas, alerta com saldo observado
separado do saldo atual e relato/lembrete pessoal com namespaces distintos.
Lembrete antigo de BAL não inicia contagem retroativa. Abrir uma referência
não confirma presença, ciência, resposta ou estoque. Contexto e permissões
continuam no banco/API; identificador e query string não concedem acesso.

O titular pode revisar a declaração de ausência ou abrir relato vinculado ao
lembrete original. Origem/custódia ficam congeladas no preenchimento. Resposta,
vínculo, auditoria e aviso visto são atômicos; nenhuma baixa é antecipada.
Resposta perdida conserva a chave, inclusive após recarga e recuperação403;
replay não duplica atos. Relato avulso antigo não é vinculado retroativamente.
Prévia limitada e histórico filtrado permitem seguir origem/consequência.

Auth9/9 comprova negativas, contexto alterado durante espera observada, grants,
FK entre pacientes, rollback de efeitos tardios e recuperação após perda de
escrita. Unitários/API27/27, tipos e lint passaram. Produção27/27 inclui novos
fluxos e consumidores existentes de complemento/consumo. Quatro larguras e
axe conferidos nas superfícies do [manifesto D3.9](D3_9_EVIDENCE.json).
Falhas anteriores e limites foram preservados, sem reduzir regras ou testes.

C-AC-014 tem prova local integrada, reutilizando os seis perfis/documentos
da D3.8 compatíveis. D-B-AC-020 permanece parcial: progresso/catch-up dos jobs
legados ainda precisam da reconciliação OPS-01 em D5. Rascunhos contextuais
restantes, sessão/24h e demais D3 continuam pendentes. Local136/remoto121;
15 migrations D-B aguardam o lote remoto final. Crons originais inalterados,
sem helpers/triggers de falha. CI do SHA publicado continua gate próprio.
Git diff --check aponta uma linha vazia final na migration já aplicada
20261107090824; os bytes foram preservados, sem reescrever SQL ou suprimir regra.

## D4 — prova técnica inicial, sem aceite de produto

A [prova isolada](d4-probe/README.md) produziu assinatura técnica e token
RFC3161 interno, conferidos por OpenSSL e pyHanko independente. Alteração de
byte e acréscimo após a assinatura foram recusados por integridade/cobertura.
Conteúdo/geometria do PDF fictício e render foram inspecionados. Não houve
chave privada no Git nem confiança instalada no sistema. Nenhum critério D4
foi concluído: pipeline, runtime, verificador público e emissões reais seguem
pendentes. Confiança externa, independência temporal, homologações humanas e
gates D-C/D6 não são inferidos dessa prova.

## D4.1 — núcleo criptográfico Node

Base3c61697. Implementados signTechnicalPdf, TSA RFC3161 em memória e verificação
separada de AcroForm/ByteRange, CMS, digest, vínculo ESSCertIDv2, certificado,
cadeia e token temporal. A chave de TSA exige EKU crítico e exclusivo para
carimbo; não pode assinar o documento. O núcleo não usa processo externo ou
serviço residente. OpenSSL gera somente as identidades efêmeras dos testes.

Seis casos criptográficos passaram com chaves RSA3072 reais. pyHanko0.38.1
independente aprovou o PDF do adapter Node e recusou ausência de carimbo e
token válido para outra assinatura. Também testados byte alterado, acréscimo
posterior, cadeia desconhecida, revogação configurada, certificado inesperado,
relógio futuro, falha de TSA e unicidade de seriais em concorrência. A política
de TSA usa UUID privado; sua codificação DER foi conferida independentemente.

O primeiro gerador produziu OCTET STRING construído BER por comportamento do
construtor PKIJS. A montagem foi corrigida para DER; a regra de verificação não
foi relaxada. Tipos e lint passaram. Arquivos de pesquisa terminados em.ts,
incluindo resposta404, foram renomeados para.txt no output ignorado para não
entrarem na descoberta de tipos. Não foi ampliada a exclusão do compilador.

LibPDF0.5.3, PKIJS3.4.3 e ASN1js3.1.0 estão fixados no lockfile. npm audit
reportou26 avisos; os pacotes apontados mantêm exatamente as versões do
baseline. Não houve correção forçada ou atribuição de aprovação ao SonarCloud.
[Manifesto D4.1](D4_1_EVIDENCE.json) conserva fontes, resultados e limites.

D-B-AC-006/007 continuam parciais. O núcleo ainda precisa ser ligado ao ciclo
de emissão da aplicação: reserva Auth, composição/oráculo, assinatura, upload
imutável, registro ready, histórico e verificação pública. Custódia real,
versões/rotação, incidente e confiança operacional não foram configurados.
Não há exemplar de REQ/COM/ENT/BAL anunciado como assinado por este lote.
Sem nova migration, alteração remota, deploy ou liberação operacional.

Próximo lote D4.2: reserva por intenção própria; claim privado do worker com
token não entregue ao navegador; finalização pela sessão Auth revalidada e
comprovante do worker; caminho imutável por emissão. Recuperação consulta o
objeto vencedor, valida fatos/identidade/assinatura e registra os mesmos bytes.
Não usar escrita de negócio como prova de sucesso, não regenerar download e
não entregar objeto antes de ready. Upload público precisa de limites e
isolamento da leitura de PDF desconhecido; o núcleo atual valida artefatos
produzidos/controlados, sem endpoint público de upload.

## D4.1a — regressões da CI no menu e na agenda

CI42360570173 de3c61697 aprovou banco/validate Windows/Ubuntu. Chromium/mobile
reprovaram o menu de perfil; WebKit foi cancelado pelo fail-fast da matriz.
Chromium registrou também uma tentativa instável ao encerrar a programação.
O log e o recheck local reproduziram o erro do menu, sem excluir regra axe.

Perfil/contexto agora usam Popover Fluent com foco contido e MenuList, mantendo
setas, seleção autorizada, Escape e retorno ao acionador. A escolha assíncrona
restaura o foco após a revalidação e reativação do botão. O retorno mantém main
acessível; não deixa a página escondida pelo modalizador. “Central de
notificações” abre a central, sem anunciar preferências inexistentes nessa tela.
Tipos/programações conservam a abertura durante atualização ao vivo; ações
continuam indisponíveis durante consulta. As doze ocorrências históricas foram
preservadas no caso dirigido com refresh explicitamente provocado.

Diagnóstico2/2 passou após a composição modal. Produção inicial21/24 passou e
os três casos de foco revelaram o retorno assíncrono ainda ausente. Corrigido
esse retorno, recheck de produção3/3 passou. São24 casos nominais aprovados em
duas coortes documentadas: cinco perfis, navegação/wizards, preparação global e
programação, nos três projetos. O último ajuste só restaura foco após seleção;
capacidade, consulta e contratos dos21 casos compatíveis não foram alterados.
Tipos e lint dos fontes afetados passaram; não foi repetida a suíte geral.
[Manifesto do recheck](D4_1A_CI_EVIDENCE.json) preserva fontes por rodada e falhas.

O núcleo criptográfico de7647558 permanece inalterado; seu aceite local não é
substituído pela validação dos navegadores. Sem migration ou alteração remota.
CI do próximo SHA publicado continua obrigatória. PR permanece Draft/NO-GO.

## D4.2 — emissão assinada integrada

Basecb7e6c2. Reserva Auth por intenção pessoal congela snapshot, versão, nome,
instante e código aleatório. O worker recebe lease/token separado da chave do
navegador. O pipeline compõe V5, confere texto/geometria por parser
independente,
assina PAdES-B-T com TSA interna, valida, persiste sem sobrescrever, relê o
objeto
vencedor e finaliza com sessão/capacidade/prova do worker revalidadas no banco.
Nenhum recibo fabricado pelo cliente basta para produzir ready.

Arquivos gerados integra REQ/COM/ENT/BAL. Gerar PDF é explícito; abrir a ficha
não
gera exemplar. Resposta perdida ou JSON200 inválido conserva a mesma intenção
durante reload. Histórico mostra solicitante, versão, momento, estado e ações.
Nova geração explícita cria outra identidade; visualizar/baixar/compartilhar
usam
os mesmos bytes registrados. Download confere hash, tamanho, assinatura e
leitura
atual antes/depois do I/O, sem depender de chave privada ativa.

Validação final: Auth6/6; unidade/API18/18; produção12/12 nos três projetos de
navegador, com consumidor V4 de compartilhamento, quatro larguras e axe. Inclui
falha após upload antes de ready, recuperação dos mesmos bytes, cache adulterado
recusado e restaurado, revogação real de leitura nos tipos REQ/ENT/BAL,101
intenções
em cursor estável e ausência de efeitos no documento/eventos/estoque pela
geração.
Tipos e lint dos fontes afetados passaram sem avisos. Diagnóstico2/2 foi mantido
como diagnóstico, sem substituir o aceite de produção.

pyHanko0.38.1 independente aceitou assinatura e token dos quatro PDFs reais.
pdfplumber conferiu SHA/tamanho/identidade e nenhum caractere fora da página;
PDFium renderizou a inspeção visual. Não há selo de acessibilidade estrutural,
conformidade jurídica, confiança externa ou aparelho físico. As falhas iniciais
do oráculo de material longo foram preservadas: o agrupamento por célula evita
que cabeçalhos/colunas interrompam o fato, mantendo a conferência de cada trecho
extraído em sua posição. Os seis snapshots demonstrativos e notas longas passam.

A [custódia local](SIGNING_CUSTODY.md) usa chaves cifradas RSA3072 fora do Git,
ACL restrita, pares distintos para assinatura/TSA e raiz fora do segredo do
runtime. Política pública separada mantém versões/fingerprints/denylist.
Ambiente
incorreto, segredo ausente e chave revogada são recusados. Arquivo local é
somente
adapter de desenvolvimento; runtime Vercel aceita valores protegidos por
ambiente,
sem OpenSSL ou processo residente. Testes usam PKI efêmera e cleanup protegido.
Rotação, recuperação independente da custódia e incidente ainda precisam de
ensaio.

Local137/remoto121;16 migrations D-B pendentes do lote remoto final.
Migration137
foi aplicada por test:db:prepare sem reset e permanece imutável. Nenhum helper
ou
trigger de falha ficou instalado; os dois crons originais continuam ativos por
minuto. [Manifesto D4.2](D4_2_EVIDENCE.json) conserva19 hashes LF das fontes,
resultados, contraprovas, artefatos e limites. Matriz105×29 preservada.

Próximo lote: página canônica de emissão, código e upload público
limitado/isolado;
compatibilidade dos consumidores legados de PDF e respectivos oráculos factuais;
demais falhas/concorrência e custódia. O GET antigo por versão ainda pode
gerar V4
e usa cache legado; não recebe o aceite do contrato novo. O QR novo já carrega
código opaco, mas a página de destino ainda precisa ser implementada.
Verificação
pública completa não foi declarada pronta. D3 restante, D5, automação de backup,
retenção, monitoramento e gates D-C/D6 continuam pendentes. CI do SHA
publicado é
gate próprio; Sonar permanece adiado pelo responsável. Sem merge/deploy/GO.

## D4.3 — verificação pública e proteção do processamento

Base58c5837. /verificar e /verificar/emissao/:code oferecem código sem conta e
upload efêmero. Código/QR consultam registro mínimo, sem aprovar os bytes de quem
está lendo. Upload compara digest real com a referência e com eventual outra
emissão; verifica assinatura, cobertura, cadeia e token em worker isolado. Não
expõe paciente/material/solicitante ou acesso ao PDF privado. QR antigos continuam
resolvendo sua referência canônica. [Contrato e limites](PUBLIC_VERIFICATION.md).

Cliente/API limitam arquivo a4 MiB. Admissão compartilhada no banco limita
consulta/upload; somente header da plataforma é considerado quando VERCEL=1,
sem guardar IP bruto. Anon/Auth não contornam a fachada por RPC. Worker sem
credenciais tem prazo, heap, concorrência e orçamento de descompressão; encerra
inclusive em erro. Certificado/chave também têm orçamento antes da criptografia
nativa. Formato não suportado, assinatura inválida, cadeia desconhecida, carimbo
ausente/inválido e indisponibilidade não são apresentados como o mesmo resultado.

Produção12/12 passou nos três projetos:três casos privados existentes e a jornada
pública, com quatro larguras/axe, resposta200 incompleta, outro exemplar, excesso
de tamanho, código digitável e QR antigo. Coincidência de bytes pelo upload foi
também demonstrada em Chromium. O ajuste posterior de limite de certificado/chave
foi validado por unidade/API e pelos quatro PDFs reais; a prova de navegador
mantém os hashes da coorte anterior, sem inventar12/12 no mesmo fonte final.

Validação final de unidade/API25/25. Inclui os sete
[artefatos congelados](d4-runtime-proof/README.md), SHA e contraprovas:quatro
emissões reais, byte alterado com QR intacto, acréscimo posterior e token removido.
pyHanko aceitou os quatro e recusou as três contraprovas com causas distintas.
ZXing decodificou os QR rasterizados dos quatro, apontando às respectivas
identidades. Raiz é pública e efêmera de teste; chaves descartadas. Não é confiança
automática do produto. Não foram incluídos segredos ou dados clínicos reais.

Auth de emissão6/6 compatível e orçamento/ACL3/3 passaram; SQL service-role passou.
CI58c5837 tinha validate Windows/Ubuntu verdes e falhou antes dos browsers na
allowlist exata de worker. O teste recebeu somente as quatro novas entradas
aprovadas e a negativa de finalização; não houve concessão genérica ou remoção da
regra. O diagnóstico de navegador encontrou seletor de alert ambíguo com o
anunciador Next; main delimita o instrumento, mantendo a asserção. Probes de PKI
foram corrigidos para codificar TBS alterado em DER antes de avaliar o orçamento.
As falhas e limites permanecem no [manifesto](D4_3_EVIDENCE.json).

Local139/remoto121,18 migrations D-B pendentes. As duas novas foram aplicadas
sem reset e permanecem imutáveis. Crons originais preservados; sem instrumentos
de falha instalados. Empacotamento Next incluiu o worker autocontido de cerca de
2 MB, sem Supabase/provedor de chaves. Validação local não prova execução na
Vercel; CI do SHA publicado continua gate separado. Sonar permanece adiado.

Próximo lote:consumidores legados de PDF/cache, oráculos documentais específicos,
combinações de acervo legado/expiração de certificado ainda não ensaiadas,
rascunhos contextuais/sessão D3, D5 e bases operacionais de backup/monitoramento.
Rotação, restauração de custódia, incidentes, reconciliação remota final e gates
humanos/físicos/externos continuam pendentes. Produção NO-GO; PR Draft sem merge.

## D4.4 — acervo unificado e download exato do legado

Base d0179ca. GET de PDF antigo não gera ou registra representação. Originais
usam renderer=legacy; representações existentes usam sua revisão, com padrão4.
Ausência é404 com orientação para Gerar PDF; divergência de digest é503
recuperável, sem bytes alterados ou substituição do original. Leitura vigente
é conferida antes e depois do Storage. Emissões assinadas conservam também a
verificação criptográfica. O stream privado começa após todas as verificações.

Arquivos gerados reúne intenções, originais e V4, com cursor misto estável e
filtro de versão. Datas/solicitantes legados ausentes permanecem desconhecidos.
O histórico BAL abre o acervo daquela versão. Outra representação histórica
usa nova identidade, assinatura e instante próprios. Consultar/baixar conserva
o exemplar; falha de lista pode ser consultada novamente; revogação limpa as
ações visíveis. [Contrato](DOCUMENT_ARCHIVE.md).

Prova Auth:dois casos distintos passaram entre rodadas, incluindo103 registros
mistos, inserção entre páginas, filtros e negativas de contexto/grants/vínculo.
Unidade/API5/5, tipos e lint afetados passaram. Produção:30 casos compatíveis
passaram na primeira coorte; os três casos novos do acervo passaram na coorte
final em Chromium/mobile/iOS. São33 casos distintos aprovados entre coortes,
sem inventar33/33 no mesmo build. Incluem emissão/recuperação, V4 compartilhado,
REQ material/SCI, COM, ENT, transferência e BAL legado. Acervo final foi auditado
por axe em quatro larguras; a imagem de320px em iOS emulado foi inspecionada.
Não é prova física nem aceite com tecnologia assistiva.

O upload público do V4 identifica registro legado e ausência de assinatura;
a nova representação histórica é PAdES-B-T, sem assinar retroativamente os bytes
antigos. Storage adulterado é recusado; restauração controlada dos bytes faz o
mesmo registro voltar a ser recuperável. Metadados legados permaneceram iguais.

Falhas de preparo ficam preservadas no [manifesto](D4_4_EVIDENCE.json):premissa
errada sobre contexto, coluna de fixture inexistente, import.meta incompatível
com coleta CJS, tentativa de compra anterior à aprovação e mock HTTP com
message em lugar de error. Asserções e regras de autorização não foram removidas.
Diagnóstico rápido1/1 conferiu o fluxo corrigido antes do aceite final3/3.
O runner agora recusa coleta inválida antes do build e das chaves efêmeras;
probes positivo/negativo passaram, sem representar casos funcionais aprovados.

Migration140 aplicada por test:db:prepare sem reset após preflight revertido;
permanece imutável. Local140/remoto121:19 migrations D-B aguardam o lote final.
Crons originais continuam ativos por minuto; nenhum trigger/função de falha
permaneceu. CI da base d0179ca aprovou banco/instalação/evolução/integração e
validate Windows/Ubuntu; browsers estavam em execução na consulta. Não valida
este incremento. Sonar continua adiado. Sem merge, deploy ou GO.

Próximo lote:oráculos factuais e acessibilidade documental, proveniência de
atores/datas, anexos anotados, combinações de expiração e custódia, D3 restante,
D5 e bases operacionais de backup/monitoramento. O probe de recuperação ainda
precisa incluir as emissões ready da tabela privada, conservando compatibilidade
com os backups D-A. Reconciliação remota final e gates D-C/D6 continuam pendentes.

Antes da publicação D4.4, a CI da base d0179ca concluiu Chromium e mobile com
173 casos aprovados cada e uma falha comum em recuperação de senha após logout.
O artefato mostra o botão visualmente, com nomes acessíveis ausentes no formulário;
substituir o papel do seletor não foi aceito como correção demonstrada. A análise
de limpeza modal segue no incremento seguinte. iOS permanecia em execução.
A falha é preservada, sem promover a CI da base ou deste lote a verde.

## D4.4a — login acessível após logout e recuperação de senha

Base9958b96. CI d0179ca terminou com banco/validate Windows/Ubuntu aprovados,
Chromium/mobile com173 casos aprovados cada e a mesma falha no onboarding;
iOS foi cancelado. O diagnóstico local reproduziu a falha mesmo aguardando
/login. Três botões visíveis tinham ancestral DIV com aria-hidden=true.
O formulário estava visualmente presente e inacessível aos seletores por papel.
[Contraprova e fontes](D4_4A_CI_EVIDENCE.json).

Logout bem-sucedido agora usa navegação completa para /login, após signOut e
limpeza dos indícios privados locais. O documento novo reinicializa memória
privada e acessibilidade modal. Falha do Auth conserva o feedback existente;
não há remoção manual de atributos, troca de papel ou enfraquecimento de regras.
O teste mantém cadastro, confirmação de e-mail local, vínculo, recuperação,
alteração de senha e novo acesso, e acrescenta Escape com logout Auth pendente.
A requisição real é retomada; nenhuma resposta de sucesso foi fabricada.

Diagnóstico final WebKit1/1 e produção final3/3 passaram com o mesmo candidato
nos três projetos. Tipos/lint passaram. A tentativa com flushSync foi recusada
pelo lint e removida; fechamento observado por efeito passou em Chromium/mobile,
mas falhou no último logout WebKit e também foi removido. Essas tentativas não
recebem aceite final; seus logs foram preservados. O diagnóstico não substitui
produção. SMTP usado é Mailpit local, sem prova de entrega externa.

Sem novas migrations ou aplicação remota:local140/remoto121,19 pendentes.
CI do SHA publicado permanece gate separado; Sonar continua adiado. D-B segue
em execução, sem merge, deploy comandado ou GO. Os próximos probes documentais
focam datas de criação/emissão e nomes históricos, preservando os snapshots e
hashes existentes. D3 restante, D5 e bases operacionais continuam pendentes.

## D4.5 — fatos de origem, autoria e datas do PDF V6

Base dbc7171. Novas intenções V6 congelam contexto documental adicional no banco,
sem alterar eventos/hash canônicos. Rascunho, ficha, emissão operacional e
solicitação de geração têm rótulos próprios. Origem física conserva data conhecida
ou desconhecida, nome disponível e importação separada. Rename/revogação não
substituem autoria/ID preservados; solicitante atual da geração é outro campo.
V5 pendente foi recuperada pelo pipeline real; download ready conserva os bytes.
[Contrato e corpus](PDF_SOURCE_FACTS.md); [manifesto](D4_5_EVIDENCE.json).

Auth original3/3, recheck de importação1/1 e rename/revogação1/1 passaram;
rechecks não são casos distintos adicionais. Unidade6/6, API estrita1/1 e
compatibilidade V4/V5 8/8 passaram. Seis casos novos de produção passaram entre
coortes nos três projetos, com axe em quatro larguras. A primeira rodada de18
teve16 passes, incluindo12 compatíveis, e duas falhas por protocolos físicos
esgotados na fixture. A coorte final teve5 passes e colisão no nome da evidência
Chromium; apenas esse caso foi repetido e passou. Produto não mudou entre essas
duas últimas coortes. Não se declara18/18 no mesmo build.

pyHanko aceitou os três PDFs atuais e TSA contra a raiz interna pública fornecida;
pdfplumber/pypdf conferiram fatos, posição, geometria, rodapé e grupo emissão/QR.
As nove páginas foram inspecionadas. Probe COM explicitamente sem assinatura tem
12 páginas, marcador visível/extraível na página10 e rodapé livre. Caractere não
representável foi recusado antes de assinatura/Storage com feedback explícito,
sem adulterar evento. Falhas anteriores e hashes dos logs estão preservados.

Migration141 aplicada sem reset após preflight revertido; local141/remoto121,
20 migrations D-B pendentes. Crons originais ativos por minuto; instrumentos de
falha ausentes. CI dbc7171 terminou com banco/validate aprovados e browsers
reprovados em acervo/foco/carregamento; não valida V6. Próximo lote corrige essas
falhas dirigidas. C101 ENT específico, combinações C105/C106, acessibilidade PDF,
anexos/custódia, D3 restante, D5 e bases operacionais permanecem pendentes.
Sonar adiado; PR Draft; sem merge, deploy comandado ou GO.

## D4.5a — foco tardio e contraprovas de atualização ao vivo

Base d17e309. CI dbc7171 aprovou banco e validate; browsers falharam em três
superfícies. O ensaio curto reproduziu a perda de foco com callbacks de frame
atrasados. O foco inicial agora respeita a navegação que já chegou ao menu;
seleção de contexto conserva o comportamento anterior. Setas e Escape foram
ensaiados seis vezes após abrir/fechar notificações em cada projeto.

No acervo, a CI mostrou área privada já desmontada por revogação real; o teste
tentava clicar no controle removido. Agora exige remoção da região inteira,
contexto a selecionar e ausência de links no main, mantendo403/401 reais.
No histórico, invalidar ao vivo iniciava outra consulta fora da espera controlada;
o instrumento agora retém a coorte inteira. A invalidação é explícita no ensaio,
sem remover carregamento/erro/vazio/retry nem a negativa de resposta antiga.

Baseline diagnóstico2 passes/1 falha no histórico; foco atrasado1 falha.
Diagnóstico corrigido3/3 e aceite final de produção9/9 nos três projetos,
com o mesmo candidato, passaram. Tipos/lint passaram; sem nova migration.
[Fontes, logs e limites](D4_5A_CI_EVIDENCE.json). Não se promove diagnóstico,
CI antiga ou resultado pendente a aprovação. Local141/remoto121;20 pendentes.
Sonar adiado, D-B em execução, PR Draft e produção NO-GO.

## OPS.1 — cobertura de PDFs ready na recuperação

Base fee8bfe. restore-backup-probe inclui referências ready da tabela privada e
conserva backups anteriores à D-B por check de existência antes do SQL. Emissão
incerta sem upload não é exigida como ready; ready ausente/divergente é recusado.
Um caso SQL com banco isolado passou, incluindo contraprovas; lint
passou. O backup cifrado original teve nova restauração real isolada:122 conjuntos,
FKs,29 objetos,28 PDFs, sem cron/pg_net; zero emissões assinadas na cópia antiga.
O probe levou4,702s, sem atribuir esse resultado a RTO operacional.
[Evidência e escopo](OPS_1_EVIDENCE.json).

Destinos/diagnósticos de recuperação ficam fora do Git, com ACL do operador;
chave separada não foi exportada. Sem alteração de fonte, reset, remoto ou deploy.
Local141/remoto121;20 migrations D-B pendentes. Agenda/retenção7+4, destino
operacional independente, recuperação de chaves, monitoramento e prova D6
continuam pendentes. A meta D-B continua ativa e a PR permanece Draft.

## D5.1 — PWA, compatibilidade e reconciliação remota antecipada

Base fc98664. Manifesto/ícones, controles no perfil e worker versionado integram
o produto. Cache real contém somente orientação offline e três ícones públicos;
API, HTML autorizado, ficha e PDF privado dependem de rede/autorização. Não há
fila/replay, skipWaiting ou reload forçado. Duas abas mantêm o worker aguardando;
rascunho COM confirmado foi reaberto com o mesmo ID e quantidade. Convite depende
de gesto; aceite não anuncia instalação física concluída. Capacidade ausente
mantém web. [Contrato](PWA_RUNTIME.md); [manifesto](D5_1_EVIDENCE.json).

Marcador SQL público invoker/stable distingue indisponibilidade e incompatibilidade
sem sessão/dados privados. Área privada fica inerte e preserva campos; novos
comandos são recusados antes do fetch, inclusive menu aberto e uploads privados.
Erro de seleção de contexto é não fatal e aparece no menu, sem desmontar a edição.
O cliente não concede autorização; API/RPC continuam responsáveis pela decisão.
Contexto longo respeita o header fixo, sem force click ou redução de teste.

Produção final15/15 passou nos três projetos em8,5min, com fontes de runtime
estáveis, quatro larguras/axe e jornada acessível existente. Unidade9 casos
distintos e Auth real1 caso passaram; repetições não são casos adicionais.
Tipos/lint afetados passaram. Primeira produção teve13 passes/2 falhas iOS;
teclado offline e fault adapter WebKit foram corrigidos. O adaptador injeta somente
/api/runtime e recupera por HTTP/SQL real; worker/Auth/rascunho não são simulados.
Web comum bloqueia workers para interceptações; a suíte PWA habilita workers reais.
Imagens offline/atualização foram inspecionadas. Logs e contraprovas preservados.

CI fc98664 aprovou banco, validate Ubuntu/Windows e Chromium/mobile. iOS atingiu
40min com162 casos aprovados/zero falhas de assert observadas e foi cancelado;
agregado FAILURE. Somente iOS passa a usar duas partes com stacks independentes,
mesmo limite e execução serial. Coleta final comprova182=94+88, interseção zero
e união exata; coleta não significa execução nem CI aprovada do novo candidato.

Conforme [novo complemento do responsável](OWNER_AMENDMENTS.md), o remoto foi
reconciliado neste fechamento. Backup extraordinário cifrado/autenticado e
restauração isolada conferiram129 tabelas/FKs,32 objetos e31 PDFs legados;
zero emissão assinada ready na fonte. Upgrade22 passou na cópia. Preflight
sem drift,97 identidades RPC publicadas preservadas, locks/transações longas/
índices inválidos zero. As22 migrations foram aplicadas pelo fluxo oficial com
skip-vault; **local143/remoto143; zero pendências nessa observação**.

Pós-validação143 SQLs e129 projeções originais não encontrou alteração inesperada.
Cron/Vault têm digests idênticos; somente cursor/heartbeat variam. A única
qualificação do catálogo vivo é a constraint NaN local NOT VALID, com predicado
idêntico e remoto validado. Comparação inicial por serialização JSON foi corrigida
para igualdade semântica; contraprova preservada. REST anônimo real do marcador
responde200. [Preflight](D5_REMOTE_PREFLIGHT.json),
[resultado](D5_REMOTE_MIGRATIONS.json) e [advisors](D5_REMOTE_ADVISORS.json).

CI e preview do SHA publicado continuam gates separados. Instalação física/AT,
Web Push/VAPID/entrega em background, frescor/revogação entre contextos, corpus
zoom400%/texto300, demais critérios D3/D4, custódia/rotação, agenda7+4 e
monitoramento seguem pendentes. O backup local ao operador não é rotina externa
operacional nem prova D6. Sonar adiado; D-B ativa; PR Draft; produção NO-GO.

## D5.2 em execução — inscrições e transporte Push

Base4bf8247 publicada e preview READY; acesso público conferiu login/runtime/
manifesto/worker/offline200 e API privada sem sessão401. Fingerprint publicado
coincide com o checkout LF; variação CRLF do lockfile local foi discriminada.
Recibo posterior permanece em output/phase-d-work/d5-preview-public-probe.json.
CI42407243042 terminou: banco e validate Ubuntu/Windows SUCCESS, iOS1 SUCCESS;
Chromium/mobile/iOS2 FAILURE por seletor status global na verificação pública.
Histórico WebKit teve uma tentativa falha adicional no retry controlado. Os
seletores/transporte estão sendo corrigidos sem retirar as asserções.

Migration144 aplicada apenas no local após preflight revertido e prepare. Quatro
tabelas privadas vinculam aparelhos, trilha, entregas e tentativas ao aviso interno
existente. Endpoints/chaves não têm grants diretos; três RPCs de serviço têm
consumidor real no worker. Consentimento, sessão, alvo, lease, conta e expiração
são revalidados. API/perfil/worker/click/logout estão em implementação e o envio
externo permanece desligado. [Contrato e limites atuais](WEB_PUSH.md).

Auth7 casos distintos passaram entre coortes;22 unitários passaram, com
decriptação e VAPID independentes. Contraprovas preservadas: status inválido na
fixture de revogação e inventário antigo de listeners. Tipos/lint e browser finais
continuam pendentes; um diagnóstico WebKit dirigido está em execução. Não se
declara aceite de produção desse lote. Local144/remoto143, uma migration nova
pendente; nenhuma migration aplicada foi reescrita. Próximo commit exige a
reconciliação correspondente e a preservação do estado Draft, conforme autorização.

## D5.2 — implementação, custódia local e remoto144

Consentimento e gestão por aparelho, APIs, worker Push e abertura autorizada
estão implementados. O aviso interno continua produtor canônico; payload opaco
e mensagem genérica não carregam dados do paciente. Não há ciência implícita.
Grants/RLS, sessões, reatribuição de conta, leases, backoff e resultados incertos
foram comprovados. Envio externo continua desligado. [Contrato](WEB_PUSH.md).

Auth7 casos distintos e22 unitários passaram entre coortes, com decriptação
RFC8291/VAPID independentes. Produção local comprovou18 casos distintos entre
duas coortes:12 inalterados preservados e6/6 afetados finais nos três projetos.
Primeira coorte14 passes/4 falhas; retry de histórico e nomes de fixture foram
corrigidos sem excluir asserções ou apagar dados. Runtime permaneceu idêntico.
Tipos/lint afetados, SQL de serviço dirigido e guard84 passaram. Coleta iOS tem
184=94+90, união exata/interseção zero; não é execução da CI. Capturas dos
controles foram inspecionadas; AT físico e recebimento real permanecem pendentes.

Custódia VAPID persistente local foi criada fora do Git com ACL do operador,
cifrada, autenticada e recuperada; ECDH independente conferiu a identidade.
Nenhuma chave foi enviada ao preview. Não equivale a HSM, recuperação em outro
computador ou rotina externa. O runner usa outra identidade efêmera e força
transporte desligado. Adaptadores de capacidade/envio são explícitos nos testes.

O primeiro preflight remoto recusou mudanças posteriores ao backup em Auth/
sessões e notificações/revisão. Captura, cifragem, restauração e upgrade foram
renovados antes de aplicar. Backup final b065691e-d9af-43ea-88f8-7d6c8111c0a3:
135 tabelas/FKs,32 objetos,31 PDFs, zero emissão assinada ready na fonte.
Fluxo oficial aplicou somente144; **local144/remoto144, zero pendências**.
144 SQLs e135 projeções preservadas, cron/Vault idênticos, saúde sem locks/
transações longas/índices inválidos. Catálogo vivo coincide com o local exceto
validação da constraint NaN conhecida, com predicado idêntico. Push remoto tem
zero registros, RLS sem grants diretos e oito RPCs com papéis conferidos.
[Preflight](D5_2_REMOTE_PREFLIGHT.json), [resultado](D5_2_REMOTE_MIGRATIONS.json),
[advisors](D5_2_REMOTE_ADVISORS.json) e [evidência consolidada](D5_2_EVIDENCE.json).

CI4bf8247 terminou FAILURE; correções de consumidor foram comprovadas localmente.
CI e preview do novo SHA exigem observação própria. VAPID de preview, aparelhos/
provedores, D3/documentos restantes, recuperação/retenção7+4, monitoramento e
suporte continuam gates reais. Sonar adiado pelo responsável, D-B ativa, PR Draft,
sem merge, reset, Auth remoto alterado ou promoção operacional.

## D5.3 e OPS.2 em execução

4016105 publicado; PR7 OPEN Draft e preview READY. Probe Vercel autenticado do
runtime respondeu200/ready. CI42415801564 aprovou banco e validate Ubuntu/Windows;
os quatro jobs browser estavam em andamento, sem aprovação antecipada.

Foi reproduzida starvation real no agendador legado: três rodadas alcançaram
95/101 configurações elegíveis. A primeira tentativa do teste falhou antes,
por tipo enum presumido na fixture; não é contraprova do produto. A seleção
agora exclui defaults sem obrigação e usa cursor transacional rotativo100.
Períodos conhecidos têm catch-up de até sete datas por visita, com continuidade.
Mudança de versão/data da configuração gera lacuna técnica, sem aplicar novos
destinatários retroativamente. Falha isolada não bloqueia válidos. BAL moderno
conserva seu produtor; legado é fallback sem regime ativo.

Migration145 passou por preflight revertido com inscrição, catch-up, lacuna,
erro/recuperação e grants. Ambiguidade de alias PL/pgSQL foi corrigida antes da
aplicação. test:db:prepare aplicou somente no local, sem reset. 16/16 casos Auth/
serviço e consumidores existentes passaram, incluindo101, D→D+1, backlog longo,
concorrência, rollback, referência/ciência e REQ. Local145/remoto144: uma pendente.
A migration aplicada não será reescrita.

OPS.2 acrescenta captura remota reutilizável e destino filesystem cifrado com
índice autenticado, sete slots diários/quatro semanais, críticos preservados e
fila de poda verificável. Seis testes reais de filesystem passaram: retenção,
concorrência, recusa de chave/índice/link, captura interrompida e arquivo corrupto
preservado para conciliação. Relógio e fontes são controlados nesses testes,
sem provar dias reais de operação. O próximo backup pré-migration exercitará
o consumidor CLI real; agenda operacional externa permanece desligada.

## Fechamento D5.3/OPS.2 — remoto145 e backup v2 real

CI4016105 terminou SUCCESS em42415801564: banco, validate Ubuntu/Windows,
Chromium/mobile, iOS1/iOS2 e agregado. Preview4016105 READY/runtime200; não é
aprovação dos incrementos posteriores. A nova CI exige o SHA publicado próprio.

Backup crítico pelo CLI novo:6681a390-179c-4172-83db-22338589ad5e,78 arquivos,
10.304.691 bytes. Restauração139 tabelas/FKs,32 objetos/31 PDFs, zero emissão
assinada ready na fonte e upgrade145 passaram, sem cron/pg_net. Compatibilidade
preservou386 identidades/229 públicas, autoridades e grants. Dois corpos mudam
intencionalmente para corrigir o legado; entrada de serviço continua a mesma.
Aplicação oficial de145 e pós-validação145 SQLs/139 projeções passaram. Cron/
Vault e dados originais idênticos; saúde sem locks/transações longas/índices
inválidos. **Local145/remoto145; nenhuma migration pendente.**

OPS.2 passou9/9 testes finais de retenção, concorrência, interrupção, corrupção,
índice/chave/link e projeções SQL. Corrigida fixture sem linha settings: o mutante
atualizava zero linhas, sem retirar a expectativa. v2 qualifica somente clocks/
cursores nomeados; versões, política, causa e fatos continuam exatos. SQL real
reprovou esses mutantes, e a consulta remota completa143 passou.

Um tick scheduled manual e único do caminho v2 gerou
701fb22c-876e-41a7-b40c-f32c97edb1fe:78 arquivos/10.529.666 bytes. Hash de fonte
foi congelado; captura145, autenticação e restauração143 tabelas/FKs,32 objetos/
31 PDFs passaram. Zero emissão assinada ready, sem cron/pg_net na cópia.
Os três desvios qualificados são apenas cursor BAL, heartbeat e progresso legado;
campos estáveis foram conferidos por hash. Um slot diário/semanal e o crítico
anterior coexistem. A configuração temporária foi removida e a permanente
permanece desligada; não há tarefa do Windows, fornecedor ou destino independente
ativado. Probe3,759s não é RTO8h comprovado.

16/16 casos de serviço/Auth e consumidores do scheduler passaram. Nenhuma UI/TS
de produto mudou desde4016105; sem build E2E local redundante. Lint afetado e
guard84 passaram. [D5.3](D5_3_EVIDENCE.json), [OPS.2](OPS_2_EVIDENCE.json),
[contrato de backup](BACKUP_PIPELINE.md) e [recibo remoto](D5_3_REMOTE_MIGRATIONS.json)
preservam fontes, logs e contraprovas. Agenda externa, recuperação de chaves/
computador, monitoramento/suporte OPS.3, critérios D3/D4 restantes, aparelhos/AT
e gates D-C/D6 continuam pendentes. Sonar adiado; D-B ativa e PR Draft.
Sem merge ou promoção operacional. A configuração local de Sonar fora
deste lote é preservada.

## OPS.3 iniciado — observabilidade e suporte técnico

19a3568 publicado, PR7 OPEN Draft. CI42420469538 iniciou; o verde4016105 é
histórico e não aprova esse incremento. A configuração local de Sonar continua
fora do commit. Remoto145 permanece reconciliado; nenhum transporte foi ativado.

Iniciado rascunho20261107223318, ainda não aplicado nem validado. Define estado
técnico por ambiente, política de limiares/severidades, eventos minimizados,
incidentes, histórico e intenções idempotentes. Não há coluna para payload
clínico, endpoint, telefone, SQL ou segredo. O arquivo, ainda não aplicado,
restringe eventos/coleta ao serviço e leitura/comandos ao Auth autorizado.
Coletores, comandos e leituras já têm rascunho; API/UI e testes continuam a
implementar. Nenhum critério OPS.3 recebe aceite.

Consumidores previstos: serviço existente de scheduler/worker, falhas API seguras,
CLI de backup/recuperação e área global técnica em Administração. Equipe recebe
impacto e ajuda no próprio paciente, sem detalhes globais. Reutilizar Auth real,
contexto global e assurance atuais; não derivar privilégios de campos do browser.
Próximo fechamento exige testes dirigidos, backup fresco e reconciliação146
somente após completar e comprovar os contratos. A meta D-B permanece ativa.

### OPS.3 — implementação local e contraprovas em andamento

Local147/remoto145. As migrations146/147 já aplicadas localmente são imutáveis;
146 tem SHA256cd36221fb7f4320fab4bfacb41043a125ad80b123a7cfeb0c2f7d9c2aef6d9d5.
Seis tabelas privadas, eventos minimizados, políticas por ambiente, incidentes,
histórico e intenções CAS estão integrados ao scheduler/API/worker. A área global
em Administração e o impacto pessoal em Notificações estão implementados.
Tipagem, lint afetado e allowlist de serviço passaram. Dezessete testes unitários
de monitoramento, runtime/worker e arquivo cifrado passaram.

Auth HTTP real confirmou negativas de contexto/papel, idempotência, privacidade,
observação monotônica sem inundar histórico, CAS, histórico101+, contexto e prazo
após lock. Ensaio revertido da falha do coletor preservou o retorno operacional
do scheduler. Clocks de observação são qualificados no backup; severidade,
estado, versão e política continuam exatos. O adaptador interno de backup exige
arquivo autenticado e horário original do manifesto; falha de telemetria não
invalida a cópia verificada. Integração de recuperação permanece separada deD6.

A primeira corrida CAS revelou timeout504 por raise40001 deliberado, conforme
[diagnóstico oficial do Supabase](https://supabase.com/kb/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b).
147 preserva146 e substitui somente as duas recusas CAS de operations_command
por PT409; a API devolve VERSION_CONFLICT409. Rechecagens de corrida, privacidade,
histórico, prazo, impacto e filesystem passaram. Erros de fixture, produtores
concorrentes e o primeiro diagnóstico permanecem nos logs, sem apagar falhas.

A captura crítica fresca d77b1cc9-70eb-474f-973c-71344a009b5f foi autenticada:
79 arquivos/10.608.947 bytes, manifesto
a068614d2c46a729759dedf94d5c6ce478352ecdb4ba6634dc42091bdce5d798.
Agenda permanente e telemetria do operador continuam desligadas. Restauração,
evolução147, preflight e reconciliação remota ainda precisam ser concluídos.

CI19a terminou FAILURE somente no caso acessível iOS1; os outros jobs passaram.
O preview19a está READY. O primeiro ciclo local novo usa build de produção e
fontes estáveis. Chrome/mobile passaram na jornada acessível e o impacto pessoal
passou em Chrome; os primeiros três casos globais esbarraram em getByLabel exact
para select encapsulado. Um probe sem aplicação confirmou label0/combobox1,
preservando o nome acessível correto. A correção do consumidor e o aceite final
ficam pendentes; nenhum caso falho recebe aprovação. [Contrato](OBSERVABILITY.md).

### OPS.3 — fechamento técnico do lote

Local147/remoto147, histórico integral reconciliado e sem pendências. A captura
crítica fresca restaurou143 conjuntos,33 objetos e32 PDFs, incluindo hash de uma
emissão ready, e a cópia foi evoluída até147 em isolamento. Compatibilidade e
pós-check preservaram387 identidades anteriores, autoridades/grants, Auth9,
profiles7, Storage33, cron e Vault. Só o retorno final do scheduler existente
foi estendido. A primeira projeção do verificador incluía as duas linhas novas
de migration; a rechecagem isolou as145 anteriores e confrontou os147 SQLs,
sem tolerar mudança nos fatos anteriores. Sem reset ou fixture remota.

17 casos Auth/SQL/filesystem passaram em dois grupos,17 unitários e18 casos
distintos em build de produção nos três projetos. Os nove casos globais
afetados passaram novamente; os nove de jornada/foco/impacto foram conservados
sem mudança nos consumidores. Diagnóstico3/3 separado. O caso adicional de
coleta observou o prazo real do PDF com configuração1/2 segundos; não removeu
o guard que recusou alterar requested_at. Proposta de política é preservada
no conflito e pede revisão explícita da versão vigente. Tipos/lint, allowlist
de serviço e guard84 passaram. CI do novo SHA é o próximo gate automático.

A mesma cópia e o probe produziram BACKUP_VERIFIED e RECOVERY_PROBE_VERIFIED
por HTTP real na stack local, com horário original do backup. A credencial
temporária foi removida. Agenda/telemetria permanentes seguem desligadas, sem
backup operacional externo nem aprovação D6. Presença dos Secrets de serviço,
PDF e Push em Preview foi conferida pelo CLI, sem expor valores; pull omite
Secrets. O runtime do próximo preview ainda deve ser observado.

Matriz105x39 mantém as29 colunas iniciais:25 PASS,47 PARTIAL,33 NOT_STARTED.
OPS.3 e impacto/ajuda recebem implementação parcial comprovada, sem falsa
homologação externa. Sonar permanece adiado. A configuração Sonar do usuário
continua fora deste lote. D-B ativa, PR7 Draft, sem merge ou promoção.
[Evidência e contraprovas](OPS_3_EVIDENCE.json).

### Continuidade — roteiro do piloto

OPS.3 publicado em1e11536, origem sincronizada, PR7 OPEN Draft; CI119/run42428525557
e preview correspondentes estavam em andamento na observação inicial. Remoto147
permanece reconciliado. A única alteração fora do lote é o arquivo Sonar do
usuário, preservado também no staging.

Preparado [roteiro do piloto e contingência](PILOT_AND_CONTINGENCY.md), ligado aos
controles já implementados de preparação global, responsáveis distintos,
retomada/CAS e tarefas locais. Seis hashes de consumidores/contratos D3.5
coincidem; a evidência é reutilizada explicitamente, sem repetir suítes por
mudança somente documental. [Recibo](PILOT_EVIDENCE.json). Nenhuma residência,
responsável, aceite ou GO foi inventado. Matriz105x39 preservada:25 PASS,
48 PARTIAL e32 NOT_STARTED. O complemento documental aguarda próximo lote de
publicação; não cancelar a CI em curso apenas por atualização documental.

### C-AC-023 — janela inicial de avisos em implementação

Hipótese concreta confirmada no código: InitialNoticeTracking mantinha o
deadline fixo10s após um resultado terminal e ignorava shareWaitSeconds. O
controlador novo usa a política0–10 do documento autorizado, mantém o prazo
absoluto, encerra polling/timeout ao consultar estado terminal e cancela apenas
as próprias leituras. Não recebe controlador da emissão PDF. Zero desativa o
acompanhamento repetido, sem confirmar entrega ou ciência. Resposta inválida
é indisponibilidade, sem virar zero pendências.

15 unitários de relógio controlado passaram:0/5/10, terminal antes/depois,
primeira resposta tardia, resposta que ignora abort, desmontagem e inválidos.
Preflight revertido passou; migration20261108002700 aplicada somente localmente,
sem reset. Local148/remoto147; uma pendente para o próximo fechamento autorizado.
Dois casos HTTP com Auth real passaram em política/default/privacidade, contexto,
revogação e negativas de global/anon/serviço. Tipos e lint iniciais passaram.

O primeiro diagnóstico de navegador alcançou os estados corretos, mas três
oráculos usavam document_id inexistente em stock_movements. A fixture agora
confronta as movimentações do paciente pelo vínculo do documento. A rechecagem
dirigida está em execução; diagnóstico não é aceite. Falha e oráculos continuam
preservados. C-AC-023 ainda não recebe conclusão. A próxima publicação exige
aceite em build de produção, evidência, backup e reconciliação148, depois CI do
SHA correspondente. O preview1e11536 segue READY no remoto147; runtime200/ready,
rota privada401 e heartbeat da aplicação Preview foram observados sem criar
sessão Auth ou fixture remota. [Recibo](PREVIEW_1E11536_OBSERVATION.json).

### Fechamento C-AC-023 e documentação do piloto

Local148/remoto148, histórico148/148 reconciliado e sem pendências. A migration
adiciona somente leitura minimizada de shareWaitSeconds, sob autorização vigente
do documento. Os398 contratos anteriores e seus grants/corpos foram preservados;
nenhuma tabela ou estado operacional mudou pela migration. Os149 conjuntos
anteriores, Auth9, profiles7, Storage33, cron e Vault foram confrontados, com os
clocks/cursors nomeados qualificados. Restauração/upgrade da cópia fresca passou:
149 conjuntos/FKs,33 objetos,32 PDFs e hash de uma emissão ready. Tempo3,684s do
probe não comprova RPO/RTO/D6.

15 unitários e dois casos HTTP Auth passaram; os15 casos de produção nos três
projetos incluem9 novos e6 de consumidores PDF. O PDF lento confirmou bytes
mesmo após encerrar a janela5; terminal antes do prazo10 não regrediu,0 não
reiniciou polling e desmontagem descarta respostas tardias. Tipos/lint passaram.
Diagnóstico e falhas de fixture permanecem separados do aceite. A CI de1e11536
terminou com oito jobs SUCCESS, incluindo banco completo e todos os navegadores.
O [recibo por SHA](CI_1E11536_OBSERVATION.json) não aprova o próximo incremento.
[Evidência](NOTICE_TRACKING_EVIDENCE.json) e [recibo remoto](NOTICE_TRACKING_REMOTE_MIGRATIONS.json).

O roteiro do piloto reutiliza seis consumidores/contratos D3.5 com hashes
iguais; somente Markdown/referências/evidência do complemento são validados,
sem repetir testes funcionais por documentação. Residência, responsáveis reais,
homologação de canais, AT/aparelhos, recuperação de chaves e decisão D-C/D6
continuam pendentes. Matriz105x39 mantém29 colunas iniciais e passa a26 PASS,
48 PARTIAL e31 NOT_STARTED. Missão D-B ativa, Sonar adiado, PR7 Draft, sem merge
ou promoção. Arquivo Sonar do usuário permanece fora do commit.

### Anexos: implementação e provas antes do fechamento

42ca8df publicado, PR7 OPEN Draft, remoto148 reconciliado. Seu preview está
READY; runtime200/ready e rota privada401 observados sem criar Auth ou fixture
remota. CI42ca8df já aprovou Linux/Windows e banco completo; navegadores ainda
estavam em execução na observação. Isso não valida o incremento de anexos.

Local150/remoto148: duas migrations novas ainda não foram aplicadas no remoto.
149 cria tentativas e recibos privados, abandono formal e exclusão mútua no
Storage;150 exige atestado do servidor para a origem. Ambas passaram preflight
com rollback e preparo local sem reset. São incrementais e já ficam imutáveis.
O cliente congela arquivo/chave, confere recibo e consulta a mesma intenção;
recuperação verifica bytes do Storage antes de confirmar e vincular uma vez.
Nova seleção depende de confirmação ou abandono de reserva sem envio pendente.

Onze unitários, nove Auth/Storage reais, consumidor anterior de rascunho/ready
e SQL de privilégios passaram. A rodada Auth inicial teve seis passes e uma
falha de fixture ao selecionar modo global com uma conta familiar; a negativa
foi preservada e o contexto correto passou. Movimento manual exigiu papel com
stock.family.manage; a contraprova familiar foi mantida no teste final. A
revisão adversarial acrescentou a fronteira de atestado exclusivo do servidor;
nove casos finais repetiram o conjunto afetado após esse reforço.

PDFs com anotações/campos são recusados com explicação, incluindo o exemplo B6;
não há mais remoção silenciosa de Annots. Novos anexos têm4 MiB, com overhead
abaixo do teto de transporte4,5 MB. Origem e derivado recebem hashes separados;
proveniência legada não é inventada. Não há TTL, limpeza ou eliminação de ready.

Diagnóstico de interface em andamento; não é aceite em build de produção.
Matriz passa provisoriamente a26 PASS/51 PARTIAL/28 NOT_STARTED, mantendo105x39
e as29 colunas iniciais. Próximos passos: navegador de produção, evidência,
cópia fresca/upgrade/preflight e aplicação remota149/150 antes do commit,
depois CI do SHA. Sem merge, promoção ou transporte externo; Sonar adiado.

### Fechamento dos anexos e reconciliação150

C-AC-017/052/107 têm implementação e contraprovas locais. Arquivo, impressão
e chave ficam congelados; resposta inválida, perda antes/depois do commit e
timeout nativo30s não liberam nova intenção. A recuperação confronta bytes do
Storage, conserva um arquivo/evento e funciona após recarga; outra preparação
é bloqueada até resolver o envio. Original renomeado pode retomar somente após
conferir os mesmos bytes, com os metadados congelados do registro. Dados
divergentes do Storage não são promovidos a ready.

Dez abandonos formais liberam vagas sem apagar linhas, hashes ou história.
Dois candidatos disputam a última vaga sem ambos recebê-la; ready e seus bytes
ficam preservados. Início/abandono e INSERT do Storage compartilham exclusão
mútua. Ausência de objeto e idade do envio não autorizam expiração. Declaração
do navegador não atesta origem; as duas RPCs de serviço fazem atestado/recibo.
Os dois auxiliares e quatro RPCs Auth mantêm contexto/titularidade vigentes.

Onze unitários, dez casos Auth/Storage, um consumidor de rascunho/ready e SQL
de privilégios passaram. Trinta casos distintos em produção foram compostos
por cinco grupos, com hashes de fontes e reuso dos consumidores inalterados;
não se declara uma única rodada de trinta. Foram46 execuções:42 passes e4
falhas intermediárias preservadas/corrigidas. O diagnóstico5/5 é separado.
Os três navegadores testaram timeout real30s, bytes, seleção congelada e
recuperação. Layout320/390/768/1440 e inspeção de capturas não aprovam AT,
aparelho físico ou zoom400%. O exemplo B6, FreeText/Ink/widgets são recusados
com explicação, sem retirar a barreira de conteúdo ativo.

A primeira rodada teve15 passes e3 falhas: replay multipart do WebKit nos
adaptadores de perda de resposta e fill do seletor na jornada antiga. A perda
agora ocorre somente após a resposta real do envio nativo, conservando bytes;
digitação normal e verificação do contexto conservaram a jornada. Na CI42ca8df,
Linux/Windows/banco e iOS1 passaram; os outros navegadores falharam na fixture
V4 sem waitSeconds e com a mensagem antiga. Ela foi corrigida e reensaiada nos
três. Um caso ENT excedeu30s totais antes da tela interativa no Chromium;
reensaio com90s para preparo/consultas passou, mantendo15s por ação/assertiva.
Não se afirma correção de produto nem aprovação da CI pelo ajuste do teste.

Remoto150/local150, histórico150/150 e sem pendências. Cópia crítica
012a5c4b-a398-4632-b403-597da91d708e:79 arquivos,10922839 bytes, manifesto
780588a5ebca622b092fdc4952e1c6787bae0fda77ac97cd44dc176cdb87faea.
BD restaurado isoladamente com149 conjuntos/FKs;33 objetos/32 PDFs e hash de
uma emissão ready conferidos em arquivos. Probe5,392s não aprova retomada do
Storage, independência de chave/computador ou RPO/RTO/D6.

399 identidades anteriores de função/grants preservadas, dois corpos legados
alterados como previsto e política evidence_upload comparada. Os149 conjuntos
anteriores, Auth9/profiles7, Storage33, cron e Vault foram preservados sob as
qualificações de clock/cursor já nomeadas. Sem locks, transações longas ou
índices inválidos. Catálogo igual salvo a flag local conhecida da condição
finita. Advisors privados39→41 e funções Auth149→153, anon3 inalterado; não
foram suprimidos avisos. Tabelas novas sem grants diretos; sem fixture/Auth
remoto, reset, transporte externo, alteração de cron/Vault ou promoção.

[Evidência](ATTACHMENTS_EVIDENCE.json), [contrato](ATTACHMENTS.md),
[preflight](ATTACHMENTS_REMOTE_PREFLIGHT.json),
[pós-check](ATTACHMENTS_REMOTE_MIGRATIONS.json),
[advisors](ATTACHMENTS_REMOTE_ADVISORS.json) e
[CI42ca8df](CI_42CA8DF_OBSERVATION.json). Matriz105x39 e29 colunas iniciais
preservadas:29 PASS/48 PARTIAL/28 NOT_STARTED. O novo SHA requer sua própria
CI. Missão ativa; PR7 OPEN Draft, sem merge; Sonar adiado pelo responsável.
Restam critérios de formulários/fidelidade, demais itens da matriz e gates
humanos/AT/aparelhos/D-C/D6. Arquivo Sonar do usuário continua fora do commit.

## D3.6 — formulários e identidade, validado local/remoto

Base publicada `f05754d581beaa6da410610d35982ca003e53a65`. C026, C030 e C031
comprovados por validação dirigida. Mensagens de
validação contextual e foco foram implementados em REQ e apresentações.
Nome curto distingue manter, alterar e remover explicitamente; JSON null
representa a remoção, enquanto omissão conserva o valor. Migration151 aplicada
na stack local verificada e no remoto, sem reset. Unitários41/41 e tipos/lint
dirigidos passaram. Auth real confirmou três casos distintos, incluindo
negativas, aprovação local distinta e replay; uma leitura incorreta no teste
foi corrigida e somente esse caso foi reensaiado.

21 casos distintos de produção compõem três coortes qualificadas. Seis casos
REQ/apresentação conservam consumidores/hashes; os 15 finais repetem política,
comparação, recuperação e vínculos. Foram 37 resultados terminais,35 passes e
duas falhas anteriores, com interrupção por reboot preservada. Diagnóstico
9 execuções/5 passes/4 falhas é separado. Uma falha de teste por orçamento
total WebKit foi corrigida com60s somente naquele caso, mantendo15s por ação
e todas as asserções. Corte real de controles em320px e uma primeira correção
de layout reprovada por axe foram corrigidos e reensaiados. Foco volta ao
botão de origem depois da consulta da versão confirmada, sem CAS obsoleto.

Remoto151/local151, histórico151/151, zero pendências antes do commit. Cópia
e5c5148c:79 arquivos/11059964 bytes; restore151 conjuntos/FKs,33 objetos/32 PDFs
e hash de uma emissão ready, upgrade151 aprovado. Dois preflights e uma
captura recusados por atividade concorrente foram preservados. A cópia válida
restaurada foi mantida; a atividade posterior ficou explícita, com schema,
histórico e Storage exatos e nenhuma remoção de linha. A comparação de
preservação usa o snapshot imediatamente anterior ao DDL, não o ponto antigo
de backup. 407 identidades/grants preservadas, três corpos alterados; Auth9,
profiles7, Storage33, cron/Vault e151 projeções pós-validados. Advisors sem
aumento; flag local conhecida da condição finita qualificada. Probe2,911s não
aprova recuperação operacional/RPO/RTO/D6. Sem Auth/fixture remoto, reset,
integração externa ou promoção. Matriz32 PASS/48 PARTIAL/25 NOT_STARTED;
29 colunas canônicas preservadas. CI f05754d terminou8/8 SUCCESS; novo SHA
exige CI própria. [Dossiê e recibos](FIELD_VALIDATION.md).

## D5.4 — Preview protegido, correção e recuperação validadas localmente

Em08/11 o responsável relatou falha no Samsung Galaxy S24 Ultra, Chrome e PWA,
mesmo após reinstalar: orientação offline, atualização e preparo para Push.
É evidência física relatada pelo responsável; não é ensaio físico do agente.
A hipótese de credenciais omitidas no precache foi reproduzida com o worker
real em origem loopback com barreira por cookie: script acessível, instalação
redundant em vez de activated. O reparo usa credenciais same-origin para entrega
e fixa tipo/tamanho/SHA-256 dos quatro arquivos públicos no build. Valida todos
antes de escrever e cria respostas limpas para o cache. Resposta privada de
mesmo tamanho,401, redirecionamento e erro de armazenamento não são promovidos;
limpeza só atinge a nova preparação incompleta. Cache privado/replay/autorização
e notificações genéricas mantêm seus contratos. Proteção Vercel preservada.

Registro, instalação, ativação pendente, falha real e confirmação de versão
têm estados próprios. Prazo de observação não vira aprovação ou falha inventada.
Retry recupera sem limpar Auth/rascunhos ou reinstalar. Push exige o registro
ativo confirmado antes de solicitar permissão e revalida depois dela; troca de
controlador invalida prontidão. Instalação na tela inicial é etapa distinta.
A URL estável da branch é orientada na interface a partir de variável validada
do servidor, sem conceder acesso ou transferir sessão entre origens.

27 unitários distintos e39 casos distintos de produção local aprovados em
coortes com hashes:36/36 iniciais;3 passes de interface e3 falhas de hipótese de
fixture activate;6/6 finais com ativação realmente pendente e recuperação nos
três motores. Total48 resultados/45 passes/3 falhas preservadas. A rejeição de
Promise auxiliar não tornou o worker redundant e não foi aceita como prova;
o teste corrigido segura a ativação real, atravessa o prazo sem prontidão e
libera a confirmação real. O primeiro diagnóstico de interface fechou um painel
já aberto; corrigido antes de produção. Tipos/lint afetados passaram, sem
suprimir regra. Axe, teclado e quatro larguras não homologam AT/aparelho físico.

Sem migration nova: ledger remoto151 reconsultado, zero pendências; os dois
jobs cron locais retornaram ativos e remoto não foi alterado. O novo SHA exige
CI e inspeção própria do Preview. Reteste físico S24/Chrome/PWA pelo endereço
estável, entrega externa e D-C/D6 continuam gates separados. Matriz105x39,
29 colunas canônicas e32 PASS/48 PARTIAL/25 NOT_STARTED preservados. Critérios
D5 seguem PARTIAL. Missão ativa, PR7 OPEN Draft, sem merge/promoção; Sonar
adiado. [Dossiê](PWA_PREVIEW_ACCESS.md) e [recibo](PWA_PREVIEW_ACCESS_EVIDENCE.json).

### Observação publicada do reparo PWA

b1541df foi commitado e enviado. Preview da branch READY no mesmo SHA,
deployment dpl_6e2d3cZEXMc3ZM6DwU19bgpqcQtv. Em09:17 UTC a inspeção mostrou
proteção ativa302 sem acesso, worker no-store/raiz, quatro arquivos públicos
com tipo/tamanho/SHA-256 exatos, runtime200/ready e API privada401 sem sessão
da aplicação. Requisição de operador autenticada pela CLI não é sessão física
Android. [Recibo sanitizado](PWA_PREVIEW_OBSERVATION.json). Reteste S24 continua
pendente. CI42466270684 é própria desse SHA; resultado não aprova D4.6 novo.

## D4.6 — registros intermediários da validação técnica

Os dois registros abaixo preservam o andamento; o fechamento corrente está
na subseção final, após a qualificação da atividade de monitoramento.

O responsável adiou a aparência dos PDFs e priorizou a parte técnica. Sem
redesenho de fontes/cores/composição; verificações de limites continuam para
impedir perda de dados. Revisão7 usa RPC versionada e congelamento privado de
resoluções ENT/eventos de parcelas COM, preservando fonte/hash canônico e
default/RPC6. Títulos semânticos, observação REQ, avaria/resoluções ENT,
pareceres antigos/política BAL e proveniência de parcelas COM foram ampliados.

18 controles de bytes V4/V5/V6 exatos, cinco casos Auth distintos e preflight
com rollback/preparo local aprovados. Primeira produção:27 passes/3 falhas do
novo teste REQ ao trocar contexto antes de sair da rota do documento anterior.
Guarda preservada; rodada dirigida REQ/BAL em execução. Oráculo Python aprovou
oito exemplares assinados, sem prova estética/AT ou confiança externa. Nenhum
critério novo fechado antecipadamente. Local152/remoto151; migration152 já é
imutável localmente, remota depende das provas finais e backup/compatibilidade.
[Contrato e próximos passos](PDF_FIDELITY.md). Missão ativa, sem merge/promoção.

### D4.6 — avanço e pós-validação pendente

Rodada dirigida6/6 passou; são30 casos distintos em coortes,36 resultados,
33 passes/3 falhas anteriores preservadas. Quatorze exemplares assinados foram
conferidos independentemente com duas contraprovas do oráculo. CI b1541df
concluiu8/8 SUCCESS; isso não aprova o incremento novo.

Cópia crítica0648d0ac verificada/restaurada e upgrade152 isolado passaram.
Preflight aceitou407 identidades/grants anteriores, uma definição ampliada e
duas funções novas; default/RPC6 conservados. A migration152 foi aplicada no
remoto pelo CLI, sem roles/seeds/Vault. Local152/remoto152 neste ponto.
Não reaplicar. A primeira pós-validação recusou divergência nas projeções
private.operations_history e private.operations_incidents durante a janela
DDL. Histórico152/152 e catálogo passaram antes da recusa; a causa das duas
mudanças precisa ser rastreada antes de concluir preservação. Recusa e snapshot
imediato permanecem protegidos; nenhum pós-check final aprovado por inferência.

### D4.6 — fechamento local e remoto152 pós-validado

Investigação fechou a recusa: o incidente existente HEARTBEAT_STALE de Preview
escalou às10:26 UTC, antes do CLI às10:28. As21 linhas antigas de histórico são
exatas e o evento acrescido reproduz o digest pós-check; a alteração somente de
severity/version de um incidente reproduz o outro digest entre três valores
permitidos. A recuperação posterior às10:34 ficou separada. As149 demais
projeções estáveis coincidem; não se afirma igualdade de todas as151 tabelas.
Nenhuma tabela excluída genericamente ou comparador/monitoramento relaxado.

Local152/remoto152, histórico SQL152/152, zero pendências. Backup crítico
0648d0ac:79 arquivos/11114941 bytes verificados; restore151 conjuntos/FKs,
33 objetos/32 PDFs e digest de uma emissão, upgrade152 isolado aprovado.
407 contratos/grants antigos, default/RPC6, Auth9/profiles7, cron/Vault e
Storage33 preservados; runtime200/protocolo1/schema1 e negativas anônimas
conferidos. Catálogo equivalente com qualificações conhecidas documentadas;
advisors acrescentam somente a RPC Auth versionada, sem suprimir alertas.
Probe3,67s não homologa recuperação operacional/RPO/RTO/D6.

Passaram16 unitários distintos, cinco Auth e30 de produção em coortes;
24/7/36 resultados terminais respectivamente, com1/1/3 falhas preservadas.
18 controles antigos exatos e14 PDFs reais aprovados por verificador
independente, incluindo associação de evento/quantidade, idioma, limites,
rodapé e assinatura/TSA interna. Corpus revalidado após publicação documental;
metadado Subject final e guard de política receberam unidade dirigida e
tipos/lint finais. Sem aprovação estética/AT/ICP-Brasil/aparelho físico.

Matriz105x39:38 PASS/50 PARTIAL/17 NOT_STARTED,29 colunas canônicas intactas.
C015/C036/C103/C104/C109 locais; C-NEW-AC-019 reconciliado com16 hashes exatos
do lote anterior. C111/C-NEW-AC-018 somente parciais; demais estados, história
comparável e gates humanos/AT/D-C/D6 continuam. CI b1541df8/8 SUCCESS não
aprova o novo SHA. Publicação incremental/CI/Preview próprios seguem gate;
missão ativa, PR7 OPEN Draft, Sonar adiado, sem merge/promoção/integração externa.
[Dossiê](PDF_FIDELITY.md), [provas](PDF_FIDELITY_EVIDENCE.json) e
[pós-check qualificado](PDF_FIDELITY_REMOTE_MIGRATIONS.json).

## D4.7 — registro inicial da comparação histórica

Base df49881 publicada. O Preview correspondente já está READY no endereço
estável, com proteção, assets públicos exatos, runtime200 e fronteira privada401
conferidos pelo operador. CI42473738962 aprovou banco/validate Ubuntu/Windows;
quatro jobs browser estavam ativos na observação. Isso não aprova D4.7 novo.

Histórico de supply usava nome atual do diretório por actorId. O novo leitor
usa exclusivamente o nome congelado e sinaliza sua ausência. Consulta Auth/RLS
por versão exata, referência anterior e revalidação final foi acrescentada,
sem migration. Projeção mantém números originais, diff por identidade, fatos em
leitura e desconhecimento explícito dos campos ainda sem descrição. URL conserva
versão/referência ao consultar arquivos e voltar; consulta não emite exemplar.

Nove unitários distintos aprovados em duas coortes/12 resultados; tipos/lint
finais passaram. Diagnósticos iniciais de imports/tupla foram corrigidos sem
reduzir regras. Produção dirigida15 casos nos três motores está em execução;
fontes estáveis, sem outro ensaio mutável de banco em paralelo. Nenhum critério
novo aprovado antes das provas. [Contrato e limites](DOCUMENT_VERSION_HISTORY.md).

### D4.7 — fechamento local da comparação histórica

Passaram10 unitários distintos em coortes/25 execuções, um probe Auth real após
duas recusas de fixture e18 casos distintos de produção:12 novos/6 consumidores.
São42 resultados/24 passes/18 falhas preservadas, com3 resultados de diagnóstico
Next dev separados (2 passes/1 falha). Não se declara uma rodada única18/18.
Foram corrigidos perda real de foco no botão desabilitado e rótulos/números
brutos; as demais falhas eram de fixture/asserção/seletor do teste novo.

Treze hashes delimitam cada coorte. Os caminhos REQ/BAL e consumidores PDF
inalterados reaproveitam suas provas; a última COM3/3 cobre apresentação comum,
quatro larguras, ator/catálogo posteriores, negativas reais, retomada da seleção,
versão/hash incorporados e mesmos bytes.48 snapshots sintéticos foram inspecionados
para descrição dos campos, sem confundir isso com48 execuções de fluxo.
Tipos/lint finais passaram; dois cron locais continuam ativos.

Leitura restrita passou3/3: familiar sem criar/aprovar/comprar lê a história,
enquanto compra retorna403 sem alteração. A fixture clínica inicialmente
recusada preserva a barreira financeira, comprovada por RPC/RLS; não foi
liberada por override para satisfazer o teste. Fontes finais correspondem à
última coorte, com guard de propriedade própria também coberto por unidade.

C034/C-NEW-AC-017 locais; CFINAL018 parcial. Matriz105x39:40 PASS/51 PARTIAL/
14 NOT_STARTED;29 colunas canônicas intactas. HTML histórico por versão não
conclui PDF marcado, demais estados, tarefas humanas/AT/aparelhos ou D-C/D6.
Local152/remoto152 reconsultado; nenhum SQL novo, reset, Auth/fixture remoto,
transporte externo ou promoção. CI df49881 terminou8/8 SUCCESS e Preview READY;
o SHA novo exige seus próprios gates. PR7 Draft e missão ativa; Sonar adiado.
[Dossiê](DOCUMENT_VERSION_HISTORY.md),
[evidências](DOCUMENT_VERSION_HISTORY_EVIDENCE.json) e
[vínculos arquivo/versão](DOCUMENT_VERSION_HISTORY_BINDINGS.json).

## D3.13 — etapa privada e reconciliação da origem

C-NEW-AC-014 preserva etapa fora de content/contentHash, com listas fechadas por
tipo/finalidade/modo, resumo em leitura, CAS e recuperação do pacote original.
REQ/COM/ENT/BAL retomam a etapa adotada; legado sem etapa retoma o início.
16 unitários,30 Auth e6 produção Chromium passaram; cinco Next dev são separados.
A coleta inicial .test.tsx foi corrigida para .test.ts e cinco casos novos
foram efetivamente executados, sem relaxar o filtro. Tipos/lint passaram.

Migration153 aplicada local/remoto após backup verificado, restore de151 tabelas,
34 objetos,33 PDFs e duas emissões assinadas por digest, e upgrade isolado.
409 identidades/grants existentes preservados; somente três definições mudam,
mais um helper privado sem execução para clientes. Nenhum DML de negócio.
Pós-DDL conserva todos os campos antigos, projeta só a nova coluna e exige NULL
nas linhas anteriores; cron/Vault/políticas Storage preservados. Zero pendências.

C-NEW-AC-023 reconciliado sem nova implementação: seis PASS de dois cenários
nos três motores, nos logs da CI42480516297/8a17202, fontes/contratos idênticos.
Matriz105x39:42 PASS/51 PARTIAL/12 NOT_STARTED; primeiras29 colunas intactas.
CI8a17202 terminou8/8 SUCCESS; Preview protegido READY e probe da origem estável
com quatro ativos fixados, SW anônimo302 e APIs privadas401 sem sessão do app.
O novo SHA requer CI própria. PDFs continuam técnicos; aparência com o owner.
D6/humano/AT/aparelho, ICP-Brasil/TSA externa e demais critérios continuam gates;
backup/probe não equivalem a RPO/RTO ou recuperação operacional. Sonar adiado,
PR7 Draft, sem merge, produção NO-GO, missão D-B ativa.
[Dossiê](DRAFT_NAVIGATION.md), [evidências](DRAFT_NAVIGATION_EVIDENCE.json),
[pós-DDL](DRAFT_NAVIGATION_REMOTE_MIGRATIONS.json) e
[origem tipada](STOCK_ORIGIN_RECONCILIATION.md).

## D3.14 — seleção frequente, identidade textual e fechamento de CI

REQ-05/C-NEW-AC-024 implementado por usuário/paciente: drawer busca e permite
escolha explícita, nome2–80, disponibilidade atual e retorno com foco. Lista
guarda só IDs textuais; novas linhas não copiam estoque7, urgência ou motivos.
Duplicatas preservam a edição atual; zero membros elegíveis não habilita sucesso.
Salvar/aplicar não emite; uma confirmação explícita posterior teve payload e
linhas oficiais conferidos. Extra não catalogado não entra na lista.

Cinco unitários e quatro Auth reais passaram. Produção: cinco casos iniciais
(três novos+dois de compatibilidade) e dois rechecks finais de elegibilidade
passaram; fontes/coortes são qualificadas no dossiê. Protótipo154 corrigido
incrementalmente pela155 após descobrir identidade textual; primeira tentativa
155 revertida antes de aplicação. Três falhas Auth e três diagnósticos de UI
foram preservados e corrigidos; Next dev não é contado como produção.

Remote155/local155, zero pendências. Primeiro preflight recusou mudanças de
Auth/monitoramento desde captura; novo backup520ddb89 verificado e restaurado,
80 arquivos/11341372 bytes,151 tabelas/FKs,34 objetos/33 PDFs/duas emissões por
digest. Upgrade153→155 isolado4,283s;410 funções/grants anteriores preservados.
Pós-DDL conserva todos os campos antigos, sem projeção nova de colunas, e
confere o histórico155. Duas tabelas novas vazias; cron/Vault/Storage intactos.
Advisors202 segurança/164 desempenho,0 ERROR; +2 RPCs autenticadas/+2 índices
sem uso observado. Não se suprimiram avisos ou removeram índices para aprovação.

CI f0840dc terminou4 SUCCESS/4 FAILURE, não aprovada. Consumidor antigo de
retomada esperava início; testes de teclado/foco entravam antes da prontidão.
Uma espera forte reproduziu falha real de foco no WebKit, corrigida no produto
com foco após commit do resultado e sequência vigente. Código completo43 antes
de consultar; QR/upload/regras de integridade preservados. Coortes de reparo:
12 execuções/11 PASS/1 FAIL, nove casos distintos com PASS nos três motores;
harness final24 PASS mantém traps, ocultos, inert e landmark oculto negativos.
O novo SHA exige sua própria CI completa; não se converteu f0840dc em verde.

Matriz105x39:43 PASS/51 PARTIAL/11 NOT_STARTED,29 colunas canônicas intactas.
Sem aparência PDF nova, reset, Auth/fixture remoto, transporte externo, merge
ou promoção. D6/humano/AT/aparelho, S24 físico, ICP-Brasil/TSA externa e
recuperação operacional/RPO/RTO continuam gates; Sonar adiado e meta ativa.
[Dossiê](RECURRING_SELECTION.md), [coortes](RECURRING_SELECTION_EVIDENCE.json),
[pós-DDL](RECURRING_SELECTION_REMOTE_MIGRATIONS.json) e
[CI anterior](CI_F0840DC_OBSERVATION.json).

## D4.8 — regularização ENT e prioridade da operação diária

Orientações posteriores: fichas/PDFs/estoque/recuperação primeiro; apoio depois
das dependências necessárias. Remoto contém somente testes do responsável,
que dispensou backup/restore/comparação integral repetidos por migration.
Complementos preservados em OWNER_AMENDMENTS; missão integral continua ativa.

V8 explicita estado/versão anterior, resultado/versão do procedimento,
identidades e instantes de proposta/conferência/decisão/execução, aceite
original, motivos/base/limites e conciliação/trânsito antes/depois. Propostas
sem aprovação não executam e desconhecido permanece em trânsito. Sem mudança
estética. Seleção é pelo evento congelado; outros documentos ficam V7.
Mesma chave mantém V7 anterior; helpers continuam privados e a UI não escolhe
revisão, autoria ou snapshot. GET baixa bytes registrados, sem gerar.

Cinco unitários novos+dez existentes passaram em coortes;18 controles V4/V5/V6
e o digest V7 regularizado permanecem exatos. Três Auth distintos passaram,
incluindo isolamento/revogação/grants/replay/estados e ledger. Primeiro Auth
teve duas expectativas de fixture corrigidas; marcador longo foi corrigido
para múltiplas linhas no teste, sem perda real de texto. Falhas preservadas.

Produção:9 PASS nos3 motores; extensão Chromium1 PASS confere consulta por
código/upload sem sessão do app e ausência de dados privados. Inicialmente
18 PDFs reais foram gerados; seis exemplares distintos estão no corpus com
raiz pública, sem chave. pyHanko/pdfplumber/pypdf conferem fatos associados,
quantidades/ledger, geometria/rodapé, ENTIRE_FILE e TSA interna. Dois negativos
independentes recusam executor/total falsos. Não é confiança externa/ICP.

Uma cópia bruta de evidência .spec.ts entrou no include TypeScript e impediu
o início da coorte adicional. Arquivada como .txt; tipos e início de produção
passaram. Só nome do artefato recebeu browserName no hook; fontes de produto
ficaram estáveis nos ensaios. Não se excluiu teste nem se relaxou regra.

Migration156 remota aplicada após validação local, histórico155 e dry-run
com apenas a pendente, sem roles/seeds/Vault. Pós-validação: histórico156 SQL
exato; funções/grants pertinentes iguais ao local, reservas anteriores intactas,
helpers fechados, dois crons ativos, sem locks aguardando/índices inválidos.
Sem backup/restore/comparação integral redundantes, conforme nova orientação.
Advisors203 segurança/164 desempenho,0 ERROR; +1 RPC autenticada, guards
comprovados e warnings mantidos. Sem Auth/fixture/reset remoto ou envio externo.

Commit do responsável3add56f, somente configuração SonarLint, foi preservado.
CI105dc9d cancelada por supersessão; não aprovada. CI3add56f observada com banco
e validate Windows/Ubuntu SUCCESS e quatro browsers em andamento. Isso não
valida este novo lote nem substitui CI própria do SHA publicado. Sonar permanece
adiado pelo responsável; PR7 Draft, sem merge ou promoção.

Matriz105x39:43 PASS/52 PARTIAL/10 NOT_STARTED,29 colunas canônicas intactas.
C7-AC-002 agora parcial: núcleo técnico comprovado; comunicação proporcional,
designação/aceite físico, AT/aparelho e D-C/D6 permanecem próprios. Próximo
núcleo diário: marcos temporais de ENT e pendências factuais de fichas/estoque.
[Dossiê](REGULARIZATION_PDF.md), [coortes](REGULARIZATION_PDF_EVIDENCE.json),
[pós-DDL](REGULARIZATION_PDF_REMOTE_MIGRATIONS.json) e
[oráculo independente](d4-regularization-proof/VERIFICATION.json).

## D4.9 — marcos ENT e reconciliação do vínculo histórico

Base5a7d546; prioridade diária mantida. Runtime, aparência e migrations não
foram alterados: os marcos já estavam separados, faltava a prova ENT de C101.
Dois Auth, um unitário discriminante e seis casos de produção passaram nas
duas variantes e três motores. Quatro PDFs reais, entre12 gerações do ensaio,
foram conferidos pelo oráculo independente existente, sem modificar o script.
Fatos, rótulo/data, identidade/bytes, geometria/rodapé, ENTIRE_FILE e TSA interna
passaram. Data da criação não pode ocupar o campo da expedição mesmo quando
ambas aparecem no arquivo; negativo independente recusou essa adulteração.

Preparação retida usa criação armazenada anterior e expedição por novo evento;
rascunho privado preserva seu primeiro salvamento após consumo. Duas intenções
geram exemplares próprios; download repetido e relógio do navegador avançado
conservam bytes/ID/data e número de emissões. Pré-expedição não reserva, nem
move estoque; cliente Auth não altera datas de ficha ou evento. Ledger intacto.
Relógios antigos controlam só novas fixtures locais de desenvolvimento; eventos,
corpos e hashes originais não mudam, nenhum trigger é desabilitado. Não é
espera real de24 horas, avanço do relógio do servidor ou aparelho físico.

C108 ainda carregava a lacuna D4.4. D4.7 já oferece antes/depois/motivo e arquivo
da versão selecionada. Treze fontes/testes mais cinco consumidores/lockfile
coincidem no candidato e em8a17202; sua CI terminou8/8 SUCCESS. Reconciliação
reusa as coortes qualificadas e três vínculos versão/hash/arquivo, sem executar
ou recontar a suíte antiga. Renderização/reserva D4.8 e oráculo de teclado
evoluíram fora desses contratos e conservam suas provas próprias.

Read-only remoto confirmou156 migrations, última20261108194000; nenhuma nova
migration ou mutação remota neste lote. Sem reset, backup/restore redundante,
Auth/fixture remoto ou envio externo. Tipos e lint dos testes passaram. CI5a7d546
terminou8/8 SUCCESS, incluindo banco e quatro jobs de navegadores. Esse resultado
valida o runtime base, mas o próximo SHA exige CI própria para os novos testes.
PR7 Draft, sem merge/promoção; meta ativa.

Matriz105x39:45 PASS/50 PARTIAL/10 NOT_STARTED;29 colunas canônicas intactas.
C101/C108 passam localmente; AT/humano/aparelho/PDF marcado/D-C/D6 e demais
requisitos executáveis continuam próprios. [Dossiê](ENT_TEMPORAL.md),
[coortes/reuso](ENT_TEMPORAL_EVIDENCE.json),
[corpus](d4-ent-clocks-proof/CORPUS.json) e
[verificação](d4-ent-clocks-proof/VERIFICATION.json).

## D4.10 — tarefa de recebimento e estado encerrado ENT

Base9987804. Corrigida causa real: V7 cancelada e V8 encerrada sem aceite
continuavam instruindo conferência pessoal. Novas intenções ENT usam V9;
declaração, métrica e linhas leem estado/aceite/representação congelados.
Versão derivada preservada não cria tarefa atual. Encerramento administrativo
não inventa aceite nem resolve situação física desconhecida. Fatos V8 mantidos.
Sem revisão estética. Bytes V5–V8 e três entrypoints anteriores preservados;
aviso passivo no acervo ENT orienta consultar a ficha atual. Download e grants
permanecem. C108 reusa núcleo de histórico inalterado; DocumentActions mudou
somente nesse aviso, coberto por uma extensão Chromium aprovada.

37 unitários distintos aprovados em coortes, dois Auth, nove cenários de
produção nos três motores, três consumidores existentes e extensão do aviso.
Produção:12 casos distintos,14 execuções,13 PASS/1 FAIL. Falha foi timeout
de contexto antes do PDF, correlação e erro PostgreSQL preservados; repetição
dirigida sem mudança passou. Sete PDFs reais independentes: seis V9 e um V8
recuperado. Identidade/bytes, região semântica, limites/rodapé, idioma,
ENTIRE_FILE e TSA interna conferidos. Tipos e lint afetados passaram.

Migration157 aplicada e pós-validada no remoto autorizado:157 versões e novo
SQL exatos, seis funções/grants iguais ao local, três entrypoints antigos
intactos, helpers fechados, dois crons iguais, sem locks/índices inválidos.
Sem reset/fixture/Auth remoto ou backup/restore/comparação de dados redundante.
Advisors204 segurança/164 desempenho,0 ERROR, warnings conservados. Sem
transporte externo, promoção ou alteração de produção.

Matriz105x39:45 PASS/50 PARTIAL/10 NOT_STARTED,29 colunas canônicas intactas.
C105 permanece parcial com o novo escopo ENT; C106 e demais combinações,
anexos, PDF marcado, humano/AT/aparelho e D-C/D6 continuam próprios. CI9987804
observada em andamento; o novo SHA exige CI própria. Sonar adiado pelo
responsável; PR7 Draft, sem merge; meta ativa e prioridade diária mantida.
[Dossiê](ENT_TERMINAL.md), [coortes](ENT_TERMINAL_EVIDENCE.json),
[remoto](ENT_TERMINAL_REMOTE_MIGRATIONS.json),
[corpus](d4-ent-terminal-proof/CORPUS.json) e
[verificação](d4-ent-terminal-proof/VERIFICATION.json).

## D3.15 — continuidade de teclado na edição diária

Base827531e. Reprodução real do catálogo confirmou perda do campo após
Continuar editando. RecordDrawer preserva último controle e devolve foco antes
de remover o aviso; controle indisponível usa fallback habilitado/visível.
Busy/preventClose também protegem os botões de descarte. O catálogo fornece
o título como destino explícito quando o acionador ainda está desabilitado
pela atualização após salvar. Sem escrita ou descarte implícito, sem nova
abstração ou alteração de autorização. Aparência de PDF permanece fora do lote.

Baseline1 FAIL no retorno ao campo; primeira correção6 FAIL no retorno após
salvar. Essas contraprovas estão preservadas. Uma coleta foi barrada por tipo
HTMLElement/SVGElement no teste antes de executar navegadores; corrigida com
métodos de atributo. Coorte final9 PASS nos três motores: seis novos casos
390/1440 e três consumidores existentes de edição/inativação do catálogo.
Descarte/Escape não gravam, continuar preserva valor, hidden controlado exige
fallback visível, POST legítimo retido mantém o painel ocupado, salvar cria
uma linha e retorna a destino contextual. Tipos e lint passaram. Nenhuma suíte
mutável de banco em paralelo ou repetição global local sem necessidade.

Nenhuma migration: local/remoto157, pós-DDL do lote anterior preservado, sem
nova operação remota. Preview827531e READY na origem estável, SHA antes/depois
do probe, runtime200/ready, emissões401 sem sessão e worker302 sem acesso Vercel.
CI827531e observada com validate Windows/Ubuntu SUCCESS e banco em andamento;
o novo SHA exige CI própria. Sonar adiado; PR7 Draft, sem merge/promoção.

Matriz105x39:45 PASS/51 PARTIAL/9 NOT_STARTED;29 colunas canônicas e complementos
aprovados intactos. C037 agora parcial local. Demais diálogos, Voltar/Confirmar,
humano/AT/aparelho e D-C/D6 continuam próprios; meta ativa, prioridade diária.
[Dossiê](DRAWER_FOCUS.md), [coortes](DRAWER_FOCUS_EVIDENCE.json),
[Preview V9](ENT_TERMINAL_PREVIEW_OBSERVATION.json) e
[CI base](CI_827531E_OBSERVATION.json).

## D3.16 — retenção e escopo da recuperação privada

Basebca3933. Reprodução mostrou que o buffer REQ removia a chave de tentativa
real já confirmada após24h. O mesmo corte existia no modo e envelope BAL
agendado. Removidos os três cortes conforme VI.4/VII.1 da ordem atual. A cópia
opcional da aba continua isolada por usuário/paciente/alvo; a contagem editável
exige assignment/referenceRevision correspondentes, e a rota pendente conserva
sua lista permitida. Interface e instruções atuais distinguem aba de conta.
Logout limpa local sem excluir o draft salvo; nenhuma ficha nasce ao digitar.

Coorte final12 PASS nos três motores: nove casos novos de recuperação/escopo
e três consumidores legados REQ. Envelope26h reenvia exatamente a mesma chave/
pacote e recupera a mesma ficha/comprovante; BAL aprovado tem ledger real não
vazio, preservado no replay. Metadata26h de draft novo, logout, outro paciente,
outro titular com rascunho próprio e contexto novo conservam ID/revisão/hash/
etapa sem efeito oficial. Valores legados0/7 permanecem a revisar.

17 execuções:14 PASS/3 FAIL preservadas. Baseline perdeu recuperação; fixture
usou coluna updated_at inexistente e foi corrigida para saved_at; a expectativa
submitted de BAL opcional foi corrigida para seu contrato approved, com ledger
não vazio e sem alterar regra do produto. Tipagem inicial do teste corrigida
antes do browser. Avisos do limite de falhas não são casos adicionais. Respostas
CONTEXT_REQUIRED de notificações na troca de sessão permanecem nos logs.
Tipos/lint afetados passaram; sem repetir suíte global local. Relógios antigos
são controles fictícios, sem alterar eventos nem alegar espera física de26h.

Read-only remoto confirmou157, última20261108212500; nenhuma migration nova,
Auth/fixture/reset remoto, backup/restore redundante ou envio externo. Preview
basebca3933 READY, API/PWA iguais ao probe827531e. CI base com banco e validate
Windows/Ubuntu SUCCESS, quatro browsers em andamento; novo SHA exige CI própria.
Sonar adiado, PR7 Draft, sem merge/promoção; meta ativa, operação diária primeiro.

Matriz105x39:46 PASS/50 PARTIAL/9 NOT_STARTED;29 colunas canônicas preservadas.
C032 recebe complemento da ordem vigente, sem TTL imposto. Outros consumidores,
AT/humano/aparelho e D-C/D6 permanecem próprios. [Dossiê](DRAFT_LIFECYCLE.md),
[coortes](DRAFT_LIFECYCLE_EVIDENCE.json),
[remoto](DRAFT_LIFECYCLE_REMOTE_OBSERVATION.json) e
[CI base](CI_BCA3933_OBSERVATION.json).

## D3.17 — declaração profissional e conferência familiar

Basec8c34f4. Perfil próprio informa nome/função/registro/UF, sem registro
fictício obrigatório. Família/admin local com capacidade confere outra pessoa
no paciente explícito; banco congela valor/revisão/hash/ator/instante. Mudança
e restauração do valor exigem nova conferência. Nenhum papel/selo externo é
concedido; upload/consulta externa continuam adiados conforme P01.

Sete unitários e cinco Auth distintos passaram em coortes; dez execuções Auth
incluem sete PASS/três FAIL conservadas. Doze casos de produção passaram nos
três motores: seis novos e seis consumidores existentes do painel. Replay após
commit com resposta perdida, histórico20+2, leitura503, perfil próprio,409 sem
rebase, revisão após mudança e negativas reais de lock/sessão/vínculo cobertas.
Renomeação posterior de ref tem equivalência textual, sem mudança de fluxo.

CI da base falhou em C026 e main ambíguo de rota preservada. Reprodução local
confirmou; produto centraliza campo inválido, teste exige posição/hit-test.
Oráculo exige um único main visível, preservando inert/aria-hidden/traps.
Quinze regressões de produção e30 controles sintéticos passaram nos três
motores, incluindo listas frequentes. Axe não foi reduzido. Tipos/lint passaram.
CI do novo SHA continua obrigatória, sem aprovação por resultado anterior.

Local/remoto161, zero pendências. Migrations158–160 e índice161 tiveram
pré-validação incremental, histórico/dry-run/pós-check dirigido, sem repetir
backup/restore integral do banco descartável. O índice corrigiu FK sem cobertura.
Advisors: segurança208 INFO43/WARN165; desempenho166 INFO155/WARN11, zero ERROR.
RLS privado fechado/RPCs guardadas e índices sem carga estão qualificados.
Sem reset/fixture/Auth remoto, transporte externo, merge ou promoção.

Matriz105x39:48 PASS/50 PARTIAL/7 NOT_STARTED;29 colunas canônicas e complementos
preservados. C7-AC-001/C-FINAL-AC-020 passam localmente; humano/AT/aparelho,
zoom400% real, validação externa e D-C/D6 continuam próprios. Sonar adiado,
PR7 Draft, meta ativa e prioridade diária. PDF/TSA/backups/monitoramento mantêm
seus limites. [Dossiê](PROFESSIONAL_CREDENTIALS.md),
[provas](PROFESSIONAL_CREDENTIALS_EVIDENCE.json),
[remoto](CREDENTIAL_REMOTE_MIGRATIONS.json), [advisors](CREDENTIAL_ADVISORS.json)
e [CI base](CI_C8C34F4_OBSERVATION.json).

## D3.18 — falha de leitura tipada no histórico

Baseccebfcb. Resposta200 com selected:null derrubou a página inteira no
baseline Chromium. Decoder agora confere estrutura, documento, versão exata,
predecessor, índice/hash/ação e proveniência antes de renderizar. Erro fica na
seção com Atualizar; fatos não viram input inválido. Decimal/código/nome antigo,
protocolo ausente e aviso de fatos adicionais são preservados. O decoder do
useScopedRead é opcional, com consumidor real no histórico; demais caminhos
continuam como antes. Não se confunde conferir projeção com verificar assinatura.

Dez unitários anteriores/sete novos passaram; os sete foram repetidos após
redução sem spread na busca do predecessor. Produção15 PASS nos três motores:
três novos e12 consumidores anteriores. Sete respostas defeituosas por motor,
retry por Enter com foco preservado, zero pageerror/comando, história/ledger/
emissões iguais; REQ/COM/ENT/BAL,503 e negativas Auth reais cobertas. Baseline
FAIL, screenshot e contexto preservados. Tipos/lint passaram; Axe mantido.

Nenhuma migration ou mutação remota: local161, SQLs inalterados e recibo remoto
161 anterior preservado; sem backup/restore redundante. CI base: validação
Windows/Ubuntu SUCCESS e banco em andamento; Preview estávelccebfcb READY.
Novo SHA exige CI própria. PR7 Draft, Sonar adiado, sem merge/promoção.

Matriz48 PASS/51 PARTIAL/6 NOT_STARTED;105x39,29 colunas canônicas/complementos
preservados. C034 mantém prova com regressão ampliada. C-FINAL-AC-023 agora
parcial, sem aprovar demais superfícies, humano/AT/aparelho ou D-C/D6. PDFs,
certificado/TSA, backup e monitoramento conservam seus limites. Meta ativa,
prioridade diária. [Dossiê](HISTORY_READ_BOUNDARY.md),
[evidências](HISTORY_READ_BOUNDARY_EVIDENCE.json),
[CI base](CI_CCEBFCB_OBSERVATION.json).

## D3.19 — leitura, anexos e foco nas tarefas diárias

Base3a6bdc9. Cinco falhas reproduzidas: lista/guia antigos após erro/recusa,
foco perdido ao atualizar ENT/escala e código inválido sem foco. Anexos ocultam
links recusados inclusive na recuperação, preservando intenção/arquivo. Erro
de consulta não marca arquivo inválido; tamanho/original divergente focam só o
input legítimo após liberar o campo. Botões estáveis têm aria-disabled/guarda.
Guia particiona consulta por titular/paciente/modo/papel/tentativa e oculta
tarefas antigas; progresso confirmado permanece no servidor.

39 casos atuais PASS nos três motores:15 novos/24 consumidores anteriores,
com60 scans Axe novos. Reutilizados10 PASS da fonte atual e executados somente
os29 restantes por lista oficial; nenhum pendente excluído.51 execuções totais:
44 PASS/7 FAIL preservadas. Cinco FAIL baseline; duas do instrumento, por não
esperar fim da leitura ENT e por anunciador interno do Next fora do main.
Pacote original, hashes, arquivo escolhido, identidade e negativas Auth reais
preservados; só configuração explícita do guia muda metadata no caso novo.
PDF passivo real sem assinatura não gera emissão. Tipos/lint passaram.

7 Auth de preparação/guia reaproveitados da CI database3a6bdc9,395/395 PASS;
10 bindings antigos pertinentes coincidem, guia/browser alterados têm prova
nova. Nove bindings do histórico D3.18 coincidem; não se conta sua coorte como
nova. CI base com banco e validações Windows/Ubuntu SUCCESS, browsers ainda
em andamento na observação. Novo SHA exige CI própria; Sonar adiado.

Nenhuma migration/mutação remota ou backup/restore redundante. Local/remoto161,
SQLs inalterados, crons locais observados ativos no pós-check. Matriz105x39:
48 PASS/52 PARTIAL/5 NOT_STARTED,29 colunas/complementos preservados.
C-FINAL-AC-023 continua parcial por GUI-04; guia pessoal não é runbook operacional.
C-NEW-AC-027 agora parcial pela base existente, sem aprovar revisão completa
GUI-01/02/03/adoção/delegação/contingência. Humano/AT/aparelho e D-C/D6 próprios.
PDF/TSA, backup e monitores mantêm limites. PR7 Draft, sem merge/promoção,
meta ativa e prioridade diária. [Dossiê](DAILY_READ_RECOVERY.md),
[provas](DAILY_READ_RECOVERY_EVIDENCE.json), [CI base](DAILY_READ_CI_BASE.json).

## CI — barreira real de commit no teste de credenciais

Após033b936, a CI da base3a6bdc9 apontou uma falha WebKit, repetida no retry:
o painel de intenção preservada aparecia antes do POST terminar, e o teste
exigia imediatamente um registro no banco. O oráculo foi corrigido, sem mudar
produto: reter POST antes do envio, comprovar painel/zero registros, liberar em
finally, esperar requestfailed após route.fetch200 e só então comprovar um
registro. Reload/replay conservam a mesma chave e o mesmo registro.

Três rechecks de produção PASS nos três motores, inclusive WebKit. Tipos/lint
passaram. Auxiliares e segundo caso do arquivo permanecem textualmente iguais;
fontes do produto pertinentes coincidem com a evidência anterior. A CI antiga
não recebe aprovação retroativa; novo SHA exige CI própria. Sem delay fixo,
aumento de timeout, redução de assertiva, código de produto ou migration nova.
Sem nova operação remota. Matriz48 PASS/52 PARTIAL/5 NOT_STARTED e29 colunas/
complementos preservados; somente prova de C7-AC-001/C-FINAL-AC-020 ampliada.
PR7 Draft, sem merge/promoção, Sonar adiado, meta ativa.
[Evidências](CREDENTIAL_COMMIT_BARRIER_EVIDENCE.json).

## D3.20 — consulta de ficha relacionada

Basec8e2f8e. A ENT vinculada à REQ mostrava “Expedido/proposto” sem unidade.
Contraprova falhou; após corrigir os fatos, outra falha expôs retorno de foco.
Consulta agora reutiliza SupplyLineSummary, confere ID/tipo/fatos da resposta,
retira resultado antigo em falha e oferece retry com foco/guarda. Declaração
de transferência não vira expedição. Nenhum controle de edição/emissão; REQ
mantém sua abertura/ciência separadas. Nove pontos de chamada preservados.

Quatro unitários e21 casos distintos de produção qualificados nos três motores:
três novos na fonte final e18 consumidores de ciência/origem do estoque
preservados da coorte anterior;12 scans Axe novos. A mudança entre coortes
apenas altera o ciclo/foco do contêiner: consulta retirada antes de restaurar
foco no frame seguinte, com referência explícita ao botão. Os dois leitores
internos permanecem textualmente iguais; abertura/retorno repetidos nos três
motores. Focar apenas antes de abrir falhou no WebKit e não foi aceito.
GET503 recuperado, tipo errado em200 recusado, outro paciente403, nenhum POST
operacional e fatos SQL iguais antes/depois. Quatro contraprovas FAIL preservadas.
Tipos/lint passaram; suítes gerais ficam na CI própria do SHA publicado.

Remoto161 versões coincide com local, zero pendências/SQL nova ou mutação.
Metadados confirmam segredos de assinatura no Preview; valores não lidos,
chaves não alteradas, sem alegar nova emissão. Sem backup/restore redundante.
Matriz48 PASS/53 PARTIAL/4 NOT_STARTED;105x39,29 colunas e complementos
preservados. C-FINAL-AC-024 parcial; demais relações/variantes e gates humano,
AT/aparelho permanecem próprios. PR7 Draft, sem merge/promoção, Sonar adiado.
Meta ativa. [Dossiê](RELATED_DOCUMENT_READ.md),
[provas](RELATED_DOCUMENT_READ_EVIDENCE.json),
[remoto](RELATED_READ_REMOTE_OBSERVATION.json).

## D4.11 — estrutura técnica de leitura PDF V10

Base059bce0. Novas emissões REQ/COM/ENT/BAL recebem Document/H1/H2/P,
Table/TR/TH/TD com Scope e vínculos MCID/ParentTree. Campos em colunas e
células fragmentadas preservam ordem; repetição visual vira Artifact e QR tem
alternativa. Não há redesenho. Gate próprio do compositor confere árvore e
conteúdo antes/depois da assinatura; não substitui o parser público.

44 PDF dirigidos PASS (9 novos/35 anteriores),9 rechecks reproduzíveis,
12 Auth PASS (5 novos/7 anteriores) e18 cenários de produção Chromium PASS.
pypdf/PyMuPDF/pyHanko conferiram7 PDFs,6 assinados e11 emissões do aplicativo;
seis goldens V9 intactos e22 páginas com pixels/texto iguais. Fixture extensa
tem14 páginas; células lógicas atravessam páginas sem duplicar cabeçalhos.
Quatro exemplares reais fictícios e raiz pública preservados. Negativas de
estrutura e de código histórico do instrumento permanecem registradas; não
se converteram tentativas falhas em aprovação. Tipos/lint passaram.

Migration162 aplicada e pós-validada no remoto após local/Auth/dry-run.
Local/remoto162, zero pendências; histórico SQL,4 funções e grants conferidos,
V9 igual, sem bloqueios/índices inválidos. Sem reset, seed/Auth remoto,
mudança de produção ou backup/restore redundante. Intenções antigas recuperam
revisões anteriores e os bytes existentes; nova intenção usa10.

Matriz48 PASS/53 PARTIAL/4 NOT_STARTED,105x39;29 colunas e complementos
preservados. C111 parcial por tarefa humana/AT; não se aprova PDF/UA, físico,
confiança externa ou D-C/D6. Aparência continua adiada. CI própria do novo SHA
obrigatória; Sonar adiado, PR7 Draft, sem merge/promoção. Meta ativa.
[Dossiê](PDF_STRUCTURE.md), [provas](PDF_STRUCTURE_EVIDENCE.json),
[independente](d4-structure-proof/VERIFICATION.json),
[remoto](PDF_STRUCTURE_REMOTE_MIGRATIONS.json).

## D3.21 — foto recuperável e conta pessoal

Base3772fd0. Baseline real acumulou dois objetos após duas recusas de
associação; nova intenção por conta conserva chave/arquivo/revisão e um caminho
estável. Servidor normaliza e confere bytes/hash/ID do Storage antes de associar
com sessão viva após espera. Replay não reaplica foto antiga; abandono e
limpeza só atingem objetos gerenciados terminais que não sejam foto atual.
Arquivo incerto fica congelado em memória; GET não escreve e não mascara erro.

Meu perfil exigia um paciente para abrir a própria conta. Escolha estática da
página agora permite contexto nulo, mantendo guardas clínicas/administrativas
e identidade autorizada no backend. Edição do nome sobrevive à troca de foto.

26 unitários PASS;3 Auth/Storage reais novos PASS e7 Auth anteriores preservados;
15 cenários distintos de navegador qualificados nos três projetos (6 de avatar,
9 regressões) e2 rechecks do envio nativo.24 inspeções Axe específicas da foto.
Tipos/lint passaram. Preservadas falhas de baseline, escopo pessoal, conflito
40001 repetido pelo PostgREST, replay multipart WebKit e asserção precoce do
instrumento. Migration164 corrige os cinco RPCs novos para P0001; não se editou
a163 aplicada. Contraprovas e limites constam no manifesto.

Migrations163–164 aplicadas antes do commit e pós-validadas no remoto correto.
Local/remoto164, zero pendências; dois históricos SQL e12 definições/grants,
RLS/coluna/política/índices/trigger coincidem. V10 PDF preservado e saúde dirigida
sem bloqueios/índices inválidos. Comparador de histórico ajustou remoção de
comentários por statement, sem tolerância sobre SQL executável. Sem reset,
fixture/Auth remoto ou backup/restore redundante.

Matriz49 PASS/53 PARTIAL/3 NOT_STARTED,105x39 e29 colunas/complementos
preservados. C080 agora aponta para prova de avatar; a evidência anterior de PDF
era indevida. C-FINAL-AC-021 parcial só pelo escopo da conta própria, sem aprovar
o conjunto global/familiar/proposta. CI completa anterior3772fd0 verde e Preview
READY, registrados por SHA; CI própria do candidato continua obrigatória. PR7
Draft, sem merge/promoção, Sonar adiado, meta ativa.
[Dossiê](AVATAR_RECOVERY.md), [provas](AVATAR_RECOVERY_EVIDENCE.json),
[remoto](AVATAR_REMOTE_MIGRATIONS.json), [CI anterior](CI_3772FD0_OBSERVATION.json).
