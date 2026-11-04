/* Local-only official Auth login. Cookie state is private and never exported. */
import {createServerClient} from '@supabase/ssr';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {initialize,state,env,rpc} from './local-harness.mjs';
await initialize();const name=process.argv[2];if(!/^[a-z][a-z0-9_]*$/.test(name??'')||!state.actors[name])throw new Error('Choose synthetic audit actor');
const jar=new Map(),client=createServerClient(env.url,env.anonKey,{cookies:{getAll:()=>[...jar.values()],setAll:values=>{for(const row of values)jar.set(row.name,row);}}});
const auth=await client.auth.signInWithPassword({email:state.actors[name].email,password:state.actors[name].password});if(auth.error)throw new Error('Synthetic browser login failed');
await rpc(client,'select_active_context',{p_patient:state.patient});
const cookies=[...jar.values()].map(row=>({name:row.name,value:row.value,domain:'127.0.0.1',path:'/',expires:row.options?.maxAge?Math.floor(Date.now()/1000)+row.options.maxAge:-1,httpOnly:false,secure:false,sameSite:'Lax'}));
const file=join(process.env.LOCALAPPDATA,'home-care-assistant','audit-b2',`browser-${name}.json`);writeFileSync(file,JSON.stringify({cookies,origins:[]}),{mode:0o600});console.log(JSON.stringify({privateStorageState:file,syntheticActor:name,cookies: cookies.length,localBackendOnly:true}));
