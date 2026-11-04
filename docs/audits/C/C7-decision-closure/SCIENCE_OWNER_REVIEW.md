# Revisão humana P02, por tipo e origem

**OWNER_REVIEW_REQUIRED.** Inventário concluído; classificação individual
continua pendente. As cinco origens abaixo são o conjunto completo do enum
persistido `requisition_science_events.mode`, conferido no código. Todas são
da REQ; não há ciência autônoma COM/ENT/BAL comprovada. Os demais atos estão
no catálogo para impedir que um aceite material seja convertido em ciência. 66
linhas de atos não significam 66 tipos de ciência nem equivalem às 66
superfícies C3 ou aos processos B2.

<!-- c-table:start -->

- **ID:** SCI-001

  **Origem AS_IS:** Clique pessoal express no app

  **Proposta para avaliar, não aprovada:** Conservar opção manual; decidir
  diálogo/tácita para a ciência informativa deste tipo

  **Resposta do responsável:** A PREENCHER

- **ID:** SCI-002

  **Origem AS_IS:** app_visible observa cabeçalho

  **Proposta para avaliar, não aprovada:** Substituir promessa de leitura por
  origem honesta; decidir se automática/tácita permanece

  **Resposta do responsável:** A PREENCHER

- **ID:** SCI-003

  **Origem AS_IS:** read de WhatsApp correlacionado

  **Proposta para avaliar, não aprovada:** Preferir evidência de transporte
  separada; manter canal deferido; decidir admissibilidade futura

  **Resposta do responsável:** A PREENCHER

- **ID:** SCI-004

  **Origem AS_IS:** Confirmação WhatsApp por desafio

  **Proposta para avaliar, não aprovada:** Conservar correlação pessoal;
  decidir equivalência com ciência manual, sem habilitar canal agora

  **Resposta do responsável:** A PREENCHER

- **ID:** SCI-005

  **Origem AS_IS:** Expedição ENT vinculada gera ciência REQ

  **Proposta para avaliar, não aprovada:** Decidir se expedir é origem
  admissível de ciência informativa; nunca recebimento

  **Resposta do responsável:** A PREENCHER

<!-- c-table:end -->

O responsável pode responder: `SCI-001: manual e diálogo, nunca tácita`;
`SCI-002: excluir origem automática`; ou `SCI-005: manter com condições...`.
Precisamos de modalidade admissível, exclusões, regra por perfil/tipo,
vigência e responsável/data. As opções candidatas do CSV não significam que
uma origem de transporte se tornará manual sem outro contrato: a nova
declaração manual teria origem própria. Excluir uma origem futura não apaga
eventos históricos. Não ativar tácita antes da tabela aprovada.

## Regras que permanecem mesmo depois da resposta

- Abertura efetiva tem trilha própria; acesso não implica ciência ou leitura.

- Diálogo antes do conteúdo não comprova leitura integral. Cancelar não
  registra ciência; reabrir não duplica evento já válido.

- Tácita exige preferência anterior, política/tipo aprovados, elegibilidade e
  origem explícita. Não atribuir ciência retroativa à pessoa vinculada depois.

- Mudança de preferência vale prospectivamente; guarda-se a regra usada.

- Recebimento ENT, contagem/revisão BAL, compra, decisão administrativa,
  assinatura, divergência e transferência física são atos próprios expressos.

- `any`, `all` e `scienceRequired=false` são governança agregada. True por
  desobrigação não é evento de ciência de cada pessoa. Aprovar vigência e
  responsabilidade sem transformar retorno booleano em declaração pessoal.

- AS_IS possui unicidade REQ/pessoa; a D deve definir validade por versão
  relevante sem reescrever eventos anteriores nem disparar ciência a cada
  abertura. Mudança material de conteúdo exige regra explícita, não suposição.

## Catálogo legível completo

Cada linha traz classe, ator, efeito e fonte verificável. Contratos futuros
estão rotulados, inclusive a trilha geral document_opened, que não foi
encontrada como fato geral implementado. O CSV conserva os campos de resposta.

### SCI-001 — Ciência expressa no aplicativo

Área: REQ. Classe: `SCIENCE`. Estado: `OWNER_REVIEW_REQUIRED`.

