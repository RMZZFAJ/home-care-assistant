/* Captures only the sanitized result returned by the already-open CLI session.
 * CLI logs/cookies stay in private LOCALAPPDATA. Does not log requests/headers. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
assert.equal(process.versions.node,'24.22.0');
const cli=process.argv[2];assert(cli?.endsWith('playwright-cli.js'),'Pass installed Playwright CLI path');
const output=execFileSync(process.execPath,[cli,'-s=b5','run-code','--filename','docs/audits/2026-10-30-phase-b5-integrations/evidence/b58-after.js'],{encoding:'utf8',windowsHide:true,timeout:55000});
const line=output.split('\n').find(x=>x.startsWith('{"beforeReload"'));assert(line,'CLI result absent');const data=JSON.parse(line);
assert.equal(data.beforeReload.flowQueries,0);assert.equal(data.beforeReload.flowVisible,false);assert(data.beforeReload.events>0);assert(data.beforeReload.contextQueries>0);assert(data.beforeReload.bellQueries>0);assert.equal(data.afterReloadVisible,true);
const report={recordedAt:new Date().toISOString(),id:'B58-U01',initial:{revision:'3',flowVisible:false},...data,externalSending:false,buildProvenance:'B3 .next-e2e build xmyfMmpMX4DoypZZsNBM1; product identical through B4/B5',limits:'Single desktop Chrome directed check; no Meta publication, physical device or human acceptance; UI has external Flow flag false but persisted submissions remain reviewable.'};
writeFileSync(new URL('b58-browser-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(report);
