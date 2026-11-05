/* LOCAL SYNCHRONIZATION ONLY. Holds an advisory lock; never creates schema. */
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {getTestEnvironment,sql,sqlLiteral as lit,testContainer} from '../../../../scripts/test-environment.mjs';
const backend=getTestEnvironment();
export async function raw(client,name,args){
 const env=backend,session=(await client.auth.getSession()).data.session;
 if(!session)throw new Error('Real Auth session required');
 const response=await fetch(env.url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:env.anonKey,authorization:'Bearer '+session.access_token,'content-type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(35000)});
 const text=await response.text();return {status:response.status,body:text?JSON.parse(text):null};
}
export async function atStockLock(patient,sends,{inside='',finish='rollback',prefix='stock:',afterWait=null}={}){
 getTestEnvironment();if(!['rollback','commit'].includes(finish))throw new Error('Invalid release');
 const holder=spawn('docker',['exec','-i',testContainer,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{stdio:['pipe','pipe','pipe'],windowsHide:true});
 let stderr='';holder.stderr.on('data',chunk=>stderr+=chunk.toString());
 const closed=new Promise(resolve=>holder.once('close',resolve));
 const ready=new Promise((resolve,reject)=>{let stdout='';const timer=setTimeout(()=>reject(new Error('Barrier not ready')),10000);holder.once('error',reject);holder.stdout.on('data',chunk=>{stdout+=chunk.toString();if(stdout.includes('b3-lock-ready')){clearTimeout(timer);resolve();}});});
 if(!['stock:','attachments:'].includes(prefix))throw new Error('Unapproved audit barrier prefix');
 holder.stdin.write(`begin;set local lock_timeout='15s';select pg_advisory_xact_lock(hashtextextended(${lit(prefix)}||${lit(patient)},0));${inside}\nselect 'b3-lock-ready';\n`);
 let pending,maxWaiters=0,releaseError;
 try{await ready;pending=Promise.allSettled(sends.map(send=>send()));const start=Date.now();
 while(true){const n=Number(sql(`select count(*) from pg_locks where locktype='advisory' and not granted and objsubid=1 and classid=((hashtextextended(${lit(prefix)}||${lit(patient)},0)>>32)&4294967295)::oid and objid=(hashtextextended(${lit(prefix)}||${lit(patient)},0)&4294967295)::oid;`));maxWaiters=Math.max(maxWaiters,n);if(n>=sends.length)break;if(Date.now()-start>20000)throw new Error('Independent requests did not reach barrier');await delay(30);}
 if(afterWait)await afterWait();
 }finally{holder.stdin.end(`${finish};\n\\q\n`);const code=await closed;if(code!==0)releaseError=new Error('Barrier release failed: '+stderr.replace(/Bearer\s+\S+/g,'[redacted]'));}
 if(releaseError)throw releaseError;
 const results=await pending;return {independentHTTP:sends.length,waitersObserved:maxWaiters,release:finish,responses:results.map(x=>{if(x.status!=='fulfilled')throw x.reason;return x.value;})};
}
export const safe=r=>({status:r.status,id:typeof r.body==='string'?r.body:r.body?.id??null,version:r.body?.version??null,state:r.body?.status??null,code:r.body?.code??null,message:r.body?.message??null});
