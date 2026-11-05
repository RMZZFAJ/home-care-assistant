"""C0: snapshot documentation and its consumers. No DB/network/product writes."""
from pathlib import Path
import csv
import hashlib
import gzip
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
INPUTS = ['PHASE_C_MASTER_ORDER.md', 'PRODUCT_DECISIONS_MASTER.md',
          'PHASE_C_SUBPHASES.md', 'DOCS_REORGANIZATION_POLICY.md']

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT).decode('utf-8')

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def csv_write(path, rows, fields):
    with path.open('w', encoding='utf-8', newline='') as out:
        writer = csv.DictWriter(out, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)

def plan(path):
    if path in INPUTS:
        target = ('docs/decisions/' if path == 'PRODUCT_DECISIONS_MASTER.md'
                  else 'docs/audits/C/C0-baseline/mandate/') + path
        return 'APPROVED_DECISION' if 'PRODUCT' in path else 'PLANNED_NOT_IMPLEMENTED', target, 'GIT_MV_INPUT', 'Human input; preserve original bytes separately'
    if path in ['README.md', 'AGENTS.md']:
        return 'CURRENT_GUIDE', path, 'UPDATE_CURRENT', 'Canonical entrypoint; remove stale state, preserve Next managed block'
    if path.startswith('docs/audits/phase-b/'):
        return 'CURRENT_GUIDE', path.replace('docs/audits/phase-b/', 'docs/audits/B/'), 'GIT_MV', 'Live phase-B index'
    if path.startswith('docs/audits/2026-10-20/') or path.startswith('docs/audits/2026-10-21/'):
        return 'HISTORICAL_EXECUTION', path.replace('docs/audits/', 'docs/audits/_historical/', 1), 'GIT_MV', 'Pre-A evidence and dated authorizations'
    if path.startswith('docs/audits/2026-10-25-production-readiness/'):
        return 'HISTORICAL_AUDIT_EVIDENCE', path.replace('docs/audits/', 'docs/audits/A/', 1), 'GIT_MV', 'Phase A evidence, preserve original manifests'
    match = re.match(r'docs/audits/([^/]*-phase-b([1-8])-[^/]+)/(.*)', path)
    if match:
        return 'HISTORICAL_AUDIT_EVIDENCE', f'docs/audits/B/B{match[2]}/{match[1]}/{match[3]}', 'GIT_MV', 'Whole B package; only editorial link changes outside raw evidence'
    if re.match(r'docs/[^/]+\.md$', path):
        return 'CURRENT_CONTRACT', path.replace('docs/', 'docs/current/', 1), 'GIT_MV_UPDATE', 'AS_IS contract reviewed against code and audits'
    if path.startswith('docs/evolution/') or path == 'docs/ui-ux/EXECUTION.md' or path.startswith(('docs/ui-ux/evidence/', 'docs/ui-ux/references/')):
        return 'HISTORICAL_EXECUTION', path.replace('docs/', 'docs/archive/', 1), 'ARCHIVE', 'Dated execution/prototype/evidence, not current acceptance'
    if path.startswith('docs/ui-ux/'):
        return 'CURRENT_GUIDE', path, 'UPDATE_CURRENT' if path.endswith('.md') else 'KEEP_CURRENT', 'Stable UI guide/inventory path consumed by existing tools'
    if path.startswith(('docs/meta/', 'docs/references/')):
        return 'REFERENCE_MATERIAL', path, 'KEEP_CURRENT', 'Provider/reference payloads have tool or historical consumers; no activation'
    return 'UNKNOWN', path, 'DEFER_WITH_REASON', 'No move until classified'

