# Fase B3 — banco, autorização e integridade transacional

Auditoria instaurada em 29/10/2026, em `audit/phase-b`, conforme a
[ordem mestre](evidence/MASTER_ORDER.txt). Produto funcional
`37cb7f85e96e551d6419871f94dd950712e2565b`; HEAD inicial documental
`896590e9c3020d4759d22fb9df730c446249d133`.

Investigação B3.0–B3.12 concluída, com fechamento em 30/10/2026. São 94 cenários
locais dirigidos, sete planos SELECT e25 achados:1 P1,19 P2 e5 P3. Dezesseis
recortes são herdados; nove observações/mecanismos adicionais incluem riscos
e governança. Nenhum P0 demonstrado não significa ausência de vulnerabilidades.
O parecer NO-GO A continua vigente.

Começar pelo [parecer executivo](17_GROUP_B3_EXECUTIVE_ASSESSMENT.md), consultar
o [registro de achados](14_FINDINGS_MASTER.md) e o
[handoff documental](18_PHASE_C_DECISION_HANDOFF.md). O
[checkpoint](CHECKPOINT.md) e os registros individuais preservam a sequência.
Não autoriza correções, B4, execução de C/D, reset, alteração remota, deploy, PR
ou
merge. O encerramento prevê apenas commit/push documental na mesma branch.

## Relatórios e matrizes

| Etapa | Relatório | Matriz principal |
| --- | --- | --- |
| B3.0 | [Baseline](00_BASELINE_SCOPE_AND_METHOD.md) e [preservação](00_ENVIRONMENT_AND_PRESERVATION.md) | [Ambiente](evidence/baseline.json) |
| B3.1 | [Modelo e dependências](01_SCHEMA_DEPENDENCY_MAP.md) | [Inventário](01_DATABASE_OBJECT_INVENTORY.csv), [cobertura](01_DATABASE_COVERAGE.csv), [invariantes](01_DATA_INVARIANTS_CATALOG.csv) |
| B3.2 | [Migrations/drift](02_MIGRATIONS_AND_DRIFT_AUDIT.md) | [84 versões](02_MIGRATION_HISTORY_MATRIX.csv) |
| B3.3 | [RLS/grants/isolamento](03_RLS_GRANTS_AND_TENANT_ISOLATION.md) | [Autorização](03_AUTHORIZATION_MATRIX.csv) |
| B3.4 | [Funções privilegiadas](04_PRIVILEGED_FUNCTIONS_AND_RPC_AUDIT.md) | [232 contratos](04_RPC_SECURITY_AND_CALLERS.csv) |
| B3.5 | [Ledger/custódia](05_LEDGER_STOCK_AND_QUANTITY_INTEGRITY.md) | [Conservação](05_STOCK_INVARIANTS_MATRIX.csv) |
| B3.6 | [Documentos/estados](06_DOCUMENT_LIFECYCLE_AND_STATE_INTEGRITY.md) | [Transições](06_DOCUMENT_TRANSITIONS_MATRIX.csv) |
| B3.7 | [Escalas/BAL](07_SCHEDULE_BALANCE_AND_ASSIGNMENT_INTEGRITY.md) | [Recortes transversais](12_CROSS_LAYER_SCENARIOS.csv) |
| B3.8 | [Concorrência](08_CONCURRENCY_IDEMPOTENCY_AND_TRANSACTIONS.md) | [12 cenários forçados](08_CONCURRENCY_SCENARIOS.csv) |
| B3.9 | [Jobs/progresso](09_SCHEDULERS_JOBS_AND_MULTIPATIENT_PROGRESS.md) | [10 mecanismos](09_JOBS_PROGRESS_MATRIX.csv) |
| B3.10 | [Storage/retencão](10_STORAGE_ATTACHMENTS_AND_RETENTION.md) | [Resultados](evidence/b310-results.json) |
| B3.11 | [Consultas/desempenho](11_QUERIES_READ_MODELS_AND_PERFORMANCE.md) | [23 modelos](11_QUERY_COVERAGE_AND_PERFORMANCE.csv) |
| B3.12 | [Adversarial/recuperação](12_ADVERSARIAL_INTEGRITY_AND_RECOVERY.md) | [23 recortes](12_CROSS_LAYER_SCENARIOS.csv) |
| Consolidação | [Novas lacunas](13_NEW_DATABASE_RISKS_AND_STRUCTURAL_GAPS.md) e [dependências](16_CROSS_GROUP_DEPENDENCIES.md) | [25 achados/32 campos](14_FINDINGS_MASTER.csv) |
| Aceitação futura | [Critérios por causa](15_ACCEPTANCE_AND_REGRESSION_MATRIX.md) | [Manifestações](evidence/FINDING_MANIFESTATIONS.csv) |

## Como interpretar a cobertura

1.098 objetos/subobjetos inventariados; 306 objetos principais na cobertura,
incluindo71 tabelas, uma view, duas sequências e232 rotinas. Quatro rotinas são
de extensão e foram excluídas justificadamente da semântica da aplicação.
Há 35 invariantes, 1.522 linhas na matriz de autorização e94 cenários únicos.
Linhas de matriz, definições extraídas e tentativas DML dentro de um cenário
não aumentam a contagem de testes.34 funções têm casos diretos identificados;
sete têm ensaios SQL de papel/contexto; as demais conservam limites estáticos
e indiretos. Nenhuma função foi marcada integralmente certificada.

Replay B3 limpo/legado, restore integral, inspeção remota, navegador,
dispositivo,
aceite humano e entrega externa continuam NOT_VERIFIED. As verificações oficiais
seguras estão separadas em [checks](evidence/checks.json). A
[CI histórica](evidence/ci-historical-run.json) permanece failure; resultados
locais não a corrigem nem substituem sua execução.

## Evidência e reprodução

`evidence/inspect.mjs` é somente leitura: usa os guards do repositório,
inspeciona metadados locais e conserva definições SQL em `evidence/contracts`.
O catálogo não contém linhas privadas nem valores do Vault. Contratos são
evidência do banco instalado, não migrations corretivas.

O [guia de reprodução](evidence/REPRODUCTION_GUIDE.md) separa scripts somente
leitura, geradores documentais, preparação/servidor e reprodutores mutáveis.
Não executar todos em lote numa retomada nem sobrescrever o baseline privado.
O [índice de cenários](evidence/SCENARIO_INDEX.csv) preserva método e resultado;
[tentativas](evidence/ATTEMPTS.md) conservam erros de procedimento e limites.

As3.693 linhas originais de 20 tabelas não tiveram exclusões. Sete cabeçalhos
avançaram por lembrete do cron já ativo, com fonte/encadeamento verificados;
os demais hashes originais não mudaram. Isso está separado em
[conferência](evidence/data-preservation.json) e
[explicação privada sanitizada](evidence/data-preservation-explanation.json).
Nenhuma operação restaurou/reverteu esses dados. Código funcional, migrations,
funções e branch master foram preservados. Dados novos B3 foram retidos.

O [manifesto SHA-256](evidence/MANIFEST.sha256) usa bytes dos blobs Git
explicitamente selecionados e possui exclusões autorreferentes declaradas.
O [relatório de integridade](evidence/PACKAGE_INTEGRITY.md) registra validação
dos entregáveis, referências, cobertura, segredos e preservação.
