/* Git-blob SHA256 manifest, no database or remote operations. */
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {join,relative} from 'node:path';
export const base='docs/audits/2026-10-29-phase-b3-database',index='docs/audits/phase-b/README.md';
export const excluded=[base+'/evidence/MANIFEST.sha256',base+'/evidence/PACKAGE_INTEGRITY.json',base+'/evidence/PACKAGE_INTEGRITY.md'];
export const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:64*1024*1024}).trim();
export function files(){const result=[];function walk(dir){for(const d of readdirSync(dir,{withFileTypes:true})){const p=join(dir,d.name);if(d.isDirectory())walk(p);else result.push(relative(process.cwd(),p).replaceAll('\\','/'));}}walk(base);return [...result,index].filter(f=>!excluded.includes(f)).sort();}
export function blob(path,mode='--staged'){return execFileSync('git',['show',(mode==='--head'?'HEAD:':':')+path],{maxBuffer:64*1024*1024});}
export function verify(mode='--staged'){const listed=readFileSync(base+'/evidence/MANIFEST.sha256','utf8').trim().split('\n').filter(l=>l&&!l.startsWith('#')).map(l=>({hash:l.slice(0,64),path:l.slice(66)})),expected=files(),names=new Set(listed.map(r=>r.path)),missing=expected.filter(p=>!names.has(p)),extra=listed.filter(r=>!expected.includes(r.path)).map(r=>r.path),mismatches=[];for(const r of listed)if(createHash('sha256').update(blob(r.path,mode)).digest('hex')!==r.hash)mismatches.push(r.path);return {mode,entries:listed.length,missing,extra,mismatches,exclusions:excluded,passed:missing.length===0&&extra.length===0&&mismatches.length===0};}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/manifest.mjs')){const mode=process.argv.includes('--head')?'--head':'--staged';if(process.argv.includes('--write')){const lines=['# SHA256 of Git blob bytes; LF/CRLF checkout differences are not rehashed raw.','# Excludes itself and PACKAGE_INTEGRITY.json/.md (self-reference).',...files().map(p=>createHash('sha256').update(blob(p,mode)).digest('hex')+'  '+p)];writeFileSync(base+'/evidence/MANIFEST.sha256',lines.join('\n')+'\n');}const result=verify(mode);console.log(JSON.stringify(result));if(!result.passed)process.exitCode=1;}
