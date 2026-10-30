/* Documentary only. Reconstructs invariant/transition matrices from authored rules. */
import {readFileSync,writeFileSync} from 'node:fs';
const out=new URL('./',import.meta.url),base=new URL('../',import.meta.url),read=f=>JSON.parse(readFileSync(new URL(f,out))),q=v=>'"'+String(v==null?'':typeof v==='object'?JSON.stringify(v):v).replaceAll('"','""')+'"',csv=(f,rows)=>{const hs=[...new Set(rows.flatMap(Object.keys))];writeFileSync(new URL(f,base),[hs.map(q).join(','),...rows.map(r=>hs.map(h=>q(r[h])).join(','))].join('\n')+'\n');};
const b35=read('b35-results.json');
const stockRules=[
 ['ST01','Entrada avulsa',null,'FAMILY','+10 total','B35-01','Entrada externa motivada; ledger imutável'],
 ['ST02','Expedição ENT','FAMILY','TRANSIT','0 total','B35-01','Material não fica disponível nas duas custódias'],
 ['ST03','Aceite parcial','TRANSIT','CARE_TEAM','0 total','B35-02','Crédito somente na quantidade aceita; chave repetida recupera'],
 ['ST04','Devolução de divergência','TRANSIT','FAMILY','0 total','B35-03','Só o remanescente ligado à linha'],
 ['ST05','Perda confirmada','TRANSIT',null,'-1 total','B35-03','Evento e motivo preservados; não é consumo'],
 ['ST06','Relato de consumo',null,null,'0 total','B35-04','Relatar não debita'],
 ['ST07','Confirmação de consumo','CARE_TEAM',null,'-1 total','B35-04','Uma decisão e um débito'],
 ['ST08','Retorno ENT','CARE_TEAM','FAMILY via TRANSIT','0 total','B35-05','Destinatário familiar aceita fato físico novo'],
 ['ST09','COM/recebimento validado',null,'FAMILY','+2 total','B35-06','Aquisição/relato de chegada não creditam'],
 ['ST10','Quantidade inválida',null,null,'0 total','B35-07','Zero/negativa/não finita/teto recusados'],
 ['ST11','Saída/precisão inválida','FAMILY',null,'0 total','B35-08','Rollback; nenhuma quantidade inválida comum aceita'],
 ['ST12','Quantidade além da escala',null,'FAMILY','1.0000004 comandado;1.000000 persistido','B35-09','DEFEITO_NOVO coerção anterior ao trigger'],
 ['ST13','Apresentação NaN',null,null,'0 ledger; fator NaN persistido','B35-10','DEFEITO_NOVO de conversão; sem NaN de ledger comprovado'],
 ['ST14','Correção sem origem',null,'FAMILY','+1 total sem referência','B35-11','DEFEITO_HERDADO_B2-005; referência alheia recusada'],
 ['ST15','Mudança unidade com história',null,null,'0 total','B35-12','Recusa e preserva identidade quantitativa']
];
csv('05_STOCK_INVARIANTS_MATRIX.csv',stockRules.map(([id,operation,source,destination,expected_quantity,scenario,invariant])=>({id,operation,source,destination,expected_quantity,invariant,scenario,execution:b35.scenarios.find(s=>s.id===scenario)?.execution,evidence:'evidence/b35-results.json',persisted_result:b35.scenarios.find(s=>s.id===scenario)?.observed,rollback:'SEE_RESULT;FAILED_COMMANDS_ATOMIC',concurrency:'B3.8 separate',limits:'Synthetic local; not production or full-state certification'})));
const transitions=[
 ['REQ','absent','submitted','submit_requisition','req.create','Lines/catalogue/idempotency','No stock; series/snapshot/hash/event','B36-02'],
 ['REQ','submitted','science recorded','acknowledge/dispatch','req.science and eligible user','Mode/policy/version','Science evidence; no receipt or debit','B36-02'],
 ['REQ','unfulfilled','completed','ENT receive + refresh','designated ent.receive','Positive linked acceptance; no open operational issue','req.completed; no requested quantity','B36-02'],
 ['REQ','completed','archived','archive_requisition','req.archive','Current physical completion and reason','Archive event; previous versions preserved','B36-03'],
 ['REQ','archived','reopened','ENT cancel/progress','ent.cancel','Valid linked state change','Clear current archive; previous archive in event','B36-03'],
 ['REQ','cancelled/archived','new link refused','link/create/submit','create capability','Closed REQ trigger','No new link/dispatch','B36-08'],
 ['REQ','submitted unlinked','cancelled','transition_requisition_status','req.review','Reason; no completion or live ENT','req.status event; no stock','B36-08'],
 ['COM','absent','draft','create_supply_document draft','com.create','Valid lines','No emission number/stock','STATIC'],
 ['COM','draft','pending_approval/approved','submit','com.create','Version and current state','Emission; state depends local admin role','STATIC'],
 ['COM','pending_approval','approved/partially_approved/rejected','approve','com.approve','Every line; quantities; reason for reduction','No stock','B35-06'],
 ['COM','approved','purchasing/purchased','purchase','com.purchase','Not exceed approved','No stock','B35-06'],
 ['COM','purchased/partially_received','pending receipt','receive','com.receive','Reserve pending qty; not exceed purchased','Pending receipt; admin validates inline','B35-06'],
 ['COM','pending receipt','partially_received/received','validate_receipt','com.validate','Pending receipt belongs document','FAMILY credit exactly once','B35-06'],
 ['COM','pending receipt','rejected receipt','reject_receipt','com.validate','Reason and pending receipt','No credit; preserves original receipt','STATIC'],
 ['COM','partially_received','cancel refused','cancel','com.approve','Physical facts prevent total cancellation','No remnant-only abandonment contract','B36-07'],
 ['ENT','absent/draft','pending_receipt','create/submit','ent.create','Custody/recipient/link/stock','Origin→TRANSIT atomically','B35-01;B36-01'],
 ['ENT','pending_receipt','new recipient','reassign','creator/local admin','No positive acceptance; eligible recipient','Old recipient loses future authority','STATIC;HISTORICAL_B2'],
 ['ENT','pending_receipt','confirmed/disputed','receive','designated ent.receive','Version; divergences; quantities','TRANSIT→destination; immutable receipt','B35-02'],
 ['ENT','disputed','confirmed/disputed','resolve','recipient/local admin per resolution','Line and remaining quantity; reason','received/returned/missing differ','B35-03'],
 ['ENT','no positive acceptance','cancelled','cancel','creator/local admin','Reason/current version','Return unresolved TRANSIT to origin','STATIC;HISTORICAL_B2'],
 ['ENT','positive acceptance','cancellation_pending','cancel','ent.cancel','Reason/current version','No immediate physical reversal; REQ reopens','B36-03;B36-05'],
 ['ENT','cancellation_pending','cancelled','consent_cancel','original recipient','Return+consumed=accepted; real facts','Return physical qty once; no new consumption debit','B36-03'],
 ['ENT','cancellation_pending consumption>0','error42702','consent_cancel','original recipient','Consumption eligibility branch','Atomic rollback; valid process blocked','B36-05'],
 ['ENT','cancelled','receive refused','receive','any','Terminal state','No event or stock','B36-06'],
 ['BAL','absent/draft','submitted','create/submit','bal.count','Whole active catalogue; assigned window when enabled','Capture ledger revision/count version','B37-01;B37-07'],
 ['BAL','submitted','approval recorded/applied','approve','configured review group','Snapshot policy; current count version/revision','TEAM reconciliation; not consumption','B37-02;B37-09'],
 ['BAL','submitted','new count version','recount','counter/assigned replacement','Formal assignment when scheduled','Old approvals retained, not inherited','B37-02;B37-08'],
 ['BAL','scheduled counted','cancel refused','cancel','any','Formal recount required','Preserve obligations and historical count','STATIC'],
 ['ANY','issued','draft revision refused','revise_supply_document','create permission','Only drafts/pending BAL eligible','No rewrite of confirmed history','B36-09'],
 ['ANY','current','stale command refused','command','domain capability','Expected version','No event or ledger change','B36-06']
];
csv('06_DOCUMENT_TRANSITIONS_MATRIX.csv',transitions.map((r,i)=>({id:'DT'+String(i+1).padStart(3,'0'),type:r[0],from:r[1],to:r[2],operation:r[3],authority:r[4],guard:r[5],persistent_effect_and_event:r[6],scenario:r[7],method:r[7].startsWith('STATIC')?'STATIC_REVIEW':'LOCAL_EXECUTED',repetition:'Per command key/version; see B3.8',recovery:'See domain report and future acceptance',evidence:r[7].includes('B37')?'evidence/b37-results.json':r[7].includes('B35')?'evidence/b35-results.json':'evidence/b36-results.json',limits:'A transition row is not a distinct new test; unexecuted branches explicit'})));
console.log(JSON.stringify({stock:stockRules.length,transitions:transitions.length}));
