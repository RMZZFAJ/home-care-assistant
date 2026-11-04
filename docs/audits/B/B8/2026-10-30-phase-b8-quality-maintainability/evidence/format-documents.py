"""Wrap authored B8 Markdown only; do not change lint rules or old reports."""
from pathlib import Path
import csv
import re
import textwrap

ROOT = Path(__file__).resolve().parent.parent
units = ("registros|famílias|rotinas|fontes|páginas|pontos|campos|classes|eventos|"
         "documentos|contas|cenários|PDFs|versões|linhas|bytes|objetos|casos|"
         "referências|migrations|pacientes|regimes|domínios|critérios|entradas|"
         "respostas|chamadas|provas|scripts|suítes|testes|unitários|integrações|"
         "dependências|contraprovas|observações|arquivos|hashes|arquivos unitários|specs|"
         "consumidores|MB|MiB|ms|s|E2E|SQL|P1|P2|P3")

def clean(value):
    pieces = re.split(r"(`[^`]*`|https?://\S+)", value)
    for index in range(0, len(pieces), 2):
        part = pieces[index]
        part = re.sub(r";(?=\S)", "; ", part)
        part = re.sub(r",(?=[A-Za-zÀ-ÿ])", ", ", part)
        part = re.sub(r"(?<!\w)(\d+)(" + units + r")\b", r"\1 \2", part)
        part = re.sub(r"\b(P[0-3]) s\b", r"\1s", part)
        part = re.sub(r"\b(dos|das|de|em|as|e|com|até|sem|entre|por|Há|há|"
                      r"após|antes|tinha|tem|é|são|No|no|na|do|da|lote|"
                      r"worker|caso|origem|versão|snapshot|teto|SHA)(?=\d)", r"\1 ", part)
        part = re.sub(r"\b(\d+)\.(?=[A-ZÀ-Ý])", r"\1. ", part)
        pieces[index] = part
    return "".join(pieces)

for file in ROOT.rglob("*.md"):
    content = file.read_text(encoding="utf-8-sig")
    content = re.sub(r"^-(?=\d)", "- ", content, flags=re.M)
    content = re.sub(r"^## (B8-[QM]\d{3}) — (.+)$", r"## \1\n\n**Título:** \2", content, flags=re.M)
    result, paragraph = [], []
    fence = False

    def flush():
        if not paragraph:
            return
        prose = clean(" ".join(line.strip() for line in paragraph))
        marker = re.match(r"^(?:[-*]|\d+\.)\s+", prose)
        indent = " " * len(marker.group()) if marker else ""
        result.extend(textwrap.wrap(prose, width=80, subsequent_indent=indent,
                                    break_long_words=False, break_on_hyphens=False))
        paragraph.clear()

    for line in content.splitlines():
        if line.startswith("```"):
            flush()
            fence = not fence
            result.append(line)
        elif fence:
            result.append(line)
        elif not line.strip():
            flush()
            result.append("")
        elif line.startswith("#"):
            flush()
            result.append(clean(line))
        else:
            if re.match(r"^(?:[-*]|\d+\.)\s+", line):
                flush()
            paragraph.append(line)
    flush()
    file.write_text(re.sub(r"\n{3,}", "\n\n", "\n".join(result)).strip() + "\n",
                    encoding="utf-8", newline="\n")
print("B8 authored Markdown formatted; existing rules and reports preserved.")

prose_fields = {"title", "cause_title", "cause", "expected", "limits", "limit",
                "observed", "method", "counterproof", "consequence", "acceptance",
                "future", "decision", "human", "remote", "protected",
                "exact_coverage_gap", "current_test_result", "correct_behavior_after_decision",
                "future_regression", "pending_decision", "human_validation",
                "physical_or_assistive_validation", "remote_homologation"}
for file in ROOT.rglob("*.csv"):
    with file.open(encoding="utf-8", newline="") as source:
        reader = csv.DictReader(source)
        fields = reader.fieldnames
        rows = list(reader)
    for row in rows:
        for field in prose_fields.intersection(fields or []):
            row[field] = clean(row[field])
    with file.open("w", encoding="utf-8", newline="") as target:
        writer = csv.DictWriter(target, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
