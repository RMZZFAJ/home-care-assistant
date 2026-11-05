/* Directed-browser runner: verified local stack, unchanged B3 build only.
 * No build, seed or provider delivery. Own server, never an unknown listener. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {dirname,delimiter} from 'node:path';
import {createServer} from 'node:net';
import {getE2EEnvironment} from '../../../../scripts/e2e-environment.mjs';
assert.equal(process.versions.node,'24.22.0');
const build=readFileSync('.next-e2e/BUILD_ID','utf8').trim();
const prior=JSON.parse(readFileSync('docs/audits/2026-10-30-phase-b4-backend/evidence/local-server.json','utf8'));
assert.equal(build,prior.buildId);
const probe=createServer();await new Promise((resolve,reject)=>probe.once('error',reject).listen(3100,'127.0.0.1',resolve));await new Promise(resolve=>probe.close(resolve));
const env=getE2EEnvironment();env.PATH=dirname(process.execPath)+delimiter+process.env.PATH;
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3100'],{env,stdio:'inherit',windowsHide:true});
writeFileSync(new URL('local-server.json',import.meta.url),JSON.stringify({startedAt:new Date().toISOString(),pid:child.pid,origin:env.NEXT_PUBLIC_APP_URL,external:false,flows:false,dist:'.next-e2e',buildId:build,provenance:'B3 build reused by B4; same product source; no rebuild B5',node:process.versions.node},null,2)+'\n');
process.on('SIGINT',()=>child.kill());process.on('SIGTERM',()=>child.kill());child.on('exit',code=>{process.exitCode=code??0;});
