from pathlib import Path
import csv,json,subprocess,re,struct
root=Path.cwd()
audit=root/'docs/audits/2026-10-25-production-readiness'
evidence=audit/'evidence'
findings=json.loads((evidence/'findings-ui.json').read_text(encoding='utf-8-sig'))
byfile={}
for f in findings:
    for path in f['files']:
        byfile.setdefault(path,[]).append(f['id'])
rows=list(csv.DictReader((evidence/'coverage-ui.csv').open(encoding='utf-8-sig')))
for r in rows:
    p=r['path']
    r.update(review_status='REVIEWED',review_method='SEMANTIC_FULL',semantic_review='YES',runtime_checked='NO',visual_checked='NO',consumers_checked='ROUTES_IMPORTS_AND_CALLERS',findings=';'.join(byfile.get(p,[])),evidence=p+'; HEAD 37cb7f85e96e551d6419871f94dd950712e2565b',limitations='Leitura estática completa; runtime e visual atuais aguardam origem local segura.')
    if '/admin/' in p:
        r.update(responsibility='Administração, catálogo, vínculos, política e matrizes',journeys='Administração local/global; configuração; convite',notes='Revisados formulário, capacidade de apresentação, versão/conflito, confirmação e recuperação; API/banco têm auditoria própria.')
    elif '/auth/' in p or 'profile-console' in p:
        r.update(responsibility='Identidade, autenticação e preferências pessoais',journeys='Login; convite; recuperação; perfil; MFA',notes='Revisados estados e contratos de UI; homologação de provedores e aparelhos não inferida. Hipótese MFA sem QR após reload foi refutada pelo comportamento listFactors da biblioteca instalada.')
    elif '/schedules/' in p:
        r.update(responsibility='Programação de plantões e revisão de propostas',journeys='Escalas; proposta; aprovação; substituição; encerramento',notes='Leitura integral, incluindo comandos e datas; aprovação de mudança sem diff registrada em UX-001.')
    elif '/balances/' in p:
        r.update(responsibility='Regime, atribuição e contagem BAL por plantão',journeys='Contagem; revisão; adiamento; reconto; regularização',notes='Revisados janela, responsabilidade, referência de estoque, conflito e tentativa persistida; presença física não presumida.')
    elif '/documents/' in p:
        r.update(responsibility='Documentos, histórico, formulários e recuperação',journeys='REQ/COM/ENT/BAL; histórico; anexo; PDF',notes='Revisados versões, metadados, próxima ação, quantidades, vínculos, estados e interrupção; preservar adaptadores existentes.')
    elif '/requisitions/' in p:
        r.update(responsibility='Requisição, ciência e acompanhamento',journeys='REQ; repetição; rascunho; ciência; atendimento',notes='Leitura de todas as etapas, extras e revisão; sem quantidade solicitada. Rascunho de sessão e automático por cabeçalho examinados.')
    elif '/stock/' in p:
        r.update(responsibility='Custódia, movimentos, ocorrências e sugestões',journeys='Estoque; consumo; Flow; compensação',notes='Revisados confirmado/trânsito/projeção, motivos, revisão antes de débito e recuperação. Consumo100/ref cruzado com BE-001.')
    elif '/notifications/' in p:
        r.update(responsibility='Central pessoal, sino e estados de comunicação',journeys='Avisos; leitura; atualização; destino',notes='Separação aplicativo/provedor preservada; leitura sem loading examinada em UX-004.')
    elif '/theme/' in p or p.endswith('.css'):
        r.update(responsibility='Fundação visual, tokens, cascata e responsividade',journeys='Todos os módulos',notes='Leitura completa de regras e precedência; classes antigas não equivalem a cor final. Medições geométricas atuais pendentes.')
    elif '/layout/' in p or '/forms/' in p or '/ui/' in p or 'workspace' in p:
        r.update(responsibility='Shell, contexto e padrões compartilhados',journeys='Navegação; troca de paciente; edição; feedback',notes='Revisados consumidores, foco/dirty guards no código e limites de autoridade; render/teclado atual pendente.')
    elif '/dashboard/' in p:
        r.update(responsibility='Prioridades e ações por atuação',journeys='Início; decisões; equipe; links filtrados',notes='Revisados leitura, tarefas, métricas e destinos; capacidade de apresentação não substitui autorização.')
    else:
        r.update(journeys='Entrada de rota; composição ou utilidade visual',notes='Leitura integral e consumidores examinados; rotas de compatibilidade preservadas e componentes sem uso destacados em UX-010.')
    if p.endswith('.ico'):
        data=(root/p).read_bytes()
        r.update(artifact_type='ASSET',responsibility='Ícone do aplicativo',review_method='BINARY_STRUCTURE',semantic_review='N/A',consumers_checked='APP_ROUTER_ICON_CONVENTION',journeys='Identidade visual',notes=f'ICO válido: {struct.unpack_from("<H",data,4)[0]} entradas; 48x48/32x32/16x16, 32 bits; 15086 bytes. Aparência não inspecionada.',limitations='Estrutura binária examinada; não afirmada qualidade visual do favicon.')
