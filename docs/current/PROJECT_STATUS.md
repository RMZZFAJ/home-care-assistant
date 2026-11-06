# Estado verificável do projeto

Referência editorial:06/11/2026, America/Sao_Paulo. **Produção NO-GO.** Esta é
a entrada canônica de estado; contratos atuais ficam em current, decisões
humanas em decisions e especificações futuras em audits/C.

**D-A em execução autorizada (D0–D2).** PR 6 integrado à master `8ec979a`;
branch única feat/phase-d-implementation e
[Draft PR 7](https://github.com/RMZZFAJ/home-care-assistant/pull/7).
[Checkpoint e evidências](../audits/D/D-A/CHECKPOINT.md). Instrumentos D0 e
os P1 de progresso REQ/decisão de escala receberam correção e regressões
locais discriminantes. D1/D2 ainda não concluídos. Sem merge, alteração remota de
banco ou liberação operacional. As referências de C abaixo são históricas
da entrega integrada, sem renovar autorização por si próprias.

Estoque agora isola carregamento, erro e atualização de saldos/histórico.
Falha de uma fonte preserva a outra e a última consulta válida do mesmo
filtro, identificada como possivelmente desatualizada. Erro inicial não
produz vazio falso. Duas tarefas Chromium de falha/recuperação e o percurso
existente de correção compensatória passaram; ledger preservado nas leituras,
axe/overflow em quatro larguras. Sem alteração de banco neste incremento.

Catálogo recebeu fator finito/positivo e validação anterior ao arredondamento,
com preservação de código textual, auditoria própria e autoridade após esperas.
O alias /api/catalog usa catalog.manage como /api/admin, sem exigir gestão de
vínculos. Nove casos Auth, uma fronteira API e duas tarefas Chromium distintas
passaram no incremento de finitude. Apresentações agora têm consulta, histórico,
edição versionada, inativação explícita e recuperação do próprio comando.
Conversão COM/ENT captura proveniência no banco: dois pacotes de dez continuam
20 após o cadastro mudar para doze. Entrada manual permanece disponível.
Oito casos Auth novos, dois consumidores legados afetados, três fronteiras API
e seis tarefas Chromium distintas passaram entre rodadas/rechecks. PDF de três
páginas confrontado com snapshot, hash e crédito único de 20; páginas inspecionadas.
110 migrations no conjunto; replay e suítes gerais ficam para a CI do novo SHA.

Revisão BAL agora identifica o contador pelo evento efetivo, inclusive no legado,
e registra parecer separado e imutável com autor/grupo/versão. Contador não
revisa o próprio ato; referência NULL/obsoleta não permite conciliação antiga.
Revisão facultativa posterior não reaplica estoque. Doze casos Auth, três
fronteiras API e três tarefas Chromium distintas passaram entre rodadas e
rechecks, mais consumidores Auth/SQL afetados. PDF de três páginas e parecer
de 2.000 unidades confrontados com snapshot, hash do renderer e ledger e
inspecionados. 111 migrations; replay/CI geral do novo SHA ainda necessários.
Sucessão e reconto facultativo após conciliação permanecem em execução.

Pedidos de adiamento obsoletos agora podem ser recusados com motivo próprio,
sem mover prazo, atribuição ou estoque; approve NULL é recusado. Aprovação
continua vinculada à versão/destino originais. Nove casos Auth, três fronteiras
API, consumidores Auth/SQL e três tarefas Chromium distintas passaram entre
rodadas/rechecks. Revisão e edição usam uma superfície, conservando texto/foco
no conflito e a intenção incerta até recuperação. 112 migrations; CI/replay do
novo SHA continuam necessários. D-A e os demais critérios seguem em execução.

CI de 5535c55 confirmou checks gerais Windows/Ubuntu, replay limpo/legado de 111
migrations, integrações completas, Chromium e mobile. iOS/WebKit passou 91
casos e falhou em dois consumidores P05 que digitavam em combobox fora da área visível.
Os dois foram reproduzidos e passaram localmente após iniciar a seleção por
clique visível, preservando as asserções materiais. Correção restrita ao teste;
não equivale à aprovação da CI posterior nem a aparelho físico. CI de f9fdb8a
estava in_progress na consulta pontual; sem polling ou verde presumido.

Reconto de BAL agendado ainda submetido agora conserva a responsabilidade
executável na substituição do mesmo plantão. Sem pessoa elegível, apresenta
pendência de nova designação. A interface congela contagem/destino, conserva
justificativa no conflito e exige adoção explícita da referência atual. Oito
casos Auth, quatro fronteiras API, duas tarefas Chromium e o consumidor Auth
agendado passaram. PDF de três páginas preserva Juliana na contagem um, Sheila
na dois e os três pareceres próprios; eventos e datas da obrigação preservados,
com um único ajuste BAL de quatro unidades. 113 migrations; replay e matriz
geral do novo SHA na CI. Reconto após conciliação já aplicada e legado sem ciclo
seguem no próximo incremento, sem encerrar D2, merge ou GO.

CI 42153551800 de 2b18b1b concluiu banco/replay de 112 migrations, checks gerais,
Chromium e WebKit com sucesso, mas reprovou um consumidor mobile de apresentações.
Capturas/log mostram seleção durante a entrada do drawer. O helper agora inicia
por clique estável, exige geometria visível e alvo real do ponteiro; o cenário
dirigido passou com asserções materiais preservadas. A tentativa local anterior
também passou, sem reprodução declarada da falha intermitente. Produto/banco não
mudaram. CI 42159112693 de eb5c678 estava in_progress na consulta pontual.

Precisão sem arredondamento, referência compensatória e revogação direta de
perfil/avatar receberam controles locais no incremento `6e7b627`. Prévia de
convite, reemissão explícita, senha uniforme e invalidação de perfil foram
publicadas em `001158b`, cuja CI passou. Observação REQ distingue zero,
desconhecimento e ausência; preservação de modo/horário do rascunho e
compatibilidade de intenções antigas foram publicadas em `d7cfa44`.
O incremento seguinte implementa identidade material imutável, ANY familiar,
SCI-005 invariável por expedidor efetivo, diálogo prévio, preferência própria
versionada e tácita prospectiva. WhatsApp permanece comunicação e SCI-004
desativada. Precisão do token JSON, vínculo histórico somente leitura e
revogação durante o trigger tácito receberam contraprovas e correções.
96 migrations em instalação limpa/evolução legada, 16 SQL, 69 integrações e
127 unitários e 30 E2E dos três projetos passaram localmente. Contratos,
lint, Markdown, tipos e build aprovados.
PDFs de observação e diálogo confrontados com banco/snapshot e inspecionados.
A trilha independente de abertura informada pelo aplicativo foi acrescentada
na migration seguinte, sem alterar ciência/versão/ledger. 97 migrations em
instalação limpa/evolução legada, 73 integrações completas, 128 unitários e
15 E2E nos três projetos passaram, além dos checks e build. CI de `592db38`
concluída com success e status Vercel success na consulta desse SHA.

COM ganhou parcelas com identidade causal, decisões em leitura e dispensa
somente da expectativa não adquirida. Pendência física continua aberta após
dispensa; rejeição preserva a declaração e validação credita uma única vez.
Capacidades efetivas governam aprovação/validação imediatas; revogação durante
esperas reais de linha/FK agora impede o efeito tardio. Replay local de 100
migrations, 16 SQL/search_path, 86 integrações completas, 130 unitários e 18
E2E dos três projetos passaram. Dois PDFs de fatos distintos foram extraídos,
confrontados com snapshots/ledger/hashes e inspecionados em todas as páginas.
O ajuste visual final de cápsula/cabeçalho passou em WebKit e Chromium,
incluindo uma asserção que reprovou antes da correção; checks e build finais
passaram novamente. Evidência local não conclui homologação humana/física.
Relatos de consumo agora preservam original e complementos por versão, com
autoria própria e decisão explícita. NULL/oposição não viram sucesso, falta
não debita e confirmação recupera um único movimento por material. Consulta
por referência e páginas mantém relatos antigos alcançáveis. Onze integrações
dirigidas Auth, três testes API e quatro tarefas Chromium passaram em rodadas
proporcionais, incluindo resposta perdida, atualização de outra sessão e
revogação durante esperas reais. Tipos, lint dirigido e o build do runner
passaram. Replay completo e suítes gerais do novo SHA serão executados pela
CI programada; não foram duplicados localmente nem declarados aprovados.
Na CI de 74f5848, checks gerais, replay e integrações passaram; cada browser
passou 63 casos e falhou no teste Flow que ainda usava o fluxo anterior da
tela. O teste foi atualizado e passou em execução local dirigida. CI
42111139110 de `7c22f54` terminou com success na consulta pontual.

Cancelamento ENT após aceite agora tem pedido, recusa/retirada pessoais e
conciliação com consumo anterior em leitura, sem segundo débito. Alias SQL e
defeito temporal foram reproduzidos separadamente e corrigidos nas migrations
102–103. Referências não são reutilizadas, trânsito precisa de resolução real
e decisões preservam autoria. Dezesseis integrações Auth e cinco tarefas Chromium
passaram em rodadas dirigidas, além da fronteira API e do invariante SQL afetado.
PDFs pendente/final foram confrontados com eventos/ledger/hashes e inspecionados
em todas as seis páginas; revisão encontrou e corrigiu estado de recebimento
e quebra do bloco de integridade. Replay e suítes gerais ficam para a CI deste
incremento. P05/P07 e as demais etapas ENT continuam em execução.

Preparação P06 ganhou sugestão inequívoca da escala, escolha elegível editável,
motivo manual/troca e histórico com autoria própria. Mudança da fonte exige
comparar/adotar; sem pessoa apta mantém contingência. Dez casos Auth, quatro
tarefas Chromium, contrato/API e SQL afetados passaram em rodadas dirigidas.
PDF de indicação confrontado com snapshot/ledger/hash e inspecionado nas duas
páginas. AGENTS/TESTING agora explicitam validação local por impacto e suítes
gerais na CI de cada SHA, sem duplicação automática a cada ajuste. Essas provas
não concluem P05/P07 nem homologação humana, física ou de provedor.

CI 42115856829 de `648aac6`: replay/integrações e checks gerais aprovados;
cinco casos novos ENT aprovados em todos os navegadores. Uma expectativa
antiga do teste de cancelamento falhou nos três projetos e a retomada REQ
teve oscilação iOS. Os dois consumidores afetados foram ajustados e passaram
no recheck WebKit, sem repetir localmente as demais suítes já aprovadas.

Origem COM agora começa em branco, exige escolha explícita compra/doação e
permanece em leitura na revisão. Migration 105 recusa emissão/submit sem origem
válida, preservando rascunhos desconhecidos e eventos antigos. Três casos Auth,
doze testes de fronteira/contrato e duas tarefas Chromium passaram; emissão
não creditou estoque. Fixtures de negativas antigas foram atualizadas para
continuarem discriminando quantidade zero e permissão negada. CI geral do
novo SHA permanece necessária; D-A continua em execução.

P05 agora possui proposta administrativa, base da apuração, conferente
independente e responsável futuro para quantidade desconhecida. Efeitos críticos
só ocorrem na decisão própria do conferente; aceite pessoal, autoria e trânsito
desconhecido permanecem preservados. A caixa de entregas usa tarefas executáveis
da identidade, incluindo decisões de cancelamento e apuração designada, com
contagem/filtro antes da página. Quatorze casos Auth e três testes API passaram
em rodadas dirigidas; quatro tarefas Chromium e dois PDFs de fatos distintos
passaram, com as seis páginas finais inspecionadas. Limites no checkpoint.
Transferência bilateral e demais processos D2 continuam abertos.

Consulta de d6db5f0/CI 42121891337: checks gerais e replay/integrações aprovados;
WebKit aprovado, Chromium/móvel com 74 aprovados e uma falha comum de retomada
antes de a consulta P06 concluir. O avanço passou a aguardar essa fonte, e só
o percurso afetado foi revalidado localmente, com sucesso. Vercel success desse
SHA não substitui a falha anterior nem valida o próximo commit.

Recuperação de consumo foi corrigida no incremento seguinte: a chave original
do próprio ato confirmado pode retornar com leitura vigente após perda somente
da escrita. Novos comandos continuam sujeitos à capacidade/papel e leitura
perdida segue bloqueada. Quatro contraprovas reproduziram a recusa indevida
antes da migration 107; cinco casos novos e onze casos existentes das funções
afetadas passaram. CI de 20601f5/42129515456 estava in_progress na consulta
pontual, sem resultado presumido. Dois percursos Chromium passaram: confirmação
com escrita perdida e complemento recuperado depois da conferência de outra
pessoa, sem reabrir relato nem duplicar débito. Evidências no checkpoint.

Prévia de desligamento agora informa ENT, regularizações, BAL e escala sob as
permissões reais de cada processo, sem alterar fatos ou impedir revogação
urgente durante erro/carregamento. Cinco casos Auth, fronteira API e três
percursos Chromium passaram entre rodada/recheck, incluindo outro paciente
preservado e retorno de foco após falha da consulta. Editor mantém a mesma
pessoa e outra conta usa fluxo explícito. Mudanças gerais D3 e sucessão BAL
futura completa continuam separadas. A nova migration totaliza 108; replay e
suítes gerais do novo SHA permanecem para a CI programada.

O núcleo REQ/COM/ENT/BAL completo continua em execução. Evidências por camada e
falhas intermediárias estão no checkpoint. A CI de `001158b` aprovada não
atesta os incrementos posteriores; CI e preview não são validação remota de
banco ou homologação humana/física.

**C7–C10 concluídas e fechamento definitivo incorporado em 04/11/2026.**
[Checkpoint](../audits/C/C10-pr-handoff/CHECKPOINT.md). As 121 causas e 165
origens permanecem reconciliadas. P02 está OWNER_APPROVED: SCI-001 mantida,
SCI-002 dialogada, SCI-003 comunicação, SCI-004 futura condicionada e SCI-005
obrigatória/permanente/não configurável por ator efetivo habilitado; ANY
familiar sem exigir todos.

Revisão individual: 66 fichas, 262 controles originais e 171 relações.
Catálogo atual: 274 controles/424 usos; 187 casos planejados (20 refinados
entre os 161 anteriores e 26 novos), todos PLANNED_NOT_EXECUTED. Os 12
controles adicionais cobrem lacunas de estado, login/MFA/unidade e ciência.
Direção visual aprovada; nenhuma tela/política foi implementada por esta C.
Código/configuração/testes permanecem idênticos ao SHA de entrada
266c6541bd5d3268b7e08a839df601e823ec74b5; o reparo anterior de CI nesse SHA é
distinto desta missão documental. Base de aplicação permanece a auditada.

P03/P05/P07/P08/P09/P10/P13/P15/OPS-01/PERF-01 não impedem D0 geral/D1
independente; ramos e homologações seguem gates específicos. Contratações
P03/P09/P13 são pesquisa externa do responsável com ChatGPT. Abrir branch D
exige integração prévia do PR6 à master e autorização posterior. Kit
temporário continua removido; HTML/oito PNG e auditorias A/B preservados.
Draft PR não autoriza merge, cleanup de branches ou produção.

<!-- c-table:start -->

- **Referência:** product_code_sha

  **Estado e prova:** `37cb7f85e96e551d6419871f94dd950712e2565b`; base de
  aplicação src/supabase preservada; suporte e testes do reparo CI foram
  congelados em 266c654 e permanecem intactos nesta ordem complementar.

- **Referência:** audit_input_sha

  **Estado e prova:** `227f26ca695a3d01512a854f4b19f2639b91ba87`, A/B1–B8
  encerradas.

- **Referência:** branch documental

  **Estado e prova:** `audit/phase-b`; SHA final de C é o commit que contém
  este estado, resolvível pelos comandos abaixo. Não gravar hash
  autorreferente no próprio manifesto.

- **Referência:** master preservada

  **Estado e prova:** `34dcb835c5c49068e0417f7306eb4e501aa868bc`; sem merge em
  C.

- **Referência:** last_production_deploy_sha

  **Estado e prova:** `NOT_VERIFIED` nesta missão. Resultados remotos B7 são
  históricos e não assumidos atuais.

- **Referência:** Fase C

  **Estado e prova:** C0–C10 documentalmente concluídas: decisões,
  especificação, planos e reorganização validados. A autoridade de publicação
  é o commit/ref resolvido no Git.

- **Referência:** Fase D

  **Estado e prova:** D-A **EM EXECUÇÃO**; checkpoint e Draft PR 7 acima.
  Nenhuma correção funcional/migration/ativação foi realizada em C.

<!-- c-table:end -->

```sh
git branch --show-current
git rev-parse HEAD
git log -1 --format=%H -- docs/audits/C
git ls-remote origin refs/heads/audit/phase-b
```

Os 165 registros originais foram reconciliados em 121 causas, e 28 grupos de
requisitos aprovados, vários sobre os mesmos processos; não são 149 defeitos
novos. Existem 30 DEC, 20 oportunidades e 15 questões atualizadas pelas
respostas C7 (P01–P12 originais e P13–P15 derivados). As pendências restantes
estão no [registro atual](../audits/C/C7-decision-closure/OPEN_DECISIONS.md).
Os dois P1 de decisão de escala e progresso REQ estão corrigidos e verificados
localmente, com limites no checkpoint D-A. O guard
protege 84 migrations; contagens de suítes anteriores ficam nos pacotes
datados e não são apresentadas como CI verde atual.

PWA/Web Push, modalidades futuras de ciência, draft cross-device e verificador
de exemplar estão planejados. WhatsApp/Meta/Flows permanecem diferidos para
ativação/homologação posterior; não remover contratos existentes. Backup com
TOC, emulação, screenshots e transporte controlado não substituem restore,
participante, aparelho/AT/impressão ou provedor real.

Consultar [C](../audits/C/README.md),
[gate futuro](../audits/C/C5-execution-roadmap/RELEASE_CUTS_AND_GATES.md) e
[história A/B](../audits/README.md). Os históricos de PRs/deploys e
autorizações ficam em archive e auditorias datadas, sem renovar permissão
corrente.
