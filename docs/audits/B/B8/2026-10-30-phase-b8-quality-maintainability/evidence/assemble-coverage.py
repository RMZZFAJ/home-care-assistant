"""Build a regression catalogue from original findings, without editing them."""
import csv
import hashlib
import json
from pathlib import Path

BASE = Path("docs/audits")
OUT = BASE / "2026-10-30-phase-b8-quality-maintainability"
SOURCES = [
    "2026-10-25-production-readiness/FINDINGS_MASTER.csv",
    "2026-10-28-phase-b1-interface/12_FINDINGS_MASTER.csv",
    "2026-10-29-phase-b2-processes/13_FINDINGS_MASTER.csv",
    "2026-10-29-phase-b3-database/14_FINDINGS_MASTER.csv",
    "2026-10-30-phase-b4-backend/14_FINDINGS_MASTER.csv",
    "2026-10-30-phase-b5-integrations/14_FINDINGS_MASTER.csv",
    "2026-10-30-phase-b6-documents/14_FINDINGS_MASTER.csv",
    "2026-10-30-phase-b7-operational-readiness/14_FINDINGS_MASTER.csv",
]
findings = {}
source_rows = []
for name in SOURCES:
    file = BASE / name
    rows = list(csv.DictReader(file.open(encoding="utf-8-sig", newline="")))
    source_rows.append({"file": file.as_posix(), "rows": len(rows),
                        "sha256_lf": hashlib.sha256(file.read_bytes().replace(b"\r\n", b"\n")).hexdigest()})
    for row in rows:
        row["source_file"] = file.as_posix()
        if row["id"] in findings:
            raise ValueError("Duplicate original ID")
        findings[row["id"]] = row

# Only documented revalidations / manifestations share a regression family.
# This is not the cross-product prioritization or implementation plan of C.
ALIASES = {
    "B3-001": "DB-002", "B1-UX-001": "UX-001",
    "B3-011": "BE-001 B2-017 B1-UX-007", "B5-004": "BE-002",
    "B3-016": "BE-003", "B3-012": "BE-004", "B4-002": "BE-005",
    "B3-002": "DB-001 B2-004", "B3-003": "DB-003 B2-013",
    "B3-004": "DB-004 B2-016", "B3-013": "DB-007",
    "B3-014": "OPS-001", "B1-QA-001": "QA-001",
    "B1-UX-008": "UX-002", "B1-ERR-001": "UX-003",
    "B1-STATE-001": "UX-004", "B1-UX-003": "UX-005",
    "B1-UX-005": "UX-007", "B1-STATE-004": "UX-012",
    "B1-DOC-001": "BE-007", "B3-015": "DB-005",
    "B1-TEXT-001": "UX-006", "B1-VIS-001": "UX-008",
    "B1-UX-006": "UX-009", "B3-005": "B2-005",
    "B3-006": "B2-009", "B3-007": "B2-011",
    "B3-008": "B2-012", "B3-009": "B2-014",
    "B3-010": "B2-001", "B5-010": "B4-012",
    "B6-012": "B1-A11Y-001",
}
aliased = {item for items in ALIASES.values() for item in items.split()}
assert not aliased.intersection(ALIASES), "Alias cycle"

