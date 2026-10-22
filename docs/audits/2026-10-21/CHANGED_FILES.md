# Arquivos e motivos da intervenção

Inventário em relação à base fc04de4, incluindo arquivos novos ainda não
commitados. A = criado, M = alterado, D = removido. A remoção de
vitest.config.ts corresponde à substituição pela configuração ESM .mts.
Os primeiros 19 arquivos de migration não foram alterados.

Arquivos privados de ambiente, perfis CLI, backups, fixtures geradas, traces
e node_modules não integram esse inventário nem a publicação.

## Runtime, dependências e CI

Versões exatas, instalação reproduzível, lint atual, build e pipeline com
banco/navegador locais.

- A `.env.example`
- M `.github/workflows/ci.yml`
- M `.gitignore`
- A `.node-version`
- A `.npmrc`
- A `.nvmrc`
- M `eslint.config.mjs`
- M `next.config.ts`
- M `package-lock.json`
- M `package.json`
- M `playwright.config.ts`
- M `tsconfig.json`
- A `vercel.json`
- A `vitest.config.mts`
- D `vitest.config.ts`

## Banco e configuração local

Migrations incrementais, integridade por paciente, autorização, transações e
Auth local para os testes.

- M `supabase/config.toml`
- A `supabase/migrations/20261020002000_scoped_authority_and_catalogue.sql`
- A `supabase/migrations/20261020002050_extension_migration_compatibility.sql`
- A `supabase/migrations/20261020002100_transactional_operations.sql`
- A `supabase/migrations/20261020002200_invites_alerts_and_outbox.sql`
- A `supabase/migrations/20261020002300_cross_scope_invariants.sql`
- A `supabase/migrations/20261020002400_patient_directory_contracts.sql`
- A `supabase/migrations/20261020002500_notification_revocation_guard.sql`
- A `supabase/migrations/20261020002600_role_capability_boundaries.sql`
- A `supabase/migrations/20261020002700_invitation_registration.sql`
- A `supabase/migrations/20261020002800_historical_unknown_stock_and_extras.sql`
- A `supabase/migrations/20261020002900_alert_custody_routing_and_priority.sql`
- A `supabase/migrations/20261020003000_safe_notification_read_models.sql`
- A `supabase/migrations/20261020003100_explicit_uncertain_retry.sql`
- A `supabase/migrations/20261020003200_remove_migration_compatibility_bridge.sql`
- A `supabase/migrations/20261020003300_service_worker_privileges.sql`
- A `supabase/migrations/20261020003400_private_function_defaults.sql`

## Harness, contratos e evidências automatizadas

Guard histórico, preparo/backup local, replay limpo/legado, integração real, E2E
e geração da rastreabilidade.

- A `scripts/audit-catalogue.mjs`
- A `scripts/backup-local-database.mjs`
- A `scripts/build-traceability.mjs`
- A `scripts/check-contracts.mjs`
- A `scripts/clean-test-database.mjs`
- A `scripts/historical-migrations.json`
- A `scripts/prepare-test-database.mjs`
- A `scripts/reconcile-database.mjs`
- A `scripts/run-e2e.mjs`
- A `scripts/seed-test-fixtures.mjs`
- A `scripts/supabase-project.mjs`
- A `scripts/test-constants.mjs`
- A `scripts/test-environment.mjs`
- A `scripts/test-migrations.mjs`
- A `scripts/verify-linux.sh`
- A `tests/api/guards.test.ts`
- A `tests/api/notifications.test.ts`
- A `tests/api/requisition-contract.test.ts`
- A `tests/api/requisition-persistence.test.ts`
- A `tests/api/worker.test.ts`
- A `tests/app-origin.test.ts`
- A `tests/auth.test.ts`
- A `tests/catalog-match.test.ts`
- A `tests/database/alerts-routing.sql`
- A `tests/database/invitations-import-outbox.sql`
- A `tests/database/migration-search-path.sql`
- A `tests/database/notification-read-model.sql`
- A `tests/database/protocol-and-stock-boundaries.sql`
- A `tests/database/service-role.sql`
- A `tests/database/transactions.sql`
- A `tests/e2e/accessibility.spec.ts`
- A `tests/e2e/administration.spec.ts`
- M `tests/e2e/login.spec.ts`
- A `tests/e2e/onboarding.spec.ts`
- A `tests/e2e/workflows.spec.ts`
- A `tests/integration/database.test.mjs`
- M `tests/requisition.test.ts`
- A `tests/supabase-project.test.ts`

