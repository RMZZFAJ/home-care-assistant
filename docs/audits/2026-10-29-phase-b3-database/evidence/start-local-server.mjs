/* Controlled local app for audit HTTP probes. Guarded env; no remote/provider. */
import {spawn} from 'node:child_process';
import {createWriteStream,writeFileSync} from 'node:fs';
import {dirname,delimiter} from 'node:path';
import net from 'node:net';
import {getE2EEnvironment} from '../../../../scripts/e2e-environment.mjs';
if(process.versions.node!=='24.22.0')throw new Error('Node version');
const env=getE2EEnvironment();env.PATH=dirname(process.execPath)+delimiter+process.env.PATH;
await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',()=>reject(new Error('Port3100 is occupied; refusing unknown server')));s.listen(3100,'127.0.0.1',()=>s.close(resolve));});
const log=createWriteStream(new URL('local-app.log',import.meta.url));
const start=Date.now(),build=spawn(process.execPath,['node_modules/next/dist/bin/next','build'],{env,stdio:['ignore','pipe','pipe'],windowsHide:true});build.stdout.pipe(log,{end:false});build.stderr.pipe(log,{end:false});
const exit=await new Promise(resolve=>build.once('close',resolve));if(exit!==0)throw new Error('Audit local build failed; inspect log');
console.log(JSON.stringify({build:'PASS',milliseconds:Date.now()-start,dist:'.next-e2e',env:'guarded local, external disabled'}));
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3100'],{env,stdio:['ignore','pipe','pipe'],windowsHide:true});server.stdout.pipe(log,{end:false});server.stderr.pipe(log,{end:false});
writeFileSync(new URL('local-app-process.json',import.meta.url),JSON.stringify({pid:server.pid,parent:process.pid,origin:'http://127.0.0.1:3100',dist:'.next-e2e',externalEnabled:false,startedAt:new Date().toISOString()},null,2)+'\n');
console.log('Audit local server started on loopback3100');
process.on('SIGINT',()=>server.kill());process.on('SIGTERM',()=>server.kill());await new Promise(resolve=>server.once('close',resolve));log.end();