def main():
    baseline_path = OUT / 'baseline.json'
    if baseline_path.exists():
        raise SystemExit('Refusing to overwrite C0 snapshot')
    tracked = sorted(p for p in git('ls-files', '-z').split('\0') if p)
    docs = sorted(set(p for p in tracked if p.startswith('docs/')) | set(INPUTS) | {'README.md', 'AGENTS.md'})
    docs = [p for p in docs if not p.startswith('docs/audits/C/')]
    consumers = []
    links = []
    for path in tracked:
        file = ROOT / path
        if file.suffix.lower() not in {'.md', '.mjs', '.js', '.ts', '.tsx', '.py', '.json', '.csv', '.sh', '.yml', '.yaml', '.txt', '.html'}:
            continue
        text = file.read_text(encoding='utf-8-sig', errors='replace')
        for line_no, line in enumerate(text.splitlines(), 1):
            for token in re.findall(r'docs[/\\][A-Za-z0-9_./\\-]+', line):
                consumers.append({'consumer': path, 'line': line_no, 'target_literal': token, 'kind': 'DATED_LITERAL' if '/evidence/' in path else 'LIVE_OR_TOOL_REFERENCE'})
            if file.suffix == '.md':
                for target in re.findall(r'\]\(([^)]+)\)', line):
                    links.append({'source': path, 'line': line_no, 'target': target, 'kind': 'EXTERNAL' if re.match(r'https?://', target) else 'LOCAL'})
    counts = {}
    rows = []
    for path in docs:
        category, target, action, reason = plan(path)
        counts[category] = counts.get(category, 0) + 1
        references = [r for r in consumers if r['target_literal'].replace('\\', '/') == path]
        rows.append({'old_path': path, 'category': category, 'current_consumer': ';'.join(sorted({r['consumer'] for r in references})), 'reason': reason, 'new_path': target, 'action': action, 'original_sha256': digest(ROOT/path), 'original_bytes': (ROOT/path).stat().st_size, 'final_sha256': '', 'link_impact': 'review relative depth and dated literals' if target != path else 'review current state', 'validation': 'PENDING_C6', 'status': 'INVENTORIED'})
    csv_write(OUT/'DOCUMENTATION_MIGRATION_INVENTORY.csv', rows, list(rows[0]))
    csv_write(OUT/'PATH_CONSUMERS.csv', consumers, ['consumer', 'line', 'target_literal', 'kind'])
    csv_write(OUT/'MARKDOWN_LINKS_BEFORE.csv', links, ['source', 'line', 'target', 'kind'])
    protected = [{'path': p, 'sha256': digest(ROOT/p)} for p in tracked if not p.startswith('docs/') and p not in {'README.md', 'AGENTS.md', *INPUTS}]
    baseline = {'head': git('rev-parse', 'HEAD').strip(), 'branch': git('branch', '--show-current').strip(), 'master': git('rev-parse', 'master').strip(), 'origin_branch': git('rev-parse', 'origin/audit/phase-b').strip(), 'functional_base': '37cb7f85e96e551d6419871f94dd950712e2565b', 'initial_changes': INPUTS, 'documentation_files': len(rows), 'categories': counts, 'consumers': len(consumers), 'markdown_links': len(links), 'protected_files': protected, 'migration_count': len(list((ROOT/'supabase/migrations').glob('*.sql'))), 'historical_contract_guard_entries': len(json.loads((ROOT/'scripts/historical-migrations.json').read_text(encoding='utf-8-sig'))), 'runtime_effects': 'No DB/Auth/Storage/provider/runtime operations; documentation only'}
    baseline_path.write_text(json.dumps(baseline, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    raw = OUT/'inputs'
    raw.mkdir(exist_ok=True)
    sources = []
    for path in INPUTS:
        (raw/(path+'.txt.gz')).write_bytes(gzip.compress((ROOT/path).read_bytes(),mtime=0))
        sources.append({'source': path, 'raw_copy': 'docs/audits/C/C0-baseline/inputs/'+path+'.txt.gz', 'sha256': digest(ROOT/path), 'authority': 'OWNER_SUPPLIED_2026_10_30'})
    interposition = Path(r'C:\Users\renat\.codex\attachments\516ad3a4-7896-483b-9ce6-eaf4398944bc\goal-objective.md')
    (raw/'PHASE_C_INTERPOSITION.md.txt.gz').write_bytes(gzip.compress(interposition.read_bytes(),mtime=0))
    sources.append({'source': 'conversation goal-objective.md', 'raw_copy': 'docs/audits/C/C0-baseline/inputs/PHASE_C_INTERPOSITION.md.txt.gz', 'sha256': digest(interposition), 'authority': 'OWNER_LATEST_SCOPE_SUPERSEDES_B5_REQUEST'})
    csv_write(OUT/'INPUTS_PROVENANCE.csv', sources, list(sources[0]))
    print(json.dumps({k:v for k,v in baseline.items() if k != 'protected_files'}, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
