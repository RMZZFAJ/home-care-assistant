"""Validate B7 artifacts, scoped helpers, references and preservation only."""
from pathlib import Path
import csv
import hashlib
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone

base = Path(__file__).resolve().parent.parent
workspace = base.parents[2]
evidence = base / 'evidence'
manifest_path = evidence / 'MANIFEST.json'

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def digest_lf(path):
    return hashlib.sha256(path.read_bytes().replace(b'\r\n', b'\n')).hexdigest()

def all_files():
    return sorted(p for p in base.rglob('*') if p.is_file()
                  and '__pycache__' not in p.parts and p != manifest_path)

if '--verify' in sys.argv:
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    actual = {p.relative_to(base).as_posix() for p in all_files()}
    expected = {x['path'] for x in manifest['files']}
    assert actual == expected, ('manifest inventory differs', actual ^ expected)
    for row in manifest['files']:
        path = base / row['path']
        assert digest_lf(path) == row['sha256_lf'], row['path']
        assert len(path.read_bytes().replace(b'\r\n', b'\n')) == row['bytes_lf']
    print(json.dumps({'integrity': 'PASS', 'files': len(expected)}))
    sys.exit(0)

required = [
    'README.md', 'CHECKPOINT.md', '00_BASELINE_SCOPE_AND_METHOD.md',
    '01_RUNTIME_TOPOLOGY_AND_ENVIRONMENTS.md',
    '01_RUNTIME_DEPENDENCY_INVENTORY.csv',
    '02_CI_CD_RELEASE_GATES_AND_PROVENANCE.md',
    '03_CONFIGURATION_SECRETS_AND_FEATURE_FLAGS.md',
    '04_DATABASE_MIGRATION_AND_DEPLOY_COMPATIBILITY.md',
    '05_BACKUP_RESTORE_AND_DISASTER_RECOVERY.md',
    '05_RECOVERY_COVERAGE_MATRIX.csv',
    '06_OBSERVABILITY_HEALTH_AND_ALERTING.md',
    '07_PERFORMANCE_SCALABILITY_AND_COST.md',
    '08_QUALITY_GATES_AND_RELEASE_VERIFICATION.md',
    '09_DEVSECOPS_SUPPLY_CHAIN_AND_ENVIRONMENT_SECURITY.md',
    '10_INCIDENT_RESPONSE_AND_OPERATIONAL_CONTINGENCY.md',
    '11_DEPLOYMENT_CUTOVER_ROLLBACK_AND_READINESS.md',
    '12_CROSS_LAYER_ADVERSARIAL_READINESS_REVIEW.md',
    '13_NEW_OPERATIONAL_GAPS_AND_OPPORTUNITIES.md',
    '14_FINDINGS_MASTER.csv', '14_FINDINGS_MASTER.md',
    '15_ACCEPTANCE_AND_VERIFICATION_CRITERIA.md',
    '16_CROSS_GROUP_DEPENDENCIES.md',
    '17_GROUP_B7_EXECUTIVE_ASSESSMENT.md', '18_PHASE_C_DECISION_HANDOFF.md'
]
assert all((base / p).is_file() for p in required)

def rows(path):
    with path.open(encoding='utf-8-sig', newline='') as stream:
        result = list(csv.DictReader(stream))
    assert result and all(None not in row for row in result), path
    return result

inventories = {
    'dependencies': ('01_RUNTIME_DEPENDENCY_INVENTORY.csv', 17),
    'recoveryComponents': ('05_RECOVERY_COVERAGE_MATRIX.csv', 20),
    'readinessDomains': ('11_RELEASE_READINESS_MATRIX.csv', 14),
    'findings': ('14_FINDINGS_MASTER.csv', 7),
    'scenarios': ('evidence/SCENARIOS.csv', 31),
    'priorProofs': ('evidence/PRIOR_PROOFS.csv', 16),
    'sourceAnchors': ('evidence/SOURCE_ANCHORS.csv', 46)
}
for path, expected_count in inventories.values():
    assert len(rows(base / path)) == expected_count, path
