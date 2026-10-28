"""Read-only audit validation, except its report within the authorized package."""
from pathlib import Path
from datetime import datetime, timezone
from collections import Counter
from urllib.parse import unquote
import csv
import hashlib
import json
import re
import subprocess
import sys

root = Path.cwd().resolve()
base = root / 'docs/audits/2026-10-25-production-readiness'
ev = base / 'evidence'
expected_sha = '37cb7f85e96e551d6419871f94dd950712e2565b'

def git(*args):
    return subprocess.check_output(['git', *args], cwd=root).decode('utf-8').strip()

def read_csv(path):
    return list(csv.DictReader(path.open(encoding='utf-8-sig', newline='')))

if '--verify-manifest' in sys.argv:
    entries = read_csv(ev / 'MANIFEST.csv')
    actual = {p.relative_to(base).as_posix() for p in ev.rglob('*')
              if p.is_file() and p.name != 'MANIFEST.csv'}
    indexed = {r['path'] for r in entries}
    assert actual == indexed, 'Manifest path set mismatch'
    assert len(entries) == len(indexed), 'Duplicate manifest paths'
    for row in entries:
        data = (base / row['path']).read_bytes()
        assert len(data) == int(row['bytes']), 'Manifest size mismatch: ' + row['path']
        assert hashlib.sha256(data).hexdigest() == row['sha256'], 'Manifest hash mismatch: ' + row['path']
    print(json.dumps({'manifest': 'PASS', 'artifacts': len(entries), 'sha256Verified': True}))
    sys.exit(0)

errors = []
def check(ok, label):
    if not ok:
        errors.append(label)

sha = git('rev-parse', 'HEAD')
check(sha == expected_sha, 'HEAD changed')
inventory = (ev / 'tracked-files.txt').read_text(encoding='utf-8-sig').splitlines()
tree = git('ls-tree', '-r', '--name-only', expected_sha).splitlines()
check(set(inventory) == set(tree), 'Inventory differs from commit tree')
check(len(inventory) == len(set(inventory)) == 503, 'Inventory count/duplicates')
changed = git('diff', '--name-only', 'HEAD').splitlines()
product_changes = sorted(set(changed) & set(tree))
check(not product_changes, 'Product changed: ' + ', '.join(product_changes))
allowed_attachments = {
    '01_ORDEM_MESTRA_AUDITORIA_PRODUCAO.md',
    '02_PROTOCOLO_AUDITORIA_E_ENTREGAVEIS.md',
    '03_BASELINE_VERIFICADO_REPOSITORIO.md',
    '04_CONTEXTO_HISTORICO_CONVERSA.md',
}
all_new = set(changed) | set(git('ls-files', '--others', '--exclude-standard').splitlines())
outside = sorted(p for p in all_new if p not in allowed_attachments
                 and not p.startswith('docs/audits/2026-10-25-production-readiness/'))
check(not outside, 'Changes outside scope: ' + ', '.join(outside))

coverage = read_csv(base / 'COVERAGE.csv')
check(len(coverage) == 503 and {r['path'] for r in coverage} == set(tree), 'Coverage reconciliation')
check(len(coverage[0]) == 15, 'Coverage schema')
for row in coverage:
    for field in ('path', 'review_method', 'review_status', 'responsibility', 'evidence', 'limitations'):
        check(bool(row.get(field)), f'Coverage missing {field}: {row["path"]}')

findings = read_csv(base / 'FINDINGS_MASTER.csv')
ids = {f['id'] for f in findings}
check(len(findings) == len(ids) == 32, 'Finding IDs/count')
check(len(findings[0]) == 36, 'Finding schema')
roadmap_ids = set(re.findall(r'\b[A-Z]+-\d{3}\b', (base / 'EXECUTION_ROADMAP.md').read_text(encoding='utf-8')))
check(ids <= roadmap_ids, 'Findings absent from roadmap: ' + ', '.join(sorted(ids - roadmap_ids)))
sources = []
for group in ('backend', 'database', 'ui', 'root', 'testing'):
    sources.extend(json.loads((ev / f'findings-{group}.json').read_text(encoding='utf-8-sig')))
by_id = {f['id']: f for f in sources}
for f in findings:
    for key in ('title', 'nature', 'confidence', 'priority', 'evidence',
                'countercheck', 'countercheck_result', 'acceptance_criteria', 'invariants'):
        check(bool(f.get(key)), f'Missing finding {key}: {f["id"]}')
    check(f['priority'] == by_id[f['id']]['priority'], 'Priority mismatch: ' + f['id'])
    check(f['nature'] == by_id[f['id']]['nature'], 'Nature mismatch: ' + f['id'])
for row in coverage:
    linked = {x.strip() for x in row['findings'].split(';') if x.strip()}
    check(linked <= ids, 'Unknown coverage finding: ' + row['path'])

