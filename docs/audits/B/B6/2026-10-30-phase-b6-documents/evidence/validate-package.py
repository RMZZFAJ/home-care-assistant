"""Documentary-only validator. Never executes Auth/SQL/PDF probes or product suites."""
from pathlib import Path
import csv,hashlib,json,os,re,subprocess,sys
from datetime import datetime,timezone

ROOT=Path(__file__).resolve().parent.parent
REPO=ROOT.parents[2]
NODE=Path('C:/Users/renat/AppData/Local/npm-cache/_npx/fee7060b69ab3f2d/node_modules/node/bin/node.exe')
assert subprocess.check_output([str(NODE),'--version'],text=True).strip()=='v24.22.0'
required=['README.md','CHECKPOINT.md','00_BASELINE_SCOPE_AND_METHOD.md',
'01_DOCUMENT_OBJECT_AND_SOURCE_INVENTORY.csv','01_DOCUMENT_DOMAIN_AND_SOURCE_MAP.md',
'02_DOCUMENT_IDENTITY_AUTHORSHIP_AND_PROVENANCE.md','03_EVENTS_SNAPSHOTS_HASHES_AND_IMMUTABILITY.md',
'04_DOCUMENT_SEMANTIC_FIDELITY.md','04_DOCUMENT_FIELD_FIDELITY_MATRIX.csv',
'05_VERSIONS_HISTORY_AND_RECONSTRUCTION.md','06_PDF_RENDERING_CONTENT_AND_LAYOUT.md',
'06_PDF_VISUAL_CASES.csv','07_PDF_STORAGE_CACHE_AND_RECOVERY.md',
'08_ATTACHMENTS_PROVENANCE_AND_CUSTODY.md','09_QR_VERIFICATION_AND_EVIDENTIARY_LIMITS.md',
'10_HISTORY_PRINTING_AND_HUMAN_INTERPRETATION.md','11_DOCUMENT_SECURITY_RETENTION_AND_RESTORE.md',
'12_ADVERSARIAL_DOCUMENT_RECONSTRUCTION.md','13_NEW_DOCUMENT_GAPS_AND_OPPORTUNITIES.md',
'14_FINDINGS_MASTER.csv','14_FINDINGS_MASTER.md','15_ACCEPTANCE_AND_REGRESSION_CRITERIA.md',
'16_CROSS_GROUP_DEPENDENCIES.md','17_GROUP_B6_EXECUTIVE_ASSESSMENT.md','18_PHASE_C_DECISION_HANDOFF.md']
for name in required:assert (ROOT/name).is_file() and (ROOT/name).stat().st_size,name

def load(name):return json.loads((ROOT/name).read_text(encoding='utf-8'))
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def files():return sorted(p for p in ROOT.rglob('*') if p.is_file() and '__pycache__' not in p.parts)
def table(name):
    with (ROOT/name).open(encoding='utf-8-sig',newline='') as stream:
        reader=csv.DictReader(stream);rows=list(reader)
        assert reader.fieldnames and len(set(reader.fieldnames))==len(reader.fieldnames),name
        for row in rows:assert None not in row and all(v is not None and v.strip() for v in row.values()),(name,row.get('id'))
        return reader.fieldnames,rows

# Normalize only new text artifacts to LF so Git blob and manifest hashes agree.
for path in files():
    if path.suffix.lower() in {'.md','.txt','.json','.csv','.py','.mjs','.ts','.mts'}:
        raw=path.read_bytes();clean=raw.replace(b'\r\n',b'\n')
        if clean!=raw:path.write_bytes(clean)

stats=load('evidence/coverage-reconciliation.json')
inv=table(required[3]);fields=table(required[8]);visual=table(required[11]);findings=table('14_FINDINGS_MASTER.csv');scenarios=table('evidence/SCENARIOS.csv');anchors=table('evidence/SOURCE_ANCHORS.csv')
assert (len(inv[1]),len(inv[0]))==(17,22)
assert len(fields[1])==stats['fieldRows']==71
assert len(visual[1])==11
assert (len(findings[1]),len(findings[0]))==(13,33)
assert len(scenarios[1])==35
assert len([r for r in scenarios[1] if r['origin']=='NOVO_B6'])==23
assert len([r for r in scenarios[1] if r['origin']=='HERDADO_SEM_REEXECUCAO'])==12
assert {p:sum(r['priority']==p for r in findings[1]) for p in ['P2','P3']}=={'P2':11,'P3':2}
for name,rows in [('inventory',inv[1]),('fields',fields[1]),('visual',visual[1]),('findings',findings[1]),('scenarios',scenarios[1])]:
    assert len({r['id'] for r in rows})==len(rows),name

