"""Index owner decisions without inventing approval or changing their source."""
from pathlib import Path
import csv
import gzip
import re

ROOT=Path(__file__).resolve().parents[4]
OUT=Path(__file__).resolve().parent
source=gzip.decompress((ROOT/'docs/audits/C/C0-baseline/inputs/PRODUCT_DECISIONS_MASTER.md.txt.gz').read_bytes()).decode('utf-8-sig')
rows=[]
sections=re.split(r'(?m)^## (DEC-\d{3}) — ',source)
for index in range(1,len(sections),2):
    key,block=sections[index:index+2]
    title=block.splitlines()[0]
    status=re.search(r'\*\*Status:\*\* (.+)',block)[1]
    statuses=re.findall(r'`([A-Z_]+)`',status)
    statuses=[s.replace('OWNER_DEFERRED','DEFERRED') for s in statuses]
    if not statuses: statuses=['OWNER_APPROVED','EXISTING_TO_PRESERVE','DEFERRED']
    paragraphs=[p.strip().replace('\n',' ') for p in block.split('\n\n')[1:] if p.strip() and not p.startswith('**Status:')]
    rows.append({'decision_id':key,'title':title,'status':';'.join(dict.fromkeys(statuses)),'original_status':status,'scope':paragraphs[0] if paragraphs else title,'canonical_source':'docs/decisions/PRODUCT_DECISIONS_MASTER.md','provenance':'OWNER_SUPPLIED_2026_10_30; raw C0 hash','implementation':'PLANNED_NOT_IMPLEMENTED','supersession':'DEC-028/029/030 refine earlier rules; no retroactive author/event rewrite'})
for line in source.splitlines():
    if re.match(r'\| O\d\d \|',line):
        key,title,status=[part.strip() for part in line.strip('|').split('|')]
        normalized=re.search(r'`([A-Z_]+)`',status)[1].replace('OWNER_DEFERRED','DEFERRED')
        rows.append({'decision_id':key,'title':title,'status':normalized,'original_status':status,'scope':title+'; '+status,'canonical_source':'docs/decisions/PRODUCT_DECISIONS_MASTER.md','provenance':'OWNER_SUPPLIED_CATALOGUE_O01_O20','implementation':'EXISTING_TO_PRESERVE' if key=='O10' else 'DEFERRED' if key in {'O17','O18'} else 'PLANNED_NOT_IMPLEMENTED','supersession':'O05/O11 explicitly approved by DEC-030; O10 is existing, never a new module'})
    if re.match(r'\| P\d\d \|',line):
        key,title,alternatives,milestone=[part.strip() for part in line.strip('|').split('|')]
        rows.append({'decision_id':key,'title':title,'status':'PENDING_OWNER','original_status':'PENDING_OWNER; P06 partially resolved by DEC-028','scope':alternatives+'; marco: '+milestone,'canonical_source':'docs/audits/C/C2-decisions/HUMAN_DECISIONS_REVIEW.md','provenance':'OWNER_SUPPLIED_OPEN_QUESTIONS; recommendations not approved','implementation':'BLOCKED_AT_SPECIFIC_D_GATE','supersession':'P06 receiver identity resolved; no-scale/bilateral details remain open' if key=='P06' else 'New owner response must cite ID, date, scope and replaced rule'})
for key,title,scope in [
    ('P13','Metas operacionais e responsáveis','SLO, volume, atraso máximo de fila, suporte/substituto e budget; novos detalhes necessários a DEC-024, não valores inventados'),
    ('P14','Momento do fechamento inferior de COM','Finalidade DEC-004 aprovada; escolher fechamento só depois da validação ou término da expectativa com parcelas ainda explicitamente pendentes'),
    ('P15','Revogação, operações em espera e arquivos temporários','Escolher limite de autoridade em operação iniciada e janela de URL; novos comandos após revogação sempre recusados; cópia baixada não é recolhível'),
]:
    rows.append({'decision_id':key,'title':title,'status':'PENDING_OWNER','original_status':'Detail required by master order; no new approval','scope':scope,'canonical_source':'docs/audits/C/C2-decisions/HUMAN_DECISIONS_REVIEW.md','provenance':'C_TECHNICAL_QUESTION_DERIVED_FROM_OWNER_DIRECTION','implementation':'CONDITIONAL_DESIGN_ONLY','supersession':'Do not change approved purpose or invariants'})
assert len([r for r in rows if r['decision_id'].startswith('DEC-')])==30
assert len([r for r in rows if r['decision_id'].startswith('O')])==20
with (OUT/'DECISIONS_REGISTER.csv').open('w',encoding='utf-8',newline='') as handle:
    writer=csv.DictWriter(handle,fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows)
print(f'{len(rows)} indexed decisions: 30 DEC, 20 O, 15 pending details; original status preserved')
