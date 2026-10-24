# Inventário de interface

Gerado por scripts/inventory-ui.mjs. O JSON adjacente registra dependências,
exports e pontos de estado, incluindo componentes renderizados indiretamente.

## Páginas e layouts

### src/app/admin/page.tsx

Linhas: 7. Estados locais: 0.

Dependências internas:

- src/components/authenticated-page
- src/components/admin/admin-console

### src/app/configuracoes/page.tsx

Linhas: 10. Estados locais: 0.

Dependências internas:

- src/components/authenticated-page
- src/components/admin/policy-console

### src/app/consumo/page.tsx

Linhas: 10. Estados locais: 0.

Dependências internas:

- src/components/authenticated-page
- src/components/stock/consumption-console

### src/app/convites/aceitar/page.tsx

Linhas: 3. Estados locais: 0.

Dependências internas:

- src/components/admin/accept-invitation

### src/app/entregas/page.tsx

Linhas: 4. Estados locais: 0.

Dependências internas:

- src/components/authenticated-page
- src/components/documents/delivery-inbox

### src/app/estoque/page.tsx

Linhas: 4. Estados locais: 0.

Dependências internas:

- src/components/authenticated-page
- src/components/stock/stock-console

### src/app/fichas/[id]/page.tsx

Linhas: 24. Estados locais: 0.

Dependências internas:

- src/components/authenticated-page
- src/components/documents/supply-detail
- src/lib/demo-documents
- src/components/documents/demo-document

### src/app/fichas/bal/page.tsx

Linhas: 10. Estados locais: 0.

Dependências internas:

- src/components/authenticated-page
- src/components/documents/supply-wizard

### src/app/fichas/com/page.tsx

Linhas: 10. Estados locais: 0.

Dependências internas:

- src/components/authenticated-page
- src/components/documents/supply-wizard

### src/app/fichas/ent/page.tsx

Linhas: 10. Estados locais: 0.

Dependências internas:

- src/components/authenticated-page
- src/components/documents/supply-wizard

### src/app/fichas/page.tsx

Linhas: 10. Estados locais: 0.

Dependências internas:

- src/components/authenticated-page
- src/components/documents/forms-hub

### src/app/fichas/req/page.tsx

Linhas: 10. Estados locais: 0.

Dependências internas:

- src/components/authenticated-page
- src/components/requisitions/requisition-wizard

### src/app/historico/[id]/page.tsx

Linhas: 28. Estados locais: 0.

Dependências internas:

- src/components/authenticated-page
- src/components/requisitions/requisition-detail
- src/lib/demo-documents
- src/components/documents/demo-document

### src/app/historico/page.tsx

Linhas: 11. Estados locais: 0.

Dependências internas:

- src/components/authenticated-page
- src/components/documents/document-history

### src/app/inventarios/page.tsx

Linhas: 5. Estados locais: 0.

### src/app/layout.tsx

Linhas: 32. Estados locais: 0.

Dependências internas:

- src/app/globals.css
- src/app/design-system.css
- src/components/live-session
- src/theme/providers
- src/theme/tokens.css
- src/components/layout/workspace-context

### src/app/login/page.tsx

Linhas: 16. Estados locais: 0.

Dependências internas:

- src/components/auth/login-form

### src/app/mais/page.tsx

Linhas: 4. Estados locais: 0.

Dependências internas:

- src/components/authenticated-page
- src/components/navigation/more-actions

### src/app/notificacoes/page.tsx

Linhas: 10. Estados locais: 0.

Dependências internas:

- src/components/authenticated-page
- src/components/notifications/notification-center

### src/app/page.tsx

Linhas: 11. Estados locais: 0.

Dependências internas:

- src/components/authenticated-page
- src/components/dashboard

### src/app/perfil/page.tsx

Linhas: 10. Estados locais: 0.

Dependências internas:

- src/components/authenticated-page
- src/components/profile-console

### src/app/recuperar-senha/page.tsx

Linhas: 4. Estados locais: 0.

Dependências internas:

- src/components/auth/password-recovery-form

### src/app/unidades/page.tsx

Linhas: 10. Estados locais: 0.

Dependências internas:

- src/components/authenticated-page
- src/components/catalog/unit-console