Ator: Admin/familiar ou pessoa explicitamente elegível na policy da emissão,
com req.science e vínculo ativo; any/all não muda identidade. Condição: REQ
não histórica/não arquivada/não cancelada; versão esperada atual; sem evento
anterior da pessoa.

Efeito: requisition_science_events; req.science_recorded/satisfied; versão
documental avança; sem estoque. Fonte:
`supabase/migrations/20261023032906_v4_requisition_science_and_lifecycle.sql:89`.

### SCI-002 — Ciência automática por exibição no aplicativo

Área: REQ. Classe: `SCIENCE`. Estado: `OWNER_REVIEW_REQUIRED`.

Ator: Admin/familiar ou pessoa explicitamente elegível na policy da emissão,
com req.science e vínculo ativo; any/all não muda identidade. Condição: REQ
vigente; scienceAutomatic da policy e preferência; versão atual; pessoa sem
ciência.

Efeito: Mesmo registro único por REQ/pessoa, mode app_visible; não há trilha
geral de acesso independente comprovada. Fonte:
`src/components/requisitions/requisition-detail.tsx:153`.

### SCI-003 — Ciência derivada de read correlacionado

Área: REQ/WhatsApp. Classe: `SCIENCE`. Estado: `OWNER_REVIEW_REQUIRED`.

Ator: Admin/familiar ou pessoa explicitamente elegível na policy da emissão,
com req.science e vínculo ativo; any/all não muda identidade. Condição:
Notificação/telefone confirmado/template correlacionados; scienceAutomatic em
policy/preferência; canal deferido.

Efeito: record_science whatsapp_read com
referência/notificação/evento/template; transport read separado da declaração
manual. Fonte:
`supabase/migrations/20261023040129_v4_meta_registry_and_verified_actions.sql:131`.

### SCI-004 — Confirmação de ciência por desafio

Área: REQ/WhatsApp. Classe: `SCIENCE`. Estado: `OWNER_REVIEW_REQUIRED`.

Ator: Admin/familiar ou pessoa explicitamente elegível na policy da emissão,
com req.science e vínculo ativo; any/all não muda identidade. Condição:
Telefone Auth confirmado, token único, versão/prazo/vínculo vigentes,
scienceWhatsApp; canal deferido.

Efeito: record_science whatsapp_confirm e desafio usado; inbound deduplicado;
sem aceite físico. Fonte:
`supabase/migrations/20261023040129_v4_meta_registry_and_verified_actions.sql:111`.

### SCI-005 — Ciência derivada da expedição

Área: REQ vinculada a ENT. Classe: `SCIENCE`. Estado: `OWNER_REVIEW_REQUIRED`.

Ator: Admin/familiar ou pessoa explicitamente elegível na policy da emissão,
com req.science e vínculo ativo; any/all não muda identidade; precisa ser
emissor da ENT. Condição: ENT pending_receipt; scienceByDispatch; emissor
elegível; REQ vinculada.

Efeito: record_science dispatch com deliveryId/version/session; atendimento
REQ continua dependendo de aceite positivo. Fonte:
`supabase/migrations/20261023032906_v4_requisition_science_and_lifecycle.sql:14`.

### ACT-001 — Ciência satisfeita any/all/desobrigada

Área: REQ. Classe: `DERIVED_STATE`. Estado: `OWNER_REVIEW_REQUIRED_ANY_ALL`.

Ator: Admin/familiar ou pessoa explicitamente elegível na policy da emissão,
com req.science e vínculo ativo; any/all não muda identidade. Condição:
eligible_users e policy fixados na emissão.

Efeito: science_satisfied retorna boolean; pode ser true por ciência não
exigida sem evento pessoal. Fonte:
`supabase/migrations/20261023032906_v4_requisition_science_and_lifecycle.sql:43`.

### ACT-002 — Enviar/emitir ficha

