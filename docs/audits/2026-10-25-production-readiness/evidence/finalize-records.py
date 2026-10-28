"""Normalize only the audit package; never change product files or the Git index."""
from pathlib import Path
import csv
import json
import re

base = Path('docs/audits/2026-10-25-production-readiness')
ev = base / 'evidence'
natures = {
    'DEFEITO_CONFIRMADO': 'DEFECT_CONFIRMED',
    'DEFEITO_ESTATICO': 'DEFECT_CONFIRMED',
    'HIPOTESE_DE_DEFEITO': 'OPEN_QUESTION',
    'RISCO_DE_CAPACIDADE': 'RISK_SUPPORTED',
    'RISCO_DE_ESCALA': 'RISK_SUPPORTED',
    'RISCO_OPERACIONAL': 'RISK_SUPPORTED',
    'HOMOLOGATION_GAP': 'EXTERNAL_DEPENDENCY',
    'TEST_RELIABILITY_GAP': 'TEST_GAP',
}
for name in ('backend', 'database', 'ui', 'root', 'testing'):
    path = ev / f'findings-{name}.json'
    findings = json.loads(path.read_text(encoding='utf-8-sig'))
    for f in findings:
        f['nature'] = natures.get(f['nature'], f['nature'])
        if f['id'].startswith('DB-'):
            f['confidence'] = ('MODERATE' if f['id'] == 'DB-003' else
                               'CONFIRMED' if f['nature'] == 'DEFECT_CONFIRMED'
                               else 'STRONG')
        if f['id'] == 'DB-005':
            f['priority'] = 'P3'
    path.write_text(json.dumps(findings, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

p = base / 'DATABASE_AUTH_SECURITY.md'
t = p.read_text(encoding='utf-8').replace(
    'P2 risco de capacidade; não exponencial, impacto de latência não medido.',
    'P3 risco de capacidade; não exponencial, impacto de latência não medido. '
    'Prioridade alinhada a BE-006; medir antes de otimizar.')
p.write_text(t, encoding='utf-8')
p = base / 'TESTING_PERFORMANCE_OBSERVABILITY.md'
t = p.read_text(encoding='utf-8').replace(
    'concluiu as56 entradas de rotas exibidas no log.',
    'concluiu as 56 páginas da etapa de geração mostrada no log.')
p.write_text(t, encoding='utf-8')

# Browser globals are evaluated inside page.evaluate; use explicit globalThis
# instead of changing lint rules. No runtime behavior is changed.
for name in ('ui-runtime.mjs', 'ui-runtime-ready.mjs'):
    p = ev / name
    t = p.read_text(encoding='utf-8')
    if name == 'ui-runtime.mjs':
        t = t.replace('writeFileSync, readFileSync', 'writeFileSync')
    for symbol in ('document', 'getComputedStyle', 'innerWidth', 'innerHeight'):
        t = re.sub(r'(?<![\w.-])' + symbol + r'(?=[.(,}])', 'globalThis.' + symbol, t)
    t = t.replace('...document.', '...globalThis.document.')
    p.write_text(t, encoding='utf-8')

# N/A and NOT_APPLICABLE had the same meaning across reviewers.
for p in ev.glob('coverage-*.csv'):
    rows = list(csv.DictReader(p.open(encoding='utf-8-sig', newline='')))
    for r in rows:
        if r['path'] == 'supabase/.gitignore':
            r['responsibility'] = 'Exclui temporários e branches locais do Supabase; preserva config, seed e migrations no controle de versão.'
        if r['semantic_review'] == 'N/A':
            r['semantic_review'] = 'NOT_APPLICABLE'
        if p.name == 'coverage-ui.csv' and r['runtime_checked'] == 'YES':
            r['runtime_checked'] = 'PARTIAL'
            r['visual_checked'] = 'PARTIAL'
    with p.open('w', encoding='utf-8', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
print('Audit records normalized; no product file changed.')
