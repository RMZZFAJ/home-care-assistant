"""Read-only resolver of dated literals using the canonical relocation map."""
from pathlib import Path
import argparse
import csv
import json
import posixpath
import re
from urllib.parse import unquote

ROOT=Path(__file__).resolve().parents[4]

def resolve(value,source=None):
    with (ROOT/'docs/RELOCATION_MAP.csv').open(encoding='utf-8-sig',newline='') as f:rows=list(csv.DictReader(f))
    forward={r['old_path']:r['new_path'] for r in rows}
    reverse={r['new_path']:r['old_path'] for r in rows}
    original=value.split('#',1)[0].split('?',1)[0]
    original=re.sub(r':\d+$','',original)
    original=unquote(original).replace('\\[','[').replace('\\]',']').replace('\\','/')
    if re.match(r'^[A-Za-z]:|^/',original):
        path=Path(original).resolve()
        if not path.is_relative_to(ROOT.resolve()):raise ValueError('Outside workspace; resolver never reads external paths')
        original=path.relative_to(ROOT).as_posix()
    if source and not original.startswith(('docs/','src/','supabase/','scripts/','tests/','public/','.github/')):
        old_source=reverse.get(source,source)
        original=posixpath.normpath(posixpath.join(posixpath.dirname(old_source),original))
    if original.startswith('../'):raise ValueError('Outside workspace')
    target=forward.get(original,original)
    if target==original and not (ROOT/target).exists():
        directories={}
        for old,new in forward.items():directories.setdefault(posixpath.dirname(old),set()).add(posixpath.dirname(new))
        for old,choices in sorted(directories.items(),key=lambda item:-len(item[0])):
            if len(choices)==1 and (original==old or original.startswith(old+'/')):
                target=next(iter(choices))+original[len(old):];break
    return {'original':value,'source_context':source,'old_path':original,'current_path':target,'exists':(ROOT/target).exists(),'mode':'READ_ONLY_NO_EXPERIMENT_EXECUTION'}

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('path');parser.add_argument('--from-source',dest='source');args=parser.parse_args()
    print(json.dumps(resolve(args.path,args.source),ensure_ascii=False,indent=2))