### src/app/verificar/[id]/page.tsx

Linhas: 68. Estados locais: 0.

## Componentes

### src/components/admin/accept-invitation.tsx

Linhas: 192. Estados locais: 7.

Dependências internas:

- src/components/workspace

### src/components/admin/admin-console.tsx

Linhas: 929. Estados locais: 16.

Dependências internas:

- src/components/workspace
- src/components/admin/notification-settings
- src/lib/receipt
- src/components/admin/admin-fields
- src/components/admin/alert-settings
- src/components/admin/patient-registration

### src/components/admin/admin-fields.tsx

Linhas: 79. Estados locais: 0.

Dependências internas:

- src/components/workspace

### src/components/admin/alert-settings.tsx

Linhas: 101. Estados locais: 0.

Dependências internas:

- src/components/workspace
- src/components/admin/admin-fields

### src/components/admin/notification-matrix.tsx

Linhas: 300. Estados locais: 3.

Dependências internas:

- src/components/workspace
- src/lib/notifications/event-labels
- src/components/admin/admin-fields

### src/components/admin/notification-settings.tsx

Linhas: 17. Estados locais: 0.

Dependências internas:

- src/lib/receipt
- src/components/workspace

### src/components/admin/patient-registration.tsx

Linhas: 109. Estados locais: 0.

Dependências internas:

- src/components/workspace
- src/components/admin/admin-fields

### src/components/admin/permission-matrix.tsx

Linhas: 124. Estados locais: 1.

Dependências internas:

- src/lib/capability-labels
- src/components/workspace
- src/components/admin/admin-fields

### src/components/admin/policy-console.tsx

Linhas: 577. Estados locais: 8.

Dependências internas:

- src/components/workspace
- src/components/admin/permission-matrix
- src/components/admin/notification-matrix
- src/components/admin/reminder-settings
- src/components/admin/admin-fields
- src/lib/use-live-revision

### src/components/admin/reminder-settings.tsx

Linhas: 112. Estados locais: 0.

Dependências internas:

- src/components/workspace

### src/components/app-shell.tsx

Linhas: 42. Estados locais: 0.

Dependências internas:

- src/lib/client/capabilities
- src/types/workspace
- src/components/layout/workspace-context

### src/components/auth/contact-settings.tsx

Linhas: 184. Estados locais: 4.

Dependências internas:

- src/components/forms/settings-section
- src/components/workspace
- src/lib/supabase/client

### src/components/auth/login-form.tsx

Linhas: 153. Estados locais: 5.

Dependências internas:

- src/lib/use-client-ready
- src/lib/supabase/client
- src/lib/safe-return-path

### src/components/auth/logout-button.tsx

Linhas: 35. Estados locais: 2.

Dependências internas:

- src/lib/supabase/client

### src/components/auth/mfa-settings.tsx

Linhas: 224. Estados locais: 10.

Dependências internas:

- src/components/forms/settings-section
- src/lib/supabase/client
- src/lib/safe-return-path
- src/components/workspace

### src/components/auth/password-recovery-form.tsx

Linhas: 121. Estados locais: 5.

Dependências internas:

- src/lib/use-client-ready
- src/lib/validation/password
- src/lib/supabase/client

### src/components/authenticated-page.tsx

Linhas: 71. Estados locais: 0.

Dependências internas:

- src/lib/safe-return-path
- src/lib/supabase/server

### src/components/catalog/barcode-scanner.tsx

Linhas: 228. Estados locais: 4.

Dependências internas:

- src/components/ui/primitives
- src/components/workspace

### src/components/catalog/unit-console.tsx

Linhas: 287. Estados locais: 7.

Dependências internas:

- src/components/workspace
- src/types/documents

### src/components/dashboard.tsx

Linhas: 293. Estados locais: 3.

Dependências internas:

- src/components/workspace
- src/components/documents/document-history
- src/components/ui/primitives
- src/lib/use-live-revision

### src/components/documents/attachments.tsx

Linhas: 204. Estados locais: 6.

Dependências internas:

- src/components/workspace

### src/components/documents/delivery-inbox.tsx

Linhas: 39. Estados locais: 8.

Dependências internas:

- src/components/workspace
- src/components/documents/document-history
- src/components/ui/primitives
- src/lib/use-live-revision

