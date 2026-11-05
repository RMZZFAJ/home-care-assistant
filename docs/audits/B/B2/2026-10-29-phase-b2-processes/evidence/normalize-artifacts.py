"""Normalize authored textual artifacts to LF; preserve master attachment and binaries."""
import gzip
import re
from pathlib import Path

root = Path(__file__).resolve().parent.parent
allowed = {".md", ".csv", ".json", ".mjs", ".py", ".ps1", ".sql", ".log", ".txt", ".yml"}
changed = 0
for path in list(root.rglob("*")) + [root.parent / "phase-b/README.md"]:
    if not path.is_file() or path.suffix not in allowed or path.name == "MASTER_ORDER.txt":
        continue
    before = path.read_bytes()
    after = before.replace(b"\r\n", b"\n")
    if path.suffix == ".log":
        presented = re.sub(rb"[ \t]+(?=\n)", b"", after).rstrip(b"\n") + b"\n"
        if presented != after:
            archive = path.with_suffix(".raw.log.gz")
            if not archive.exists():
                archive.write_bytes(gzip.compress(before,mtime=0))
        after = presented
    if before != after:
        path.write_bytes(after)
        changed += 1
print(f"{changed} authored text artifacts normalized to LF; master attachment unchanged")