# primary | existing neighbouring checks | exact gap | future layers
SPEC = """
BE-006|src/app/api/dashboard/route.ts:27;tests/e2e/fluent-experience.spec.ts:147|Tarefas e autorização não impõem orçamento de viagens, p95 ou consistência da composição.|HTTP+DB+METRICS
DB-006|tests/integration/v4-workflows.test.mjs:537;tests/database/balance-scheduler-fairness.sql:1|Deduplicação de lembrete e cursor BAL não demonstram alcance de mais de100 configurações legadas.|SQL+AUTH_RPC+SCHEDULER
REPO-001|scripts/check-contracts.mjs:1;.github/workflows/ci.yml:25|Lint e hashes de migrations não confrontam contagens, autorização datada e semântica dos documentos vigentes.|STATIC+DOC_REVIEW
REPO-002|scripts/audit-catalogue.mjs:6;scripts/build-traceability.mjs:3;scripts/reconcile-database.mjs:8|Não há ensaio de destino temporário ou recusa de sobrescrita histórica por padrão.|TOOL_UNIT+FILESYSTEM
REPO-003|scripts/meta-templates.mjs:49;tests/template-registry.test.ts:15|Contrato de template não impede o script administrativo de publicar ao encontrar token.|TOOL_UNIT+TRANSPORT_STUB
REPO-004|scripts/verify-linux.sh:4;.gitignore:43;.vercelignore:1|Exclusões de env não cobrem .private e .venv no tar da verificação Linux.|TOOL_UNIT+ARCHIVE_LIST
UX-010|src/components/workspace.tsx:30;src/app/inventarios/page.tsx:1|Busca de imports deve incluir reexports, rotas públicas e consumidores de assets; ausência lexical não autoriza remoção.|STATIC+URL_COMPATIBILITY
UX-011|tests/e2e/balance-shifts.spec.ts:41|Captura ou nome de arquivo não demonstra que a revisão capturada contém os dados da etapa correta.|BROWSER+HUMAN
B1-UX-001|tests/e2e/schedules.spec.ts:9|Aprovar e persistir não verifica o objeto e todas as diferenças legíveis antes da decisão.|BROWSER+AUTH_RPC+HUMAN
B1-UX-002|tests/e2e/workflows.spec.ts:941;tests/e2e/balance-shifts.spec.ts:41|Confirmação genérica não é oráculo das consequências de cada comando.|BROWSER+SQL+HUMAN
B1-UX-003|tests/e2e/v4.spec.ts:260|Aprovação real não exige tradução de JSON/UUID em objeto de negócio compreensível.|BROWSER+HUMAN
B1-UX-004|tests/e2e/onboarding.spec.ts:47|Jornada de aceite não exige prévia do papel, paciente e autoridade antes de confirmar.|BROWSER+AUTH_RPC+HUMAN
B1-TEXT-001|tests/e2e/accessibility.spec.ts:13|Heading e axe não avaliam compreensão de códigos, papéis e estados; UX-006 é guarda-chuva também relacionado a B1-NAV-001.|BROWSER+HUMAN
B1-NAV-001|tests/e2e/fluent-experience.spec.ts:130|Existência de destino não demonstra correspondência entre rótulo e tarefa.|BROWSER+HUMAN
B1-TEXT-002|tests/e2e/accessibility.spec.ts:44;tests/document-pdf.test.ts:55|Lista de headings fixa os rótulos atuais; deve ser revista após decisão editorial sem tornar o rótulo defeituoso uma aceitação.|BROWSER+PDF_CONTENT+HUMAN
B1-TEXT-003|tests/e2e/login.spec.ts:9|Não há cenário público de URL inexistente com mensagem e recuperação em português.|BROWSER+HUMAN
B1-ERR-001|tests/e2e/workflows.spec.ts:476;tests/e2e/personal-workspace.spec.ts:8|Recuperação REQ não cobre anexo após persistência com arquivo ainda editável.|BROWSER+HTTP+STORAGE
B1-ERR-002|tests/api/guards.test.ts:156;tests/e2e/login.spec.ts:16|Mapper unitário não decide corretamente cada consumidor entre leitura falha e escrita incerta.|UNIT+BROWSER+HTTP
B1-ERR-003|tests/e2e/fluent-experience.spec.ts:174|Conflito de versão na permissão crítica precisa manter diálogo, intenção e erro próximos.|BROWSER+AUTH_RPC
B1-STATE-001|tests/e2e/accessibility.spec.ts:44|Estados iniciais vazios exigem consulta deliberadamente pendente; esperar heading não cobre a janela transitória.|BROWSER+HTTP_STUB
B1-STATE-002|tests/e2e/workflows.spec.ts:518|Resultado final correto não verifica filtro novo coexistindo com linhas antigas durante a resposta.|BROWSER+HTTP_ORDERING
B1-STATE-003|tests/e2e/workflows.spec.ts:574|Não cobre falha secundária com saldo primário válido e discriminação de indisponível versus zero.|BROWSER+HTTP_STUB
B1-STATE-004|tests/e2e/v4-review.spec.ts:214|Frescor normal não protege monotonicidade após prazo fixo nem separação entre PDF e entrega.|BROWSER+CONTROLLED_TIME
B1-STATE-005|tests/e2e/login.spec.ts:33|Falha no login não cobre indicador de leitura desatualizada na tela já aberta e offline.|BROWSER+OFFLINE+HUMAN
B1-FORM-001|tests/requisition.test.ts:39;tests/e2e/workflows.spec.ts:188|Schema valida zero, mas não distingue observação desconhecida de campo deixado vazio no wizard.|BROWSER+HTTP+SQL+HUMAN
B1-FORM-002|tests/operational-contracts.test.ts:22;tests/e2e/accessibility-audit.ts:1|Limites de servidor e axe não cobrem foco no primeiro erro e associação ao campo em cada formulário.|UNIT+BROWSER+HUMAN
B1-FORM-003|tests/password.test.ts:4;tests/e2e/onboarding.spec.ts:47|Limite em bytes existe; ajuda e teto de senha precisam ser equivalentes no cadastro e perfil.|UNIT+BROWSER
B1-FORM-004|tests/api/requisition-contract.test.ts:7|Catálogo grande aceito na API não comprova busca utilizável na seleção COM/ENT.|BROWSER+HUMAN
B1-FORM-005|tests/e2e/workflows.spec.ts:721|Criar apresentação e ler código não cobre consulta/gestão posterior das apresentações cadastradas.|BROWSER+AUTH_RPC
B1-FORM-006|tests/e2e/administration.spec.ts:159|Revogação não cobre troca de pessoa no editor nem explicação do vínculo anterior.|BROWSER+SQL+HUMAN
B1-FORM-007|tests/e2e/fluent-experience.spec.ts:36|Salvar nome preenchido não cobre apagar nome curto e informar a intenção de remoção.|BROWSER+HTTP
B1-UX-005|tests/e2e/workflows.spec.ts:476|Recarga na mesma aba não é fechamento/reabertura nem persistência entre abas/dispositivo.|BROWSER+SESSION_LIFECYCLE
B1-VIS-001|tests/e2e/fluent-experience.spec.ts:28|SSR e screenshots não são comparação visual aprovada nem teste de todos os tokens e exceções.|STATIC+VISUAL_REVIEW
B1-UX-006|tests/e2e/fluent-experience.spec.ts:69|Versão e hash presentes não demonstram tradução humana das mudanças de negócio.|BROWSER+HUMAN
B1-FEED-001|tests/e2e/fluent-experience.spec.ts:222|Estado e saldo corretos não garantem mensagem que diferencie relato, aquisição e confirmação.|BROWSER+HUMAN
B1-DOC-001|tests/document-pdf.test.ts:55;tests/operational-contracts.test.ts:223|Oráculos PDF não exigem estoque observado no conteúdo; mutação sem texto sobreviveu na B8.|PDF_CONTENT+HUMAN
B1-A11Y-002|tests/e2e/accessibility-audit.ts:9;tests/e2e/schedules.spec.ts:9|Entrada por Tab não verifica retorno ao gatilho ao fechar decisão ou continuar edição.|BROWSER+KEYBOARD+HUMAN
B1-A11Y-003|tests/e2e/balance-shifts.spec.ts:83;tests/e2e/accessibility-audit.ts:31|Largura comum não cobre observação contínua válida no estado de revisão REQ a320px.|BROWSER+ZOOM+HUMAN
B1-NAV-002|tests/e2e/schedules.spec.ts:9|Responsividade não exige correspondência entre seletor Mês e período móvel mostrado.|BROWSER+HUMAN
B1-QA-001|tests/e2e/navigation.ts:4;tests/e2e/workflows.spec.ts:342|isVisible é leitura imediata; helper escolhe ramo móvel durante readiness desktop. Prova controlada Q6-02 e contraprovas Q6-01/03.|BROWSER_SYNTHETIC+CI
B1-UX-008|tests/integration/v4-workflows.test.mjs:324;tests/e2e/v4.spec.ts:69|Política e consentimento testados; exposição de cabeçalho não comprova apresentação da lista de materiais.|BROWSER+SQL+HUMAN
B2-002|tests/e2e/workflows.spec.ts:941|Caminho de consentir não cobre recusar/retirar formalmente pedido de cancelamento ENT.|AUTH_RPC+BROWSER+HUMAN
B2-003|tests/e2e/fluent-experience.spec.ts:147|Dashboard com tarefas comuns não verifica ENT em awaiting_consent na fila padrão.|AUTH_RPC+BROWSER
B2-006|tests/e2e/workflows.spec.ts:721|Resultado base4 validado; proveniência da conversão embalagem/fator não é conferida no evento/snapshot.|SQL+BROWSER+PDF_CONTENT
B2-007|tests/e2e/administration.spec.ts:96|Inativar preserva identidade; não cobre esgotamento de saldo autorizado remanescente.|AUTH_RPC+BROWSER+HUMAN
B2-008|tests/e2e/workflows.spec.ts:574|Paginação do ledger não exige links para origem de recibo, BAL e consumo.|AUTH_RPC+BROWSER
B2-010|tests/e2e/workflows.spec.ts:1042|Consumo estruturado é confirmado; relato só textual não tem complemento testado para confirmação.|AUTH_RPC+BROWSER+HUMAN
B2-015|tests/e2e/administration.spec.ts:159;tests/e2e/workflows.spec.ts:941|Revogação e cancelamento separados não cobrem sucessão de recebedor após aceite parcial.|AUTH_RPC+SQL+BROWSER+HUMAN
B3-001|tests/database/balance-scheduler-fairness.sql:1;tests/integration/v4-workflows.test.mjs:267|Fairness BAL e ciência normal não cobrem lote REQ preenchido por canceladas vencidas antes de trabalho elegível.|SQL+SCHEDULER
B3-002|tests/e2e/workflows.spec.ts:941;tests/database/supply-workflows.sql:1|Cancelamento sem consumo e confirmação de consumo separada não exercitam o ramo combinado que produz42702.|SQL+AUTH_RPC+BROWSER
B3-003|tests/integration/schedules.test.mjs:23|Não cobre aprovação de proposta de série após encerramento/corte já confirmado.|SQL+AUTH_RPC+BROWSER
B3-004|tests/files.test.ts:37;tests/e2e/personal-workspace.spec.ts:8|Arquivo sanitizado e upload feliz não cobrem10 reservas abandonadas, expiração e reuso sem arquivo pronto.|SQL+HTTP+STORAGE
B3-005|tests/e2e/workflows.spec.ts:574|Caminho com referência válida não exige recusa transacional de correction sem original.|SQL+AUTH_RPC
B3-006|tests/e2e/workflows.spec.ts:642;tests/integration/balance-shifts.test.mjs:157|Regime novo distingue contador; BAL legado e autoaprovação do supervisor não recebem o mesmo caso negativo.|SQL+AUTH_RPC+BROWSER
B3-007|tests/e2e/fluent-experience.spec.ts:222;tests/e2e/workflows.spec.ts:1042|Confirmar/rejeitar inicialmente não confere resultado de decisão oposta repetida nem preservação de evento/débito.|SQL+AUTH_RPC+BROWSER
B3-008|tests/integration/balance-shifts.test.mjs:103|Mudança de assignment é coberta sem exigir conclusão formal da recusa de deferral já obsoleto.|SQL+AUTH_RPC+BROWSER
B3-009|tests/integration/balance-shifts.test.mjs:157|Handoff normal não cobre substituir profissional durante reconto com tarefa invalidada sem sucessor.|SQL+AUTH_RPC+BROWSER
B3-010|tests/integration/v4-workflows.test.mjs:51;tests/database/supply-workflows.sql:1|Fluxo COM parcial não verifica encerramento/desistência apenas do remanescente.|SQL+AUTH_RPC+BROWSER+HUMAN
B3-011|tests/e2e/fluent-experience.spec.ts:222|Exibição recente não verifica que o101º relato pendente é alcançável por lista, contador e referência.|SQL+HTTP+BROWSER
B3-012|tests/integration/fluent-authority.test.mjs:6|Autoridade de auditoria não cobre101+eventos e continuação/filtro estáveis.|SQL+HTTP+BROWSER
B3-013|tests/integration/v4-workflows.test.mjs:411;tests/e2e/fluent-experience.spec.ts:36|Broadcast de outros eventos não exige incremento/reload após perfil ou destinatário global sem vínculo.|SQL+REALTIME+BROWSER
B3-014|scripts/backup-local-database.mjs:1;docs/audits/2026-10-30-phase-b7-operational-readiness/05_RECOVERY_COVERAGE_MATRIX.csv:1|TOC e hashes não comprovam restore conjunto DB/Auth/Storage/jobs e retorno operacional.|ISOLATED_RESTORE+HUMAN+REMOTE
B3-015|tests/document-pdf.test.ts:84|Lista longa de materiais não impõe orçamento de bytes/eventos acumulados por versão.|SQL+METRICS+PDF
B3-016|tests/api/worker.test.ts:19;tests/api/notifications.test.ts:59|Mocks imediatos/erro instantâneo não medem composição50 jobs, ondas de 10, upload+send e lease de 120 s.|CONTROLLED_TIME+SQL+TRANSPORT
B3-017|tests/e2e/workflows.spec.ts:1042|Booleano normal via API não cobreNULL explícito na RPC e ausência de alteração.|SQL+AUTH_RPC
B3-018|tests/operational-contracts.test.ts:22|Validação HTTP não protege RPC familiar direta contra arredondamento antes da precisão da unidade.|SQL+AUTH_RPC
B3-019|tests/e2e/workflows.spec.ts:721|Apresentação comum não cobre NaN no fator da RPC direta e rejeição sem persistência.|SQL+AUTH_RPC
B3-020|tests/integration/v4-review.test.mjs:21|Archive revalida após lock; movimento familiar em espera usa outro caminho e precisa do próprio ensaio negativo.|SQL_LOCK_BARRIER+AUTH_HTTP
B3-021|tests/integration/v4-workflows.test.mjs:635|Sessão revogada nas RPCs administrativas não cobre DML direto de perfil/avatar com JWT ainda válido.|AUTH_HTTP+STORAGE
B3-022|tests/e2e/personal-workspace.spec.ts:8|Link privado gerado não é teste de TTL/revogação após emissão nem de cópia já obtida.|AUTH_HTTP+CONTROLLED_TIME+HUMAN
B3-023|tests/e2e/workflows.spec.ts:518|Paginação padrão não cobre p_limit=NULL explícito da RPC documental.|SQL+AUTH_RPC
B3-024|tests/integration/database.test.mjs:177|Concorrência/autoridade não impõem p95/lock/volume; amostra local não é SLO remoto.|SQL+METRICS+AUTH_RPC
B3-025|tests/integration/v4-workflows.test.mjs:537|Lembrete válido não cobre registro legado malformado bloqueando repetidamente trabalho posterior.|SQL+SCHEDULER+LEGACY
B4-001|tests/operational-contracts.test.ts:22|Casas em string não cobrem equivalência JSON number/string com7 casas e ausência de arredondamento silencioso.|UNIT+HTTP+SQL
B4-002|tests/e2e/v4.spec.ts:260;tests/e2e/workflows.spec.ts:476|Perda REQ não protege chave de proposta settings; aprovação feliz pode esconder nova intenção em retry.|BROWSER+HTTP+SQL
B4-003|tests/integration/v4-review.test.mjs:326;tests/e2e/onboarding.spec.ts:47|Aceite/concessão normal não exige recuperar link após resposta perdida da aprovação de ingresso.|HTTP+SQL+BROWSER
B4-004|tests/e2e/workflows.spec.ts:642|Falha após revise persistida e submit recusado não exige envelope com versão/chaves já confirmadas.|HTTP+SQL+BROWSER
B4-005|tests/e2e/v4.spec.ts:260|Uma proposta não prova alcançabilidade da antiga pending depois de50 mudanças.|HTTP+SQL+BROWSER
B4-006|tests/api/guards.test.ts:129|Conflito de catálogo legítimo não é controle de SQLSTATE42702 versus erro de domínio.|UNIT+HTTP
B4-007|tests/e2e/personal-workspace.spec.ts:8|Foto válida não cobre objeto enviado e associação RPC falha sem identidade retomável.|HTTP+STORAGE+BROWSER
B4-008|tests/integration/fluent-authority.test.mjs:6|RPC delegada correta não confronta as duas rotas HTTP equivalentes com mesma identidade/capacidade.|HTTP_AUTH+URL_COMPATIBILITY
B4-009|tests/api/guards.test.ts:69|JSON inválido não cobre UUID malformado no ramo global após autorização e status seguro4xx.|UNIT+HTTP_AUTH
B4-010|tests/api/worker.test.ts:19;tests/template-registry.test.ts:119|Revalidação anterior ao provider não cobre revogação/cancelamento durante o preparo do PDF/mídia.|CONTROLLED_INTERLEAVING+SQL+TRANSPORT
B4-011|tests/api/notifications.test.ts:132|Status reconhecido isolado não cobre lote misto com interactive não suportado e texto válido.|HTTP_HANDLER+SQL+TRANSPORT_STUB
B4-013|tests/e2e/administration.spec.ts:159|Cadastro ativo normal não verifica isActive=false aceito e persistido na criação com administrador.|HTTP_AUTH+SQL+BROWSER
B5-001|tests/integration/v4-workflows.test.mjs:537|Deduplicação no mesmo período não cobre cruzar meia-noite sem execução e recuperar lembretes devidos.|SQL+CONTROLLED_TIME
B5-002|tests/integration/v4-review.test.mjs:468|Hold por template é demonstrado, mas não exige retomada por API após aprovação sem duplicar envio.|SQL+HTTP+TRANSPORT_STUB
B5-003|tests/api/notifications.test.ts:59;tests/operational-contracts.test.ts:179|Timeout genérico e upload feliz não distinguem upload não concluído de mensagem com resultado incerto.|UNIT+SQL+TRANSPORT_STUB
B5-004|tests/requisition.test.ts:101;tests/template-registry.test.ts:48|Resumo básico não protege datas e semântica de conclusãoREQ, COM parcial e ENT cancelada em todos os presenters.|UNIT+PDF_CONTENT+HUMAN
B5-005|tests/requisition.test.ts:101;tests/template-registry.test.ts:88|Teste de resumo de comprovante não é decisão de minimização dos parâmetros/mídia externos reais.|UNIT+TRANSPORT_STUB+HUMAN+REMOTE
B5-006|tests/api/notifications.test.ts:132|Webhook de status não exige continuação recuperável para entrada válida ambígua ou recusada.|HANDLER+SQL+HUMAN+REMOTE
B5-007|tests/integration/v4-workflows.test.mjs:709|Não debitar é testado; UI não é obrigada a distinguir origemWhatsApp/Flow de visto no aplicativo.|SQL+BROWSER+HUMAN
B5-008|tests/integration/v4-workflows.test.mjs:709|Primeiro no-issues não cobre replay idêntico após sucesso com mesma sessão/chave.|SQL+HANDLER
B5-009|tests/operational-contracts.test.ts:99|Criptografia válida não testaHTTP421/427 e resposta de erros de sessão no protocolo cifrado do Flow.|HANDLER+CRYPTO+REMOTE
B5-010|tests/e2e/v4-review.spec.ts:214;tests/integration/v4-workflows.test.mjs:411|Sinal e documento vivo não cobrem efeitos dos consumidores de consumo/Flow/admin com objeto paciente compartilhado.|SQL+REALTIME+BROWSER
B5-011|tests/integration/v4-workflows.test.mjs:709|Propósito normal não exige rejeição cruzada de body no-issues em sessão de ocorrência.|UNIT+SQL+HANDLER
B5-012|tests/e2e/personal-workspace.spec.ts:8|Perfil feliz não cobre Auth confirma telefone e falha seguinte do vínculo interno antes da resposta.|AUTH_ADAPTER+SQL+HTTP+REMOTE
B5-013|tests/api/worker.test.ts:33;tests/database/notification-claim-recovery.sql:1|Webhook versus completion na mesma tentativa não cobre callback antigo encerrando lease nova.|SQL+CONTROLLED_INTERLEAVING+TRANSPORT_STUB
B5-014|tests/e2e/fluent-experience.spec.ts:222|Estados no sino não exigem referência/tentativa na fila administrativa para conciliação segura.|HTTP+BROWSER+HUMAN
B6-001|tests/api/requisition-persistence.test.ts:130;tests/document-pdf.test.ts:55|Snapshot persistido moderno não cobre reconstrução legada com data/paciente desconhecidos.|SQL+UNIT+PDF_CONTENT+HUMAN
B6-002|tests/document-pdf.test.ts:55|Título/páginas não distinguem createdAt do draft da emissão efetiva no PDF.|SQL+PDF_CONTENT+HUMAN
B6-003|tests/api/requisition-persistence.test.ts:130|REQ usa nome original; história supply e diretório atual exigem outro caso de autor renomeado.|SQL+HTTP+PDF_CONTENT
B6-004|tests/document-pdf.test.ts:55;tests/operational-contracts.test.ts:223|Não exige ressalvas e natureza returned/received/missing no conteúdo PDF.|SQL+PDF_CONTENT+VISUAL_REVIEW
B6-005|tests/document-pdf.test.ts:12|Sem exigir grupos, atores e versão da contagem efetivamente aprovada no PDF.|SQL+PDF_CONTENT+VISUAL_REVIEW
B6-006|tests/document-pdf.test.ts:21|HelperREQ tem cancelado, mas PDF/layout por tipo não é confrontado com instruções terminais.|UNIT+PDF_CONTENT+VISUAL_REVIEW
B6-007|tests/document-pdf.test.ts:84|80 linhas com palavras comuns não exercitam uma única linha maior que página com nome contínuo válido.|PDF_GEOMETRY+VISUAL_REVIEW
B6-008|tests/files.test.ts:37|Nome do teste promete conteúdo passivo; assertions só exigem determinismo e uma página, sem preservar anotação visível.|UNIT+PDF_CONTENT+VISUAL_REVIEW
B6-009|tests/e2e/fluent-experience.spec.ts:69|Histórico mostrado não exige percurso acionável para obter representação da versão antiga.|HTTP+BROWSER+PDF_CONTENT
B6-010|tests/integration/v4-workflows.test.mjs:51|Saldo e parcialidade não verificam identidade de cada parcela no snapshot/evento da declaração.|SQL+HTTP+PDF_CONTENT
B6-011|tests/files.test.ts:37;tests/document-pdf.test.ts:55|Determinismo não verifica hash real do objeto baixado do cache contra registro antes de retornar.|UNIT+STORAGE_ADAPTER+HTTP
B6-012|tests/e2e/accessibility-audit.ts:1;tests/document-pdf.test.ts:55|AxeHTML não inspeciona Lang, tags, ordem e navegação dos PDFs; leitor de tela ausente.|PDF_STRUCTURE+HUMAN+ASSISTIVE_TECH
B6-013|tests/document-pdf.test.ts:55|Presença de arquivo não exige contexto e estado por linha na tabelaREQ.|PDF_CONTENT+HUMAN
B7-001|.github/workflows/ci.yml:1;vercel.json:1|Sucesso de build não prova todos os gates no mesmoSHA; CI do SHA documental não é disparada por este push.|CI_METADATA+RELEASE_GATE+REMOTE
B7-002|tests/api/notifications.test.ts:31;tests/e2e/v4.spec.ts:268|Providerunit e disponibilidade simulada no navegador não confrontam anúncio daAPI com configuração completa/recusada.|HANDLER+CONFIG_MATRIX+TRANSPORT_STUB
B7-003|scripts/check-contracts.mjs:1;.github/workflows/ci.yml:25|Imutabilidade e migrations em CI não atestam release com schema/config efetivos no mesmo ambiente.|RELEASE_PREFLIGHT+REMOTE
B7-004|scripts/backup-local-database.mjs:1|TOC não prova cron/Vault/network em quarentena antes de reconciliação e ativação explícita no restore.|ISOLATED_RESTORE+NETWORK_DENY+HUMAN
B7-005|tests/files.test.ts:37;tests/e2e/personal-workspace.spec.ts:8|Arquivo local válido e avatar pequeno não atravessam teto de ingressoVercel com margem de multipart.|UNIT+HTTP+REMOTE+DEVICE
B7-006|next.config.ts:1;proxy.ts:1|Ausência de headers é observação limitada; não há contrato automatizado por shell/rota e proteção de preview.|HTTP_HEADERS+REMOTE
B7-007|package-lock.json:1;.github/workflows/ci.yml:25|Audit de árvore não é prova de exploração; dependência dev exige triagem de flag e uso real, sem auditfix cego.|STATIC+DEPENDENCY_TRIAGE
"""
specs = {}
for line in SPEC.strip().splitlines():
    key, tests, gap, layers = line.split("|")
    specs[key] = (tests, gap, layers)

