# Estado verificável do projeto

Referência editorial:08/11/2026, America/Sao_Paulo. **Produção NO-GO.**
**D-B (D3–D5) em execução; D-A (D0–D2) consolidada localmente.**
CI do SHA publicado é gate independente; pending não significa aprovação.

Estado atual:local157/remoto157, zero migrations pendentes. Prioridade vigente:
fichas REQ/COM/ENT/BAL, PDFs técnicos, estoque e recuperação; apoio depois das
dependências necessárias. Remoto confirmado como desenvolvimento com testes:
validação local/histórico/dry-run/pós-verificação dirigida, sem repetir backup,
restore e comparação integral por rotina.

D3.15 corrigiu perda de foco ao continuar edição e forneceu destino contextual
após salvar no catálogo. O aviso bloqueia descarte durante tentativa pendente.
Nove casos de produção passaram nos três motores, incluindo o consumidor
existente de edição/inativação; tipos e lint passaram. Baseline e seis falhas
intermediárias preservados. C037 agora parcial; matriz45 PASS/51 PARTIAL/
9 NOT_STARTED. Nenhuma migration nova. Outros diálogos e AT/humano/aparelho
continuam próprios. [Provas e limites](../audits/D/D-B/DRAWER_FOCUS.md).

Preview827531e READY na origem estável, SHA conferido antes/depois do probe:
runtime200/ready, emissões401 sem sessão do app e worker302 sem acesso Vercel.
CI827531e observada com validate Windows/Ubuntu SUCCESS e banco em andamento;
o novo incremento de foco exige CI própria. Essa observação é mais recente
que os recibos históricos abaixo, sem aprovar jobs ainda pendentes.

D4.10 corrigiu orientação de recebimento em ENT encerrada e versão preservada.
Novas intenções ENT usam V9; bytes antigos permanecem, com aviso no acervo.
37 unitários distintos em coortes, dois Auth e12 casos distintos de produção
aprovados;14 execuções de produção incluem13 PASS e um timeout preservado,
seguido de repetição dirigida aprovada. Sete PDFs reais têm verificação
independente. Migration157 aplicada e pós-validada no remoto; sem reset,
backup/restore redundante ou fixture remoto. C105/C106 continuam parciais,
matriz45 PASS/50 PARTIAL/10 NOT_STARTED. Sem revisão estética.
[Provas e limites](../audits/D/D-B/ENT_TERMINAL.md).

CI9987804 observada em andamento; não valida D4.10. O próximo SHA exige CI
própria. [Recibo](../audits/D/D-B/CI_9987804_OBSERVATION.json).

Estado anterior D4.9 comprovou os marcos ENT: preparação/rascunho,
expedição e geração do exemplar, com bytes estáveis no download. Um unitário,
dois Auth e seis casos de produção passaram; quatro PDFs reais têm fatos,
assinatura e TSA interna conferidos por oráculo independente. Relógios antigos
são fixtures locais explícitas; não há prova física de24 horas. C108 também
foi reconciliado com13 fontes/testes e cinco consumidores/lockfile iguais ao
SHA8a17202 aprovado. Não se repetiu a suíte antiga. Matriz45 PASS/50 PARTIAL/
10 NOT_STARTED. [Provas e limites](../audits/D/D-B/ENT_TEMPORAL.md).

CI5a7d546 terminou8/8 SUCCESS: banco, validate Windows/Ubuntu e quatro jobs de
navegadores, mais o gate agregado. Esse resultado valida o runtime base D4.8;
o próximo SHA exige CI própria para os novos testes D4.9.
[Recibo por SHA](../audits/D/D-B/CI_5A7D546_OBSERVATION.json).

