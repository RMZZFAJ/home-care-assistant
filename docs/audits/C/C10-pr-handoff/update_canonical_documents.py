"""Apply the latest owner decisions to living plans; preserve dated evidence."""
from pathlib import Path
import csv
import gzip
import hashlib
import io
import runpy

ROOT = Path(__file__).resolve().parents[4]
BASE = ROOT / "docs/audits/C"
OUT = Path(__file__).resolve().parent
LOG = []


def read(path):
    with path.open(encoding="utf-8-sig", newline="") as stream:
        return list(csv.DictReader(stream))


def write_csv(path, rows):
    with path.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(dict.fromkeys(k for row in rows for k in row)))
        writer.writeheader()
        writer.writerows(rows)


def original(path):
    saved = OUT / "inputs" / (path.relative_to(ROOT).as_posix().replace("/", "__") + ".gz")
    return gzip.decompress(saved.read_bytes()).decode("utf-8")


def save(path, value, reason):
    before = path.read_bytes()
    after = (value.rstrip() + "\n").encode("utf-8")
    path.write_bytes(after)
    LOG.append({"path": path.relative_to(ROOT).as_posix(), "before_sha256": hashlib.sha256(before).hexdigest(), "after_sha256": hashlib.sha256(after).hexdigest(), "reason": reason})


UPDATES = {
    "REQ": "P02 segue OWNER_REVIEW_REQUIRED por SCI-ID. Abertura, ciência e leitura não se confundem. P12 aprova um draft de criação por tipo e retomada privada; observação antiga conserva instante. Blueprint REQ-01–05 e casos C9 detalham controles e oráculos.",
    "COM": "P14 foi aprovado: validar parcelas pertinentes e dispensar expectativa restante; com recebimento pendente, encerrar só expectativa e preservar status honesto. Não há opção de creditar quantidade inexistente. COM-03/04 e C7-AC-002 detalham parcelas e regularização.",
    "ENT": "P06 foi aprovado: sugestão de escala editável pela família para pessoa vinculada/elegível com motivo. Aceite físico pessoal permanece indelegável. P07 aprova interface simples preferencialmente ENT; antiga devolução só sai após equivalência demonstrada. P05 exige dossiê/PDF de regularização sem simular assinatura de desligado.",
    "BAL": "P11 foi aprovado: revisão facultativa no primeiro uso, sem fila universal. Contagem confirmada explicita efeito; autosave não aplica inventário e diferença não vira consumo inferido. Revisão iniciada tem autor/versão próprios e revisor distinto do contador efetivo. Reconto por substituta preserva original.",
    "STOCK_AND_CUSTODY": "P07 aprova interface simples baseada preferencialmente em ENT, condicionando retirada da UI antiga à equivalência. A taxonomia C7 distingue transferência física, COM, consumo, abertura, BAL, compensação e descarte; é proibido deslocamento fictício para ajustar saldo. P15 exige autoridade após espera no comando.",
    "IDENTITY_ACCESS_MEMBERSHIPS": "P01 aprova nome/função individual, registro quando aplicável e conferência familiar com autor/data/resultado; informado/conferido/validado externo são distintos. P15 aprova revalidação de comando e barreira persistente; arquivo já entregue tem limite próprio. O01 aprova tour opcional/reabertura pelo titular.",
    "ATTACHMENTS_AND_DRAFTS": "P12 aprova um rascunho de criação por usuário/paciente/tipo e contextuais por intenção/alvo; continuar ou descartar/iniciar. P08 separa save privado de documento, sem protocolo/PDF/ciência/ledger. Descarte não apaga ready/oficial/backups/preservação obrigatória; nenhum TTL automático de 90/180 dias aprovado.",
    "DOCUMENTS_PDFS_AND_INTEGRITY": "P09-B aprova assinatura criptográfica incorporada do sistema como mínimo obrigatório. Versão da ficha, emissão, hash canônico e hash dos bytes finais são distintos. Baixar mesmo exemplar conserva bytes; nova emissão tem ID/instante/solicitante/assinatura próprios. Perfil/cadeia/custo são gates, sem IP/GPS no PDF/QR por padrão.",
    "PWA_PUSH_AND_NOTIFICATIONS": "P02 permanece por tipo; P13 aprova segregação técnica para global/suporte e orientação operacional à equipe. P10 aprova quatro classes reais de aparelho, com modelos/versões a definir. Lembretes internos legados são D5/OPS-01, separados de Meta/Flows D7 diferidos.",
    "USER_GUIDES_AND_CONTINUITY": "O01+ aprova wizard próprio de preparação/criação exclusivamente ao global; família executa tarefas locais autorizadas. O01 aprova guia opcional no primeiro login configurável pela administração e reabrível no perfil. P03 proteção intermediária aprovada, 1h/4h são hipóteses; P05 regularização com PDF/aviso proporcional e P10 aparelhos reais.",
}


