"""Read-only byte verification of both artifacts and, optionally, staged Git blobs."""
import hashlib
import json
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
repo = root.parents[2]
manifest_path = root / "evidence/manifest.json"
data = json.loads(manifest_path.read_text(encoding="utf-8"))
prefix = str(root.relative_to(repo)).replace("\\", "/") + "/"
issues = []
for row in data["files"]:
    path = root / row["path"]
    content = subprocess.check_output(["git","show","HEAD:"+prefix+row["path"]],cwd=repo) if "--head" in sys.argv else path.read_bytes()
    if len(content) != row["bytes"] or hashlib.sha256(content).hexdigest() != row["sha256"]:
        issues.append("Worktree bytes: " + row["path"])
    if "--index" in sys.argv:
        staged = subprocess.check_output(["git", "show", ":" + prefix + row["path"]], cwd=repo)
        if hashlib.sha256(staged).hexdigest() != row["sha256"]:
            issues.append("Staged bytes: " + row["path"])
expected = {prefix + row["path"] for row in data["files"]} | {prefix + "evidence/manifest.json", "docs/audits/phase-b/README.md"}
if "--index" in sys.argv:
    staged_paths = set(subprocess.check_output(["git", "diff", "--cached", "--name-only"], cwd=repo).decode("utf-8").splitlines())
    if staged_paths != expected:
        issues.append("Staged path set mismatch: " + str(sorted(staged_paths ^ expected)))
    for path in [manifest_path, repo / "docs/audits/phase-b/README.md"]:
        blob = subprocess.check_output(["git", "show", ":" + str(path.relative_to(repo)).replace("\\", "/")], cwd=repo)
        if blob != path.read_bytes():
            issues.append("Staged control file mismatch: " + path.name)
print(json.dumps({"passed":not issues,"manifestEntries":len(data["files"]),"indexChecked":"--index" in sys.argv,"committedBlobsChecked":"--head" in sys.argv,"issues":issues},ensure_ascii=False,indent=2))
sys.exit(bool(issues))
