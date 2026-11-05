"""Run the proportional documentary checks with the repository's pinned tools."""
from pathlib import Path
import json
import os
import subprocess

ROOT=Path(__file__).resolve().parents[4]
OUT=Path(__file__).resolve().parent/"final-closure/evidence"


def main():
    node_dir=Path(os.environ["TEMP"])/"hca-c7-tools/node-v24.22.0-win-x64"
    node=node_dir/"node.exe"
    npm=Path(os.environ["APPDATA"])/"npm/node_modules/npm/bin/npm-cli.js"
    env=dict(os.environ,PATH=str(node_dir)+os.pathsep+os.environ["PATH"])
    def version(args):
        return subprocess.check_output(args,cwd=ROOT,env=env).decode().strip()
    node_version=version([str(node),"--version"])
    npm_version=version([str(node),str(npm),"--version"])
    assert node_version=="v"+(ROOT/".nvmrc").read_text(encoding="utf-8").strip()
    assert npm_version==json.loads((ROOT/"package.json").read_text(encoding="utf-8"))["packageManager"].split("@")[1]
    commands=[("markdown",[str(node),str(npm),"run","lint:markdown"]),("contracts",[str(node),str(npm),"run","check:contracts"]),("diff",["git","diff","HEAD","--check"]),("staged_diff",["git","diff","--cached","--check"])]
    records=[]
    for name,args in commands:
        result=subprocess.run(args,cwd=ROOT,env=env,capture_output=True)
        output=(result.stdout+result.stderr).decode("utf-8",errors="replace")
        (OUT/(name+".txt")).write_text("\n".join(line.rstrip() for line in output.splitlines())+"\n",encoding="utf-8",newline="\n")
        records.append({"check":name,"command":args[2:] if name in {"markdown","contracts"} else args,"exit_code":result.returncode})
        print(name+": "+str(result.returncode),flush=True)
        if result.returncode:
            print(output[-5000:],flush=True)
    report={"date":"2026-11-04","timezone":"America/Sao_Paulo","node":node_version,"npm":npm_version,"scope":"DOCUMENTARY_ONLY_NO_FUNCTIONAL_SUITE_OR_DB","checks":records}
    (OUT/"CHECKS.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8",newline="\n")
    raise SystemExit(1 if any(r["exit_code"] for r in records) else 0)


if __name__=="__main__":
    main()