Estado anterior D4.8: completa os fatos do PDF da regularização ENT:
antes/depois, identidades,
instantes, limites e efeitos de estoque, preservando aceite e intenções antigas.
Cinco unitários novos+dez existentes, três Auth e nove casos de produção nos
três motores passaram em coortes; uma extensão Chromium também confirmou
código/upload públicos sem sessão. Seis PDFs reais têm fatos, assinatura
ENTIRE_FILE e timestamp interno conferidos por oráculo independente.
Sem redesenho estético. Matriz43 PASS/52 PARTIAL/10 NOT_STARTED.
[Provas e limites](../audits/D/D-B/REGULARIZATION_PDF.md).

Listas frequentes privadas e recuperação da etapa de REQ/COM/ENT/BAL continuam
implementadas. Histórico: o commit do responsável3add56f, somente SonarLint,
foi preservado;
CI105dc9d foi cancelada por supersessão. CI3add56f foi observada com banco e
validate Windows/Ubuntu SUCCESS; quatro browsers ainda em andamento. Esses
resultados eram a observação anterior à aprovação de5a7d546. Falhas f0840dc e
seus reparos locais permanecem rastreáveis, sem aprovação retroativa.
[Entrega anterior](../audits/D/D-B/RECURRING_SELECTION.md).

Estado anterior D4.6: local152/remoto152, zero migrations pendentes após
backup válido,
restauração/upgrade, compatibilidade e pré/pós-validação. D4.6 amplia a fidelidade
técnica de REQ/ENT/BAL/COM, com revisão7 e preservação de intenções e bytes
antigos. A aparência dos PDFs foi adiada pelo responsável. Passaram16 casos
unitários distintos, cinco Auth e30 de produção em coortes;14 exemplares reais
tiveram dados e PAdES-B-T/TSA interna conferidos independentemente. Dezoito
controles V4/V5/V6 conservam bytes exatos. Isso não representa ICP-Brasil,
tempo externo, PDF marcado ou homologação física. Matriz da etapa D4.6:
40 PASS/51 PARTIAL/14 NOT_STARTED; C105/C106 e demais gates continuam próprios.
[Provas e qualificação da atividade remota](../audits/D/D-B/PDF_FIDELITY.md).

D4.7 acrescenta comparação humana de versões REQ/COM/ENT/BAL, autoria congelada,
motivo/ressalva em leitura, retorno da seleção pelo acervo e revalidação Auth/RLS.
Passaram10 unitários distintos e18 casos de produção em coortes, com falhas
preservadas. Três arquivos tiveram versão/hash vinculados ao evento exato;
histórico não altera bytes, eventos ou estoque. Sem migration nova. CI df49881
terminou8/8 SUCCESS. CI8a17202 também passou8/8 e Preview protegido ficou READY;
o incremento atual exige seus próprios gates. [Provas](../audits/D/D-B/DOCUMENT_VERSION_HISTORY.md).

PWA/Push no Preview protegido tiveram falha física relatada no Samsung S24 Ultra
e reproduzida com barreira de acesso por cookie. A correção envia credenciais
somente na própria origem e cacheia apenas bytes públicos fixados pelo build.
Diagnóstico, recuperação e bloqueio de Push até prontidão foram implementados:
39 casos distintos de produção local em coortes e27 unitários passaram, além
de tipos/lint. CI b1541df concluiu8/8 SUCCESS e seu Preview protegido ficou READY,
com assets públicos exatos e fronteira privada401. O novo incremento exige CI
e inspeção próprias; não há homologação física de sucesso. D5 permanece parcial.
Proteção Vercel preservada; cache privado e replay vedados conforme o contrato;
Sonar adiado.
[Provas e reteste pelo endereço estável](../audits/D/D-B/PWA_PREVIEW_ACCESS.md).

## Registro histórico por incremento

Os números e estados abaixo descrevem seus respectivos fechamentos. O resumo
acima e os recibos correspondentes registram o estado corrente.

D3.6 comprovou C026/030/031 com41 unitários, três casos Auth e21 casos distintos
de produção em coortes. Migration151 precedeu o lote técnico de PDF; seu estado
local151/remoto151 é histórico. [Provas](../audits/D/D-B/FIELD_VALIDATION.md).