Área: COM/ENT/BAL. Classe: `MATERIAL_ACT`. Estado:
`NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Autor competente com versão atual. Condição:
Documento/linha/versão/estado vigente.

Efeito: Ato oficial; protocolo/evento; efeito de estoque apenas conforme tipo.
Fonte: `src/lib/validation/documents.ts:85`.

### ACT-003 — Aprovar aquisição

Área: COM. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Aprovador familiar/admin competente. Condição:
Documento/linha/versão/estado vigente.

Efeito: Aprova quantidade; não compra nem credita. Fonte:
`src/lib/validation/documents.ts:86`.

### ACT-004 — Registrar aquisição

Área: COM. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Responsável autorizado à compra/doação. Condição:
Documento/linha/versão/estado vigente.

Efeito: Quantidade adquirida; não valida chegada. Fonte:
`src/lib/validation/documents.ts:27`.

### ACT-005 — Informar chegada de parcela

Área: COM. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Familiar autorizado declarante. Condição: Documento/linha/versão/estado
vigente.

Efeito: purchase_receipt própria; nenhum crédito antes da validação. Fonte:
`src/lib/validation/documents.ts:88`.

### ACT-006 — Validar parcela física

Área: COM. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Validador autorizado. Condição: Documento/linha/versão/estado vigente.

Efeito: Crédito FAMILY único por receiptId; decisão material. Fonte:
`src/lib/validation/documents.ts:89`.

### ACT-007 — Rejeitar parcela

Área: COM. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Validador autorizado com motivo. Condição: Documento/linha/versão/estado
vigente.

Efeito: Parcela rejeitada preservada; zero crédito. Fonte:
`src/lib/validation/documents.ts:90`.

### ACT-008 — Confirmar recebimento integral

Área: ENT. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Somente recebedor designado que recebeu fisicamente. Condição:
Documento/linha/versão/estado vigente.

Efeito: Aceite pessoal e crédito do destino uma vez. Fonte:
`src/lib/validation/documents.ts:88`.

### ACT-009 — Manifestar divergência/aceite parcial

Área: ENT. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Recebedor designado pessoalmente. Condição:
Documento/linha/versão/estado vigente.

Efeito: Quantidade aceita/zero, nota e restante em trânsito; sem delegação.
Fonte: `src/lib/validation/documents.ts:88`.

### ACT-010 — Resolver diferença received/returned/missing

Área: ENT. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Responsável competente pelo fato/linha. Condição:
Documento/linha/versão/estado vigente.

Efeito: Conciliação de custódia distinta de ciência; não imputa assinatura
alheia. Fonte: `src/lib/validation/documents.ts:92`.

### ACT-011 — Pedir cancelamento

Área: ENT. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Emissor/competente segundo estado. Condição:
Documento/linha/versão/estado vigente.

Efeito: Intenção material; após aceite não estorna sozinha. Fonte:
`src/lib/validation/documents.ts:93`.

### ACT-012 — Consentir cancelamento/devolução/consumo

Área: ENT. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Recebedor competente com fato físico e motivo. Condição:
Documento/linha/versão/estado vigente.

Efeito: Conciliação material; consumo anterior não é debitado outra vez.
Fonte: `src/lib/validation/documents.ts:94`.

### ACT-013 — Redesignar recebedor futuro

Área: ENT. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Emissor/gestor competente antes do fato, conforme estado. Condição:
Documento/linha/versão/estado vigente.

Efeito: Muda responsabilidade futura; não autoria passada. Fonte:
`src/lib/validation/documents.ts:91`.

### ACT-014 — Revisão familiar iniciada

Área: BAL. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Familiar/admin legítimo distinto do contador efetivo. Condição:
Documento/linha/versão/estado vigente.

Efeito: Revisão explícita da count_version; facultativa P11. Fonte:
`src/lib/validation/documents.ts:86`.

### ACT-015 — Revisão de supervisão iniciada

Área: BAL. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Supervisor elegível distinto do contador efetivo. Condição:
Documento/linha/versão/estado vigente.

Efeito: Revisão própria quando ativada; não exige supervisão no primeiro uso.
Fonte: `src/lib/validation/documents.ts:86`.

### ACT-016 — Confirmar contagem física

Área: BAL. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Contador designado/legítimo. Condição: Documento/linha/versão/estado
vigente.

Efeito: Contagem oficial; aplicação explícita conforme política, não
ciência/consumo. Fonte: `src/lib/validation/documents.ts:85`.

### ACT-017 — Solicitar adiamento BAL

Área: BAL. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Profissional designado. Condição: Ciclo/atribuição/política vigentes.

Efeito: Proposta não muda prazo até decisão familiar. Fonte:
`src/lib/validation/balances.ts:6`.

### ACT-018 — Decidir adiamento BAL

Área: BAL. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Família/admin autorizado. Condição: Ciclo/atribuição/política vigentes.

Efeito: Decisão de prazo/versionamento; não ciência. Fonte:
`src/lib/validation/balances.ts:7`.

### ACT-019 — Designar reconto BAL

Área: BAL. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Designador competente. Condição: Ciclo/atribuição/política vigentes.

Efeito: Nova atribuição com contadora própria; preserva original. Fonte:
`src/lib/validation/balances.ts:8`.

### ACT-020 — Configurar regime BAL

Área: BAL. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Família/admin autorizado. Condição: Ciclo/atribuição/política vigentes.

Efeito: Regime/versão/intervalo; não produz contagem retroativa. Fonte:
`src/lib/validation/balances.ts:4`.

### ACT-021 — Propor/publicar série

Área: ESC. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Gestor/proponente/aprovador conforme capacidade e tipo de proposta.
Condição: Série/plantão e versão vigentes.

Efeito: Agenda prevista, nunca presença. Fonte:
`src/lib/validation/schedules.ts:9`.

### ACT-022 — Aprovar proposta de escala

Área: ESC. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Gestor/proponente/aprovador conforme capacidade e tipo de proposta.
Condição: Série/plantão e versão vigentes.

Efeito: Decisão de pessoa/intervalo/efeito BAL. Fonte:
`src/lib/validation/schedules.ts:10`.

### ACT-023 — Rejeitar proposta de escala

Área: ESC. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Gestor/proponente/aprovador conforme capacidade e tipo de proposta.
Condição: Série/plantão e versão vigentes.

Efeito: Mantém programação anterior e evento de recusa. Fonte:
`src/lib/validation/schedules.ts:10`.

### ACT-024 — Encerrar série

Área: ESC. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Gestor/proponente/aprovador conforme capacidade e tipo de proposta.
Condição: Série/plantão e versão vigentes.

Efeito: Corte explícito sem reescrever fatos passados. Fonte:
`src/lib/validation/schedules.ts:11`.

### ACT-025 — Alterar/substituir profissional de plantão

Área: ESC. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Gestor/proponente/aprovador conforme capacidade e tipo de proposta.
Condição: Série/plantão e versão vigentes.

Efeito: Nova responsabilidade futura; não recebimento físico. Fonte:
`src/lib/validation/schedules.ts:12`.

### ACT-036 — Propor alteração pontual

Área: ESC. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Gestor/proponente/aprovador conforme capacidade e tipo de proposta.
Condição: Série/plantão e versão vigentes.

Efeito: Intenção pendente, sem publicar mudança. Fonte:
`src/lib/validation/schedules.ts:12`.

### ACT-037 — Decidir alteração pontual

Área: ESC. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Gestor/proponente/aprovador conforme capacidade e tipo de proposta.
Condição: Série/plantão e versão vigentes.

Efeito: Aprovação/recusa expressa do antes/depois e efeito BAL. Fonte:
`src/lib/validation/schedules.ts:14`.

### ACT-038 — Cancelar ocorrência

Área: ESC. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Gestor/proponente/aprovador conforme capacidade e tipo de proposta.
Condição: Série/plantão e versão vigentes.

Efeito: Cancela programação com motivo, preservando fato anterior. Fonte:
`src/lib/validation/schedules.ts:13`.

### ACT-039 — Configurar tipo de plantão

Área: ESC. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Gestor/proponente/aprovador conforme capacidade e tipo de proposta.
Condição: Série/plantão e versão vigentes.

Efeito: Padrão de horário/duração; não declaração de comparecimento. Fonte:
`src/lib/validation/schedules.ts:8`.

### ACT-026 — Aceitar convite

Área: ID. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Titular de e-mail confirmado. Condição: Estado/versão/propósito do
próprio domínio.

Efeito: Membership pessoal; não ciência tácita. Fonte:
`src/app/api/invitations/accept/route.ts:20`.

### ACT-027 — Aprovar proposta de acesso

Área: ID. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Outra identidade administradora local elegível. Condição:
Estado/versão/propósito do próprio domínio.

Efeito: Decisão de capacidade/versionamento; não mera abertura. Fonte:
`src/components/admin/policy-console.tsx:340`.

### ACT-028 — Revogar vínculo

Área: ID. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Admin autorizado do paciente. Condição: Estado/versão/propósito do
próprio domínio.

Efeito: Recusa novas ações; não apaga autoria ou prova. Fonte:
`src/components/admin/membership-management.tsx:19`.

### ACT-029 — Relatar falta/consumo

Área: CON. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Relator autorizado. Condição: Estado/versão/propósito do próprio
domínio.

Efeito: Relato sem débito ou prova automática de fato. Fonte:
`src/app/api/consumption/route.ts:55`.

### ACT-030 — Confirmar/rejeitar consumo

Área: CON. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Confirmador competente da custódia. Condição: Estado/versão/propósito do
próprio domínio.

Efeito: Decisão explícita; consumo confirmado pode debitar uma vez. Fonte:
`src/app/api/consumption/route.ts:61`.

### ACT-031 — Revisar submissão Flow

Área: CON/Flow. Classe: `MATERIAL_ACT`. Estado:
`NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Autor autenticado e capacidade própria. Condição:
Estado/versão/propósito do próprio domínio.

