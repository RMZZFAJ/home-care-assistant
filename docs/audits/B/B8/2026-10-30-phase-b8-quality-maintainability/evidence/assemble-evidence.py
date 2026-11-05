"""Assemble compact coverage evidence; never execute historical reproducers."""
import csv
import hashlib
import json
import re
from pathlib import Path

ROOT = Path("docs/audits/2026-10-30-phase-b8-quality-maintainability")
EVIDENCE = ROOT / "evidence"

def write_csv(name, rows):
    with (EVIDENCE / name).open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)

# Process / expected behaviour / actual check / method / evidence / limit.
processes = """
REQ|Sem quantidade solicitada; chave única; snapshot original; ENT positiva atende linha.|tests/api/requisition-persistence.test.ts:130;tests/integration/database.test.mjs:127;tests/e2e/workflows.spec.ts:476|UNIT_MOCK+REAL_AUTH_HTTP+BROWSER|A integration33; B2 jornadas; B3-001; B1-UX-008|RetryREQ tem leitura persistida e total1; starvation, ciência antes da lista e desconhecido/zero continuam fora do caso protegido.
COM|Compra/doação só entra em FAMILY após recebimento validado; parcelas e saldo separados.|tests/database/supply-workflows.sql:1;tests/integration/v4-workflows.test.mjs:51;tests/e2e/workflows.spec.ts:188|SQL+REAL_AUTH_RPC+BROWSER|B2-001/B3-010; B6-010|Parcial feliz não cobre desistência do remanescente nem identidade da parcela no snapshot.
ENT|Expedição→TRANSIT; só destinatário aceita; positivo parcial credita destino; cancelamento bilateral conserva ledger.|tests/integration/database.test.mjs:177;tests/e2e/workflows.spec.ts:342;tests/e2e/workflows.spec.ts:941|REAL_AUTH_HTTP+BROWSER|B3-002; B2-002/003/015; B6-004|Cancelamento sem consumo não detecta42702 com consumo; sucessão/recusa e fila de consentimento faltam.
BAL|Equipe, referência de ledger, pessoa e plantão reais; revisão distinta; não simular presença/contagens antigas.|tests/integration/balance-idempotency.test.mjs:50;tests/integration/balance-shifts.test.mjs:142;tests/e2e/balance-shifts.spec.ts:41|INDEPENDENT_HTTP_LOCK+REAL_AUTH+BROWSER|A concurrency; B3-006/008/009|Barreira BAL é forte; legado autoaprovação e reconto com substituição exigem ramos próprios.
Escalas|UTC/fuso, recorrência, versão e exclusão entre pacientes; aprovação informada.|tests/integration/schedules.test.mjs:23;tests/schedule-time.test.ts:4;tests/e2e/schedules.spec.ts:9|UNIT+AUTH_RPC+BROWSER|B1-UX-001; B3-003|Persistir horários não comprova mostrar antes/depois ao aprovador; aprovação após corte não é protegida.
Estoque|Ledger oficial; custódias separadas; precisão exata; sem saldo negativo; correção referenciada.|tests/integration/database.test.mjs:177;tests/database/protocol-and-stock-boundaries.sql:1;tests/e2e/workflows.spec.ts:574|AUTH_HTTP+SQL+BROWSER|B3-005/018/020; B4-001; sql-oracle-observations.json|Saldos normais e concorrência são fortes; NULL em guard SQL, number/string e revogação durante lock precisam casos negativos.
Consumo|Relato não debita; confirmação autorizada debita uma vez; decisão oposta não finge sucesso.|tests/e2e/workflows.spec.ts:1042;tests/e2e/fluent-experience.spec.ts:222|BROWSER+SQL_READBACK|B2-010; B3-007/011/017; B4-012|Cenário estruturado não cobre texto incompleto, relato antigo, NULL direto ou frescor após invalidação.
Catálogo|Canônico por paciente; identidades históricas; aliases, apresentações e unidades explícitas.|tests/catalog-match.test.ts:19;tests/e2e/administration.spec.ts:96;tests/e2e/workflows.spec.ts:721|UNIT+BROWSER+AUTH_RPC|B1-FORM-005; B2-006/007; B3-019; B4-008|Decodificador de imagem é exercitado; NaN direto e compatibilidade de rotas/permissões não são substituídos por esse teste.
Documentos|Versões/eventos/atores/hash preservados; fonte histórica distinta do derivado.|tests/database/document-invariants.sql:1;tests/api/requisition-persistence.test.ts:130;tests/e2e/workflows.spec.ts:518|SQL+UNIT+BROWSER|B3-015/023; B4-004; B6-001/003/009|REQ moderno tem snapshot forte; supply histórico, revisão parcial e paginaçãoNULL exigem outros oráculos.
PDF|Conteúdo, estado, atores e versão legíveis; impressão e acessibilidade comprovadas separadamente.|tests/document-pdf.test.ts:12;tests/operational-contracts.test.ts:223|PDF_STRUCTURE_METADATA_ONLY|oracle-baseline.json; oracle-blank-text.json; B6 PDFs|Cinco casos atuais admitem ausência de todo texto; não há inspeção de texto/geometry/tags naCI.
Anexos|Privado, limitado, sanitizado, reserva idempotente, confirmação e recuperação.|tests/files.test.ts:7;tests/files.test.ts:37;tests/e2e/personal-workspace.spec.ts:8|UNIT+BROWSER|B3-004/022; B6-008/011; B7-005|Página determinística não comprova anotação; pequeno arquivo não cruza tetoVercel; perda pósupload não é coberta por retryREQ.
Identidades|Auth oficial, sessão/contexto, convite pessoal, MFA; conta global não concede papel local.|tests/integration/v4-workflows.test.mjs:635;tests/e2e/onboarding.spec.ts:47;tests/e2e/personal-workspace.spec.ts:8|REAL_AUTH+MAILPIT+BROWSER|B3-021; B4-007; B5-012|Mailpit e TOTP local não homologam SMTP/OAuth/SMS; JWT/DML e confirmaçãoAuth parcial precisam testes próprios.
Administração|Local no paciente; proposta global e segunda pessoa; último administrador preservado.|tests/integration/database.test.mjs:268;tests/integration/v4-workflows.test.mjs:21;tests/integration/v4-review.test.mjs:326|AUTH_HTTP+RPC+BROWSER|B4-002/003/005/009/013|Concessão feliz não cobre link perdido, isActive=false, UUIDglobal inválido ou proposta antiga truncada.
Permissões|RLS, grants e RPCs juntos; negativos diretos por papel, paciente e canal.|tests/integration/database.test.mjs:65;tests/integration/fluent-authority.test.mjs:6;tests/e2e/accessibility.spec.ts:99|REAL_AUTH_HTTP+SQL+BROWSER|B3 catálogo/grants; B4 matrizHTTP|Existe defesa em várias camadas; menu condicional não é autoridade e arquivo de teste não cobre todas as61 combinaçõesHTTP.
Notificações|Persistência, aceite, entrega, leitura e ciência independentes; correlação por tentativa.|tests/api/worker.test.ts:19;tests/api/notifications.test.ts:132;tests/database/notification-claim-recovery.sql:1|UNIT_TRANSPORT+SQL+AUTH_RPC|B5-002/003/004/005/007/013/014; B7-002|Mocks e callback da mesma tentativa não homologam provedor nem callback antigo versus lease nova.
Automações|Progresso, fairness, deduplicação, janela, catchup e recuperação mensuráveis.|tests/database/balance-scheduler-fairness.sql:1;tests/integration/v4-workflows.test.mjs:537|SQL+REAL_AUTH_RPC|B3-001/016/025; B5-001; B7 health|BAL101 tem prova positiva; sucessocron ou mock rápido não prova prazo/progressoREQ e catchup após dia perdido.
Multipaciente|Troca/revogação sem fuga; autoridade global e local distintas; intenções vinculadas ao paciente original.|tests/integration/database.test.mjs:65;tests/e2e/administration.spec.ts:159;tests/integration/v4-workflows.test.mjs:411|REAL_AUTH_HTTP+SQL+BROWSER|B3-020/022; B4-012; B5-010|Revogar A preservaB e broadcast privado são fortes; operação em voo/contexto e resposta antiga exigem interleavings específicos.
"""
process_rows = []
for line in processes.strip().splitlines():
    name, expected, checks, method, evidence, limits = line.split("|")
    process_rows.append(dict(process=name, expected=expected, checks=checks,
                             method=method, evidence=evidence, limits=limits))
