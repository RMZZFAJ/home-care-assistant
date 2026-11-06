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
geral do novo SHA na CI. D2 continua em execução, sem merge ou GO.

CI 42153551800 de 2b18b1b concluiu banco/replay de 112 migrations, checks gerais,
Chromium e WebKit com sucesso, mas reprovou um consumidor mobile de apresentações.
Capturas/log mostram seleção durante a entrada do drawer. O helper agora inicia
por clique estável, exige geometria visível e alvo real do ponteiro; o cenário
dirigido passou com asserções materiais preservadas. A tentativa local anterior
também passou, sem reprodução declarada da falha intermitente. Produto/banco não
mudaram. CI 42159112693 de eb5c678 estava in_progress na consulta pontual.

Reconto foi ampliado para BAL já conciliado e legado sem ciclo semanal.
Designação preserva o primeiro efeito; nova contagem usa a referência atual e
a política preservada. Seis cenários Auth distintos, cinco consumidores Auth,
uma tarefa Chromium de legado e o consumidor visual agendado passaram, além do
unitário PDF afetado. C7 exato: referência20, Juliana18 e Sheila17 produziram
somente ajustes BAL de dois e um, sem fila universal ou consumo inferido.
Legado recebeu janela real sem ativar regime ou semanas; recuperação após perda
de bal.count não duplicou efeitos. PDFs v1/v2, quatro páginas, preservam autores,
observações, quantidades e hashes de cada versão. 114 migrations; suites gerais
e replay do SHA publicado ficam na CI. P07 e demais critérios D2 seguem abertos.
CI de 24bc154 concluiu checks gerais e replay limpo/legado de 113 migrations,
mas falhou na integração com erro de tipo na projeção BAL; browser foi skipped.
A consulta da migration 114 passou a fazer a seleção
materializada de identidades/paciente/tipo. Contraprova Auth e quatro consumidores
afetados passaram no recheck; o plano original de CI não foi reproduzido no banco
retido. A CI posterior continua necessária, sem aprovação global presumida.

CI de 357d159 passou checks gerais Windows/Ubuntu e instalação limpa/evolução
legada, mas parou na regressão transactions.sql: atualizar a referência do
rascunho BAL aplicava a contagem antes da confirmação. Migration incremental
20261106075328 preserva o estado draft nesse caso; recontos de BAL já enviado
mantêm o tratamento anterior. A contraprova Auth reproduziu approved em vez de
draft antes da correção; depois passaram o percurso do rascunho e o reconto
facultativo já conciliado. A regressão SQL completa exige o dataset limpo da CI:
na base local retida, parou antes por duplicate review required, sem reset para
repetir o ambiente. 115 migrations publicadas neste incremento; CI posterior
ainda necessária. P07 permanece em implementação, separado desta correção.

Transferência bilateral P07 recebeu banco, API, preparação e decisões na interface.
Juliana declara cinco, Ana concorda e Bruno recebe três: TEAM5/FAMILY23/TRANSIT2.
Declaração/concordância não movem estoque; expedição preserva protocolo/motor ENT.
Treze casos Auth distintos, dois consumidores Auth anteriores, três fronteiras
API e dois percursos Chromium distintos passaram entre rodadas dirigidas.
Incluem saldo inativo, consumo/cancelamento sem segundo débito, recuperação após
perda de escrita, RLS, CAS e quatro esperas tardias de perfil. Axe/overflow em
quatro larguras; PDF de três páginas confrontado com snapshots/hash/ledger.
O artefato registrado pela API foi preservado; após corrigir um glifo da legenda,
o renderizador final foi conferido diretamente em outro artefato, sem substituir
o arquivo registrado. CI precisa gerar o novo PDF por sua rota no SHA publicado.
116 migrations; mesmas doze advertências do advisor. A UI anterior foi mantida:
equivalência integral, migração das intenções antigas e demais critérios D2
continuam em execução. CI de 57f6cdc confirmou checks gerais Windows/Ubuntu,
replay limpo/legado e 203 integrações, Chromium e mobile. iOS passou97/falhou1:
reconto sem contador encontrou o código no DOM, mas oculto na tela. A falha foi
reproduzida localmente: os botões comprimiam a identificação a largura zero.
Correção restrita à linha de recuperação passou no mesmo caso iOS, com código
visível e axe/overflow em 320/390/768/1440. A CI42191441950 do SHA20eac21 concluiu
com success, incluindo os checks gerais, replay/integração e matriz de browsers
programados. Esse resultado pertence ao SHA publicado, sem certificar mudanças
posteriores.

Origem dos movimentos agora tem consulta tipada por sessão/RLS e gaveta própria:
parcela exata COM, ENT, BAL, consumo e compensação familiar. Dois percursos
Chromium distintos passaram entre rodadas dirigidas, com negativas Auth reais,
erro503/recuperação, foco/filtros preservados e axe/overflow em quatro larguras.
Ledger, documentos e eventos permaneceram idênticos nas leituras. Nenhuma
migration ou permissão nova;116 migrations preservadas. A CI do novo incremento
continua necessária. Demais critérios D2 seguem em execução, sem merge ou GO.

CI42250234690 de52cb54e passou banco, checks gerais Windows/Ubuntu, Chromium e
WebKit. Os dois percursos de origem passaram também no mobile; esse projeto
passou101/falhou1, incluindo retry, em consumidor anterior de consumo com opção
interceptada pelo portal. A investigação dessa falha é um incremento separado,
sem repetir a matriz inteira ou presumir aprovação global do SHA.

