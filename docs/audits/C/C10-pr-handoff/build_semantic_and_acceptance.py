"""Reconcile documentary matrices from authored reviews, never run product tests."""
from pathlib import Path
import csv
import hashlib
import importlib.util
import json
import gzip
import io

ROOT = Path(__file__).resolve().parents[4]
BASE = ROOT / "docs/audits/C"
C7 = BASE / "C7-decision-closure"
C9 = BASE / "C9-acceptance-refinement"


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


def read(path):
    with path.open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def write(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(dict.fromkeys(k for r in rows for k in r)), lineterminator="\n")
        w.writeheader()
        w.writerows(rows)


def text(path, value):
    path.write_text(value.strip() + "\n", encoding="utf-8")


def original(relative):
    path = BASE / "C10-pr-handoff/inputs" / ("docs__audits__C__" + relative.replace("/", "__") + ".gz")
    return list(csv.DictReader(io.StringIO(gzip.decompress(path.read_bytes()).decode("utf-8-sig"))))


AUTH = {
    "REQ": "Profissional solicita; família/admin elegível com req.science; conta sem vínculo e revogada como negativas",
    "COM": "Família/admin com capacidade COM por etapa; profissional sem capacidade como negativa",
    "ENT": "Emissor autorizado, Sheila recebedora designada, Juliana terceira e admin sem poder de aceite alheio",
    "BAL": "Juliana contadora efetiva, Sheila substituta formal; família/revisor distinto quando revisão iniciada",
    "ESC": "Gestor/proponente e aprovador legítimo da proposta; profissional de outro paciente sem acesso",
    "EST": "Ator com capacidade na custódia; equipe sem leitura geral familiar; conta revogada sem escrita",
    "CAT": "Gestor catalog.manage do paciente; delegado sem access.manage; outro paciente negado",
    "CON": "Relator individual e confirmador pela capacidade/custódia; terceiro sem capacidade não decide",
    "ID": "Titular autenticado, admin local de A e global em contextos distintos; usuário sem vínculo/revogado",
    "ARQ": "Titular do draft/reserva e acesso ao paciente/alvo; outra conta não lê preenchimento privado",
    "NOT": "Destinatário vigente, operador global/suporte autorizado e terceiro sem acesso; serviço em RPC allowlist",
    "DOC": "Leitor autorizado à versão/exemplar; verificador público só integridade mínima; solicitante não é signatário pessoal",
    "ADM": "Admin local de A; proposta global decidida por outra identidade local; B e sem vínculo negados",
    "GUI": "QA/operador em destino autorizado; proprietário/titular/substituto reais a designar quando exigidos",
}

EFFECTS = {
    "REQ": "Preservar protocolo, modo/instante da observação, ciência e atendimento separados; observação não altera ledger",
    "COM": "Crédito FAMILY só na validação da parcela, uma vez; previsão/aquisição/dispensa não fabricam unidades",
    "ENT": "Conservar origem+trânsito+destino; crédito só de aceite pessoal e quantidade real; eventos não apagados",
    "BAL": "Autosave sem efeito; contagem/aplicação explícita e revisão facultativa distinta; preservar autores/versões e ajuste identificado",
    "ESC": "Só decisão válida publica ocorrência; corte/prazo/atribuição preservados; agenda não comprova presença",
    "EST": "Ledger imutável, quantidade exata e saldo não negativo; compensação referenciada, nenhum UPDATE de saldo",
    "CAT": "Identidades/FKs/fatores históricos preservados; inativação não altera saldo",
    "CON": "Relato/complemento não debita; decisão confirmada única por versão; original/autoria preservados",
    "ID": "Nenhuma escrita negada; conservar último admin, autorias e acesso legítimo a outros pacientes",
    "ARQ": "Draft não cria protocolo/PDF/ciência/ledger; ready e arquivo oficial não são apagados no descarte",
    "NOT": "Aviso/transport read/seen não são aceite nem leitura integral; conteúdo/destinatário mínimo e outbox deduplicado",
    "DOC": "Versão e emissão distintas; bytes históricos intactos; hash final externo; assinatura técnica não é ato físico",
    "ADM": "Versão/intenção/segunda identidade preservadas; leitura/filtro não decide proposta nem expõe outro paciente",
    "GUI": "Nenhuma contratação/envio/restore/alteração remota implícita; histórico e conjunto de gates conservados",
}