Efeito: Revisão de sugestão; não ledger automático; canal deferido. Fonte:
`src/components/stock/flow-reviews.tsx:40`.

### ACT-032 — Declarar sem ocorrências

Área: NOT. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Destinatário do desafio confirmado. Condição: Estado/versão/propósito do
próprio domínio.

Efeito: Resolve lembrete; AS_IS também marca seen_at; não prova plantão ou
leitura no app. Fonte:
`supabase/migrations/20261023044520_v4_event_routing_and_scheduled_reminders.sql:154`.

### ACT-033 — Entrada/retirada/correção familiar

Área: EST. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Ator autorizado na custódia. Condição: Estado/versão/propósito do
próprio domínio.

Efeito: Ledger motivado/compensatório, não transferência fictícia. Fonte:
`src/app/api/stock/movements/route.ts:71`.

### ACT-034 — Inativar material com saldo

Área: CAT. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Gestor do catálogo local. Condição: Estado/versão/propósito do próprio
domínio.

Efeito: Flag não movimenta; conservação do saldo. Fonte:
`src/components/admin/catalogue-management.tsx:26`.

### ACT-035 — Consentir telefone/MFA/contato

Área: ID. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Titular reautenticado. Condição: Estado/versão/propósito do próprio
domínio.

Efeito: Posse/contato via Auth; não ciência de documento. Fonte:
`src/components/auth/contact-settings.tsx:29`.

