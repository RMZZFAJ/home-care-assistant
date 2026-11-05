/* AUDIT ONLY. Formats authorized Markdown without weakening lint rules.
 * Long tables become named records; canonical CSV preserves original cells.
 * Original master attachment is preserved byte-for-byte in .txt before format. */
const {fs,path,out,write}=require('./audit-lib.cjs');
const order=path.join(out,'FASE_B1_ORDEM_MESTRA_AUDITORIA_UX_UI_SOL.md'),original=path.join(out,'evidence/MASTER_ORDER_ORIGINAL.txt');if(!fs.existsSync(original))fs.copyFileSync(order,original);
function cells(line){return line.trim().replace(/^\|/,'').replace(/\|$/,'').split(/(?<!\\)\|/).map(s=>s.trim().replaceAll('\\|','|'));}
function wrap(line){if(!line.trim())return '';if(/^\s*```|^\s*~~~/.test(line))return line;
if(/^#{1,6} /.test(line)&&line.length>80){const words=line.split(' ');let h='';while(words.length&&(h+' '+words[0]).trim().length<=78)h+=(h?' ':'')+words.shift();return h+'\n\n'+wrap(words.join(' '));}
if(/^#{1,6} /.test(line)||/^\s{4}/.test(line))return line;
const marker=line.match(/^(\s*(?:[-*+] |\d+\. ))/),indent=marker?' '.repeat(marker[1].length):'',tokens=(marker?line.slice(marker[1].length):line).match(/`[^`]*`|\[[^\]]*\]\([^)]*\)|\S+/g)||[],lines=[];let current=marker?marker[1]:'';
for(const t of tokens){const space=current.endsWith(' ')?'':current.trim()?' ':'';if((current+space+t).length>80&&current.trim()&&(!marker||current!==marker[1])){lines.push(current.trimEnd());current=indent+t;}else current+=space+t;}if(current)lines.push(current.trimEnd());return lines.join('\n');}
let count=0;function walk(d){for(const ent of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,ent.name);if(ent.isDirectory())walk(p);else if(ent.name.endsWith('.md')){
let s=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n').replace(/\n-\n+(\[[^\n]+\]\([^\n]+\))\n/g,'\n- $1\n  ').replace(/`([^`\n]{81,})`/g,(_,v)=>v.replaceAll('[','\\[').replaceAll(']','\\]')).replaceAll('[more]','[Mais — captura da navegação]').replaceAll('[1-9][0-9]','`[1-9][0-9]`').replaceAll('[.,][0-9]','`[.,][0-9]`'),lines=s.split('\n'),outLines=[],fence=false;
for(let i=0;i<lines.length;i++){let line=lines[i];if(/^\s*```|^\s*~~~/.test(line)){fence=!fence;outLines.push(line);continue;}if(fence){outLines.push(line);continue;}
if(line.trim().startsWith('|')&&i+1<lines.length&&/^\s*\|?[\s:|-]+\|/.test(lines[i+1])){const headers=cells(line);i++;outLines.push('');while(i+1<lines.length&&lines[i+1].trim().startsWith('|')){const values=cells(lines[++i]);outLines.push('- '+headers.map((h,k)=>'**'+h+':** '+(k===headers.length-1?values.slice(k).join(' | '):values[k]||'—')).join('; ').replace(/<(\/?[A-Za-z][^>\n]*)>/g,'&lt;$1&gt;')+'.');}outLines.push('');continue;}
line=line.split(/(`[^`]*`|\[[^\]]*\]\([^)]*\))/g).map((piece,n)=>n%2?piece:piece.replace(/<(\/?[A-Za-z][^>\n]*)>/g,'&lt;$1&gt;')).join('');
outLines.push(line);
}
const result=outLines.map(wrap).join('\n').replace(/\n{3,}/g,'\n\n').replace(/(\]\([^\n)]+\)) ([.,;:!?])/g,'$1$2').trimEnd()+'\n';if(result!==fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n')){write(path.relative(out,p),result);count++;}
}}}walk(out);console.log(JSON.stringify({formatted:count,scope:out,originalOrderPreserved:original}));
