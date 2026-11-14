/* AUDIT ONLY. Contact sheets of current sanitized screenshots; no source image overwritten. */
const {fs,path,dir,write}=require('./audit-lib.cjs'),sharp=require('sharp');
function capturePath(file, directory = dir) {
  if (typeof file !== 'string' || /[/\\\0]/.test(file) || !/\.png$/i.test(file) || path.basename(file) !== file) throw Error('Capture filename required');
  const source = fs.realpathSync(path.join(directory, file));
  if (!source.startsWith(fs.realpathSync(directory) + path.sep) || !fs.statSync(source).isFile()) throw Error('Capture must remain inside the evidence directory');
  return source;
}
async function main(){const prefix=process.argv[2];if(!/^[a-z0-9-]+$/.test(prefix||''))throw Error('Result prefix required');const data=JSON.parse(fs.readFileSync(path.join(dir,prefix+'.json'),'utf8')),captures=data.cases||data.captures,map=[];for(let i=0;i<captures.length;i+=6){const group=captures.slice(i,i+6),layers=[],sheet=prefix+'-sheet-'+String(i/6+1).padStart(2,'0')+'.png';for(let j=0;j<group.length;j++){const c=group[j],source=capturePath(c.file),meta=await sharp(source).metadata(),height=Math.min(meta.height,950);const b=await sharp(source).extract({left:0,top:0,width:meta.width,height}).resize({width:360,height:650,fit:'contain',background:'#dde2e8'}).toBuffer();layers.push({input:b,left:j%3*360,top:Math.floor(j/3)*680+30});const label=c.file.replaceAll('&','&amp;').replaceAll('<','&lt;');layers.push({input:Buffer.from(`<svg width="360" height="30"><rect width="360" height="30" fill="white"/><text x="3" y="18" font-size="9">${label}</text></svg>`),left:j%3*360,top:Math.floor(j/3)*680});map.push({capture:c.file,sheet,region:'top '+height+' of '+meta.height+'px; scaled to 360x650',full:height===meta.height,inspected:false});}await sharp({create:{width:1080,height:1360,channels:3,background:'#dde2e8'}}).composite(layers).png().toFile(path.join(dir,sheet));}write('evidence/'+prefix+'-sheet-map.json',map);console.log(JSON.stringify({prefix,sheets:Math.ceil(captures.length/6),captures:captures.length}));}
if (require.main === module) void main();
module.exports = { capturePath };