CI4016105, run42415801564, terminou SUCCESS: banco, validate Ubuntu/Windows,
Chromium/mobile e as duas partes iOS, além do agregado. O preview correspondente
está READY e runtime respondeu200/ready. Isso valida D5.2; os incrementos D5.3/
OPS.2 abaixo exigem CI própria após publicação. Sonar continua adiado pelo dono.
[Recibo por SHA e preview](../audits/D/D-B/D5_2_CI_EVIDENCE.json).

D5.3 corrigiu rotação dos lembretes legados e períodos perdidos. A contraprova
antiga alcançou95/101; a implementação passou16/16 casos de serviço/Auth e
consumidores existentes. **Local145/remoto145, zero pendências** após captura,
restauração/upgrade, compatibilidade e pós-validação145/145 SQLs/139 projeções.
[Contrato](../audits/D/D-B/SCHEDULER_LEGACY.md) e
[recibo](../audits/D/D-B/D5_3_REMOTE_MIGRATIONS.json).

OPS.2 integra CLI de captura read-only, arquivo cifrado e retenção7+4 em
filesystem. Críticos ficam preservados, índice/poda são autenticados e falhas
ficam em quarentena. Nove testes finais passaram, incluindo SQL real para
projeções estáveis. A agenda permanente continua desligada; backup operacional
externo não está ativo. [Contrato e limites](../audits/D/D-B/BACKUP_PIPELINE.md).

D5.2 acrescentou consentimento Push por aparelho, isolamento de conta/sessão,
fanout dos avisos internos, transporte cifrado, destino autorizado e revogação.
Envio externo permanece desligado. Auth7 casos distintos,22 unitários com
crypto independente e18 casos de produção local entre duas coortes passaram.
Tipos/lint afetados e SQL dirigido passaram. Custódia local foi criada e
recuperada de backup cifrado, sem enviar a chave ao preview.
[Contrato e limites](../audits/D/D-B/WEB_PUSH.md).
Após backup renovado, restauração e upgrade isolados, a migration144 foi aplicada:
local144/remoto144 naquele fechamento. Histórico144/144,135 projeções anteriores,
cron/Vault e grants Push foram conferidos. O primeiro preflight recusou mudanças
legítimas entre capturas; o backup foi renovado antes de prosseguir.
[Recibo atual](../audits/D/D-B/D5_2_REMOTE_MIGRATIONS.json).

CI4bf8247 terminou FAILURE: banco, validate Ubuntu/Windows e iOS1 passaram;
Chromium/mobile/iOS2 falharam no seletor de status da verificação pública.
O histórico também teve uma falha na tentativa controlada. Consumidores foram
corrigidos e comprovados localmente, sem reduzir asserções. O novo SHA exige CI
própria. Coleta iOS184=94+90, sem perda ou duplicação, não significa execução.

D5.1 implementou manifesto, orientação offline estritamente pública, controle de
compatibilidade, bloqueio de novos envios e atualização sem reload forçado.
Produção local15/15 nos três projetos passou, com worker real, duas abas e
recuperação do mesmo rascunho. Instalação física e Push continuam gates próprios.
[Contrato](../audits/D/D-B/PWA_RUNTIME.md).
Por determinação posterior do responsável,22 migrations D-B foram aplicadas
após backup/restauração/compatibilidade: local143/remoto143 naquele fechamento.
Histórico143/143, preservação das129 projeções anteriores,32 objetos e cron/Vault
foram pós-validados. [Recibos](../audits/D/D-B/D5_REMOTE_MIGRATIONS.json).
Isso permite testar o preview durante desenvolvimento; não conclui D-B ou libera
produção. Novas migrations da missão exigirão reconciliação correspondente.

