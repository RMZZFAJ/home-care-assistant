"""Format only authorized changed/new Markdown, preserving table cell contents."""
from pathlib import Path
import csv
import hashlib
import re
import runpy
import subprocess

ROOT = Path(__file__).resolve().parents[4]
BASE = ROOT / "docs/audits/C"
OUT = Path(__file__).resolve().parent


def wrap_paragraph(value, prefix="", continuation=""):
    tokens=[]; previous_end=None
    for match in re.finditer(r"\[[^\]]*\]\([^)]*\)|`[^`]*`|\S+",value):
        if match.start()==previous_end:tokens[-1]+=match[0]
        else:tokens.append(match[0])
        previous_end=match.end()
    result=[];line=prefix;count=0
    for token in tokens:
        extra=(" " if line.strip() else "")+token
        # Never emit a bare list marker for an indivisible long link/code.
        if len(line+extra)>78 and count:
            result.append(line.rstrip());line=continuation+token;count=1
        else:line+=extra;count+=1
    result.append(line.rstrip())
    return result


def format_scoped(value, library):
    """Wrap complete list/prose paragraphs, preserving continuation indentation."""
    lines=value.splitlines(); result=[]; i=0
    while i<len(lines):
        line=lines[i].rstrip()
        if not line.strip():result.append("");i+=1;continue
        if line.strip()=="<!-- c-table:start -->":
            block=[]
            while i<len(lines):
                block.append(lines[i].rstrip())
                if lines[i].strip()=="<!-- c-table:end -->":break
                i+=1
            parsed=library["parse_tables"]("\n".join(block))
            assert len(parsed)==1
            headers,records=parsed[0]
            raw_table=["| "+" | ".join(headers)+" |","| "+" | ".join("---" for _ in headers)+" |"]
            raw_table += ["| "+" | ".join(cells)+" |" for _,cells in records]
            result.extend(library["format_markdown"]("\n".join(raw_table)).splitlines())
            i+=1;continue
        if re.match(r"^\s*(```|~~~)",line):
            fence=line.strip()[:3];result.append(line);i+=1
            while i<len(lines):
                result.append(lines[i].rstrip())
                if lines[i].strip().startswith(fence):i+=1;break
                i+=1
            continue
        if line.startswith("|") and i+1<len(lines) and library["separator"](lines[i+1]):
            table=[]
            while i<len(lines) and lines[i].strip().startswith("|"):
                table.append(lines[i]);i+=1
            result.extend(library["format_markdown"]("\n".join(table)).splitlines());continue
        heading=re.match(r"^(#+)\s+(.*)",line)
        if heading:
            if len(line)>80:
                first,sep,rest=heading[2].partition(" — ")
                if not sep:first,sep,rest=heading[2].partition(" · ")
                if len(heading[1]+" "+first)<=80:
                    result.extend([heading[1]+" "+first,""]+library["wrap"](rest))
                else:
                    result.extend([heading[1]+" Referência da fonte",""]+library["wrap"](heading[2]))
            else:result.append(line)
            i+=1;continue
        if line.startswith("<!--") or re.fullmatch(r"[-*_]{3,}",line):result.append(line);i+=1;continue
        item=re.match(r"^(\s*)([-*]|\d+\.)\s+(.*)",line)
        if item and result and result[-1].strip():result.append("")
        quote=line.startswith(">")
        prefix=item[1]+item[2] if item else (">" if quote else "")
        paragraph=[item[3] if item else (line.lstrip("> ") if quote else line.strip())]
        i+=1
        while i<len(lines) and lines[i].strip():
            following=lines[i]
            if re.match(r"^\s*(?:[-*]\s|\d+\.\s|#+\s|```|~~~|<!--|\|)",following):break
            if quote!=following.startswith(">"):break
            paragraph.append(following.lstrip("> ") if quote else following.strip());i+=1
        continuation=(" "*(len(prefix)+1)) if item else ("> " if quote else "")
        result.extend(wrap_paragraph(" ".join(paragraph),prefix,continuation))
    return re.sub(r"\n{3,}","\n\n","\n".join(result)).rstrip()+"\n"


def main():
    library = runpy.run_path(str(BASE / "C6-acceptance-handoff/format_documentation.py"))
    changed = subprocess.check_output(["git", "diff", "--name-only", "HEAD"], cwd=ROOT).decode().splitlines()
    targets = {ROOT / p for p in changed if p.endswith(".md") and (ROOT / p).exists()}
    targets |= {p for folder in ["C7-decision-closure", "C8-visual-blueprint", "C9-acceptance-refinement", "C10-pr-handoff"] for p in (BASE / folder).rglob("*.md")}
    logs = []
    for path in sorted(targets):
        assert path.resolve().is_relative_to(ROOT.resolve())
        assert "/audits/A/" not in path.as_posix() and "/audits/B/" not in path.as_posix()
        raw = path.read_bytes()
        value = raw.decode("utf-8")
        value = value.replace("A PREENENCHER", "A PREENCHER").replace("never JSON", "nunca JSON").replace("texto/expression", "texto/expressão")
        value = value.replace("___", "[a cotar]")
        value = re.sub(r"\b(As|Os|Há|as|os|há|de|em|por|com|dos|das|aos|para|relacionam)(?=\d)", r"\1 ", value)
        rendered = format_scoped(value, library)
        assert library["table_content"](value) == library["table_content"](rendered), str(path)
        assert format_scoped(rendered, library) == rendered, str(path)
        if raw != rendered.encode():
            path.write_text(rendered, encoding="utf-8", newline="\n")
            logs.append({"path":path.relative_to(ROOT).as_posix(),"before_sha256":hashlib.sha256(raw).hexdigest(),"after_sha256":hashlib.sha256(rendered.encode()).hexdigest(),"method":"SCOPED_WRAP;TABLE_CELLS_PRESERVED;TYPO_SPACING;NO_LINT_RULE_CHANGE"})
    if logs:
        with (OUT / "evidence/FORMATTING_LOG.csv").open("w", encoding="utf-8", newline="") as stream:
            w = csv.DictWriter(stream, fieldnames=list(logs[0]), lineterminator="\n"); w.writeheader(); w.writerows(logs)
    # C3 anchors are a derived index and must follow final formatting.
    indexpath = BASE / "C3-functional-specification/SCREEN_FIELD_ACTION_INVENTORY.csv"
    with indexpath.open(encoding="utf-8-sig",newline="") as stream:
        index = list(csv.DictReader(stream))
    for domain in {r["domain"] for r in index}:
        tables = library["parse_tables"]((BASE / f"C3-functional-specification/{domain}.md").read_text(encoding="utf-8"))
        fields = [(n,c) for h,rs in tables if h[0] == "Campo" for n,c in rs]
        screens = {c[0]:(n,c) for h,rs in tables if h[0] == "Tela" for n,c in rs}
        domain_fields = [r for r in index if r["domain"] == domain and r["record_type"] == "FIELD"]
        assert len(fields) == len(domain_fields)
        for row,(line,cells) in zip(domain_fields,fields):
            assert cells[0] == row["field_label"]
            row["source_line"] = line
        for row in [r for r in index if r["domain"] == domain and r["record_type"] == "SCREEN_ACTIONS"]:
            row["source_line"] = screens[row["screen_scope"]][0]
    with indexpath.open("w",encoding="utf-8",newline="") as stream:
        w = csv.DictWriter(stream,fieldnames=list(index[0]),lineterminator="\n"); w.writeheader(); w.writerows(index)
    print(f"Formatted {len(logs)} authorized documents; C3 anchors refreshed; table content and idempotence verified.")


if __name__ == "__main__":
    main()
