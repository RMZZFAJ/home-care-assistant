"""Refresh derived cause text, normalize documentary CSV newlines and hash outputs."""
from pathlib import Path
import argparse
import csv
import hashlib
import importlib.util
import json
import subprocess

ROOT=Path(__file__).resolve().parents[4]
BASE=ROOT/"docs/audits/C"
OUT=Path(__file__).resolve().parent


def read(path):
    with path.open(encoding="utf-8-sig",newline="") as stream:return list(csv.DictReader(stream))


def manifest_digest(path):
    raw=path.read_bytes()
    policy="EXACT_BYTES"
    if path.suffix in {".md",".csv",".py",".json",".txt"}:
        raw=raw.replace(b"\r\n",b"\n")
        policy="UTF8_TEXT_LF_NEWLINES"
    return hashlib.sha256(raw).hexdigest(),policy,len(raw)


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--manifest",action="store_true")
    parser.add_argument("--cause-summary",action="store_true")
    args=parser.parse_args()
    if args.cause_summary:
        causes=read(BASE/"C1-consolidation/CAUSE_FAMILIES_MASTER.csv")
        body="# 121 causas — índice reconciliado C7\n\n165 fontes originais,121 causas e prioridades históricas preservadas.\nRevisão individual em C7; nenhum defeito foi corrigido por documentação.\nFonte estruturada: [CAUSE_FAMILIES_MASTER.csv](CAUSE_FAMILIES_MASTER.csv).\nCópia anterior exata no arquivo C10. D NÃO INICIADA; produção NO-GO.\n\n"
        for row in causes:
            body+=f"## {row['cause_id']}\n\n{row['title']}.\n\nFontes: {row['source_ids']}. Prioridade: {row['technical_priority']}; gate: {row['release_gate']}. Domínio: {row['domain']}; lote: {row['planned_package']}.\n\nCausa: {row['causal_reason']}\n\nRevisão C7: {row['semantic_review']}\n\nEsperado: {row['correct_behavior']}\n\nDecisões: {row['decision_refs']}. [Spec](../../../..//{row['specification'].removeprefix('docs/')}).\n\n"
        # C1 -> docs is three parents; specs are already relative to docs.
        body=body.replace("../../../..//audits/","../../../audits/")
        (BASE/"C1-consolidation/CAUSE_FAMILIES_MASTER.md").write_text(body,encoding="utf-8")
    changed=subprocess.check_output(["git","diff","--name-only","HEAD"],cwd=ROOT).decode().splitlines()
    csv_files={ROOT/p for p in changed if p.endswith(".csv") and p.startswith("docs/") and (ROOT/p).is_file()}
    csv_files|={p for name in ["C7-decision-closure","C8-visual-blueprint","C9-acceptance-refinement","C10-pr-handoff"] for p in (BASE/name).rglob("*.csv")}
    csv_files|={p for name in ["C7-decision-closure","C8-visual-blueprint","C9-acceptance-refinement","C10-pr-handoff"] for p in (BASE/name).rglob("*") if p.is_file() and p.suffix in {".json",".txt",".py",".md"} and "__pycache__" not in str(p)}
    for path in csv_files:
        raw=path.read_bytes(); normalized=raw.replace(b"\r\n",b"\n")
        if raw!=normalized:path.write_bytes(normalized)
    if args.manifest:
        spec=importlib.util.spec_from_file_location("validate_part2",OUT/"validate_part2.py")
        module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        manifest=OUT/"evidence/MANIFEST.json"
        rows=[]
        for path in sorted(module.targets()):
            if path==manifest:continue
            h,policy,size=manifest_digest(path)
            rows.append({"path":path.relative_to(ROOT).as_posix(),"sha256":h,"bytes_under_hash_policy":size,"hash_policy":policy})
        manifest.write_text(json.dumps({"date":"2026-11-04","scope":"C7_C10_AND_CHANGED_LIVING_DOCUMENTS;SELF_EXCLUDED","text_policy":"LF normalization only; input gzip/HTML/PNG exact bytes; no source evidence rewritten","files":rows},ensure_ascii=False,indent=2)+"\n",encoding="utf-8",newline="\n")
        print(f"Manifest: {len(rows)} files; self excluded.")
    else:print(f"Normalized {len(csv_files)} authorized CSV files; original input archives unchanged.")


if __name__=="__main__":main()
