/* Audit artifacts only. Official repository checks with verified local environment. */
import {spawn} from 'node:child_process';
import {dirname,delimiter} from 'node:path';
import {writeFileSync,createWriteStream,readFileSync,existsSync,copyFileSync} from 'node:fs';
import {getE2EEnvironment} from '../../../../scripts/e2e-environment.mjs';
const env=getE2EEnvironment(),npmCli='C:/Users/renat/AppData/Roaming/npm/node_modules/npm/bin/npm-cli.js',out=new URL('./',import.meta.url);
if(process.versions.node!=='24.22.0'||JSON.parse(readFileSync(new URL('../package.json','file:///'+npmCli))).version!=='11.21.1')throw new Error('Required Node/npm pair');
const selected=process.argv.slice(2),allowed=['check:contracts','lint','lint:markdown','typecheck','test','build'];
if(!selected.length||selected.some(s=>!allowed.includes(s)))throw new Error('Explicit standard checks only');
const file=new URL('checks.json',out),result=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{node:process.versions.node,npm:'11.21.1',productSha:'37cb7f85e96e551d6419871f94dd950712e2565b',checks:[]};
for(const name of selected){
 const log=name.replaceAll(':','-')+'-current.log';
 if(existsSync(new URL(log,out))){const previous=name.replaceAll(':','-')+'-attempt-'+result.checks.filter(r=>r.command==='npm run '+name).length+'.log';copyFileSync(new URL(log,out),new URL(previous,out));for(const row of result.checks)if(row.log===log)row.log=previous;}
 const stream=createWriteStream(new URL(log,out)),startedAt=new Date().toISOString();
 const childEnv={...env,PATH:dirname(process.execPath)+delimiter+process.env.PATH,HCA_E2E:'false',NEXT_PUBLIC_APP_URL:name==='test'?'https://care.example':env.NEXT_PUBLIC_APP_URL};
 for(const k of ['VERCEL','VERCEL_URL','VERCEL_PROJECT_PRODUCTION_URL','VERCEL_BRANCH_URL','NEXT_PUBLIC_VERCEL_URL'])delete childEnv[k];
 const child=spawn(process.execPath,[npmCli,'run',name],{env:childEnv,stdio:['ignore','pipe','pipe'],windowsHide:true});
 child.stdout.pipe(stream,{end:false});child.stderr.pipe(stream,{end:false});
 const exitCode=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});
 await new Promise(resolve=>stream.end(resolve));
 result.checks.push({command:'npm run '+name,startedAt,finishedAt:new Date().toISOString(),exitCode,log,externalSending:false,localBackend:'127.0.0.1:54321',appOrigin:childEnv.NEXT_PUBLIC_APP_URL});
 writeFileSync(file,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({name,exitCode,log}));
}
