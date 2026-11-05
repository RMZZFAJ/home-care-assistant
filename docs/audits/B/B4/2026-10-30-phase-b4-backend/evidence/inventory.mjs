/* READ ONLY product source. Outputs only B4 CSV/JSON catalogues. */
import ts from 'typescript';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
if (process.versions.node !== '24.22.0') throw new Error('Node version');
const git = (...args) => execFileSync('git',args,{encoding:'utf8',windowsHide:true}).trim();
if(git('branch','--show-current')!=='audit/phase-b') throw new Error('Branch');
const root=new URL('../',import.meta.url),out=new URL('./',import.meta.url);
const paths=git('ls-files','src','tests','proxy.ts').split('\n');
const sources=new Map(paths.filter(p=>/\.[cm]?[jt]sx?$/.test(p)).map(p=>[p,readFileSync(p,'utf8')]));
const clean=s=>s.replace(/\s+/g,' ').trim();
const unique=a=>[...new Set(a)];
const csv=(name,rows)=>{const keys=Object.keys(rows[0]);writeFileSync(new URL(name,root),[keys,...rows.map(r=>keys.map(k=>r[k]??''))].map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n')+'\n');};
const inventory=[];
for(const [path,source] of sources){
 if(!path.endsWith('/route.ts'))continue;
 const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true);
 for(const fn of file.statements.filter(n=>ts.isFunctionDeclaration(n)&&n.name&&/^(GET|POST|PATCH|PUT|DELETE|HEAD|OPTIONS)$/.test(n.name.text))){
  const method=fn.name.text,text=fn.getText(file),calls=[];
  const walk=n=>{if(ts.isCallExpression(n)||ts.isNewExpression(n))calls.push(n);ts.forEachChild(n,walk);};walk(fn);
  const named=name=>calls.filter(c=>c.expression.getText(file)===name);
  const strings=c=>c.arguments.filter(ts.isStringLiteral).map(n=>n.text);
  const route=path.replace(/^src\/app/,'').replace(/\/route.ts$/,'');
  const searchBase=route.replace(/\/\[.*?\].*$/,'');
  const refs=(entries)=>entries.map(c=>`${path}:${file.getLineAndCharacterOfPosition(c.getStart(file)).line+1}`);
  const op=named('api')[0]?.arguments[0]?.text??(route.includes('demonstracao')?'public.demo.pdf':'auth.callback');
  const query=unique(calls.filter(c=>/\.get$/.test(c.expression.getText(file))).flatMap(strings));
  const schemas=named('readJson').map(c=>clean(c.arguments[1].getText(file)));
  const limit=named('readJson').map(c=>c.arguments[2]?.getText(file)??'256000');
  const auth=named('authenticate').length?'authenticate:Auth+active profile+my_session_valid':named('authenticatedIdentity').length?'authenticatedIdentity:Auth;RPC account/session rules':route.includes('webhook')?'Meta HMAC/account or verification secret':route==='/api/notifications/worker'?'Bearer server secret':route==='/api/whatsapp/flows'?'Meta HMAC+RSA/AES':route.includes('invitations/register')?'public invitation token/email gate':route.includes('demonstracao')?'public synthetic only':'PKCE callback';
  const rpcCalls=calls.filter(c=>c.expression.getText(file)==='rpc'||/\.rpc$/.test(c.expression.getText(file)));
  const rpcs=unique(rpcCalls.flatMap(c=>c.arguments.filter(ts.isStringLiteral).map(s=>s.text)));
  const tables=unique(calls.filter(c=>/\.from$/.test(c.expression.getText(file))).flatMap(strings));
  const caps=named('patientContext').map(c=>clean(c.arguments[2]?.getText(file)??'read'));
  const response=calls.filter(c=>/NextResponse\.json$/.test(c.expression.getText(file))).map(c=>clean(c.arguments[0]?.getText(file)??'').slice(0,550));
  const services=unique(calls.filter(c=>/^(loadReceipt|documentPdf|boundedUpload|sanitizeFile|processNotifications|renderDocumentPdf)$/.test(c.expression.getText(file))).map(c=>c.expression.getText(file)));
  const consumers=unique([...sources].filter(([p,t])=>p.startsWith('src/')&&p!==path&&t.includes(searchBase)).map(([p])=>p));
  const tests=unique([...sources].filter(([p,t])=>p.startsWith('tests/')&&(t.includes(searchBase)||t.includes(path.replace(/^src\//,'@/')))).map(([p])=>p));
  inventory.push({endpoint_id:`HTTP-${String(inventory.length+1).padStart(3,'0')}`,path:route,method,purpose:op,consumers:consumers.join(';')||'No direct string consumer; dynamic/internal/external contract',operation:method==='GET'?'read;may derive artifact':route==='/api/stock/inventory'?'retired 410':'command',authentication:auth,context:named('patientContext').length?'HTTP patientContext + RLS/RPC':named('requireGlobal').length?'branch-dependent requireGlobal + RPC':'object/session/provider authority in RPC or public contract',capability:caps.join(';')||'RPC/object rule;see authority matrix',input:schemas.join(' | ')||query.join(';')||'route params or no body',limits:limit.length?`JSON bytes ${limit.join(';')};schema per source`:named('boundedUpload').length?'bounded multipart;files.ts':named('boundedText').map(c=>clean(c.arguments[1].getText(file))).join(';')||'query/RPC limit;see source',services:services.join(';'),persistence:[...rpcs.map(r=>'rpc:'+r),...tables.map(t=>'relation/bucket:'+t)].join(';'),response:response.join(' | ')||'PDF/plaintext/redirect',errors:unique(named('ApiError').flatMap(strings)).join(';')||'api wrapper + databaseError;callback/demo exception',repetition:/idempotencyKey|uploadKey/.test(text)?'client key forwarded;semantic checks in RPC':/randomUUID|randomBytes/.test(text)?'server identity;review recovery':method==='GET'?'repeat read;possible artifact side effect':'natural state/RPC;no client key',recovery:/RECEIPT_PENDING/.test(text)?'confirmed persistence + stable requisitionId/key':/revise_supply_document/.test(text)?'two commits;revisionKey and submissionKey':/download\(reservation/.test(text)?'download existing and SHA comparison':'read-back/current state;per operation report',existing_coverage:tests.join(';')||'No direct route test found;transitive tests not inferred',source:`${path}:${file.getLineAndCharacterOfPosition(fn.getStart(file)).line+1}`,rpc_anchors:refs(rpcCalls).join(';')});
 }
}
csv('01_BACKEND_API_INVENTORY.csv',inventory);
csv('02_AUTHORIZATION_HTTP_MATRIX.csv',inventory.map(r=>({endpoint_id:r.endpoint_id,path:r.path,method:r.method,identity:r.authentication,http_context:r.context,http_capability:r.capability,db_or_service_authority:r.persistence,session_ended:r.authentication.startsWith('authenticate')?'API my_session_valid before execution; in-flight semantics require per-RPC proof':'RPC/provider/bootstrap-specific;see report',object_scope:r.path.includes('[id]')?'Object resolved by RLS/RPC;not authorized by supplied patient ID':'Patient/session/provider scope in referenced source',assurance:'Administrative AAL2 rules remain in SQL;provider secrets distinct from Auth',verification:'STATIC_HTTP_AND_REFERENCED_B3_SQL;dynamic sample only in b42-auth-results.json',evidence:r.source+';02_AUTH_CONTEXT_AND_CAPABILITIES.md',limits:'Not an executed test of every branch, role or override'})));
const surfaces=paths.filter(p=>p.endsWith('/route.ts')||p.startsWith('src/lib/')&&/\.tsx?$/.test(p)||p==='proxy.ts'||/^src\/app\/(verificar|auth)/.test(p));
writeFileSync(new URL('source-surface-index.json',out),JSON.stringify({recordedAt:new Date().toISOString(),routeFiles:new Set(inventory.map(r=>r.source.replace(/:\d+$/,''))).size,endpoints:inventory.length,surfaces:surfaces.map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')})),notes:'AST catalogue is discovery, not proof of authorization or path execution. Branches and SQL rules require manual review.'},null,2)+'\n');
console.log(JSON.stringify({routeFiles:new Set(inventory.map(r=>r.source.replace(/:\d+$/,''))).size,endpointMethods:inventory.length,surfaces:surfaces.length}));
