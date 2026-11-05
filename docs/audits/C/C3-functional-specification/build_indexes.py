"""Derived C3 indexes and approved-capability acceptance; no runtime actions."""
from pathlib import Path
import csv
import json
import runpy

BASE=Path(__file__).resolve().parent.parent
OUT=Path(__file__).resolve().parent
# Audit directories contain hyphens, so load the shared parser by file path.
# run_path leaves the formatter's guarded __main__ routine unexecuted.
parse_tables=runpy.run_path(str(BASE/'C6-acceptance-handoff/format_documentation.py'))['parse_tables']

def read(path):
    with path.open(encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))
def write(path,rows):
    with path.open('w',encoding='utf-8',newline='') as f:
        w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)

# Field order is the order in each authored table. Scope is explicit, rather
# than assigning a private support field to every public screen in its domain.
scopes={
 'REQ':['01,02,03','01,02','01,02','01,02','01,02','01,02','01,02','01,02','01,02','05','03','04','01,02,03,04'],
 'COM':['01,02','01,02','01,02','01,02','02','02','03','03','03','03','01,02','04','04','04'],
 'ENT':['01,03','01,03','01,03','01','01,06','01','03','04','04','04','03','05','05','05','06'],
 'BAL':['01','01','01','01','02,03','02','03','01,02,03','02,03','03','05','04','01,04,05'],
 'SCHEDULES_AND_STAFFING':['02','02','02','02,04','01,02,03,04','02','01,02','02','02','02','02,04','04','02,03,04','03'],
 'STOCK_AND_CUSTODY':['01','02,04','02','02,04','02','02,04','02','02','04','04','03'],
 'CATALOGUE_AND_PRESENTATIONS':['01','01','01,02','02','01','01','01','01','03','03,05','03','05','04','01,04'],
 'CONSUMPTION_AND_OCCURRENCES':['02','02','02','02,03','02,03','03','03,04','04','04','01'],
 'IDENTITY_ACCESS_MEMBERSHIPS':['01,03,04','02','01,02','02','02','02','02','02','04','04','03','04','02','04','02'],
 'ATTACHMENTS_AND_DRAFTS':['ARQ-01','ARQ-01','ARQ-01,ARQ-02','ARQ-01,ARQ-02','ARQ-01','RAS-01','RAS-01','RAS-01','RAS-01','RAS-01','RAS-02'],
 'PWA_PUSH_AND_NOTIFICATIONS':['03','03','03','03','02','02','02','02','03','02','05','01'],
 'DOCUMENTS_PDFS_AND_INTEGRITY':['01,02,03,04','02,03,04','02,03','02,03','02,03','02,03','05','03,04','03,04','05'],
 'ADMINISTRATIVE_OPERATIONS':['01,02,03','02','02','01,02,03','01,02,05','01,02,05','01,02,05','04','03,04','04','03','05','05'],
 'USER_GUIDES_AND_CONTINUITY':['03','03','03','03','03','03','03','04','02,04'],
}
prefix={'SCHEDULES_AND_STAFFING':'ESC','STOCK_AND_CUSTODY':'EST','CATALOGUE_AND_PRESENTATIONS':'CAT','CONSUMPTION_AND_OCCURRENCES':'CON','IDENTITY_ACCESS_MEMBERSHIPS':'ID','PWA_PUSH_AND_NOTIFICATIONS':'NOT','DOCUMENTS_PDFS_AND_INTEGRITY':'DOC','ADMINISTRATIVE_OPERATIONS':'ADM','USER_GUIDES_AND_CONTINUITY':'GUI'}
index=[]
for domain,allocation in scopes.items():
    path=OUT/(domain+'.md');fields=[];screens=[]
    for headers,records in parse_tables(path.read_text(encoding='utf-8')):
        if headers[0]=='Tela':screens.extend(records)
        if headers[0]=='Campo':fields.extend(records)
    assert len(fields)==len(allocation),(domain,len(fields),len(allocation))
    for number,cells in screens:
        assert len(cells)==3,(path,number,cells)
        index.append({'record_type':'SCREEN_ACTIONS','domain':domain,'screen_scope':cells[0],'route_or_surface':cells[1],'field_label':'','type_source':'','required_default':'','validation_unit':'','help_example':'','actions_outcome':cells[2],'state_policy':'UI_STATES_AND_MICROCOPY.md; domain exceptions','authorization':'PERSONAS_PERMISSIONS_AND_ACTORS.md; domain actor','source_spec':f'docs/audits/C/C3-functional-specification/{domain}.md','source_line':number,'status':'PLANNED_NOT_IMPLEMENTED'})
    for ordinal,(number,cells) in enumerate(fields):
        assert len(cells)==5,(path,number,cells)
        p=prefix.get(domain,domain)
        scope=allocation[ordinal]
        if domain!='ATTACHMENTS_AND_DRAFTS':scope=','.join(p+'-'+s for s in scope.split(','))
        index.append({'record_type':'FIELD','domain':domain,'screen_scope':scope,'route_or_surface':'see SCREEN_ACTIONS rows','field_label':cells[0],'type_source':cells[1],'required_default':cells[2],'validation_unit':cells[3],'help_example':cells[4],'actions_outcome':'Domain transitions; confirm only after authority/version revalidation','state_policy':'UI_STATES_AND_MICROCOPY.md; domain exceptions','authorization':'PERSONAS_PERMISSIONS_AND_ACTORS.md; domain actor','source_spec':f'docs/audits/C/C3-functional-specification/{domain}.md','source_line':number,'status':'PLANNED_NOT_IMPLEMENTED'})
