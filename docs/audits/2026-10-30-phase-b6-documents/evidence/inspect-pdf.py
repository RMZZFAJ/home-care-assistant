"""Read-only PDF inspection; writes derived text/PNG evidence only. No OCR."""
from pathlib import Path
import hashlib,json
import pymupdf

ROOT=Path(__file__).resolve().parent
ROOT.joinpath('images').mkdir(exist_ok=True)
ROOT.joinpath('text').mkdir(exist_ok=True)
selection={'PV01':[0,1],'PV02':[1],'PV03':[0,1],'PV04':[0,1],'PV05':[0,1],'PV06':[0],
           'PV07':[1,3,5,7],'PV08':[0],'PV09':[1,2,4],'PV10':[0],'PV11':[0]}
results=[]
for case in json.loads(ROOT.joinpath('b66-pdf-results.json').read_text(encoding='utf-8'))['cases']:
    path=ROOT/'pdf'/f"{case['id']}.pdf"
    doc=pymupdf.open(path)
    assert hashlib.sha256(path.read_bytes()).hexdigest()==case['pdfSha256']
    pages=[]
    for n,page in enumerate(doc):
        text=page.get_text(sort=False)
        ROOT.joinpath('text',f"{case['id']}-p{n+1}.txt").write_text(text,encoding='utf-8',newline='\n')
        outside=[]
        full=page.get_text('dict',clip=pymupdf.INFINITE_RECT())
        for block in full['blocks']:
            for line in block.get('lines',[]):
                for span in line.get('spans',[]):
                    x0,y0,x1,y1=span['bbox']
                    if x0<0 or y0<0 or x1>page.rect.width+0.1 or y1>page.rect.height+0.1:
                        outside.append({'text':span['text'],'bbox':list(span['bbox'])})
        pages.append({'page':n+1,'textLength':len(text),'outsidePage':outside,'size':[page.rect.width,page.rect.height]})
        if n in selection[case['id']]:
            page.get_pixmap(matrix=pymupdf.Matrix(1.4,1.4),colorspace=pymupdf.csRGB,alpha=False).save(ROOT/'images'/f"{case['id']}-p{n+1}.png")
    alltext='\n'.join(p.get_text() for p in doc)
    markers={m:m in alltext for m in case['omittedMarkers']}
    results.append({'id':case['id'],'pages':pages,'selectedImages':[n+1 for n in selection[case['id']]],
                    'textContainsOmittedMarkers':markers,'endMarkerVisible':'FIM_B6' in alltext,
                    'catalogLang':doc.xref_get_key(doc.pdf_catalog(),'Lang'),
                    'structureTree':doc.xref_get_key(doc.pdf_catalog(),'StructTreeRoot'),
                    'metadata':doc.metadata,'links':[link for page in doc for link in page.get_links()],
                    'annotations':sum(len(list(page.annots() or [])) for page in doc)})
ROOT.joinpath('b66-inspection-results.json').write_text(json.dumps({'tool':'PyMuPDF2.0/MuPDF1.28.5;Poppler unavailable in PATH',
    'method':'Native text extraction and page rasterization;no OCR;physical printing NOT_VERIFIED','cases':results},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps([{'id':r['id'],'pages':len(r['pages']),'outsideSpans':sum(len(p['outsidePage']) for p in r['pages']),
    'endMarker':r['endMarkerVisible'],'omittedMarkers':r['textContainsOmittedMarkers']} for r in results],ensure_ascii=False))
