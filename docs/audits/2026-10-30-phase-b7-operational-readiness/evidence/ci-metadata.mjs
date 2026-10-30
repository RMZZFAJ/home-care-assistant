/* Read-only GitHub CI and Vercel provenance. No workflow dispatch or log replay. */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {writeFileSync,readFileSync} from 'node:fs';
const root='repos/RMZZFAJ/home-care-assistant';
const request=path=>{const r=spawnSync('gh',['api',path],{encoding:'utf8',windowsHide:true,timeout:30000,maxBuffer:8000000});return r.status===0?{ok:true,data:JSON.parse(r.stdout)}:{ok:false,status:r.status,error:r.stderr.slice(-400)};};
const identity=request('user');assert(identity.ok&&identity.data.login==='RMZZFAJ');
const save=(n,v)=>writeFileSync(new URL(n,import.meta.url),JSON.stringify(v,null,2)+'\n');
const runs=request(`${root}/actions/workflows/ci.yml/runs?per_page=10`);
const result={recordedAt:new Date().toISOString(),identity:identity.data.login,runs:runs.ok?runs.data.workflow_runs.map(r=>({id:r.id,sha:r.head_sha,branch:r.head_branch,event:r.event,status:r.status,conclusion:r.conclusion,url:r.html_url,createdAt:r.created_at})):runs};
for(const id of [40656069166,40241890885]){
 const jobs=request(`${root}/actions/runs/${id}/jobs?per_page=100`);
 const artifacts=request(`${root}/actions/runs/${id}/artifacts`);
 result[id]={jobs:jobs.ok?jobs.data.jobs.map(j=>({id:j.id,name:j.name,conclusion:j.conclusion,startedAt:j.started_at,completedAt:j.completed_at,failedSteps:j.steps.filter(s=>s.conclusion==='failure').map(s=>s.name)})):jobs,artifacts:artifacts.ok?artifacts.data.artifacts.map(a=>({name:a.name,bytes:a.size_in_bytes,expired:a.expired,createdAt:a.created_at,expiresAt:a.expires_at})):artifacts};
}
const baseline=JSON.parse(readFileSync(new URL('baseline.json',import.meta.url),'utf8'));
for(const sha of [baseline.head,baseline.master]){
 const checks=request(`${root}/commits/${sha}/check-runs?per_page=100`);
 const statuses=request(`${root}/commits/${sha}/status`);
 result[sha]={checks:checks.ok?checks.data.check_runs.map(c=>({name:c.name,conclusion:c.conclusion,status:c.status,url:c.details_url,app:c.app.slug})):checks,statuses:statuses.ok?statuses.data.statuses.map(s=>({context:s.context,state:s.state,url:s.target_url})):statuses};
}
result.rulesets=request(`${root}/rulesets`);
result.masterProtection=request(`${root}/branches/master/protection`);
const logs=spawnSync('gh',['run','view','40656069166','--repo','RMZZFAJ/home-care-assistant','--log-failed'],{encoding:'utf8',windowsHide:true,timeout:45000,maxBuffer:12000000});
const ansi=new RegExp(String.fromCharCode(27)+'\\[[0-9;]*m','g');
result.failedLog={exit:logs.status,lines:logs.stdout?.split(/\r?\n/).filter(l=>/navigation\.ts:|Navegação do plantão|TimeoutError|failed|passed|retry|dez linhas/i.test(l)).map(l=>l.replace(ansi,'')).slice(-32),limits:'Only matching failure/count lines retained; complete runtime logs not copied.'};
save('ci-metadata.json',result);
console.log(JSON.stringify({...result,failedLog:result.failedLog},null,2));