def main():
    # Canonical decision index retains original status/provenance columns.
    path = BASE / "C2-decisions/DECISIONS_REGISTER.csv"
    rows = list(csv.DictReader(io.StringIO(original(path))))
    statuses = {"P01":"OWNER_APPROVED", "P02":"OWNER_APPROVED_SCOPE_PENDING", "P03":"OWNER_APPROVED_SCOPE_PENDING", "P04":"OWNER_APPROVED", "P05":"OWNER_APPROVED_SCOPE_PENDING", "P06":"OWNER_APPROVED", "P07":"OWNER_APPROVED_SCOPE_PENDING", "P08":"OWNER_APPROVED_SCOPE_PENDING", "P09":"OWNER_APPROVED_SCOPE_PENDING", "P10":"OWNER_APPROVED_SCOPE_PENDING", "P11":"OWNER_APPROVED", "P12":"OWNER_APPROVED", "P13":"OWNER_APPROVED_SCOPE_PENDING", "P14":"OWNER_APPROVED", "P15":"OWNER_APPROVED_SCOPE_PENDING"}
    for row in rows:
        row["pre_c7_status"] = row["status"]
        row["latest_authority"] = "docs/audits/C/C7-decision-closure/PRODUCT_DECISIONS_C7_ADDENDUM.md"
        if row["decision_id"] in statuses:
            row["status"] = statuses[row["decision_id"]]
            row["supersession"] = "OWNER_C7_COMPLEMENT_2026-11-04;previous deliberation archived exactly"
        elif row["status"] == "DEFERRED":
            row["status"] = "OWNER_DEFERRED"
        elif "OWNER_DIRECTION_NEEDS_DETAIL" in row["status"]:
            row["status"] = "OWNER_APPROVED_SCOPE_PENDING"
        row["policy_review_status"] = "OWNER_REVIEW_REQUIRED" if row["decision_id"] == "P02" else "SEE_C7_SCOPE_AND_OPEN_DETAILS"
        if row["decision_id"] == "O01":
            row["scope"] += ";O01+ global-only residence wizard;optional first-login guide;user can reopen"
        if row["decision_id"] == "O10":
            row["status"] = "OWNER_APPROVED"
            row["scope"] += ";EXISTING_TO_PRESERVE;download same issuance vs emit new signed exemplar"
        if row["decision_id"] == "DEC-018":
            row["status"] = "OWNER_APPROVED_SCOPE_PENDING"
            row["scope"] += ";P09-B embedded system signature mandatory;certificate/profile/cost pending"
    write_csv(path, rows)
    crosspath = BASE / "C2-decisions/DECISION_SPECIFICATION_CROSSWALK.csv"
    cross = list(csv.DictReader(io.StringIO(original(crosspath))))
    decisions = {r["decision_id"]:r for r in rows}
    causes = read(BASE / "C1-consolidation/CAUSE_FAMILIES_MASTER.csv")
    capabilities = read(BASE / "C4-technical-design/APPROVED_CAPABILITY_CHANGE_PLAN.csv")
    for row in cross:
        row["status"] = decisions[row["decision_id"]]["status"]
        row["latest_addendum"] = decisions[row["decision_id"]]["latest_authority"]
        row["condition"] = "Classificação individual P02 ainda humana; demais aprovações/limites conforme adendo C7, não todas pendentes"
        linked_causes = [r for r in causes if row["decision_id"] in r["decision_refs"].split(";")]
        linked_caps = [r for r in capabilities if row["decision_id"] in r["decision_refs"].split(";")]
        row["causes"] = ";".join(r["cause_id"] for r in linked_causes)
        row["capabilities"] = ";".join(r["capability_id"] for r in linked_caps)
        row["specifications"] = ";".join(sorted({r["specification"] for r in linked_causes + linked_caps})) or "docs/audits/C/C7-decision-closure/PRODUCT_DECISIONS_C7_ADDENDUM.md"
    write_csv(crosspath, cross)
    for path in [BASE / "C2-decisions/HUMAN_DECISIONS_REVIEW.md", ROOT / "docs/decisions/PRODUCT_DECISIONS_MASTER.md"]:
        value = original(path)
        first, rest = value.split("\n", 1)
        link = "../C7-decision-closure/PRODUCT_DECISIONS_C7_ADDENDUM.md" if "C2-decisions" in str(path) else "../audits/C/C7-decision-closure/PRODUCT_DECISIONS_C7_ADDENDUM.md"
        save(path, first + "\n\n> Registro inicial preservado como história de deliberação. O\n> [adendo C7 de 04/11/2026](" + link + ")\n> contém as respostas atuais e prevalece: P09-B obrigatório, P11 facultativo,\n> P12 limite por tipo, O01+ wizard global e P02 por SCI-ID ainda pendente.\n> Recomendações/pendências abaixo não são todas as decisões vigentes.\n" + rest, "LATEST_OWNER_AUTHORITY_WITH_INITIAL_DELIBERATIONS_PRESERVED")

    for domain, update in UPDATES.items():
        path = BASE / f"C3-functional-specification/{domain}.md"
        value = original(path)
        if domain == "USER_GUIDES_AND_CONTINUITY":
            value = value.replace("Verificar preparação sem criar wizard obrigatório\n  adicional.", "Wizard de preparação por etapas, com criação exclusiva\n  ao administrador global; configuração não é homologação.")
        if domain == "DOCUMENTS_PDFS_AND_INTEGRITY":
            value = value.replace("Assinatura criptográfica do sistema é extensão P09, com chaves e\nconfiança explícitas", "Assinatura criptográfica incorporada do sistema é mínimo P09-B, com\nchaves/cadeia/custos a definir")
        if domain == "COM":
            value = value.replace("com fechamento condicionado a P14", "com fechamento P14 aprovado")
            value = value.replace("resumo atual e P14 definido", "resumo atual e regra P14 aprovada")
            value = value.replace("A UI mostra o ramo aprovado.", "P14 aprovou esses dois percursos conforme existência de parcela pendente.")
            value = value.replace("P14 é condição específica de D2, não de encerrar o planejamento C.", "P14 já foi aprovado; D2 implementará e demonstrará ambos os percursos legítimos.")
        if domain == "ENT":
            value = value.replace("Sem escala não presumir; P06 define exceção", "Sem escala não presumir; P06 permite escolha manual elegível pela família")
            start = value.index("Transferência simples proposta P07-A")
            end = value.index("## Recuperação, comunicação e provas", start)
            value = value[:start] + "P07 aprovou transferência simples preferencialmente no motor ENT: declaração\ndo iniciador, concordância da contraparte e aceite do recebedor real são\nfatos distintos quando as pessoas diferem. Se a mesma pessoa faz dois atos,\nresumo e eventos mantêm seus significados. Devolução física pode seguir esse\npercurso; compra, consumo, abertura e compensação permanecem próprios.\nA UI antiga só é retirada após equivalência/regressões demonstradas na D.\n\n" + value[end:]
        if domain == "STOCK_AND_CUSTODY":
            value = value.replace("Transferência proposta P07-A usa ENT", "Transferência simples aprovada P07 usa preferencialmente ENT")
            value = value.replace("P07-B exige mecanismo equivalente; C mantém o plano sem selecionar por conta\nprópria.", "A equivalência com devolução antiga será demonstrada antes de retirar UI;\nnão converter correção sem fato físico em transferência.")
        if domain == "IDENTITY_ACCESS_MEMBERSHIPS":
            value = value.replace("P01 define obrigatoriedade/verificação", "P01: função individual e registro quando aplicável; conferência familiar registrada")
            value = value.replace("P01/P15 permanecem condições humanas.", "P01 e garantia do comando P15 já foram aprovados; o transporte/TTL de arquivo e eventual validação externa têm gates próprios.")
        value += "\n## Atualização vinculante C7–C10\n\n" + update + "\n\nEsta atualização substitui alternativas/recomendações anteriores\nconflitantes; não anuncia implementação. Contrato detalhado no\n[adendo C7](../C7-decision-closure/PRODUCT_DECISIONS_C7_ADDENDUM.md),\n[blueprint C8](../C8-visual-blueprint/VISUAL_BLUEPRINT_BY_SCREEN.md) e\n[casos C9](../C9-acceptance-refinement/ACCEPTANCE_CASES.csv).\n"
        save(path, value, "OWNER_C7_RULES_SUPERSEDE_OLD_PROPOSALS;AS_IS_RETAINED")

    # Recalculate only the C3 field/screen index. The historical build_indexes
    # also rewrites acceptances, so it is deliberately not executed.
    parse = runpy.run_path(str(BASE / "C6-acceptance-handoff/format_documentation.py"))["parse_tables"]
    indexpath = BASE / "C3-functional-specification/SCREEN_FIELD_ACTION_INVENTORY.csv"
    index = list(csv.DictReader(io.StringIO(original(indexpath))))
    for domain in {r["domain"] for r in index}:
        path = BASE / f"C3-functional-specification/{domain}.md"
        tables = parse(path.read_text(encoding="utf-8"))
        fields = [(line,cells) for headers,records in tables if headers[0] == "Campo" for line,cells in records]
        screens = {cells[0]:(line,cells) for headers,records in tables if headers[0] == "Tela" for line,cells in records}
        scope_fields = [r for r in index if r["domain"] == domain and r["record_type"] == "FIELD"]
        assert len(fields) == len(scope_fields)
        for row,(line,cells) in zip(scope_fields, fields):
            assert row["field_label"] == cells[0]
            row.update({"source_line":line,"type_source":cells[1],"required_default":cells[2],"validation_unit":cells[3],"help_example":cells[4]})
        for row in [r for r in index if r["domain"] == domain and r["record_type"] == "SCREEN_ACTIONS"]:
            line,cells = screens[row["screen_scope"]]
            row.update({"source_line":line,"route_or_surface":cells[1],"actions_outcome":cells[2]})
    write_csv(indexpath, index)

    path = BASE / "C4-technical-design/PDF_VERIFICATION_ARCHITECTURE.md"
    save(path, """# Arquitetura de emissão e assinatura obrigatória

P09-B substitui o desenho anterior de hash primeiro/assinatura opcional.
Contrato técnico canônico em
[emissão e verificação C7](../C7-decision-closure/PDF_SIGNING_ISSUANCE_AND_VERIFICATION.md).
Nenhuma implementação ocorreu em C.

Identidade: documento/versão/hash canônico, renderer/classe, issuance_id,
solicitante/instante, certificado/chave, bytes finais e hash externo.
Download recupera emissão existente; nova emissão cria outra intenção/ID.
Retry da intenção recupera o mesmo resultado. Original/derivado têm origem
qualificada; não assinar retroativamente documento histórico como se fosse
o exemplar original.

Reservar intenção → compor fatos/atores/QR/metadados não sensíveis → conferir
conteúdo/geometria → assinar sistema → validar assinatura/cadeia → persistir
bytes finais imutáveis e ready/hash. Sem edição posterior e sem hash final
circular dentro do arquivo. Permissão revalidada antes de emitir/baixar.
Mismatch de cache não é entregue como íntegro nem substitui original.

Esquema incremental futuro separará emissão de versão, preservando
document_pdfs antigos e respectivas referências. Registro de emissão usa
unicidade da intenção e Storage privado, com estados reservada/assinando/
ready/falha/incerta. Reconciliar objeto/registro após falha sem nova emissão
silenciosa; não conceder DML geral ou expor chave privada.

Verificador compara exemplar/digest/assinatura/cadeia e diferencia falha,
ausência de referência e indisponibilidade. QR opaco não comprova bytes;
consulta pública não contém paciente/material/solicitante/IP. Signatário
técnico é sistema; solicitante não fez assinatura pessoal. Perfil PAdES,
certificado, guarda, TSA/custo e confiança são gates de escolha técnica,
não motivo para retirar assinatura incorporada do primeiro escopo.

Oráculos: duas emissões/uma versão, retry/download idêntico, edição externa,
QR copiado, cache alterado, histórico/legado e PDF sem texto. Hash/assinatura
válidos não provam conteúdo completo, acessibilidade ou fato físico.
Leitores/cadeia/TSA, AT e impressão reais são homologações posteriores.
""", "P09_B_MANDATORY_AND_DISTINCT_ISSUANCE_IDENTITY")
    path = BASE / "C4-technical-design/DRAFT_PERSISTENCE_AND_CONCURRENCY.md"
    value = original(path).replace("Mais de um rascunho mostra escolha por\n  título/data; não escolher o último silenciosamente.", "Um ativo por criação/usuário/paciente/tipo; contextual\n  por alvo/intenção. Continuar ou descartar/iniciar, sem lista infinita.")
    value += "\n## Refinamento aprovado C7\n\nP12 fixa limite por tipo de criação e chaves contextuais por alvo/intenção.\nP08 fixa objeto privado não oficial; save não gera protocolo, PDF, ciência,\nledger ou versão oficial. TTL automático não aprovado. RLS/RPC e índices\ndevem impor unicidade também sob dois aparelhos concorrentes, sem converter\ndraft documental antigo em objeto privado por simples renomeação.\nContrato de descarte/preservação e efeitos em\n[rascunhos C7](../C7-decision-closure/DRAFT_NON_OFFICIAL_CONTRACT.md).\n"
    save(path, value, "P12_UNIQUENESS_AND_NON_OFFICIAL_DRAFT_BOUNDARY")
    for name in ["ARCHITECTURAL_DECISIONS", "DATA_API_UI_EVENT_CONTRACTS", "MIGRATION_COMPATIBILITY_PLAN", "SECURITY_PRIVACY_AND_TRACEABILITY"]:
        path = BASE / f"C4-technical-design/{name}.md"
        value = original(path).replace("P09 extensão pendente", "P09-B assinatura incorporada obrigatória; perfil/custo pendentes")
        value += "\n## Precedência técnica C7–C10\n\nAs matrizes causais foram revisadas semanticamente, com domínios secundários\nexplícitos. P06/P11/P12/P14 e garantia de comando P15 já foram respondidos;\nP02 por SCI-ID, retenção, fornecedores e parâmetros operacionais continuam\ndelimitados em C7. P09-B é obrigatório, com identidade própria por emissão;\nnão ativar núcleo só de hash como substituto. Toda evolução de schema usa\nmigration incremental e preserva os 84 hashes históricos.\n[Adendo vigente](../C7-decision-closure/PRODUCT_DECISIONS_C7_ADDENDUM.md).\n"
        save(path, value, "LATEST_C7_TECHNICAL_DEPENDENCIES")

    path = BASE / "C5-execution-roadmap/PHASE_D_WORK_PACKAGES.md"
    value = original(path)
    value = value.replace("P02 para ciência tácita, P06/P07 para transferência simples,\nP11 para grupos de revisão e P14 para fechamento inferior.", "P02 por tipo de ciência e P07 para retirar UI antiga após equivalência.\nP06, revisão facultativa P11 e COM inferior P14 já foram aprovados.")
    value = value.replace("Assinatura técnica incorporada só no ramo P09\naprovado.", "Assinatura criptográfica incorporada do sistema é mínimo obrigatório\nP09-B; perfil/cadeia/custos permanecem gates de escolha/contratação.")
    value += "\n## Refinamento de sequência C7–C10\n\nD0 desenha também oráculo PDF vazio (119); D4 o integra ao renderer.\n001/086 são lembretes internos legados D5, separados de Meta D7; 073 é\nisolamento de candidato inválido no scheduler D1. 077 recuperação de\nrevisão/submit e 095 consumidores de listas são D3. Upload/transporte116 e\navatar80 ficam em D4 conforme gate/prioridade; não se espera D6 para definir\ncontrato. C8 é direção visual aprovada, podendo reconstruir composições\nproblemáticas na D com contratos preservados. D3 inclui wizard global e\nguia opcional; D6 recebe capturas reais/aceite.\nMatriz vigente:161 aceites planejados, nenhuma implementação em C.\n"
    save(path, value, "D0_D7_ORDER_REFINED_BY_SEMANTIC_REVIEW")
    path = BASE / "C5-execution-roadmap/RELEASE_CUTS_AND_GATES.md"
    value = original(path).replace("Assinatura\ncriptográfica adicional P09 não bloqueia núcleo de comparação de bytes se esse\nramo atender ao resultado aprovado.", "Assinatura\ncriptográfica incorporada P09-B é mínimo obrigatório. Núcleo só de hash não\nsatisfaz o primeiro escopo; perfil/cadeia/custos precisam ser fechados.")
    value += "\n## Gates atualizados C7\n\nDireção visual já aprovada; P02 por SCI-ID continua aberta. BAL tem revisão\nfacultativa no primeiro uso e não exige perfil exclusivo de supervisão para\ntodas as contagens. P04 ambiente separado, P06 recebedor manual apto, P12\nlimite de draft e P14 COM foram aprovados; faltam somente parâmetros\nexpressamente registrados em OPEN_OWNER_GATES. Esta missão abre Draft PR\nsem esperar toda CI, sem merge. Promoção produtiva requer nova autorização\ne todos os checks do mesmo SHA/schema/config.\n"
    save(path, value, "SIGNATURE_REQUIRED_OPTIONAL_BAL_AND_DRAFT_PR_BOUNDARY")
    deps = BASE / "C5-execution-roadmap/DEPENDENCY_SEQUENCE.csv"
    rows = list(csv.DictReader(io.StringIO(original(deps))))
    for row in rows:
        row["depends_on"] = row["depends_on"].replace("C6 documentary handoff", "C10 documentary handoff;new D authorization")
        row["decision_conditions"] = {"D0":"P04 separated environment approved;explicit local replacement consent/backup", "D1":"P15 command guarantee approved;technical regression required", "D2":"P02 per SCI-ID;P07 before old return UI removal;P06/P11/P14 approved", "D3":"P12 uniqueness approved;P08 retention details;P01 family verification approved", "D4":"P09-B mandatory;certificate/profile/cost;P08 retention;P15 file transport;P10 hardware", "D5":"P02 only if science;P13 thresholds/owners;OPS-01 legacy reminders", "D6":"P03 costs/owners/targets;P05 people/channels;P08 retention;P10 actual participants;P13 response", "D7":"OWNER_DEFERRED;new explicit provider activation authorization", "D-LATER":"Specific authorization;budget measured;O17/O18 deferred"}[row["package"]]
    write_csv(deps, rows)
    path = BASE / "C6-acceptance-handoff/PHASE_D_IMPLEMENTATION_HANDOFF.md"
    save(path, """# Handoff de implementação — entrada atualizada

**D NÃO INICIADA.** O fechamento C0–C6 foi refinado por C7–C10. Entrada atual:
[handoff C10](../C10-pr-handoff/PHASE_D_HANDOFF_UPDATED.md),
[decisões C7](../C7-decision-closure/PRODUCT_DECISIONS_C7_ADDENDUM.md),
[blueprint aprovado C8](../C8-visual-blueprint/VISUAL_BLUEPRINT_BY_SCREEN.md)
e [casos C9](../C9-acceptance-refinement/ACCEPTANCE_CASES.csv).

Matriz canônica neste diretório agora contém161 critérios de design:
121 causas,28 grupos de finalidade e12 complementos. Relatórios/manifestos
datados C6 continuam históricos, com suas contagens149 e provas da época.
Não reexecutar geradores C1–C6 sobre as novas matrizes: alguns reconstruiriam
propostas superadas. Validador vigente é o C10, documental e sem produto.

P02 individual permanece humana; direção visual já aprovada. P09-B é mínimo
obrigatório, P11 revisão facultativa, P12 um draft por criação/tipo e O01+
wizard global. Implementação, banco remoto, homologação/deploy, merge e
criação de branch D exigem missão posterior. Não usar histórico como permissão.
""", "LATEST_HANDOFF_POINTER_WITH_HISTORICAL_C6_PRESERVED")
    write_csv(OUT / "evidence/CANONICAL_UPDATE_LOG.csv", LOG)
    print(f"Updated {len(LOG)} living Markdown plans, decision/crosswalk indexes and C3 anchors; dated evidence unchanged.")


if __name__ == "__main__":
    main()