CONTRACT = {
    "REQ": "/api/requisitions; acknowledge_requisition; requisition_lifecycle/requisition_science_events",
    "COM": "/api/documents; document_command; purchase_receipts e validação por receiptId",
    "ENT": "/api/documents/:id; document_command receive/resolve/cancel/consent_cancel; stock_movements",
    "BAL": "/api/balances e /api/documents; bal_cycles/assignments/approvals; count_version/reference_revision",
    "ESC": "/api/schedules; schedule_command; shift_series/scheduled_shifts/shift_events",
    "EST": "/api/stock/movements e balances; family_stock_movement; stock_movements/history",
    "CAT": "/api/admin e catalog/presentations; care_recipient_products/product_presentations/measurement_units",
    "CON": "/api/consumption; consumption_reports; confirm_extraordinary_consumption",
    "ID": "/api/profile,/api/context,/api/admin; auth.sessions/profiles/memberships/authority_sessions",
    "ARQ": "/api/attachments; reserva/finalização e Storage privado; draft privado futuro separado do ato oficial",
    "NOT": "run_operational_schedule/enqueue_scheduled_reminders; worker/webhook; outbox e operational_reminders; canais deferidos separados",
    "DOC": "/api/documents/:id/pdf; document_events/document_pdfs; registro futuro de emissões assinadas",
    "ADM": "/api/admin,/api/patient-settings,/api/dashboard; propostas/readmodels/paginação e revisões",
    "GUI": "Documentos/runbooks/guardas de ferramenta; configuração de release/backup só em autorização posterior",
}


def specs(codes, domains):
    return [f"docs/audits/C/C3-functional-specification/{domains[c]}.md" for c in codes]


