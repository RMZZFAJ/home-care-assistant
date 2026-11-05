"""Reviewed C6 relocations, with byte guards and editorial link-only rewrites.

Default is read-only dry-run. --apply performs only explicit documentation
git moves and link rewrites. Historical raw evidence/CSVs/manifests are immutable.
"""
from pathlib import Path
import argparse
import csv
import hashlib
import json
import posixpath
import re
import subprocess
from urllib.parse import unquote

ROOT=Path(__file__).resolve().parents[4]
BASE=ROOT/'docs/audits/C'
OUT=Path(__file__).resolve().parent

def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def read(path):
    with path.open(encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))
def write(path,rows,fields=None):
    with path.open('w',encoding='utf-8',newline='') as f:
        w=csv.DictWriter(f,fieldnames=fields or list(rows[0]));w.writeheader();w.writerows(rows)
def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT).decode('utf-8').strip()

inventory=read(BASE/'C0-baseline/DOCUMENTATION_MIGRATION_INVENTORY.csv')
# Refined after inspecting the dated acceptance matrix. The original inventory
# stays immutable; this adjustment is explicit in the final relocation map.
for row in inventory:
    if row['old_path']=='docs/ui-ux/ACCEPTANCE.md':
        row.update(category='HISTORICAL_EXECUTION',new_path='docs/archive/ui-ux/ACCEPTANCE.md',action='ARCHIVE',reason='Dated Fluent acceptance and screenshot claims; preserve as historical matrix, not current acceptance')
    if row['old_path'] in {'docs/ui-ux/INVENTORY.md','docs/ui-ux/inventory.json'}:
        row.update(category='REFERENCE_MATERIAL',action='KEEP_CURRENT',reason='Generated dated inventory kept for fixed tool consumer; active portal states its snapshot scope')
mapping={r['old_path']:r['new_path'] for r in inventory}
moves=[]
for entry in ['phase-b','2026-10-20','2026-10-21','2026-10-25-production-readiness',
 '2026-10-28-phase-b1-interface','2026-10-29-phase-b2-processes','2026-10-29-phase-b3-database',
 '2026-10-30-phase-b4-backend','2026-10-30-phase-b5-integrations','2026-10-30-phase-b6-documents',
 '2026-10-30-phase-b7-operational-readiness','2026-10-30-phase-b8-quality-maintainability']:
    old='docs/audits/'+entry
    if entry=='phase-b':new='docs/audits/B'
    elif entry in {'2026-10-20','2026-10-21'}:new='docs/audits/_historical/'+entry
    elif 'production' in entry:new='docs/audits/A/'+entry
    else:new='docs/audits/B/B'+re.search(r'phase-b([1-8])',entry)[1]+'/'+entry
    moves.append((old,new))
moves.extend([('docs/evolution','docs/archive/evolution'),('docs/ui-ux/EXECUTION.md','docs/archive/ui-ux/EXECUTION.md'),('docs/ui-ux/ACCEPTANCE.md','docs/archive/ui-ux/ACCEPTANCE.md'),('docs/ui-ux/evidence','docs/archive/ui-ux/evidence'),('docs/ui-ux/references','docs/archive/ui-ux/references')])
moves.extend((r['old_path'],r['new_path']) for r in inventory if re.fullmatch(r'docs/[^/]+\.md',r['old_path']) or r['old_path'] in {'PHASE_C_MASTER_ORDER.md','PHASE_C_SUBPHASES.md','DOCS_REORGANIZATION_POLICY.md','PRODUCT_DECISIONS_MASTER.md'})

def relocate(path):
    if path in mapping:return mapping[path]
    for old,new in sorted(moves,key=lambda v:-len(v[0])):
        if path==old or path.startswith(old+'/'):return new+path[len(old):]
    return path

def local_target(source,target):
    value=target.strip('<>')
    if re.match(r'(?:[a-zA-Z][\w+.-]*:|//)',value):return None
    path=value.split('#',1)[0].split('?',1)[0]
    path=re.sub(r':\d+$','',path)
    if not path:return None
    path=unquote(path).replace('\\[','[').replace('\\]',']').replace('\\','/')
    return posixpath.normpath(path.lstrip('/') if path.startswith('/') else posixpath.join(posixpath.dirname(source),path))

