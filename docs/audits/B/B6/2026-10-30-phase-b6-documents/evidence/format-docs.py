"""Formats only the new B6 Markdown; no functional checks are executed."""
from pathlib import Path
import re,textwrap

root=Path(__file__).resolve().parent.parent
units='registros|rotinas|fontes|páginas|pontos|campos|classes|eventos|documentos|contas|cenários|transações|PDFs|versões|linhas|parágrafos|caracteres|bytes|E2E|P2|P3|quarantine|ready|renders|objetos|referências|primárias|cinza|anexos|novas|correto'

def clean(value):
    # Preserve inline code/URLs while fixing dense numerical prose.
    parts=re.split(r'(`[^`]*`|https?://\S+)',value)
    for i,part in enumerate(parts):
        if i%2:continue
        part=re.sub(r';(?=\S)','; ',part)
        part=re.sub(r',(?=[A-Za-zÀ-ÿ0-9])',', ',part)
        part=re.sub(r'(?<!:):(?![:/\\*])(?=\S)',': ',part)
        part=re.sub(r'(?<=\d)('+units+r')\b',r' \1',part)
        part=re.sub(r'\b(dos|das|de|em|as|As|e|com|conservaram|Consolidação|Preservação|não|saldo)(?=\d)',r'\1 ',part)
        part=re.sub(r'(?<=[A-Za-zÀ-ÿ])\.(?=[A-Z0-9])','. ',part)
        parts[i]=part
    return ''.join(parts)

for path in root.rglob('*.md'):
    text=path.read_text(encoding='utf-8').replace('\u200b','')
    text=re.sub(r'(\*\*[^*]+):\s+\*\*',r'\1:**',text)
    # Retain long finding title as a paragraph instead of an overlong heading.
    text=re.sub(r'^## (B6-\d{3}) — (.+)$',r'## \1\n\n**Título:** \2',text,flags=re.M)
    text=re.sub(r'(^## B6-\d{3}\n\n)\*\*([\s\S]*?)\*\*(?=\n\n)',r'\1**Título:** \2',text,flags=re.M)
    lines=text.splitlines();converted=[];i=0;fence=False
    while i<len(lines):
        line=lines[i]
        if line.startswith('```'):fence=not fence
        if not fence and line.startswith('|'):
            table=[]
            while i<len(lines) and lines[i].startswith('|'):
                table.append([c.strip() for c in lines[i].strip('|').split('|')]);i+=1
            assert len(table)>=2
            headers=table[0]
            converted.append('')
            for row in table[2:]:
                assert len(row)==len(headers)
                body='- **'+row[0]+'**. '+' '.join(f'**{h}:** {v}.' for h,v in zip(headers[1:],row[1:]))
                converted.append(body)
            converted.append('');continue
        converted.append(line);i+=1
    output=[];block=[];fence=False
    def flush():
        if not block:return
        paragraph=' '.join(s.strip() for s in block)
        paragraph=clean(paragraph)
        marker=re.match(r'^(?:[-*]|\d+\.)\s+',paragraph)
        indent=' '*len(marker.group()) if marker else ''
        output.extend(textwrap.wrap(paragraph,width=80,subsequent_indent=indent,break_long_words=False,break_on_hyphens=False));block.clear()
    for line in converted:
        if line.startswith('```'):
            flush();fence=not fence;output.append(line);continue
        if fence:output.append(line);continue
        if not line.strip():flush();output.append('');continue
        if line.startswith('#'):
            flush();output.append(clean(line));continue
        if re.match(r'^(?:[-*]|\d+\.)\s+',line):flush()
        block.append(line)
    flush()
    normalized=re.sub(r'\n{3,}','\n\n','\n'.join(output)).strip()+'\n'
    path.write_text(normalized,encoding='utf-8',newline='\n')
print('B6 Markdown wrapped;tables converted to labeled records;rules unchanged')
