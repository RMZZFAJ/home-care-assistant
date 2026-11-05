"""Preserve the approved input and pre-complement documents exactly once."""
from pathlib import Path
import gzip
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent / "final-closure"
ATTACHMENT = Path(r"C:\Users\renat\.codex\attachments\ad23678f-474e-45ff-8b94-1c55533a325e\Texto colado.txt")


def main():
    evidence = OUT / "evidence"
    evidence.mkdir(parents=True, exist_ok=True)
    target = evidence / "BASELINE.json"
    if target.exists():
        raise SystemExit("Baseline exists; never overwrite historical evidence.")
    git = lambda *args: subprocess.check_output(["git", *args], cwd=ROOT).decode("utf-8").strip()
    assert git("branch", "--show-current") == "audit/phase-b"
    tracked = git("ls-files").splitlines()
    hashes = {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest() for name in tracked}
    archives = []
    inputs = OUT / "inputs"
    inputs.mkdir(parents=True, exist_ok=True)
    for name in tracked:
        if (name == "README.md" or name.startswith(("docs/current/", "docs/decisions/", "docs/audits/C/"))) and (name.endswith((".md", ".csv", ".py")) or "/evidence/" in name and name.endswith(".json")) and "/inputs/" not in name and "/C0-baseline/" not in name:
            raw = (ROOT / name).read_bytes()
            archive = inputs / (name.replace("/", "__") + ".gz")
            archive.write_bytes(gzip.compress(raw, mtime=0))
            archives.append({"path": name, "archive": archive.relative_to(ROOT).as_posix(), "sha256": hashes[name], "bytes": len(raw)})
    raw = ATTACHMENT.read_bytes()
    (inputs / "OWNER_COMPLEMENT_ORDER.md.gz").write_bytes(gzip.compress(raw, mtime=0))
    (OUT / "OWNER_COMPLEMENT_ORDER.md").write_text(raw.decode("utf-8-sig"), encoding="utf-8", newline="\n")
    baseline = {"mission": "FINAL_PHASE_C_COMPLEMENT", "date": "2026-11-04", "timezone": "America/Sao_Paulo", "branch": git("branch", "--show-current"), "head": git("rev-parse", "HEAD"), "master": git("rev-parse", "origin/master"), "preexisting_status": git("status", "--porcelain"), "tracked_worktree_sha256": hashes, "archives": archives, "owner_order_sha256": hashlib.sha256(raw).hexdigest(), "permitted": "README.md and docs only; no functional/support changes; no DB/environment mutation or deliberate deployment; no merge; no Phase D"}
    target.write_text(json.dumps(baseline, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"head": baseline["head"], "tracked": len(hashes), "archives": len(archives), "owner_order_sha256": baseline["owner_order_sha256"]}))


if __name__ == "__main__":
    main()
