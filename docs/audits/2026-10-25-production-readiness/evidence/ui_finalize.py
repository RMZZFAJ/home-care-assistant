from pathlib import Path
import json,csv,re
base=Path('docs/audits/2026-10-25-production-readiness');ev=base/'evidence'
findings=json.loads((ev/'findings-ui.json').read_text(encoding='utf-8-sig'))
runtime=json.loads((ev/'ui-runtime.json').read_text())
ready=json.loads((ev/'ui-runtime-ready.json').read_text())
details={
 'UX-001':('Confirmado em Chromium local como adminA: proposta 07h–19h para 08h–20h em10/11/2026; lista só mostra motivo; diálogo1440/390px não exibe pessoa/data/horas. Nenhuma decisão foi aplicada pelo navegador.','ui-scale-review-390.png'),
 'UX-002':('Confirmado em Chromium390x844 como family: POST mode=app_visible, expectedVersion=1; cabeçalho top217.5/bottom819.5; título dos materiais top858.5, fora do viewport. RPC subsequente confirma ciência family/app_visible.','ui-science-top-390.png'),
 'UX-003':('Confirmado em Chromium390px: POST de foto sintética recebeu201 no servidor e a resposta foi abortada no navegador; input permanece habilitado e botão Enviar anexo, com Failed to fetch. A troca de arquivo e segundo envio não foram executados; risco de conflito permanece apoiado no fluxo estático.','ui-attachment-lost-response.png'),
 'UX-004':('Confirmado em /consumo390px com GET retido e depois500 sintético: Nenhum relato registrado aparece pendente e junto da falha. Flows/sino continuam evidência estática, sem ampliar indevidamente a reprodução.','ui-consumption-error-390.png'),
 'UX-012':('Confirmado em Chromium390px: política efetiva shareWaitSeconds=3 lida da API; consulta de avisos interceptada com200/data[]; mensagem de estado concluído permanece após4s e é sobrescrita após~10s por avisos continuam sendo processados. Não simula entrega de provedor.','ui-document-deadline-390.png')
}
for f in findings:
 if f['id'] in details:
  desc,png=details[f['id']]
  f['confidence']='CONFIRMED'
  f['reproduction']=desc+' Reprodutores: evidence/ui-runtime.mjs e evidence/ui-runtime-ready.mjs; somente stack local verificada.'
  f['evidence']+=['docs/audits/2026-10-25-production-readiness/evidence/'+png,'docs/audits/2026-10-25-production-readiness/evidence/'+('ui-runtime-ready.json' if f['id']=='UX-012' else 'ui-runtime.json')]
  f['countercheck']+=' Runtime: '+desc
 if f['id']=='UX-002': f['countercheck_result']='CONFIRMED_AFTER_CHALLENGE'
 if f['id']=='UX-005': f['dependencies'].append('BE-005 cobre UUID novo no retry; causa distinta da compreensão visual.')
 for key in ['reproduction','summary','observed','expected','countercheck','human_impact']:
  if isinstance(f.get(key),str): f[key]=re.sub(r'\b(em|a|até|de|com|Etapa|E2E)(?=\d)',r'\1 ',f[key])