## Aplicação, API e interface

Contexto multipaciente, administração e jornadas integradas com validação e
permissões no servidor/banco.

- M `src/app/admin/page.tsx`
- M `src/app/api/admin/notifications/route.ts`
- M `src/app/api/admin/route.ts`
- A `src/app/api/catalog/route.ts`
- A `src/app/api/context/route.ts`
- A `src/app/api/invitations/accept/route.ts`
- A `src/app/api/invitations/register/route.ts`
- A `src/app/api/notifications/webhook/route.ts`
- A `src/app/api/notifications/worker/route.ts`
- M `src/app/api/requisitions/[id]/route.ts`
- M `src/app/api/requisitions/[id]/status/route.ts`
- M `src/app/api/requisitions/route.ts`
- A `src/app/api/stock/balances/route.ts`
- M `src/app/api/stock/inventory/route.ts`
- M `src/app/api/stock/movements/route.ts`
- M `src/app/auth/callback/route.ts`
- A `src/app/convites/aceitar/page.tsx`
- A `src/app/estoque/page.tsx`
- M `src/app/globals.css`
- M `src/app/historico/[id]/page.tsx`
- M `src/app/historico/page.tsx`
- A `src/app/inventarios/page.tsx`
- M `src/app/login/page.tsx`
- M `src/app/page.tsx`
- A `src/app/recuperar-senha/page.tsx`
- A `src/components/admin/accept-invitation.tsx`
- M `src/components/admin/admin-console.tsx`
- A `src/components/admin/notification-settings.tsx`
- M `src/components/auth/login-form.tsx`
- M `src/components/auth/logout-button.tsx`
- A `src/components/auth/password-recovery-form.tsx`
- A `src/components/authenticated-page.tsx`
- M `src/components/requisitions/print-button.tsx`
- A `src/components/requisitions/requisition-detail.tsx`
- M `src/components/requisitions/requisition-history.tsx`
- M `src/components/requisitions/requisition-wizard.tsx`
- A `src/components/stock/inventory-console.tsx`
- A `src/components/stock/stock-console.tsx`
- A `src/components/workspace.tsx`
- A `src/lib/catalog-match.ts`
- A `src/lib/notifications/presentation.ts`
- A `src/lib/notifications/provider.ts`
- A `src/lib/notifications/webhook.ts`
- A `src/lib/notifications/worker.ts`
- M `src/lib/receipt.ts`
- A `src/lib/safe-return-path.ts`
- A `src/lib/server/api.ts`
- A `src/lib/server/app-origin.ts`
- A `src/lib/server/error-catalog.ts`
- A `src/lib/server/receipts.ts`
- A `src/lib/server/service-client.ts`
- A `src/lib/text-rows.ts`
- M `src/lib/validation/requisition.ts`
- A `src/types/operations.ts`
- M `src/types/requisition.ts`

## Documentação e auditoria

Instruções operacionais atuais, fontes históricas, decisões, comparação de
banco, evidências e limites.

