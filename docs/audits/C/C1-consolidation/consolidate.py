"""Import dated CSVs losslessly by ID; materialize the reviewed C crosswalk.

No experiment, DB, network or product mutation. Classification is an explicit
planning review of the B8 families, not a keyword-based vulnerability scanner.
"""
from pathlib import Path
import csv
import hashlib
import json
import re
from collections import Counter

ROOT = Path(__file__).resolve().parents[4]
BASE = ROOT/'docs/audits/C'

def read(path):
    with path.open(encoding='utf-8-sig', newline='') as handle:
        return list(csv.DictReader(handle))

def write(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', encoding='utf-8', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)

inventory = read(BASE/'C0-baseline/DOCUMENTATION_MIGRATION_INVENTORY.csv')
relocations = {r['old_path']: r['new_path'] for r in inventory}
def locate(old):
    path = ROOT/old
    return path if path.exists() else ROOT/relocations.get(old, old)

source_files = [r['old_path'] for r in inventory if r['old_path'].endswith('FINDINGS_MASTER.csv')]
records = {}
for source in source_files:
    for number, row in enumerate(read(locate(source)), 1):
        if row['id'] in records:
            raise ValueError('Duplicate source ID '+row['id'])
        records[row['id']] = (source, number, row)
assert len(records) == 165, len(records)
b8_path = 'docs/audits/2026-10-30-phase-b8-quality-maintainability/REGRESSION_COVERAGE_MATRIX.csv'
matrix = read(locate(b8_path))
assert len(matrix) == 119
members = [i for r in matrix for i in r['source_ids'].split(';')]
assert len(members) == len(set(members)) == 156
assert set(members) == {i for i in records if not i.startswith('B8-')}

# Reviewed primary routing; complementary causes remain distinct even when
# assigned to the same implementation package or specification.
domain_sets = {
    'REQ': {1,25,41,49,73},
    'COM': {58,77},
    'ENT': {10,42,43,48,50},
    'BAL': {54,56,57},
    'SCHEDULES_AND_STAFFING': {9,39,51},
    'STOCK_AND_CUSTODY': {22,45,46,53,66,72,74},
    'CATALOGUE_AND_PRESENTATIONS': {28,29,44,67,81},
    'CONSUMPTION_AND_OCCURRENCES': {35,47,55,59,65},
    'IDENTITY_ACCESS_MEMBERSHIPS': {12,27,30,31,61,68,69,70,76,80,82,85},
    'DOCUMENTS_PDFS_AND_INTEGRITY': {15,34,36,100,101,102,103,104,105,106,107,108,109,110,111,112},
    'ATTACHMENTS_AND_DRAFTS': {17,32,52},
    'PWA_PUSH_AND_NOTIFICATIONS': {23,64,83,84,86,87,88,89,90,91,92,93,94,95,96,97,98,99,114},
    'ADMINISTRATIVE_OPERATIONS': {5,11,13,14,16,18,19,20,21,24,26,33,37,38,60,71,75,78,79},
    'USER_GUIDES_AND_CONTINUITY': {2,3,4,6,7,8,40,62,63,113,115,116,117,118,119},
}
assert len(set.union(*domain_sets.values())) == 119
assert sum(map(len,domain_sets.values())) == 119
deferred_channel = {3,64,83,84,86,87,88,89,90,91,92,93,94,96,97,98,99,114}
optional = {5,7,8,33,63,72,118,119}
risks = {1,4,5,6,18,24,27,30,31,33,41,63,64,68,72,73,80,83,86,97,110,116,118}
missing = {12,29,32,34,36,42,44,45,46,47,48,52,57,58,87,91,99,108,112}
quality = {2,7,8,40,119}

domain_decisions = {
    'REQ':'DEC-003;DEC-002;DEC-030;O11;O16',
    'COM':'DEC-004;DEC-013;O02;O08', 'ENT':'DEC-005;DEC-006;DEC-028;P06;P07',
    'BAL':'DEC-009;DEC-010;DEC-029;O06',
    'SCHEDULES_AND_STAFFING':'DEC-001;DEC-009;DEC-013;O06',
    'STOCK_AND_CUSTODY':'DEC-007;DEC-013;O09;O12',
    'CATALOGUE_AND_PRESENTATIONS':'DEC-007;O08;O20',
    'CONSUMPTION_AND_OCCURRENCES':'DEC-008;DEC-013;DEC-030;O05',
    'IDENTITY_ACCESS_MEMBERSHIPS':'DEC-001;DEC-006;DEC-021;DEC-022;P01',
    'DOCUMENTS_PDFS_AND_INTEGRITY':'DEC-015;DEC-016;DEC-017;DEC-018;P09',
    'ATTACHMENTS_AND_DRAFTS':'DEC-011;DEC-012;DEC-017;P12',
    'PWA_PUSH_AND_NOTIFICATIONS':'DEC-019;DEC-020;DEC-022;DEC-024',
    'ADMINISTRATIVE_OPERATIONS':'DEC-001;DEC-013;DEC-014;DEC-021',
    'USER_GUIDES_AND_CONTINUITY':'DEC-024;DEC-025;DEC-026;P03;P04;P05;P10;P13',
}
domain_packages = {
    'REQ':'D1','COM':'D2','ENT':'D2','BAL':'D2',
    'SCHEDULES_AND_STAFFING':'D1','STOCK_AND_CUSTODY':'D2',
    'CATALOGUE_AND_PRESENTATIONS':'D2','CONSUMPTION_AND_OCCURRENCES':'D2',
    'IDENTITY_ACCESS_MEMBERSHIPS':'D1','DOCUMENTS_PDFS_AND_INTEGRITY':'D4',
    'ATTACHMENTS_AND_DRAFTS':'D3','PWA_PUSH_AND_NOTIFICATIONS':'D5',
    'ADMINISTRATIVE_OPERATIONS':'D3','USER_GUIDES_AND_CONTINUITY':'D6',
}
causes = []
family_by_regression = {}
for row in matrix:
    number = int(row['regression_id'][-3:])
    if number == 112:
        continue  # Same REQ table projection as R036; adds per-line state oracle.
    domain = next(d for d,s in domain_sets.items() if number in s)
    ids = row['source_ids'].split(';')
    regressions = [row['regression_id']]
    correct = row['correct_behavior_after_decision']
    reason = 'B8 family retained after C review; source IDs describe the same cause, with distinct manifestations retained in acceptance.'
    if number == 36:
        extra = matrix[111]
        ids += extra['source_ids'].split(';')
        regressions += [extra['regression_id']]
        correct += ' '+extra['correct_behavior_after_decision']
        reason = 'R036/R112 merged: same REQ PDF table projection excludes observed stock; B6-013 additionally requires line fulfillment state. Both oracles retained; no merger with PDF test-oracle gap.'
    gate = 'GATED_BY_FEATURE' if number in deferred_channel or number == 1 else 'CAN_DEFER' if number in optional else 'REQUIRES_HOMOLOGATION' if number == 62 else 'OWNER_DECISION' if number == 70 else 'BLOCKS_FIRST_RELEASE'
    package = 'D7' if number in deferred_channel else 'D-LATER' if number in optional else domain_packages[domain]
    if number in {4,6,40}: package = 'D0'
    if number in {9,49,51,66,68,69,74}: package = 'D1'
    if number == 2: package = 'C6'
    classification = 'NOT_HOMOLOGATED' if number == 62 else 'DECISION_NEEDED' if number in {70,90} else 'QUALITY_GAP' if number in quality else 'SUPPORTED_RISK' if number in risks else 'MISSING_CAPABILITY' if number in missing else 'DEFECT_CONFIRMED'
    cause_id = f'C-CAUSE-{len(causes)+1:03d}'
    cause = {'cause_id':cause_id,'title':row['cause_title'],'causal_reason':row['cause'],'source_ids':';'.join(ids),'b8_families':';'.join(regressions),'equivalence_review':reason,'classification':classification,'confidence':'UNVERIFIED_EXTERNAL' if number==62 else 'SUPPORTED_RISK' if classification in {'SUPPORTED_RISK','DECISION_NEEDED'} else 'SOURCE_METHOD_SCOPED','technical_priority':row['priority_inherited'],'release_gate':gate,'domain':domain,'decision_refs':domain_decisions[domain],'decision_scope':'OWNER_GOAL_AND_INVARIANTS;PROPOSED_TECHNICAL_DESIGN','specification':f'docs/audits/C/C3-functional-specification/{domain}.md','planned_package':package,'implementation_status':'NOT_STARTED_PHASE_D' if number!=2 else 'DOCUMENTATION_REMEDIATION_C6_TO_VALIDATE','current_protection':row['current_protection'],'existing_checks':row['existing_checks'],'coverage_gap':row['exact_coverage_gap'],'correct_behavior':correct,'negative_oracle':'O ensaio deve recusar o comportamento defeituoso descrito: '+row['cause']+' Comparar com o resultado correto da coluna correct_behavior, sem legitimar o estado anterior.','test_layers':row['test_layers'],'human_acceptance':row['human_validation'],'physical_acceptance':row['physical_or_assistive_validation'],'remote_homologation':row['remote_homologation'],'open_condition':row['pending_decision']}
    causes.append(cause)
    for regression in regressions: family_by_regression[regression] = cause

b8_assign = {'B8-Q004':'B8-R040','B8-M001':'B8-R002','B8-M002':'B8-R006','B8-M003':'B8-R003','B8-M004':'B8-R004','B8-M005':'B8-R007'}
for source_id, regression in b8_assign.items():
    cause=family_by_regression[regression]
    cause['source_ids'] += ';'+source_id
    cause['equivalence_review'] += ' '+source_id+' revalidates this primary cause; related IDs in the B8 row remain secondary dependencies, not merged by association.'
for source_id, domain, package in [('B8-Q001','DOCUMENTS_PDFS_AND_INTEGRITY','D4'),('B8-Q002','STOCK_AND_CUSTODY','D0'),('B8-Q003','ADMINISTRATIVE_OPERATIONS','D0')]:
    source, number, row = records[source_id]
    cause_id=f'C-CAUSE-{len(causes)+1:03d}'
    causes.append({'cause_id':cause_id,'title':row['title'],'causal_reason':row['cause'],'source_ids':source_id,'b8_families':'NEW_B8_QUALITY','equivalence_review':'Independent test-oracle/needs-review cause, not the runtime defect it can fail to detect.','classification':'QUALITY_GAP','confidence':'CONFIRMED_CONTROLLED_PROBE','technical_priority':row['priority'],'release_gate':'BLOCKS_FIRST_RELEASE','domain':domain,'decision_refs':domain_decisions[domain]+';P10','decision_scope':'OWNER_ACCEPTANCE_GOAL;PROPOSED_TEST_DESIGN','specification':f'docs/audits/C/C3-functional-specification/{domain}.md','planned_package':package,'implementation_status':'NOT_STARTED_PHASE_D','current_protection':row['counterproof'],'existing_checks':row['source'],'coverage_gap':row['observed'],'correct_behavior':row['acceptance'],'negative_oracle':row['future'],'test_layers':'SQL+AUTH_RPC' if source_id=='B8-Q002' else 'PDF_EXTRACTION+GEOMETRY+HUMAN' if source_id=='B8-Q001' else 'BROWSER_AXE+HUMAN_AT','human_acceptance':row['human'],'physical_acceptance':row['human'],'remote_homologation':row['remote'],'open_condition':row['decision']})

by_source = {}
for cause in causes:
    for source_id in cause['source_ids'].split(';'):
        assert source_id not in by_source, source_id
        by_source[source_id] = cause
assert set(by_source) == set(records)
assert len(causes) == 121
crosswalk=[]
for source_id,(source,number,row) in records.items():
    cause=by_source[source_id]
    phase='A' if 'production-readiness' in source else re.search(r'phase-(b[1-8])',source)[1].upper()
    crosswalk.append({'source_id':source_id,'source_phase':phase,'source_title':row['title'],'source_nature':row.get('nature',''),'source_priority':row['priority'],'source_confidence':row.get('confidence',row.get('method','')),'source_status':row.get('status',row.get('state','')),'source_csv':relocations[source],'original_source_csv':source,'source_record':number,'source_sha256':hashlib.sha256(locate(source).read_bytes()).hexdigest(),'original_evidence':row.get('evidence',''),'evidence_context':str(Path(relocations[source]).parent).replace('\\','/'),'cause_id':cause['cause_id'],'b8_families':cause['b8_families'],'classification':cause['classification'],'decision_refs':cause['decision_refs'],'specification':cause['specification'],'planned_package':cause['planned_package'],'verification_id':cause['cause_id'].replace('C-CAUSE','C-AC'),'release_gate':cause['release_gate']})
write(BASE/'C1-consolidation/FINDINGS_165_SOURCE_CROSSWALK.csv',crosswalk)
write(BASE/'C1-consolidation/CAUSE_FAMILIES_MASTER.csv',causes)
acceptance=[]
impacts=[]
for cause in causes:
    acceptance.append({'acceptance_id':cause['cause_id'].replace('C-CAUSE','C-AC'),'cause_id':cause['cause_id'],'source_ids':cause['source_ids'],'decision_refs':cause['decision_refs'],'planned_package':cause['planned_package'],'gate':cause['release_gate'],'positive_oracle':cause['correct_behavior'],'negative_oracle':cause['negative_oracle'],'current_checks':cause['existing_checks'],'current_gap':cause['coverage_gap'],'test_layers':cause['test_layers'],'persistence_oracle':'Comparar resultado com read-back independente; ator/paciente/versão/evento e ledger quando aplicável; recusa não cria efeito. Para leitura/PDF, conferir fonte e bytes/estado exibido.','human':cause['human_acceptance'],'physical':cause['physical_acceptance'],'remote':cause['remote_homologation'],'decision_condition':cause['open_condition'],'execution_status':'PLANNED_NOT_EXECUTED_C'})
    impacts.append({'cause_id':cause['cause_id'],'source_ids':cause['source_ids'],'domain':cause['domain'],'decision_refs':cause['decision_refs'],'source_anchors':cause['existing_checks'],'ui_readmodel_change':cause['correct_behavior'],'api_database_contract':'Ver DATA_API_UI_EVENT_CONTRACTS.md e seção do domínio; mudar somente fronteiras afetadas, preservando clientes antigos.','event_snapshot_ledger':'Nova versão para novos fatos; preservar fatos/autores/hashes anteriores; compensação referenciada quando houver estoque.','migration_policy':'Incremental somente se contrato SQL/schema/grant mudar; nenhuma migration executada em C.','auth_rls':'Sessão ativa, capacidade por paciente, revalidação após lock; nenhum DML direto novo.','idempotency_version':'Mesma intenção = chave estável; hash de conteúdo; versão esperada; conflito não reaplica.','compatibility_recovery':'Expandir contrato antes de consumidor; resultado parcial por etapa; rollout por capacidade; forward fix sem reset.','specification':cause['specification'],'planned_package':cause['planned_package'],'verification_id':cause['cause_id'].replace('C-CAUSE','C-AC'),'status':'DESIGN_ONLY'})
write(BASE/'C6-acceptance-handoff/ACCEPTANCE_CRITERIA_MASTER.csv',acceptance)
write(BASE/'C4-technical-design/CHANGE_IMPACT_MATRIX.csv',impacts)
summary={'raw_records':len(records),'source_counts':dict(Counter(r['source_phase'] for r in crosswalk)),'b8_input_ids':len(members),'b8_input_families':119,'c_independent_causes':len(causes),'adjudication':'119 - 1 overlapping REQ PDF projection + 3 independent B8 quality causes = 121; six B8 revalidations attached, not added','gates':dict(Counter(c['release_gate'] for c in causes)),'classifications':dict(Counter(c['classification'] for c in causes)),'p1_causes':[{k:c[k] for k in ['cause_id','source_ids','title']} for c in causes if c['technical_priority']=='P1']}
(BASE/'C1-consolidation/reconciliation.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(summary,ensure_ascii=False,indent=2))
