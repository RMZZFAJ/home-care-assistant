/* global FormData */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {getTestEnvironment} from '../../../../scripts/test-environment.mjs';
getTestEnvironment();
export const origin='http://127.0.0.1:3100';
export async function app(name,path,options={}) {
 const url=new URL(path,origin);if(url.origin!==origin)throw new Error('Refusing nonlocal application origin');
 const state=JSON.parse(readFileSync(join(process.env.LOCALAPPDATA,'home-care-assistant','audit-b2',`browser-${name}.json`),'utf8'));
 const headers={cookie:state.cookies.map(c=>`${c.name}=${c.value}`).join('; '),origin,...options.headers};
 let body=options.body;if(body && !(body instanceof FormData) && !Buffer.isBuffer(body)){body=JSON.stringify(body);headers['content-type']='application/json';}
 return fetch(url,{...options,headers,body,signal:AbortSignal.timeout(45000),redirect:'manual'});
}
export const safeError=async response=>{const data=await response.json().catch(()=>({}));return{status:response.status,code:data.code??null,error:data.error??null};};