findings = rows(base / '14_FINDINGS_MASTER.csv')
assert len(findings[0]) == 28
assert all(all(value.strip() for value in row.values()) for row in findings)
assert len({x['id'] for x in findings}) == 7
assert sum(x['priority'] == 'P2' for x in findings) == 5
assert sum(x['priority'] == 'P3' for x in findings) == 2
master = (base / '14_FINDINGS_MASTER.md').read_text(encoding='utf-8')
assert set(re.findall(r'^## (B7-\d{3})$', master, re.M)) == {
    x['id'] for x in findings}

source_count = 0
for row in rows(evidence / 'SOURCE_ANCHORS.csv'):
    path = workspace / row['path']
    assert digest(path) == row['sha256'], path
    line = path.read_text(encoding='utf-8-sig').splitlines()[int(row['line'])-1]
    assert row['pattern'] in line, row
    source_count += 1
for row in rows(evidence / 'PRIOR_PROOFS.csv'):
    assert digest(workspace / row['path']) == row['sha256'], row['path']

def resolve_reference(ref):
    ref = re.sub(r':\d+$', '', ref.strip())
    for origin in (base, evidence, workspace):
        path = origin / ref
        if path.is_file():
            return path
    raise AssertionError('Missing evidence: ' + ref)

evidence_refs = 0
for row in findings:
    for reference in row['evidence'].split(';'):
        if not reference.strip().startswith('https://'):
            resolve_reference(reference)
            evidence_refs += 1
for row in rows(evidence / 'SCENARIOS.csv'):
    resolve_reference(row['evidence'])
    evidence_refs += 1

index = workspace / 'docs/audits/phase-b/README.md'
local_links = 0
for path in [*base.rglob('*.md'), index]:
    text = path.read_text(encoding='utf-8-sig')
    for match in re.finditer(r'\[[^\]]+\]\(([^)]+)\)', text):
        target = match.group(1).strip().split('#')[0]
        if target.startswith(('https://', 'http://', 'mailto:')) or not target:
            continue
        assert (path.parent / target).resolve().exists(), (path, target)
        local_links += 1

secrets = [r'gh[pousr]_[A-Za-z0-9]{30,}',
           r'github_pat_[A-Za-z0-9_]{35,}',
           r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
           r'eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}',
           r'https?://[^\s/?]+:[^\s/@]+@',
           r'[?&](?:token|access_token|signature)=[A-Za-z0-9_-]{30,}']
secret_matches = []
for path in all_files():
    text = path.read_text(encoding='utf-8-sig')
    for pattern in secrets:
        if re.search(pattern, text):
            # Report path only, never the suspected value.
            secret_matches.append(path.relative_to(base).as_posix())
assert not secret_matches, secret_matches

read = lambda name: json.loads((evidence / name).read_text(encoding='utf-8-sig'))
baseline = read('baseline.json')
preservation = read('preservation.json')
assert preservation['changedFiles'] == []
assert preservation['unexpectedTableChanges'] == []
assert preservation['masterPreserved'] and preservation['routinesPreserved']
assert preservation['businessAuthStorageRowsPreserved']
schema = read('schema-metadata.json')
assert schema['historicalProtected'] == 84 and schema['historicalDrift'] == []
assert schema['comparison']['routineDrift'] == []
assert schema['comparison']['migrationVersionsEqual']
assert read('configuration-run.json')['numPassedTests'] == 7
assert read('upload-envelope-run.json')['numPassedTests'] == 3
assert read('configuration-results.json')['networkCalls'] == 0
assert read('upload-envelope-results.json')['networkCalls'] == 0

node = Path(os.environ['LOCALAPPDATA']) / (
    'home-care-assistant/runtime/node-v24.22.0-win-x64/node.exe')
checks = []

def check(label, args):
    result = subprocess.run(args, cwd=workspace, capture_output=True,
                            text=True, encoding='utf-8', errors='replace',
                            timeout=90, creationflags=subprocess.CREATE_NO_WINDOW)
    output = (result.stdout + result.stderr).strip()
    checks.append({'name': label, 'exitCode': result.returncode,
                   'output': output[-5000:]})
    assert result.returncode == 0, (label, output[-2500:])

