"""Capture the authorized documentary mission's inputs without touching product data."""
from pathlib import Path
import csv
import gzip
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
BASE = ROOT / "docs/audits/C"
KIT = ROOT / "HOME_CARE_ASSISTANT_C7_C10_PROTOTIPOS_KIT"


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT).decode("utf-8").strip()


def main():
    target = OUT / "evidence/BASELINE.json"
    if target.exists():
        raise SystemExit("Baseline already captured; preserve the original.")
    target.parent.mkdir(parents=True, exist_ok=True)
    tracked = {}
    for name in git("ls-files").splitlines():
        path = ROOT / name
        if path.is_file():
            tracked[name] = hashlib.sha256(path.read_bytes()).hexdigest()
    snapshot = {
        "date": "2026-11-04", "timezone": "America/Sao_Paulo",
        "head": git("rev-parse", "HEAD"),
        "branch": git("branch", "--show-current"),
        "master": git("rev-parse", "origin/master"),
        "remote_branch": git("rev-parse", "origin/audit/phase-b"),
        "status": git("status", "--short"),
        "product_sha": "37cb7f85e96e551d6419871f94dd950712e2565b",
        "tracked_worktree_sha256": tracked,
        "authorization": "C7-C10 documentary work, kit reorganization, commit, push, Draft PR; no merge or D",
    }
    target.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    archive = OUT / "inputs"
    archive.mkdir(exist_ok=True)
    rows = []
    inputs = sorted(KIT.rglob("*"))
    canonical = [ROOT / "docs/decisions/PRODUCT_DECISIONS_MASTER.md"]
    canonical += [p for p in BASE.rglob("*") if p.is_file() and "C10-pr-handoff" not in str(p) and "__pycache__" not in str(p) and p.suffix in {".md", ".csv"}]
    for path in [p for p in inputs if p.is_file()] + canonical:
        name = path.relative_to(ROOT).as_posix()
        data = path.read_bytes()
        saved = ""
        if path.suffix in {".md", ".csv"}:
            saved = (archive / (name.replace("/", "__") + ".gz")).relative_to(ROOT).as_posix()
            (ROOT / saved).write_bytes(gzip.compress(data, mtime=0))
        rows.append({"original_path": name, "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data), "exact_archive": saved, "kind": "OWNER_INPUT" if KIT in path.parents else "PRE_C7_CANONICAL"})
    with (OUT / "evidence/INPUT_PROVENANCE.csv").open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    print(f"Captured {len(tracked)} tracked files and {len(rows)} inputs; originals preserved as exact gzip bytes.")


if __name__ == "__main__":
    main()
