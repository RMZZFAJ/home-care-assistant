/* Documentation maintenance only. Escapes literal brackets outside code/links.
 * Does not disable diagnostics, change URLs, source code, CSVs or evidence data.
 * Scope: Git-tracked Markdown plus the four newly relocated Phase A inputs. */
const fs=require('node:fs'),{execFileSync}=require('node:child_process');
const files=[...new Set([...execFileSync('git',['ls-files','*.md'],{encoding:'utf8'}).trim().split(/\r?\n/),...fs.readdirSync('docs/audits/2026-10-25-production-readiness/inputs').filter(x=>x.endsWith('.md')).map(x=>'docs/audits/2026-10-25-production-readiness/inputs/'+x)])].filter(f=>fs.existsSync(f));
let changes=0,brackets=0;
for(const file of files){const source=fs.readFileSync(file,'utf8'),refs=new Set([...source.matchAll(/^ {0,3}\[([^\]\n]+)\]:\s*(\S+)/gm)].filter(m=>!m[2].startsWith('[')).map(m=>m[1].trim().toLowerCase()));let fenced=false;
const result=source.split(/\r?\n/).map(line=>{if(/^\s*(`{3,}|~{3,})/.test(line)){fenced=!fenced;return line;}const definition=line.match(/^ {0,3}\[([^\]]+)\]:/);if(fenced||/^ {4}/.test(line)||definition&&refs.has(definition[1].trim().toLowerCase()))return line;let out='';
for(let i=0;i<line.length;i++){const c=line[i];if(c==='\\'){out+=line.slice(i,i+2);i++;continue;}
if(c==='`'){let n=1;while(line[i+n]==='`')n++;const end=line.indexOf('`'.repeat(n),i+n);if(end>=0){out+=line.slice(i,end+n);i=end+n-1;continue;}}
if(c!=='['){out+=c;continue;}let end=-1,level=1;for(let j=i+1;j<line.length;j++){if(line[j]==='\\'){j++;continue;}if(line[j]==='[')level++;else if(line[j]===']'&&--level===0){end=j;break;}}if(end<0){out+=c;continue;}const label=line.slice(i+1,end),tail=line[end+1];
if(tail==='('){let depth=0,j=end+1;for(;j<line.length;j++){if(line[j]==='\\'){j++;continue;}if(line[j]==='(')depth++;if(line[j]===')'&&--depth===0)break;}if(j<line.length){out+=line.slice(i,j+1);i=j;continue;}}
if(tail==='['){const close=line.indexOf(']',end+2),ref=close>=0?line.slice(end+2,close)||label:'';if(refs.has(ref.trim().toLowerCase())){out+=line.slice(i,close+1);i=close;continue;}}
if(refs.has(label.trim().toLowerCase())||/^[ xX]$/.test(label)&&/^\s*[-+*] $/.test(line.slice(0,i))){out+=line.slice(i,end+1);i=end;continue;}
out+=line.slice(i,end+1).replace(/(?<!\\)\[/g,'\\[').replace(/(?<!\\)\]/g,'\\]');i=end;brackets++;
}return out;}).join('\n');if(result!==source.replace(/\r\n/g,'\n')){fs.writeFileSync(file,result);changes++;}}
console.log(JSON.stringify({filesChanged:changes,literalPairsEscaped:brackets}));
