# B4 — Backend, APIs e confiabilidade dos serviços

Investigação B4.0–B4.12 concluída sobre produto37cb7f85, em audit/phase-b.
Sem correções funcionais ou alterações remotas. Consolidação e estado final
estão no [checkpoint](CHECKPOINT.md). NO-GO anterior preservado.

Começar pelo [parecer executivo](17_GROUP_B4_EXECUTIVE_ASSESSMENT.md),
[achados](14_FINDINGS_MASTER.md) e
[insumos para C](18_PHASE_C_DECISION_HANDOFF.md).

## Dimensão e limites

- 61 métodos HTTP, 41 handlers, 82 superfícies; 102 linhas de cobertura
  distinguem método e biblioteca. Todos os handlers e 27 helpers têm leitura
  própria; 14 helpers/apresentações idênticos reutilizam revisão A.
- 77 cenários únicos: 60 locais HTTP/Auth/Storage/browser/assets e 17 de
  adaptadores controlados. Diagnóstico inclui defeitos reproduzidos, sem
  aprovação de produto.
- 13 registros com 32 campos: dez P2/três P3; sete mecanismos novos, quatro
  causas
  relacionadas, uma manifestação ampliada e uma revalidação. Dois são riscos
  sustentados; nenhum P0/P1 novo. Bloqueadores anteriores continuam abertos.
- Sem produção, provedor real, restore conjunto, p95 remoto, humano ou aparelho
  físico homologados. Um cenário Chromium dirigido não é suíte E2E completa.

## Mapa de leitura

1. [Baseline e método](00_BASELINE_SCOPE_AND_METHOD.md),
   [catálogo](01_BACKEND_API_INVENTORY.csv),
   [cobertura](01_BACKEND_COVERAGE.csv) e
   [arquitetura HTTP](01_ARCHITECTURE_AND_REQUEST_FLOW.md).
2. [Autoridade](02_AUTH_CONTEXT_AND_CAPABILITIES.md),
   [matriz HTTP](02_AUTHORIZATION_HTTP_MATRIX.csv) e
   [entradas](03_INPUT_VALIDATION_AND_DATA_CONTRACTS.md).
3. [Comandos](04_COMMANDS_IDEMPOTENCY_AND_RECOVERY.md),
   [consultas](05_READ_APIS_PAGINATION_AND_FRESHNESS.md) e
   [erros](06_HTTP_ERRORS_AND_FAILURE_RECOVERY.md).
4. [Documentos/arquivos](07_DOCUMENTS_PDF_ATTACHMENTS_SERVICES.md),
   [administração](08_ADMINISTRATION_IDENTITY_AND_SETTINGS.md) e
   [integrações](09_WORKERS_WEBHOOKS_AND_INTEGRATION_BOUNDARIES.md).
5. [Segurança](10_APPLICATION_SECURITY_AND_PRIVACY.md),
   [resiliência](11_ARCHITECTURE_OBSERVABILITY_AND_RESILIENCE.md) e
   [segunda passagem](12_CROSS_LAYER_ADVERSARIAL_SCENARIOS.md).
6. [Oportunidades](13_NEW_BACKEND_GAPS_AND_OPPORTUNITIES.md),
   [mestre CSV](14_FINDINGS_MASTER.csv),
   [aceites](15_ACCEPTANCE_AND_REGRESSION_CRITERIA.md) e
   [dependências](16_CROSS_GROUP_DEPENDENCIES.md).

## Evidência e retomada

[Ordem mestre](evidence/MASTER_ORDER.txt),
[baseline](evidence/baseline.json),
[backup](evidence/backup-proof.json),
[cenários](evidence/SCENARIOS.csv) e
[reconciliação](evidence/coverage-reconciliation.json).
Probes por grupo têm resultados sanitizados, categoria, contraprova e limite.
As [tentativas instrumentais](evidence/ATTEMPTS.md) preservam o erro de
read-back
e a correção de proveniência do build. Nenhum resultado foi descartado para
afirmar sucesso do produto.

Auxiliares mutáveis não são uma suíte de regressão para execução em lote.
Criam somente objetos fictícios novos e dependem do estado privado fora do Git.
Não reexecutar initialize/probes para reconstruir história, nem substituir dados
ou usar remoto. Credenciais, cookies, dump, tokens e URLs assinadas não estão
neste pacote. O servidor reutilizou build B3 local guardado, sem rebuild B4.

Validação final: [integridade](evidence/package-validation.json),
[preservação](evidence/preservation-results.json) e
[manifesto](evidence/MANIFEST.json). Resultados globais B3 são históricos;
somente validações direcionadas aos auxiliares/documentação foram acrescentadas.
O commit documental inclui esta pasta e o índice geral da Fase B, sem PR,
merge, deploy ou início de B5/C/D.

Os 395 arquivos protegidos e 232 funções permaneceram iguais. Nas 62 tabelas
públicas, hashes originais de 60 tabelas foram preservados; 19 cabeçalhos e seus
controles de lifecycle avançaram pelo cron já ativo. A
[reconciliação do backup](evidence/background-progress-results.json) confirmou
todos os IDs originais, tipo/status/paciente e encadeamento de 19 eventos de
lembrete do sistema. Não houve restore nem escrita do auditor nesses documentos.
O servidor próprio foi encerrado ao final; fixtures fictícias foram preservadas.
