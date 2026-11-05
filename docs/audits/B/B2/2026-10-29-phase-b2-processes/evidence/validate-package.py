"""Independent structural/provenance verification. --seal writes the final manifest."""
import ast
import csv
import hashlib
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote

root = Path(__file__).resolve().parent.parent
repo = root.parents[2]
issues = []


def require(condition, message):
    if not condition:
        issues.append(message)


def table(name):
    with (root / name).open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        require(all(None not in r and len(r) == len(reader.fieldnames) for r in rows), "CSV shape: " + name)
        return rows


def git(*args):
    return subprocess.check_output(["git", *args], cwd=repo).decode("utf-8").strip()


mandatory = ["README.md","CHECKPOINT.md","00_BASELINE_SCOPE_AND_METHOD.md","01_PROCESS_INVENTORY.csv","01_PROCESS_COVERAGE.csv","01_ACTORS_RESPONSIBILITIES_MATRIX.csv","02_PROCESS_STATE_MAPS.md","02_PROCESS_TRANSITIONS.csv","03_REQUISITION_ACQUISITION_AUDIT.md","04_DELIVERY_RECEIPT_AUDIT.md","05_STOCK_CUSTODY_MOVEMENTS_AUDIT.md","06_BALANCE_CONSUMPTION_AUDIT.md","07_SCHEDULES_SHIFTS_AUDIT.md","08_IDENTITIES_MEMBERSHIPS_ADMIN_AUDIT.md","09_DOCUMENTS_SCIENCE_COMMUNICATION_AUDIT.md","10_CROSS_PROCESS_EXCEPTIONS.md","10_EXCEPTION_SCENARIOS.csv","11_PERSONA_JOURNEYS_AND_OPERATIONAL_FRICTION.md","12_NEW_FUNCTIONALITIES_AND_PROCESS_GAPS.md","13_FINDINGS_MASTER.csv","13_FINDINGS_MASTER.md","14_ACCEPTANCE_SCENARIOS.md","15_CROSS_GROUP_DEPENDENCIES.md","16_GROUP_B2_EXECUTIVE_ASSESSMENT.md","17_PHASE_C_DECISION_HANDOFF.md"]
for name in mandatory:
    require((root / name).is_file(), "Missing mandatory: " + name)
inventory, coverage, actors = (table(n) for n in ["01_PROCESS_INVENTORY.csv","01_PROCESS_COVERAGE.csv","01_ACTORS_RESPONSIBILITIES_MATRIX.csv"])
transitions, findings, opportunities, exceptions = (table(n) for n in ["02_PROCESS_TRANSITIONS.csv","13_FINDINGS_MASTER.csv","12_OPPORTUNITIES.csv","10_EXCEPTION_SCENARIOS.csv"])
ids = {r["process_id"] for r in inventory}
require(len(ids) == len(inventory) == 66, "Inventory unique66")
for name, rows in [("coverage", coverage), ("actors", actors)]:
    require(len(rows) == 66 and {r["process_id"] for r in rows} == ids, "Process reconciliation: " + name)
    require(all("PENDENTE" != value and "RUNTIME_PENDENTE" not in value for r in rows for value in r.values()), "Unreconciled placeholder: " + name)
require(len(transitions) == len({t["transition_id"] for t in transitions}) == 102, "Transitions unique102")
require(all(t["process_id"] in ids for t in transitions), "Orphan transition")
require(len(findings) == len({f["id"] for f in findings}) == 17, "Findings unique17")
require(len(opportunities) == len({o["opportunity_id"] for o in opportunities}) == 20, "Opportunities unique20")
require(sum(o["nature"] == "RECOMENDACAO_DESCARTADA" for o in opportunities) == 1, "One discarded proposal")
require(len(exceptions) == 21, "Exceptions21")
cases = {}
for path in (root / "evidence").glob("b2*-results.json"):
    data = json.loads(path.read_text(encoding="utf-8"))
    require(bool(data.get("finishedAt")), "Probe not finished: " + path.name)
    for row in data["scenarios"]:
        require(row["id"] not in cases, "Duplicate case: " + row["id"])
        require(row["execution"] == "EXECUTED", "Incomplete execution: " + row["id"])
        cases[row["id"]] = path.name
require(len(cases) == 81, "Directed cases81")
require(hashlib.sha256((root / "evidence/MASTER_ORDER.txt").read_bytes()).hexdigest() == "bc1dc66537fc393954e8b6ddcf9ca28dd54fc0639914d8a637b20bb098b37d07", "Master order bytes changed")
require(json.loads((root / "evidence/process-catalogue.json").read_text(encoding="utf-8")) == inventory, "Canonical process JSON differs from CSV")
require(json.loads((root / "evidence/findings-canonical.json").read_text(encoding="utf-8")) == findings, "Canonical findings JSON differs from CSV")
for row in findings:
    require(all(bool(v) for v in row.values()), "Empty finding attribute: " + row["id"])
    require(all(p in ids for p in row["processes"].split(";")), "Orphan finding process: " + row["id"])
    require(all(c in cases for c in row["scenarios"].split(";")), "Unknown finding case: " + row["id"])
    for target in row["evidence"].split(";"):
        require((root / target).is_file(), "Missing evidence: " + target)