if '--documents-only' in sys.argv:
    previous = read('package-validation.json')
    previous_manifest = read('MANIFEST.json')
    code_files = {p for p in all_files() if p.suffix in ('.mjs', '.ts', '.mts')
                  or p.name == 'tsconfig.audit.json'}
    for path in code_files:
        entry = next(x for x in previous_manifest['files']
                     if x['path'] == path.relative_to(base).as_posix())
        assert digest(path) == entry['sha256'], ('Helper changed', path)
    checks.extend(c for c in previous['checks'] if c['name'].startswith(
        ('Syntax ', 'ESLint ', 'TypeScript ')))
else:
    for script in sorted(evidence.glob('*.mjs')):
        check('Syntax ' + script.name, [str(node), '--check', str(script)])
    check('ESLint B7 helpers', [str(node), 'node_modules/eslint/bin/eslint.js',
                              str(evidence)])
    check('TypeScript B7 probes only', [str(node), 'node_modules/typescript/bin/tsc',
           '--project', str(evidence / 'tsconfig.audit.json'), '--noEmit'])
check('Markdown B7 and phase index', [str(node),
      'node_modules/markdownlint-cli2/markdownlint-cli2-bin.mjs',
      base.relative_to(workspace).as_posix() + '/**/*.md',
      'docs/audits/phase-b/README.md'])
check('Git whitespace working tree', ['git', 'diff', '--check'])
check('Git whitespace index', ['git', 'diff', '--cached', '--check'])
allowed = base.relative_to(workspace).as_posix() + '/'
changed = set()
for args in (['diff', '--name-only', 'HEAD'],
             ['ls-files', '--others', '--exclude-standard']):
    result = subprocess.run(['git', *args], cwd=workspace, capture_output=True,
                            text=True, check=True)
    changed.update(result.stdout.splitlines())
outside = [p for p in changed if not p.startswith(allowed)
           and p != 'docs/audits/phase-b/README.md']
assert not outside, outside
report = {'recordedAt': datetime.now(timezone.utc).isoformat(),
          'status': 'PASS', 'node': '24.22.0',
          'requiredDeliverables': len(required),
          **{k: n for k, (_, n) in inventories.items()},
          'findingFields': 28, 'P2': 5, 'P3': 2,
          'controlledTestsPassed': 10, 'controlledNetworkCalls': 0,
          'localLinksChecked': local_links, 'evidenceReferencesChecked': evidence_refs,
          'sourceAnchorsChecked': source_count, 'secretMatches': 0,
          'protectedFiles': baseline['protectedFiles'],
          'preservation': {'productFilesChanged': 0, 'tablesObserved': 108,
                           'unchangedTables': 106,
                           'expectedCronProgressChanges': [x['relation'] for x
                               in preservation['changedTables']],
                           'unexpectedRowChanges': 0, 'masterPreserved': True},
          'phaseIndexSha256': digest(index),
          'changedPathsOutsideScope': outside, 'checks': checks,
          'helperChecksReusedByExactHash': '--documents-only' in sys.argv,
          'notRun': ['global build/typecheck/lint/unit/E2E', 'migration replay',
                     'restore', 'remote mutation', 'deploy or workflow dispatch'],
          'publication': 'DOCUMENT_PUSH_AND_AUTOMATIC_PREVIEW_AUTHORIZED_BY_LATER_USER_INSTRUCTION'}
(evidence / 'package-validation.json').write_text(
    json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
manifest = {'recordedAt': datetime.now(timezone.utc).isoformat(),
            'algorithm': 'SHA-256',
            'verification': 'sha256_lf normalizes CRLF to LF for Git portability; raw sha256/bytes retain local collection identity',
            'scope': 'All package files except MANIFEST.json',
            'files': [{'path': p.relative_to(base).as_posix(),
                       'bytes': p.stat().st_size, 'sha256': digest(p),
                       'bytes_lf': len(p.read_bytes().replace(b'\r\n', b'\n')),
                       'sha256_lf': digest_lf(p)}
                      for p in all_files()]}
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n',
                         encoding='utf-8')
print(json.dumps({k: report[k] for k in ('status', 'requiredDeliverables',
      'findings', 'scenarios', 'localLinksChecked', 'secretMatches')}))
print(json.dumps({'manifestFiles': len(manifest['files']),
                  'checksPassed': len(checks)}))
