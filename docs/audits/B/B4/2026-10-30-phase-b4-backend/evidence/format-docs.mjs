/* Documentary formatting only; paths constrained to this audit package. */
import assert from 'node:assert/strict';
import { readFileSync,writeFileSync,readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve,relative,sep } from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const list=path=>readdirSync(path,{withFileTypes:true}).flatMap(e=>e.isDirectory()?list(resolve(path,e.name)):[resolve(path,e.name)]);
const wrap=(line)=>{
 if(line.length<=80||/^\s*#|^```|^\s*\|/.test(line))return line;
 const prefix=line.match(/^\s*(?:[-*]|\d+\.)\s+/)?.[0]??line.match(/^\s+/)?.[0]??'',indent=prefix?' '.repeat(prefix.length):'';
 const words=line.slice(prefix.length).match(/`[^`]*`|\[[^\]]+\]\([^)]+\)|\S+/g)??[];
 const rows=[];let current=prefix;for(const word of words){if(current.trim()&&current.length+1+word.length>78){rows.push(current);current=indent+word;}else current+=(current&&current!==prefix?' ':'')+word;}if(current)rows.push(current);return rows.join('\n');
};
const files=process.argv.slice(2).length?process.argv.slice(2).map(p=>resolve(p)):list(root).filter(p=>p.endsWith('.md'));
let changed=0;
for(const path of files){const rel=relative(root,path);assert(rel&&!rel.startsWith('..'+sep)&&rel!=='..'&&!resolve(rel).startsWith('file:'),'Audit path only');assert(path.endsWith('.md'));
 const source=readFileSync(path,'utf8').replaceAll('\r\n','\n'),lines=source.split('\n'),out=[];
 for(let i=0;i<lines.length;i++){
  if(lines[i].startsWith('|')&&lines[i+1]?.match(/^\|[\s:|-]+\|$/)){
   const table=[];while(i<lines.length&&lines[i].startsWith('|'))table.push(lines[i++]);i--;
   if(table.some(l=>l.length>80)){const cells=l=>l.split('|').slice(1,-1).map(c=>c.trim()),headers=cells(table[0]);for(const row of table.slice(2)){const c=cells(row);out.push(wrap('- **'+c[0]+'** — '+c.slice(1).map((v,j)=>headers[j+1]+': '+v).join('; ')+'.'));}continue;}
   out.push(...table);continue;
  }
  out.push(wrap(lines[i]));
 }
 const formatted=out.join('\n').replace(/\n*$/,'\n');if(formatted!==source){writeFileSync(path,formatted);changed++;}
}
console.log(JSON.stringify({markdownFiles:files.length,changed,scope:'B4 documentation only'}));