write(OUT/'SCREEN_FIELD_ACTION_INVENTORY.csv',index)

# New approved purposes are requirements, not new audit findings or causes.
capabilities=[
('PWA instalável','DEC-001','PWA_PUSH_AND_NOTIFICATIONS','D5','P10','Manifesto, ícones, worker e atualização segura; cache público apenas','Instalar em aparelho elegível e manter edição ao atualizar; navegador sem capacidade mantém web completo','Instalação indisponível não simula suporte; atualização não perde rascunho'),
('Web Push por aparelho','DEC-001;DEC-020','PWA_PUSH_AND_NOTIFICATIONS','D5','P10;P13','Subscription privada, consentimento, dedup e eventos internos','Dois aparelhos recebem só avisos autorizados; expiração/revoke preservam pendência interna','Conta B não recebe conteúdo de A após logout; push não registra ciência'),
('Ciência por modalidade e acesso independente','DEC-002','REQ','D2','P02','Regra/preferência versionada na emissão e trilha de acesso','Manual, condicionada e tácita geram origem correta; abertura real tem ator/instante próprios','Cancelar diálogo não registra ciência; tácita não cria leitura/acesso/aceite'),
('Observação REQ com três modos','DEC-003','REQ','D2','','DTO tagged e snapshot/PDF preservam unfilled/unknown/observed','Vazio, desconhecido e zero explícito sobrevivem ao save/emitir/PDF','Apagar7 não vira0; saldo calculado não preenche contagem'),
('Concluir COM inferior','DEC-004;O02','COM','D2','P14','Evento de dispensa da expectativa e projeção por parcela','COM10 com2validados dispensa8 e mantém saldo2','Parcela pendente não vira validada; dispensa não cria movimento físico'),
('Retirar e recusar cancelamento ENT','DEC-005;O03','ENT','D2','','Comandos versionados por solicitação e estado anterior','Solicitante retira ou recebedor recusa; pedido termina com motivo','Decisões opostas concorrentes não estornam ou aparentam dois sucessos'),
('Sucessão sem bloquear revogação','DEC-006;DEC-022;O07','IDENTITY_ACCESS_MEMBERSHIPS','D2','P15','Inventário e nova designação; exceção administrativa distinta','Revogar parcial imediatamente, manter autores e encaminhar tarefa futura','Substituto/admin não assina aceite passado; outro paciente não perde vínculo'),
('Inativação com saldo','DEC-007;O12','STOCK_AND_CUSTODY','D2','','Estado local sem movimento e recuperação na mesma custódia','Saldo4 permanece4 inativo na família/equipe e reativa no mesmo local','Inativar não zera nem transfere unilateralmente saldo'),
('Transferência bilateral simples','DEC-007','STOCK_AND_CUSTODY','D2','P06;P07','Reuso proposto ENT com declaração/contrassinatura/aceite distintos','Qualquer lado autorizado inicia; contraparte confirma e efetivo recebedor aceita o físico','Contraparte que não recebeu não gera aceite pessoal de terceiro'),
('Complemento de consumo no app','DEC-008;DEC-030;O05','CONSUMPTION_AND_OCCURRENCES','D2','','Complemento autoral/versionado e confirmação posterior','Texto sem linhas recebe complemento e confirmação única; original preservado','Texto sozinho e falta não debitam; oposto/NULL não são sucesso'),
('Propostas obsoletas termináveis','DEC-009','SCHEDULES_AND_STAFFING','D1','','Versão/target vigente e evento terminal de obsolescência','Corte de série e alvo BAL alterado impedem aprovação antiga e permitem encerramento justificado','Nenhuma republicação após corte ou mudança silenciosa de prazo'),
('Novo reconto por substituta','DEC-010;DEC-029','BAL','D2','','Nova atribuição e nova autoria de contagem','Sheila faz novo reconto designado; Juliana continua autora anterior','Aprovação velha não aprova nova contagem; não há assinatura herdada'),
('Anexo retomável e abandono seguro','DEC-011;O13','ATTACHMENTS_AND_DRAFTS','D4','P08','Reserva/fingerprint/lease/finalize e abandono auditável','Ready após resposta perdida recupera mesma identidade; abandono comprovado libera capacidade','Abandonar não apaga upload ativo/ready/original protegido'),
('Rascunho entre dias e aparelhos','DEC-012','ATTACHMENTS_AND_DRAFTS','D3','P12','Draft servidor versionado por usuário/paciente/intenção','Salvar emA e retomar emB amanhã com etapa; conflito permite comparar','Descartar draft não remove documento; decisão obsoleta não é aplicada'),
('Resumo por consequência','DEC-013;O06','ADMINISTRATIVE_OPERATIONS','D1','','Presenter tipado com versão e antes/depois por domínio','Pessoa explica pessoa/objeto/consequência/seguinte antes de aprovar escala e demais atos críticos','JSON bruto e confirmação sem versão/efeito não satisfazem aceite'),
('Pendências completas e frescor','DEC-014;O04;O15','ADMINISTRATIVE_OPERATIONS','D3','','Busca/cursor/detalhe e invalidação por produtor/consumidor','Item antigo fora50/100 é alcançável; duas sessões atualizam sem reload/perda de edição','Filtro novo não usa linha antiga; erro não mostra em dia'),
('Histórico humano por versão','DEC-015;O14','DOCUMENTS_PDFS_AND_INTEGRITY','D4','','Diff e ator histórico derivados de eventos/snapshots','Rename não altera autor passado; versão antiga tem download acionável','Nome/data atuais não preenchem fato histórico desconhecido'),
('PDF completo e legível','DEC-016','DOCUMENTS_PDFS_AND_INTEGRITY','D4','P10','Renderer versionado, fatos por tipo, quebra de células e alternativa acessível','Campos materiais e marcador final visíveis/extraíveis; impressão/AT aceitos','Mutante sem texto reprova mesmo com páginas/metadata/QR'),
('Original e derivado qualificados','DEC-017','ATTACHMENTS_AND_DRAFTS','D4','P08','Custódia restrita/transformação/hash por classe','Anotação passiva relevante preservada em derivado ou recusa informada','Sanitização não elimina ressalva silenciosamente nem reativa conteúdo ativo'),
('Verificador de bytes PDF','DEC-018','DOCUMENTS_PDFS_AND_INTEGRITY','D4','P09','Registro final confiável, digest SHA256 e comparação de exemplar','Arquivo original coincide; editado com QR copiado diverge','QR só não aprova exemplar; sem referência não significa falso'),
('Escala eficiente e recorrente','DEC-001;O06','SCHEDULES_AND_STAFFING','D2','P06','Prévia multi-dia, horários/fuso/exceções e corte versionado','Selecionar12dias em45dias, recorrência e19–07 preservam pessoa/instantes','Horário local ambíguo exige decisão; escala não prova presença'),
('Embalagem e proveniência','O08','CATALOGUE_AND_PRESENTATIONS','D2','','Snapshot de código/fator/embalagens e unidade base','2pacotes×10 permanecem20 depois de fator12; consulta/edição de apresentação disponível','NaN/Infinity/unidade incompatível recusados; scan não cria autoridade'),
('Origem de movimentos navegável','O09','STOCK_AND_CUSTODY','D3','','Resolver reference_type/id com readmodel autorizado','Abrir receipt/BAL/consumo/documento exatos a partir do movimento','Link não revela COM/saldo familiar ao profissional sem capacidade'),
('Seleções recorrentes','O16','CATALOGUE_AND_PRESENTATIONS','D3','','Lista local de IDs de materiais e versão','Reusar seleção com catálogo atual e escolhas preservadas','Não copiar estoque observado, urgência ou autorização de emissão anterior'),
('Duplicatas sem apagar identidade','O20','CATALOGUE_AND_PRESENTATIONS','D2','','Alias/sucessor de seleção e inativação com trilha','Identidades antigas e saldos permanecem separados e consultáveis','Resolver duplicata não faz merge/baixa fictícia nem muda unidade histórica'),
('Monitoramento e recuperação','DEC-024;DEC-025','USER_GUIDES_AND_CONTINUITY','D6','P03;P04;P05;P08;P13','Sinais de progresso e restore conjunto em quarentena','Restaurar login/RLS/ledger/bytes/hashes/config/jobs em destino isolado e medir RPO/RTO','Zero envio antes do aceite; dump/TOC sozinho não prova restore'),
('Guias e primeira residência','DEC-026;O01;O19','USER_GUIDES_AND_CONTINUITY','D6','P05;P10;P11','Guias por público, capturas pósD e conciliação de contingência','Usuários concluem ciclo e recuperam contingência sem duplicar movimento','Fotografia/papel não vira aceite por terceiro ou fixture em operação'),
('Necessidade remanescente vinculada','DEC-030;O11','REQ','D2','','Nova necessidade ligada com motivo e história de atendimento','Após aceite parcial, emissor registra nova necessidade justificada ligada à anterior','Não cria quantidade solicitada obrigatória nem crédito físico duplicado'),
]
plans=[];ac_path=BASE/'C6-acceptance-handoff/ACCEPTANCE_CRITERIA_MASTER.csv'
accept=[r for r in read(ac_path) if r['cause_id'].startswith('C-CAUSE-')]
for n,(title,decisions,domain,package,pending,model,positive,negative) in enumerate(capabilities,1):
    if n in {13,19,26}:decisions+=';DEC-023'
    cap=f'C-CAP-{n:03d}'
    spec=f'docs/audits/C/C3-functional-specification/{domain}.md'
    plans.append({'capability_id':cap,'purpose':title,'decision_refs':decisions,'scope_status':'OWNER_APPROVED_PURPOSE;TECHNICAL_DESIGN_PROPOSED','specification':spec,'planned_package':package,'pending_details':pending,'planned_contract':model,'implementation_status':'NOT_STARTED_PHASE_D','acceptance_id':cap.replace('C-CAP','C-NEW-AC')})
    accept.append(dict(zip(list(accept[0]),[cap.replace('C-CAP','C-NEW-AC'),cap,'NEW_OWNER_REQUIREMENT',decisions,package,'FIRST_RELEASE_REQUIRED_CONDITIONAL_DETAILS',positive,negative,'Reuse relevant C-CAUSE checks; add discriminating cases','New capability is not implemented; no acceptance claimed','API+AUTH_RPC+BROWSER; HUMAN/PHYSICAL where domain requires','Read-back independente de ator/paciente/versão/evento/ledger/bytes; recusa sem efeito','P10; domain task comprehension','P10; actual device/AT/print where pertinent','Separate authorized homology; no real sending in C',pending,'PLANNED_NOT_EXECUTED_C'])))