- M `AGENTS.md`
- A `docs/API.md`
- M `docs/ARCHITECTURE.md`
- M `docs/AUDIT.md`
- A `docs/audits/2026-10-20/CHECKPOINT.md`
- A `docs/audits/2026-10-20/DATABASE_AUDIT.md`
- A `docs/audits/2026-10-20/DEPENDENCY_AUDIT_BEFORE.json`
- A `docs/audits/2026-10-20/DEPENDENCY_AUDIT.json`
- A `docs/audits/2026-10-20/DEPENDENCY_REVIEW.md`
- A `docs/audits/2026-10-20/EXECUTION.md`
- A `docs/audits/2026-10-20/FINDINGS.md`
- A `docs/audits/2026-10-20/LOCKFILE.md`
- A `docs/audits/2026-10-20/README.md`
- A `docs/audits/2026-10-20/REQUIREMENTS.csv`
- A `docs/audits/2026-10-20/REQUIREMENTS.json`
- A `docs/audits/2026-10-20/SECURITY_AUDIT.md`
- A `docs/audits/2026-10-20/SOURCE_REQUIREMENTS.json`
- A `docs/audits/2026-10-20/sources/AUDITORIA.txt`
- A `docs/audits/2026-10-20/sources/MISSION.txt`
- A `docs/audits/2026-10-20/sources/SUPERPROMPT.txt`
- A `docs/audits/2026-10-20/verification.json`
- A `docs/audits/2026-10-20/VERSIONS.md`
- A `docs/audits/2026-10-21/AUTHORIZATION.md`
- A `docs/audits/2026-10-21/CATALOGUE_AUDIT.json`
- A `docs/audits/2026-10-21/CATALOGUE_AUDIT.md`
- A `docs/audits/2026-10-21/CHANGED_FILES.md`
- A `docs/audits/2026-10-21/DATABASE_COMPARISON.json`
- A `docs/audits/2026-10-21/DATABASE_TEST_RESULTS.json`
- A `docs/audits/2026-10-21/DEPENDENCY_PRODUCTION.json`
- A `docs/audits/2026-10-21/E2E_RESULTS.json`
- A `docs/audits/2026-10-21/EXECUTION.md`
- A `docs/audits/2026-10-21/FINAL_REPORT.md`
- A `docs/audits/2026-10-21/LINUX_RESULTS.json`
- A `docs/audits/2026-10-21/LOCAL_METADATA.json`
- A `docs/audits/2026-10-21/OPERATIONS_HANDOFF.md`
- A `docs/audits/2026-10-21/public-metadata.sql`
- A `docs/audits/2026-10-21/README.md`
- A `docs/audits/2026-10-21/REMOTE_AFTER.json`
- A `docs/audits/2026-10-21/REMOTE_BEFORE.json`
- A `docs/audits/2026-10-21/REMOTE_METADATA.json`
- A `docs/audits/2026-10-21/REMOTE_ORIGINAL_INTEGRITY.json`
- A `docs/audits/2026-10-21/remote-integrity.sql`
- A `docs/audits/2026-10-21/SECRET_SCAN.json`
- A `docs/audits/2026-10-21/SERVICE_GRANTS_LOCAL_AFTER.json`
- A `docs/audits/2026-10-21/SERVICE_GRANTS_LOCAL.json`
- A `docs/audits/2026-10-21/SERVICE_GRANTS_REMOTE_AFTER.json`
- A `docs/audits/2026-10-21/SERVICE_GRANTS_REMOTE.json`
- A `docs/audits/2026-10-21/SERVICE_GRANTS_REVIEW.md`
- A `docs/audits/2026-10-21/service-grants.sql`
- A `docs/audits/2026-10-21/SUPABASE_CLI.md`
- A `docs/audits/2026-10-21/VALIDATION_PROPOSAL.json`
- A `docs/audits/2026-10-21/WINDOWS_RESULTS.json`
- M `docs/DATABASE.md`
- M `docs/DEPLOYMENT.md`
- A `docs/OPERATIONS.md`
- M `docs/PROJECT_STATUS.md`
- M `docs/ROADMAP.md`
- M `docs/SECURITY.md`
- A `docs/TESTING.md`
- M `docs/WHATSAPP_AI.md`
- M `README.md`