def pick(row, *keys):
    return next((row[key] for key in keys if row.get(key)), "")

def criteria(row):
    positive = pick(row, "acceptance", "acceptance_criteria", "future_acceptance_positive", "expected_contract", "expected")
    negative = row.get("future_acceptance_negative", "")
    return positive + (" Contraprova: " + negative if negative else "")

rows = []
for primary, source in findings.items():
    if primary in aliased:
        continue
    if primary not in specs:
        raise ValueError("Missing deliberate coverage mapping: " + primary)
    tests, gap, layers = specs[primary]
    ids = [primary, *ALIASES.get(primary, "").split()]
    all_sources = [findings[item] for item in ids]
    current = "Cenário exato não reexecutado; checks vizinhos do baseline histórico não bastam para este limite."
    if primary in {"B1-DOC-001", "B6-002", "B6-004", "B6-005", "B6-006", "B6-007", "B6-013"}:
        current = "Cinco testes PDF atuais PASS na B8 com renderizador idêntico; sem expectativa semântica do achado. Mutante sem texto também PASS."
    if primary == "B1-TEXT-002":
        current = "Assertions de headings fixam o texto atual; aceitação futura deve seguir decisão editorial, não o defeito observado."
    if primary == "B1-QA-001":
        current = "CI histórica 40656069166: Chromium39/40, retry falhou. B8 reproduz ramo incorreto em DOM controlado; não mede frequência."
    human = "Sim: compreensão, revisão visual ou processo material" if any(x in layers for x in ["HUMAN", "VISUAL_REVIEW", "PDF_CONTENT", "ASSISTIVE_TECH"]) or primary.startswith("B1-") else "Não para o oráculo técnico; aceite operacional geral separado"
    device = "Sim: aparelho/tecnologia assistiva ou impressão" if any(x in layers for x in ["DEVICE", "ZOOM", "ASSISTIVE_TECH", "VISUAL_REVIEW"]) or primary in {"B1-FORM-005", "B1-UX-005", "B1-STATE-005", "B2-006", "B1-A11Y-002"} else "Não para o ensaio isolado; matriz móvel/humana permanece pendente"
    remote = "Sim, homologação controlada do serviço/plataforma" if "REMOTE" in layers else "Não para regressão local; release remoto exige autorização e gates próprios"
    decision = pick(source, "pending_decision", "decision_pending", "product_decisions", "decision", "human_decision", "decision_owner")
    correct = criteria(source)
    if primary == "B3-013":
        correct += " Destinatários globais sem membership recebem somente a invalidação autorizada que lhes corresponde, sem payload privado."
    if primary == "B5-010":
        correct += " Exigir o mesmo caso de duas sessões para consumo, FlowReviews e fila administrativa; preservar edição e descartar resposta antiga."
    row = {
        "regression_id": f"B8-R{len(rows)+1:03}", "primary_finding": primary,
        "source_ids": ";".join(ids), "priority_inherited": source.get("priority", ""),
        "cause_title": source["title"], "cause": pick(source, "cause", "root_cause", "probable_cause", "summary", "observed", "current_behavior"),
        "existing_checks": tests, "current_protection": (
            "NO_AUTOMATED_SEMANTIC_GUARD" if primary.startswith("REPO-") or primary in {"UX-010", "UX-011"}
            else "EXACT_FAILURE_REPRODUCED; QA-001 remains open" if primary == "B1-QA-001"
            else "WEAK_PDF_ORACLE; B8 blank-text mutation survived" if primary in {"B1-DOC-001", "B6-002", "B6-004", "B6-005", "B6-006", "B6-007", "B6-013"}
            else "PARTIAL_NEIGHBOUR_OR_GUARD; exact-gap detailed in next column"),
        "exact_coverage_gap": gap, "current_test_result": current,
        "controlled_reproduction": pick(source, "status", "state", "evidence_class", "confidence") + "; ver fontes originais para alcance e contraprovas",
        "original_evidence": ";".join(r["source_file"] + "#" + r["id"] for r in all_sources),
        "correct_behavior_after_decision": correct,
        "future_regression": "Oráculo positivo + negativo: " + correct + " Conferir estado persistido/evento/ator/versão/ledger quando houver escrita; em erro, conferir ausência de efeitos adicionais.",
        "test_layers": layers, "cross_layer": "Sim" if "+" in layers else "Caso técnico isolado com release integrado posterior",
        "human_validation": human, "physical_or_assistive_validation": device,
        "remote_homologation": remote, "pending_decision": decision or "Preservar contrato; definir critério/orçamento antes de implementar se houver alternativa de produto.",
        "implementation_status": "NOT_STARTED_PHASE_D; reproduction is diagnostic, not acceptance of defective behavior",
    }
    rows.append(row)

represented = {item for row in rows for item in row["source_ids"].split(";")}
assert represented == set(findings)
assert set(specs) == {row["primary_finding"] for row in rows}
with (OUT / "REGRESSION_COVERAGE_MATRIX.csv").open("w", encoding="utf-8", newline="") as file:
    writer = csv.DictWriter(file, fieldnames=list(rows[0]))
    writer.writeheader()
    writer.writerows(rows)
(OUT / "evidence/regression-reconciliation.json").write_text(json.dumps({
    "originalSources": source_rows, "originalFindings": len(findings), "regressionFamilies": len(rows),
    "representedOriginalIds": len(represented), "missingOriginalIds": sorted(set(findings) - represented),
    "verifiedAliasLinks": sum(len(value.split()) for value in ALIASES.values()),
    "limits": "Families group only documented revalidations. Different mechanisms remain separate. B1-UX-007 and UX-006 contain broader observations; related admin pagination/navigation have their own primary rows. No Phase C prioritization or implementation was performed.",
}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"originalFindings": len(findings), "regressionFamilies": len(rows), "missing": len(set(findings) - represented)}))
