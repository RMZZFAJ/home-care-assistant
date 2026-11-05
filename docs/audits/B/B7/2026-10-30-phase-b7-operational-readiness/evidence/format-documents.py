"""Format only B7 Markdown. Does not change lint rules or run product checks."""
from pathlib import Path
import re
import textwrap

root = Path(__file__).resolve().parent.parent
units = ('registros|rotinas|fontes|páginas|pontos|campos|classes|eventos|documentos|'
         'contas|cenários|PDFs|versões|linhas|bytes|renders|objetos|referências|'
         'migrations|pacientes|regimes|domínios|incidentes|critérios|nós|nos|'
         'entradas|respostas|chamadas|sucessos|provas|inspeções|componentes|'
         'dependências|contraprovas|leases|casos|MB|MiB|ms|s|P2|P3')

def clean(value):
    parts = re.split(r'(`[^`]*`|https?://\S+)', value)
    for i in range(0, len(parts), 2):
        p = parts[i]
        p = re.sub(r';(?=\S)', '; ', p)
        p = re.sub(r',(?=[A-Za-zÀ-ÿ])', ', ', p)
        p = re.sub(r'(?<=\d)(' + units + r')\b', r' \1', p)
        p = re.sub(r'\b(dos|das|de|em|as|e|com|até|sem|entre|somente|por|'
                   r'local|remoto|lote|worker|produção|produtos|teto|CLI|'
                   r'B7|schema|suporta|para)(?=\d)', r'\1 ', p)
        p = re.sub(r'\b(\d+)\.([A-ZÀ-Ý])', r'\1. \2', p)
        parts[i] = p
    return ''.join(parts)

for path in root.rglob('*.md'):
    content = path.read_text(encoding='utf-8-sig')
    content = re.sub(r'^## (B7-\d{3}) — (.+)$',
                     r'## \1\n\n**Título:** \2', content, flags=re.M)
    lines = content.splitlines()
    records = []
    index = 0
    fence = False
    while index < len(lines):
        line = lines[index]
        if line.startswith('```'):
            fence = not fence
        if not fence and line.startswith('|'):
            table = []
            while index < len(lines) and lines[index].startswith('|'):
                table.append([x.strip() for x in
                              lines[index].strip('|').split('|')])
                index += 1
            headers = table[0]
            records.append('')
            for row in table[2:]:
                assert len(headers) == len(row), path
                text = '- **' + row[0] + '**. ' + ' '.join(
                    '**' + h + ':** ' + v + '.'
                    for h, v in zip(headers[1:], row[1:]))
                records.append(text)
            records.append('')
            continue
        records.append(line)
        index += 1
    output = []
    paragraph = []
    fence = False

    def flush():
        if not paragraph:
            return
        text = clean(' '.join(x.strip() for x in paragraph))
        marker = re.match(r'^(?:[-*]|\d+\.)\s+', text)
        indent = ' ' * len(marker.group()) if marker else ''
        output.extend(textwrap.wrap(text, width=80,
                                    subsequent_indent=indent,
                                    break_long_words=False,
                                    break_on_hyphens=False))
        paragraph.clear()

    for line in records:
        if line.startswith('```'):
            flush()
            fence = not fence
            output.append(line)
        elif fence:
            output.append(line)
        elif not line.strip():
            flush()
            output.append('')
        elif line.startswith('#'):
            flush()
            output.append(clean(line))
        else:
            if re.match(r'^(?:[-*]|\d+\.)\s+', line):
                flush()
            paragraph.append(line)
    flush()
    normalized = re.sub(r'\n{3,}', '\n\n', '\n'.join(output)).strip() + '\n'
    path.write_text(normalized, encoding='utf-8', newline='\n')
print('B7 prose wrapped; table records retain field labels; rules unchanged')
