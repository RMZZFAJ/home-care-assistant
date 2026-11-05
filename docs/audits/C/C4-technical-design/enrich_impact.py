"""Attach actual source paths and domain contracts to each C cause plan."""
from pathlib import Path
import csv
import re
import runpy

ROOT=Path(__file__).resolve().parents[4]
BASE=ROOT/'docs/audits/C'
# Audit directories contain hyphens, so load the shared parser by file path.
# run_path leaves the formatter's guarded __main__ routine unexecuted.
parse_tables=runpy.run_path(str(BASE/'C6-acceptance-handoff/format_documentation.py'))['parse_tables']
def read(path):
    with path.open(encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))
relocation={r['old_path']:r['new_path'] for r in read(BASE/'C0-baseline/DOCUMENTATION_MIGRATION_INVENTORY.csv')}
records={}
for old,new in relocation.items():
    if old.endswith('FINDINGS_MASTER.csv'):
        path=ROOT/old if (ROOT/old).exists() else ROOT/new
        records.update({r['id']:r for r in read(path)})
domains=['REQ','COM','ENT','BAL','SCHEDULES_AND_STAFFING','STOCK_AND_CUSTODY','CATALOGUE_AND_PRESENTATIONS','CONSUMPTION_AND_OCCURRENCES','IDENTITY_ACCESS_MEMBERSHIPS','ATTACHMENTS_AND_DRAFTS','PWA_PUSH_AND_NOTIFICATIONS','DOCUMENTS_PDFS_AND_INTEGRITY','ADMINISTRATIVE_OPERATIONS','USER_GUIDES_AND_CONTINUITY']
contracts=[]
for headers,table_records in parse_tables((BASE/'C4-technical-design/DATA_API_UI_EVENT_CONTRACTS.md').read_text(encoding='utf-8')):
    if headers[0]=='Domínio C3':contracts.extend(cells for number,cells in table_records)
assert len(contracts)==len(domains)
by_domain=dict(zip(domains,contracts))
sql={1,25,41,42,45,47,48,49,50,51,52,53,54,55,56,57,58,61,65,66,67,68,69,71,73,85,86,87,91,92,93,96,98,100,102,109}
causes={r['cause_id']:r for r in read(BASE/'C1-consolidation/CAUSE_FAMILIES_MASTER.csv')}
path=BASE/'C4-technical-design/CHANGE_IMPACT_MATRIX.csv'
rows=read(path)
for row in rows:
    c=causes[row['cause_id']];contract=by_domain[row['domain']]
    runtime=set()
    for source_id in row['source_ids'].split(';'):
        for key in ['files','code_references','source','technical_path','object','endpoint','service']:
            runtime.update(re.findall(r'(?:src|supabase/migrations|scripts|tests)/[^\s;,|]+',records[source_id].get(key,'')))
    row['source_runtime_paths']=';'.join(sorted(runtime))
    row['ui_consumer']=contract[1]
    row['api_database_contract']=contract[2]
    row['event_snapshot_ledger']=contract[3]
    reg=c['b8_families'].split(';')[0]
    needs_sql=reg.startswith('B8-R') and int(reg[-3:]) in sql
    row['sql_change_assessment']='INCREMENTAL_RPC_OR_SCHEMA_CHANGE_REQUIRED' if needs_sql else 'NO_NEW_SCHEMA_ASSUMED;REVIEW_AFFECTED_CONTRACT'
    row['migration_policy']='M1–M6 in MIGRATION_COMPATIBILITY_PLAN.md; preserve all historical migrations; none executed in C' if needs_sql else 'Change consumer/adapter/procedure first; migration only if a concrete missing persisted contract is demonstrated'
with path.open('w',encoding='utf-8',newline='') as f:
    w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
print(f'{len(rows)} cause plans enriched with runtime paths and 14 concrete domain contracts')
