"""Lossless cell/prose formatting for authored C/current Markdown only.

Wide tables become labeled records, keeping every cell. This avoids changing
lint rules or rendering unreadable multi-column tables. Raw evidence excluded.
"""
from pathlib import Path
import csv
import hashlib
import re
import textwrap

ROOT=Path(__file__).resolve().parents[4]
OUT=Path(__file__).resolve().parent

def cells(line):return [c.strip() for c in line.strip().strip('|').split('|')]
def separator(line):return bool(line.strip().startswith('|') and all(set(c)<=set(' -:') for c in cells(line)))
def wrap(value,first='',continuation=''):
    # Links/code remain atomic; do not insert whitespace into a destination.
    tokens=[];previous_end=None
    for token in re.finditer(r'\[[^\]]*\]\([^)]*\)|`[^`]*`|\S+',value):
        if token.start()==previous_end:tokens[-1]+=token[0]
        else:tokens.append(token[0])
        previous_end=token.end()
    result=[];line=first
    for token in tokens:
        extra=(' ' if line.strip() else '')+token
        if len(line+extra)>78 and line.strip():result.append(line.rstrip());line=continuation+token
        else:line+=extra
    result.append(line.rstrip())
    return result

def parse_tables(text):
    """Return (headers, [(source_line, cells)]) for pipe or labeled tables."""
    lines=text.splitlines();tables=[];i=0
    while i<len(lines):
        if lines[i].strip()=='<!-- c-table:start -->':
            headers=[];records=[];current=[];line_no=0;i+=1
            while i<len(lines) and lines[i].strip()!='<!-- c-table:end -->':
                first=re.match(r'^- \*\*([^*]+):\*\*\s*(.*)',lines[i])
                other=re.match(r'^  \*\*([^*]+):\*\*\s*(.*)',lines[i])
                if first:
                    if current:records.append((line_no,[v for k,v in current]))
                    current=[(first[1],first[2])];line_no=i+1
                elif other:current.append((other[1],other[2]))
                elif current and lines[i].strip():
                    k,v=current[-1];current[-1]=(k,(v+' ' if v else '')+lines[i].strip())
                if current and len(current)>len(headers):headers=[k for k,v in current]
                i+=1
            if current:records.append((line_no,[v for k,v in current]))
            tables.append((headers,records))
        elif lines[i].strip().startswith('|') and i+1<len(lines) and separator(lines[i+1]):
            headers=cells(lines[i]);records=[];i+=2
            while i<len(lines) and lines[i].strip().startswith('|'):
                records.append((i+1,cells(lines[i])));i+=1
            tables.append((headers,records));continue
        i+=1
    return tables

def format_markdown(text):
    lines=text.splitlines();result=[];i=0;fence=None;heading_seen={};section=''
    while i<len(lines):
        line=lines[i].rstrip()
        marker=re.match(r'^\s*(`{3,}|~{3,})',line)
        if marker:
            char=marker[1][0];fence=None if fence==char else char
            result.append(line);i+=1;continue
        if fence:result.append(line);i+=1;continue
        if line.strip()=='<!-- c-table:start -->':
            while i<len(lines):
                result.append(lines[i].rstrip())
                if lines[i].strip()=='<!-- c-table:end -->':break
                i+=1
            i+=1;continue
        if line.startswith('|') and i+1<len(lines) and separator(lines[i+1]):
            headers=cells(line);rows=[];i+=2
            while i<len(lines) and lines[i].strip().startswith('|'):
                rows.append(cells(lines[i]));i+=1
            assert all(len(row)==len(headers) for row in rows)
            widths=[max(len(headers[n]),*(len(row[n]) for row in rows)) for n in range(len(headers))]
            if sum(widths)+3*len(widths)+1<=80:
                def rowline(row):return '| '+' | '.join(value.ljust(widths[n]) for n,value in enumerate(row))+' |'
                result += [rowline(headers),rowline(['-'*w for w in widths])]+[rowline(row) for row in rows]
            else:
                result += ['<!-- c-table:start -->','']
                for row in rows:
                    for n,(header,value) in enumerate(zip(headers,row)):
                        prefix=('- ' if n==0 else '  ')+f'**{header}:**'
                        result += wrap(value,prefix,'  ')+['']
                result += ['<!-- c-table:end -->']
            continue
        heading=re.match(r'^(#+)\s+(.*)',line)
        if heading:
            title=heading[2]
            match=re.match(r'C[0-6]\b',title)
            if match:section=match[0]
            heading_seen[title]=heading_seen.get(title,0)+1
            if heading_seen[title]>1:title+=' — '+(section or str(heading_seen[title]))
            if len(heading[1]+' '+title)>80:
                code=re.match(r'(DEC-\d{3}) — (.*)',title)
                if code:result += [heading[1]+' '+code[1],'']+wrap(code[2])
                else:result += wrap(title)
            else:result.append(heading[1]+' '+title)
            i+=1;continue
        if not line.strip():result.append('');i+=1;continue
        if line.startswith(('<!--','[','    ')) or re.match(r'^[-*_]{3,}$',line):
            # Standalone links/reference definitions and indented code stay atomic.
            if line.startswith('[') and '](' in line and not re.fullmatch(r'\[[^\]]+\]\([^)]*\)[.;]?',line):result+=wrap(line)
            else:result.append(line)
            i+=1;continue
        list_item=re.match(r'^(\s*)([-*]|\d+\.)\s+(.*)',line)
        if list_item:
            prefix=list_item[1]+list_item[2]+' '
            result+=wrap(list_item[3],prefix,' '*len(prefix))
        else:result+=wrap(line)
        i+=1
    value='\n'.join(result)
    return re.sub(r'\n{3,}','\n\n',value).rstrip()+'\n'

def table_content(text):return [(h,[c for line,c in rows]) for h,rows in parse_tables(text)]

def main():
    test='| Campo | Tipo |\n| --- | --- |\n| Nome | '+('valor '*30).strip()+' |\n'
    formatted=format_markdown(test)
    assert table_content(test)==table_content(formatted),'Cell-preservation oracle failed'
    assert format_markdown(formatted)==formatted,'Idempotence oracle failed'
    targets=list((ROOT/'docs/audits/C').rglob('*.md'))+list((ROOT/'docs/current').glob('*.md'))+list((ROOT/'docs/decisions').glob('*.md'))
    targets += [ROOT/p for p in ['README.md','docs/README.md','docs/audits/README.md','docs/audits/A/README.md','docs/audits/B/README.md','docs/audits/D/README.md','docs/audits/_historical/README.md','docs/archive/README.md','docs/runbooks/README.md','docs/meta/README.md']]
    logs=[];pending=[]
    for path in sorted(set(targets)):
        raw=path.read_bytes();old=raw.decode('utf-8');new=format_markdown(old)
        assert table_content(old)==table_content(new),'Table content changed: '+str(path)
        if new.encode('utf-8')!=raw:
            pending.append((path,new))
            logs.append({'path':path.relative_to(ROOT).as_posix(),'before_sha256':hashlib.sha256(raw).hexdigest(),'after_sha256':hashlib.sha256(new.encode('utf-8')).hexdigest(),'reason':'FORMAT_ONLY; all table cells preserved; wrap and labels, no lint rule changes'})
    for path,new in pending:path.write_text(new,encoding='utf-8',newline='\n')
    with (OUT/'FORMAT_ONLY_EDITS.csv').open('w',encoding='utf-8',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=['path','before_sha256','after_sha256','reason']);writer.writeheader();writer.writerows(logs)
    print(f'{len(logs)} documents formatted; cell preservation and formatter idempotence controls passed')

if __name__=='__main__':main()
