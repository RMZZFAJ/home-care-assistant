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
