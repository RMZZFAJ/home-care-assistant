"""Apply the final explicit owner decisions to living documentary records."""
from pathlib import Path
import csv
import gzip
import io
import json
import re

ROOT = Path(__file__).resolve().parents[4]
C = ROOT / "docs/audits/C"
AUTHORITY = "docs/audits/C/C10-pr-handoff/final-closure/OWNER_COMPLEMENT_ORDER.md"


def original_text(path):
    baseline = json.loads((C / "C10-pr-handoff/final-closure/evidence/BASELINE.json").read_text(encoding="utf-8"))
    entry = next(r for r in baseline["archives"] if r["path"] == path.relative_to(ROOT).as_posix())
    return gzip.decompress((ROOT / entry["archive"]).read_bytes()).decode("utf-8-sig").replace("\r\n", "\n")


def read(path):
    with path.open(encoding="utf-8-sig", newline="") as stream:
        return list(csv.DictReader(stream))


def write(path, rows):
    stream = io.StringIO(newline="")
    writer = csv.DictWriter(stream, fieldnames=list(rows[0]), lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    path.write_text(stream.getvalue(), encoding="utf-8", newline="\n")


GATES = [
    ("P03", "OWNER_APPROVED_SCOPE_PENDING", "D6", "Recuperação e liberação operacional", "Responsável define externamente fornecedores/custos; frequência, retenção, destino, titular/substituto e perda/parada aceitáveis ainda precisam ser fechados; 1h/4h não são promessa", "Pesquisa comercial externa pelo responsável com ChatGPT; ensaio isolado, objetos/configuração/DB, quarentena e recuperação comprovada"),
    ("P05", "OWNER_APPROVED_SCOPE_PENDING", "D2/D4/D6", "Procedimentos excepcionais e responsabilidades", "Nomear pessoas/substitutos e definir segunda conferência/canais legítimos por fato; regularização familiar e PDF posterior já aprovados", "Aceite humano do procedimento, autores distintos e nenhuma assinatura em nome de ausente"),
    ("P07", "OWNER_APPROVED_SCOPE_PENDING", "D2", "Substituição segura de devolução por transferência", "Objetivo de UI simples preferencialmente ENT aprovado; equivalência/regressão e aceite de retirada do caminho antigo permanecem gates", "Matriz de fatos, custódias, aceite pessoal e não duplicação de movimentos; preservar UI antiga até prova"),
    ("P08", "OWNER_APPROVED_SCOPE_PENDING", "D3/D4/D6", "Retenção e exclusão", "Classes/finalidades, prazos, disputa e descarte precisam definição humana pertinente; nenhum TTL de 90/180 dias aprovado", "Compatibilidade entre draft privado, arquivo pronto, documento oficial, backup e preservação obrigatória"),
    ("P09", "OWNER_APPROVED_SCOPE_PENDING", "D4", "Implementação e homologação da assinatura criptográfica", "Assinatura incorporada do sistema é obrigatória; perfil/certificado/cadeia/chaves/TSA/custos e condições operacionais ainda a fechar externamente pelo responsável", "Pesquisa/contratação fora desta missão; prova de assinatura, cadeia e bytes finais no candidato; hash/QR não substituem assinatura"),
    ("P10", "OWNER_APPROVED_SCOPE_PENDING", "D6", "Homologação física", "Quatro classes de aparelho aprovadas; modelos/OS/navegadores, participantes, AT e impressão reais ainda a identificar", "Aceite por tarefas reais no mesmo SHA; emulação e documentação não equivalem à homologação física"),
    ("P13", "OWNER_APPROVED_SCOPE_PENDING", "D5/D6", "Alertas e monitoramento", "Segregação técnica global/suporte aprovada; limiares, severidade, prazos, titular/substituto/custos ainda a definir; pesquisa comercial externa", "Progresso/atraso observável, escalonamento testado e operação acordada; nenhum SLO ou atendimento 24h inventado"),
    ("P15", "OWNER_APPROVED_SCOPE_PENDING", "D1/D4", "Revogação e transporte de arquivos", "Revalidar comando após espera e barreira persistente aprovados; transporte de novo download e janela residual exigem desenho/aceite específicos", "Negativas após revogação, incerteza de comando e limite de cópia já entregue; TTL/proxy não presumidos como aprovados"),
    ("OPS-01", "PENDING_OWNER", "D5/D6", "Mecanismos legados de agendamento", "Escolher retenção/aposentadoria e tratamento de períodos perdidos por mecanismo; correção BAL por plantão não prova todos os legados", "Inventário de produtores/consumidores, 101+ regimes, catch-up e alternativa verificável antes de desativar"),
    ("PERF-01", "PENDING_OWNER", "D1/D-LATER", "Desempenho e metas de aceitação", "Medir candidato e aprovar metas de volume/latência por superfície; nenhuma meta ou prazo de serviço inventado", "Medição autorizada com RLS preservada; otimização não substitui correção funcional ou aceite de UX"),
]


def main():
    science_path = C / "C7-decision-closure/SCIENCE_AND_ACKNOWLEDGEMENT_INVENTORY.csv"
    rows = read(science_path)
    policies = {
        "SCI-001": ("Manter ciência expressa no aplicativo", "SCIENCE", "express", "MANUAL_EXPRESS_ALLOWED", "NOT_THIS_SOURCE;USE_SCI_002", "NOT_THIS_SOURCE;SCOPED_TACIT_IS_SEPARATE", "NO;MANUAL_MODE_OF_ELIGIBLE_OBLIGATION", "SATISFIES_FAMILY_ANY_WITH_VALID_AUTHORITY"),
        "SCI-002": ("Substituir exposição do cabeçalho por diálogo antes da abertura; cancelar não registra", "SCIENCE", "dialog_confirmed_before_open", "MANUAL_FALLBACK_SCI_001", "APPROVED_EXPLICIT_CONFIRMATION_BEFORE_OPEN", "NOT_HEADER_EXPOSURE;SCOPED_TACIT_IS_SEPARATE", "NO;DIALOG_MODE_OF_ELIGIBLE_OBLIGATION", "SATISFIES_FAMILY_ANY_ONLY_AFTER_CONFIRMATION"),
        "SCI-003": ("Preservar leitura WhatsApp como evidência de comunicação, sem ciência automática; canal postergado", "COMMUNICATION_EVIDENCE", "whatsapp_read_communication_evidence", "NO;COMMUNICATION_ONLY", "NO;COMMUNICATION_ONLY", "NO;COMMUNICATION_ONLY", "YES;READ_NEVER_AUTOMATICALLY_MEANS_SCIENCE", "NEVER_SATISFIES_SCIENCE"),
        "SCI-004": ("Preservar possibilidade futura de confirmação expressa identificada WhatsApp condicionada à homologação externa", "SCIENCE_FUTURE_DEFERRED_CHANNEL", "whatsapp_confirm", "IDENTIFIED_EXPRESS_CONFIRMATION_AFTER_HOMOLOGATION", "NOT_APP_DIALOG_SOURCE", "NO;IDENTIFIED_EXPRESS_CONFIRMATION_REQUIRED", "CHANNEL_DEFERRED;NO_ACTIVATION_NOW", "SATISFIES_FAMILY_ANY_ONLY_AFTER_VALID_IDENTIFIED_CONFIRMATION"),
        "SCI-005": ("Manter regra obrigatória permanente e não configurável na expedição oficial concluída; ator efetivo familiar autorizado; nunca rascunho/edição; não depende de created_by", "MANDATORY_SCIENCE_DISPATCH_INVARIANT", "dispatch", "NOT_A_CONFIGURABLE_MODE", "NOT_A_CONFIGURABLE_MODE", "NOT_A_CONFIGURABLE_MODE", "YES_MANDATORY_PERMANENT_NO_OPT_OUT_NO_ADMIN_OVERRIDE", "MANDATORY_FOR_AUTHORIZED_FAMILY_DISPATCH_ACTOR;NO_PHYSICAL_RECEIPT_OR_CONSUMPTION"),
    }
    for row in rows:
        id_ = row["science_id"]
        row["future_act_class"] = row["act_class"]
        row["future_registered_mode"] = "UNCHANGED_DISTINCT_ACT"
        row["future_aggregate_effect"] = "NO_SUBSTITUTION_BY_TACIT_SCIENCE"
        row["latest_authority"] = AUTHORITY
        if id_ in policies:
            decision, cls, mode, manual, dialog, tacit, fixed, aggregate = policies[id_]
            row["owner_response"] = decision
            row["owner_decided_at"] = "2026-11-04"
            row["policy_status"] = "OWNER_APPROVED"
            row["future_act_class"] = cls
            row["future_registered_mode"] = mode
            row["future_aggregate_effect"] = aggregate
            row["manual_eligible_proposal"] = manual
            row["dialog_on_open_eligible_proposal"] = dialog
            row["tacit_eligible_proposal"] = tacit
            row["non_configurable"] = fixed
            row["recommendation_not_approval"] = "SUPERSEDED_BY_OWNER_DECISION;SEE_owner_response_AND_SCIENCE_OWNER_REVIEW"
            row["risk_impact"] = "Preservar autoria/autorização, conteúdo material e eventos; abrir, comunicar, ler e receber são acontecimentos distintos"
            row["future_scope"] = "P02_OWNER_APPROVED;D2_IMPLEMENTATION_REQUIRED" + (";D7_EXTERNAL_HOMOLOGATION_CHANNEL_DEFERRED" if id_ in {"SCI-003", "SCI-004"} else "")
        elif id_ == "ACT-001":
            row["owner_response"] = "ANY familiar: ciência válida de qualquer pessoa habilitada satisfaz obrigação; mostrar Família ciente sem atribuir ciência às demais"
            row["owner_decided_at"] = "2026-11-04"
            row["policy_status"] = "OWNER_APPROVED"
            row["future_registered_mode"] = "DERIVED_FAMILY_ANY_NOT_PERSONAL_EVENT"
            row["future_aggregate_effect"] = "ANY_AUTHORIZED_PERSON;NEVER_REQUIRE_ALL;NO_ELIGIBLE_PERSON_MEANS_PENDING"
            row["risk_impact"] = "Agregado não é ciência pessoal de todos nem conclusão jurídica sobre responsabilidade civil"
    write(science_path, rows)

    gate_rows = [{"gate_id": id_, "canonical_status": status, "blocks_general_D0": "NO", "blocks_independent_D1": "NO", "specific_package_gate": package, "blocked_scope": scope, "remaining_detail": detail, "acceptance_evidence_required": proof, "gate_passed": "NO_NOT_BY_DOCUMENTATION", "commercial_research_owner": "OWNER_EXTERNALLY_WITH_CHATGPT" if id_ in {"P03", "P09", "P13"} else "NOT_RESEARCHED_THIS_MISSION", "latest_authority": AUTHORITY} for id_, status, package, scope, detail, proof in GATES]
    write(C / "C7-decision-closure/GATE_CLASSIFICATION.csv", gate_rows)
    pending_by_id = {row["gate_id"]: row for row in gate_rows}

    p = C / "C7-decision-closure/PRODUCT_DECISIONS_C7_ADDENDUM.md"
    text = original_text(p)
    text = text.replace("Fonte humana: kit recebido em 04/11/2026 e duas atualizações expressas na\nmissão atual.", "Fonte humana: kit e atualizações de 04/11/2026, complementados pela\n[ordem definitiva](../C10-pr-handoff/final-closure/OWNER_COMPLEMENT_ORDER.md).")
    text = re.sub(r'- \*\*ID:\*\* P02\n.*?(?=- \*\*ID:\*\* P03)', '- **ID:** P02\n\n  **Status atual:** OWNER_APPROVED\n\n  **Decisão humana e limite restante:** SCI-001 mantida; SCI-002 dialogada\n  antes de abrir; SCI-003 comunicação sem ciência; SCI-004 futura expressa\n  condicionada à homologação; SCI-005 obrigatória, permanente e não\n  configurável. ANY familiar por pessoa habilitada; três modalidades por\n  obrigação elegível. Nenhuma escolha humana P02 pendente.\n\n  **Destino:** [Política vinculante](SCIENCE_OWNER_REVIEW.md); REQ/ENT; D2.\n\n', text, flags=re.S)
    text = text.replace("O inventário P02 usa o subestado requerido pela Ordem Mestre.", "A ordem complementar encerra a classificação individual P02 e prevalece\nsobre o subestado anterior.")
    text = text.replace("Demonstrações não aprovam políticas P02,\npermissões ou funcionalidades.", "Demonstrações não concedem\npermissões nem implementam funcionalidades; P02 foi aprovada pela ordem humana.")
    text = text.replace("Retenção\npor classe, fornecedores, metas e futuros criadores empresa/supervisão ficam\n`PENDING_OWNER`.", "Objetivos P03/P05/P07/P08/P09/P10/P13/P15 conservam\nOWNER_APPROVED_SCOPE_PENDING; parâmetros/contratações não reabrem a decisão.\nEscolhas efetivamente não tomadas, como metas PERF-01 e governança OPS-01,\npermanecem PENDING_OWNER. Futuros criadores empresa/supervisão não foram\naprovados neste escopo.")
    text += "\n## Precedência definitiva e início futuro de D\n\nP02 está OWNER_APPROVED, conforme a política vinculante. Fornecedores, preços\ne contratação P03/P09/P13 serão pesquisados externamente pelo responsável com\nChatGPT. Nenhuma pesquisa comercial foi feita nesta missão. Os dez gates da\n[matriz canônica](GATE_CLASSIFICATION.csv) não impedem o início geral de D0\nou trabalhos independentes D1, mas bloqueiam seus ramos e homologações.\nDocumentação completa não aprova gates. Abrir branch D continua condicionado\nà integração prévia do PR 6 à master e à autorização da missão de D.\n"
    p.write_text(text, encoding="utf-8", newline="\n")

    p = C / "C2-decisions/DECISIONS_REGISTER.csv"
    rows = read(p)
    for row in rows:
        id_ = row["decision_id"]
        if id_ in {"P02", "DEC-002"}:
            row["status"] = "OWNER_APPROVED"
            row["policy_review_status"] = "OWNER_APPROVED;NO_HUMAN_P02_GATE"
            row["scope"] = "Política SCI-001–005 aprovada, ANY familiar por pessoa habilitada, três modalidades elegíveis, SCI-005 invariável sem opt-out; REQ materialmente imutável; ver SCIENCE_OWNER_REVIEW.md"
            row["implementation"] = "PLANNED_NOT_IMPLEMENTED;TECHNICAL_D_WORK_REMAINS"
            row["latest_authority"] = AUTHORITY
        if id_ in pending_by_id:
            gate = pending_by_id[id_]
            row["status"] = gate["canonical_status"]
            row["scope"] = gate["blocked_scope"] + ": " + gate["remaining_detail"] + "; não bloqueia D0 geral ou D1 independente"
            row["latest_authority"] = AUTHORITY
            row["policy_review_status"] = "APPROVED_OBJECTIVE_WITH_SPECIFIC_GATE;NOT_GENERAL_D_START_BLOCKER"
    write(p, rows)

    p = C / "C4-technical-design/APPROVED_CAPABILITY_CHANGE_PLAN.csv"
    capabilities = read(p)
    for row in capabilities:
        if row["capability_id"] == "C-CAP-003":
            row["pending_details"] = "NONE_OPEN_P02;SCI-004_EXTERNAL_HOMOLOGATION_DEFERRED;technical_D2_work_only"
            row["planned_contract"] = "Regra/preferência prospectiva por obrigação; ANY familiar; SCI-005 obrigatória por ator efetivo; conteúdo material separado de versão de eventos/PDF"
            row["c7_refinement"] = "Manual/dialogada/tácita elegíveis; cancelamento sem efeito; expedição por ator diferente do criador; flags falsas não desligam SCI-005; read WhatsApp não satisfaz ciência"
    write(p, capabilities)
    deps = {r["capability_id"]: r["pending_details"] for r in capabilities}
    p = C / "C2-decisions/DECISION_SPECIFICATION_CROSSWALK.csv"
    rows = read(p)
    for row in rows:
        id_ = row["decision_id"]
        if id_ in {"P02", "DEC-002"}:
            row["status"] = "OWNER_APPROVED"
            row["condition"] = "P02 integralmente aprovada; implementação D2 e homologação futura SCI-004 separadas de escolha humana"
        elif id_ in pending_by_id:
            gate = pending_by_id[id_]
            row["status"] = gate["canonical_status"]
            row["condition"] = gate["remaining_detail"] + "; gate específico " + gate["specific_package_gate"] + "; não impede D0 geral/D1 independente"
        else:
            associated = [deps[c] for c in row["capabilities"].split(";") if c in deps and not deps[c].startswith("NONE_OPEN")]
            row["condition"] = "; ".join(dict.fromkeys(associated)) or "Sem escolha humana adicional identificada nesta decisão; implementação e provas do candidato D continuam necessárias"
        row["latest_addendum"] = "docs/audits/C/C7-decision-closure/PRODUCT_DECISIONS_C7_ADDENDUM.md"
    write(p, rows)

    lines = ["# Gates remanescentes e escopo das decisões", "", "P02 está **OWNER_APPROVED**. SCI-001–SCI-005 e ANY familiar não aguardam", "nova aprovação. [Política vinculante](SCIENCE_OWNER_REVIEW.md).", "", "P03, P05, P07, P08, P09, P10, P13, P15, OPS-01 e PERF-01 **não impedem", "o início geral de D0 nem trabalhos independentes de D1**. Bloqueiam somente", "os ramos e homologações abaixo. Documentação completa não aprova o gate.", "", "Abrir branch D exige integração prévia do PR 6 à master e autorização da", "missão D. Esta C não faz merge e não inicia D.", ""]
    for gate in gate_rows:
        lines += [f"## {gate['gate_id']} — {gate['canonical_status']}", "", f"Ramo: **{gate['specific_package_gate']} — {gate['blocked_scope']}**.", "", gate["remaining_detail"] + ".", "", "Prova/aceite: " + gate["acceptance_evidence_required"] + ".", "", "Estado do gate: **NÃO APROVADO por este fechamento documental**.", ""]
    lines += ["## Contratações e decisões efetivamente humanas", "", "Fornecedores, preços e condições comerciais P03/P09/P13 serão pesquisados", "externamente pelo responsável com ChatGPT. Não houve pesquisa, recomendação", "comercial ou contratação nesta missão. Não inventar valores, garantias ou", "prazos de serviço. Somente escolha ainda não tomada recebe PENDING_OWNER;", "objetivo aprovado com parâmetros pendentes conserva OWNER_APPROVED_SCOPE_PENDING.", "", "O17/O18 e ativação Meta/WhatsApp/Flows permanecem OWNER_DEFERRED. P01/P04/", "P06/P11/P12/P14, direção visual e P02 já estão decididos nos limites expressos.", ""]
    (C / "C7-decision-closure/OPEN_DECISIONS.md").write_text("\n".join(lines), encoding="utf-8", newline="\n")
    (C / "C10-pr-handoff/OPEN_OWNER_GATES.md").write_text("# Gates após o fechamento definitivo C\n\nP02 está **OWNER_APPROVED**, inclusive SCI-005 obrigatória/permanente e ANY\nfamiliar. Não há formulário humano de classificação em branco. Consulte a\n[política vinculante](../C7-decision-closure/SCIENCE_OWNER_REVIEW.md).\n\nA fonte canônica de estados/ramos é a\n[matriz de gates](../C7-decision-closure/GATE_CLASSIFICATION.csv), com leitura em\n[decisões remanescentes](../C7-decision-closure/OPEN_DECISIONS.md).\nP03/P05/P07/P08/P09/P10/P13/P15/OPS-01/PERF-01 não impedem D0 geral ou D1\nindependente; seus ramos e homologações continuam condicionados. Contratações\nP03/P09/P13 são pesquisa externa do responsável com ChatGPT. Nenhum gate foi\naprovado por completar documentação.\n\nDraft PR 6 precisa ser integrado à master antes de abrir branch D. Merge e\nmissão D exigem autorização posterior. Produção NO-GO; D NÃO INICIADA.\n", encoding="utf-8", newline="\n")
    print("P02/DEC-002 approved; 5 SCI decisions + family ANY; 10 scoped gates; C2/C4 reconciled")


if __name__ == "__main__":
    main()
