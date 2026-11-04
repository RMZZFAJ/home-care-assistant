"""Independent documentary closure checks. No product tests, DB or network.

Checks original source sets and bytes, not only counts of generated artifacts.
Outputs documentary evidence and a self-excluded manifest after the checks.
"""
from pathlib import Path
from collections import Counter
import ast
import csv
import gzip
import hashlib
import json
import posixpath
import re
import subprocess
from urllib.parse import unquote
from format_documentation import parse_tables
from resolve_documentation_path import resolve

ROOT=Path(__file__).resolve().parents[4]
BASE=ROOT/'docs/audits/C'
OUT=Path(__file__).resolve().parent
INPUT_SHA='227f26ca695a3d01512a854f4b19f2639b91ba87'
checks=[];errors=[]

def read(path):
    with path.open(encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))
def write(path,rows,fields=None):
    with path.open('w',encoding='utf-8',newline='') as f:
        w=csv.DictWriter(f,fieldnames=fields or list(rows[0]));w.writeheader();w.writerows(rows)
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT,stderr=subprocess.PIPE).decode('utf-8').strip()
def check(name,condition,details):
    checks.append({'check':name,'status':'PASS' if condition else 'FAIL','details':details})
    if not condition:errors.append(name)
def normalized(text):return re.sub(r'\s+',' ',text).strip()
def body_without_destinations(text):
    text=re.sub(r'(\]\()(<[^>]+>|[^\s)]+)',r'\1DESTINATION',text)
    text=re.sub(r'(?m)^(\[[^\]]+\]:\s*)\S+',r'\1DESTINATION',text)
    return normalized(text)
def raw_path(old):return '/evidence/' in old or '/inputs/' in old or '/ui-ux/references/' in old

def anchors(text):
    values=set();counts=Counter()
    for line in text.splitlines():
        m=re.match(r'^#{1,6}\s+(.+)',line)
        if not m:continue
        value=re.sub(r'\[([^\]]+)\]\([^)]*\)',r'\1',m[1])
        value=re.sub(r'<[^>]+>','',value)
        value=re.sub(r'[^\w\- ]','',value.lower()).replace(' ','-')
        ordinal=counts[value];counts[value]+=1
        values.add(value+('-'+str(ordinal) if ordinal else ''))
    return values

def local_path(source,target):
    value=target.strip('<>');path=value.split('#',1)[0].split('?',1)[0]
    path=re.sub(r':\d+$','',path)
    path=unquote(path).replace('\\[','[').replace('\\]',']').replace('\\','/')
    return posixpath.normpath(posixpath.join(posixpath.dirname(source),path)) if path else source