O caso mobile de consumo passou localmente antes da alteração, sem reprodução
declarada. Sua seleção agora começa por clique visível e exige opção inteira no
viewport/alvo real do ponteiro, com geometria anexada. O mesmo caso dirigido
passou após a correção, mantendo autoria, recuperação, débito único e segunda
sessão. Mudança restrita ao teste; a própria CI posterior continua necessária.

Catálogo agora compara identidades e registra inativação, reativação ou sucessor
com referência, motivo e autoria próprios. Unidades diferentes continuam
separadas; não há merge, conversão ou transferência implícita. Doze casos Auth
distintos passaram entre rodadas dirigidas, incluindo FAMILY4/TEAM4, ciclos,
perda de autoridade após esperas e invalidação da orientação. Duas fronteiras
API e três tarefas Chromium novas passaram entre rodada/recheck; três
consumidores visuais anteriores afetados também passaram. PDF anterior conserva
os mesmos bytes/hash; consulta e mudanças cadastrais preservam ledger/documentos.
Nova entrada/retirada comum de inativo foi efetivamente recusada no banco após
contraprova; compensação referenciada e retorno físico continuam próprios.
Sua revisão usa uma única gaveta.117 migrations; mesmas doze chaves WARN locais.
O novo SHA exige a CI programada; a matriz exata1/5/20/100 e demais critérios D2
continuam em execução. Sem merge ou alteração remota.

Seleção em REQ/COM/ENT foi verificada com catálogos reais fictícios de1/5/20/100
materiais: doze tarefas independentes passaram entre rodada/recheck, além do
consumidor anterior de conversão. Alias, teclado, resultado vazio e mudança de
categoria preservam seleção/quantidade; total global tem anúncio acessível.
Overflow real de nomes longos foi corrigido na seleção, apresentação e revisão.
Axe/overflow em quatro larguras, capturas320 inspecionadas e estado físico
independente preservado. Não houve alteração de banco;117 migrations. A CI de
66c03fb aprovou banco/replay/integração, checks gerais e mobile, mas falhou no
mesmo caso de recuperação de catálogo em Chromium/WebKit. Correção dirigida
segue em execução, sem repetir a matriz geral ou declarar CI global aprovada.

A recuperação de catálogo que a CI66c03fb reprovou foi reproduzida e corrigida.
Perda só da escrita conserva a intenção incerta e seu resultado sob leitura
viva, ocultando novas ações; perda da leitura retira o conteúdo protegido.
Quatro tarefas Chromium/WebKit de recuperação/consumidor anterior e um caso
adicional de gestor delegado passaram. Mesma chave recupera; chave nova sem
permissão e vínculo revogado são recusados. PDF/ledger preservados. Nenhum
grant, API ou migration mudou; a CI do novo SHA continua necessária.

Necessidade remanescente agora emite nova REQ explicitamente vinculada à origem,
com motivo próprio, materiais novamente selecionados e observação atual. Origem
conserva material, ciência, aceites e PDFs anteriores; um evento causal avança
sua versão técnica, sem movimento de estoque. Oito casos Auth e quatro
consumidores antigos passaram; nove fronteiras API distintas passaram entre
rodada/recheck. Dois percursos Chromium novos e o consumidor decimal anterior
passaram. Conflito preserva campos e exige adoção explícita; resposta perdida
recupera a mesma chave após perda só da escrita. PDF real de duas páginas foi
confrontado com fatos/hashes/renderer e inspecionado.118 migrations, mesmas doze
advertências locais; replay limpo/legado e integração completa na CI do novo SHA.
CI42268778746 de563aaf2 estava in_progress na consulta pontual. D-A continua
em execução, sem merge ou operação remota.

A base privada de rascunhos REQ/BAL está implementada no banco/API. Dez casos
Auth distintos passaram entre rodadas, cinco fronteiras API e o consumidor
anterior de comprovante passaram; tipos dirigidos e lint pertinentes passaram.
Dez saves não alteram documentos/protocolo/ledger; CAS5→6→7 preserva edição;
descarte conserva documento e arquivo ready real. Confirmação disputa o mesmo
lock e consome uma única vez. Naquele incremento a interface ainda estava em
execução. Uma contraprova
descobriu prazo Auth congelado por now durante
espera: helper compartilhado usa relógio real; três casos Auth passaram após
a correção.119 migrations locais, sem reset; replay/suítes gerais na CI.
CI42274035931 de5fd3f53 estava in_progress e563aaf2 foi cancelled na consulta
pontual. Nenhum desses estados valida o novo incremento.

D2.30 concluiu o mínimo visual C17 para REQ/BAL: retomada própria entre
aparelhos, datas preservadas, edição incompleta, comparação5→6→7 e descarte
confirmado recuperável. Nova entrada BAL não cria ficha; revisão de estoque
é lida sem efeitos e conferida após o lock na confirmação. Alvo documental e
abertura antiga pendente conservam a história e a mesma intenção. Nove casos
Chromium distintos passaram entre rodada/recheck, incluindo os consumidores
anteriores de observação REQ, COM por apresentações e paciente inativo; quatro
larguras, axe e capturas locais. Três casos Auth da referência BAL e três
fronteiras API novas passaram.120 migrations locais,84 históricas preservadas,
mesmas12 advertências do advisor e nenhum reset adicional. A CI de7a78eae
passou nas validações gerais e no banco/replay119; navegadores tinham falhas
na consulta pontual, incluindo a recusa de paciente inativo do SHA anterior.
O caso afetado passou localmente com409 para chave nova e recuperação da
emissão própria anterior. A CI do próximo SHA ainda precisa validá-lo; demais
critérios D-A seguem em execução, sem merge, produção ou operação remota.

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
