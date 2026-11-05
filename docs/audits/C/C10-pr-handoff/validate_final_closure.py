"""Validate the current documentary complement without running product or DB."""
from pathlib import Path
import argparse
import ast
import csv
import gzip
import hashlib
import io
import json
import re
import subprocess
from urllib.parse import unquote

ROOT=Path(__file__).resolve().parents[4]
C=ROOT/"docs/audits/C"
HERE=Path(__file__).resolve().parent
FINAL=HERE/"final-closure"


def read(path):
    with path.open(encoding="utf-8-sig",newline="") as stream:
        return list(csv.DictReader(stream))


def git(*args):
    return subprocess.check_output(["git",*args],cwd=ROOT).decode("utf-8").strip()


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def original_rows(baseline,name):
    entry=next(r for r in baseline["archives"] if r["path"]==name)
    raw=gzip.decompress((ROOT/entry["archive"]).read_bytes()).decode("utf-8-sig")
    return list(csv.DictReader(io.StringIO(raw,newline="")))


def authored_targets():
    names=set(git("diff","--name-only","266c6541bd5d3268b7e08a839df601e823ec74b5","--","README.md","docs").splitlines())
    names|={p.relative_to(ROOT).as_posix() for directory in ["C7-decision-closure","C8-visual-blueprint","C9-acceptance-refinement","C10-pr-handoff"] for p in (C/directory).rglob("*") if p.is_file() and "__pycache__" not in str(p)}
    return {ROOT/n for n in names if n and (ROOT/n).is_file()}


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--write-report",action="store_true")
    parser.add_argument("--verify-manifest",action="store_true")
    args=parser.parse_args()
    baseline=json.loads((FINAL/"evidence/BASELINE.json").read_text(encoding="utf-8"))
    checks=[]
    def check(name,ok,details):
        checks.append({"check":name,"passed":bool(ok),"details":details})
    check("required_branch",git("branch","--show-current")=="audit/phase-b",git("branch","--show-current"))
    check("master_preserved",git("rev-parse","origin/master")==baseline["master"],git("rev-parse","origin/master"))
    forbidden=[]
    historical=[]
    for name,expected in baseline["tracked_worktree_sha256"].items():
        p=ROOT/name
        changed=not p.exists() or sha(p.read_bytes())!=expected
        if changed and name!="README.md" and not name.startswith("docs/"):
            forbidden.append(name)
        if changed and name.startswith(("docs/audits/A/","docs/audits/B/","docs/audits/_historical/","docs/audits/C/C0-baseline/")):
            historical.append(name)
    check("functional_support_tests_config_unchanged_from_entry",not forbidden,forbidden)
    check("historical_A_B_C0_preserved",not historical,historical)
    runtime_diff=git("diff","--name-only",baseline["head"],"--","src","supabase","tests","scripts",".github","package.json","package-lock.json","tsconfig.json","eslint.config.mjs")
    check("no_runtime_migration_test_ci_or_dependency_patch",not runtime_diff,runtime_diff.splitlines())
    check("temporary_kit_still_absent",not (ROOT/"HOME_CARE_ASSISTANT_C7_C10_PROTOTIPOS_KIT").exists(),"Original input kit remains removed")
    bad_archives=[]
    for row in baseline["archives"]:
        raw=gzip.decompress((ROOT/row["archive"]).read_bytes())
        if sha(raw)!=row["sha256"] or len(raw)!=row["bytes"]:
            bad_archives.append(row["path"])
    check("213_original_documents_roundtrip",len(baseline["archives"])==213 and not bad_archives,bad_archives)
    order_raw=gzip.decompress((FINAL/"inputs/OWNER_COMPLEMENT_ORDER.md.gz").read_bytes())
    check("owner_order_exact_bytes",sha(order_raw)==baseline["owner_order_sha256"],baseline["owner_order_sha256"])
    old_provenance=read(HERE/"evidence/INPUT_PROVENANCE.csv")
    bad=[]
    for row in old_provenance:
        if row["exact_archive"] and sha(gzip.decompress((ROOT/row["exact_archive"]).read_bytes()))!=row["sha256"]:
            bad.append(row["original_path"])
    check("earlier_87_input_archives_preserved",len(old_provenance)==87 and not bad,bad)
    reloc=read(HERE/"evidence/KIT_RELOCATION.csv")
    check("approved_html_and_8_png_exact",all(sha((ROOT/r["destination"]).read_bytes())==r["sha256"] for r in reloc if r["disposition"].startswith("MOVED")),"Approved prototype files unchanged")
    # Preserve original causal reasoning and raw source associations, without
    # treating new editorial findings as new product causes.
    causes=read(C/"C1-consolidation/CAUSE_FAMILIES_MASTER.csv")
    associations=read(C/"C7-decision-closure/SOURCE_ASSOCIATION_REVIEW.csv")
    impact=read(C/"C4-technical-design/CHANGE_IMPACT_MATRIX.csv")
    check("121_causes_165_associations",len(causes)==121 and len(associations)==165 and len({r["source_id"] for r in associations})==165,"No inflated/deleted product findings")
    source_errors=[]
    source_cache={}
    for row in associations:
        path=ROOT/row["source_csv"]
        source_cache.setdefault(str(path),read(path))
        record=source_cache[str(path)][int(row["source_record"])-1]
        digest=sha(json.dumps(record,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode())
        if digest!=row["source_row_sha256"] or record.get("id",record.get("finding_id"))!=row["source_id"]:
            source_errors.append(row["source_id"])
    check("raw_source_rows_and_hashes",not source_errors,source_errors)
    impact_by_id={r["cause_id"]:r for r in impact}
    misaligned=[r["cause_id"] for r in causes if any(r[k]!=impact_by_id[r["cause_id"]][k] for k in ["domain","decision_refs","specification","planned_package"])]
    check("cause_impact_alignment",not misaligned,misaligned)
    first=next(r for r in causes if r["cause_id"]=="C-CAUSE-001")
    req=next(r for r in causes if r["cause_id"]=="C-CAUSE-049")
    check("scheduler_DB006_distinct_REQ_DB002",first["domain"]=="PWA_PUSH_AND_NOTIFICATIONS" and first["planned_package"]=="D5" and req["domain"]=="REQ" and req["planned_package"]=="D1","Existing semantic corrections preserved")
    decisions=read(C/"C2-decisions/DECISIONS_REGISTER.csv")
    check("P02_and_DEC002_OWNER_APPROVED",all(next(r for r in decisions if r["decision_id"]==id_)["status"]=="OWNER_APPROVED" for id_ in ["P02","DEC-002"]),"No repeated human approval required")
    statuses={r["decision_id"]:r["status"] for r in decisions if re.fullmatch("P[0-9]{2}",r["decision_id"])}
    check("15_P_statuses_normalized",len(statuses)==15 and all(s in {"OWNER_APPROVED","OWNER_APPROVED_SCOPE_PENDING","OWNER_DEFERRED","PENDING_OWNER"} for s in statuses.values()),statuses)
    check("approved_objectives_keep_scope_pending",all(statuses[id_]=="OWNER_APPROVED_SCOPE_PENDING" for id_ in ["P03","P05","P07","P08","P09","P10","P13","P15"]),"Parameters do not reopen approved objectives")
    science=read(C/"C7-decision-closure/SCIENCE_AND_ACKNOWLEDGEMENT_INVENTORY.csv")
    five=[r for r in science if r["science_id"].startswith("SCI-")]
    check("66_acts_5_approved_science_sources",len(science)==66 and len(five)==5 and all(r["policy_status"]=="OWNER_APPROVED" and r["owner_response"] and r["owner_decided_at"]=="2026-11-04" for r in five),"Five individual owner answers populated")
    original_enum=re.search(r"check\(mode in \(([^)]+)\)\)",(ROOT/"supabase/migrations/20261023032906_v4_requisition_science_and_lifecycle.sql").read_text(encoding="utf-8")).group(1)
    check("AS_IS_science_enum_preserved",set(re.findall("'([^']+)'",original_enum))=={r["registered_mode"] for r in five},"AS_IS modes remain evidence, not future policy")
    sci={r["science_id"]:r for r in science}
    check("SCI003_communication_only",sci["SCI-003"]["future_act_class"]=="COMMUNICATION_EVIDENCE" and sci["SCI-003"]["future_aggregate_effect"]=="NEVER_SATISFIES_SCIENCE","WhatsApp read never satisfies science")
    check("SCI005_mandatory_no_opt_out",sci["SCI-005"]["non_configurable"]=="YES_MANDATORY_PERMANENT_NO_OPT_OUT_NO_ADMIN_OVERRIDE","No role or preference disables eligible dispatch science")
    check("family_ANY_approved",sci["ACT-001"]["policy_status"]=="OWNER_APPROVED" and "ANY_AUTHORIZED_PERSON" in sci["ACT-001"]["future_aggregate_effect"],"No all-person requirement or invented individual events")
    policy=(C/"C7-decision-closure/SCIENCE_OWNER_REVIEW.md").read_text(encoding="utf-8")
    check("policy_covers_causal_actor_and_material_identity",all(x in policy for x in ["created_by","scienceByDispatch","ANY","preferência anterior expressa","materialmente imutável","responsabilidade civil"]),"Critical owner decisions present in canonical policy")
    proof=(C/"C7-decision-closure/SCIENCE_AS_IS_TO_BE_ANALYSIS.md").read_text(encoding="utf-8")
    check("AS_IS_dispatch_and_REQ_mutation_analysis",all(x in proof for x in ["auth.uid()=created_by","revise_supply_document","resolve_requisition_item","material","linha 62"]),"Static proof and limitations explicit")
    gates=read(C/"C7-decision-closure/GATE_CLASSIFICATION.csv")
    gate_ids={"P03","P05","P07","P08","P09","P10","P13","P15","OPS-01","PERF-01"}
    check("10_gates_not_general_D0_D1_blockers",{r["gate_id"] for r in gates}==gate_ids and all(r["blocks_general_D0"]==r["blocks_independent_D1"]=="NO" for r in gates),gate_ids.__len__())
    check("gates_not_approved_by_documentation",all(r["gate_passed"]=="NO_NOT_BY_DOCUMENTATION" and r["specific_package_gate"] and r["acceptance_evidence_required"] for r in gates),"Scope, proof and acceptance remain separate")
    check("commercial_research_external_owner",all(next(r for r in gates if r["gate_id"]==id_)["commercial_research_owner"]=="OWNER_EXTERNALLY_WITH_CHATGPT" for id_ in ["P03","P09","P13"]),"No supplier/price research performed")
    screens=read(C/"C8-visual-blueprint/SCREEN_BLUEPRINTS.csv")
    screen_ids={r["screen_id"] for r in screens}
    screen_review=read(C/"C8-visual-blueprint/SCREEN_SEMANTIC_REVIEW.csv")
    controls=read(C/"C8-visual-blueprint/FORM_CONTROL_CATALOG.csv")
    control_ids={r["control_id"] for r in controls}
    controls_review=read(C/"C8-visual-blueprint/CONTROL_SEMANTIC_REVIEW.csv")
    usages=read(C/"C8-visual-blueprint/CONTROL_SCREEN_CONTRACTS.csv")
    usage_map={(r["screen_id"],r["control_id"]):r for r in usages}
    edges=read(C/"C8-visual-blueprint/B1_TO_C3_SURFACE_CROSSWALK.csv")
    edge_review=read(C/"C8-visual-blueprint/SURFACE_RELATION_SEMANTIC_REVIEW.csv")
    old_controls=original_rows(baseline,"docs/audits/C/C8-visual-blueprint/FORM_CONTROL_CATALOG.csv")
    check("66_screens_individually_reviewed",len(screens)==len(screen_review)==66 and {r["screen_id"] for r in screen_review}==screen_ids,"Every screen has authored task/state/layout/recovery")
    dimension_keys=["purpose","authorized_profile","process_state","control_types","required_values","initial_values","masks_validation","contextual_help","examples","hierarchy","available_actions","action_consequence","success_error_messages","failure_recovery","navigation_continuity","mobile","accessibility","approved_reference_consistency","business_consistency"]
    check("24_dimension_screen_records",all(all(r[k] for k in dimension_keys) and r["dimensions_reviewed"].startswith("24_") for r in screen_review),"Field-set columns may be empty only when task has no field of that mode")
    check("262_original_controls_plus_12",len(controls)==274 and len(control_ids)==274 and len(controls_review)==262 and {r["control_id"] for r in old_controls}=={r["control_id"] for r in controls_review}<=control_ids,"Original IDs preserved; new gaps separately identified")
    check("424_contextual_usage_contracts",len(usages)==len(usage_map)==424 and all(r["screen_id"] in screen_ids and r["control_id"] in control_ids for r in usages),"Unique screen/control mode and explicit actor/state")
    per_screen=[r["screen_id"] for r in screens if set(r["control_ids"].split(";"))-{""}!={u["control_id"] for u in usages if u["screen_id"]==r["screen_id"]}]
    check("screen_catalog_usage_alignment",not per_screen,per_screen)
    ro_modes={"READ_ONLY","READ_ONLY_WITH_LINK","READ_ONLY_WITH_ACCOUNT_SWITCH","CALCULATED","AUTO_FILLED","SENSITIVE_READ_ONLY"}
    wrong=[r["usage_id"] for r in usages if r["interaction_mode"] in ro_modes and (r["error_condition"]!="SECTION_READ_FAILED" or re.search(r"\b(?:revise|informe|digite|escolha)\b",r["error_or_read_failure_copy"],re.I))]
    check("readonly_never_demands_user_correction",not wrong,wrong)
    wrong=[r["usage_id"] for r in usages if r["interaction_mode"] in {"INTERNAL","HIDDEN"} and (r["error_or_read_failure_copy"] or r["component_in_this_state"]!="NO_USER_CONTROL")]
    check("internal_hidden_not_exposed_as_controls",not wrong,wrong)
    check("ENT03_immutable_dispatch_values",all(usage_map["ENT-03",id_]["interaction_mode"]=="READ_ONLY" for id_ in ["CTRL-028-01","CTRL-028-02","CTRL-029-01","CTRL-029-02","CTRL-030-01","CTRL-031-01"]),"Origin/destination/material/dispatched/links/recipient in reading")
    check("ENT03_explicit_receipt_action",usage_map["ENT-03","CTRL-034-01"]["interaction_mode"]=="EXPLICIT_ACTION","No text-input confirmation")
    check("ESC03_frozen_timezone_notes",all(usage_map["ESC-03",id_]["interaction_mode"]=="READ_ONLY" for id_ in ["CTRL-060-01","CTRL-068-02"]) and usage_map["ESC-03","CTRL-068-01"]["interaction_mode"]=="EDITABLE_SUBFORM","Own decision reason distinct from proposal")
    check("COM03_declaration_and_decision_separate","NOVA_CHEGADA" in usage_map["COM-03","CTRL-020-01"]["state_and_actor_condition"] and "READ_ONLY" in usage_map["COM-03","CTRL-020-01"]["state_and_actor_condition"],"Quantity edited only on new arrival")
    check("ENT05_prior_consumption_calculated",usage_map["ENT-05","CTRL-040-02"]["interaction_mode"]=="CALCULATED","No repeated debit of prior fact")
    check("BAL03_original_note_and_own_review",usage_map["BAL-03","CTRL-051-01"]["interaction_mode"]=="READ_ONLY" and ("BAL-03","CTRL-C8-002") in usage_map,"Original note never overwritten by reviewer")
    check("draft_history_verification_not_editable",all(usage_map[s,id_]["interaction_mode"] in ro_modes for s,id_ in [("RAS-01","CTRL-126-01"),("RAS-01","CTRL-126-02"),("DOC-02","CTRL-148-01"),("DOC-03","CTRL-148-03"),("DOC-05","CTRL-152-01")]),"Summary, stage, history and calculated result have no editor")
    by_control={r["control_id"]:r for r in controls}
    check("correct_numeric_barcode_avatar_components",all(by_control[id_]["control_type"]==kind for id_,kind in [("CTRL-086-02","INTEGER_NUMBER_INPUT"),("CTRL-084-01","INTEGER_SELECT_0_6"),("CTRL-090-01","BARCODE_TEXT_WITH_SCAN"),("CTRL-110-01","AVATAR_FILE_PICKER"),("CTRL-058-02","CALCULATED_LOCAL_END")]),"Representative negative controls for component classification")
    check("login_MFA_unit_gaps_explicit",all("CTRL-C8-"+f"{n:03}" in control_ids for n in range(1,13)) and usage_map["ID-02","CTRL-C8-012"]["interaction_mode"]=="SENSITIVE_READ_ONLY","New controls typed with privacy and authority")
    interactive=[r for r in usages if r["interaction_mode"] not in ro_modes|{"INTERNAL","HIDDEN","EXPLICIT_ACTION"}]
    bad_presentation=[r["usage_id"] for r in interactive if any(x in r["mask_or_presentation"] for x in ["Conforme tipo", "Conforme componente específico"]) or (r["component_in_this_state"] in {"TEXT_INPUT","TEXTAREA","SEARCH_INPUT"} and "Opções finitas" in r["mask_or_presentation"]) or (r["component_in_this_state"] in {"LINE_CHECKBOX_GROUP","DOMAIN_ACTION_CHOICES","CAPABILITY_CHECKLIST","CAPABILITY_OVERRIDE_GROUP"} and "seleção por ID" in r["mask_or_presentation"])]
    check("input_presentations_match_semantic_components",not bad_presentation and usage_map["ID-01","CTRL-C8-001"]["autocomplete"]=="current-password" and usage_map["ID-02","CTRL-107-01"]["autocomplete"]=="new-password" and usage_map["ID-02","CTRL-C8-011"]["autocomplete"]=="one-time-code",bad_presentation)
    check("setup_summaries_open_legitimate_subflows",all(usage_map["GUI-02",id_]["interaction_mode"]=="READ_ONLY_WITH_LINK" for id_ in ["CTRL-C7-015","CTRL-C7-016"]),"Configuration summaries are neither textarea nor direct setup editor")
    b1=read(ROOT/"docs/audits/B/B1/2026-10-28-phase-b1-interface/01_INTERFACE_INVENTORY.csv")
    check("97_B1_66_C3_relations_reconciled",len(edges)==len(edge_review)==171 and {r["surface_id"] for r in b1}=={r["b1_surface_id"] for r in edges if r["b1_surface_id"]} and screen_ids=={r["c3_screen_id"] for r in edges},"Original 171 reviewed, 2 removals + 2 additions with trace")
    check("spurious_relationships_removed",not any((r["b1_surface_id"],r["c3_screen_id"]) in {("OVL-003","ID-02"),("OVL-026","NOT-02"),("OVL-029","REQ-04")} for r in edges),"Global/self, password/push and cancel/science corrected")
    check("BAL_editor_variants_covered",{r["c3_screen_id"] for r in edges if r["b1_surface_id"]=="OVL-013"}=={"BAL-01","BAL-04","BAL-05"},"Configuration, recount and deferral variants")
    copies=read(C/"C8-visual-blueprint/UI_COPY_AND_MICROCOPY_MASTER.csv")
    originals=original_rows(baseline,"docs/audits/C/C8-visual-blueprint/UI_COPY_AND_MICROCOPY_MASTER.csv")
    old_b1=[r for r in originals if r["copy_id"].startswith("B1-")]
    new_b1=[r for r in copies if r["copy_id"].startswith("B1-")]
    check("4205_source_text_cells_exact",len(old_b1)==len(new_b1)==4205 and all(all(a[k].replace("\r\n","\n")==b[k].replace("\r\n","\n") for k in ["copy_id","current_exact","source","kind","context_and_condition"]) for a,b in zip(old_b1,new_b1)),"Source expressions/context preserved; proposals deliberately reviewed")
    check("copy_ids_unique_and_review_complete",len({r["copy_id"] for r in copies})==len(copies) and len(read(C/"C8-visual-blueprint/MICROCOPY_SEMANTIC_REVIEW.csv"))==4205,len(copies))
    wrong=[r["copy_id"] for r in copies if r["source_classification"]=="CONTEXTUAL_CONTROL_COPY" and r["kind"]=="FIELD_ERROR" and r["context_and_condition"].endswith("SECTION_READ_FAILED")]
    check("read_error_not_field_error",not wrong,wrong)
    check("no_line_based_replacement_algorithm",all(r.get("review_basis")=="EXACT_LITERAL_AND_MEANING;NOT_SOURCE_LINE_SUBSTITUTION" for r in new_b1),"Literal/context boundary explicit")
    cases=read(C/"C9-acceptance-refinement/ACCEPTANCE_CASES.csv")
    masters=read(C/"C6-acceptance-handoff/ACCEPTANCE_CRITERIA_MASTER.csv")
    gaps=read(C/"C9-acceptance-refinement/C9_GAP_AND_DECISION_MATRIX.csv")
    old_cases=original_rows(baseline,"docs/audits/C/C9-acceptance-refinement/ACCEPTANCE_CASES.csv")
    case_ids={r["acceptance_id"] for r in cases}
    check("161_ids_plus_26_cases",len(cases)==len(masters)==len(gaps)==len(case_ids)==187 and {r["acceptance_id"] for r in old_cases}<=case_ids,"No criterion removed")
    by_master={r["acceptance_id"]:r for r in masters}
    bad_cases=[]
    required=["precondition","actors_and_permissions","test_data","action_steps","expected","forbidden","independent_oracle","failure_recovery","source_specifications","decision_dependency","automation_plan"]
    for row in cases:
        master=by_master[row["acceptance_id"]]
        if not all(row[k] for k in required) or row["execution_status"]!="PLANNED_NOT_EXECUTED" or any(master[a]!=row[b] for a,b in [("positive_oracle","expected"),("negative_oracle","forbidden"),("persistence_oracle","independent_oracle"),("design_status","design_status")]):
            bad_cases.append(row["acceptance_id"])
        for name in row["source_specifications"].split(";"):
            if not (ROOT/name).is_file():
                bad_cases.append(name)
    check("187_cases_discriminating_and_synchronized",not bad_cases,bad_cases)
    check("P02_cases_not_human_blocked",all(r["design_status"]=="DESIGN_READY" and "P02_OWNER_APPROVED" in r["decision_dependency"] for r in cases if "P02" in r["decision_refs"]),"Policy approved; technical work still planned")
    changes=read(C/"C9-acceptance-refinement/FINAL_ACCEPTANCE_CHANGES.csv")
    check("20_refined_26_added_trace",sum(r["previous_design_status"]!="NOT_PRESENT" for r in changes)==20 and sum(r["previous_design_status"]=="NOT_PRESENT" for r in changes)==26,"46 documented case changes")
    c3=read(C/"C3-functional-specification/SCREEN_FIELD_ACTION_INVENTORY.csv")
    anchor_errors=[]
    for row in c3:
        path=ROOT/row["source_spec"]
        lines=path.read_text(encoding="utf-8").splitlines()
        n=int(row["source_line"])-1
        needle=row["field_label"] if row["record_type"]=="FIELD" else row["screen_scope"]
        folded=" ".join(x.strip() for x in lines[n:n+6])
        if n<0 or n>=len(lines) or needle not in folded:
            anchor_errors.append(row["source_spec"]+":"+row["source_line"])
    for row in controls:
        match=re.fullmatch(r"(.+):(\d+)",row["source"])
        if match and (not (ROOT/match[1]).is_file() or int(match[2])>len((ROOT/match[1]).read_text(encoding="utf-8").splitlines())):
            anchor_errors.append(row["control_id"])
    check("C3_and_control_source_anchors",not anchor_errors,anchor_errors)
    required_files=["C8-visual-blueprint/FINAL_SEMANTIC_REVIEW_REPORT.md","C8-visual-blueprint/FINAL_REVIEW_FINDINGS.csv","C9-acceptance-refinement/FINAL_ACCEPTANCE_CHANGES.csv","C7-decision-closure/GATE_CLASSIFICATION.csv","C7-decision-closure/SCIENCE_AS_IS_TO_BE_ANALYSIS.md"]
    check("final_deliverables_and_66_sheets",all((C/name).is_file() for name in required_files) and all((C/"C8-visual-blueprint/screens"/(sid+".md")).is_file() for sid in screen_ids),"Concrete corrected specifications, not only an improvement report")
    targets=authored_targets()
    link_errors=[]
    checked_links=0
    for path in sorted(p for p in targets if p.suffix==".md"):
        body=path.read_text(encoding="utf-8-sig")
        for match in re.finditer(r"\[[^\]]*\]\(([^)\n]+)\)",body):
            href=match[1].strip()
            if href.startswith("<"):
                href=href[1:href.index(">")]
            else:
                href=href.split(' "',1)[0]
            if re.match(r"(?:https?://|mailto:|#)",href):
                continue
            href=unquote(href.split("#",1)[0])
            if not href:
                continue
            checked_links+=1
            if not (path.parent/href).resolve().exists():
                link_errors.append({"file":path.relative_to(ROOT).as_posix(),"target":href})
    check("living_authored_markdown_links",not link_errors,{"checked":checked_links,"errors":link_errors})
    syntax=[]
    for path in targets:
        if path.suffix==".py":
            try:
                ast.parse(path.read_text(encoding="utf-8-sig"),filename=path.name)
            except SyntaxError as error:
                syntax.append({"file":path.relative_to(ROOT).as_posix(),"line":error.lineno})
    check("documentary_python_syntax",not syntax,syntax)
    secrets=[]
    pattern=re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:sb_secret_|sbp_)[A-Za-z0-9]{20,}|\bgh[pousr]_[A-Za-z0-9]{24,}|\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{15,}")
    for path in targets:
        if path.suffix in {".md",".csv",".py",".json",".txt"} and pattern.search(path.read_text(encoding="utf-8-sig")):
            secrets.append(path.relative_to(ROOT).as_posix())
    check("no_credential_patterns_in_authored_text",not secrets,secrets)
    receipts_path=FINAL/"evidence/CHECKS.json"
    receipts=json.loads(receipts_path.read_text(encoding="utf-8-sig")) if receipts_path.exists() else {}
    check("pinned_documentary_checks",receipts.get("node")=="v24.22.0" and receipts.get("npm")=="11.21.1" and receipts.get("checks") and all(r["exit_code"]==0 for r in receipts["checks"]),receipts)
    if args.verify_manifest:
        manifest=json.loads((HERE/"evidence/MANIFEST.json").read_text(encoding="utf-8"))
        bad=[]
        for row in manifest["files"]:
            path=ROOT/row["path"]
            if not path.is_file():
                bad.append(row["path"]);continue
            raw=path.read_bytes()
            if row["hash_policy"]=="UTF8_TEXT_LF_NEWLINES":
                raw=raw.replace(b"\r\n",b"\n")
            if sha(raw)!=row["sha256"]:
                bad.append(row["path"])
        check("published_documentary_manifest",not bad,{"files":len(manifest["files"]),"errors":bad})
    failures=[r for r in checks if not r["passed"]]
    report={"date":"2026-11-04","timezone":"America/Sao_Paulo","mission":"FINAL_PHASE_C_COMPLEMENT","entry_sha":baseline["head"],"passed":len(checks)-len(failures),"failed":len(failures),"checks":checks,"limits":"Static documentary/semantic/source/reference review, not product tests, implementation, human/physical/provider/restore acceptance; no commercial research or remote mutation"}
    if args.write_report:
        (FINAL/"evidence/VALIDATION.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8",newline="\n")
        md="# Validação documental — fechamento definitivo\n\n"
        md+=f"{report['passed']} verificações aprovadas; {report['failed']} falhas em 04/11/2026.\n"
        md+="[Resultados completos](final-closure/evidence/VALIDATION.json) e\n[recibos de comandos](final-closure/evidence/CHECKS.json).\n\n"
        md+="Escopo: 66 fichas/262 controles/171 relações originais; catálogo 274/424,\n187 casos planejados e 4.205 fontes B1 exatas. Ordem e 213 documentos anteriores\nem gzip/hash, A/B/C0 e protótipo preservados. Nenhum código/configuração/teste\nou migration alterado frente a 266c654. Links/âncoras, sintaxe, estados P02,\ngates e contraprovas estruturais são verificados separadamente.\n\n"
        md+="Manifesto é gerado depois deste relatório e conferido por execução somente\nleitura com --verify-manifest. Histórico anterior permanece arquivado.\nNão houve suíte funcional, banco, restore, envio, pesquisa comercial, deploy\nou homologação humana/física/provedor. Sem merge ou início D. Linters e\ncontagens não substituem a revisão semântica autoral nem aceite do produto.\n"
        (HERE/"DOCUMENTARY_VALIDATION_REPORT.md").write_text(md,encoding="utf-8",newline="\n")
    print(json.dumps({"passed":report["passed"],"failed":len(failures),"failures":failures},ensure_ascii=False))
    raise SystemExit(1 if failures else 0)


if __name__=="__main__":
    main()
