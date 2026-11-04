"""Run the authorized static checks with the pinned Node, no functional suites."""
from pathlib import Path
import json
import os
import subprocess

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent


def main():
    node = Path(os.environ["TEMP"]) / "hca-c7-tools/node-v24.22.0-win-x64/node.exe"
    npm = Path(os.environ["APPDATA"]) / "npm/node_modules/npm/bin/npm-cli.js"
    version = subprocess.check_output([str(node),"--version"]).decode().strip()
    npm_version = subprocess.check_output([str(node),str(npm),"--version"]).decode().strip()
    assert version == "v24.22.0" and npm_version == "11.21.1"
    environment = dict(os.environ)
    environment["PATH"] = str(node.parent) + os.pathsep + environment["PATH"]
    checks=[]
    commands=[
        ("markdownlint",[str(node),str(npm),"run","lint:markdown"]),
        ("contracts_static",[str(node),str(npm),"run","check:contracts"]),
        ("git_diff_check",["git","diff","HEAD","--check"]),
        ("git_staged_diff_check",["git","diff","--cached","--check"]),
    ]
    for name,command in commands:
        logfile=OUT/f"evidence/{name}.txt"
        with logfile.open("w",encoding="utf-8",newline="\n") as stream:
            result=subprocess.run(command,cwd=ROOT,env=environment,stdout=stream,stderr=subprocess.STDOUT,text=True,encoding="utf-8",errors="replace",check=False)
        # Child Windows programs may write CRLF directly to the file descriptor.
        # These are documentary command logs, normalized for Git, not raw probes.
        content=logfile.read_text(encoding="utf-8")
        logfile.write_text("\n".join(line.rstrip() for line in content.splitlines())+("\n" if content else ""),encoding="utf-8",newline="\n")
        checks.append({"name":name,"command":"npm run "+("lint:markdown" if name=="markdownlint" else "check:contracts") if name in {"markdownlint","contracts_static"} else " ".join(command),"exit_code":result.returncode,"status":"PASS" if result.returncode==0 else "FAIL","output":logfile.relative_to(ROOT).as_posix()})
        print(f"{name}: {checks[-1]['status']}",flush=True)
    report={"date":"2026-11-04","timezone":"America/Sao_Paulo","node":version,"npm":npm_version,"scope":"STATIC_DOCUMENTARY;NO_UNIT_BUILD_E2E_DB_OR_REMOTE_TESTS","checks":checks}
    (OUT/"evidence/checks.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8",newline="\n")
    raise SystemExit(1 if any(r["exit_code"] for r in checks) else 0)


if __name__=="__main__":main()