### src/components/documents/demo-document.tsx

Linhas: 37. Estados locais: 0.

Dependências internas:

- src/lib/demo-documents

### src/components/documents/document-actions.tsx

Linhas: 135. Estados locais: 3.

Dependências internas:

- src/components/workspace

### src/components/documents/document-history.tsx

Linhas: 385. Estados locais: 9.

Dependências internas:

- src/components/workspace
- src/components/ui/primitives
- src/types/documents
- src/lib/receipt
- src/lib/use-live-revision

### src/components/documents/document-timeline.tsx

Linhas: 43. Estados locais: 0.

Dependências internas:

- src/lib/notifications/event-labels
- src/lib/receipt

### src/components/documents/forms-hub.tsx

Linhas: 73. Estados locais: 0.

Dependências internas:

- src/components/workspace
- src/components/ui/primitives
- src/types/documents

### src/components/documents/related-document.tsx

Linhas: 90. Estados locais: 3.

Dependências internas:

- src/components/ui/primitives
- src/components/workspace
- src/lib/receipt

### src/components/documents/supply-command-editor.tsx

Linhas: 435. Estados locais: 4.

Dependências internas:

- src/components/workspace
- src/lib/quantity
- src/types/documents

### src/components/documents/supply-detail.tsx

Linhas: 505. Estados locais: 10.

Dependências internas:

- src/components/documents/supply-line-summary
- src/components/workspace
- src/components/ui/primitives
- src/components/notifications/document-delivery-status
- src/components/documents/attachments
- src/components/documents/supply-command-editor
- src/types/documents
- src/lib/notifications/event-labels
- src/lib/quantity
- src/lib/receipt
- src/lib/use-live-revision
- src/components/documents/document-actions

### src/components/documents/supply-line-summary.tsx

Linhas: 107. Estados locais: 0.

Dependências internas:

- src/types/documents
- src/lib/quantity

### src/components/documents/supply-wizard-step.tsx

Linhas: 409. Estados locais: 0.

Dependências internas:

- src/components/documents/related-document
- src/components/workspace
- src/components/catalog/barcode-scanner
- src/lib/quantity
- src/types/documents

### src/components/documents/supply-wizard.tsx

Linhas: 716. Estados locais: 15.

Dependências internas:

- src/components/documents/document-actions
- src/components/workspace
- src/components/notifications/document-delivery-status
- src/components/ui/primitives
- src/components/documents/supply-wizard-step
- src/lib/quantity
- src/types/documents

### src/components/forms/settings-section.tsx

Linhas: 20. Estados locais: 1.

Dependências internas:

- src/components/ui/primitives

### src/components/layout/workspace-context.tsx

Linhas: 135. Estados locais: 5.

Dependências internas:

- src/lib/client/api
- src/types/workspace
- src/lib/demo-documents
- src/components/layout/workspace-shell

### src/components/layout/workspace-shell.tsx

Linhas: 81. Estados locais: 3.

Dependências internas:

- src/components/ui/primitives
- src/components/notifications/notification-bell
- src/components/auth/logout-button
- src/components/navigation/workspace-navigation
- src/components/layout/workspace-context

### src/components/live-session.tsx

Linhas: 26. Estados locais: 1.

Dependências internas:

- src/lib/supabase/client
- src/components/workspace-sync

### src/components/navigation/more-actions.tsx

Linhas: 23. Estados locais: 0.

Dependências internas:

- src/components/workspace
- src/components/ui/primitives

### src/components/navigation/workspace-navigation.tsx

Linhas: 77. Estados locais: 0.

Dependências internas:

- src/lib/client/capabilities
- src/types/workspace
- src/components/ui/primitives

### src/components/notifications/document-delivery-status.tsx

Linhas: 125. Estados locais: 3.

Dependências internas:

- src/components/workspace
- src/lib/notifications/presentation
- src/lib/receipt
- src/lib/use-live-revision

### src/components/notifications/notification-bell.tsx

Linhas: 170. Estados locais: 4.

Dependências internas:

- src/components/workspace
- src/components/ui/primitives
- src/lib/notifications/event-labels
- src/lib/receipt
- src/lib/use-live-revision
- src/lib/notifications/navigation