write_csv("PROCESS_TEST_COVERAGE.csv", process_rows)

roles = """
Administrador global|tests/integration/database.test.mjs:268;tests/integration/v4-workflows.test.mjs:210|Último admin, contexto global explícito, proposta com segunda pessoa.|Permissão operacional só com vínculo; não cobre toda combinaçãoHTTP nem link após resposta perdida.
Administrador local|tests/integration/database.test.mjs:65;tests/e2e/administration.spec.ts:159|Recusa gerirB, mantém último admin local, revogaA sem retirarB.|Propostas truncadas, conflito com diálogo e cadastroinativo são ramos faltantes.
Familiar|tests/integration/v4-workflows.test.mjs:51;tests/e2e/workflows.spec.ts:188|COM/ENT, ciência, estoque e decisão familiarBAL.|Decisão informada, recusa de cancelamento e desconhecido/zero requerem critérios humanos e ramos negativos.
Supervisão|tests/integration/balance-shifts.test.mjs:47;tests/e2e/balance-shifts.spec.ts:107|Não substitui decisão familiar; solicita adiamento e vê capacidades.|AutoaprovaçãoBAL legado e troca durante reconto não são cobertas pelo novo regime.
Profissional|tests/integration/balance-shifts.test.mjs:8;tests/e2e/workflows.spec.ts:342|REQ, destinatárioENT, contador designado, sem saldo geralFAMILY.|Câmera física, ciência/recebimento material, revogação durante espera exigem provas próprias.
Leitor autorizado|tests/api/guards.test.ts:220;tests/integration/database.test.mjs:65;tests/e2e/accessibility.spec.ts:99|Flags não concedem escrita; dados A/B e menu condicionados.|Percorrer o menu não verifica legibilidadePDF nem todos os endpoints diretos/links previamente emitidos.
"""
write_csv("ROLE_TEST_COVERAGE.csv", [dict(zip(["persona", "checks", "protected", "limits"], line.split("|"))) for line in roles.strip().splitlines()])