CI fc98664 aprovou banco, validate e Chromium/mobile; iOS foi cancelado no limite
de40 minutos, com162 casos aprovados e nenhuma falha de assert observada no log.
O agregado terminou FAILURE. O lote atual divide somente iOS em duas partes,
mantendo a coleção completa e todos os gates; CI do SHA novo continua separada.

CI dfdc7de, run42335739149, concluiu banco, validate Ubuntu/Windows e os três
projetos browser com SUCCESS. Inclui a correção D3.4a dos consumidores de
governança que falharam em bd8747b e os estados de leitura D3.4. Essa CI não
valida os incrementos posteriores. A reconciliação vigente está descrita acima;
as observações anteriores por SHA permanecem históricas.
SonarCloud segue adiado expressamente pelo responsável, sem Quality Gate aprovado.

CI d0179ca aprovou banco/instalação/evolução/integração e validate, mas falhou
em onboarding após logout;173 casos passaram em cada job Chromium/mobile e iOS
foi cancelado. D4.4a reproduziu o formulário oculto à acessibilidade e passou
3/3 em produção com navegação completa após signOut. Inclui Escape com Auth
pendente, confirmação local de e-mail e nova senha. A CI do SHA novo continua
gate independente. [Contraprovas](../audits/D/D-B/D4_4A_CI_EVIDENCE.json).

D4.5 congela fatos suplementares de origem/datas em novas emissões V6, sem
reescrever evento/hash canônico ou V5. Auth comprova rename/revogação; seis
casos novos browser passaram entre coortes. Três PDFs reais foram verificados
independentemente por fatos/geometria e pyHanko/TSA interna; texto longo tem
probe sem assinatura com marcador visível. [Evidências](../audits/D/D-B/D4_5_EVIDENCE.json).
C101 ENT e combinações C105/C106 continuam parciais. CI dbc7171 terminou com
banco/validate aprovados e browsers reprovados em acervo, foco e carregamento;
D4.5a reproduziu e corrigiu foco tardio e ajustou os instrumentos de atualização
ao vivo, com9/9 casos de produção nos três projetos. Não é aprovação da CI nova.
[Contraprovas](../audits/D/D-B/D4_5A_CI_EVIDENCE.json).

CI639b5cb, run42354352749, aprovou banco/validate, mas falhou em preparação
global Chromium e largura de entregas WebKit; central teve uma tentativa
instável. D3.9 corrigiu essas causas e passou27/27 casos dirigidos em produção
nos três projetos, além de9 Auth e27 unitários/API. Avisos resolvem recurso,
dia/fuso e origem reais; resposta pessoal e relato vinculado recuperam a mesma
intenção sem baixa de estoque/SCI. [Evidências](../audits/D/D-B/D3_9_EVIDENCE.json).
CI do novo SHA publicado continua gate separado.

D4.2 integra emissão assinada ao produto: intenção Auth, oráculo independente
por texto/posição, PAdES-B-T com TSA interna, Storage sem sobrescrita, read-back,
registro final e Arquivos gerados em REQ/COM/ENT/BAL. Recuperação conserva a mesma
intenção; download usa bytes registrados e revalida integridade/acesso. Custódia
local protegida e política pública separada têm adaptadores para valores de
ambiente, sem processo residente no runtime. Não há confiança externa/ICP-Brasil.