def main():
    authored = module("review_design_data", C7 / "review_design_data.py")
    review = authored.reviews()
    assert set(review) == set(range(1, 122))
    domain_names = authored.DOMAINS
    cap_data = module("capability_case_design", C9 / "capability_case_design.py")
    causes = original("C1-consolidation/CAUSE_FAMILIES_MASTER.csv")
    sources = original("C1-consolidation/FINDINGS_165_SOURCE_CROSSWALK.csv")
    impacts = original("C4-technical-design/CHANGE_IMPACT_MATRIX.csv")
    accepts = original("C6-acceptance-handoff/ACCEPTANCE_CRITERIA_MASTER.csv")
    original_causes = {r["cause_id"]: dict(r) for r in causes}
    # A repeated generation replaces only authored supplemental rows.
    accepts = [r for r in accepts if not r["acceptance_id"].startswith("C7-AC-")]
    assert len(causes) == 121 and len(sources) == 165 and len(accepts) == 149
    by_cause = {r["cause_id"]: r for r in causes}
    by_accept = {r["cause_id"]: r for r in accepts}
    changes, semantic, association, cases = [], [], [], []
    original_cache = {}
    for index, cause in enumerate(causes, 1):
        item = review[index]
        codes = item["domains"].split("+")
        paths = specs(codes, domain_names)
        # Compare against the immutable baseline copy even on a repeated build.
        old = original_causes[cause["cause_id"]]
        for key, value in {"domain": domain_names[codes[0]], "decision_refs": item["decisions"], "specification": paths[0], "planned_package": item["lot"]}.items():
            if old[key] != value:
                changes.append({"cause_id": cause["cause_id"], "field": key, "before": old[key], "after": value, "basis": item["judgment"], "source_ids": cause["source_ids"]})
            cause[key] = value
        cause["additional_specifications"] = ";".join(paths[1:])
        cause["semantic_review"] = item["judgment"]
        cause["semantic_review_status"] = "REVIEWED_SOURCE_AND_EVIDENCE_STATIC"
        cause["negative_oracle"] = item["forbidden"]
        if index == 1:
            cause["open_condition"] = "OPS-01: manter/aposentar lembretes legados; não é decisão de estoque observado REQ"
        if index == 68:
            cause["correct_behavior"] = "Revogação/contexto confirmado enquanto o comando espera impede nova escrita após o lock; recusa não deixa movimento/evento parcial."
        if index == 77:
            cause["correct_behavior"] = "ENT informa revisão confirmada/versão/intenção quando submit falha; retoma sem duplicar. COM e BAL recebem casos equivalentes sem alegar prova anterior desses ramos."
        if index == 112:
            cause["correct_behavior"] = "Promoção exige validate Linux/Windows e DB/browser concluídos para mesmo candidato/schema/config. Preview documental autorizado é separado de promoção produtiva."
        semantic.append({
            "cause_id": cause["cause_id"], "source_ids": cause["source_ids"],
            "previous_domain": old["domain"], "verified_domains": ";".join(domain_names[c] for c in codes),
            "previous_package": old["planned_package"], "verified_package": item["lot"],
            "decision_refs": item["decisions"], "specifications": ";".join(paths),
            "judgment": item["judgment"], "discriminating_fixture": item["fixture"],
            "forbidden": item["forbidden"], "independent_oracle": item["oracle"],
            "evidence_method": "STATIC_ORIGINAL_FINDING_AND_REFERENCED_EVIDENCE;NO_NEW_RUNTIME_PROBE",
            "source_association_rows": ";".join(r["source_id"] for r in sources if r["cause_id"] == cause["cause_id"]),
            "review_status": "REVIEWED_INDIVIDUALLY", "product_status": cause["implementation_status"],
        })
        impact = next(r for r in impacts if r["cause_id"] == cause["cause_id"])
        impact.update({"domain": cause["domain"], "decision_refs": item["decisions"], "specification": paths[0], "planned_package": item["lot"], "additional_specifications": ";".join(paths[1:]), "api_database_contract": " ; ".join(CONTRACT[c] for c in codes), "event_snapshot_ledger": " ; ".join(EFFECTS[c] for c in codes), "semantic_review": item["judgment"], "ui_readmodel_change": cause["correct_behavior"], "ui_consumer": item["steps"]})
        acceptance = by_accept[cause["cause_id"]]
        acceptance.update({"decision_refs": item["decisions"], "planned_package": item["lot"], "positive_oracle": cause["correct_behavior"], "negative_oracle": item["forbidden"], "persistence_oracle": item["oracle"], "domain": cause["domain"], "specifications": ";".join(paths), "execution_status": "PLANNED_NOT_EXECUTED"})
        cases.append(case(acceptance, codes, item["fixture"], item["steps"], item["oracle"], item["judgment"]))

    for entry in sources:
        cause = by_cause[entry["cause_id"]]
        path = ROOT / entry["source_csv"]
        if path not in original_cache:
            original_cache[path] = read(path)
        source_record = original_cache[path][int(entry["source_record"]) - 1]
        assert source_record.get("id", source_record.get("finding_id")) == entry["source_id"]
        source_json = json.dumps(source_record, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        additional = []
        if entry["source_id"] == "UX-006":
            additional = ["C-CAUSE-014"]
        if entry["source_id"] == "B1-UX-007":
            additional = ["C-CAUSE-060"]
        observation = next((source_record[k] for k in ["observed", "current_behavior", "summary"] if source_record.get(k)), "")
        limit = "; ".join(source_record.get(k, "") for k in ["limits", "limitations", "counterproof", "countercheck_result"] if source_record.get(k))
        association.append({"source_id": entry["source_id"], "primary_cause_id": entry["cause_id"], "secondary_cause_ids": ";".join(additional), "source_csv": entry["source_csv"], "source_record": entry["source_record"], "source_row_sha256": hashlib.sha256(source_json.encode()).hexdigest(), "source_observation": observation, "source_evidence": entry["original_evidence"], "source_limits_and_counterproof": limit, "judgment": cause["semantic_review"], "association_decision": "RETAIN_PRIMARY_AND_EXPLICIT_SECONDARY" if additional else "RETAIN_PRIMARY_WITH_MANIFESTATIONS", "status": "REVIEWED_INDIVIDUALLY_NO_REPRODUCTION"})
        entry.update({"decision_refs": cause["decision_refs"], "specification": cause["specification"], "planned_package": cause["planned_package"], "secondary_cause_ids": ";".join(additional)})

    capabilities = original("C4-technical-design/APPROVED_CAPABILITY_CHANGE_PLAN.csv")
    cap_rows = [line.split("|") for line in cap_data.CAPABILITY_TEXT.strip().splitlines()]
    assert len(cap_rows) == 28 and all(len(r) == 7 for r in cap_rows)
    for cells in cap_rows:
        number, domain, fixture, steps, expected, forbidden, oracle = cells
        cap_id = f"C-CAP-{int(number):03}"
        ac = by_accept[cap_id]
        cap = next(r for r in capabilities if r["capability_id"] == cap_id)
        codes = domain.split("+")
        paths = specs(codes, domain_names)
        if int(number) in {14, 27}:
            cap["planned_package"] = "D3"
        if int(number) == 20:
            cap["purpose"] = "Emissão com assinatura incorporada obrigatória e verificação do exemplar"
            cap["planned_contract"] = "Registro por emissão; assinar sistema antes de ready; comparar digest/cadeia; P09-B obrigatório"
        additional_decisions = {3:"P02",5:"P14",7:"P15",9:"P06;P07",12:"P11",13:"P08",14:"P08;P12",18:"P09",19:"P08",20:"P09;O10",26:"P03;P13",27:"O01;P04;P10"}.get(int(number), "")
        if additional_decisions:
            cap["decision_refs"] = ";".join(dict.fromkeys((cap["decision_refs"] + ";" + additional_decisions).split(";")))
        cap["c7_refinement"] = steps
        ac.update({"positive_oracle": expected, "negative_oracle": forbidden, "persistence_oracle": oracle, "decision_refs": cap["decision_refs"], "planned_package": cap["planned_package"], "domain": domain_names[codes[0]], "specifications": ";".join(paths), "execution_status": "PLANNED_NOT_EXECUTED"})
        designed_case = case(ac, codes, fixture, steps, oracle, "Refinamento individual de finalidade aprovada; não é novo defeito nem teste já escrito.")
        cap["pending_details"] = designed_case["decision_dependency"]
        cases.append(designed_case)

    for cells in [line.split("|") for line in cap_data.SUPPLEMENT_TEXT.strip().splitlines()]:
        assert len(cells) == 10, cells
        number, domain, lot, decisions, title, fixture, steps, expected, forbidden, oracle = cells
        codes = domain.split("+")
        ac = {k: "" for k in accepts[0]}
        ac.update({"acceptance_id": f"C7-AC-{int(number):03}", "cause_id": f"C7-REQ-{int(number):03}", "source_ids": "OWNER_C7_COMPLEMENT", "decision_refs": decisions, "planned_package": lot, "gate": "FIRST_RELEASE_REQUIRED_CONDITIONAL_DETAILS", "positive_oracle": expected, "negative_oracle": forbidden, "current_checks": "Não há teste executável novo nesta C", "current_gap": title + "; requisito TO_BE não implementado", "test_layers": "AUTH_RPC+HTTP+BROWSER;INDEPENDENT_READBACK;HUMAN_WHEN_APPLICABLE", "persistence_oracle": oracle, "human": "Revisão do público-alvo em D", "physical": "Matriz P10 quando pertinente", "remote": "Somente em homologação posterior autorizada", "decision_condition": decisions, "execution_status": "PLANNED_NOT_EXECUTED", "domain": domain_names[codes[0]], "specifications": ";".join(specs(codes, domain_names))})
        accepts.append(ac)
        cases.append(case(ac, codes, fixture, steps, oracle, title))

    assert len(accepts) == len(cases) == 161
    for ac in accepts:
        planned = next(r for r in cases if r["acceptance_id"] == ac["acceptance_id"])
        ac["decision_condition"] = planned["decision_dependency"]
        ac["design_status"] = planned["design_status"]
        ac["case_reference"] = "docs/audits/C/C9-acceptance-refinement/ACCEPTANCE_CASES.csv#" + ac["acceptance_id"]
    write(BASE / "C1-consolidation/CAUSE_FAMILIES_MASTER.csv", causes)
    write(BASE / "C1-consolidation/FINDINGS_165_SOURCE_CROSSWALK.csv", sources)
    write(BASE / "C4-technical-design/CHANGE_IMPACT_MATRIX.csv", impacts)
    write(BASE / "C4-technical-design/APPROVED_CAPABILITY_CHANGE_PLAN.csv", capabilities)
    write(BASE / "C6-acceptance-handoff/ACCEPTANCE_CRITERIA_MASTER.csv", accepts)
    write(C7 / "CAUSE_SEMANTIC_VERIFICATION.csv", semantic)
    write(C7 / "SOURCE_ASSOCIATION_REVIEW.csv", association)
    write(C7 / "SEMANTIC_CHANGES.csv", changes)
    write(C9 / "ACCEPTANCE_CASES.csv", cases)
    gaps = [{k: r[k] for k in ["acceptance_id", "cause_or_decision", "planned_package", "release_gate", "design_status", "decision_dependency", "human_device_provider_requirement", "automation_plan", "execution_status"]} for r in cases]
    write(C9 / "C9_GAP_AND_DECISION_MATRIX.csv", gaps)
    text(C7 / "SEMANTIC_CHANGE_REPORT.md", """# Resultado da revisão semântica

121 causas e 165 associações de origem foram lidas individualmente contra
o achado/evidência, suas contraprovas e limites. Não houve nova reprodução
funcional. IDs, agrupamentos e prioridades históricos foram preservados.
As [justificativas por causa](CAUSE_SEMANTIC_VERIFICATION.csv) e
[por associação](SOURCE_ASSOCIATION_REVIEW.csv) registram o fundamento.

As alterações de domínio/decisão/spec/lote estão em
[SEMANTIC_CHANGES.csv](SEMANTIC_CHANGES.csv). Destaques:

- 001: lembretes legados por configuração, NOT/BAL/escala, D5; separado de
  049, lifecycle REQ, D1. Cursor BAL não prova nenhum dos dois mecanismos.
- 010: três variantes ENT/estoque/configuração BAL; 015: HTML COM/BAL além
  do PDF; 035: feedback COM preservado junto ao relato/consumo.
- 063: snapshots documentais, sem afirmar cópia recursiva integral.
- 073: candidato inválido no scheduler comum, com impacto REQ, D1.
- 075: testar chave estável tanto no alias administrativo observado em A
  quanto no consumidor de settings observado em B4.
- 077: fonte reproduziu ENT, não COM; recuperação de revisão/submit cobre
  ENT/COM/BAL em D3, sem atribuir prova inexistente a essas duas variantes.
- 086: lembretes internos legados em D5; Meta/Flows continuam D7 diferida.
- 095: consumo/FlowReviews/fila administrativa dependem da revisão da
  consulta; D3, sem aguardar instalação PWA.
- 116: arquivo/transporte em D4; sanitização posterior não resolve teto.
- 119: desenhar oráculo em D0 e integrá-lo ao conteúdo D4; PDF vazio deve
  falhar mesmo com assinatura e hash válidos.

UX-006 conserva associação primária 013 e explicita navegação em 014.
B1-UX-007 conserva 059 e explicita auditoria em 060. Revalidações B8 não
fundem riscos citados só como dependência. DB-006 não foi unido a DB-002.
Limites permanecem: prova estática não vira produção; amostra local não vira
SLO; hash/QR não viram autoria pessoal ou fato físico.

Os 149 aceites anteriores foram refinados individualmente; 12 requisitos
complementares receberam IDs C7-AC. Total canônico: 161 critérios/casos de
design, todos PLANNED_NOT_EXECUTED. Não são 161 testes executáveis escritos.
""")
    print(json.dumps({"causes": len(causes), "source_associations": len(association), "changed_fields": len(changes), "criteria": len(accepts), "cases": len(cases)}, ensure_ascii=False))


def case(ac, codes, fixture, steps, oracle, rationale):
    target = ac["cause_id"]
    owner = []
    if target in {"C-CAUSE-041", "C-CAP-003", "C7-REQ-012"}:
        owner = ["P02:classificação individual SCI-001–005"]
    if target in {"C-CAUSE-005", "C-CAUSE-063", "C-CAUSE-072"}:
        owner = ["PERF-01:orçamento de volume/latência"]
    if target in {"C-CAUSE-062", "C-CAUSE-115", "C-CAP-026", "C7-REQ-009"}:
        owner += ["P03:parâmetros/custos/donos", "P13:prazos de falha"]
    if target in {"C-CAUSE-070", "C7-REQ-005"}:
        owner += ["P15:transporte/TTL de arquivo quando aplicável; comando crítico já aprovado"]
    if target in {"C-CAP-020", "C7-REQ-011", "C7-REQ-002"}:
        owner += ["P09:certificado/cadeia/perfil/custo; assinatura B obrigatória"]
    if target in {"C-CAUSE-052", "C-CAUSE-080", "C-CAUSE-107", "C-CAP-013", "C-CAP-019", "C7-REQ-004"}:
        owner += ["P08:retenção por classe; sem TTL automático aprovado"]
    if target in {"C-CAP-009", "C7-REQ-010"}:
        owner += ["P07:equivalência de devolução antes de remover UI antiga"]
    if target in {"C-CAUSE-001", "C-CAUSE-086"}:
        owner += ["OPS-01:retenção/catch-up do mecanismo legado"]
    if target in {"C7-REQ-008", "C-CAP-002"}:
        owner += ["P13:limiares/prazos/donos; segregação já aprovada"]
    lot = ac["planned_package"]
    physical = target in {"C-CAUSE-008", "C-CAUSE-111", "C-CAP-001", "C-CAP-002", "C-CAP-018"}
    requirement = "Ensaio local fictício primeiro; tarefa humana/AT conforme superfície, sem homologação em C"
    design = "DESIGN_READY"
    if physical:
        requirement = "NEEDS_REAL_HARDWARE:P10 notebook/tablet Android/celular Android/iPhone; OS/browser/AT/impressora e participantes a registrar em D6"
        design = "NEEDS_REAL_HARDWARE"
    if lot == "D7":
        requirement = "EXTERNAL_PROVIDER_REQUIRED:ativação Meta/Flows diferida; transporte controlado antes de homologação autorizada"
        design = "EXTERNAL_PROVIDER_REQUIRED"
    if any(s.startswith("P02:") for s in owner):
        design = "BLOCKED_BY_OWNER_DECISION"
    if lot == "D6":
        requirement = "Homologação humana/operacional/remota autorizada; destino isolado e componentes reais; não substituível por mock/TOC"
    return {
        "acceptance_id": ac["acceptance_id"], "cause_or_decision": target,
        "source_ids": ac["source_ids"], "decision_refs": ac["decision_refs"],
        "risk_and_semantic_review": rationale,
        "precondition": "Somente no lote D autorizado, com baseline/destino conferidos; " + fixture,
        "actors_and_permissions": AUTH[codes[0]],
        "test_data": fixture + "; dados/contas fictícios A/B, sem envio externo na etapa local",
        "action_steps": "1. Capturar estado inicial. 2. " + steps + ". 3. Exercitar contraprova descrita. 4. Reconsultar por canal independente e guardar evidência do SHA.",
        "expected": ac["positive_oracle"], "forbidden": ac["negative_oracle"],
        "independent_oracle": oracle,
        "side_effects": " ; ".join(EFFECTS[c] for c in codes),
        "authorization": AUTH[codes[0]] + "; revalidar após espera no comando; negativa não deixa efeito parcial",
        "ui_states": "Quando houver UI: loading/empty consultado/error/stale/offline/conflict/success/uncertain; manter foco/edição e barreira P15. Ferramenta sem UI registra saída/erro próprios.",
        "pdf_event": "Snapshot/evento/ator/versão do fato; PDF/exemplar quando aplicável. Save de draft e leitura não geram ato oficial.",
        "failure_recovery": "Perder resposta antes/depois da confirmação; consultar mesma intenção e congelar conteúdo incerto. Recusa comprovada conserva valores e não duplica efeitos. Em ferramenta somente leitura, nova saída nunca sobrescreve prova histórica.",
        "layer": ac["test_layers"], "fixture": "FX-" + ac["acceptance_id"],
        "automation_plan": "Implementar regressão discriminante no lote indicado; controle válido passa e a contraprova proibida falha; conteúdo/ledger/read-back independem da resposta HTTP. Nenhum teste novo foi executado em C.",
        "accessibility_mobile": "Quando houver UI: teclado/foco/aria-error, 320/390/768/1440 e zoom400%; tabela com rolagem só local; AT/aparelho real em D6. Incomplete axe gera revisão, não selo de conformidade.",
        "human_device_provider_requirement": requirement,
        "source_specifications": ac.get("specifications", ""), "planned_package": lot,
        "release_gate": ac["gate"], "decision_dependency": ";".join(owner) or "NONE_OPEN_FOR_DESIGN;autorização D e gates reais continuam necessários",
        "design_status": design, "implementation_readiness": "NOT_TESTABLE_BEFORE_IMPLEMENTATION;design pronto/condicional conforme design_status",
        "execution_status": "PLANNED_NOT_EXECUTED",
    }


if __name__ == "__main__":
    main()