(ev/'findings-ui.json').write_text(json.dumps(findings,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
# Minimize captured document-wide text after immediate Escape sampling.
ready['dialogKeyboard']['focusAfterEscape']={'observation':'Amostra imediata produziu texto da página inteira; restauração após animação não foi medida.','aria':None,'conclusion':'NOT_VERIFIED'}
ready['initial_capture_limit']='Primeira rodada esperou h1 e parte das imagens registrou loading. Estas14 capturas ready aguardaram .hca-dashboard com conteúdo.'
(ev/'ui-runtime-ready.json').write_text(json.dumps(ready,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
# Trim irrelevant synthetic option lists from text evidence; retain inspected content.
for c in runtime['cases']:
 for key in ['listText','pendingText','failedText','visible']:
  if isinstance(c.get(key),str) and 'HOMOLOGAÇÃO FICTÍCIA V4' in c[key]:
   c[key]=c[key][c[key].index('HOMOLOGAÇÃO FICTÍCIA V4'):]
(ev/'ui-runtime.json').write_text(json.dumps(runtime,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
paths={
 'src/app/page.tsx','src/app/layout.tsx','src/app/login/page.tsx','src/app/escalas/page.tsx','src/app/consumo/page.tsx','src/app/documentos/[id]/page.tsx','src/app/globals.css','src/app/design-system.css','src/theme/providers.tsx','src/theme/tokens.css',
 'src/components/dashboard.tsx','src/components/dashboard/management-dashboard.tsx','src/components/dashboard/operations-dashboard.tsx','src/components/dashboard/global-dashboard.tsx','src/components/dashboard/task-list.tsx','src/components/dashboard/metric-card.tsx','src/components/dashboard/dashboard-summary.tsx',
 'src/components/layout/workspace-shell.tsx','src/components/layout/workspace-context.tsx','src/components/navigation/workspace-navigation.tsx','src/components/auth/login-form.tsx','src/components/authenticated-page.tsx','src/components/app-shell.tsx','src/components/ui/primitives.tsx','src/components/workspace.tsx',
 'src/components/schedules/schedule-console.tsx','src/components/requisitions/requisition-detail.tsx','src/components/documents/document-header.tsx','src/components/documents/document-viewer.tsx','src/components/documents/document-actions.tsx','src/components/documents/attachments.tsx','src/components/stock/consumption-console.tsx','src/components/stock/flow-reviews.tsx','src/components/documents/supply-detail.tsx','src/components/documents/supply-line-summary.tsx'
}
rows=list(csv.DictReader((ev/'coverage-ui.csv').open(encoding='utf-8-sig')))
for r in rows:
 if r['path'] in paths:
  r.update(runtime_checked='YES',visual_checked='YES',evidence=r['evidence']+'; evidence/ui-runtime.json; evidence/ui-runtime-ready.json; evidence/UI_RUNTIME_REVIEW.md',limitations='Runtime/visual por cenário descrito no relatório; não equivale a todos os estados do arquivo. Chromium local, sem aparelho físico.',notes=r['notes']+' Inspeção atual em27/10: dashboards6perfis, escala/ciência/anexo/consumo e ENT parcial; ver mapa de alcance.')
 else:
  r['limitations']=r['limitations'].replace('runtime e visual atuais aguardam origem local segura.','runtime/visual deste arquivo não exercitados na exploração dirigida.')
with (ev/'coverage-ui.csv').open('w',newline='',encoding='utf-8') as file:
 w=csv.DictWriter(file,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
p=base/'UI_UX_DESIGN_SYSTEM.md';t=p.read_text()
start=t.index('A exploração renderizada atual está pendente')
end=t.index('\n## Fundação',start)
t=t[:start]+'''A exploração local ocorreu em27/10/2026 no Chromium, com Auth e dados
sintéticos reais, origem127.0.0.1:3100 verificada e envio externo desativado.
Confirmou UX-001/002/003/004/012 e mediu14 dashboards prontos de6perfis.
Não houve overflow horizontal nesses dashboards, nas larguras examinadas.
Isso não declara contraste AA, foco perfeito ou todos os módulos verificados.
Detalhes e limites: [registro renderizado](evidence/UI_RUNTIME_REVIEW.md).
'''+t[end:]
t=t.replace('Estado atual: Pendente','Estado atual: Dashboards medidos; outros módulos/rodapés pendentes.',1)
t=t.replace('Estado atual: Leitura completa; runtime pendente','Estado atual: Dashboard renderizado; demais percursos na matriz E2E.',2)
t=t.replace('Estado atual: Defeito estático UX-004; injeção pendente','Estado atual: UX-004 reproduzido em consumo com delay e500.')
t=t.replace('Estado atual: Padrão examinado; sequência atual pendente','Estado atual: Tab contido e Escape fecha diálogo de escala; retorno de foco\n  após animação não medido.')
t=t.replace('Estado atual: Pendente','Estado atual: ENT14linhas e114pacientes globais vistos; matriz densa pendente.',1)
t=t.replace('Estado atual: Código lido; hardware real não verificado','Estado atual: Resposta perdida de upload reproduzida; câmera real não verificada.')
t=t.replace('Tipo: Defeito estático','Tipo: Defeito confirmado em runtime')
p.write_text(t,encoding='utf-8')
p=base/'JOURNEYS_AND_INFORMATION_ARCHITECTURE.md';t=p.read_text().replace('exploração atual pendente de origem\nlocal segura.','exploração dirigida executada na origem local verificada\ncom dados sintéticos (27/10/2026).')
t=t.replace('## Roteiro exploratório reproduzível','## Roteiro exploratório e execução')
t+='''\nA execução confirmou os cenários2–5 e gerou o PDF atual do passo7.
O passo6 cobriu dashboards de6perfis, cinco larguras para admin/profissional
e teclado do diálogo de escala; não todos os formulários. Capturas prontas
aguardam o dashboard carregado. Detalhes:
[UI_RUNTIME_REVIEW](evidence/UI_RUNTIME_REVIEW.md).
'''
p.write_text(t,encoding='utf-8')
p=base/'PRODUCT_GAPS_AND_CONFIGURATION.md';t=p.read_text().replace('da frente UI; runtime atual pendente.','da frente UI; runtime dirigido realizado em27/10/2026.')
t+='''\nA rodada atual confirmou decisões sem resumo, ciência por cabeçalho, recuperação
de upload, vazio precoce e acompanhamento fixo. São evidências locais;
não substituem homologação externa ou validação com cuidadores reais.
Ver [registro de execução](evidence/UI_RUNTIME_REVIEW.md).
'''
p.write_text(t,encoding='utf-8')
p=base/'MICROCOPY_TERMINOLOGY_AND_FORMS.md';t=p.read_text()
t+='''\nA inspeção atual confirmou na tela o texto genérico de aprovação, ciência
automática com materiais fora do viewport, “Failed to fetch” no upload e
mensagem de vazio simultânea ao erro. A frase do acompanhamento também regrediu
após o prazo fixo. Capturas e circunstâncias estão em
[UI_RUNTIME_REVIEW](evidence/UI_RUNTIME_REVIEW.md).
'''
p.write_text(t,encoding='utf-8')
print(json.dumps({'findings':len(findings),'runtime_files':sum(r['runtime_checked']=='YES' for r in rows),'geometry_all_equal':all(x['geometry']['viewport']==x['geometry']['documentWidth'] for x in ready['captures'])}))