Auth6/6, unidade/API18/18 e produção12/12 nos três projetos passaram, incluindo
compartilhamento existente, revogação real e falha após upload. pyHanko aceitou
assinatura e token dos quatro exemplares reais; extração/geometria e render foram
conferidos. [Evidências e limites](../audits/D/D-B/D4_2_EVIDENCE.json).
D4.3 implementa página pública, código e upload efêmero limitado/isolado.
Produção12/12 passou nos três projetos;25 testes de unidade/API e revalidação
dos quatro artefatos conferem o núcleo final com orçamento criptográfico.
[Coortes, privacidade e limites](../audits/D/D-B/PUBLIC_VERIFICATION.md).
D4.4 integra originais/V4 e emissões independentes no mesmo acervo. GET antigo
recupera somente bytes registrados, com SHA e acesso atual; não gera PDF.
Histórico BAL resolve a versão no acervo; representação histórica nova usa
identidade/instante próprios. Upload público reconheceu V4 registrado sem
assinatura. Auth2 casos distintos, unidade/API5/5 e33 casos browser distintos
passaram entre coortes de produção, com quatro larguras/axe e perda de vínculo.
[Coortes e contraprovas](../audits/D/D-B/D4_4_EVIDENCE.json).
Combinações factuais restantes, anexos anotados, leitura documental acessível e
ensaios de rotação/recuperação continuam pendentes.
D3 restante, D5, backup/monitoramento e reconciliação remota continuam em execução.

CI42360570173 de3c61697 aprovou banco/validate e reprovou o menu de perfil em
Chromium/mobile; WebKit foi cancelado pelo fail-fast. D4.1a corrigiu composição
modal, retorno de foco após troca e abertura da programação após refresh.
Prova local:21 casos browser compatíveis mais3 rechecks finais, com tipos/lint
aprovados. [Coortes e contraprovas](../audits/D/D-B/D4_1A_CI_EVIDENCE.json).
Resultado da CI do próximo SHA continua separado dessa prova local.

D3.4 comprova os estados de sino, central, perfil e consumo:23 unitários e24
casos browser distintos, com sete rechecks finais em build de produção nos
consumidores afetados. Sem falso vazio, spinner após500, perda de edição pessoal
ou ciência por apenas consultar; Tab/Escape conferidos nos três projetos.
Evidência e limites no [manifesto D3.4](../audits/D/D-B/D3_4_EVIDENCE.json).
O responsável pediu execução mais econômica, preservando os gates:
lotes por fluxo, diagnóstico menor e aceite do candidato estável.

D3.5 acrescenta preparação privada/global com retomada e CAS, criação inativa,
guias por papel e continuidade de consumo/Flow/fila administrativa entre sessões.
Sete casos Auth, cinco unitários e18 execuções browser nos três projetos passaram
entre rodadas de produção; três rechecks finais corrigiram as falhas conjuntas.
[Evidências e limites](../audits/D/D-B/D3_5_EVIDENCE.json). C-AC-085/095 têm prova
local; preparação/guia completos continuam parciais, com controles e tarefas
GUI-02 pendentes. CI do candidato e demais requisitos D-B continuam gates.

CI5ab4864 aprovou banco e validate Windows/Ubuntu; falhou em13 casos browser.
D3.6 restringe a apresentação opcional à Visão geral e mantém ajuda manual nas
tarefas. As13 falhas foram rechecadas localmente, com ajuste do seletor decimal
textual de transferência. Isso não substitui a CI do novo SHA.

D3.6 implementa rascunhos COM/ENT, conferência contextual pessoal e proteção da
chave desconhecida após recusa de acesso. Oito casos Auth,11 unitários/modelos/
API e35 casos browser distintos passaram entre rodadas de produção, incluindo
REQ/BAL existentes e falhas direcionadas da CI.
[Manifesto D3.6](../audits/D/D-B/D3_6_EVIDENCE.json).
C7-AC-004 tem prova local; sessão/24h e demais contextos continuam pendentes.

D3.7 comprova C-AC-077: revisão legada salva, submissão pendente e recuperação
das duas etapas já concluídas. Mantém chaves/versão da intenção sem submeter
edição posterior. Auth17/17, contratos API15/15 e24 casos browser distintos
passaram entre rodadas; o recheck final passou12/12. Tipos/lint passaram.
[Evidência D3.7](../audits/D/D-B/D3_7_EVIDENCE.json). CI10e6111 aprovou banco e
validate Windows/Ubuntu; browsers ainda em andamento na observação anterior
ao novo push. CI do candidato continua gate independente. D4, D5 e demais
requisitos seguem em execução.

