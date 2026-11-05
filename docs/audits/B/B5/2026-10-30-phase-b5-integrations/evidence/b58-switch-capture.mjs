import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {writeFileSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {sql,sqlLiteral as lit,getTestEnvironment} from '../../../../scripts/test-environment.mjs';
assert.equal(process.versions.node,'24.22.0');getTestEnvironment();
const cli=process.argv[2];assert(cli?.endsWith('playwright-cli.js'));
const output=execFileSync(process.execPath,[cli,'-s=b5','run-code','--filename','docs/audits/2026-10-30-phase-b5-integrations/evidence/b58-switch.js'],{encoding:'utf8',windowsHide:true,timeout:25000});
const line=output.split('\n').find(x=>x.startsWith('{"id":"B58-U02"'));assert(line);const result=JSON.parse(line);
// The initial expectation of stale selection was REFUTED: AppWorkspace remounts
// content for a changed patient. Preserve this counterproof, not a new finding.
assert.equal(result.oldReviewText,false);assert.equal(result.emptyNewPatient,true);assert.equal(result.denied.status,403);
const fixture=JSON.parse(readFileSync(join(process.env.LOCALAPPDATA,'home-care-assistant','audit-b5','browser-fixture.json'),'utf8'));
const persisted=sql(`begin read only;select status from public.flow_submissions where id=${lit(fixture.submission)};rollback;`);assert.equal(persisted,'pending_confirmation');
const report={recordedAt:new Date().toISOString(),...result,readbackStatus:persisted,externalSending:false,limit:'Both patients authorized to the same synthetic identity; no new unauthorized disclosure or cross-patient write demonstrated.'};
writeFileSync(new URL('b58-switch-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(report);
