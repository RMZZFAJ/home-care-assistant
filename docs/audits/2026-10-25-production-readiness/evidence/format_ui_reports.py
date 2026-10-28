from pathlib import Path
import textwrap,re
base=Path('docs/audits/2026-10-25-production-readiness')
names=['UI_UX_DESIGN_SYSTEM.md','JOURNEYS_AND_INFORMATION_ARCHITECTURE.md','MICROCOPY_TERMINOLOGY_AND_FORMS.md','PRODUCT_GAPS_AND_CONFIGURATION.md']
for name in names:
    p=base/name
    lines=p.read_text(encoding='utf-8').splitlines()
    out=[]; i=0
    while i<len(lines):
        if lines[i].startswith('|') and i+1<len(lines) and re.match(r'^\|[ :|\-]+\|$',lines[i+1]):
            header=[x.strip() for x in lines[i].strip('|').split('|')]
            block=[];i+=2
            while i<len(lines) and lines[i].startswith('|'):
                block.append([x.strip() for x in lines[i].strip('|').split('|')]);i+=1
            for cells in block:
                out.append('**'+cells[0]+'**')
                out.append('')
                for key,val in zip(header[1:],cells[1:]):
                    out.extend(textwrap.wrap(key+': '+val,width=80,break_long_words=False,break_on_hyphens=False))
                    out.append('')
            continue
        line=lines[i]
        line=re.sub(r'\b(em|a|até|de|com|Etapa|E2E)(?=\d)',r'\1 ',line)
        if len(line)>80 and not line.startswith('#') and '](' not in line:
            prefix=re.match(r'^(\s*(?:\d+\.|-)\s+)',line)
            out.extend(textwrap.wrap(line,width=80,subsequent_indent=(' '*len(prefix.group(1)) if prefix else ''),break_long_words=False,break_on_hyphens=False))
        else:out.append(line)
        i+=1
    p.write_text('\n'.join(out).rstrip()+'\n',encoding='utf-8')

