/* GET-only provider metadata. Never decrypt/list secret values or invoke deployment. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
assert.equal(process.versions.node,'24.22.0');
const root='repos/RMZZFAJ/home-care-assistant';
const run=(cmd,args)=>{
 const r=spawnSync(cmd,args,{encoding:'utf8',windowsHide:true,timeout:45000,maxBuffer:8000000,env:{...process.env,VERCEL_TELEMETRY_DISABLED:'1'}});
 if(r.status!==0)return {ok:false,status:r.status,error:(r.stderr??'').slice(-500)};
 try{return {ok:true,data:JSON.parse(r.stdout)}}catch{return {ok:false,error:'JSON response unavailable',status:r.status};}
};
const gh=(path)=>run('gh',['api',path]);
const identity=gh('user');assert(identity.ok&&identity.data.login==='RMZZFAJ');
const vcs=join(process.env.APPDATA,'npm/node_modules/vercel/dist/vc.js');
const vercel=(path)=>{assert(path.startsWith('/v'));return run(process.execPath,[vcs,'api',path,'--method','GET','--scope','rmzzfajs-projects']);};
const result={recordedAt:new Date().toISOString(),method:'GET-only authenticated metadata; response fields explicitly selected; no env values or runtime logs',githubIdentity:{login:identity.data.login,id:identity.data.id},limitations:['GitHub connector required link_id; CLI fallback','Vercel connector UNAUTHORIZED; CLI fallback']};
const repo=gh(root);result.repository=repo.ok?{name:repo.data.full_name,private:repo.data.private,defaultBranch:repo.data.default_branch,archived:repo.data.archived,permissions:repo.data.permissions}:repo;
for(const branch of ['master','audit/phase-b']){
 const r=gh(`${root}/branches/${encodeURIComponent(branch)}`);
 result[branch]=r.ok?{name:r.data.name,sha:r.data.commit.sha,protected:r.data.protected}:r;
}
const vr=vercel('/v2/user');assert(vr.ok&&vr.data.user.username==='rmzzfaj');
result.vercelIdentity={username:vr.data.user.username};
const project=vercel('/v9/projects/prj_GwdwNVay81iZ7ltM4Tg5IIXFLGPv?teamId=team_X3JshR4ahuzIk95k6JMAYhq2');
if(project.ok){const p=project.data;assert.equal(p.name,'home-care-assistant');assert.equal(p.accountId,'team_X3JshR4ahuzIk95k6JMAYhq2');result.vercelProject={id:p.id,name:p.name,accountId:p.accountId,framework:p.framework,nodeVersion:p.nodeVersion,rootDirectory:p.rootDirectory,buildCommand:p.buildCommand,installCommand:p.installCommand,commandForIgnoringBuildStep:p.commandForIgnoringBuildStep,gitRepository:p.link?{type:p.link.type,org:p.link.org,repo:p.link.repo,productionBranch:p.link.productionBranch,deployHooksCount:p.link.deployHooks?.length}:null,gitProviderOptions:p.gitProviderOptions,gitForkProtection:p.gitForkProtection,ssoProtection:p.ssoProtection,passwordProtectionConfigured:!!p.passwordProtection,skewProtectionMaxAge:p.skewProtectionMaxAge,resourceConfig:p.resourceConfig,crons:p.crons,latestDeployments:p.latestDeployments?.map(d=>({id:d.id,url:d.url,readyState:d.readyState,target:d.target,createdAt:d.createdAt,sha:d.meta?.githubCommitSha,branch:d.meta?.githubCommitRef})),keys:Object.keys(p).filter(k=>!/env|token|secret/i.test(k))};}else result.vercelProject=project;
const deployments=vercel('/v6/deployments?projectId=prj_GwdwNVay81iZ7ltM4Tg5IIXFLGPv&teamId=team_X3JshR4ahuzIk95k6JMAYhq2&limit=10');
result.deployments=deployments.ok?deployments.data.deployments.map(d=>({id:d.uid,url:d.url,state:d.state,target:d.target,created:d.created,sha:d.meta?.githubCommitSha,branch:d.meta?.githubCommitRef,source:d.source})):deployments;
writeFileSync(new URL('remote-baseline.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
