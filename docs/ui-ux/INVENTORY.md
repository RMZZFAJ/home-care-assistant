# Inventário de interface

Gerado por scripts/inventory-ui.mjs. O JSON adjacente registra dependências,
exports e pontos de estado, incluindo componentes renderizados indiretamente.

## Páginas e layouts

| Arquivo | Elementos |
| --- | --- |
| src/app/admin/page.tsx | src/components/authenticated-page, src/components/admin/admin-console |
| src/app/configuracoes/page.tsx | src/components/authenticated-page, src/components/admin/policy-console |
| src/app/consumo/page.tsx | src/components/authenticated-page, src/components/stock/consumption-console |
| src/app/convites/aceitar/page.tsx | src/components/admin/accept-invitation |
| src/app/estoque/page.tsx | src/components/authenticated-page, src/components/stock/stock-console |
| src/app/fichas/[id]/page.tsx | src/components/authenticated-page, src/components/documents/supply-detail, src/components/documents/demo-document |
| src/app/fichas/bal/page.tsx | src/components/authenticated-page, src/components/documents/supply-wizard |
| src/app/fichas/com/page.tsx | src/components/authenticated-page, src/components/documents/supply-wizard |
| src/app/fichas/ent/page.tsx | src/components/authenticated-page, src/components/documents/supply-wizard |
| src/app/fichas/page.tsx | src/components/authenticated-page, src/components/documents/forms-hub |
| src/app/fichas/req/page.tsx | src/components/authenticated-page, src/components/requisitions/requisition-wizard |
| src/app/historico/[id]/page.tsx | src/components/authenticated-page, src/components/requisitions/requisition-detail, src/components/documents/demo-document |
| src/app/historico/page.tsx | src/components/authenticated-page, src/components/documents/document-history |
| src/app/inventarios/page.tsx |  |
| src/app/layout.tsx | src/components/live-session |
| src/app/login/page.tsx | Entrar |
| src/app/notificacoes/page.tsx | src/components/authenticated-page, src/components/notifications/notification-center |
| src/app/page.tsx | src/components/authenticated-page, src/components/dashboard |
| src/app/perfil/page.tsx | src/components/authenticated-page, src/components/profile-console |
| src/app/recuperar-senha/page.tsx | src/components/auth/password-recovery-form |
| src/app/unidades/page.tsx | src/components/authenticated-page, src/components/catalog/unit-console |
| src/app/verificar/[id]/page.tsx | Verificação do comprovante |
| src/components/authenticated-page.tsx | Configuração necessária; Acesso indisponível |

## Componentes

