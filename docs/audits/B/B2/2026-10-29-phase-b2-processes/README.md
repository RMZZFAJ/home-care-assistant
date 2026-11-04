# Fase B2 — processos e jornadas operacionais

Auditoria de 29/10/2026, exclusivamente em audit/phase-b. B2.0–B2.10
investigados, sem implementação. Consolidação, verificação e commit documental
registrados no [checkpoint](CHECKPOINT.md). O parecer A NO-GO permanece.

Começar pelo [diagnóstico executivo](16_GROUP_B2_EXECUTIVE_ASSESSMENT.md).
Ele explica o que existe, o que funciona, os defeitos, processos incompletos,
melhorias candidatas e decisões pendentes, sem exigir leitura de código.

## Dimensão e limites da prova

- 66 processos em 12 domínios; 102 transições reconstruídas.
- 81 cenários locais dirigidos; 57 processos com amostras locais e nove somente
  estáticos nesta B2. Ramos não exercitados continuam discriminados por
  processo.
- Seis E2E selecionados passaram em Chromium, Android e iPhone emulados;
  98 testes unitários passaram. Isso não é execução da suíte E2E completa.
- 17 achados: oito defeitos, sete lacunas e duas oportunidades; 15 P2/dois P3.
  Quatro revalidações A e 13 causas/recortes adicionais, com referências B1.
- 21 exceções transversais; 20 alternativas de produto, incluindo O10 descartada
  como novidade genérica por solução já existente; 19 candidatas permanecem.
- Nenhuma validação de produção, provedor real, participante ou aparelho físico.

## Mapa de leitura

1. [Base e método](00_BASELINE_SCOPE_AND_METHOD.md),
   [inventário](01_PROCESS_INVENTORY.csv),
   [cobertura](01_PROCESS_COVERAGE.csv) e
   [atores](01_ACTORS_RESPONSIBILITIES_MATRIX.csv).
2. [Mapa de estados](02_PROCESS_STATE_MAPS.md) e
   [transições](02_PROCESS_TRANSITIONS.csv).
3. [Abastecimento](03_REQUISITION_ACQUISITION_AUDIT.md),
   [entregas](04_DELIVERY_RECEIPT_AUDIT.md),
   [estoques](05_STOCK_CUSTODY_MOVEMENTS_AUDIT.md),
   [BAL/consumo](06_BALANCE_CONSUMPTION_AUDIT.md),
   [escalas](07_SCHEDULES_SHIFTS_AUDIT.md),
   [pessoas/administração](08_IDENTITIES_MEMBERSHIPS_ADMIN_AUDIT.md) e
   [documentos/comunicações](09_DOCUMENTS_SCIENCE_COMMUNICATION_AUDIT.md).
4. [Exceções](10_CROSS_PROCESS_EXCEPTIONS.md) e
   [catálogo CSV](10_EXCEPTION_SCENARIOS.csv);
   [jornadas por pessoa](11_PERSONA_JOURNEYS_AND_OPERATIONAL_FRICTION.md).
5. [Alternativas de produto](12_NEW_FUNCTIONALITIES_AND_PROCESS_GAPS.md) e
   [CSVcomparativo](12_OPPORTUNITIES.csv).
6. [Achados](13_FINDINGS_MASTER.md) e
   [CSVcom29atributos](13_FINDINGS_MASTER.csv);
   [aceites futuros](14_ACCEPTANCE_SCENARIOS.md);
   [dependências](15_CROSS_GROUP_DEPENDENCIES.md);
   [decisões para C](17_PHASE_C_DECISION_HANDOFF.md).

## Evidência e retomada

[Ordem mestra textual](evidence/MASTER_ORDER.txt), preservada byte a byte do
anexo; [registro de execução](evidence/WORKLOG.md);
[tentativas do auditor](evidence/ATTEMPTS.md);
[reconciliação](evidence/coverage-reconciliation.json);
[validação](evidence/package-validation.json) e
[manifestoSHA256](evidence/manifest.json).

Resultados b22–b29 têm IDs de cenário, atores fictícios, estado persistido e
limites. EXECUTED significa que o cenário chegou ao resultado registrado,
incluindo defeitos reproduzidos; não significa produto aprovado. Tentativas
inválidas ficam em arquivos próprios e previousAttempts, sem inflar contagem.
Contratos SQL são cópias somente de leitura das funções locais, não migrations.

Capturas de entrega são leituras de UI e abertura de formulário sem submissão;
[registro visual](evidence/browser-inspection.json) identifica os estados.
[PDFs](evidence/pdf-inspection.json) são versões fictícias geradas pelo produto,
com quatro páginas inspecionadas. Hash canônico e hash do arquivo são distintos.

O manifesto registra bytes dos artefatos, preservados também nos blobs Git.
verify-manifest.py permite conferir a árvore, o index antes de commit ou HEAD
depois do commit. O modo --head evita diferenças de fim de linha introduzidas
por checkout em outro ambiente. A ordem mestra textual conserva os bytes do
anexo original; snapshots brutos ficam em txt/yml, separados da apresentação.

Textos autorais foram normalizados para LF; a ordem mestra conserva CRLF
original. A checagem de whitespace reconhece CR como terminador nesse anexo,
mantendo detecção de espaços finais reais. Não foi alterada configuração global
do Git, regra de teste ou arquivo funcional.

Logs legíveis omitem espaços de apresentação e linhas vazias excedentes no fim;
as cópias anteriores ficam em .raw.log.gz, incluindo build-current.raw.log.gz.
Nenhum resultado ou mensagem de erro foi alterado.

Helpers de testes são mutáveis e não devem ser executados como um lote de
regressão. Dependem de estado privado de fixture fora do Git, ordem e fatos
anteriores. Os geradores iniciais build-inventory/build-transitions conservam
o método B2.1 e não devem sobrescrever a reconciliação final. O arquivo
reconcile-coverage.py gera o catálogo final; os reprodutores não corrigem
código.

O banco existente foi identificado e teve backup verificável antes de novos
dados sintéticos. Não houve reset, seed de substituição, segunda stack, mudança
remota ou envio externo. Senhas, cookies, chaves, dump e URLs assinadas ficaram
fora do pacote. Nenhuma operação em B3/C/D está autorizada por esta conclusão.
