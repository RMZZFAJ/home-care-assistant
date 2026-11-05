"""Validate documentary coverage and preservation without invoking product/DB code."""
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

ROOT = Path(__file__).resolve().parents[4]
BASE = ROOT / "docs/audits/C"
OUT = Path(__file__).resolve().parent
NEW_FOLDERS = ["C7-decision-closure","C8-visual-blueprint","C9-acceptance-refinement","C10-pr-handoff"]


def read(path):
    with path.open(encoding="utf-8-sig",newline="") as stream:
        return list(csv.DictReader(stream))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def git(*args):
    return subprocess.check_output(["git",*args],cwd=ROOT).decode("utf-8").strip()


def targets():
    changed = git("diff","--name-only","HEAD").splitlines()
    paths = {ROOT/p for p in changed if (ROOT/p).is_file() and (p == "README.md" or p.startswith("docs/"))}
    paths |= {p for folder in NEW_FOLDERS for p in (BASE/folder).rglob("*") if p.is_file() and "__pycache__" not in str(p)}
    # After commit, preserve the complete set of changed living files too.
    baseline = json.loads((OUT/"evidence/BASELINE.json").read_text(encoding="utf-8"))
    paths |= {ROOT/p for p,h in baseline["tracked_worktree_sha256"].items() if (ROOT/p).is_file() and digest(ROOT/p)!=h and (p == "README.md" or p.startswith("docs/"))}
    return paths


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--write-report",action="store_true")
    parser.add_argument("--verify-manifest",action="store_true")
    args = parser.parse_args()
    checks = []
    def check(name, passed, details):
        checks.append({"check":name,"passed":bool(passed),"details":details})
    baseline = json.loads((OUT/"evidence/BASELINE.json").read_text(encoding="utf-8"))
    check("branch",git("branch","--show-current")=="audit/phase-b",git("branch","--show-current"))
    forbidden = []
    historical = []
    for name,old in baseline["tracked_worktree_sha256"].items():
        if name.startswith("HOME_CARE_ASSISTANT_C7_C10_PROTOTIPOS_KIT/"):
            continue
        path = ROOT/name
        if not path.exists() or digest(path)!=old:
            if name != "README.md" and not name.startswith("docs/"):
                forbidden.append(name)
            if name.startswith(("docs/audits/A/","docs/audits/B/","docs/audits/_historical/","docs/audits/C/C0-baseline/")):
                historical.append(name)
    check("no_product_or_support_mutation_this_mission",not forbidden,forbidden)
    check("historical_A_B_C0_bytes_preserved",not historical,historical)
    product_diff = git("diff","--name-only",baseline["product_sha"],"--","src","supabase","tests","scripts",".github","package.json","package-lock.json")
    check("functional_baseline_unchanged",not product_diff,product_diff.splitlines())
    check("master_ref_preserved",git("rev-parse","origin/master")==baseline["master"],git("rev-parse","origin/master"))
    check("temporary_kit_absent",not (ROOT/"HOME_CARE_ASSISTANT_C7_C10_PROTOTIPOS_KIT").exists(),"Root input directory removed after exact preservation")
    provenance = read(OUT/"evidence/INPUT_PROVENANCE.csv")
    archive_errors = []
    for row in provenance:
        if row["exact_archive"]:
            raw = gzip.decompress((ROOT/row["exact_archive"]).read_bytes())
            if len(raw)!=int(row["bytes"]) or hashlib.sha256(raw).hexdigest()!=row["sha256"]:
                archive_errors.append(row["original_path"])
    check("exact_original_archives_roundtrip",not archive_errors,{"inputs":len(provenance),"errors":archive_errors})
    reloc = read(OUT/"evidence/KIT_RELOCATION.csv")
    wrong_assets=[]
    for row in reloc:
        if row["disposition"].startswith("MOVED") and digest(ROOT/row["destination"])!=row["sha256"]:
            wrong_assets.append(row["destination"])
    check("all_16_owner_inputs_preserved",len(reloc)==16 and len([r for r in reloc if r["disposition"].startswith("MOVED")])==9 and not wrong_assets,wrong_assets)
    causes=read(BASE/"C1-consolidation/CAUSE_FAMILIES_MASTER.csv")
    source=read(BASE/"C1-consolidation/FINDINGS_165_SOURCE_CROSSWALK.csv")
    semantic=read(BASE/"C7-decision-closure/CAUSE_SEMANTIC_VERIFICATION.csv")
    associations=read(BASE/"C7-decision-closure/SOURCE_ASSOCIATION_REVIEW.csv")
    impact=read(BASE/"C4-technical-design/CHANGE_IMPACT_MATRIX.csv")
    ids={r["cause_id"] for r in causes}
    check("121_individual_semantic_reviews",len(causes)==len(semantic)==121 and ids=={r["cause_id"] for r in semantic} and all(r["judgment"] and r["discriminating_fixture"] and r["forbidden"] and r["independent_oracle"] for r in semantic),"Structural reconciliation of individually authored source/evidence judgments; not an automatic proof of semantic truth")
    check("165_source_associations",len(source)==len(associations)==165 and {r["source_id"] for r in source}=={r["source_id"] for r in associations},"Original IDs/primary causes retained; secondary manifestations explicit")
    source_errors=[]
    cache={}
    for row in associations:
        path=ROOT/row["source_csv"]
        if path not in cache:cache[path]=read(path)
        original=cache[path][int(row["source_record"])-1]
        h=hashlib.sha256(json.dumps(original,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode()).hexdigest()
        if h!=row["source_row_sha256"] or original.get("id",original.get("finding_id"))!=row["source_id"]:source_errors.append(row["source_id"])
    check("original_source_rows_and_hashes",not source_errors,source_errors)
    plan_errors=[]
    for row in causes:
        i=next(r for r in impact if r["cause_id"]==row["cause_id"])
        if any(i[k]!=row[k] for k in ["domain","decision_refs","specification","planned_package"]):plan_errors.append(row["cause_id"])
    check("cause_impact_semantic_alignment",not plan_errors,plan_errors)
    c1=next(r for r in causes if r["cause_id"]=="C-CAUSE-001")
    c49=next(r for r in causes if r["cause_id"]=="C-CAUSE-049")
    check("DB006_distinct_from_DB002",c1["domain"]=="PWA_PUSH_AND_NOTIFICATIONS" and c1["planned_package"]=="D5" and c1["source_ids"]=="DB-006" and c49["domain"]=="REQ" and c49["planned_package"]=="D1",{"001":c1["source_ids"],"049":c49["source_ids"]})
    accepts=read(BASE/"C6-acceptance-handoff/ACCEPTANCE_CRITERIA_MASTER.csv")
    cases=read(BASE/"C9-acceptance-refinement/ACCEPTANCE_CASES.csv")
    gaps=read(BASE/"C9-acceptance-refinement/C9_GAP_AND_DECISION_MATRIX.csv")
    acceptance_ids={r["acceptance_id"] for r in accepts}
    old=list(csv.DictReader(io.StringIO(gzip.decompress((OUT/"inputs/docs__audits__C__C6-acceptance-handoff__ACCEPTANCE_CRITERIA_MASTER.csv.gz").read_bytes()).decode("utf-8-sig"))))
    check("149_prior_criteria_plus_12",len(accepts)==len(cases)==len(gaps)==161 and len(acceptance_ids)==161 and {r["acceptance_id"] for r in old}<=acceptance_ids and {r["acceptance_id"] for r in cases}==acceptance_ids,"121 causes +28 purpose groups +12 complements; no deleted IDs")
    case_errors=[]
    required=["precondition","actors_and_permissions","test_data","action_steps","expected","forbidden","independent_oracle","side_effects","authorization","ui_states","pdf_event","failure_recovery","layer","fixture","automation_plan","human_device_provider_requirement","source_specifications","planned_package","release_gate","decision_dependency","execution_status"]
    for row in cases:
        ac=next(r for r in accepts if r["acceptance_id"]==row["acceptance_id"])
        if not all(row[k] for k in required) or row["execution_status"]!="PLANNED_NOT_EXECUTED" or ac["planned_package"]!=row["planned_package"] or ac["positive_oracle"]!=row["expected"] or ac["negative_oracle"]!=row["forbidden"]:case_errors.append(row["acceptance_id"])
        for name in row["source_specifications"].split(";"):
            if not (ROOT/name).is_file():case_errors.append(name)
    check("161_cases_have_discriminating_design",not case_errors,case_errors)
    science=read(BASE/"C7-decision-closure/SCIENCE_AND_ACKNOWLEDGEMENT_INVENTORY.csv")
    modes=[r for r in science if r["act_class"]=="SCIENCE"]
    enum=re.search(r"check\(mode in \(([^)]+)\)\)",(ROOT/"supabase/migrations/20261023032906_v4_requisition_science_and_lifecycle.sql").read_text()).group(1)
    check("complete_science_enum_and_owner_gate",len(science)==66 and len(modes)==5 and set(re.findall(r"'([^']+)'",enum))=={r["registered_mode"] for r in modes} and all(r["policy_status"]=="OWNER_REVIEW_REQUIRED" and not r["owner_response"] for r in modes),"Five actual REQ origins; no individual modality approval invented")
    decision=read(BASE/"C2-decisions/DECISIONS_REGISTER.csv")
    pending=[r for r in decision if re.fullmatch(r"P\d{2}",r["decision_id"])]
    check("15_owner_responses_normalized",len(pending)==15 and all(r["status"] in {"OWNER_APPROVED","OWNER_APPROVED_SCOPE_PENDING","OWNER_DEFERRED","PENDING_OWNER"} for r in pending),{r["decision_id"]:r["status"] for r in pending})
    crosswalk=read(BASE/"C8-visual-blueprint/B1_TO_C3_SURFACE_CROSSWALK.csv")
    b1=read(ROOT/"docs/audits/B/B1/2026-10-28-phase-b1-interface/01_INTERFACE_INVENTORY.csv")
    c3=read(BASE/"C3-functional-specification/SCREEN_FIELD_ACTION_INVENTORY.csv")
    screens={r["screen_scope"] for r in c3 if r["record_type"]=="SCREEN_ACTIONS"}
    controls=read(BASE/"C8-visual-blueprint/FORM_CONTROL_CATALOG.csv")
    blueprints=read(BASE/"C8-visual-blueprint/SCREEN_BLUEPRINTS.csv")
    check("97_B1_66_C3_many_to_many",{r["surface_id"] for r in b1}=={r["b1_surface_id"] for r in crosswalk if r["b1_surface_id"]} and screens=={r["c3_screen_id"] for r in crosswalk}=={r["screen_id"] for r in blueprints} and len(screens)==66,{"edges":len(crosswalk),"b1":len(b1),"c3":len(screens)})
    check("174_field_groups_262_controls",len(controls)==262 and len({r["source_field_group"] for r in controls if r["source_field_group"].startswith("C3-FIELD-")})==174 and all(set(r["screen_ids"].split(";"))<=screens and all(r[k] for k in ["label","order","control_type","mask_inputmode","autocomplete","required_and_default","validation_and_dependencies","inline_help_and_example","error_copy","accessibility"]) for r in controls),"Composite fields decomposed and20 C7 additions")
    check("all_66_screen_sheets",all((BASE/f"C8-visual-blueprint/screens/{id_}.md").is_file() for id_ in screens),len(screens))
    copies=read(BASE/"C8-visual-blueprint/UI_COPY_AND_MICROCOPY_MASTER.csv")
    oldcopy=read(ROOT/"docs/audits/B/B1/2026-10-28-phase-b1-interface/04_TEXT_INVENTORY.csv")
    copied=[r for r in copies if r["copy_id"].startswith("B1-ROW-")]
    check("all_4205_source_text_rows_preserved",len(copied)==len(oldcopy)==4205 and all(a["current_exact"].replace("\r\n","\n")==b["original_exact"].replace("\r\n","\n") and a["source"]==b["file"]+":"+b["line"] for a,b in zip(copied,oldcopy)) and len({r["copy_id"] for r in copies})==len(copies),{"source_rows":len(copied),"total_copy_rows":len(copies),"text_newlines":"LF normalized; original B1 bytes preserved"})
    anchor_errors=[]
    for row in c3:
        lines=(ROOT/row["source_spec"]).read_text(encoding="utf-8").splitlines()
        needle=row["field_label"] if row["record_type"]=="FIELD" else row["screen_scope"]
        if needle not in lines[int(row["source_line"])-1]:anchor_errors.append(row["source_spec"]+":"+str(row["source_line"]))
    c3_fields=[r for r in c3 if r["record_type"]=="FIELD"]
    for row in controls:
        if row["source_field_group"].startswith("C3-FIELD-"):
            field=c3_fields[int(row["source_field_group"].split("-")[-1])-1]
            if row["source"]!=field["source_spec"]+":"+str(field["source_line"]):anchor_errors.append(row["control_id"]+":"+row["source"])
    for row in science:
        ref=row["evidence"]
        match=re.match(r"(.+):(\d+)$",ref)
        if match and (not (ROOT/match[1]).is_file() or int(match[2])>len((ROOT/match[1]).read_text(encoding="utf-8").splitlines())):anchor_errors.append(ref)
    check("C3_and_science_source_anchors",not anchor_errors,anchor_errors)
    files=targets()
    link_errors=[]
    for path in sorted(p for p in files if p.suffix==".md"):
        body=path.read_text(encoding="utf-8")
        for match in re.finditer(r"\[[^\]]*\]\(([^\s)]+)(?:\s+[^)]*)?\)",body):
            href=match[1].strip("<>")
            if re.match(r"(?:https?://|mailto:|#)",href):continue
            location=unquote(href.split("#",1)[0])
            target=(path.parent/location).resolve()
            if not target.exists():link_errors.append({"file":path.relative_to(ROOT).as_posix(),"target":href})
    check("authored_markdown_links",not link_errors,link_errors)
    secrets=[]
    secret_patterns=[r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",r"\bgh[pousr]_[A-Za-z0-9]{25,}",r"\bsk-[A-Za-z0-9]{24,}",r"\bsb_secret_[A-Za-z0-9_-]{20,}",r"\beyJ[A-Za-z0-9_-]{25,}\.[A-Za-z0-9_-]{25,}\.[A-Za-z0-9_-]{20,}"]
    for path in files:
        if path.suffix in {".md",".csv",".json",".txt",".html"}:
            value=path.read_text(encoding="utf-8",errors="strict")
            if any(re.search(p,value) for p in secret_patterns):secrets.append(path.relative_to(ROOT).as_posix())
    check("no_secret_patterns_in_documentary_outputs",not secrets,secrets)
    receipt_path=OUT/"evidence/checks.json"
    receipts=json.loads(receipt_path.read_text(encoding="utf-8")) if receipt_path.exists() else {"checks":[]}
    check("documentary_command_receipts",len(receipts["checks"])==4 and all(r["exit_code"]==0 for r in receipts["checks"]) and receipts.get("node")=="v24.22.0" and receipts.get("npm")=="11.21.1",receipts)
    syntax_errors=[]
    for path in files:
        if path.suffix==".py":
            try:ast.parse(path.read_text(encoding="utf-8"),filename=path.name)
            except SyntaxError as error:syntax_errors.append({"file":str(path.relative_to(ROOT)),"line":error.lineno})
    check("documentary_helper_syntax",not syntax_errors,syntax_errors)
    required_files={
        "C7-decision-closure":["README.md","PRODUCT_DECISIONS_C7_ADDENDUM.md","SCIENCE_AND_ACKNOWLEDGEMENT_INVENTORY.csv","SCIENCE_OWNER_REVIEW.md","BACKUP_OPERATING_MODEL_FOR_OWNER.md","STOCK_MOVEMENT_TAXONOMY.md","PDF_SIGNING_ISSUANCE_AND_VERIFICATION.md","DRAFT_NON_OFFICIAL_CONTRACT.md","CAUSE_SEMANTIC_VERIFICATION.csv","OPEN_DECISIONS.md"],
        "C8-visual-blueprint":["README.md","B1_TO_C3_SURFACE_CROSSWALK.csv","VISUAL_BLUEPRINT_BY_SCREEN.md","UI_COPY_AND_MICROCOPY_MASTER.csv","FORM_CONTROL_CATALOG.csv","COMPONENT_DECISIONS.md","GUIDED_HELP_AND_SCREENSHOTS_PLAN.md","VISUAL_OWNER_REVIEW.md","prototype/home-care-prototipo.html"],
        "C9-acceptance-refinement":["README.md","ACCEPTANCE_EXECUTION_BLUEPRINT.md","ACCEPTANCE_CASES.csv","C9_GAP_AND_DECISION_MATRIX.csv","DISCRIMINATING_EXAMPLES.md"],
        "C10-pr-handoff":["README.md","CHECKPOINT.md","PHASE_C_FINAL_PART2_REPORT.md","PHASE_D_HANDOFF_UPDATED.md","PR_REVIEW_CHECKLIST.md","DOCUMENTARY_VALIDATION_REPORT.md","BRANCH_AND_PROVENANCE_REPORT.md","OPEN_OWNER_GATES.md"],
    }
    missing=[folder+"/"+name for folder,names in required_files.items() for name in names if not (BASE/folder/name).is_file()]
    check("all_master_order_minimum_deliverables",not missing,missing)
    if args.verify_manifest:
        manifest=json.loads((OUT/"evidence/MANIFEST.json").read_text(encoding="utf-8"))
        def current_digest(row):
            path=ROOT/row["path"]
            if not path.is_file():return None
            raw=path.read_bytes()
            if row.get("hash_policy")=="UTF8_TEXT_LF_NEWLINES":raw=raw.replace(b"\r\n",b"\n")
            return hashlib.sha256(raw).hexdigest()
        failures=[r["path"] for r in manifest["files"] if current_digest(r)!=r["sha256"]]
        check("published_manifest_hashes",not failures,failures)
    failed=[r for r in checks if not r["passed"]]
    report={"date":"2026-11-04","timezone":"America/Sao_Paulo","scope":"DOCUMENTARY_ONLY;NO_PRODUCT_TESTS_OR_DB_OPERATIONS","checks":checks,"passed":len(checks)-len(failed),"failed":len(failed),"limitations":"Counts/links/hashes validate structural coverage and preservation. Semantic judgments are authored source reviews, not runtime/human/physical/provider/restore acceptance."}
    if args.write_report:
        (OUT/"evidence/validation-report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        if not failed:
            md="# Validação documental C7–C10\n\n"
            md+=f"{len(checks)} verificações estruturais/de preservação passaram em04/11/2026.\nResultados completos em [validation-report.json](evidence/validation-report.json).\n\n"
            md+="Cobertura:121 causas/165 origens,149 critérios preservados +12 novos,\n161 casos planejados,66 atos/cinco origens de ciência,97 B1/66 C3,\n262 controles e todas as linhas do inventário textual B1. Arquivos originais\nforam verificados por roundtrip gzip; HTML/oitoPNG por bytes/hash.\nProduto e apoios existentes não mudaram; A/B/C0 preservados.\n\n"
            md+="Markdown, contratos estáticos e diff check são comandos separados, com\nsaída/estado em [checks.json](evidence/checks.json). O manifesto final\nexclui a si e é verificado depois de sua geração.\n\n"
            md+="Limites: oráculos/roteiros são design; não se executaram suíte funcional,\nbanco, restore, envio, homologação humana/aparelho ou promoção produtiva.\nA verificação automática não transforma decisão pendente em aprovada nem\nprova por contagem a verdade de cada julgamento semântico.\n"
            (OUT/"DOCUMENTARY_VALIDATION_REPORT.md").write_text(md,encoding="utf-8")
    print(json.dumps({"passed":report["passed"],"failed":len(failed),"failures":failed},ensure_ascii=False))
    raise SystemExit(1 if failed else 0)


if __name__=="__main__":
    # The first closure proof is preserved in final-closure/inputs. The
    # current complement has an explicit baseline and expanded contracts.
    final_validator = OUT / "validate_final_closure.py"
    if (OUT / "final-closure/evidence/BASELINE.json").exists():
        import sys
        raise SystemExit(subprocess.call([sys.executable,str(final_validator),*sys.argv[1:]],cwd=ROOT))
    main()