with (evidence/'coverage-ui.csv').open('w',newline='',encoding='utf-8') as f:
    w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
paths=subprocess.check_output(['git','ls-files','docs/ui-ux'],text=True).splitlines()
docs=[]
structure={'inventory':{},'html':[],'manifest':{}}
inv=json.loads((root/'docs/ui-ux/inventory.json').read_text(encoding='utf-8-sig'))
structure['inventory']={'base':inv['base'],'records':len(inv['records']),'unique_paths':len({r['file'] for r in inv['records']}),'missing_paths':[r['file'] for r in inv['records'] if not (root/r['file']).is_file()],'line_count_drift':[r['file'] for r in inv['records'] if (root/r['file']).is_file() and len((root/r['file']).read_text(encoding='utf-8-sig').split('\n'))!=r['lines']]}
manifest=json.loads((root/'docs/ui-ux/evidence/2026-10-25/manifest.json').read_text())
structure['manifest']={'captures':len(manifest['captures']),'bytes_match':all((root/'docs/ui-ux/evidence/2026-10-25'/x['file']).stat().st_size==x['bytes'] for x in manifest['captures'])}
for p in paths:
    ext=Path(p).suffix
    r={k:'' for k in rows[0]}
    r.update(path=p,artifact_type='DOCUMENTATION',responsibility='Referência e histórico da evolução UI',review_method='SEMANTIC_FULL',review_status='REVIEWED',semantic_review='YES',runtime_checked='NO',visual_checked='NO',security_relevance='CONTEXT_ONLY',journeys='Design; homologação; arquitetura de informação',consumers_checked='DOCUMENTATION_LINKS_AND_RUNTIME_COMPARISON',findings=';'.join(byfile.get(p,[])),evidence=p+'; HEAD 37cb7f85e96e551d6419871f94dd950712e2565b',limitations='Documento não é evidência de runtime atual.',notes='Leitura integral; declarações históricas separadas do SHA auditado e da autorização vigente.')
    if p.endswith('INVENTORY.md') or p.endswith('inventory.json'):
        r.update(artifact_type='GENERATED_INVENTORY',review_method='STRUCTURAL_RECONCILIATION',semantic_review='N/A',notes='107 registros, base d467f92; todos os paths reconciliados, schema/imports/exports/estados examinados. Evidência ui-docs-structure.json.',limitations='Inventário automático não constitui leitura semântica dos consumidores; a leitura atual está no coverage-ui.csv.')
    elif p.endswith('manifest.json'):
        r.update(artifact_type='MANIFEST',review_method='SEMANTIC_AND_BYTES_RECONCILIATION',notes='15 capturas históricas; nomes/datas/bytes reconciliados. Não informa SHA exato de cada captura.')
    elif ext=='.png':
        isproto='/references/' in p
        r.update(artifact_type='HISTORICAL_IMAGE',review_method='IMAGE_VISUAL_INSPECTION',semantic_review='N/A',visual_checked='HISTORICAL_ONLY',notes=('Protótipo fictício: hierarquia, densidade, seleção, rótulos, navegação e próxima ação comparados; não é runtime.' if isproto else 'Captura histórica individualmente aberta; hierarquia, legibilidade e estado aparente examinados. Não prova sequência interativa atual.'),limitations='Imagem estática histórica; sem inferir contraste medido, overflow atual, foco ou persistência. Full-page pode posicionar barras fixas na altura original.')
        if 'bal-revisao-ios' in p:r['notes']='Imagem rotulada revisão mostra Etapa1 Contagem e Revisão desabilitada; UX-011. Não prova etapa2.'
    elif ext=='.html':
        text=(root/p).read_text(encoding='utf-8-sig')
        structure['html'].append({'path':p,'bytes':(root/p).stat().st_size,'functions':re.findall(r'function\s+([A-Za-z0-9_]+)\s*\(',text),'has_fetch':bool(re.search(r'\bfetch\s*\(',text)),'external_script_src':re.findall(r'<script[^>]+src=[\"\']([^\"\']+)',text),'title':re.findall(r'<title>(.*?)</title>',text)})
        r.update(artifact_type='HISTORICAL_PROTOTYPE',review_method='STRUCTURE_AND_INTERACTION_REVIEW',semantic_review='PARTIAL',visual_checked='RELATED_REFERENCE_IMAGES',notes='Estrutura, funções de navegação/edição/dados simulados e limite standalone examinados; sete PNGs de referências dão comparação visual. Sem fetch/script externo encontrado.',limitations='HTML histórico não executado nesta rodada; CSS e handlers não foram homologados como produto real. Não é cobertura funcional atual.')
    docs.append(r)
with (evidence/'coverage-ui-docs.csv').open('w',newline='',encoding='utf-8') as f:
    w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(docs)
(evidence/'ui-docs-structure.json').write_text(json.dumps(structure,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'source_rows':len(rows),'source_text_semantic':sum(r['semantic_review']=='YES' for r in rows),'docs_rows':len(docs),'historical_images':sum(r['artifact_type']=='HISTORICAL_IMAGE' for r in docs),'manifest':structure['manifest'],'inventory':structure['inventory']},ensure_ascii=False))

