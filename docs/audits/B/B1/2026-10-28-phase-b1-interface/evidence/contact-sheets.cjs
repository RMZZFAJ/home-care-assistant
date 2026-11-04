/* READ-ONLY source captures; writes inspection derivatives within B1 only. */
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
(async()=>{
 const dir=path.dirname(__filename),data=JSON.parse(fs.readFileSync(path.join(dir,'runtime-sweep.json'),'utf8'));
 for(const filename of ['b11-supplement.json','b11-followup.json'])if(fs.existsSync(path.join(dir,filename)))data.captures.push(...JSON.parse(fs.readFileSync(path.join(dir,filename),'utf8')).cases);
 const mapping=[];
 for(let start=0;start<data.captures.length;start+=6){
  const items=data.captures.slice(start,start+6),layers=[];
  for(let j=0;j<items.length;j++){
   const c=items[j],input=path.join(dir,c.file),meta=await sharp(input).metadata();
   const width=400,height=1100,scale=Math.min(1,width/meta.width),cropHeight=Math.min(meta.height,Math.floor((height-70)/scale));
   const top=await sharp(input).extract({left:0,top:0,width:meta.width,height:cropHeight}).resize({width:Math.round(meta.width*scale)}).png().toBuffer();
   const label=Buffer.from(`<svg width="400" height="60"><rect width="400" height="60" fill="#dfeafb"/><text x="8" y="22" font-size="14">${c.role} ${c.label} ${c.width}px</text><text x="8" y="44" font-size="12">${start+j+1}: top ${cropHeight}/${meta.height}px</text></svg>`);
   const x=j%3*width,y=Math.floor(j/3)*height;
   layers.push({input:label,left:x,top:y},{input:top,left:x,top:y+60});
   mapping.push({capture:c.file,sheet:`contact-${String(start/6+1).padStart(2,'0')}.png`,region:`top ${cropHeight}/${meta.height} source pixels`,full:cropHeight===meta.height});
  }
  await sharp({create:{width:1200,height:2200,channels:3,background:'#fff'}}).composite(layers).png().toFile(path.join(dir,`contact-${String(start/6+1).padStart(2,'0')}.png`));
 }
 fs.writeFileSync(path.join(dir,'contact-sheet-map.json'),JSON.stringify(mapping,null,2)+'\n');console.log(JSON.stringify({sheets:Math.ceil(data.captures.length/6),captures:data.captures.length}));
})();
