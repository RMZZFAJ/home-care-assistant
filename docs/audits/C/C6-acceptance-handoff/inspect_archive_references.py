"""Read-only HTML href/src inventory; no browser/script/network execution."""
from pathlib import Path
from collections import Counter
import csv
import json
import re
from urllib.parse import unquote
from resolve_documentation_path import resolve

ROOT=Path(__file__).resolve().parents[4]
OUT=Path(__file__).resolve().parent
rows=[];files=0
for path in sorted((ROOT/'docs').rglob('*.html')):
    files+=1;source=path.relative_to(ROOT).as_posix()
    text=path.read_text(encoding='utf-8-sig',errors='replace')
    ids=set(re.findall(r'\bid=["\x27]([^"\x27]+)["\x27]',text))
    for m in re.finditer(r'\b(href|src)=["\x27]([^"\x27]+)["\x27]',text):
        value=m[2];note='';target=value;destination=''
        if value.startswith('data:'):target=value.split(',',1)[0]+',[inline bytes omitted]';kind='INLINE_DATA_PRESERVED'
        elif re.match(r'[A-Za-z][\w+.-]*:|//',value):kind='EXTERNAL_OR_NON_FILE_URI_NOT_EXECUTED'
        elif value.startswith('#'):
            kind='HTML_FRAGMENT_EXISTS' if value[1:] in ids or value=='#' else 'HISTORICAL_DYNAMIC_FRAGMENT_UNVERIFIED'
        else:
            candidate=(path.parent/unquote(value.split('#',1)[0].split('?',1)[0])).resolve()
            if candidate.is_relative_to(ROOT.resolve()) and candidate.exists():kind='LOCAL_ASSET_EXISTS';destination=candidate.relative_to(ROOT).as_posix()
            else:
                legacy=resolve(value,source)
                if legacy['exists']:kind='DATED_CONTEXT_RESOLVABLE';destination=legacy['current_path']
                else:kind='HISTORICAL_PROTOTYPE_REFERENCE_UNVERIFIED';note='Preserved dated artifact, no current runtime/support claim'
        rows.append({'source':source,'line':text.count('\n',0,m.start())+1,'attribute':m[1],'target':target,'classification':kind,'resolved':destination,'note':note})
with (OUT/'HTML_REFERENCE_DETAILS.csv').open('w',encoding='utf-8',newline='') as f:
    w=csv.DictWriter(f,fieldnames=['source','line','attribute','target','classification','resolved','note']);w.writeheader();w.writerows(rows)
summary={'html_files':files,'references':len(rows),'classifications':dict(Counter(r['classification'] for r in rows)),'method':'Static inventory only; original HTML bytes preserved; no JavaScript/browser/network execution'}
(OUT/'html-reference-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(summary,ensure_ascii=False,indent=2))
