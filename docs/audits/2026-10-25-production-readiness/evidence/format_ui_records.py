from pathlib import Path
import re,textwrap
base=Path('docs/audits/2026-10-25-production-readiness')
for name in ['UI_UX_DESIGN_SYSTEM.md','JOURNEYS_AND_INFORMATION_ARCHITECTURE.md','MICROCOPY_TERMINOLOGY_AND_FORMS.md','PRODUCT_GAPS_AND_CONFIGURATION.md']:
 p=base/name; lines=p.read_text(encoding='utf-8').splitlines();out=[];active=False
 for i,line in enumerate(lines):
  if line.startswith('**') and line.endswith('**'):
   active=True
   out.extend(textwrap.wrap('- '+line,width=80,subsequent_indent='  ',break_long_words=False,break_on_hyphens=False))
  elif active and not line and i+1<len(lines) and not lines[i+1]:
   active=False
   if out and out[-1]!='':out.append('')
  elif active and line:
   out.extend(textwrap.wrap(line,width=78,initial_indent='  ',subsequent_indent='  ',break_long_words=False,break_on_hyphens=False))
  elif not line:
   if out and out[-1]!='':out.append('')
  else:out.append(line)
 p.write_text('\n'.join(out).rstrip()+'\n',encoding='utf-8')

