"""Wrap audit prose and expand wide tables without changing lint policy."""
from pathlib import Path
import re
import textwrap

base = Path('docs/audits/2026-10-25-production-readiness')
for p in base.rglob('*.md'):
    if p.name == 'e2e-navigation-failure-context.md':
        continue
    lines = p.read_text(encoding='utf-8-sig').splitlines()
    out = []
    i = 0
    fenced = False
    while i < len(lines):
        line = lines[i]
        if line.startswith('```'):
            fenced = not fenced
            out.append(line)
            i += 1
            continue
        if fenced:
            out.append(line)
            i += 1
            continue
        if (line.startswith('|') and i + 1 < len(lines)
                and re.match(r'^\|[ :|\-]+\|$', lines[i + 1])):
            end = i + 2
            while end < len(lines) and lines[end].startswith('|'):
                end += 1
            block = lines[i:end]
            if max(map(len, block)) <= 80:
                out.extend(block)
            else:
                headers = [c.strip() for c in line.strip('|').split('|')]
                for row in lines[i + 2:end]:
                    cells = [c.strip() for c in row.strip('|').split('|')]
                    text = '; '.join(f'{h}: {v}' for h, v in zip(headers, cells))
                    out.extend(textwrap.wrap('- ' + text, width=80,
                        subsequent_indent='  ', break_long_words=False,
                        break_on_hyphens=False))
            i = end
            continue
        if len(line) > 80 and not line.startswith('#'):
            prefix = re.match(r'^(\s*(?:\d+\.|-)\s+)', line)
            indent = ' ' * len(prefix.group(1)) if prefix else re.match(r'^\s*', line).group()
            out.extend(textwrap.wrap(line, width=80, subsequent_indent=indent,
                break_long_words=False, break_on_hyphens=False))
        else:
            out.append(line)
        i += 1
    p.write_text('\n'.join(out).rstrip() + '\n', encoding='utf-8')
print('Audit Markdown formatted; product files untouched.')
