/* Documentary generator; no DB access. Rebuilds only explicitly authored matrices. */
import {readFileSync,writeFileSync} from 'node:fs';
const out=new URL('./',import.meta.url),base=new URL('../',import.meta.url),read=f=>JSON.parse(readFileSync(new URL(f,out)));
const csv=(f,rows)=>{const hs=[...new Set(rows.flatMap(Object.keys))],q=v=>'"'+String(v==null?'':typeof v==='object'?JSON.stringify(v):v).replaceAll('"','""')+'"';writeFileSync(new URL(f,base),[hs.map(q).join(','),...rows.map(r=>hs.map(h=>q(r[h])).join(','))].join('\n')+'\n');};
const c=read('catalog.json'),r=read('b33-results.json'),supp=read('b33s-results.json'),auth=[];
for(const row of r.scenarios.find(s=>s.id==='B33-02').observed)for(const [cap,enabled]of Object.entries(row.capabilities))auth.push({identity:row.actor,patient:'A',membership:'ACTIVE',capability:cap,object:'public.patient_capabilities',operation:'EXECUTE/read effective capability',expected:'DEFAULT_ROLE_RULE',observed:enabled,method:'LOCAL_EXECUTED_CAPABILITY_READ',scenario:'B33-02',evidence:'evidence/b33-results.json',limits:'Ler capacidade não executa cada comando desse domínio'});
for(const g of c.grants.filter(x=>['public','private'].includes(x.schema)))for(const [op,key]of [['SELECT','select_priv'],['INSERT','insert_priv'],['UPDATE','update_priv'],['DELETE','delete_priv'],['TRUNCATE','truncate_priv']])auth.push({identity:g.role,patient:'ANY',membership:'ROLE_GRANT_ONLY',capability:'RLS_ADDITIONAL_WHEN_GRANTED',object:g.schema+'.'+g.relation,operation:op,expected:'SEE_DOMAIN_POLICY',observed:g[key]?'GRANT_PRESENT':'GRANT_ABSENT',method:'METADATA_EFFECTIVE_GRANT',scenario:'B3.3-catalog',evidence:'evidence/catalog.json',limits:'Column grants may allow a subset of SELECT even when table grant absent; see column-and-schema-grants.json'});
for(const x of supp.scenarios.find(s=>s.id==='B33-11').observed.rows)auth.push({identity:'admin(Auth real)',patient:'A',membership:'ACTIVE',capability:'NONE_FOR_DIRECT_DML',object:'public.'+x.table,operation:x.operation,expected:'DENY',observed:x.sqlstate,method:'LOCAL_EXECUTED_HTTP',scenario:'B33-11',evidence:'evidence/b33s-results.json',limits:'DML recusado antes de atingir qualquer linha'});
for(const s of [...r.scenarios,...supp.scenarios,...read('b33i-results.json').scenarios].filter(s=>!['B33-02','B33-11'].includes(s.id)))auth.push({identity:s.id==='B33-05'?'anon':s.id==='B33-07'?'shared/revoked':s.id==='B33-09'?'global without local membership':s.id==='B33-14'?'invited before acceptance':'SEE_RESULT_ACTOR',patient:'A/B as identified',membership:'SEE_RESULT',capability:'SEE_SCENARIO',object:s.purpose,operation:'NEGATIVE_AND_CONTROL',expected:'RESTRICT_TO_CURRENT_AUTHORITY',observed:s.observed,method:s.execution,scenario:s.id,evidence:s.id==='B33-14'?'evidence/b33i-results.json':Number(s.id.slice(-2))>10?'evidence/b33s-results.json':'evidence/b33-results.json',limits:'Escopo e resultado específicos; não aprovação universal'});
csv('03_AUTHORIZATION_MATRIX.csv',auth);
const invariants=[
 ['AUTH01','Identidade global não concede operação local','profiles;memberships;authority_sessions','recipient_role;is_global_administrator','B33-09','LOCAL_EXECUTED'],
 ['AUTH02','Sessão real e contexto explícito','auth.sessions;authority_sessions','auth_session;has_patient_authority','B33-01;B33-08','LOCAL_EXECUTED'],
 ['AUTH03','Metadata não é autorização','profiles;capability_overrides','member_can','B33-04','LOCAL_EXECUTED'],
 ['AUTH04','Revogação preserva outro vínculo','care_recipient_memberships','admin_set_membership_status','B33-07','LOCAL_EXECUTED_NOT_INFLIGHT'],
 ['AUTH05','DML direto não é entrada de domínio','all public/private tables','grants;RLS','B33-11','LOCAL_EXECUTED_PUBLIC_DML'],
 ['CAT01','Catálogo canônico pertence ao paciente','care_recipient_products','composite FK;guard_patient_product_owner','B3.1','STATIC_REVIEW'],
 ['CAT02','Unidade histórica não pode ser reinterpretada','care_recipient_products','guard_catalogue_unit','B3.1','STATIC_REVIEW'],
 ['REQ01','REQ não possui quantidade solicitada','requisitions;requisition_items','submit_requisition;check:contracts','B3.1','STATIC_REVIEW'],
 ['REQ02','Pai determina paciente do item','requisition_items;stock_inventory_items','derive_item_patient;composite FK','B3.1','STATIC_REVIEW'],
 ['REQ03','Ciência não é aceite/atendimento','requisition_lifecycle;requisition_science_events','record_science;refresh_requisition_lifecycle','B3.6','PENDING'],
 ['DOC01','Versão e evento são únicos por documento','document_events','UNIQUE(document_id,version)','B3.1','METADATA'],
 ['DOC02','Snapshot/hash são calculados no banco','operational_documents;document_events','record_document_event','B3.6','PENDING'],
 ['DOC03','Linha não aponta cabeçalho de outro paciente','document_lines','FK(document_id,care_recipient_id)','B3.1','METADATA'],
 ['STK01','Saldo é soma do ledger por custódia','stock_movements;current_stock_balances','stock_quantity;stock_overview','B3.5','PENDING'],
 ['STK02','Saída não pode criar saldo negativo','stock_movements','guard_stock_movement_balance','B3.5','PENDING'],
 ['STK03','Expedição não duplica disponibilidade','stock_movements;document_lines','create_supply_document;supply_document_command','B3.5','PENDING'],
 ['STK04','Quantidades têm unidade/precisão/finitude','document_lines;stock_movements','entrypoint quantity guards','B3.5','PENDING'],
 ['STK05','Correção conserva referência ao fato original','stock_movements','family_stock_movement','B2-005','HISTORICAL_DEFECT_PENDING_B3'],
 ['BAL01','Contagem só afeta estoque de equipe','operational_documents;stock_movements','apply_bal','B3.7','PENDING'],
 ['BAL02','Reconto não herda aprovação anterior','bal_approvals','PK(document_id,count_version,group)','B3.7','METADATA_RUNTIME_PENDING'],
 ['BAL03','Contador e revisor distintos quando exigido','bal_approvals;bal_assignments','supply_document_command','B2-009','HISTORICAL_DEFECT_PENDING_B3'],
 ['BAL04','Um ciclo aberto e atribuição ativa por paciente','bal_cycles;bal_assignments','partial UNIQUE indexes','B3.1','METADATA'],
 ['SCH01','Profissional publicado não sobrepõe pacientes','scheduled_shifts','GiST exclusion [start,end)','B3.7','METADATA_RUNTIME_PENDING'],
 ['SCH02','Corte de série permanece após decisão','shift_series;scheduled_shifts','schedule_command','B2-013','HISTORICAL_DEFECT_PENDING_B3'],
 ['TX01','Retry mesma intenção não duplica efeito','document_events;private.*_commands','keys;advisory locks;expected version','B3.8','PENDING'],
 ['JOB01','Trabalho terminal não bloqueia outros pacientes','requisition_lifecycle','v4_lifecycle_schedule','A DB-002','HISTORICAL_DEFECT_PENDING_B3'],
 ['JOB02','BAL rotaciona lote limitado','bal_regimes;bal_scheduler_progress','run_operational_schedule','B3.9','STATIC_REVIEW_RUNTIME_PENDING'],
 ['ATT01','Metadado ready corresponde a bytes validados','attachments;storage.objects','reserve/finalize/bind attachment','B3.10','PENDING'],
 ['ATT02','Abandono não esgota permanentemente vagas','attachments','reserve_attachment','B2-016','HISTORICAL_DEFECT_PENDING_B3'],
 ['READ01','Pendência antiga continua alcançável','consumption_reports;audit_events','read model pagination','B2-017;A BE-004','HISTORICAL_DEFECT_PENDING_B3'],
 ['OPS01','Backup legível não é restore integral','Auth;Storage;DB;Vault;cron','backup/restore chain','B3.0','NOT_VERIFIED_FULL_RESTORE']
];
csv('01_DATA_INVARIANTS_CATALOG.csv',invariants.map(([id,invariant,objects,enforcement,evidence_id,status])=>({id,invariant,objects,enforcement,evidence_id,status,limits:'Consultar relatório do domínio para recorte, contraditório e prova; sem certificação de produção'})));
console.log(JSON.stringify({authorizationRows:auth.length,invariants:invariants.length}));
