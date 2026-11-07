# Estado verificável do projeto

Referência editorial:07/11/2026, America/Sao_Paulo. **Produção NO-GO.**
**D-B (D3–D5) em execução; D-A (D0–D2) consolidada localmente.**
CI do SHA publicado é gate independente; pending não significa aprovação.

CI dfdc7de, run42335739149, concluiu banco, validate Ubuntu/Windows e os três
projetos browser com SUCCESS. Inclui a correção D3.4a dos consumidores de
governança que falharam em bd8747b e os estados de leitura D3.4. Essa CI não
valida os incrementos posteriores. Local136/remoto121;15 migrations D-B
aguardam o lote remoto final autorizado.
SonarCloud segue adiado expressamente pelo responsável, sem Quality Gate aprovado.

CI639b5cb, run42354352749, aprovou banco/validate, mas falhou em preparação
global Chromium e largura de entregas WebKit; central teve uma tentativa
instável. D3.9 corrigiu essas causas e passou27/27 casos dirigidos em produção
nos três projetos, além de9 Auth e27 unitários/API. Avisos resolvem recurso,
dia/fuso e origem reais; resposta pessoal e relato vinculado recuperam a mesma
intenção sem baixa de estoque/SCI. [Evidências](../audits/D/D-B/D3_9_EVIDENCE.json).
CI do novo SHA publicado continua gate separado.

D4 tem [prova isolada](../audits/D/D-B/d4-probe/README.md) de assinatura técnica
com token RFC3161 interno, validada por pyHanko independente e contraprovas de
alteração/cobertura. Não é pipeline do produto nem aceite D4. Certificado/TSA
internos não fornecem confiança externa ou independência temporal. Emissão,
histórico, verificação pública, D5 e infraestrutura complementar continuam
pendentes; não há liberação operacional.

D4.1 implementa o núcleo Node de assinatura, TSA interna e verificação dos
bytes/certificado/carimbo. Seis testes criptográficos e três verificações
independentes passaram, incluindo as negativas. Tipos/lint aprovados;
[evidências e limites](../audits/D/D-B/D4_1_EVIDENCE.json). Integração com emissão,
custódia operacional, oráculo documental e verificador público permanecem
pendentes; D-B-AC-006/007 continuam parciais.

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
