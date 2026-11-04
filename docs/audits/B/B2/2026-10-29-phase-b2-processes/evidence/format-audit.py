"""Format only new B2 Markdown and its authorized index. Preserve raw evidence as txt."""
import re
import textwrap
from pathlib import Path

root = Path(__file__).resolve().parent.parent
renames = {"b28-professional-pending.md":"b28-professional-pending.txt",
           "b28-professional-all.md":"b28-professional-all.txt",
           "b28-consent-only.md":"b28-consent-only.txt"}
for old, new in renames.items():
    source, target = root / "evidence" / old, root / "evidence" / new
    if source.exists():
        assert not target.exists()
        source.rename(target)
for target in root.rglob("*"):
    if target.is_file() and target.resolve() != Path(__file__).resolve() and target.suffix in (".md", ".py", ".mjs", ".csv", ".json"):
        text = target.read_text(encoding="utf-8")
        updated = text
        for old, new in renames.items():
            updated = updated.replace(old, new)
        if updated != text:
            target.write_text(updated, encoding="utf-8")


def prose_style(text):
    parts = text.split("`")
    for n in range(0, len(parts), 2):
        parts[n] = re.sub(r"\b(os|dos|nos|aos|com|de|por|após|mais|menos|as|na|no)(\d+)(?=[A-Za-zÀ-ÿ])",r"\1 \2 ",parts[n])
        parts[n] = re.sub(r"(?<=[a-zà-ÿ])(?=(?:REQ|COM|ENT|BAL|JSON|E2E|API|HTTP|RPC|CSV|UI|B2|B1)\b)"," ",parts[n])
        parts[n] = re.sub(r"([,;:])(?=[A-Za-zÀ-ÿ])", r"\1 ", parts[n])
        parts[n] = re.sub(r"(?<![\w./-])(\d+)(?=[A-Za-zÀ-ÿ]{3,})", r"\1 ", parts[n])
    return "`".join(parts)


paths = list(root.rglob("*.md")) + [root.parent / "phase-b/README.md"]
for path in paths:
    original = path.read_text(encoding="utf-8")
    lines, result, pos, fenced = original.splitlines(), [], 0, False
    while pos < len(lines):
        line = lines[pos]
        if line.startswith("```"):
            fenced = not fenced
            result.append(line)
            pos += 1
            continue
        if fenced:
            result.append(line)
            pos += 1
            continue
        line = prose_style(line)
        if line.startswith("#") and len(line) > 80 and " — " in line:
            short, title = line.split(" — ", 1)
            result += [short, ""] + textwrap.wrap(title,width=80,break_long_words=False,break_on_hyphens=False)
            pos += 1
            continue
        if line.startswith("|"):
            block = []
            while pos < len(lines) and lines[pos].startswith("|"):
                block.append(lines[pos])
                pos += 1
            if max(map(len, block)) <= 80:
                result += block
                continue
            headers = [s.strip() for s in block[0].strip("|").split("|")]
            for row in block[2:]:
                values = [prose_style(s.strip()) for s in row.strip("|").split("|")]
                assert len(headers) == len(values), (path, row)
                paragraph = "; ".join(f"**{key}:** {value}" for key, value in zip(headers, values))
                result += textwrap.wrap(paragraph, width=80, initial_indent="- ", subsequent_indent="  ", break_long_words=False, break_on_hyphens=False)
                result.append("")
            continue
        if len(line) > 80 and not line.startswith("#"):
            match = re.match(r"^(\s*(?:[-*+] |\d+\. ))(.*)$", line)
            if match:
                prefix, content = match.groups()
                result += textwrap.wrap(content, width=80, initial_indent=prefix, subsequent_indent=" " * len(prefix), break_long_words=False, break_on_hyphens=False)
            else:
                indent = re.match(r"^\s*", line)[0]
                result += textwrap.wrap(line.strip(), width=80, initial_indent=indent, subsequent_indent=indent, break_long_words=False, break_on_hyphens=False)
        else:
            result.append(line)
        pos += 1
    text = "\n".join(result).strip() + "\n"
    text = re.sub(r"\n{3,}", "\n\n", text)
    if text != original:
        path.write_text(text, encoding="utf-8")
print("B2 Markdown formatted; no historical audit or product file changed")