write(BASE/'C4-technical-design/APPROVED_CAPABILITY_CHANGE_PLAN.csv',plans)
write(ac_path,accept)
register=read(BASE/'C2-decisions/DECISIONS_REGISTER.csv')
causes=read(BASE/'C1-consolidation/CAUSE_FAMILIES_MASTER.csv')
trace=[]
for decision in register:
    key=decision['decision_id']
    caps=[r for r in plans if key in r['decision_refs'].split(';') or key in r['pending_details'].split(';')]
    if key=='DEC-027':caps=[r for r in plans if any(v.startswith('O') for v in r['decision_refs'].split(';'))]
    related=[r for r in causes if key in r['decision_refs'].split(';')]
    specs=sorted({r['specification'] for r in caps+related})
    if key=='O10':specs=['docs/audits/C/C3-functional-specification/COM.md','docs/audits/C/C3-functional-specification/ENT.md']
    if key=='O17':specs=['docs/audits/C/C3-functional-specification/CATALOGUE_AND_PRESENTATIONS.md']
    if key=='O18':specs=['docs/audits/C/C3-functional-specification/ADMINISTRATIVE_OPERATIONS.md']
    if not specs:specs=['docs/audits/C/C3-functional-specification/README.md']
    trace.append({'decision_id':key,'status':decision['status'],'capabilities':';'.join(r['capability_id'] for r in caps),'causes':';'.join(r['cause_id'] for r in related),'specifications':';'.join(specs),'condition':'See HUMAN_DECISIONS_REVIEW.md' if key.startswith('P') else 'O10 existing; O17/O18 deferred; DEC019 Meta deferred; no implicit activation','implementation':'PLANNED_NOT_IMPLEMENTED'})
write(BASE/'C2-decisions/DECISION_SPECIFICATION_CROSSWALK.csv',trace)
summary={'screens':sum(r['record_type']=='SCREEN_ACTIONS' for r in index),'fields':sum(r['record_type']=='FIELD' for r in index),'domains':len(scopes),'new_approved_purposes':len(plans),'cause_acceptances':len(accept)-len(plans),'new_capability_acceptances':len(plans),'decision_records_traced':len(trace)}
(OUT/'inventory-summary.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8')
print(json.dumps(summary,indent=2))
