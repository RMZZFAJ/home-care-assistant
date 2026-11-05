# C4 — arquitetura de evolução, sem execução

Preservar App Router/React/TypeScript, Auth, PostgreSQL/RPC/RLS, Storage
privado, ledger, snapshots e outbox existentes. Não há evidência que exija
outro backend, banco, fila ou plataforma. Todo desenho abaixo é
`PLANNED_NOT_IMPLEMENTED`.

- [Impacto por causa](CHANGE_IMPACT_MATRIX.csv): 121 causas e seus
  consumidores, origem, resultado, compatibilidade e aceite.

- [Novas finalidades aprovadas](APPROVED_CAPABILITY_CHANGE_PLAN.csv): 28
  grupos de requisitos, com decisão, pendência pontual, lote e verificação.

- [Contratos UI/API/dados/eventos](DATA_API_UI_EVENT_CONTRACTS.md).

- [Migrations e compatibilidade](MIGRATION_COMPATIBILITY_PLAN.md). -
  [Segurança, privacidade e rastreabilidade](SECURITY_PRIVACY_AND_TRACEABILITY.md).

- [Rascunhos](DRAFT_PERSISTENCE_AND_CONCURRENCY.md),
  [push](PWA_PUSH_DELIVERY_ARCHITECTURE.md) e
  [verificador PDF](PDF_VERIFICATION_ARCHITECTURE.md).

- [Falhas, idempotência e sequências](FAILURE_RECOVERY_AND_IDEMPOTENCY.md).

- [Alternativas arquiteturais](ARCHITECTURAL_DECISIONS.md).

Os detalhes de campo/tela estão em C3; não os duplicar aqui. Decisão humana
pendente não pode ser resolvida pela escolha de uma tabela ou endpoint. Os
nomes novos são propostas técnicas; antes de criar migration em D, conferir
catálogo instalado e último contrato para não recriar mecanismo existente.

## Fechamento definitivo vigente

P02 OWNER_APPROVED. Revisão individual das 66 fichas e 262 controles
originais; catálogo atual de 274 controles/424 usos, 171 relações e 187 casos
planejados. [Relatório C10](../C10-pr-handoff/PHASE_C_FINAL_PART2_REPORT.md) e
[política de ciência](../C7-decision-closure/SCIENCE_OWNER_REVIEW.md). D NÃO
INICIADA; gates específicos permanecem.
