/* INITIAL B2.1 generator, retained as method. It imports the initial inventory
 * generator and rewrites files. Do not run against final reconciled evidence. */
import { csv } from './build-inventory.mjs';
const raw = `
T001|P-ACC-01|anônimo|autenticado|login|Titular|Credencial e conta válida|LEGITIMA|Sessão Auth;nenhum vínculo concedido|API Auth;docs/SECURITY.md
T002|P-ACC-02|autenticado|contexto paciente|select_active_context|Titular|Membership ativo e sessão válida|CONDICIONAL|Autoridade da sessão;nenhum saldo|private.authority_sessions
T003|P-ACC-02|global|operação local sem vínculo|comando operacional|Global|Ausência de vínculo local|PROIBIDA|Nenhum efeito|private.can
T004|P-ACC-03|paciente ausente|ativo com admin|create_patient_with_administrator|Global|Identidade confirmada explícita|CONDICIONAL|Paciente e admin inicial|evidence/contracts/create_patient_with_administrator.sql
T005|P-ACC-04|convite pendente|revogado/rotacionado|revoke/resend|Admin local|Autoridade atual do emissor|LEGITIMA|Token antigo inválido|/api/admin
T006|P-ACC-05|convite válido|vínculo ativo|accept_invitation|Titular|Email confirmado correspondente;prazo;emissor|CONDICIONAL|Membership e história|/api/invitations/accept
T007|P-ACC-05|convite revogado|vínculo ativo|accept_invitation|Titular|Convite inválido|PROIBIDA|Nenhum vínculo|/api/invitations/accept
T008|P-ACC-06|política vigente|nova política local|configure_patient_access|Admin local|Versão atual e escopo|CONDICIONAL|Mudança e história|/api/patient-settings
T009|P-ACC-08|proposta global|aplicada|approve|Outro admin local|Identidade distinta e versão|CONDICIONAL|Aplicação autorizada|/api/patient-settings
T010|P-ACC-07|último admin ativo|revogado|membershipStatus|Admin|Último administrador|PROIBIDA|História e autoridade preservadas|/api/admin
T011|P-CAT-01|ativo|inativo|admin_upsert_recipient_product|Admin catálogo|Escopo e produto válidos|LEGITIMA|Identidade e saldos antigos preservados|evidence/contracts/admin_upsert_recipient_product.sql
T012|P-CAT-02|unidade com histórico|unidade reinterpretada|configure_catalogue_unit|Admin catálogo|Histórico existente|PROIBIDA|Nenhuma reinterpretação|evidence/contracts/configure_catalogue_unit.sql
T013|P-CAT-03|código desconhecido|produto presumido|scanner|Operador|Equivalência não cadastrada|PROIBIDA|Nenhum cadastro ou saldo presumido|supply-wizard.tsx
T014|P-REQ-01|editando|rascunho local|autosave|Emissor|Mesma identidade/paciente/aba|LEGITIMA|Sem emissão/ledger;prazo24h|requisition-wizard.tsx
T015|P-REQ-03|revisada|submitted|submit_requisition|req.create|Itens;catálogo ativo;observação;chave|CONDICIONAL|REQ;protocolo;snapshot;evento|evidence/contracts/submit_requisition.sql
T016|P-REQ-02|produto já pendente|nova REQ|submit_requisition|Emissor|Justificativa mínima de repetição|CONDICIONAL|Nova necessidade com contexto|evidence/contracts/submit_requisition.sql
T017|P-REQ-02|extra textual|identificação no catálogo|resolve|Admin autorizado|Produto correspondente;motivo|CONDICIONAL|Resolução imutável e nova versão|/api/requisitions/:id/resolve
T018|P-REQ-04|ciência pendente|ciência satisfeita|acknowledge|Familiar elegível|Modalidade e versão|CONDICIONAL|Evento de ciência;sem ledger|/api/requisitions/:id/science
T019|P-REQ-05|não atendida|linha atendida|ENT aceite positivo|Destinatário|Vínculo explícito com produto/paciente|CONDICIONAL|REQ nova versão;crédito físico único|evidence/contracts/requisition_fulfillment.sql
T020|P-REQ-05|não atendida|atendida por COM|purchase|Comprador|Aquisição não é ENT aceita|PROIBIDA|Nenhum atendimento REQ|evidence/contracts/requisition_fulfillment.sql
T021|P-REQ-06|aberta sem ENT|cancelled|transition_requisition_status|req.review|Motivo e sem entrega vinculada ativa|CONDICIONAL|Cancelamento;sem apagar eventos|evidence/contracts/transition_requisition_status.sql
T022|P-REQ-06|aberta com ENT|cancelled|transition_requisition_status|req.review|Resolver ENT primeiro|PROIBIDA|Documento e ledger permanecem|evidence/contracts/transition_requisition_status.sql
T023|P-REQ-06|concluída|archived|archive_requisition|Admin local/automação elegível|Ciência/política/motivo conforme exceção|CONDICIONAL|Arquivo;história conservada|/api/requisitions/:id/archive
T024|P-COM-01|draft|approved/pending_approval|submit|com.create|Admin local autoaprova;demais aguardam|CONDICIONAL|Emissão;sem saldo|evidence/contracts/v3_create_supply_document.sql
T025|P-COM-02|pending_approval|approved/partially_approved/rejected|approve|com.approve|Todas linhas;limites;motivo se redução|CONDICIONAL|approved_quantity;evento|evidence/contracts/audited_legacy_supply_command.sql
T026|P-COM-03|approved/partially_approved|purchasing/purchased|purchase|com.purchase|Incremento positivo até aprovado|CONDICIONAL|purchased_quantity;sem saldo|evidence/contracts/audited_legacy_supply_command.sql
T027|P-COM-04|purchasing/purchased|receipt pending|receive|com.receive|Não exceder adquirido menos aceito|CONDICIONAL|Receipt;sem crédito até validar|evidence/contracts/audited_legacy_supply_command.sql
T028|P-COM-04|receipt pending|receipt approved;partially_received/received|validate_receipt|com.validate|Versão e recibo ainda pendente|CONDICIONAL|Crédito FAMILY uma vez|private.validate_purchase_receipt
T029|P-COM-04|receipt pending|receipt rejected|reject_receipt|Validador|Motivo|LEGITIMA|Nenhum crédito|private.validate_purchase_receipt
T030|P-COM-05|sem adquirido/aceito|cancelled|cancel|com.approve|Motivo;nenhum fato físico posterior|CONDICIONAL|História sem estorno|evidence/contracts/audited_legacy_supply_command.sql
T031|P-COM-05|adquirida parcial|desistência formal do restante|encerrar saldo|Família|Capacidade não localizada|NAO_EXISTENTE|Não inventar estoque/devolução|supply-command-editor.tsx
T032|P-ENT-01|draft|pending_receipt|submit|ent.create|Saldo;destinatário ativo distinto|CONDICIONAL|Origem→TRANSIT|evidence/contracts/v3_create_supply_document.sql
T033|P-ENT-03|pending_receipt|confirmed|receive divergences=[]|Destinatário exato|Versão e autorização|CONDICIONAL|TRANSIT→destino;REQ aceita|evidence/contracts/audited_legacy_supply_command.sql
T034|P-ENT-03|pending_receipt|disputed|receive divergences|Destinatário exato|Aceites0..expedido;exceções explícitas|CONDICIONAL|Crédito só aceito;resto trânsito|evidence/contracts/audited_legacy_supply_command.sql
T035|P-ENT-03|pending_receipt|confirmed por terceiro|receive|Outro membro|Não é destinatário|PROIBIDA|Sem movimento|evidence/contracts/audited_legacy_supply_command.sql
T036|P-ENT-04|disputed|disputed/confirmed|resolve received|Destinatário|Quantidade pendente e motivo|CONDICIONAL|TRANSIT→destino e aceite acrescido|evidence/contracts/audited_legacy_supply_command.sql
T037|P-ENT-04|disputed|disputed/confirmed|resolve returned|Destinatário/admin|Devolução física e motivo|CONDICIONAL|TRANSIT→origem|evidence/contracts/audited_legacy_supply_command.sql
T038|P-ENT-04|disputed|disputed/confirmed|resolve missing|Destinatário/admin|Perda real e motivo|CONDICIONAL|TRANSIT→saída;sem destino|evidence/contracts/audited_legacy_supply_command.sql
T039|P-ENT-05|pending_receipt sem aceite|novo destinatário|reassign|Expedidor/admin|Pessoa elegível;versão;motivo|CONDICIONAL|Evento;desafio anterior inválido|evidence/contracts/audited_legacy_supply_command.sql
T040|P-ENT-05|aceite parcial existente|novo destinatário|reassign|Expedidor/admin|Estado já disputed|PROIBIDA|Aceite e responsabilidade original preservados|evidence/contracts/audited_legacy_supply_command.sql
T041|P-ENT-06|sem aceite|cancelled|cancel|Criador/admin|Motivo|CONDICIONAL|Trânsito restante→origem|evidence/contracts/audited_legacy_supply_command.sql
T042|P-ENT-06|aceite positivo|cancellation_pending|cancel|ent.cancel|Solicitação administrativa justificada|CONDICIONAL|Pedido;sem reversão ainda|evidence/contracts/audited_legacy_supply_command.sql
T043|P-ENT-06|cancellation_pending|cancelled|consent_cancel|Destinatário original|Aceito=devolvido+consumido real;saldo|CONDICIONAL|Reversão real;história preservada|evidence/contracts/audited_legacy_supply_command.sql
T044|P-ENT-06|cancellation_pending|solicitação recusada/retirada|reject/withdraw|Destinatário/solicitante|Comando não localizado|NAO_EXISTENTE|Sem mecanismo explícito de retirada|src/lib/validation/documents.ts
T045|P-STK-01|sem saldo|FAMILY positivo|inbound|stock.family.manage|Produto;quantidade;motivo;chave|CONDICIONAL|Entrada ledger|/api/stock/movements
T046|P-STK-02|FAMILY positivo|saldo reduzido|outbound|stock.family.manage|Disponível;motivo;chave|CONDICIONAL|Saída ledger|/api/stock/movements
T047|P-STK-03|movimento confirmado|compensação|correction_in/out|stock.family.manage|referenceId;motivo;saldo|CONDICIONAL|Novo movimento;original preservado|/api/stock/movements
T048|P-STK-04|saldo insuficiente|saldo negativo|movimentar|Qualquer membro|Quantidade maior que disponível|PROIBIDA|Rollback do movimento|private.move_stock
T049|P-STK-07|produto agregado|lote/validade rastreável|registrar lote|Família|Contrato por lote ausente|NAO_EXISTENTE|Anexo externo não é estoque por lote|schema/contratos atuais
T050|P-BAL-02|nunca ativado|regime ativo|configure|Família/admin local|Tipo;dia;fuso;início|CONDICIONAL|Obrigações a partir de ativação|evidence/contracts/balance_command.sql
T051|P-BAL-02|ativado|pausado|configure enabled=false|Família/admin local|Versão e motivo|LEGITIMA|Conserva obrigações e atrasos|evidence/contracts/balance_command.sql
T052|P-BAL-03|open sem cobertura|assignment ativo|refresh/assign|Scheduler/família|Plantão publicado;capacidade;janela|CONDICIONAL|Assignment/obligation;sem contagem|evidence/contracts/balance_command.sql
T053|P-BAL-04|atribuição elegível|draft/submitted|create BAL|Pessoa designada|Todas linhas ativas;referência atual|CONDICIONAL|Contagem e contexto do banco|evidence/contracts/create_supply_document.sql
T054|P-BAL-04|referência antiga|BAL aprovado|submit/approve|Contador/revisor|Ledger mudou|PROIBIDA|Reconto necessário;nenhum ajuste obsoleto|private.apply_bal
T055|P-BAL-05|submitted revisão required|confirmed|approve|Revisor distinto|Grupos configurados;versão;referência|CONDICIONAL|Ajuste de contagem na equipe|evidence/contracts/audited_legacy_supply_command.sql
T056|P-BAL-05|submitted|reconto|revise/assign_recount|Responsável formal|Nova referência;versão;atribuição|CONDICIONAL|Nova contagem conserva aprovações anteriores|evidence/contracts/revise_supply_document.sql
T057|P-BAL-05|contagem própria|aprovada pelo contador|approve|Contador original|Identidade não distinta|PROIBIDA|Sem autoaprovação de revisão|evidence/contracts/supply_document_command.sql
T058|P-BAL-06|assignment ativo|pedido pendente|request_deferral|Solicitante autorizado|Destino publicado;motivo|CONDICIONAL|Não muda prazo vigente|evidence/contracts/balance_command.sql
T059|P-BAL-06|pedido pendente|approved/rejected|decide_deferral|Família/admin local|Versões de origem/destino atuais|CONDICIONAL|Prazo efetivo/identidade ou conservação|evidence/contracts/balance_command.sql
T060|P-BAL-07|obrigações atrasadas|regularizadas|finish_bal_count|Contador real|Contagem atual concluída|CONDICIONAL|Data real e atraso original|private.finish_bal_count
T061|P-OCC-01|não relatado|pending|report|consumption.report|Texto;custódia;chave|CONDICIONAL|Relato sem débito|/api/consumption
T062|P-OCC-02|pending consumption|confirmed|confirm accept=true|Confirmador autorizado|Linhas/saldo/custódia válidos|CONDICIONAL|Débito ledger uma vez|/api/consumption
T063|P-OCC-02|pending|rejected|confirm accept=false|Confirmador autorizado|Estado pendente|LEGITIMA|Nenhum débito|/api/consumption
T064|P-OCC-01|pending shortage|confirmed|confirm|Confirmador autorizado|Falta relatada|CONDICIONAL|Confirma relato;sem saída por consumo|/api/consumption
T065|P-OCC-03|suggested|relato pending|accept suggestion|Autor autenticado|Sessão/propósito/prazo/revisão|CONDICIONAL|Relato;nenhum débito direto|/api/whatsapp/flows/submissions
T066|P-SCH-02|sem série|proposed/published|series|Proponente/gestor|Tipo;profissional;validade;intervalos|CONDICIONAL|Ocorrências materializadas|evidence/contracts/schedule_command.sql
T067|P-SCH-03|proposed|published/rejected|approve/reject|Gestor|Versão;motivo de rejeição|CONDICIONAL|Estado de todas ocorrências|evidence/contracts/schedule_command.sql
T068|P-SCH-03|proposed/published|ended_on e ocorrências canceladas|end_series|Gestor|Corte;motivo;versão|CONDICIONAL|Corte por data no fuso|evidence/contracts/schedule_command.sql
T069|P-SCH-03|proposed já encerrada|published após cutoff|approve|Gestor|Ramo pode republicar canceladas|CONDICIONAL|RISCO A-DB-003;reprodução pendente|evidence/contracts/schedule_command.sql
T070|P-SCH-04|published|proposal pending|propose_change|schedule.propose|Versão;intervalos;motivo|CONDICIONAL|Sem mudança da ocorrência|evidence/contracts/schedule_command.sql
T071|P-SCH-04|proposal pending|approved/rejected|decide_change|schedule.manage.team|Versão da ocorrência no aceite|CONDICIONAL|Muda agenda ou mantém|evidence/contracts/schedule_command.sql
T072|P-SCH-05|published|exceção/substituição|change|Gestor autorizado|Intervalo;capacidade;sem overlap|CONDICIONAL|Ocorrência e possível assignment BAL|evidence/contracts/schedule_command.sql
T073|P-SCH-05|janela BAL vigente|horário deslocado sem decisão|change/cancel|Gestor|Exige adiamento familiar primeiro|PROIBIDA|Sem deslocar prazo por agenda|docs/ui-ux/BALANCES.md
T074|P-SCH-02|agenda já ocupada|plantão sobreposto|series/change|Gestor|Mesmo profissional entre pacientes|PROIBIDA|Rollback;sem revelar outro paciente|evidence/contracts/schedule_command.sql
T075|P-SCH-06|plantão publicado|presença comprovada|check-in|Profissional|Não implementado|NAO_EXISTENTE|Publicação não prova comparecimento|docs/ui-ux/SCHEDULES.md
T076|P-DOC-01|versão vigente|nova versão|comando autorizado|Autor competente|expectedVersion;chave;invariantes|CONDICIONAL|Evento e hash novo;antigo preservado|document_events
T077|P-DOC-01|versão antiga|comando aplicado|comando novo|Autor competente|Versão não atual|PROIBIDA|Nenhum fato sobrescrito|/api/documents/:id
T078|P-DOC-02|reserva quarantine|ready|upload/finalize/bind|Autor;serviço|Bytes sanitizados;hash;autoridade|CONDICIONAL|Objeto privado e vínculo|/api/attachments
T079|P-DOC-02|reserva abandonada|vaga liberada automaticamente|expire/cancel|Serviço|Ciclo não localizado|NAO_EXISTENTE|A-DB-004;sem apagar reserva válida|/api/attachments
T080|P-DOC-03|evento preservado|PDF da versão|GET pdf|Leitor autorizado|Snapshot e renderer versionados|CONDICIONAL|PDF/hash bytes;sem mudança documental|/api/documents/:id/pdf
T081|P-DOC-05|fonte física|REQ histórica|historicalImport|Admin autorizado|Revisão;protocolo válido;campos conhecidos|CONDICIONAL|Unknown preservado;sem avisos retroativos|/api/admin
T082|P-NTF-01|evento registrado|aviso interno|enqueue_notice|Banco|Política;vínculo;destinatário|CONDICIONAL|Outbox;nenhuma ciência automática por seen|private.enqueue_notice
T083|P-NTF-02|queued|sent/delivered/read|worker/webhook|Serviço verificado|Configuração;lease;template;HMAC|CONDICIONAL|Estados externos;documento não revertido|src/lib/notifications/worker.ts
T084|P-NTF-02|uncertain|reenviado cegamente|retry automático|Serviço|Resultado externo desconhecido|PROIBIDA|Conciliação antes de duplicar mensagem|src/lib/notifications/worker.ts
T085|P-NTF-03|REQ cancelada vencida|outro paciente lembrado|lifecycle scheduler|Serviço|Lote precisa progredir|CONDICIONAL|A-DB-002;reprodução B2 pendente|public.v4_lifecycle_schedule
T086|P-NTF-04|challenge válido|ENT recebida integral|WhatsApp accept|Destinatário|Telefone Auth;prazo;versão;opt-in|CONDICIONAL|Mesmo ledger;securityLevel específico|docs/SECURITY.md
T087|P-OPS-02|pessoa revogada com pendências|sucessor de todas tarefas|transferir responsabilidade|Admin/família|Não há comando transversal|NAO_EXISTENTE|Usar comandos específicos onde disponíveis|08_IDENTITIES_MEMBERSHIPS_ADMIN_AUDIT.md
T088|P-OPS-04|resposta perdida após commit|mesmo fato recuperado|retry mesma chave|Autor ainda autorizado|Payload idêntico;chave congelada|CONDICIONAL|Nenhum evento/ledger duplicado|Contratos de idempotência por domínio
`.trim().split('\n').map(line => line.split('|'));
csv('02_PROCESS_TRANSITIONS.csv', raw.map(([id, process_id, from_state, to_state, action, actor, guard, transition_kind, effect, source]) => ({ transition_id: id, process_id, from_state, to_state, action, actor, guard, transition_kind, effect, recovery: transition_kind === 'PROIBIDA' ? 'Conservar fato anterior;reconsultar e executar comando permitido' : 'Ver relatório do domínio para retomada e efeitos laterais', verification: 'LEITURA_ESTATICA;RUNTIME_PENDENTE', evidence: source, scenario: '' })));
console.log(JSON.stringify({ transitions: raw.length }));
