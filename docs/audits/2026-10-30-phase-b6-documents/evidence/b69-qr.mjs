/* Offline decoding of QR pixels extracted from synthetic PDFs. No URL fetch. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync,writeFileSync } from 'node:fs';
import sharp from 'sharp';
const require=createRequire(import.meta.url);
const {RGBLuminanceSource,BinaryBitmap,HybridBinarizer,MultiFormatReader}=require('@zxing/library');
const dir=new URL('./',import.meta.url);
const source=JSON.parse(readFileSync(new URL('b66-pdf-results.json',dir),'utf8')).cases;
const results=[];
for(const id of ['PV01','PV05']){
 const {data,info}=await sharp(new URL(`images/${id}-qr.png`,dir).pathname.replace(/^\/(.:\/)/,'$1')).greyscale().raw().toBuffer({resolveWithObject:true});
 assert.equal(info.channels,1);
 const pixels=new Uint8ClampedArray(data);
 const decoded=new MultiFormatReader().decodeWithState(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(pixels,info.width,info.height)))).getText();
 const url=new URL(decoded),expected=source.find(c=>c.id===id);
 assert.equal(url.pathname,'/verificar/'+expected.source.id);
 assert.equal(url.searchParams.get('version'),String(expected.source.version));
 assert.equal(url.searchParams.get('hash'),expected.syntheticHash);
 results.push({id,decoded,versionExact:true,hashExact:true,parameters:[...url.searchParams.keys()],pixelSize:[info.width,info.height],urlFetched:false});
}
writeFileSync(new URL('b69-qr-results.json',dir),JSON.stringify({scenario:'B69-O01',method:'PDF embedded PNG pixels decoded with installed ZXing;no browser/provider/production call;physical camera NOT_VERIFIED',results},null,2)+'\n');console.log(results);
