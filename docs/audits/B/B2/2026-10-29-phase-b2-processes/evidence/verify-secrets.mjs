/* Read private local credentials only to assert they were NOT exported. Never print values. */
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {getTestEnvironment} from '../../../../scripts/test-environment.mjs';
const env=getTestEnvironment(),root=fileURLToPath(new URL('../',import.meta.url));
const privateDir=join(process.env.LOCALAPPDATA,'home-care-assistant','audit-b2');
const state=JSON.parse(readFileSync(join(privateDir,'local-state.json'),'utf8'));
const secrets=[{kind:'local_service_key',value:env.serviceKey},{kind:'local_api_key',value:env.anonKey},...Object.values(state.actors).map(a=>({kind:'synthetic_password',value:a.password}))];
for(const name of readdirSync(privateDir).filter(name=>/^browser-.*\.json$/.test(name))){
 const cookies=JSON.parse(readFileSync(join(privateDir,name),'utf8')).cookies;
 for(const c of cookies)secrets.push({kind:'auth_cookie',value:c.value});
}
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):[join(dir,e.name)]);}
const scanned=files(root),matches=[];
for(const path of scanned){
 const bytes=readFileSync(path);
 for(const secret of secrets)if(secret.value&&bytes.includes(Buffer.from(secret.value)))matches.push({file:path.slice(root.length+1).replaceAll('\\','/'),kind:secret.kind});
 const text=bytes.toString('utf8');
 if(/https?:\/\/[^\s"<>]+\?[^\s"<>]*\btoken=eyJ[A-Za-z0-9_-]+\./.test(text))matches.push({file:path.slice(root.length+1).replaceAll('\\','/'),kind:'signed_jwt_url'});
}
const result={recordedAt:new Date().toISOString(),filesScanned:scanned.length,knownSecretKinds:[...new Set(secrets.map(s=>s.kind))],matches,passed:matches.length===0,limits:'Known exact credentials/cookies and signed JWT URL pattern;not a guarantee against every private datum. All rendered people/patients independently checked as synthetic. No secret value exported.'};
writeFileSync(new URL('secret-scan.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({files:scanned.length,passed:result.passed,matches}));
if(!result.passed)process.exitCode=1;