required = '''README EXECUTIVE_READINESS METHOD_AND_EVIDENCE
REPOSITORY_AND_ARCHITECTURE_MAP COVERAGE_SUMMARY FINDINGS_MASTER
ARCHITECTURE_AND_BACKEND DATABASE_AUTH_SECURITY UI_UX_DESIGN_SYSTEM
JOURNEYS_AND_INFORMATION_ARCHITECTURE MICROCOPY_TERMINOLOGY_AND_FORMS
PRODUCT_GAPS_AND_CONFIGURATION AUTOMATION_INTEGRATIONS_RELIABILITY
TESTING_PERFORMANCE_OBSERVABILITY REPOSITORY_HYGIENE_AND_DOCUMENTATION
DATABASE_RESET_SEED_AND_GO_LIVE HOMOLOGATION_AND_ACCEPTANCE
EXECUTION_ROADMAP PHASE_B_HANDOFF CHECKPOINT'''.split()
for name in required:
    check((base / f'{name}.md').is_file(), 'Missing report: ' + name)
links_checked = 0
for path in base.rglob('*.md'):
    text = path.read_text(encoding='utf-8-sig')
    for target in re.findall(r'\]\(([^)]+)\)', text):
        target = target.strip('<>').split(' "')[0].split('#')[0]
        if not target or re.match(r'^[a-z]+:', target):
            continue
        links_checked += 1
        check((path.parent / unquote(target)).exists(),
              f'Broken link {path.relative_to(base)} -> {target}')

# Check concrete evidence paths, allowing source references with line numbers.
references_checked = 0
pattern = r'(?:docs|evidence|src|scripts|supabase|tests)/[^\s;,`<>\"]+?\.(?:md|mjs|mts|tsx|ts|sql|json|log|png|csv|txt|pdf)'
for finding in findings:
    for ref in re.findall(pattern, finding['evidence']):
        candidate = (base if ref.startswith('evidence/') else root) / ref
        references_checked += 1
        check(candidate.is_file(), f'Missing evidence {finding["id"]}: {ref}')

# Read local values only in memory to look for accidental disclosure.
# The report never contains a credential value or an environment dump.
secret_values = set()
env_file = root / '.env.local'
if env_file.exists():
    for line in env_file.read_text(encoding='utf-8-sig').splitlines():
        match = re.match(r'\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$', line)
        if match and re.search(r'KEY|TOKEN|SECRET|PASSWORD', match[1]):
            value = match[2].strip('\'"')
            if len(value) >= 16:
                secret_values.add(value)
credentials = root / 'supabase/.temp/hca-test-credentials.json'
if credentials.exists():
    values = json.loads(credentials.read_text(encoding='utf-8-sig'))
    def collect_passwords(value):
        if isinstance(value, dict):
            for key, child in value.items():
                if 'password' in key.lower() and isinstance(child, str) and len(child) >= 8:
                    secret_values.add(child)
                else:
                    collect_passwords(child)
        elif isinstance(value, list):
            for child in value:
                collect_passwords(child)
    collect_passwords(values)
secret_hits = []
json_count = 0
text_count = 0
for path in base.rglob('*'):
    if not path.is_file() or path.suffix.lower() in {'.png', '.pdf', '.ttf', '.ico'}:
        continue
    content = path.read_text(encoding='utf-8-sig')
    text_count += 1
    if path.suffix == '.json':
        try:
            json.loads(content)
            json_count += 1
        except ValueError:
            errors.append('Invalid JSON: ' + str(path.relative_to(base)))
    exact = sum(1 for value in secret_values if value in content)
    jwt = len(re.findall(r'eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}', content))
    key = len(re.findall(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----', content))
    if exact or jwt or key:
        secret_hits.append({'path': path.relative_to(base).as_posix(), 'matches': exact + jwt + key})
check(not secret_hits, 'Potential credential exposure; see paths/counts only')

summary = {
    'checkedAt': datetime.now(timezone.utc).isoformat(),
    'status': 'PASS' if not errors else 'FAIL',
    'sha': sha, 'inventory': len(inventory), 'coverage': len(coverage),
    'requiredReports': len(required), 'findings': len(findings),
    'priorities': dict(Counter(f['priority'] for f in findings)),
    'natures': dict(Counter(f['nature'] for f in findings)),
    'markdownLinksChecked': links_checked, 'evidenceReferencesChecked': references_checked,
    'jsonFilesParsed': json_count, 'textFilesScanned': text_count,
    'secretHits': secret_hits, 'productChanges': product_changes,
    'changesOutsideAllowedScope': outside,
    'gitIndexModifiedByValidator': False,
    'manifestVerification': 'Run --verify-manifest after final assembly; it does not modify files.',
    'errors': errors,
}
(ev / 'audit-validation.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps(summary, ensure_ascii=False, indent=2))
sys.exit(0 if not errors else 1)