exceptions = """
Erro antes de persistência|tests/api/requisition-contract.test.ts:18|Forte no ramo: origem/corpo recusados sem chamadaDB; mocks explícitos.|B3/B4 negativos com Auth real complementam; não generalizar para cada comando.
Resposta perdida após persistência|tests/e2e/workflows.spec.ts:476;tests/e2e/balance-shifts.spec.ts:91|ForteREQ/BAL: route.fetch confirma e aborta resposta; ID/total conferidos.|Anexo, settings, convite e telefone têm janelas próprias B1-ERR-001/B4-002/003/B5-012.
Dupla submissão|tests/integration/database.test.mjs:127|ResultadoREQ único e snapshot; BAL tem barreira independente.|MesmoSDK Promise.all não garante sozinho sobreposição; não extrapolar para cada comando.
Concorrência|tests/integration/balance-idempotency.test.mjs:12|Dois HTTP aguardam mesmo lock antes de commit; saldo/admin/outbox com provas específicas.|Não há carga multitenant ou p95 sob concorrência.
Mudança de versão|tests/e2e/v4-review.spec.ts:69;tests/e2e/workflows.spec.ts:642|Atualização conflitante e reconto preservam versões.|Revisão já persistida seguida de submitfalho B4-004 precisa envelope próprio.
Sessão expirada|tests/integration/v4-workflows.test.mjs:635;tests/e2e/login.spec.ts:16|Sessões reais e reautenticação; sem mockedidentity na integração.|DMLprofile/avatar com JWT e telefoneAuth parcial permanecem B3-021/B5-012.
Revogação durante operação|tests/integration/v4-review.test.mjs:21|Archive atrás do lock possui teste forte.|Movimento familiar e preparo de mídia têm outros pontos de revalidação B3-020/B4-010.
Troca de paciente|tests/e2e/fluent-experience.spec.ts:36;tests/e2e/administration.spec.ts:159|Contexto explícito e vínculoA/B.|Interleavings de resposta velha, intenção incerta e revogação precisam cenário por consumidor.
Falha de rede|tests/e2e/login.spec.ts:33;tests/e2e/workflows.spec.ts:487|Abort controlado antes e depois da escrita em ramos definidos.|Não equivale a rádio móvel real nem a indicador de leitura desatualizada B1-STATE-005.
Arquivo rejeitado|tests/files.test.ts:22;tests/files.test.ts:47|PDF ativo e imagem inválida recusados.|Não cobre toda borda de limite/multipart nem fidelidade de anotação e hashcache.
Resposta parcial|tests/api/requisition-persistence.test.ts:160|RECEIPT_PENDING conserva identidade confirmada.|Revise+submit, upload+associação e Auth+telefone não compartilham automaticamente o contrato.
Worker interrompido|tests/database/notification-claim-recovery.sql:1;tests/api/worker.test.ts:41|Lease recovery e completion sem confirmação têm checks.|Interrupção de processo real entre upload/send/callback e retorno operacional não foi homologada.
Notificação incerta|tests/api/notifications.test.ts:59;tests/api/worker.test.ts:26|Timeout/falha incerta sem reenvio cego.|Timeout de upload antes da mensagem e callback de tentativa antiga B5-003/013 faltam no gate atual.
Retry|tests/integration/balance-idempotency.test.mjs:50|BAL cria/revisa/submete e recupera mesmo ID após assignmentfechada.|Proposta settings, hold template e Flow sem ocorrências ainda têm causas específicas.
Reinício da aplicação|tests/e2e/workflows.spec.ts:501|Há reload da página para recuperarREQ.|Não é reinício do servidor/worker, fechamento de aba nem reabertura do aparelho.
Estado histórico|tests/e2e/workflows.spec.ts:518;tests/e2e/administration.spec.ts:427|Renomeado/inativo e importação explícita.|Legacy unknown, supplyauthor e representação de versão antiga requerem B6-001/003/009.
Registro legado|scripts/test-migrations.mjs:120|Replay limpo/019→84 histórico com backup e stackefêmeraCI.|Não executar novamente paraB8; scheduler malformado e BALlegado são cenários adicionais.
Resultado vazio|tests/catalog-match.test.ts:49;tests/e2e/accessibility.spec.ts:44|Vazio determinístico de matcher e telas percorridas.|Vazio inicial antes de terminar consulta não é oráculo de resultado realmente vazio.
Erro de permissão|tests/integration/database.test.mjs:65;tests/api/guards.test.ts:220|Authreal+RLS+API com negativas e flags leitor.|Menu não substitui todas as chamadas diretas; B4-008 tem divergência entre rotas equivalentes.
Confirmação duplicada|tests/database/supply-workflows.sql:30;tests/integration/v4-workflows.test.mjs:324|Idempotência de recebimento e ciência explícita no evento.|Decisão oposta de consumo e callback de lease de outra tentativa não são repetição idêntica.
Recuperação de intenção|tests/e2e/workflows.spec.ts:476|MesmaREQ após abort+reload.|Contrato sessionStorage não sustenta promessa entreabas/dispositivos B1-UX-005.
Ordem de resultados|tests/e2e/v4-review.spec.ts:69|Governança tem resposta lenta/erro controlados.|History/stock/filter/Flow dependem de efeitos específicos e podem manter dados velhos B1-STATE-002/B5-010.
"""
write_csv("EXCEPTION_TEST_COVERAGE.csv", [dict(zip(["scenario", "checks", "protected", "limit"], line.split("|"))) for line in exceptions.strip().splitlines()])