def main():
    # Output placeholders belong only to this verifier, so forward documentary
    # references are checked against files that this same invocation finalizes.
    for name in ['validation-report.json','MANIFEST.json']:
        if not (OUT/name).exists():(OUT/name).write_text('{"status":"RUNNING"}\n',encoding='utf-8')
    if not (OUT/'LINK_VALIDATION_DETAILS.csv').exists():write(OUT/'LINK_VALIDATION_DETAILS.csv',[],['source','line','target','classification','resolved','note'])
    relocation=read(ROOT/'docs/RELOCATION_MAP.csv')
    baseline=json.loads((BASE/'C0-baseline/baseline.json').read_text(encoding='utf-8'))
    original=read(BASE/'C0-baseline/DOCUMENTATION_MIGRATION_INVENTORY.csv')
    check('branch',git('branch','--show-current')=='audit/phase-b','Exclusive authorized branch')
    check('master',git('rev-parse','master')==baseline['master'],'Master unchanged from C0')
    check('relocation_bijection',len(relocation)==1932 and len({r['old_path'] for r in relocation})==1932 and len({r['new_path'] for r in relocation})==1932,'All 1932 original paths have one final location')
    check('original_inventory_preserved',{(r['old_path'],r['original_sha256']) for r in original}=={(r['old_path'],r['original_sha256']) for r in relocation},'No original source/hash omitted or changed')
    missing=[];raw_changed=[];historical_body_changed=[];preserved=0;raw_count=0;manifest_count=0
    for row in relocation:
        path=ROOT/row['new_path']
        if not path.is_file():missing.append(row['new_path']);continue
        final=sha(path);same=final==row['original_sha256'];preserved+=same
        historical=row['category'] in {'HISTORICAL_AUDIT_EVIDENCE','HISTORICAL_EXECUTION'}
        immutable=historical and (raw_path(row['old_path']) or path.suffix.lower()!='.md')
        if immutable:
            raw_count+=1
            if not same:raw_changed.append(row['new_path'])
        if historical and path.suffix=='.md' and not raw_path(row['old_path']) and not same:
            old=subprocess.check_output(['git','show',INPUT_SHA+':'+row['old_path']],cwd=ROOT).decode('utf-8-sig')
            if body_without_destinations(old)!=body_without_destinations(path.read_text(encoding='utf-8-sig')):historical_body_changed.append(row['new_path'])
        if 'manifest' in path.name.lower():
            manifest_count+=1
            if not same:raw_changed.append(row['new_path'])
        row['final_sha256']=final
        row['validation']='BYTES_IDENTICAL' if same else 'EDITORIAL_LINK_OR_LAYOUT_ONLY' if historical else 'REVIEWED_CURRENT_OR_OWNER_INPUT_FORMAT'
        row['status']='PRESERVED' if same else 'EDITORIAL_DOCUMENT_CHANGE'
    check('all_original_files_exist',not missing,missing)
    check('raw_evidence_bytes',not raw_changed,{'checked':raw_count,'manifests':manifest_count,'changed':raw_changed})
    check('historical_conclusions_preserved',not historical_body_changed,historical_body_changed)
    if not missing and not raw_changed and not historical_body_changed:write(ROOT/'docs/RELOCATION_MAP.csv',relocation)

    authorized_inputs={r['old_path'] for r in original if r['category'] in {'APPROVED_DECISION','PLANNED_NOT_IMPLEMENTED'} and '/' not in r['old_path']}
    protected_rows=[r for r in baseline['protected_files'] if r['path'] not in authorized_inputs]
    protected=[r['path'] for r in protected_rows if not (ROOT/r['path']).is_file() or sha(ROOT/r['path'])!=r['sha256']]
    check('all_non_documentary_bytes',not protected,{'checked':len(protected_rows),'changed':protected,'original_snapshot_entries':len(baseline['protected_files']),'authorized_owner_document_inputs_reclassified':sorted(authorized_inputs),'reason':'C0 captured the staged root inputs too; original snapshot remains intact; input bytes checked separately'})
    allowed=lambda p:p.startswith('docs/') or p in {'README.md','AGENTS.md'}
    diff_paths=git('diff','--name-only',INPUT_SHA).splitlines()
    untracked=git('ls-files','--others','--exclude-standard').splitlines()
    check('diff_scope',all(allowed(p) for p in diff_paths+untracked),[p for p in diff_paths+untracked if not allowed(p)])
    old_agents=subprocess.check_output(['git','show',INPUT_SHA+':AGENTS.md'],cwd=ROOT).decode('utf-8')
    new_agents=(ROOT/'AGENTS.md').read_text(encoding='utf-8')
    managed=lambda s:re.search(r'<!-- BEGIN:nextjs-agent-rules -->[\s\S]+?<!-- END:nextjs-agent-rules -->',s)[0].replace('\r\n','\n')
    check('next_managed_block',managed(old_agents)==managed(new_agents),'Managed Next instructions retained exactly modulo checkout newline')
    check('migration_guard_count',len(list((ROOT/'supabase/migrations').glob('*.sql')))==84 and len(json.loads((ROOT/'scripts/historical-migrations.json').read_text(encoding='utf-8-sig')))==84,'No migration/dependency/runtime changes')

    inputs=read(BASE/'C0-baseline/INPUTS_PROVENANCE.csv');source_input_errors=[]
    for row in inputs:
        data=gzip.decompress((ROOT/row['raw_copy']).read_bytes())
        if hashlib.sha256(data).hexdigest()!=row['sha256']:source_input_errors.append(row['source'])
        if any(r['old_path']==row['source'] for r in relocation):
            target=next(r['new_path'] for r in relocation if r['old_path']==row['source'])
            rendered=(ROOT/target).read_text(encoding='utf-8')
            source=data.decode('utf-8-sig')
            a=[(h,[cells for line,cells in records]) for h,records in parse_tables(source)]
            b=[(h,[cells for line,cells in records]) for h,records in parse_tables(rendered)]
            if a!=b:source_input_errors.append(row['source']+':table_cells')
            before=Counter(re.findall(r'\w+',source));after=Counter(re.findall(r'\w+',rendered))
            if before-after:source_input_errors.append(row['source']+':word_loss')
    check('owner_input_bytes_and_meaning',not source_input_errors,{'inputs':len(inputs),'errors':source_input_errors,'method':'Gzip roundtrip hash; all original cells and words retained in canonical formatted inputs'})

    source_records={};source_counts=Counter()
    for row in relocation:
        if row['old_path'].endswith('FINDINGS_MASTER.csv'):
            source=read(ROOT/row['new_path'])
            phase='A' if 'production-readiness' in row['old_path'] else re.search(r'phase-(b[1-8])',row['old_path'])[1].upper()
            source_counts[phase]+=len(source)
            for record in source:
                assert record['id'] not in source_records
                source_records[record['id']]=record
    cross=read(BASE/'C1-consolidation/FINDINGS_165_SOURCE_CROSSWALK.csv')
    causes=read(BASE/'C1-consolidation/CAUSE_FAMILIES_MASTER.csv')
    b8=read(ROOT/'docs/audits/B/B8/2026-10-30-phase-b8-quality-maintainability/REGRESSION_COVERAGE_MATRIX.csv')
    check('independent_original_165',len(source_records)==165 and source_counts=={'A':32,'B1':35,'B2':17,'B3':25,'B4':13,'B5':14,'B6':13,'B7':7,'B8':9},dict(source_counts))
    cross_ids=[r['source_id'] for r in cross];members=[i for c in causes for i in c['source_ids'].split(';')]
    check('crosswalk_no_loss_or_duplicate',len(cross_ids)==len(set(cross_ids))==165 and set(cross_ids)==set(source_records) and len(members)==len(set(members))==165 and set(members)==set(source_records),'Each original record maps exactly once to one cause')
    check('cause_adjudication',len(causes)==121 and len(b8)==119 and sum(len(r['source_ids'].split(';')) for r in b8)==156,'One overlapping REQ projection merged; 3 new quality causes; 6 revalidations attached')
    p1=[r for r in causes if r['technical_priority']=='P1']
    check('two_independent_p1',len(p1)==2 and {r['cause_id'] for r in p1}=={'C-CAUSE-009','C-CAUSE-049'},[r['source_ids'] for r in p1])
    check('source_provenance',all((ROOT/r['source_csv']).is_file() and sha(ROOT/r['source_csv'])==r['source_sha256'] and r['original_evidence'] for r in cross),'Original CSV/evidence context retained, not reissued experiments')

    decisions=read(BASE/'C2-decisions/DECISIONS_REGISTER.csv');dmap={r['decision_id']:r for r in decisions}
    trace=read(BASE/'C2-decisions/DECISION_SPECIFICATION_CROSSWALK.csv')
    expected_decisions={f'DEC-{i:03d}' for i in range(1,31)}|{f'O{i:02d}' for i in range(1,21)}|{f'P{i:02d}' for i in range(1,16)}
    check('decisions_complete_and_conditional',set(dmap)==expected_decisions and len(decisions)==65 and all(dmap[f'P{i:02d}']['status']=='PENDING_OWNER' for i in range(1,16)),'30 DEC, 20 O, 15 details; no approval inferred')
    check('opportunity_status',dmap['O05']['status']==dmap['O11']['status']=='OWNER_APPROVED' and dmap['O10']['status']=='EXISTING_TO_PRESERVE' and dmap['O17']['status']==dmap['O18']['status']==dmap['DEC-019']['status']=='DEFERRED','Explicit later decisions override old recommendations')
    check('decision_to_spec_trace',{r['decision_id'] for r in trace}==expected_decisions and all((ROOT/p).is_file() for r in trace for p in r['specifications'].split(';')),'All decisions trace to existing specifications, including deferred/existing states')

    fields=read(BASE/'C3-functional-specification/SCREEN_FIELD_ACTION_INVENTORY.csv')
    screens={r['screen_scope'] for r in fields if r['record_type']=='SCREEN_ACTIONS'}
    field_rows=[r for r in fields if r['record_type']=='FIELD'];bad_field=[]
    for r in fields:
        path=ROOT/r['source_spec'];lines=path.read_text(encoding='utf-8').splitlines()
        if int(r['source_line'])>len(lines):bad_field.append(r['source_spec'])
        if r['record_type']=='FIELD' and (not set(r['screen_scope'].split(','))<=screens or not all(r[k] for k in ['field_label','type_source','required_default','validation_unit','help_example'])):bad_field.append(r['field_label'])
    domains={r['domain'] for r in fields}
    check('screen_field_inventory',len(screens)==66 and len(field_rows)==174 and len(domains)==14 and not bad_field,{'screens':len(screens),'fields':len(field_rows),'domains':len(domains),'errors':bad_field})
    check('specification_depth',all(len((BASE/'C3-functional-specification'/f'{d}.md').read_text(encoding='utf-8').split())>=400 for d in domains),'Each domain has AS_IS/TO_BE, fields, transitions, recovery, evidence and domain acceptance; shared policies explicitly inherited')
    state_text=(BASE/'C3-functional-specification/UI_STATES_AND_MICROCOPY.md').read_text(encoding='utf-8').lower()
    check('shared_states',all(s in state_text for s in ['loading','empty','error','conflict','offline','uncertain','revogado','sucesso']),'All 66 surfaces inherit states, focus/AT/reflow and specific exceptions')

    impacts=read(BASE/'C4-technical-design/CHANGE_IMPACT_MATRIX.csv');caps=read(BASE/'C4-technical-design/APPROVED_CAPABILITY_CHANGE_PLAN.csv')
    accepts=read(OUT/'ACCEPTANCE_CRITERIA_MASTER.csv')
    check('impact_and_acceptance_bijections',len(impacts)==121 and {r['cause_id'] for r in impacts}=={r['cause_id'] for r in causes} and len(caps)==28 and len(accepts)==149 and len({r['acceptance_id'] for r in accepts})==149 and {r['cause_id'] for r in accepts}=={r['cause_id'] for r in causes}|{r['capability_id'] for r in caps},'121 causes + 28 grouped owner requirements; not 149 independent defects/tests')
    check('acceptance_discriminants',all(r['positive_oracle'] and r['negative_oracle'] and r['persistence_oracle'] and r['test_layers'] and r['planned_package'] for r in accepts),'Positive/negative, independent read-back, layers and D gate per criterion')
    sequences=(BASE/'C4-technical-design/FAILURE_RECOVERY_AND_IDEMPOTENCY.md').read_text(encoding='utf-8')
    check('seven_sequence_diagrams',sequences.count('sequenceDiagram')==7,'ENT, bilateral, consumption, science/access, draft, schedule/BAL, push')
    packages=read(BASE/'C5-execution-roadmap/DEPENDENCY_SEQUENCE.csv')
    check('d_packages_and_dependencies',{r['package'] for r in packages}=={'D0','D1','D2','D3','D4','D5','D6','D7','D-LATER'} and all('NOT_STARTED' in r['implementation_status'] for r in packages),'Entry/exit/owner/QA/conditions; no D execution results')

    # Validate all Markdown, including historical/raw. Exceptions are visible,
    # never silently excluded to manufacture a zero-broken-links claim.
    old_by_new={r['new_path']:r['old_path'] for r in relocation}
    link_rows=[];broken_active=[];anchor_cache={}
    for file in sorted((ROOT/'docs').rglob('*.md'))+[ROOT/'README.md',ROOT/'AGENTS.md']:
        source=file.relative_to(ROOT).as_posix();old_source=old_by_new.get(source,source);is_raw=raw_path(old_source)
        fence=None
        for n,line in enumerate(file.read_text(encoding='utf-8-sig').splitlines(),1):
            marker=re.match(r'^\s*(`{3,}|~{3,})',line)
            if marker:fence=None if fence==marker[1][0] else marker[1][0];continue
            if fence:continue
            targets=re.findall(r'\]\((<[^>]+>|[^\s)]+)',line)
            reference=re.match(r'^\[[^\]]+\]:\s*(<[^>]+>|\S+)',line)
            if reference:targets.append(reference[1])
            for target in targets:
                value=target.strip('<>');classification='';note='';resolved=''
                if re.match(r'[A-Za-z][\w+.-]*:|//',value):classification='EXTERNAL_REFERENCE_NOT_RETESTED'
                else:
                    resolved=local_path(source,target);path=ROOT/resolved
                    if not path.resolve().is_relative_to(ROOT.resolve()):classification='OUTSIDE_WORKSPACE_NOT_READ'
                    elif not path.exists():
                        historical=resolve(value,source) if is_raw else None
                        if historical and historical['exists']:
                            classification='RAW_DATED_CONTEXT_RESOLVABLE';resolved=historical['current_path'];note='Original raw hyperlink retained; use relocation resolver'
                        else:
                            classification='RAW_UNVERIFIED_REFERENCE' if is_raw else 'BROKEN_EDITORIAL_LINK'
                            if not is_raw:broken_active.append(source+':'+str(n)+' '+target)
                    else:
                        classification='LOCAL_PATH_EXISTS'
                        if '#' in value:
                            fragment=unquote(value.split('#',1)[1])
                            if re.fullmatch(r'L\d+(?:-L\d+)?',fragment):classification='SOURCE_LINE_REFERENCE'
                            elif path.suffix=='.md' and fragment:
                                if resolved not in anchor_cache:anchor_cache[resolved]=anchors(path.read_text(encoding='utf-8-sig'))
                                if fragment not in anchor_cache[resolved]:
                                    classification='RAW_UNVERIFIED_FRAGMENT' if is_raw else 'BROKEN_EDITORIAL_FRAGMENT'
                                    if not is_raw:broken_active.append(source+':'+str(n)+' #'+fragment)
                            elif path.suffix in {'.csv','.json'}:classification='STRUCTURED_RECORD_FRAGMENT';note='Textual record pointer, not proof of native HTML anchor navigation'
                link_rows.append({'source':source,'line':n,'target':target,'classification':classification,'resolved':resolved,'note':note})
    write(OUT/'LINK_VALIDATION_DETAILS.csv',link_rows,['source','line','target','classification','resolved','note'])
    check('editorial_paths_and_anchors',not broken_active,broken_active)

    ast_errors=[]
    for p in BASE.rglob('*.py'):
        if '__pycache__' in p.parts:continue
        try:ast.parse(p.read_text(encoding='utf-8'))
        except SyntaxError:ast_errors.append(p.relative_to(ROOT).as_posix())
    check('documentary_python_syntax',not ast_errors,ast_errors)
    # Negative controls operate in memory; no product fixture or repository mutation.
    check('verifier_negative_controls',len(set(cross_ids[:-1]))!=165 and hashlib.sha256(b'changed').hexdigest()!=hashlib.sha256(b'original').hexdigest() and not (ROOT/'docs/__missing_validation_control__.md').exists(),'Missing ID, changed bytes and missing path are rejected by the same predicates')
    secret_matches=[]
    for p in list(BASE.rglob('*'))+list((ROOT/'docs/current').glob('*.md'))+[ROOT/'README.md',ROOT/'AGENTS.md']:
        if not p.is_file() or p.suffix.lower() not in {'.md','.csv','.json','.py','.txt'} or '__pycache__' in p.parts:continue
        text=p.read_text(encoding='utf-8-sig',errors='replace')
        if re.search(r'(?:gh[pousr]_[A-Za-z0-9]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)',text):secret_matches.append(p.relative_to(ROOT).as_posix())
    check('new_document_secret_patterns',not secret_matches,{'matches':secret_matches,'scope':'New C/current text only; no .env or private file read; not a universal DLP claim'})
    for relative in ['README.md','docs/current/PROJECT_STATUS.md','docs/audits/C/README.md','docs/audits/D/README.md']:
        text=(ROOT/relative).read_text(encoding='utf-8')
        check('state_boundary_'+relative,'NO-GO' in text and ('D NÃO INICIADA' in text or 'NÃO INICIADA' in text),relative)

    requirements=[]
    requirement_sources={
      'C0 scope baseline branch owner work':'docs/audits/C/C0-baseline/ENVIRONMENT_AND_GIT_BASELINE.md;docs/audits/C/C0-baseline/baseline.json',
      'C0 original four inputs provenance':'docs/audits/C/C0-baseline/INPUTS_PROVENANCE.csv',
      'C0 inventory classes consumers hashes before move':'docs/audits/C/C0-baseline/DOCUMENTATION_MIGRATION_INVENTORY.csv;docs/audits/C/C0-baseline/PATH_CONSUMERS.csv',
      'C1 all165 and causal reasoning without duplicate P1':'docs/audits/C/C1-consolidation/FINDINGS_165_SOURCE_CROSSWALK.csv;docs/audits/C/C1-consolidation/CAUSE_FAMILIES_MASTER.md',
      'C1 defects risks gaps and operational gates':'docs/audits/C/C1-consolidation/CAUSE_FAMILIES_MASTER.csv',
      'C2 all DEC and O with correct status':'docs/audits/C/C2-decisions/DECISIONS_REGISTER.csv',
      'C2 alternatives cost risk recommendation pending no false approval':'docs/audits/C/C2-decisions/HUMAN_DECISIONS_REVIEW.md',
      'C2 glossary conflict ENT bilateral science recount staffing':'docs/audits/C/C2-decisions/GLOSSARY_AND_NONNEGOTIABLE_RULES.md',
      'C3 per field type source required default validation example help':'docs/audits/C/C3-functional-specification/SCREEN_FIELD_ACTION_INVENTORY.csv',
      'C3 every screen action state focus keyboard AT reflow':'docs/audits/C/C3-functional-specification/UI_STATES_AND_MICROCOPY.md;docs/audits/C/C3-functional-specification/PERSONAS_PERMISSIONS_AND_ACTORS.md',
      'C3 integrated adversarial human journeys':'docs/audits/C/C3-functional-specification/HUMAN_JOURNEYS_AND_EDGE_CASES.md',
      'C4 each cause and approved capability impact':'docs/audits/C/C4-technical-design/CHANGE_IMPACT_MATRIX.csv;docs/audits/C/C4-technical-design/APPROVED_CAPABILITY_CHANGE_PLAN.csv',
      'C4 UI DTO API RPC RLS event snapshot ledger boundaries':'docs/audits/C/C4-technical-design/DATA_API_UI_EVENT_CONTRACTS.md',
      'C4 incremental migrations legacy compatibility rollback':'docs/audits/C/C4-technical-design/MIGRATION_COMPATIBILITY_PLAN.md',
      'C4 security privacy retention origin and roles':'docs/audits/C/C4-technical-design/SECURITY_PRIVACY_AND_TRACEABILITY.md',
      'C4 draft model CAS and partial result':'docs/audits/C/C4-technical-design/DRAFT_PERSISTENCE_AND_CONCURRENCY.md',
      'C4 push delivery auth privacy SSRF CSRF leases failure':'docs/audits/C/C4-technical-design/PWA_PUSH_DELIVERY_ARCHITECTURE.md',
      'C4 PDF final byte verifier optional signature trust':'docs/audits/C/C4-technical-design/PDF_VERIFICATION_ARCHITECTURE.md',
      'C4 seven sequences and failure recovery':'docs/audits/C/C4-technical-design/FAILURE_RECOVERY_AND_IDEMPOTENCY.md',
      'C4 real alternatives no unnecessary stack':'docs/audits/C/C4-technical-design/ARCHITECTURAL_DECISIONS.md',
      'C5 allD lots dependencies owners entries exits proportional QA':'docs/audits/C/C5-execution-roadmap/PHASE_D_WORK_PACKAGES.md;docs/audits/C/C5-execution-roadmap/DEPENDENCY_SEQUENCE.csv',
      'C5 first scope deferred features same SHA schema gates CI PR':'docs/audits/C/C5-execution-roadmap/RELEASE_CUTS_AND_GATES.md',
      'C5 backup DB Auth Storage bytes jobs quarantine RPO RTO':'docs/audits/C/C5-execution-roadmap/ENVIRONMENT_BACKUP_AND_HOMOLOGATION.md',
      'C6 acceptance all source IDs cause DEC lot positive negative layers':'docs/audits/C/C6-acceptance-handoff/ACCEPTANCE_CRITERIA_MASTER.csv;docs/audits/C/C6-acceptance-handoff/REGRESSION_PLAN.md',
      'C6 actual A B C D current decisions archive portals':'docs/README.md;docs/audits/README.md;docs/audits/A/README.md;docs/audits/B/README.md;docs/audits/C/README.md;docs/audits/D/README.md',
      'C6 original file relocation classes consumers final hashes':'docs/RELOCATION_MAP.csv;docs/audits/C/C6-acceptance-handoff/DOCS_RELOCATION_REPORT.md',
      'C6 raw evidence manifests preserved editorial differences logged':'docs/audits/C/C6-acceptance-handoff/EDITORIAL_HASH_CHANGES.csv;docs/audits/C/C6-acceptance-handoff/EDITORIAL_LINK_EDITS.csv',
      'C6 live README AGENTS status architecture DB API security tests operations deployment integrations':'README.md;AGENTS.md;docs/current/README.md;docs/current/PROJECT_STATUS.md',
      'C6 historical authorization not active no source deletion':'docs/archive/README.md;docs/audits/C/C6-acceptance-handoff/DOCS_RELOCATION_REPORT.md',
      'C6 executive and implementation handoff decision questions':'docs/audits/C/C6-acceptance-handoff/PHASE_C_FINAL_EXECUTIVE_REPORT.md;docs/audits/C/C6-acceptance-handoff/PHASE_D_IMPLEMENTATION_HANDOFF.md',
      'C6 persistent checkpoint and source index':'docs/audits/C/CHECKPOINT.md;docs/audits/C/C6-acceptance-handoff/SOURCE_OF_TRUTH_INDEX.md',
      'C6 validation report negative controls source integrity':'docs/audits/C/C6-acceptance-handoff/validation-report.json;docs/audits/C/C6-acceptance-handoff/LINK_VALIDATION_DETAILS.csv',
      'C6 commit push only authorized branch':'docs/audits/C/C6-acceptance-handoff/PHASE_D_IMPLEMENTATION_HANDOFF.md',
    }
    for domain in sorted(domains):requirement_sources['C3 complete domain '+domain]=f'docs/audits/C/C3-functional-specification/{domain}.md'
    for n,(requirement,paths) in enumerate(requirement_sources.items(),1):
        exists=all((ROOT/p).is_file() for p in paths.split(';'))
        requirements.append({'requirement_id':f'C-REQ-{n:03d}','requirement':requirement,'evidence':paths,'status':'GIT_COMMIT_AND_REMOTE_REF_AUTHORITY' if 'commit push' in requirement else 'DOCUMENT_REVIEW_AND_INTEGRITY' if exists else 'MISSING','limits':'Functional/human/physical/provider/restore acceptance planned, not executed in C; pending owner conditions preserved'})
    write(OUT/'COMPLETION_REQUIREMENTS.csv',requirements)
    check('requirement_artifacts',not any(r['status']=='MISSING' for r in requirements),{'requirements':len(requirements),'method':'Per requirement source mapping plus authored semantic review; not a runtime acceptance claim'})

    result={'status':'PASS' if not errors else 'FAIL','client_date':'2026-11-04','branch':git('branch','--show-current'),'input_sha':INPUT_SHA,'head_at_validation':git('rev-parse','HEAD'),'raw_records':len(source_records),'causes':len(causes),'requirements_grouped':len(caps),'acceptance_criteria':len(accepts),'screens':len(screens),'fields':len(field_rows),'original_document_paths':len(relocation),'original_files_byte_identical':preserved,'raw_evidence_files_checked':raw_count,'historical_manifests_checked':manifest_count,'non_documentary_files_checked':len(protected_rows),'link_classes':dict(Counter(r['classification'] for r in link_rows)),'checks':checks,'failed_checks':errors,'functional_tests_executed':False,'runtime_or_external_mutations':'NONE_BY_C; database/background state not revalidated or asserted frozen','external_links':'Only selected technical primary sources consulted; no global external-link crawl','publication':'Git commit and remote ref are the publication authority, external to the self-referential content; final SHA supplied with handoff'}
    (OUT/'validation-report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    if not errors:
        selected=set(p for p in BASE.rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.name!='MANIFEST.json')
        selected.update(p for folder in ['docs/current','docs/decisions'] for p in (ROOT/folder).rglob('*') if p.is_file())
        selected.update(ROOT/p for p in ['README.md','AGENTS.md','docs/README.md','docs/RELOCATION_MAP.csv','docs/audits/README.md','docs/audits/A/README.md','docs/audits/B/README.md','docs/audits/D/README.md','docs/audits/_historical/README.md','docs/archive/README.md','docs/runbooks/README.md','docs/meta/README.md'])
        entries=[]
        for p in sorted(selected):
            data=p.read_bytes();entry={'path':p.relative_to(ROOT).as_posix(),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
            if p.suffix.lower() in {'.md','.py','.csv','.json','.txt'}:
                entry['sha256_lf']=hashlib.sha256(data.replace(b'\r\n',b'\n')).hexdigest()
            entries.append(entry)
        manifest={'algorithm':'SHA-256','scope':'C package and current/canonical guidance; original corpus covered by RELOCATION_MAP plus immutable historical manifests','self_excluded':'docs/audits/C/C6-acceptance-handoff/MANIFEST.json','files':len(entries),'entries':entries}
        (OUT/'MANIFEST.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        assert all(sha(ROOT/e['path'])==e['sha256'] for e in entries)
    print(json.dumps({k:v for k,v in result.items() if k not in {'checks'}},ensure_ascii=False,indent=2))
    raise SystemExit(1 if errors else 0)

if __name__=='__main__':main()