def is_raw(row):
    p=row['old_path']
    return '/evidence/' in p or '/inputs/' in p or '/ui-ux/references/' in p

def compute_editorial_changes():
    edits=[];updates=[];preexisting=[]
    for row in inventory:
        old,new=row['old_path'],row['new_path']
        if not old.endswith('.md') or is_raw(row):continue
        raw=(ROOT/old).read_bytes();text=raw.decode('utf-8')
        def rewrite(target,line_no):
            value=target.strip('<>');angle=target.startswith('<')
            external_prefix='https://github.com/RMZZFAJ/home-care-assistant/blob/audit/phase-b/'
            if value.startswith(external_prefix):
                path=value[len(external_prefix):].split('#',1)[0]
                suffix=value[len(external_prefix)+len(path):]
                changed=external_prefix+relocate(path)+suffix
            else:
                path=local_target(old,target)
                if path is None:return target
                if not (ROOT/path).exists():preexisting.append({'source':old,'line':line_no,'target':target,'resolved_old_path':path,'classification':'PREEXISTING_UNRESOLVED'})
                # Preserve any fragment/query/line suffix verbatim.
                match=re.match(r'([^?#]*?)(:\d+)?([?#].*)?$',value)
                suffix=(match[2] or '')+(match[3] or '')
                changed=posixpath.relpath(relocate(path),posixpath.dirname(new))+suffix
            changed='<'+changed+'>' if angle else changed
            if changed!=target:edits.append({'old_source':old,'new_source':new,'line':line_no,'old_target':target,'new_target':changed,'reason':'EDITORIAL_RELOCATION_ONLY'})
            return changed
        lines=[];fence=None
        for line_no,line in enumerate(text.splitlines(keepends=True),1):
            marker=re.match(r'^\s*(`{3,}|~{3,})',line)
            if marker:
                token=marker[1][0];fence=None if fence==token else token
                lines.append(line);continue
            if fence:lines.append(line);continue
            line=re.sub(r'(\]\()(<[^>]+>|[^\s)]+)(\s+(?:"[^"]*"|\x27[^\x27]*\x27))?(\))',lambda m:m[1]+rewrite(m[2],line_no)+(m[3] or '')+m[4],line)
            line=re.sub(r'^(\[[^\]]+\]:\s*)(<[^>]+>|\S+)',lambda m:m[1]+rewrite(m[2],line_no),line)
            lines.append(line)
        rewritten=''.join(lines).encode('utf-8')
        if rewritten!=raw:updates.append((new,rewritten,{'old_path':old,'new_path':new,'before_sha256':hashlib.sha256(raw).hexdigest(),'after_sha256':hashlib.sha256(rewritten).hexdigest(),'reason':'LINK_DESTINATIONS_ONLY; original newline bytes preserved'}))
    return edits,updates,preexisting

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--apply',action='store_true');parser.add_argument('--finalize-existing',action='store_true');args=parser.parse_args()
    assert git('branch','--show-current')=='audit/phase-b'
    assert git('rev-parse','HEAD')=='227f26ca695a3d01512a854f4b19f2639b91ba87','Revalidate changed HEAD before moving'
    if args.finalize_existing:
        # Recover the documented interrupted apply, never replay directory moves.
        metadata=read(OUT/'EDITORIAL_HASH_CHANGES.csv')
        known={r['new_path']:r['after_sha256'] for r in metadata}
        nested=ROOT/'docs/audits/B/phase-b'
        assert nested.resolve().is_relative_to(ROOT.resolve())
        original_rows=[r for r in inventory if r['old_path'].startswith('docs/audits/phase-b/')]
        for row in original_rows:
            relative=row['old_path'][len('docs/audits/phase-b/'):]
            assert digest(nested/relative)==row['original_sha256'],relative
        actual={p.relative_to(nested).as_posix() for p in nested.rglob('*') if p.is_file()}
        assert actual=={r['old_path'][len('docs/audits/phase-b/'):] for r in original_rows}
        for child in list(nested.iterdir()):
            destination=nested.parent/child.name
            assert destination.resolve().is_relative_to(ROOT.resolve())
            saved=None
            if destination.exists():
                relative=destination.relative_to(ROOT).as_posix()
                assert destination.is_file() and digest(destination)==known.get(relative),'Refuse to replace unknown destination'
                saved=destination.read_bytes();destination.unlink()
            subprocess.run(['git','mv','--',child.relative_to(ROOT).as_posix(),destination.relative_to(ROOT).as_posix()],cwd=ROOT,check=True)
            if saved is not None:destination.write_bytes(saved)
        nested.rmdir()  # Checked, empty directory only.
        for row in inventory:
            sha=digest(ROOT/row['new_path'])
            assert sha in {row['original_sha256'],known.get(row['new_path'])},row['new_path']
            row.update(final_sha256=sha,validation='MOVED_BYTES_IDENTICAL' if sha==row['original_sha256'] else 'EDITORIAL_LINKS_RECORDED',status='MOVED' if row['new_path']!=row['old_path'] else 'PRESERVED_PENDING_CURRENT_REVIEW')
        write(ROOT/'docs/RELOCATION_MAP.csv',inventory)
        summary={'mode':'RECOVERED_INTERRUPTED_APPLY','baseline_files':len(inventory),'git_moves':len(moves),'editorial_files':len(metadata),'link_edits':len(read(OUT/'EDITORIAL_LINK_EDITS.csv')),'preexisting_unresolved_links':len(read(OUT/'PREEXISTING_LINK_EXCEPTIONS.csv')),'raw_evidence_rewrites':0,'deletions':0,'recovery':'Original index nested into existing B; contents moved to intended B after per-file original and generated-destination hash checks'}
        (OUT/'migration-execution.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8')
        print(json.dumps(summary,indent=2));return
    for row in inventory:
        assert digest(ROOT/row['old_path'])==row['original_sha256'],'Preexisting document changed: '+row['old_path']
    baseline=json.loads((BASE/'C0-baseline/baseline.json').read_text(encoding='utf-8'))
    for row in baseline['protected_files']:assert digest(ROOT/row['path'])==row['sha256'],'Non-document changed: '+row['path']
    for old,new in moves:
        for name in (old,new):assert (ROOT/name).resolve().is_relative_to(ROOT.resolve()),name
        assert (ROOT/old).exists(),old
        assert not (ROOT/new).exists(),'Destination already exists: '+new
    edits,updates,preexisting=compute_editorial_changes()
    summary={'mode':'APPLY' if args.apply else 'READ_ONLY_DRY_RUN','baseline_files':len(inventory),'git_moves':len(moves),'editorial_files':len(updates),'link_edits':len(edits),'preexisting_unresolved_links':len(preexisting),'raw_evidence_rewrites':0,'deletions':0}
    if args.apply:
        for old,new in moves:
            (ROOT/new).parent.mkdir(parents=True,exist_ok=True)
            subprocess.run(['git','mv','--',old,new],cwd=ROOT,check=True)
        for new,content,metadata in updates:(ROOT/new).write_bytes(content)
        write(OUT/'EDITORIAL_LINK_EDITS.csv',edits,['old_source','new_source','line','old_target','new_target','reason'])
        write(OUT/'EDITORIAL_HASH_CHANGES.csv',[u[2] for u in updates])
        write(OUT/'PREEXISTING_LINK_EXCEPTIONS.csv',preexisting,['source','line','target','resolved_old_path','classification'])
        for row in inventory:
            row['final_sha256']=digest(ROOT/row['new_path'])
            row['validation']='MOVED_BYTES_IDENTICAL' if row['final_sha256']==row['original_sha256'] else 'EDITORIAL_LINKS_RECORDED'
            row['status']='MOVED' if row['new_path']!=row['old_path'] else 'PRESERVED_PENDING_CURRENT_REVIEW'
        write(ROOT/'docs/RELOCATION_MAP.csv',inventory)
        (OUT/'migration-execution.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(summary,indent=2))

if __name__=='__main__':main()