| Arquivo | Linhas | Estados locais | Dependências internas |
| --- | --- | --- | --- |
| src/components/admin/accept-invitation.tsx | 192 | 7 | src/components/workspace |
| src/components/admin/admin-console.tsx | 929 | 16 | src/components/workspace, src/components/admin/notification-settings, src/lib/receipt, src/components/admin/admin-fields, src/components/admin/alert-settings, src/components/admin/patient-registration |
| src/components/admin/admin-fields.tsx | 79 | 0 | src/components/workspace |
| src/components/admin/alert-settings.tsx | 101 | 0 | src/components/workspace, src/components/admin/admin-fields |
| src/components/admin/notification-matrix.tsx | 300 | 3 | src/components/workspace, src/lib/notifications/event-labels, src/components/admin/admin-fields |
| src/components/admin/notification-settings.tsx | 17 | 0 | src/lib/receipt, src/components/workspace |
| src/components/admin/patient-registration.tsx | 109 | 0 | src/components/workspace, src/components/admin/admin-fields |
| src/components/admin/permission-matrix.tsx | 124 | 1 | src/lib/capability-labels, src/components/workspace, src/components/admin/admin-fields |
| src/components/admin/policy-console.tsx | 577 | 8 | src/components/workspace, src/components/admin/permission-matrix, src/components/admin/notification-matrix, src/components/admin/reminder-settings, src/components/admin/admin-fields, src/lib/use-live-revision |
| src/components/admin/reminder-settings.tsx | 112 | 0 | src/components/workspace |
| src/components/app-shell.tsx | 688 | 7 | src/components/workspace, src/components/auth/logout-button, src/components/ui/primitives, src/components/notifications/notification-bell |
| src/components/auth/contact-settings.tsx | 183 | 4 | src/components/workspace, src/lib/supabase/client |
| src/components/auth/login-form.tsx | 220 | 5 | src/lib/use-client-ready, src/lib/supabase/client, src/lib/safe-return-path |
| src/components/auth/logout-button.tsx | 34 | 2 | src/lib/supabase/client |
| src/components/auth/mfa-settings.tsx | 223 | 10 | src/lib/supabase/client, src/lib/safe-return-path, src/components/workspace |
| src/components/auth/password-recovery-form.tsx | 121 | 5 | src/lib/use-client-ready, src/lib/validation/password, src/lib/supabase/client |
| src/components/authenticated-page.tsx | 71 | 0 | src/lib/safe-return-path, src/lib/supabase/server |
| src/components/catalog/barcode-scanner.tsx | 228 | 4 | src/components/ui/primitives, src/components/workspace |
| src/components/catalog/unit-console.tsx | 287 | 7 | src/components/workspace, src/types/documents |
| src/components/dashboard.tsx | 293 | 3 | src/components/workspace, src/components/documents/document-history, src/components/ui/primitives, src/lib/use-live-revision |
| src/components/documents/attachments.tsx | 204 | 6 | src/components/workspace |
| src/components/documents/demo-document.tsx | 37 | 0 | src/lib/demo-documents |
| src/components/documents/document-actions.tsx | 135 | 3 | src/components/workspace |
| src/components/documents/document-history.tsx | 385 | 9 | src/components/workspace, src/components/ui/primitives, src/types/documents, src/lib/receipt, src/lib/use-live-revision |
| src/components/documents/document-timeline.tsx | 43 | 0 | src/lib/notifications/event-labels, src/lib/receipt |
| src/components/documents/forms-hub.tsx | 73 | 0 | src/components/workspace, src/components/ui/primitives, src/types/documents |
| src/components/documents/related-document.tsx | 90 | 3 | src/components/ui/primitives, src/components/workspace, src/lib/receipt |
| src/components/documents/supply-command-editor.tsx | 435 | 4 | src/components/workspace, src/lib/quantity, src/types/documents |
| src/components/documents/supply-detail.tsx | 505 | 10 | src/components/documents/supply-line-summary, src/components/workspace, src/components/ui/primitives, src/components/notifications/document-delivery-status, src/components/documents/attachments, src/components/documents/supply-command-editor, src/types/documents, src/lib/notifications/event-labels, src/lib/quantity, src/lib/receipt, src/lib/use-live-revision, src/components/documents/document-actions |
| src/components/documents/supply-line-summary.tsx | 107 | 0 | src/types/documents, src/lib/quantity |
| src/components/documents/supply-wizard-step.tsx | 409 | 0 | src/components/documents/related-document, src/components/workspace, src/components/catalog/barcode-scanner, src/lib/quantity, src/types/documents |
| src/components/documents/supply-wizard.tsx | 716 | 15 | src/components/documents/document-actions, src/components/workspace, src/components/notifications/document-delivery-status, src/components/ui/primitives, src/components/documents/supply-wizard-step, src/lib/quantity, src/types/documents |
| src/components/live-session.tsx | 26 | 1 | src/lib/supabase/client, src/components/workspace-sync |
| src/components/notifications/document-delivery-status.tsx | 125 | 3 | src/components/workspace, src/lib/notifications/presentation, src/lib/receipt, src/lib/use-live-revision |
| src/components/notifications/notification-bell.tsx | 170 | 4 | src/components/workspace, src/components/ui/primitives, src/lib/notifications/event-labels, src/lib/receipt, src/lib/use-live-revision, src/lib/notifications/navigation |
| src/components/notifications/notification-center.tsx | 210 | 7 | src/lib/use-live-revision, src/components/workspace, src/lib/receipt, src/lib/notifications/presentation, src/lib/notifications/event-labels, src/lib/notifications/navigation |
| src/components/profile-console.tsx | 453 | 7 | src/components/workspace, src/components/auth/contact-settings, src/components/auth/mfa-settings, src/lib/receipt |
| src/components/requisitions/print-button.tsx | 6 | 0 |  |
| src/components/requisitions/requisition-detail.tsx | 559 | 7 | src/components/workspace, src/lib/use-live-revision, src/lib/receipt, src/lib/quantity, src/lib/text-rows, src/components/documents/attachments, src/components/documents/document-actions, src/components/documents/document-timeline, src/components/documents/related-document, src/components/ui/primitives, src/components/requisitions/resolve-extra-item, src/lib/notifications/presentation |
| src/components/requisitions/requisition-history.tsx | 48 | 7 | src/lib/notifications/presentation, src/lib/receipt, src/components/workspace |
| src/components/requisitions/requisition-receipt.tsx | 95 | 0 | src/components/workspace, src/components/notifications/document-delivery-status, src/lib/receipt, src/components/documents/document-actions, src/types/requisition, src/components/requisitions/requisition-steps |
| src/components/requisitions/requisition-steps.tsx | 537 | 4 | src/components/ui/primitives, src/components/documents/related-document, src/lib/receipt, src/components/workspace, src/lib/catalog-match, src/lib/text-rows, src/lib/quantity, src/types/requisition, src/types/documents |
| src/components/requisitions/requisition-wizard.tsx | 480 | 13 | src/lib/quantity, src/types/requisition, src/types/documents, src/components/workspace, src/components/ui/primitives, src/components/requisitions/requisition-steps, src/components/requisitions/requisition-receipt |
| src/components/requisitions/resolve-extra-item.tsx | 210 | 6 | src/components/workspace, src/components/ui/primitives, src/types/documents |
| src/components/stock/consumption-console.tsx | 295 | 8 | src/components/workspace, src/lib/receipt, src/components/stock/flow-reviews, src/types/documents |
| src/components/stock/flow-reviews.tsx | 275 | 8 | src/components/workspace, src/components/ui/primitives, src/types/documents, src/lib/receipt |
| src/components/stock/inventory-console.tsx | 59 | 11 | src/lib/receipt, src/components/workspace |
| src/components/stock/stock-console.tsx | 661 | 19 | src/lib/use-live-revision, src/components/workspace, src/components/documents/attachments, src/components/ui/primitives, src/components/stock/transit-stock, src/lib/quantity, src/lib/receipt |
| src/components/stock/transit-stock.tsx | 103 | 0 | src/components/ui/primitives, src/lib/quantity, src/lib/receipt |
| src/components/ui/primitives.tsx | 248 | 0 | src/types/documents |
| src/components/workspace-sync.tsx | 118 | 1 | src/lib/supabase/client |
| src/components/workspace.tsx | 174 | 0 |  |

## Cobertura de estados

Cada área deve ser verificada em carregamento, vazio, erro, bloqueio por
capacidade, conflito, processamento e resultado real. A matriz de homologação
registrará variações por contexto, paciente, documento e largura de tela.