### src/components/notifications/notification-center.tsx

Linhas: 210. Estados locais: 7.

Dependências internas:

- src/lib/use-live-revision
- src/components/workspace
- src/lib/receipt
- src/lib/notifications/presentation
- src/lib/notifications/event-labels
- src/lib/notifications/navigation

### src/components/profile-console.tsx

Linhas: 454. Estados locais: 7.

Dependências internas:

- src/components/forms/settings-section
- src/components/workspace
- src/components/auth/contact-settings
- src/components/auth/mfa-settings
- src/lib/receipt

### src/components/requisitions/print-button.tsx

Linhas: 6. Estados locais: 0.

### src/components/requisitions/requisition-detail.tsx

Linhas: 559. Estados locais: 7.

Dependências internas:

- src/components/workspace
- src/lib/use-live-revision
- src/lib/receipt
- src/lib/quantity
- src/lib/text-rows
- src/components/documents/attachments
- src/components/documents/document-actions
- src/components/documents/document-timeline
- src/components/documents/related-document
- src/components/ui/primitives
- src/components/requisitions/resolve-extra-item
- src/lib/notifications/presentation

### src/components/requisitions/requisition-history.tsx

Linhas: 48. Estados locais: 7.

Dependências internas:

- src/lib/notifications/presentation
- src/lib/receipt
- src/components/workspace

### src/components/requisitions/requisition-receipt.tsx

Linhas: 95. Estados locais: 0.

Dependências internas:

- src/components/workspace
- src/components/notifications/document-delivery-status
- src/lib/receipt
- src/components/documents/document-actions
- src/types/requisition
- src/components/requisitions/requisition-steps

### src/components/requisitions/requisition-steps.tsx

Linhas: 537. Estados locais: 4.

Dependências internas:

- src/components/ui/primitives
- src/components/documents/related-document
- src/lib/receipt
- src/components/workspace
- src/lib/catalog-match
- src/lib/text-rows
- src/lib/quantity
- src/types/requisition
- src/types/documents

### src/components/requisitions/requisition-wizard.tsx

Linhas: 480. Estados locais: 13.

Dependências internas:

- src/lib/quantity
- src/types/requisition
- src/types/documents
- src/components/workspace
- src/components/ui/primitives
- src/components/requisitions/requisition-steps
- src/components/requisitions/requisition-receipt

### src/components/requisitions/resolve-extra-item.tsx

Linhas: 210. Estados locais: 6.

Dependências internas:

- src/components/workspace
- src/components/ui/primitives
- src/types/documents

### src/components/stock/consumption-console.tsx

Linhas: 295. Estados locais: 8.

Dependências internas:

- src/components/workspace
- src/lib/receipt
- src/components/stock/flow-reviews
- src/types/documents

### src/components/stock/flow-reviews.tsx

Linhas: 275. Estados locais: 8.

Dependências internas:

- src/components/workspace
- src/components/ui/primitives
- src/types/documents
- src/lib/receipt

### src/components/stock/inventory-console.tsx

Linhas: 59. Estados locais: 11.

Dependências internas:

- src/lib/receipt
- src/components/workspace

### src/components/stock/stock-console.tsx

Linhas: 661. Estados locais: 19.

Dependências internas:

- src/lib/use-live-revision
- src/components/workspace
- src/components/documents/attachments
- src/components/ui/primitives
- src/components/stock/transit-stock
- src/lib/quantity
- src/lib/receipt

### src/components/stock/transit-stock.tsx

Linhas: 103. Estados locais: 0.

Dependências internas:

- src/components/ui/primitives
- src/lib/quantity
- src/lib/receipt

### src/components/ui/primitives.tsx

Linhas: 181. Estados locais: 0.

Dependências internas:

- src/types/documents

### src/components/workspace-sync.tsx

Linhas: 118. Estados locais: 1.

Dependências internas:

- src/lib/supabase/client

### src/components/workspace.tsx

Linhas: 31. Estados locais: 0.

## Cobertura de estados

Cada área deve ser verificada em carregamento, vazio, erro, bloqueio por
capacidade, conflito, processamento e resultado real. A matriz de homologação
registrará variações por contexto, paciente, documento e largura de tela.
