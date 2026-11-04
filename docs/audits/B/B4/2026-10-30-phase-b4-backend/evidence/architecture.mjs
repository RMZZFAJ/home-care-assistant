/* READ ONLY TS runtime-import graph. Type-only edges excluded. */
import ts from 'typescript';
import { execFileSync } from 'node:child_process';
import { readFileSync,writeFileSync,existsSync } from 'node:fs';
import { resolve,dirname,relative } from 'node:path';
if(process.versions.node!=='24.22.0')throw new Error('Node version');
const paths=execFileSync('git',['ls-files','src','proxy.ts'],{encoding:'utf8',windowsHide:true}).trim().split('\n').filter(p=>/\.[jt]sx?$/.test(p));
const graph=new Map(),clientRoots=[];
for(const path of paths){
 const text=readFileSync(path,'utf8'),source=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true),edges=[];
 if(/^\s*["']use client["']/.test(text))clientRoots.push(path);
 for(const n of source.statements){
  if(!(ts.isImportDeclaration(n)||ts.isExportDeclaration(n))||!n.moduleSpecifier||!ts.isStringLiteral(n.moduleSpecifier)||n.isTypeOnly||ts.isImportDeclaration(n)&&n.importClause?.isTypeOnly)continue;
  if(ts.isImportDeclaration(n)&&n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings)&&n.importClause.namedBindings.elements.every(e=>e.isTypeOnly)&&!n.importClause.name)continue;
  const name=n.moduleSpecifier.text;
  const base=name.startsWith('@/')?resolve('src',name.slice(2)):name.startsWith('.')?resolve(dirname(path),name):null;
  if(!base)continue;
  const target=[base,base+'.ts',base+'.tsx',base+'/index.ts',base+'/index.tsx'].find(p=>existsSync(p));
  if(target)edges.push(relative(process.cwd(),target).replaceAll('\\','/'));
 }
 graph.set(path,[...new Set(edges)]);
}
const reach=root=>{const seen=new Set();const visit=p=>{if(seen.has(p))return;seen.add(p);for(const child of graph.get(p)??[])visit(child);};visit(root);return seen;};
const violations=[];
for(const root of clientRoots)for(const path of reach(root))if(/src\/lib\/server\//.test(path))violations.push({root,path});
const index=new Map(),low=new Map(),stack=[],onStack=new Set(),cycles=[];let n=0;
const visit=p=>{index.set(p,n);low.set(p,n++);stack.push(p);onStack.add(p);for(const c of graph.get(p)??[]){if(!graph.has(c))continue;if(!index.has(c)){visit(c);low.set(p,Math.min(low.get(p),low.get(c)));}else if(onStack.has(c))low.set(p,Math.min(low.get(p),index.get(c)));}if(low.get(p)===index.get(p)){const group=[];let c;do{c=stack.pop();onStack.delete(c);group.push(c);}while(c!==p);if(group.length>1)cycles.push(group.sort());}};
for(const p of graph.keys())if(!index.has(p))visit(p);
const result={recordedAt:new Date().toISOString(),files:paths.length,clientRoots:clientRoots.length,runtimeImportEdges:[...graph.values()].reduce((n,a)=>n+a.length,0),clientToServerPaths:violations,cycles,backendCycles:cycles.filter(group=>group.some(p=>p.startsWith('src/app/api/')||p.startsWith('src/lib/server/')||p.startsWith('src/lib/notifications/'))),limits:'Literal static imports/reexports only;not a bundler proof;dynamic computed imports and dependency package internals not expanded. Built-asset secret check is separate.'};
writeFileSync(new URL('architecture-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
