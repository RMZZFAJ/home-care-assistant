"""Validate only the B8 documentary package. Never run product tests or SQL."""
import ast
import csv
import hashlib
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WORKSPACE = ROOT.parents[2]
EVIDENCE = ROOT / "evidence"
RELATIVE = ROOT.relative_to(WORKSPACE).as_posix()
BASELINE = "294382b56e10c7c7c38a4d94bc91bacffb01ee3f"
MASTER = "34dcb835c5c49068e0417f7306eb4e501aa868bc"
HISTORICAL = "docs/audits/2026-10-30-phase-b4-backend/14_FINDINGS_MASTER.md"
INDEX = "docs/audits/phase-b/README.md"

def command(*args):
    result = subprocess.run(args, cwd=WORKSPACE, text=True, encoding="utf-8",
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode:
        raise RuntimeError(f"Command failed: {args!r}\n{result.stdout}\n{result.stderr}")
    return result.stdout

def read_json(file):
    return json.loads(file.read_text(encoding="utf-8-sig"))

def rows(file):
    with file.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        result = list(reader)
        assert reader.fieldnames and len(set(reader.fieldnames)) == len(reader.fieldnames), file
        assert all(None not in row and all(value is not None for value in row.values()) for row in result), file
        return result

def normalized(file):
    return file.read_bytes().replace(b"\r\n", b"\n")

def digest(file):
    return hashlib.sha256(normalized(file)).hexdigest()

manifest_file = EVIDENCE / "MANIFEST.json"
if "--verify" in sys.argv:
    manifest = read_json(manifest_file)
    actual = {file.relative_to(ROOT).as_posix() for file in ROOT.rglob("*")
              if file.is_file() and file != manifest_file}
    assert actual == {row["file"] for row in manifest["files"]}, "Manifest file-set mismatch"
    for row in manifest["files"]:
        file = ROOT / row["file"]
        assert digest(file) == row["sha256_lf"] and len(normalized(file)) == row["bytes_lf"], row["file"]
    print(json.dumps({"manifest": "PASS", "files": len(actual)}))
    raise SystemExit(0)

core = ["README.md", "CHECKPOINT.md", "FINDINGS_MASTER.md", "FINDINGS_MASTER.csv",
        "REGRESSION_COVERAGE_MATRIX.csv", "ACCEPTANCE_AND_REGRESSION_CRITERIA.md",
        "CROSS_GROUP_DEPENDENCIES.md", "GROUP_B8_EXECUTIVE_ASSESSMENT.md",
        "PHASE_C_DECISION_HANDOFF.md"]
for name in core:
    assert (ROOT / name).is_file() and (ROOT / name).stat().st_size > 100, name
assert len(list((ROOT / "Q").glob("*.md"))) == 6
assert len(list((ROOT / "M").glob("*.md"))) == 4

findings = rows(ROOT / "FINDINGS_MASTER.csv")
assert len(findings) == 9 and len({row["id"] for row in findings}) == 9
assert sum(row["origin"] == "NEW_B8" for row in findings) == 3
assert sum(row["origin"] == "REVALIDATION" for row in findings) == 6
assert sum(row["priority"] == "P2" for row in findings) == 6
assert sum(row["priority"] == "P3" for row in findings) == 3
assert all(all(row[field] for field in row) for row in findings)
master_markdown = re.sub(r"\s+", " ", (ROOT / "FINDINGS_MASTER.md").read_text(encoding="utf-8"))
assert all(row["id"] in master_markdown and row["title"] in master_markdown for row in findings)

matrix = rows(ROOT / "REGRESSION_COVERAGE_MATRIX.csv")
reconciliation = read_json(EVIDENCE / "regression-reconciliation.json")
assert len(matrix) == reconciliation["regressionFamilies"] == 119
original = {}
for source in reconciliation["originalSources"]:
    file = WORKSPACE / source["file"]
    assert digest(file) == source["sha256_lf"], source["file"]
    source_rows = rows(file)
    assert len(source_rows) == source["rows"]
    for row in source_rows:
        original[row["id"]] = source["file"]
represented = {item.strip() for row in matrix for item in row["source_ids"].split(";")}
assert len(original) == 156 and represented == set(original)
assert len({row["regression_id"] for row in matrix}) == 119
assert all(all(value for value in row.values()) for row in matrix)
for row in matrix:
    for ref in row["original_evidence"].split(";"):
        file, finding = ref.rsplit("#", 1)
        assert original[finding] == file
assert len(rows(EVIDENCE / "PROCESS_TEST_COVERAGE.csv")) == 17
assert len(rows(EVIDENCE / "ROLE_TEST_COVERAGE.csv")) == 6
assert len(rows(EVIDENCE / "EXCEPTION_TEST_COVERAGE.csv")) == 22

anchors = rows(EVIDENCE / "SOURCE_ANCHORS.csv")
for row in anchors:
    file = WORKSPACE / row["file"]
    assert digest(file) == row["sha256_lf"], row["file"]
    assert 1 <= int(row["line"]) <= len(normalized(file).splitlines())
prior = read_json(EVIDENCE / "PRIOR_REFERENCES.json")
assert len(prior) == 28
for row in prior:
    assert digest(WORKSPACE / row["file"]) == row["sha256_lf"], row["file"]

expected_reports = [("oracle-baseline.json", 5, 0, 6),
                    ("oracle-blank-text.json", 5, 0, 6),
                    ("oracle-wrong-title.json", 0, 1, 10)]
for name, passed, failed, pending in expected_reports:
    report = read_json(EVIDENCE / name)
    assert (report["numPassedTests"], report["numFailedTests"], report["numPendingTests"]) == (passed, failed, pending)
assert read_json(EVIDENCE / "mutation-blank-text.json")["replacements"] == 4
assert read_json(EVIDENCE / "mutation-wrong-title.json")["replacements"] == 1
pdfs = read_json(EVIDENCE / "pdf-oracle-observations.json")
assert len(pdfs) == 14 and sum(row["mode"] == "baseline" for row in pdfs) == 7
assert all(row["pages"] == 2 for row in pdfs)
assert all(row["text_chars"] == 0 for row in pdfs if row["mode"] == "blank-text")
assert all(row["text_chars"] >= 1900 for row in pdfs if row["mode"] == "baseline")
browser = read_json(EVIDENCE / "browser-results.json")
assert browser["stats"]["expected"] == 5 and browser["stats"]["unexpected"] == 0
observations = read_json(EVIDENCE / "browser-observations.json")
assert {row["id"] for row in observations} == {"Q6-01", "Q6-02", "Q6-03", "Q9-01", "Q9-02"}
assert "color-contrast" in next(row for row in observations if row["id"] == "Q9-01")["incomplete"]
sql = read_json(EVIDENCE / "sql-oracle-observations.json")
assert len(sql["observations"]) == 4 and not sql["observations"][2]["current_guard_rejects"]
assert sql["observations"][2]["strict_guard_rejects"]
assert sql["currentGuardSource"].startswith("tests/database/supply-workflows.sql:50")
discovery = read_json(EVIDENCE / "browser-discovery.json")
assert len(discovery["cases"]) == 120

preservation = read_json(EVIDENCE / "preservation.json")
assert preservation["protectedCount"] == 394 and not preservation["changed"]
assert not preservation["functionalDiff"] and preservation["master"] == MASTER
assert preservation["preexistingAuditToolingDiff"] == "requirements-audit.txt"
assert preservation["auditRequirementsUnchangedSinceBaseline"]
assert command("git", "branch", "--show-current").strip() == "audit/phase-b"
assert command("git", "rev-parse", "master").strip() == MASTER
original_md = command("git", "show", BASELINE + ":" + HISTORICAL).replace("\r\n", "\n")
current_md = (WORKSPACE / HISTORICAL).read_text(encoding="utf-8")
assert original_md.replace("`", "") == current_md.replace("`", ""), "B4 semantic change beyond code quotes"
changed = command("git", "diff", "--name-only", BASELINE).splitlines()
untracked = command("git", "ls-files", "--others", "--exclude-standard").splitlines()
assert all(file.startswith(RELATIVE + "/") or file in {HISTORICAL, INDEX} for file in changed + untracked), "Scope violation"

link_count = 0
for file in ROOT.rglob("*.md"):
    content = file.read_text(encoding="utf-8")
    for target in re.findall(r"\]\(([^)]+)\)", content):
        if re.match(r"(?:https?:|mailto:|#)", target):
            continue
        target_file = target.split("#")[0].strip("<>")
        assert (file.parent / target_file).is_file(), (file.name, target)
        link_count += 1

for file in EVIDENCE.glob("*.py"):
    ast.parse(file.read_text(encoding="utf-8"), filename=str(file))
checks = read_json(EVIDENCE / "validation-checks.json")
for check in checks:
    assert check["exitCode"] == 0
    for source in check["sources"]:
        assert digest(WORKSPACE / source["file"]) == source["sha256_lf"], "Recheck changed helper: " + source["file"]
markdown = command("node", "node_modules/markdownlint-cli2/markdownlint-cli2-bin.mjs",
                   RELATIVE + "/**/*.md", HISTORICAL, INDEX)
command("git", "diff", "--check", BASELINE)

secret_patterns = [r"-----BEGIN [A-Z ]*PRIVATE KEY-----", r"\beyJ[\w-]{15,}\.[\w-]{15,}\.[\w-]{15,}",
                   r"\b(?:sb_secret_|sbp_|sk_live_|github_pat_|ghp_|vcp_)[A-Za-z0-9_-]{16,}"]
secret_files = []
for file in ROOT.rglob("*"):
    if file.is_file():
        content = file.read_text(encoding="utf-8-sig")
        if any(re.search(pattern, content) for pattern in secret_patterns):
            secret_files.append(file.relative_to(ROOT).as_posix())
assert not secret_files, "Review possible secret in: " + ", ".join(secret_files)

completion = [
    (1, "Checks existentes", "Q/01_TEST_INVENTORY.md"),
    (2, "Comportamentos cobertos", "evidence/PROCESS_TEST_COVERAGE.csv"),
    (3, "Comportamentos não cobertos", "REGRESSION_COVERAGE_MATRIX.csv"),
    (4, "Oráculos insuficientes", "Q/03_ORACLE_QUALITY.md"),
    (5, "Resultados instáveis", "Q/05_FLAKINESS_AND_ISOLATION.md"),
    (6, "Regressões futuras", "REGRESSION_COVERAGE_MATRIX.csv"),
    (7, "Teste humano", "ACCEPTANCE_AND_REGRESSION_CRITERIA.md"),
    (8, "Aparelho físico", "Q/06_PERFORMANCE_DEVICES_ACCESSIBILITY.md"),
    (9, "Homologação remota", "REGRESSION_COVERAGE_MATRIX.csv"),
    (10, "Desempenho demonstrado", "Q/06_PERFORMANCE_DEVICES_ACCESSIBILITY.md"),
    (11, "Medição futura", "Q/06_PERFORMANCE_DEVICES_ACCESSIBILITY.md"),
    (12, "Estruturas a preservar", "M/01_REPOSITORY_AND_CANDIDATES.md"),
    (13, "Refatoração proporcional", "M/02_MAINTAINABILITY.md"),
    (14, "Candidatos sem remoção", "M/01_REPOSITORY_AND_CANDIDATES.md"),
    (15, "Instruções desatualizadas", "M/03_CURRENT_DOCUMENTATION.md"),
    (16, "Risco de ferramentas", "M/04_TOOLS_DEPENDENCIES_AND_WORKFLOW.md"),
    (17, "Dependências", "M/04_TOOLS_DEPENDENCIES_AND_WORKFLOW.md"),
    (18, "Decisões C", "PHASE_C_DECISION_HANDOFF.md"),
    (19, "Propostas desproporcionais", "PHASE_C_DECISION_HANDOFF.md"),
    (20, "Sem domínio independente para outro B", "PHASE_C_DECISION_HANDOFF.md"),
]
assert all((ROOT / file).is_file() for _, _, file in completion)
report = dict(recordedAt=datetime.now(timezone.utc).isoformat(), status="PASS",
              requiredCoreFiles=len(core), thematicDocuments=10, findings=9,
              newQualityRecords=3, revalidations=6, regressionFamilies=119,
              originalIds=156, processes=17, personas=6, exceptionalScenarios=22,
              directedObservations=20, expectedCounterfactualFailures=1,
              sourceAnchors=len(anchors), priorReferences=len(prior), localLinks=link_count,
              protectedFiles=394, functionalDiff=[], secretMatches=secret_files,
              pythonSyntaxFiles=sorted(file.name for file in EVIDENCE.glob("*.py")),
              historicalEdit="Three B4 lines receive code quotes only; original manifest preserved",
              proportionalChecks=checks, markdownResult=markdown.strip(),
              completionAudit=[dict(criterion=number, requirement=name, evidence=file, status="ADDRESSED")
                               for number, name, file in completion],
              limits="Completion means diagnostic scope addressed, not defects corrected, WCAG certified or release approved. C/D not started.")
(EVIDENCE / "package-validation.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
entries = []
for file in sorted(ROOT.rglob("*")):
    if file.is_file() and file != manifest_file:
        entries.append(dict(file=file.relative_to(ROOT).as_posix(), bytes_lf=len(normalized(file)), sha256_lf=digest(file)))
manifest_file.write_text(json.dumps(dict(algorithm="sha256; text CRLF normalized to LF only", files=entries), indent=2) + "\n", encoding="utf-8")
print(json.dumps({"status": "PASS", "core": 9, "thematic": 10, "findings": 9,
                  "families": 119, "originalIds": 156, "manifestFiles": len(entries),
                  "criteriaAddressed": 20, "sourceAnchors": len(anchors), "localLinks": link_count}))
