/* Starts only the existing, B3-built local artifact. No build or fixture seed. */
import { spawn } from 'node:child_process';
import { dirname, delimiter } from 'node:path';
import { readFileSync,writeFileSync } from 'node:fs';
import { getE2EEnvironment } from '../../../../scripts/e2e-environment.mjs';
if(process.versions.node!=='24.22.0')throw new Error('Node version');
const baseline=JSON.parse(readFileSync(new URL('baseline.json',import.meta.url),'utf8'));
if(readFileSync('.next/BUILD_ID','utf8').trim()!==baseline.buildId)throw new Error('Reference build changed');
const runtimeBuildId=readFileSync('.next-e2e/BUILD_ID','utf8').trim();
const env=getE2EEnvironment();env.PATH=dirname(process.execPath)+delimiter+process.env.PATH;
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3100'],{env,stdio:'inherit',windowsHide:true});
writeFileSync(new URL('local-server.json',import.meta.url),JSON.stringify({startedAt:new Date().toISOString(),pid:child.pid,origin:env.NEXT_PUBLIC_APP_URL,external:false,flows:false,dist:'.next-e2e',buildId:runtimeBuildId,buildProvenance:'B3 local-app.log and local-app-process.json guarded build; same functional source; no B4 build',node:process.versions.node},null,2)+'\n');
process.on('SIGINT',()=>child.kill());process.on('SIGTERM',()=>child.kill());
child.on('exit',code=>process.exitCode=code??0);