references=0
def evidence(ref):
    global references
    name,_,fragment=ref.strip().partition('#')
    p=ROOT/name
    if not p.exists():p=REPO/name
    assert p.is_file(),ref
    if fragment:assert fragment in p.read_text(encoding='utf-8'),ref
    references+=1

master=(ROOT/'14_FINDINGS_MASTER.md').read_text(encoding='utf-8')
acceptance=(ROOT/'15_ACCEPTANCE_AND_REGRESSION_CRITERIA.md').read_text(encoding='utf-8')
for row in findings[1]:
    assert '## '+row['id'] in master
    assert 'AC-'+row['id'] in acceptance
    for ref in row['evidence'].split(';'):evidence(ref)
for row in scenarios[1]:evidence(row['evidence'])
for row in visual[1]:
    evidence(row['pdf'])
    for ref in row['images'].split(';'):evidence(ref)
for row in anchors[1]:
    path=REPO/row['path'];assert path.is_file() and digest(path)==row['sha256']
    assert row['symbol_or_text'] in path.read_text(encoding='utf-8').splitlines()[int(row['line'])-1]
assert {r['finding'] for r in anchors[1]}=={r['id'] for r in findings[1]}
prior=load('evidence/reused-evidence.json');assert len(prior)==18
for row in prior:assert digest(REPO/row['source'])==row['sha256']

pdfs=load('evidence/b66-pdf-results.json')['cases']
assert len(pdfs)==11 and sum(p['pages'] for p in pdfs)==32
for p in pdfs:assert digest(ROOT/'evidence/pdf'/f"{p['id']}.pdf")==p['pdfSha256'] and p['sourceUnchanged']
inspect=load('evidence/b66-inspection-results.json')['cases']
assert sum(len(p['selectedImages']) for p in inspect)==20
assert all(p['catalogLang'][0]=='null' and p['structureTree'][0]=='null' for p in inspect)
assert sum(len(page['outsidePage']) for p in inspect for page in p['pages'])==28
assert next(p for p in inspect if p['id']=='PV09')['endMarkerVisible'] is False
assert all(not v for p in inspect for v in p['textContainsOmittedMarkers'].values())
for p in load('evidence/b68-sanitize-results.json')['cases']:
    for suffix,key in [('source','originalSha256'),('sanitized','storedDerivativeSha256')]:
        assert digest(ROOT/'evidence/attachments'/f"{p['variant']}-{suffix}.pdf")==p[key]
assert len(load('evidence/b68-visual-results.json'))==4
qr=load('evidence/b69-qr-results.json')['results'];assert len(qr)==2 and all(r['versionExact'] and r['hashExact'] and not r['urlFetched'] for r in qr)
for name in ['b66-run.json','b66-supplement-run.json','b67-run.json','b68-run.json']:
    run=load('evidence/'+name);assert run['numFailedTests']==0 and run['numPassedTests']==1

preserve=load('evidence/preservation-results.json')
assert preserve['protectedFiles']==395 and not preserve['protectedFilesChanged']
assert preserve['routinesCompared']==232 and not preserve['routineDrift'] and not preserve['originalHashChanges']
assert preserve['auth']['originalAccountsCompared']==78 and preserve['auth']['stableFieldsChanged']==0 and preserve['auth']['newAccounts']==2
assert preserve['isolation']=={'queuedHttp':0,'urlConfigured':False,'bearerConfigured':False}
for row in load('evidence/protected-source-hashes.json'):assert digest(REPO/row['path'])==row['sha256']

git=lambda *a:subprocess.check_output(['git',*a],cwd=REPO,text=True,encoding='utf-8').strip()
assert git('branch','--show-current')=='audit/phase-b'
assert git('rev-parse','master')==load('evidence/baseline.json')['master']
assert not git('diff','--name-only','37cb7f85e96e551d6419871f94dd950712e2565b','HEAD','--','src','supabase','scripts','tests','package.json','package-lock.json')
changed=subprocess.check_output(['git','status','--porcelain','--untracked-files=all'],cwd=REPO,text=True,encoding='utf-8').splitlines()
for line in changed:
    path=line[3:].replace('\\','/').strip('"')
    assert path.startswith('docs/audits/2026-10-30-phase-b6-documents/') or path=='docs/audits/phase-b/README.md',path

links=0
for path in [*ROOT.rglob('*.md'),REPO/'docs/audits/phase-b/README.md']:
    content=path.read_text(encoding='utf-8')
    for href in re.findall(r'\[[^\]]*\]\(([^)]+)\)',content):
        href=href.strip('<>').split('#')[0]
        if not href or re.match(r'https?:|mailto:',href):continue
        target=path.parent/href
        assert target.exists() or target.name in ['package-validation.json','MANIFEST.json'],(path,href)
        links+=1