### ACT-040 — Emitir requisição

Área: REQ. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Profissional/autor com capacidade REQ. Condição: Paciente e intenção
válidos.

Efeito: Protocolo e snapshot oficiais; nenhuma quantidade solicitada. Fonte:
`src/app/api/requisitions/route.ts:87`.

### ACT-041 — Arquivar manualmente

Área: REQ. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Admin local com req.archive. Condição: REQ e condições de arquivamento
válidas.

Efeito: Arquivamento não cria ciência retroativa. Fonte:
`src/app/api/requisitions/[id]/archive/route.ts:34`.

### ACT-042 — Alterar etapa/cancelar REQ

Área: REQ. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Ator com capacidade e versão/contexto válidos. Condição: REQ existente.

Efeito: Estado administrativo não representa compra/recebimento. Fonte:
`src/app/api/requisitions/[id]/status/route.ts:39`.

### ACT-043 — Resolver cobertura ambígua

Área: BAL. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Família/designador autorizado. Condição: Ciclo e plantão vigentes.

Efeito: Define contador legítimo, não faz contagem por ele. Fonte:
`src/lib/validation/balances.ts:9`.

### ACT-044 — Atualizar processamento do regime

Área: BAL. Classe: `AUTOMATION_NOT_SCIENCE`. Estado:
`NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Ator autorizado ao regime. Condição: Política vigente.

Efeito: Atualiza obrigações/atribuições, não confirma físico. Fonte:
`src/lib/validation/balances.ts:5`.

### ACT-045 — Cancelar aquisição sem apagar fato físico

Área: COM. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Ator autorizado. Condição: Estado compatível e motivo.

Efeito: Cancelamento não elimina parcela validada. Fonte:
`src/lib/validation/documents.ts:93`.

### ACT-046 — Revisar edição/reconto

Área: BAL. Classe: `MATERIAL_ACT`. Estado: `NOT_CONFIGURABLE_PERSONAL_ACT`.

Ator: Contador autorizado/designado. Condição: Versão e janela revalidadas.

Efeito: Nova contagem/versionamento; nenhum autosave oficial tácito. Fonte:
`src/app/api/documents/[id]/revise/route.ts:22`.

### OBS-001 — Marcar aviso visto

Área: NOT. Classe: `OBSERVATION_NOT_SCIENCE`. Estado: `NOT_A_SCIENCE_MODE`.

Ator: Ator autorizado ou serviço correlacionado. Condição:
Recurso/versionamento autorizados.

Efeito: seen_at do destinatário; não leitura integral nem ciência REQ. Fonte:
`supabase/migrations/20261022043228_communications_attachments.sql:49`.

### OBS-002 — accepted/delivered/read externo

Área: NOT. Classe: `OBSERVATION_NOT_SCIENCE`. Estado: `NOT_A_SCIENCE_MODE`.

Ator: Ator autorizado ou serviço correlacionado. Condição:
Recurso/versionamento autorizados.

Efeito: Estado do transporte; só mapeamento correlacionado SCI-003 cria
ciência no AS_IS. Fonte:
`supabase/migrations/20261023040129_v4_meta_registry_and_verified_actions.sql:124`.

### OBS-003 — Baixar PDF autorizado

Área: DOC. Classe: `OBSERVATION_NOT_SCIENCE`. Estado: `NOT_A_SCIENCE_MODE`.

Ator: Ator autorizado ou serviço correlacionado. Condição:
Recurso/versionamento autorizados.

Efeito: Entrega de bytes; não recebimento de materiais/assinatura pessoal.
Fonte: `src/lib/server/document-pdf.ts:28`.

### OBS-004 — Visualização do cabeçalho

Área: REQ. Classe: `OBSERVATION_NOT_SCIENCE`. Estado: `NOT_A_SCIENCE_MODE`.

Ator: Ator autorizado ou serviço correlacionado. Condição:
Recurso/versionamento autorizados.

Efeito: Sinal visual parcial; ciência automática é SCI-002 e não prova
leitura. Fonte: `src/components/requisitions/requisition-detail.tsx:142`.

### OBS-005 — Autosave local REQ

Área: ARQ. Classe: `OBSERVATION_NOT_SCIENCE`. Estado: `NOT_A_SCIENCE_MODE`.

Ator: Ator autorizado ou serviço correlacionado. Condição:
Recurso/versionamento autorizados.

Efeito: Preenchimento transitório; não emissão oficial. Fonte:
`src/components/requisitions/requisition-wizard.tsx:78`.

### OBS-006 — Hash/verificação pública

Área: DOC. Classe: `OBSERVATION_NOT_SCIENCE`. Estado: `NOT_A_SCIENCE_MODE`.

Ator: Ator autorizado ou serviço correlacionado. Condição:
Recurso/versionamento autorizados.

Efeito: Consulta mínima de integridade; não fato físico ou ciência. Fonte:
`src/app/verificar/[id]/page.tsx:5`.

### OBS-007 — Ciência registrada/satisfeita no evento

Área: REQ. Classe: `OBSERVATION_NOT_SCIENCE`. Estado: `NOT_A_SCIENCE_MODE`.

Ator: Ator autorizado ou serviço correlacionado. Condição:
Recurso/versionamento autorizados.

Efeito: Evento derivado do registro de ciência, sem novo declarante
independente. Fonte:
`supabase/migrations/20261023073958_v4_verification_corrections.sql:12`.

### OBS-008 — Arquivamento automático

Área: REQ. Classe: `OBSERVATION_NOT_SCIENCE`. Estado: `NOT_A_SCIENCE_MODE`.

Ator: Ator autorizado ou serviço correlacionado. Condição:
Recurso/versionamento autorizados.

Efeito: Estado de ciclo por policy; não declaração pessoal de ciência. Fonte:
`supabase/migrations/20261023073958_v4_verification_corrections.sql:327`.

### FUT-001 — Registro independente de abertura efetiva

Área: DOC. Classe: `FUTURE_REQUIREMENT`. Estado:
`OWNER_APPROVED_PURPOSE_NOT_IMPLEMENTED`.

Ator: Capacidade do usuário e paciente revalidada. Condição:
TO_BE_NOT_IMPLEMENTED.

Efeito: Cada acesso autorizado real; não existe document_opened geral
comprovado. Fonte:
`docs/audits/C/C3-functional-specification/SCREEN_FIELD_ACTION_INVENTORY.csv`.

### FUT-002 — Diálogo na primeira abertura

Área: REQ. Classe: `FUTURE_REQUIREMENT`. Estado: `PENDING_OWNER`.

Ator: Capacidade do usuário e paciente revalidada. Condição:
TO_BE_NOT_IMPLEMENTED.

Efeito: Antes da exibição: escolha explícita, cancelar não gera ciência;
modalidade depende de P02. Fonte:
`docs/audits/C/C3-functional-specification/SCREEN_FIELD_ACTION_INVENTORY.csv`.

### FUT-003 — Ciência informativa genérica fora de REQ

Área: COM/ENT/BAL/aviso. Classe: `FUTURE_REQUIREMENT`. Estado:
`PENDING_OWNER`.

Ator: Capacidade do usuário e paciente revalidada. Condição:
TO_BE_NOT_IMPLEMENTED.

Efeito: Nenhum armazenamento autônomo de ciência COM/ENT/BAL foi comprovado;
inventariar futura necessidade por tipo antes de adicionar. Fonte:
`docs/audits/C/C3-functional-specification/SCREEN_FIELD_ACTION_INVENTORY.csv`.

### FUT-004 — Assinatura criptográfica do sistema

Área: DOC. Classe: `FUTURE_REQUIREMENT`. Estado:
`OWNER_APPROVED_PURPOSE_NOT_IMPLEMENTED`.

Ator: Capacidade do usuário e paciente revalidada. Condição:
TO_BE_NOT_IMPLEMENTED.

Efeito: Nova emissão P09 obrigatória; não assinatura pessoal ou ciência
tácita. Fonte:
`docs/audits/C/C3-functional-specification/SCREEN_FIELD_ACTION_INVENTORY.csv`.

### FUT-005 — Save/descarte de draft privado servidor

Área: ARQ. Classe: `FUTURE_REQUIREMENT`. Estado:
`OWNER_APPROVED_PURPOSE_NOT_IMPLEMENTED`.

Ator: Capacidade do usuário e paciente revalidada. Condição:
TO_BE_NOT_IMPLEMENTED.

Efeito: Objeto não oficial; sem protocolo/ledger/PDF/ciência. Fonte:
`docs/audits/C/C3-functional-specification/SCREEN_FIELD_ACTION_INVENTORY.csv`.

### FUT-006 — Opt-in Web Push por aparelho

Área: NOT. Classe: `FUTURE_REQUIREMENT`. Estado:
`OWNER_APPROVED_PURPOSE_NOT_IMPLEMENTED`.

Ator: Capacidade do usuário e paciente revalidada. Condição:
TO_BE_NOT_IMPLEMENTED.

Efeito: Permissão de transporte específica; não aceita ato material. Fonte:
`docs/audits/C/C3-functional-specification/SCREEN_FIELD_ACTION_INVENTORY.csv`.

### FUT-007 — Transferência bilateral simplificada

Área: EST/ENT. Classe: `FUTURE_REQUIREMENT`. Estado:
`OWNER_APPROVED_PURPOSE_NOT_IMPLEMENTED`.

Ator: Capacidade do usuário e paciente revalidada. Condição:
TO_BE_NOT_IMPLEMENTED.

Efeito: Declaração da contraparte e aceite físico separados quando pessoas
diferentes; sem nova ciência tácita. Fonte:
`docs/audits/C/C3-functional-specification/SCREEN_FIELD_ACTION_INVENTORY.csv`.