for row in coverage:
    for case in row["local_scenarios"].split(";"):
        if case.startswith("B2"):
            require(case in cases, "Unknown coverage case: " + case)
for row in transitions:
    for case in row["scenario"].split(";"):
        if case.startswith("B2"):
            require(case in cases, "Unknown transition case: " + case)
for row in exceptions:
    for case in row["scenarios"].split(";"):
        if case.startswith("B2"):
            require(case in cases, "Unknown exception case: " + case)
for row in inventory + findings:
    for path in row.get("source_chain", row.get("source", "")).split(";"):
        if path.startswith(("src/", "supabase/")):
            require((repo / re.sub(r":\d+(?:-\d+)?$", "", path)).is_file(), "Missing source: " + path)
hashes = json.loads((root / "evidence/source-hashes.json").read_text(encoding="utf-8"))
for entry in hashes:
    require(hashlib.sha256((repo / entry["path"]).read_bytes()).hexdigest() == entry["sha256"], "Changed source: " + entry["path"])
for path in root.rglob("*.md"):
    text = path.read_text(encoding="utf-8")
    for link in re.findall(r"\[[^\]]*\]\(([^\n)]+)\)", text):
        if link.startswith(("https:", "http:", "mailto:", "#")):
            continue
        target = unquote(link.split("#")[0].split("?")[0].strip("<>"))
        if target:
            resolved = (path.parent / target).resolve()
            generated = resolved == (root / "evidence/package-validation.json").resolve() or ("--seal" in sys.argv and resolved == (root / "evidence/manifest.json").resolve())
            require(generated or resolved.is_file(), "Broken link: " + str(path.relative_to(root)) + " -> " + target)
for path in root.rglob("*.py"):
    try:
        ast.parse(path.read_text(encoding="utf-8"))
    except SyntaxError:
        issues.append("Invalid Python: " + path.name)
base = json.loads((root / "evidence/baseline.json").read_text(encoding="utf-8"))
require(git("branch", "--show-current") == "audit/phase-b", "Wrong branch")
require(git("rev-parse", "master") == base["master"], "Master moved")
require(not git("diff", "--name-only", base["productSha"], "HEAD", "--", "src", "supabase", "tests", "scripts", "package.json", "package-lock.json"), "Functional committed diff")
allowed_prefix = "docs/audits/2026-10-29-phase-b2-processes/"
changed = set(git("diff", "HEAD", "--name-only").splitlines()) | set(git("ls-files", "--others", "--exclude-standard").splitlines())
require(all(p.startswith(allowed_prefix) or p == "docs/audits/phase-b/README.md" for p in changed), "Outside authorized paths")
whitespace = subprocess.run(["git","diff","--check"],cwd=repo,capture_output=True,text=True)
require(whitespace.returncode == 0, "Whitespace diff: " + whitespace.stdout.strip())
checks = json.loads((root / "evidence/checks.json").read_text(encoding="utf-8"))
latest = {r["command"]: r for r in checks["checks"]}
for name in ["check:contracts", "lint", "lint:markdown", "typecheck", "test", "build"]:
    require(latest.get("npm run " + name, {}).get("exitCode") == 0, "Check not green: " + name)
e2e = json.loads((root / "evidence/e2e-results.json").read_text(encoding="utf-8"))
require(e2e["stats"]["expected"] == 6 and e2e["stats"]["unexpected"] == e2e["stats"]["skipped"] == e2e["stats"]["flaky"] == 0, "E2E sample mismatch")
require(json.loads((root / "evidence/secret-scan.json").read_text(encoding="utf-8"))["passed"], "Secret scan failed")
result = dict(recordedAt=datetime.now(timezone.utc).isoformat(),passed=not issues,issues=issues,
    mandatoryFiles=len(mandatory),processes=len(inventory),transitions=len(transitions),findings=len(findings),opportunities=len(opportunities),exceptions=len(exceptions),directedCases=len(cases),sourceHashesUnchanged=len(hashes),branch="audit/phase-b",master=base["master"],headBeforeDocumentaryCommit=git("rev-parse","HEAD"),functionalProduct=base["productSha"],limits="Artifact consistency and source preservation;does not certify complete branch combinations,humans,providers,physical devices or production")
(root / "evidence/package-validation.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8",newline="\n")
if "--seal" in sys.argv:
    require(not issues, "Cannot seal failing package")
    if not issues:
        items = []
        for p in sorted(root.rglob("*")):
            if p.is_file() and p.name != "manifest.json":
                data = p.read_bytes()
                items.append({"path":str(p.relative_to(root)).replace("\\","/"),"bytes":len(data),"sha256":hashlib.sha256(data).hexdigest()})
        (root / "evidence/manifest.json").write_text(json.dumps({"recordedAt":result["recordedAt"],"entries":len(items),"selfExcluded":True,"files":items},ensure_ascii=False,indent=2)+"\n",encoding="utf-8",newline="\n")
print(json.dumps(result,ensure_ascii=False,indent=2))
sys.exit(bool(issues))