credentials=[]
env=REPO/'.env.local'
if env.exists():
    for line in env.read_text(encoding='utf-8').splitlines():
        m=re.match(r'([A-Z0-9_]+)=(.*)',line)
        if m and re.search('SECRET|TOKEN|SERVICE_ROLE|PRIVATE_KEY|PASSWORD',m[1]):
            v=m[2].strip().strip('\'"')
            if len(v)>16 and not v.startswith(('EXAMPLE','YOUR_','env(')):credentials.append(v)
def private_values(x):
    if isinstance(x,dict):
        for k,v in x.items():
            if re.search(r'password|access_token|refresh_token',k,re.I) and isinstance(v,str) and len(v)>10:credentials.append(v)
            elif isinstance(v,(dict,list)):private_values(v)
    elif isinstance(x,list):
        for v in x:private_values(v)
for suffix in ['audit-b3/local-state.json','audit-b4/local-state.json','audit-b5/synthetic-actor.json','audit-b6/actors.json']:
    p=Path(os.environ['LOCALAPPDATA'])/'home-care-assistant'/suffix
    if p.exists():private_values(json.loads(p.read_text(encoding='utf-8')))
hits=[]
for path in files():
    if path.name in ['MANIFEST.json','package-validation.json']:continue
    raw=path.read_bytes();text=raw.decode('utf-8',errors='ignore')
    if any(v.encode() in raw for v in credentials):hits.append((path.name,'known private credential'))
    if re.search(r'eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}',text):hits.append((path.name,'JWT'))
    if re.search(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----\s*\n',text):hits.append((path.name,'private key'))
    if re.search(r'[?&](?:access_token|token|sig|apikey)=[A-Za-z0-9_.-]{16,}',text):hits.append((path.name,'credential URL'))
assert not hits,'Secret scan failed;values suppressed'

checks=[]
def check(name,args):
    proc=subprocess.run([str(NODE),*map(str,args)],cwd=REPO,capture_output=True,text=True,encoding='utf-8',errors='replace')
    checks.append({'name':name,'exitCode':proc.returncode,'output':(proc.stdout+proc.stderr).strip()})
    assert proc.returncode==0,name+': '+checks[-1]['output'][:4000]
for path in files():
    if path.suffix=='.mjs':check('Syntax '+path.name,['--check',path])
for path in files():
    if path.suffix=='.py':compile(path.read_text(encoding='utf-8'),str(path),'exec')
check('B6 and phase-B Markdown',['node_modules/markdownlint-cli2/markdownlint-cli2-bin.mjs','docs/audits/2026-10-30-phase-b6-documents/**/*.md','docs/audits/phase-b/README.md'])
check('Audit JS/TS ESLint',['node_modules/eslint/bin/eslint.js','docs/audits/2026-10-30-phase-b6-documents/evidence'])

report={'recordedAt':datetime.now(timezone.utc).isoformat(),'clientDate':'2026-10-30','status':'PASS','node':'24.22.0',**stats,
        'evidenceReferencesChecked':references,'sourceAnchorsChecked':len(anchors[1]),'localLinksChecked':links,'secretMatches':0,
        'protectedSourcesUnchanged':395,'sqlRoutinesUnchanged':232,'publicOriginalRows':'all baseline multiset hashes present;no replacements/deletions',
        'priorAuthStable':78,'newSyntheticAuthAccounts':2,'checks':checks,
        'priorTypecheck':{'command':'Node24.22.0 node_modules/typescript/bin/tsc -p evidence/tsconfig.audit.json --noEmit','status':'PASS during B6.8;TS/imports unchanged since;not repeated for Markdown'},
        'methodsCaveat':'23 new logical points are not23 E2E;12 references were not rerun;PDF fixture hashes use JSON.stringify,not persisted canonical hash',
        'notRun':['global build','global typecheck','global unit','full E2E','migration replay','remote tests','physical printing','human acceptance','full restore'],
        'sessionEffects':{'externalSend':False,'remoteDatabaseChange':False,'productChange':False,'historicalPdfReplacement':False,'deploy':False,'PR':False,'merge':False,'scope':'Session actions;not independent remote-state certification'},
        'manifestPolicy':'Excludes itself and ignored __pycache__;includes final package-validation.json;all SHA256 verified'}
ROOT.joinpath('evidence/package-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
entries=[{'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':digest(p)} for p in files() if p.name!='MANIFEST.json']
ROOT.joinpath('evidence/MANIFEST.json').write_text(json.dumps({'algorithm':'SHA-256','selfExcluded':'evidence/MANIFEST.json','files':len(entries),'entries':entries},ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
for row in entries:assert digest(ROOT/row['path'])==row['sha256']
print(json.dumps({'status':'PASS','deliverables':25,'findings':13,'newScenarios':23,'priorReferences':12,'manifestFiles':len(entries),'secretMatches':0,'linksChecked':links,'fieldRows':71},ensure_ascii=False))