matrix = list(csv.DictReader((ROOT / "REGRESSION_COVERAGE_MATRIX.csv").open(encoding="utf-8")))
anchors = set()
for row in matrix:
    for token in row["existing_checks"].split(";"):
        file, line = token.rsplit(":", 1)
        anchors.add((file, int(line)))
findings = list(csv.DictReader((ROOT / "FINDINGS_MASTER.csv").open(encoding="utf-8")))
for finding in findings:
    for token in finding["source"].split(";"):
        file, line = token.rsplit(":", 1)
        anchors.add((file, int(line)))
for file, line in [
    ("src/lib/server/operational-pdf.ts", 147), ("src/lib/server/operational-pdf.ts", 643),
    ("tests/database/supply-workflows.sql", 50), ("tests/e2e/accessibility-audit.ts", 26),
    ("src/components/workspace.tsx", 30), ("src/lib/validation/documents.ts", 5),
    ("src/components/stock/consumption-console.tsx", 54),
    ("src/components/stock/flow-reviews.tsx", 45),
    ("README.md", 81), ("AGENTS.md", 44), ("docs/DATABASE.md", 6),
    ("docs/DEPLOYMENT.md", 50), ("docs/PROJECT_STATUS.md", 9),
    ("docs/TESTING.md", 143), ("scripts/verify-evolution-database.mjs", 6),
]:
    if Path(file).exists():
        anchors.add((file, line))