D3.8 comprova localmente C-AC-013/021: vocabulário humano, fallbacks explícitos
e consultas de entregas/estoque protegidas contra respostas invertidas.
Papéis locais e administração global continuam separados. Nomes de destinos e
contexto dos avisos foram corrigidos; C-AC-014 continua parcial até cada tela
resolver sua referência individual, incluindo plantão e alerta de estoque.
46 unitários/apresentação e21 casos browser distintos passaram; seis rechecks
afetados também passaram. [Evidência D3.8](../audits/D/D-B/D3_8_EVIDENCE.json).
CIebc4464 aprovou banco e validate Windows/Ubuntu; browsers ainda em andamento
na observação anterior ao push deste lote. Tipos/lint passaram; nenhuma
migration nova. CI do novo SHA e demais requisitos continuam gates separados.

Base integrada PR6: `8ec979a`. Branch única `feat/phase-d-implementation` e
[Draft PR7](https://github.com/RMZZFAJ/home-care-assistant/pull/7), sem merge.
[Checkpoint por incremento](../audits/D/D-A/CHECKPOINT.md) preserva tentativas,
contraprovas, resultados por SHA e limites. [Matriz81](../audits/D/D-A/ACCEPTANCE_EXECUTION.csv)
registra a execução local; colunas de planejamento e gates C9 preservadas.

## Continuidade autorizada D-B

[Ordem e checkpoint D-B](../audits/D/D-B/README.md): 75 critérios C9 e 30
complementos em execução, sem conclusão integral. O remoto autorizado
qwfrqychokvhdzakibid foi reconciliado de113 para121 migrations, com as oito
pendências D-A aplicadas, backup cifrado e restore isolado de122 tabelas,
29 objetos Storage e28 hashes PDF verificados. Digests anteriores preservados,
sem reset/seed ou mudança de cron/Auth/Vault. [Relatório](../audits/D/D-B/MIGRATIONS.md).

Arquivador/probe são bases técnicas verificadas; backup diário operacional,
retenção automatizada e monitoramento ainda não estão ativos. A CI aa9f168
foi consultada e aprovou todos os jobs principais nos três navegadores.
SonarCloud desse SHA tinha Reliability D/Security B. Os quatro apontamentos PATH
desapareceram na análise4315eb9; triagem de ETag/MD5 está
[documentada](../audits/D/D-B/SONAR_TRIAGE.md). D3.1 distingue consulta e intenção
incerta, protege a classificação42702 e implementa404 público em português.
28 testes unitários/API e10 casos browser distintos passaram entre rodadas,
com401/403, quatro larguras, axe e consumidores anteriores. Os três apontamentos
UI originais receberam correção local. A CI/Sonar do SHA publicado continua
necessária. PAdES, verificação por upload e PWA/push ainda não implementados.

D3.2 implementa consulta paginada de propostas abertas/histórico, comparação em
leitura, chave/versão originais nas duas entradas administrativas e recuperação
de intenção incerta. Passaram27 unitários, oito testes Auth distintos e os nove
casos novos de navegador entre rodadas nos três projetos; três consumidores
anteriores também passaram. O conflito exige revisão autoritativa explícita,
sem apagar outro editor por retorno tardio. Local125/remoto121: quatro migrations
D3 continuam locais, para o preflight final autorizado. [Checkpoint D3.2](../audits/D/D-B/CHECKPOINT.md).
O responsável adiou configuração e tratamento específico do SonarCloud;
[complemento vigente](../audits/D/D-B/OWNER_AMENDMENTS.md). O provedor não é
considerado aprovado por esse adiamento.

D3.3 remove o corte de auditoria, com páginas/referência/período e audit.read
delegável; NULL deixa de liberar o limite documental. Trinta testes dirigidos
de unidade/API, três Auth e seis casos browser passaram. Local126/remoto121,
com a quinta migration D-B ainda local. C-AC-020 mantém investigação própria
do sino, cuja falha de consulta foi observada no ensaio de histórico.

## Implementado no candidato

- D0: prontidão real dos serviços, NULL/existência, incomplete do axe,
  preservação/exportação e contrato do oráculo PDF com controles negativos.
- D1: filas/progresso REQ e decisões de escala P1 corrigidos; precisão,
  concorrência, versão, recuperação e autoridade depois de esperas observadas.
  A sessão é conferida pelo relógio atual, inclusive após atingir seu prazo.
- REQ: material emitido imutável, observação zero/vazia/desconhecida e instante,
  atendimento por ENT, necessidade remanescente em nova REQ vinculada e P02.
  SCI individual/ANY familiar não atribui ato a terceiros; SCI-005 é obrigatória
  na expedição familiar efetiva, sem ciência por draft ou tentativa revertida.
- COM/ENT: origem explícita, parcelas, validação/rejeição e encerramento inferior;
  sugestão de recebedor editável com justificativa, aceite pessoal, divergências,
  cancelamento/recusa/retirada, consumo referenciado e tratamento P05.
- BAL: referência física explícita, contagem/reconto, mesma janela ou nova pessoa
  e janela, autores/versões preservados, revisão facultativa distinta de efeito
  físico e decisões de adiamento obsoletas sem apagar a história.
- Estoque/catálogo: movimentos causais, correções compensatórias, consumo,
  declaração/concordância/expedição bilateral, saldo inativo e sucessores sem
  fusão destrutiva, apresentações versionadas e seleção em catálogos1/5/20/100.
  Devolução antiga e intenções continuam preservadas; três pares locais
  confrontaram conservação, recebedor, protocolo e replay dos dois percursos.
- Escalas: recorrências e datas avulsas entre meses, tipo/versão e fuso,
  conflitos reservados atômicos, exceção de uma data, corte e propostas em leitura.
- Rascunhos próprios REQ/BAL entre aparelhos: revisão/horário do servidor,
  comparação explícita de conflitos, confirmação atômica e recuperação da mesma
  intenção. Descarte preserva documentos oficiais, ready e autoria.

## Evidência e limites

Último conjunto D2.32: três casos Auth em pares,12 testes API e seis casos
Chromium distintos passaram entre rodadas, com rechecks somente afetados.
M1 manteve material/SCI/evento original após associação de extra e atendimento;
PDFv2/v6 têm registros e hashes independentes, v2 reobtido com bytes idênticos.
Extração e inspeção das cinco páginas foram independentes da resposta HTTP.
ENT mostrou todas as linhas e contexto em leitura; Sheila recebeu2 de3,
família/global não assinaram e uma unidade permaneceu em trânsito. Retirada
familiar5→4 e configuração BAL sexta/noturno/fuso coincidiram com banco/ledger.
Tipos/lint dirigidos, quatro larguras e axe aprovados; sem homologação humana.

121 migrations incrementais no candidato;84 migrations históricas protegidas.
CI7b7c97a/42297092802 concluiu banco/replay121 e validações Windows/Ubuntu
com success, mas teve falhas de foco BAL, largura WebKit e clique mobile.
Essas regressões foram corrigidas: oito casos dirigidos passaram entre
rodadas nos três projetos, incluindo comparação/justificativa preservada,
quatro larguras e clique sem force. A CI do SHA seguinte continua necessária;
resultado anterior ou pending não é aprovação. Nenhuma suíte geral local foi
repetida para este reparo. O Vercel7b7 estava success; SonarCloud permanece
check externo separado, sem resultado aprovado presumido.

Os35 avisos de editor fornecidos foram corrigidos:25 referências Markdown
com serviço instalado25→0 e10 aliases Tailwind com CSS equivalente. Prosa,
decisões e regras de diagnóstico preservadas; detalhes e hashes constam do
[registro de reparos](../audits/D/D-A/EDITOR_DIAGNOSTICS_REPAIRS.json).

Stack local home-care-assistant/API54321/DB54322 verificada. Após os testes,
os dois jobs cron originalmente ativos foram restaurados para active.
Backup externo original preservado; não equivale a restore testado.

D-C, SCI-004 e homologações humanas/AT/aparelho/provedor continuam condicionadas.
D-B inclui assinatura interna/TSA, backup e monitoramento sem contratação externa,
conforme ordem vigente. Não houve merge, deploy ou liberação operacional.
[Continuidade](ROADMAP.md) registra
os gates e a oportunidade de paginação do QR isolado em D4.

OPS.1 ampliou o probe para exigir SHA/bytes das emissões assinadas ready,
com compatibilidade para backups sem essa tabela. SQL isolado e nova restauração
do backup cifrado anterior passaram:122 conjuntos,29 objetos,28 PDFs, sem cron
ou pg_net. Agenda/retenção, destino independente e gate D6 continuam pendentes.
[Evidência e limites](../audits/D/D-B/OPS_1_EVIDENCE.json).

OPS.3 integra monitoramento persistente, suporte global minimizado, políticas
e histórico, recuperação da mesma tentativa e impacto/ajuda pessoal. Local e
remoto147 estão reconciliados após cópia/restauração/upgrade e pós-validação.
17 casos Auth/SQL/filesystem,17 unitários e18 casos distintos em build de produção
passaram em grupos dirigidos; a CI do SHA publicado ainda é gate próprio.
Agenda de backup e telemetria do operador continuam desligadas, sem comprovação
de disponibilidade externa, RPO/RTO operacional ou D6. A matriz D-B mantém25 PASS,
47 PARTIAL e33 NOT_STARTED; a missão continua. Sonar adiado pelo responsável,
PR7 Draft, sem merge ou promoção. [Contrato](../audits/D/D-B/OBSERVABILITY.md)
e [evidência](../audits/D/D-B/OPS_3_EVIDENCE.json).

C-AC-023 corrige a janela inicial de avisos: respeita0/5/10 segundos,
conserva resultado terminal e cancela somente as próprias leituras, mantendo
PDF independente. 15 unitários, dois casos HTTP Auth e15 casos em build de
produção passaram; banco local/remoto148 reconciliado após nova cópia/probe e
pós-validação. [Provas](../audits/D/D-B/NOTICE_TRACKING_EVIDENCE.json).
O [roteiro do piloto](../audits/D/D-B/PILOT_AND_CONTINGENCY.md) conecta controles
já implementados aos responsáveis e gates ainda a designar. Matriz26 PASS,
48 PARTIAL e31 NOT_STARTED, com colunas originais preservadas. D-B continua
ativa; CI do novo SHA e D-C/D6 permanecem próprios. Sem merge ou promoção.

C-AC-017/052/107 implementam anexos com arquivo/chave congelados, origem
atestada pelo servidor, recuperação pelos bytes do Storage e abandono formal
sem apagar ready ou história. Anotações/campos PDF recebem recusa explícita;
novos envios têm4 MiB compatíveis com o transporte. Onze unitários, dez casos
Auth/Storage, um consumidor anterior e trinta casos distintos de navegador
passaram em grupos qualificados. [Provas](../audits/D/D-B/ATTACHMENTS_EVIDENCE.json).
Local150/remoto150 reconciliado após cópia fresca, upgrade isolado e pós-check.
Matriz29 PASS/48 PARTIAL/28 NOT_STARTED. A CI42ca8df falhou no contrato antigo
da fixture V4; esse consumidor foi corrigido e reensaiado. O novo SHA ainda
exige CI própria. Sonar adiado; D-B ativa, D-C/D6 e GO operacional pendentes.
