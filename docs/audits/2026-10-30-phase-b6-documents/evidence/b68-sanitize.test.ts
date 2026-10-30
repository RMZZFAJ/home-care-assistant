/* Real attachment sanitizer; synthetic passive PDFs only. No uploads. */
import { it,expect } from 'vitest';
import { readFileSync,writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PDFDocument,PDFName } from 'pdf-lib';
import { sanitizeFile } from '@/lib/server/files';
it('B68-C01 records removal of visible PDF annotations and preserves content-stream counterexample',async()=>{
 const root='docs/audits/2026-10-30-phase-b6-documents/evidence/attachments';
 const cases=[];
 for(const variant of ['annotation','content']){
  const original=readFileSync(`${root}/${variant}-source.pdf`);
  const before=await PDFDocument.load(original);
  const sanitized=await sanitizeFile(original,'application/pdf');
  const after=await PDFDocument.load(sanitized.bytes);
  expect(after.getPageCount()).toBe(1);expect(after.getPage(0).node.has(PDFName.of('Annots'))).toBe(false);
  writeFileSync(`${root}/${variant}-sanitized.pdf`,sanitized.bytes);
  cases.push({variant,originalSha256:createHash('sha256').update(original).digest('hex'),storedDerivativeSha256:createHash('sha256').update(sanitized.bytes).digest('hex'),originalHasAnnotations:before.getPage(0).node.has(PDFName.of('Annots')),derivativeHasAnnotations:false,bytesChanged:!original.equals(sanitized.bytes)});
 }
 writeFileSync('docs/audits/2026-10-30-phase-b6-documents/evidence/b68-sanitize-results.json',JSON.stringify({scenario:'B68-C01',method:'Real sanitizeFile;two synthetic passive PDFs;no API/Storage and no physical signature',cases},null,2)+'\n');
});