source_anchors = []
for file, line in sorted(anchors):
    content = Path(file).read_bytes().replace(b"\r\n", b"\n")
    if line > len(content.splitlines()):
        raise ValueError(f"Source anchor out of range: {file}:{line}")
    source_anchors.append(dict(file=file, line=line, sha256_lf=hashlib.sha256(content).hexdigest()))
write_csv("SOURCE_ANCHORS.csv", source_anchors)

reconciliation = json.loads((EVIDENCE / "regression-reconciliation.json").read_text(encoding="utf-8"))
references = [row["file"] for row in reconciliation["originalSources"]]
references += ["docs/audits/" + name for name in [
    "2026-10-25-production-readiness/TESTING_PERFORMANCE_OBSERVABILITY.md",
    "2026-10-25-production-readiness/REPOSITORY_HYGIENE_AND_DOCUMENTATION.md",
    "2026-10-25-production-readiness/evidence/INTEGRATION_REVIEW.md",
    "2026-10-28-phase-b1-interface/10_MOBILE_ACCESSIBILITY_AND_HUMAN_TEST_PLAN.md",
    "2026-10-28-phase-b1-interface/evidence/b18-accessibility.json",
    "2026-10-28-phase-b1-interface/evidence/b18-followup.json",
    "2026-10-28-phase-b1-interface/evidence/pdf-inspection.json",
    "2026-10-29-phase-b2-processes/01_PROCESS_INVENTORY.csv",
    "2026-10-29-phase-b3-database/11_QUERIES_READ_MODELS_AND_PERFORMANCE.md",
    "2026-10-29-phase-b3-database/evidence/b311-plans.json",
    "2026-10-29-phase-b3-database/evidence/b312v-results.json",
    "2026-10-30-phase-b4-backend/15_ACCEPTANCE_AND_REGRESSION_CRITERIA.md",
    "2026-10-30-phase-b5-integrations/15_ACCEPTANCE_AND_REGRESSION_CRITERIA.md",
    "2026-10-30-phase-b6-documents/06_PDF_RENDERING_CONTENT_AND_LAYOUT.md",
    "2026-10-30-phase-b6-documents/evidence/b66-inspection-results.json",
    "2026-10-30-phase-b6-documents/15_ACCEPTANCE_AND_REGRESSION_CRITERIA.md",
    "2026-10-30-phase-b7-operational-readiness/07_PERFORMANCE_SCALABILITY_AND_COST.md",
    "2026-10-30-phase-b7-operational-readiness/evidence/ci-metadata.json",
    "2026-10-30-phase-b7-operational-readiness/evidence/dependency-audit.json",
    "2026-10-30-phase-b7-operational-readiness/evidence/preservation.json",
]]
prior = []
for name in sorted(set(references)):
    file = Path(name)
    if not file.exists():
        raise ValueError("Resolve prior proof reference: " + name)
    content = file.read_bytes()
    prior.append(dict(file=name, bytes=len(content), sha256_lf=hashlib.sha256(content.replace(b"\r\n", b"\n")).hexdigest(),
                      use="Source unchanged; scoped prior evidence, not a new B8 execution"))
(EVIDENCE / "PRIOR_REFERENCES.json").write_text(json.dumps(prior, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
(EVIDENCE / "WEB_REFERENCES.json").write_text(json.dumps([
    {"url": "https://playwright.dev/docs/api/class-locator#locator-is-visible", "used_for": "isVisible is immediate, readiness requires a deliberate wait"},
    {"url": "https://www.deque.com/axe/core-documentation/api-documentation/", "used_for": "violations, incomplete, passes and inapplicable are different result sets"},
    {"url": "https://www.w3.org/WAI/test-evaluate/", "used_for": "automated tools alone cannot determine complete accessibility conformity"},
    {"url": "https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html", "used_for": "SC2.5.8 AA minimum target size24x24CSSpx and exceptions"},
], indent=2) + "\n", encoding="utf-8")
print(json.dumps({"processes": len(process_rows), "personas": 6, "exceptions": 22,
                  "sourceAnchors": len(source_anchors), "priorReferences": len(prior)}))
