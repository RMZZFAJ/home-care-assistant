# D4.10 — estado e tarefa no PDF ENT

Havia um defeito real: ENT cancelada V7 e encerrada administrativamente V8
sem aceite continuavam pedindo conferência pessoal e exibindo linhas como
“Aguardando conferência”. A nova representação V9 lê estado, histórico,
aceite e natureza da versão exclusivamente do snapshot congelado.

Cancelamento, encerramento administrativo, conclusão, divergência, decisão
de cancelamento e estado desconhecido recebem textos próprios. Só a versão
operacional pendente sem aceite solicita conferência. A versão nativa antiga,
quando representada como derivada, não cria tarefa atual. Aceite pessoal
existente conserva data e autoria; ausência de data não prova ausência do ato.
Encerramento administrativo não substitui aceite nem resolve situação física
desconhecida. O cabeçalho também recusa propriedades herdadas como estado.

## Compatibilidade e autorização

`reserve_pdf_issuance_v9` escolhe V9 para novas intenções ENT e V7 para os
demais tipos. Os três entrypoints anteriores e replays V5–V8 permanecem.
V9 mantém os fatos de regularização V8. Arquivos antigos conservam inclusive
o texto defeituoso: dois hashes controlados e um exemplar V8 real comprovam
essa compatibilidade. O acervo ENT avisa sobre exemplares anteriores à V9,
orientando consultar a ficha atual ou gerar outro PDF. O aviso não altera
download, permissões, bytes, assinatura ou o histórico.

Não há revisão estética. O trabalho trata significado, fatos e tarefas.
O download não gera outra emissão, não altera hash canônico ou ledger.
Fora do paciente, acesso revogado, anônimo, serviço e helpers privados
continuam sujeitos às negativas existentes e às novas provas Auth.

## Coortes e contraprovas

- 37 unitários distintos aprovados em coortes: 22 do novo arquivo final,
  incluindo dois hashes legados, mais cinco de regularização e dez de fatos.
  As execuções intermediárias de 34 e 21 não são somadas como novos casos.
- Dois Auth reais aprovados: cancelamento/encerramento legítimos, aceite
  preservado, replay e negativas. Sem forçar estado ou inventar recebimento.
- Nove casos de produção aprovados: três cenários nos três motores. Geraram
  19 PDFs assinados, incluindo um V8 recuperado no Chromium.
- Três consumidores existentes passaram em coortes qualificadas: dois na
  primeira execução e um na repetição dirigida. Houve um timeout real do
  `/api/context`, antes de gerar PDF, correlação
  `2df689b8-4da6-4a2f-a8a0-237e9e87e2e1`; PostgreSQL registrou cancelamento
  por statement timeout em `2026-11-08T21:33:27.617Z`. A falha e seu contexto
  foram preservados. O mesmo caso passou sem alteração de fonte na repetição.
- Uma extensão Chromium passou verificando o aviso no acervo. No conjunto:
  12 casos distintos; 14 execuções, 13 PASS e uma FAIL. A extensão repete um
  cenário, portanto não aumenta a contagem distinta.
- Tipos e lint afetados passaram. Fontes estáveis durante cada E2E e nenhuma
  suíte mutável de banco em paralelo. Não se repetiu a suíte global local.

O [corpus independente](d4-ent-terminal-proof/CORPUS.json) contém seis V9 e
um V8 real, com somente a raiz pública efêmera. O
[oráculo](d4-ent-terminal-proof/verify.py) verificou os sete: identidade,
SHA256, texto na região própria, limites/rodapé, idioma, assinatura ENTIRE_FILE
e TSA interna. Não é confiança ICP-Brasil, tempo externo, ensaio humano ou
aprovação estética. [Resultado](d4-ent-terminal-proof/VERIFICATION.json).

## Remoto e critérios

A migration157 foi aplicada e pós-validada no projeto autorizado após teste
local, reconciliação e dry-run apenas da pendente. As157 versões e o novo SQL
coincidem; seis funções/grants pertinentes coincidem com o local, os três
entrypoints antigos permanecem intactos, helpers fechados e dois crons iguais.
Sem reset, seeds, Auth remoto, backup/restore redundante ou envio externo.
[Recibo](ENT_TERMINAL_REMOTE_MIGRATIONS.json). Advisors:204 segurança e164
desempenho, nenhum ERROR; warnings conservados, inclusive a nova RPC Auth.
[Contagem](ENT_TERMINAL_ADVISORS.json).

C105 avança como PARTIAL_LOCAL_ENT_TERMINAL_AND_DERIVED_WORDING; C106 continua
parcial. Outros tipos/estados, anexos e leitura marcada não foram esgotados.
Matriz45 PASS/50 PARTIAL/10 NOT_STARTED,105x39,29 colunas canônicas preservadas.
O reuso C108 de D4.9 continua restrito ao núcleo inalterado de histórico,
arquivo e autorização: DocumentActions recebeu somente o aviso passivo,
coberto pela extensão nova. Não se afirma que esse consumidor ficou idêntico.

[Manifesto](ENT_TERMINAL_EVIDENCE.json). A
[CI9987804](CI_9987804_OBSERVATION.json) estava em andamento na observação;
não valida este lote. O SHA publicado exige CI própria. Sonar adiado pelo
responsável; PR7 Draft, sem merge/promoção. D-B permanece ativa, com operação
diária prioritária; suporte, AT/aparelho, D-C/D6 e gates externos separados.
