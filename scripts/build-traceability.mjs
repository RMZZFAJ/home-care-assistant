import { readFileSync, writeFileSync } from "node:fs";

const root = "docs/audits/2026-10-20";
const evidence = JSON.parse(readFileSync(`${root}/verification.json`, "utf8"));
const rows = [
  ["PRES-01","Preservar Git, alterações e dois commits locais","M3;M4.1;S1;A2","governance","PARCIALMENTE IMPLEMENTADO","P0","git status/log;check:contracts"],
  ["PRES-02","Executar publicação e mutações somente dentro da autorização vigente","M4;S1;A2;CONVERSA-21/10","governance","PARCIALMENTE IMPLEMENTADO","P0","AUTHORIZATION.md;inspeção de comandos;runner local"],
  ["DB-01","Comparar schema esperado, local e remoto por metadados","M5;A15","remote","PARCIALMENTE IMPLEMENTADO","P0","auditoria banco;migration list remoto;catálogo de metadados"],
  ["DB-02","Preservar migrations históricas e usar correções incrementais","M5.2;S15;A15","database","PARCIALMENTE IMPLEMENTADO","P0","check:contracts;test:migrations"],
  ["DB-03","Provar instalação limpa e upgrade com registros legados","M5.2;M10.3;A15","database","NÃO IMPLEMENTADO","P0","test:migrations"],
  ["DB-04","Não atribuir origem desconhecida a estoque legado","M5.1;S15","database","PARCIALMENTE IMPLEMENTADO","P0","test:migrations;DATABASE_AUDIT.md"],
  ["SEC-01","Revisar grants efetivos/defaults e execução de funções","M6;S13;A4;A15","security","IMPLEMENTADO INCORRETAMENTE","P0","transactions.sql;HTTP Data API"],
  ["SEC-02","View de saldos respeita RLS e bloqueia anônimo","M6;S13;A4","security","IMPLEMENTADO INCORRETAMENTE","P0","transactions.sql;database.test.mjs"],
  ["SEC-03","Isolar dados e operações entre pacientes A/B","M6;S4;A4","security","PARCIALMENTE IMPLEMENTADO","P0","SQL;HTTP Auth real;E2E"],
  ["SEC-04","Revogação de perfil/vínculo bloqueia sessão ainda válida","M6;S5;A4.1","security","IMPLEMENTADO INCORRETAMENTE","P0","transactions.sql;database.test.mjs"],
  ["SEC-05","Leitor/familiar não adquire escrita por flags ou payload","M6;S5.2;A4.2","security","PARCIALMENTE IMPLEMENTADO","P0","guards.test.ts;SQL;E2E leitor"],
  ["SEC-06","Administrador local não muda privilégios/identidades globais","M6;S4.3;A4.3;CONVERSA","security","APENAS ESTRUTURADO","P0","SQL;HTTP;patientContext"],
  ["SEC-07","Proteger último administrador global sob concorrência","CONVERSA-3","security","NÃO IMPLEMENTADO","P0","database.test.mjs demotions"],
  ["SEC-08","Auditoria não falsificável e escopo administrativo correto","M6;S14;A13","security","IMPLEMENTADO INCORRETAMENTE","P0","transactions.sql;RLS audit_events"],
  ["SEC-09","Segredos server-side e mensagens/logs mínimos","M4;M6;S12;A12","api","PARCIALMENTE IMPLEMENTADO","P0","guards.test.ts;provider.test;inspeção"],
  ["AUTH-01","Login/logout com feedback e tratamento de rede","M6;S11;A14","ui","PARCIALMENTE IMPLEMENTADO","P1","E2E;auth components"],
  ["AUTH-02","Callback rejeita redirects externos e trata código inválido","M6;A14","unit","IMPLEMENTADO INCORRETAMENTE","P0","auth.test.ts;callback route"],
  ["AUTH-03","Cadastro por convite e recuperação pessoal completos","M7.2;S5;A5;A14","onboarding","PARCIALMENTE IMPLEMENTADO","P1","convites/register/accept;E2E onboarding"],
  ["AUTH-04","Homologar Google OAuth e configuração Auth remota","M6;A14","external","DEPENDENTE DE CONFIGURAÇÃO EXTERNA","P1","sem mutação remota;configuração pendente"],
  ["PAT-01","Cadastro/edição/inativação sem destruir histórico","M7.1;S4;A5.2","ui","APENAS ESTRUTURADO","P1","admin;SQL inactive;E2E"],
  ["PAT-02","Selecionar paciente autorizado e retirar contexto único por env","M7.1;S4;A5.3","ui","NÃO IMPLEMENTADO","P1","context API;E2E seleção"],
  ["PAT-03","Papel operacional e permissões específicos por vínculo","M6;S5;A4.3;CONVERSA","security","PARCIALMENTE IMPLEMENTADO","P0","recipient_can;guards;RLS"],
  ["ADM-01","Administração funcional e limitada a paciente/sistema","M7.2;S5;A5","ui","PARCIALMENTE IMPLEMENTADO","P1","admin API/console;E2E"],
  ["ADM-02","Convites expiram, reemitem, revogam e aceitam idempotentemente","S5;A5;CONVERSA","database","NÃO IMPLEMENTADO","P1","invitations-import-outbox.sql"],
  ["ADM-03","Revogar vínculo não bloqueia conta compartilhada em B","M6;S4.3;A5;CONVERSA","security","NÃO IMPLEMENTADO","P0","SQL shared membership"],
  ["CAT-01","Migrar catálogo por paciente preservando IDs/FKs/histórico","M7.3;S6;A6;CONVERSA-2","database","NÃO IMPLEMENTADO","P0","test:migrations;transactions.sql"],
  ["CAT-02","Impedir produto exclusivo e edição cruzada entre pacientes","M6;M7.3;CONVERSA","security","NÃO IMPLEMENTADO","P0","ownership trigger;SQL"],
  ["CAT-03","CRUD local, descrição, unidade, ordem, aliases e inativação","S6.1;A6;M7.3","ui","APENAS ESTRUTURADO","P1","admin catalogue;E2E"],
  ["CAT-04","Normalizar texto e exigir resolução explícita de ambiguidades","S6.4;A6","ui","PARCIALMENTE IMPLEMENTADO","P1","catalog lookup;extras suggestions"],
  ["CAT-05","Banco canônico substitui catálogo estático no formulário","S6.2;A6;M7.3","ui","IMPLEMENTADO INCORRETAMENTE","P1","catalog API;wizard;E2E"],
  ["CAT-06","Mudança de unidade não reinterpreta saldo/histórico","M7.3;S6;CONVERSA","database","NÃO IMPLEMENTADO","P1","SQL unit guard"],
  ["REQ-01","Remover quantidade solicitada sem remover quantidades de estoque","M7.4;S3;A18A","database","IMPLEMENTADO, MAS NÃO VALIDADO INTEGRALMENTE","P0","schema final;guard;Vitest;UI"],
  ["REQ-02","Validar paciente, ator e produto canônico no servidor e SQL","M7.4;S8;A3.4","api","PARCIALMENTE IMPLEMENTADO","P0","API persistence;SQL;HTTP"],
  ["REQ-03","Idempotência compara intenção e suporta concorrência/rollback","M7.4;S8;A3.4","database","PARCIALMENTE IMPLEMENTADO","P0","SQL;8 submissões HTTP concorrentes"],
  ["REQ-04","Resultado incerto preserva tentativa após falha e recarga","M7.4;S11.2;A3.4","ui","PARCIALMENTE IMPLEMENTADO","P0","E2E resposta perdida"],
  ["REQ-05","Protocolo global desde 12, formatos legados e largura expansível","M7.4;S8;A3","database","IMPLEMENTADO, MAS NÃO VALIDADO INTEGRALMENTE","P0","clean HC-000012;SQL;HTTP"],
  ["REQ-06","Comprovante por snapshots persistidos e legado identificado","M7.3;M7.9;S7.2;A3.4","ui","IMPLEMENTADO INCORRETAMENTE","P0","API snapshots;SQL;E2E renomear"],
  ["REQ-07","Formulário/revisão com extras, urgência, observações e identificação","M7.4;S3.4;A18A","ui","PARCIALMENTE IMPLEMENTADO","P1","wizard;schemas;E2E"],
  ["HIS-01","Histórico completo do paciente, não apenas do autor","M7.9;S7;A11","security","PARCIALMENTE IMPLEMENTADO","P1","RLS scoped requisitions;HTTP/E2E"],
  ["HIS-02","Filtro de datas/protocolo/status e paginação estável","M7.9;S7.1;A11","api","PARCIALMENTE IMPLEMENTADO","P1","history API;IANA date tests;UI"],
  ["HIS-03","Transições justificadas, trilha e reimpressão persistida","M7.9;S7.2;A11","ui","PARCIALMENTE IMPLEMENTADO","P1","transition RPC;E2E detail"],
  ["IMP-01","Preservar protocolos físicos e desconhecidos sem inventar datas/autor","M7.5;S8.3;A3.3","database","IMPLEMENTADO INCORRETAMENTE","P1","invitations-import-outbox.sql"],
  ["IMP-02","Importação idempotente com revisão e relatório por registro","M7.5;S8.3;A3.3","ui","PARCIALMENTE IMPLEMENTADO","P1","admin preview/commit;SQL import"],
  ["IMP-03","Rollback de linha inválida e ausência de notificações retroativas","M7.5;S8.3;A3.3","database","PARCIALMENTE IMPLEMENTADO","P1","SQL import invalid/replay/notifications"],
  ["STK-01","Saldos separados por paciente/produto/FAMILY/CARE_TEAM","M7.6;S9;A7","database","APENAS ESTRUTURADO","P1","migration upgrade;SQL;HTTP"],
  ["STK-02","Escrita oficial só por administradores autorizados","M7.6;S9.3;A7.2","security","IMPLEMENTADO INCORRETAMENTE","P0","SQL capabilities;API guard;E2E reader"],
  ["STK-03","Entradas/saídas/transferências atômicas sem sobresaldo concorrente","M7.6;S9.2;A7.3","database","PARCIALMENTE IMPLEMENTADO","P0","6 saídas simultâneas;SQL transactions"],
  ["STK-04","Movimentos idempotentes com conflito de conteúdo","M7.6;A7.3","database","PARCIALMENTE IMPLEMENTADO","P0","transactions.sql"],
  ["STK-05","Negativo apenas em ajuste extraordinário global explícito","M7.6;A7.4;CONVERSA","database","IMPLEMENTADO INCORRETAMENTE","P0","SQL extraordinary + denied outbound"],
  ["STK-06","Correção compensatória e histórico antes/depois","M7.6;S9.3;A7.1","ui","APENAS ESTRUTURADO","P1","stock API/console;SQL;E2E"],
  ["INV-01","Capturar referência e revisão estáveis ao abrir inventário","M7.7;S9.5;A8","database","IMPLEMENTADO INCORRETAMENTE","P0","transactions.sql inventory"],
  ["INV-02","Contagem, divergência e justificativa sem alterar saldo","M7.7;A8","ui","PARCIALMENTE IMPLEMENTADO","P1","inventory UI;SQL;E2E"],
  ["INV-03","Aprovação idempotente e ajustes únicos em transação","M7.7;A8","database","PARCIALMENTE IMPLEMENTADO","P0","transactions.sql"],
  ["INV-04","Movimentação após referência impede aprovação e exige recontagem","M7.7;A8","database","IMPLEMENTADO INCORRETAMENTE","P0","SQL revision conflict/recount"],
  ["INV-05","Revisão, rejeição, cancelamento e trilha preservada","M7.7;A8","ui","NÃO IMPLEMENTADO","P1","review RPC;inventory UI"],
  ["ALT-01","Limites configuráveis por paciente/produto/custódia","M7.8;S9.6;A9.1","database","NÃO IMPLEMENTADO","P1","configure_stock_alert;SQL"],
  ["ALT-02","Família não mascara falta da equipe; deduplicar e resolver alertas","M7.8;S9.6;A9.1","database","NÃO IMPLEMENTADO","P1","invitations-import-outbox.sql"],
  ["NOT-01","Destinatários e canais individuais por configuração autorizada","M7.8;S10.3;A9","database","APENAS ESTRUTURADO","P1","notification settings;SQL queue"],
  ["NOT-02","Persistência da requisição independente do provedor","M7.8;S10.2;A9.2","api","PARCIALMENTE IMPLEMENTADO","P0","API receipt failure;SQL outbox"],
  ["NOT-03","Lease, concorrência, backoff, recuperação e reprocessamento","M7.8;S10.5;A9.2","database","NÃO IMPLEMENTADO","P1","SQL queue;6 workers HTTP;worker tests"],
  ["NOT-04","Estado persistido e distinção entre aceitação/entrega/incerteza","M7.8;S10;A10","ui","NÃO IMPLEMENTADO","P1","provider/worker tests;receipt notifications"],
  ["NOT-05","Adaptador oficial e webhook seguro sem envio real nos testes","M7.8;S10.5;A9.3","api","NÃO IMPLEMENTADO","P1","notifications.test.ts;worker.test.ts;SQL webhook"],
  ["NOT-06","Homologação de provedor, template e agendamento externo","M7.8;S10.5;A9.3","external","DEPENDENTE DE CONFIGURAÇÃO EXTERNA","P1","sem credenciais/envios externos"],
  ["UX-01","Loading/erro/vazio/sucesso e prevenção de repetição","M7.10;S11;A12","ui","PARCIALMENTE IMPLEMENTADO","P1","componentes;E2E rede"],
  ["UX-02","Acessibilidade, teclado e responsividade desktop/celular","M7.10;S11.1","ui","PARCIALMENTE IMPLEMENTADO","P1","E2E axe;desktop/mobile"],
  ["ERR-01","Catálogo central de erros e correlação com logs seguros","M8;S12;A12","api","NÃO IMPLEMENTADO","P1","guards.test.ts;API wrapper"],
  ["ARC-01","Separar casos de uso e simplificar componentes sem recriar app","M8;S18","ui","PARCIALMENTE IMPLEMENTADO","P2","workspace/domain components;server helpers"],
  ["DOC-01","Reescrever documentação/AGENTS com fontes e limites reais","M9;S17;A17","documentation","PARCIALMENTE IMPLEMENTADO","P1","lint:markdown;docs index"],
  ["QA-01","Testes unitários, banco real, múltiplos usuários e E2E","M10;S16;A16","ui","PARCIALMENTE IMPLEMENTADO","P0","verification.json;EXECUTION.md"],
  ["CI-01","Instalação limpa e ferramentas atuais compatíveis Win/Linux/Vercel","M10.1;S17;A16;CONVERSA-1","toolchain","IMPLEMENTADO INCORRETAMENTE","P0","Windows/Linux ci;versions report"],
  ["CI-02","Pipeline determinístico com migrations e E2E sem produção","M10.5;S17;A16","toolchain","PARCIALMENTE IMPLEMENTADO","P1","workflow;comandos locais equivalentes"],
  ["CI-03","Novo resultado publicado de GitHub Actions após autorização","M10.5;CONVERSA-21/10","publication","BLOQUEADO, COM JUSTIFICATIVA DOCUMENTADA","P1","push autorizado;checks do PR aguardam execução"],
  ["AI-01","Preparar contratos e limites para agente futuro sem autonomia clínica","S2;M9.2;A17","documentation","APENAS ESTRUTURADO","P2","API.md;WHATSAPP_AI.md"],
  ["AUD-01","Matriz, relatório, comparação de banco e checkpoints persistentes","M2;M11;M14;M15","documentation","NÃO IMPLEMENTADO","P1","sources;REQUIREMENTS.csv;CHECKPOINT.md"],
];
const files = {
  governance: "AGENTS.md;scripts/check-contracts.mjs",
  database: "supabase/migrations/20261020002000–20261020003400 (inclui 20261020002050);tests/database;tests/integration/database.test.mjs",
  security: "supabase/migrations/20261020002000–20261020003400 (inclui 20261020002050);src/lib/server/api.ts;tests/database;tests/integration",
  api: "src/app/api;src/lib/server;src/lib/notifications;tests/api",
  unit: "src/lib/safe-return-path.ts;src/app/auth/callback;tests/auth.test.ts",
  ui: "src/components;src/app;tests/e2e",
  onboarding: "src/app/api/invitations;src/components/auth;src/components/admin/accept-invitation.tsx",
  documentation: "README.md;AGENTS.md;docs",
  remote: "docs/audits/2026-10-20/DATABASE_AUDIT.md;docs/audits/2026-10-21/EXECUTION.md",
  external: "docs/DEPLOYMENT.md;docs/WHATSAPP_AI.md",
  publication: ".github/workflows/ci.yml;docs/audits/2026-10-21/EXECUTION.md",
  toolchain: "package.json;package-lock.json;.github/workflows/ci.yml;vercel.json",
};
// An area-wide green flag does not prove each requirement. Only an explicitly
// accepted requirement ID, backed by its own evidence, may become validated.
const validatedIds = new Set(evidence.validatedRequirementIds ?? []);
const knownIds = new Set(rows.map(([id]) => id));
for (const id of validatedIds) if (!knownIds.has(id)) throw new Error(`Unknown validated requirement: ${id}`);
const individualEvidence = {
  "PRES-01": ["git log/status;check:contracts;scripts/historical-migrations.json", "Preservação do histórico e hashes; publicação tem evidência separada."],
  "PRES-02": ["docs/audits/2026-10-21/AUTHORIZATION.md;scripts/test-environment.mjs;scripts/supabase-project.mjs", "Autorizações mudaram em 21/10; envio externo permanece desabilitado nos testes."],
  "DB-01": ["docs/audits/2026-10-21/DATABASE_COMPARISON.json;REMOTE_ORIGINAL_INTEGRITY.json;scripts/reconcile-database.mjs", "35 migrations; objetos e defaults iguais; hashes de funções normalizam somente CRLF/LF; registros originais preservados, com dois novos registros no remoto."],
  "DB-02": ["scripts/check-contracts.mjs;scripts/test-migrations.mjs", "19 hashes históricos; cadeia alvo inclui as compatibilizações 02050 e 032."],
  "DB-03": ["scripts/test-migrations.mjs:reset completo e reset019→cadeia atual", "Banco local com Auth real e fixtures; nunca reset remoto."],
  "DB-04": ["scripts/test-migrations.mjs:stock_movements órfão;tests/database/transactions.sql", "Movimento legado sem origem permanece sem paciente/custódia."],
  "SEC-01": ["tests/database/transactions.sql:has_table_privilege/has_function_privilege;tests/integration/database.test.mjs:Data API grants", "Cobre privilégios testados e funções críticas; não presume auditoria de infraestrutura."],
  "SEC-02": ["tests/database/transactions.sql:anon e security_invoker;tests/integration/database.test.mjs:Data API grants", "Visibilidade de saldos com identidades Auth reais e paciente A/B."],
  "SEC-03": ["tests/database/transactions.sql:A cannot access B;tests/integration/database.test.mjs:cross-patient isolation", "SQL e HTTP provam isolamento; telas administrativas precisam de seus testes próprios."],
  "SEC-04": ["tests/database/transactions.sql:globally revoked e patient revocation;tests/integration/database.test.mjs:Data API grants", "Sessão autenticada não contorna perfil/vínculo revogado."],
  "SEC-05": ["tests/api/guards.test.ts:reader flags e family;tests/database/transactions.sql;tests/e2e/workflows.spec.ts:leitor", "Requer SQL/API e interface; flags permissivas não concedem escrita."],
  "SEC-06": ["tests/database/transactions.sql:global identity write denied;tests/integration/database.test.mjs:local authority", "Identidade global e autoridade local verificadas separadamente."],
  "SEC-07": ["tests/integration/database.test.mjs:concurrent global administrator demotions;tests/database/transactions.sql:admin guard", "Concorrência real preserva ao menos um administrador global ativo."],
  "SEC-08": ["tests/database/transactions.sql:audit spoof denied;tests/database/notification-read-model.sql:retry audited", "DML direto negado e eventos transacionais testados."],
  "SEC-09": ["tests/api/guards.test.ts:safe errors;tests/api/notifications.test.ts:payload;docs/SECURITY.md", "Mocks provam minimização local; configuração de segredos externos exige revisão própria."],
  "AUTH-01": ["tests/e2e/login.spec.ts;tests/e2e/onboarding.spec.ts;src/components/auth", "Falha de credencial, indisponibilidade de rede, recuperação e logout com limpeza de contexto exercitados em desktop e celular."],
  "AUTH-02": ["tests/auth.test.ts;src/app/auth/callback/route.ts", "Casos de redirects adversos e código inválido conforme testes individuais."],
  "AUTH-03": ["tests/e2e/onboarding.spec.ts", "Cadastro, e-mail local, aceite e recuperação completos via Mailpit; sem OAuth remoto."],
  "AUTH-04": ["docs/DEPLOYMENT.md;docs/audits/2026-10-21/EXECUTION.md", "Depende de Auth/OAuth/e-mail e redirects do ambiente remoto."],
  "PAT-01": ["tests/e2e/workflows.spec.ts:paciente renomeado e inativo;src/components/admin/admin-console.tsx", "Criação, edição e inativação na interface; snapshots/histórico preservados e nova operação negada pela API."],
  "PAT-02": ["tests/e2e/workflows.spec.ts:seletor;src/app/api/context/route.ts", "Paciente da sessão e URL é validado pelo servidor; não há contexto único por env."],
  "PAT-03": ["tests/api/guards.test.ts:patient capabilities;tests/database/transactions.sql:same identity different powers", "Papel efetivo por vínculo; perfil global não amplia escopo local."],
  "ADM-01": ["tests/e2e/administration.spec.ts;tests/integration/database.test.mjs:local authority", "Aprovar somente as operações administrativas efetivamente percorridas."],
  "ADM-02": ["tests/database/invitations-import-outbox.sql:invites;tests/e2e/administration.spec.ts:convite;tests/e2e/onboarding.spec.ts", "Prazo, reemissão, revogação e aceite precisam de SQL e UI pertinentes."],
  "ADM-03": ["tests/database/transactions.sql:patient revocation;tests/e2e/administration.spec.ts:acesso compartilhado", "Revogação A mantém B; não equivale a revogação global da conta."],
  "CAT-01": ["scripts/test-migrations.mjs:FKs/quantidades/protocolo;tests/database/transactions.sql:catalogue relationships", "Upgrade legado preserva identidades e associações comprovadas."],
  "CAT-02": ["tests/database/transactions.sql:exclusive identity hidden/B unchanged;tests/integration/database.test.mjs:cross-patient isolation", "Produto exclusivo e atributos locais não atravessam pacientes."],
  "CAT-03": ["tests/e2e/administration.spec.ts:catálogo;tests/e2e/workflows.spec.ts:cadastro/renomeação", "Cada atributo e inativação precisam de evidência; existência do formulário não basta."],
  "CAT-04": ["tests/e2e/administration.spec.ts:sugestões por alias e grafia ambígua", "Sugestão não associa sem escolha explícita do usuário."],
  "CAT-05": ["tests/e2e/workflows.spec.ts:catálogo→requisição;src/app/api/catalog/route.ts", "Produto criado no banco aparece no wizard e gera snapshot canônico."],
  "CAT-06": ["tests/database/transactions.sql:unit guard", "Mudança de unidade com histórico é recusada; substituição é explícita."],
  "REQ-01": ["scripts/test-migrations.mjs:requested_quantity ausente;tests/api/requisition-contract.test.ts;scripts/check-contracts.mjs;tests/e2e/workflows.spec.ts", "Quantidade de estoque permanece; quantidade solicitada não pertence ao contrato."],
  "REQ-02": ["tests/api/requisition-persistence.test.ts;tests/database/transactions.sql;tests/integration/database.test.mjs:canonical request", "Valores do navegador não definem identidade ou atributos canônicos."],
  "REQ-03": ["tests/integration/database.test.mjs:concurrent HTTP submissions;tests/database/transactions.sql:canonical retry", "Oito submissões concorrentes, replay e conflito de conteúdo."],
  "REQ-04": ["tests/e2e/workflows.spec.ts:resposta perdida", "Persistência confirmada antes de abortar resposta; reload recupera um único registro."],
  "REQ-05": ["scripts/test-migrations.mjs:HC-000012 e protocolo legado;supabase/migrations/20261020002100_transactional_operations.sql", "Primeira emissão e legado testados; a largura expansível foi inspecionada e exige caso de limite para aceite completo."],
  "REQ-06": ["tests/e2e/workflows.spec.ts:renomear após emissão;tests/database/transactions.sql:snapshot canonical", "Comprovante persistido mantém nomes anteriores e identifica origem legada."],
  "REQ-07": ["tests/e2e/workflows.spec.ts:wizard;tests/e2e/administration.spec.ts:extras;tests/requisition.test.ts", "Cada campo e revisão dependem dos casos exercitados, sem aprovação por simples cadastro."],
  "HIS-01": ["tests/integration/database.test.mjs:Data API grants;tests/e2e/workflows.spec.ts:histórico", "Leitura do paciente independe do autor e permanece limitada ao vínculo."],
  "HIS-02": ["tests/api/guards.test.ts:IANA;src/app/api/requisitions/route.ts;src/components/history", "Datas unitárias não provam por si paginação e todos os filtros na interface."],
  "HIS-03": ["tests/e2e/workflows.spec.ts:transição e detalhe;tests/database/transactions.sql", "Estado e auditoria persistidos; impressão requer inspeção específica do comprovante."],
  "IMP-01": ["tests/database/invitations-import-outbox.sql:unknown facts;tests/e2e/administration.spec.ts:importação", "Campos desconhecidos continuam NULL; não há associação automática de extras."],
  "IMP-02": ["tests/database/invitations-import-outbox.sql:canonical replay;tests/e2e/administration.spec.ts:preview/commit", "Lote idempotente, revisão e relatório por registro exercitados conjuntamente."],
  "IMP-03": ["tests/database/invitations-import-outbox.sql:invalid extra/duplicate/no retroactive notifications", "Linha inválida reverte e importação não enfileira mensagens antigas."],
  "STK-01": ["scripts/test-migrations.mjs:patient balances;tests/database/transactions.sql;tests/integration/database.test.mjs:transfers", "Saldos separados em pacientes e custódias, sem compensação implícita."],
  "STK-02": ["tests/api/guards.test.ts:manageStock;tests/database/transactions.sql;tests/e2e/workflows.spec.ts:leitor", "Interface e caminhos diretos recusam escrita oficial sem administração."],
  "STK-03": ["tests/integration/database.test.mjs:concurrent withdrawals;tests/database/transactions.sql", "Seis saídas simultâneas e transferência com ambos os lados atômicos."],
  "STK-04": ["tests/database/transactions.sql:stock movement replay/conflict", "Mesma chave/conteúdo não duplica; conteúdo diferente gera conflito."],
  "STK-05": ["tests/database/transactions.sql:extraordinary adjustment e outbound denied", "Saldo negativo só pelo fluxo global confirmado e justificado."],
  "STK-06": ["tests/e2e/workflows.spec.ts:histórico estoque;tests/database/transactions.sql", "Movimentos preservados; UI deve mostrar contexto e não editar saldo diretamente."],
  "INV-01": ["tests/database/transactions.sql:inventory reference/revision", "Referência e revisão capturadas no banco ao abrir contagem."],
  "INV-02": ["tests/e2e/workflows.spec.ts:contagem divergente;tests/database/transactions.sql", "Salvar contagem não altera saldo; justificativa antecede aprovação."],
  "INV-03": ["tests/database/transactions.sql:inventory approval idempotent;tests/e2e/workflows.spec.ts:aprovação", "Compensação aplicada uma vez na mesma transação."],
  "INV-04": ["tests/database/transactions.sql:revision conflict/recount", "Movimento posterior à referência impede aprovação sem recontagem."],
  "INV-05": ["tests/e2e/workflows.spec.ts:revisão/rejeição/recontagem/cancelamento;tests/database/transactions.sql", "Contagens anteriores e trilha permanecem consultáveis."],
  "ALT-01": ["tests/database/alerts-routing.sql;tests/e2e/administration.spec.ts:limites", "Configuração por produto/custódia precisa de validação SQL e formulário."],
  "ALT-02": ["tests/database/alerts-routing.sql:family/team/dedup/resolve;tests/database/transactions.sql:alert opened once", "Deduplicação, reposição e roteamento respeitam custódia e configuração."],
  "NOT-01": ["tests/database/invitations-import-outbox.sql:individual channels;tests/e2e/administration.spec.ts:destinatários", "Destinatário ativo autorizado e canal configurado, sem endereço oriundo do wizard."],
  "NOT-02": ["tests/api/requisition-persistence.test.ts;tests/database/invitations-import-outbox.sql", "Falha de mensageria não desfaz registro da requisição."],
  "NOT-03": ["tests/database/invitations-import-outbox.sql:lease/recovery;tests/integration/database.test.mjs:outbox workers;tests/api/worker.test.ts", "Concorrência real, lease expirado e incerteza não provocam reenvio silencioso."],
  "NOT-04": ["tests/database/notification-read-model.sql;tests/e2e/workflows.spec.ts:pending→delivered;tests/api/notifications.test.ts", "Estados internos e externos distintos; entrega real do provedor depende de homologação externa."],
  "NOT-05": ["tests/api/notifications.test.ts;tests/api/worker.test.ts;tests/database/invitations-import-outbox.sql:webhook", "Transporte falso e assinatura/callback; nenhum envio externo foi necessário para testes."],
  "NOT-06": ["docs/WHATSAPP_AI.md;docs/DEPLOYMENT.md", "Credenciais, template, webhook e agendamento do provedor precisam de configuração externa."],
  "UX-01": ["tests/e2e/workflows.spec.ts:resposta perdida;src/components", "Um fluxo de rede não prova todos os estados de todas as telas."],
  "UX-02": ["tests/e2e/accessibility.spec.ts;playwright.config.ts", "Axe cobre telas visitadas e viewport; não substitui teste completo de teclado de todas as telas."],
  "ERR-01": ["src/lib/server/error-catalog.ts;tests/api/guards.test.ts;src/lib/server/api.ts", "Catálogo tipado com categoria, status, repetibilidade e ação recomendada; correlação segura sem conteúdo privado."],
  "ARC-01": ["src/components;src/lib/server;docs/ARCHITECTURE.md", "Revisão estrutural documentada; contagem de testes não comprova qualidade arquitetural."],
  "DOC-01": ["README.md;AGENTS.md;docs;lint:markdown", "Documentação precisa refletir evidências finais e autorizações vigentes."],
  "QA-01": ["docs/audits/2026-10-21/EXECUTION.md;verification.json", "Suítes unitária, SQL, HTTP e navegador são evidências distintas; nenhuma cobre tudo sozinha."],
  "CI-01": ["docs/audits/2026-10-20/DEPENDENCY_REVIEW.md;docs/audits/2026-10-20/VERSIONS.md", "Instalação Win/Linux e suporte Vercel; seis advisories dev residuais não equivalem a zero riscos."],
  "CI-02": [".github/workflows/ci.yml;docs/audits/2026-10-21/CI_RESULTS.json", "Workflow publicado passou em Windows, Linux e banco/navegador; 35 migrations, seis SQL, seis HTTP e 32 E2E, sem produção."],
  "CI-03": ["docs/audits/2026-10-21/CI_RESULTS.json;https://github.com/RMZZFAJ/home-care-assistant/pull/1", "Run 39697862144 aprovado no código 8fe30fe; estado posterior de integração e implantação é rastreado no PR."],
  "AI-01": ["docs/API.md;docs/WHATSAPP_AI.md", "Somente contratos e limites preparatórios; agente clínico não foi implementado."],
  "AUD-01": ["REQUIREMENTS.csv;REQUIREMENTS.json;SOURCE_REQUIREMENTS.json;docs/audits/2026-10-21/EXECUTION.md", "74 requisitos consolidados e inventário integral das fontes; cada estado exige evidência própria."],
};
const externalGaps = {
  "AUTH-04": "Homologação do Google OAuth, confirmação/e-mail e redirects remotos ainda depende de configuração e teste externo.",
  "NOT-06": "Homologação de provedor, template e agendamento externo ainda não executada.",
};
const matrix = rows.map(([id,description,source,area,initial,priority,tests]) => {
  const complete = validatedIds.has(id);
  const [proof, scope] = individualEvidence[id] ?? [tests, "Critério sem registro individual de validação."];
  const state = complete ? "IMPLEMENTADO E VALIDADO" : externalGaps[id] ? "DEPENDENTE DE CONFIGURAÇÃO EXTERNA" : "IMPLEMENTADO, MAS NÃO VALIDADO INTEGRALMENTE";
  return {id,source,description,components:files[area],initial_state:initial,final_state:state,priority,evidence:proof,validation_scope:scope,gaps:complete?"Limites do escopo descrito; não equivale a homologação de ambientes não exercitados.":externalGaps[id] ?? evidence.requirementGaps?.[id] ?? "Aceite individual ainda não registrado; conferir testes e critérios específicos, sem inferir aprovação da área.",change:description,acceptance:tests,result:complete?"Aceite individual registrado em verification.json.validatedRequirementIds com as evidências indicadas.":"Implementação e evidências relacionadas disponíveis; validação integral deste requisito ainda não atestada."};
});
const clauses = [];
for (const source of ["MISSION","SUPERPROMPT","AUDITORIA"]) {
  const lines=readFileSync(`${root}/sources/${source}.txt`,"utf8").split("\n");
  let current=null;
  for (const [index,line] of lines.entries()) {
    if (/^#{1,4} /.test(line)) {
      if(current)clauses.push(current);
      current={id:`${source}-${clauses.filter((entry)=>entry.source===source).length+1}`,source,line:index+1,section:line.replace(/^#+ /,""),criteria:[]};
    } else if(current && line.trim() && line.trim()!=="---") current.criteria.push(line);
  }
  if(current)clauses.push(current);
}
writeFileSync(`${root}/SOURCE_REQUIREMENTS.json`,JSON.stringify(clauses,null,2)+"\n");
writeFileSync(`${root}/REQUIREMENTS.json`,JSON.stringify(matrix,null,2)+"\n");
const columns=Object.keys(matrix[0]);
const cell=(value)=>`"${String(value).replaceAll('"','""')}"`;
writeFileSync(`${root}/REQUIREMENTS.csv`,[columns.join(","),...matrix.map(row=>columns.map(column=>cell(row[column])).join(","))].join("\n")+"\n");
console.log(`${matrix.length} consolidated requirements and ${clauses.length} source sections retained with their complete criteria.`);
