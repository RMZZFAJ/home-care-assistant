"""Creates fictional annotation/content counterexamples; never reads real files."""
from pathlib import Path
import pymupdf

ROOT=Path(__file__).resolve().parent/'attachments'
ROOT.mkdir(exist_ok=True)
for name,annotation in [('annotation-source',True),('content-source',False)]:
    doc=pymupdf.open()
    page=doc.new_page(width=595.28,height=841.89)
    page.insert_text((50,65),'COMPROVANTE EXTERNO FICTICIO B6',fontsize=18)
    page.insert_text((50,100),'Texto base ficticio preservado: entrega declarada de dez unidades.',fontsize=11)
    page.insert_text((50,130),'Somente dados sinteticos. Nao e documento operacional.',fontsize=10)
    message='RESSALVA FICTICIA B6: EMBALAGEM AVARIADA'
    if annotation:
        a=page.add_freetext_annot(pymupdf.Rect(50,175,530,235),message,fontsize=13,text_color=(0.8,0,0))
        a.update()
        ink=page.add_ink_annot([[(65,290),(90,270),(120,295),(150,265),(180,285)]])
        ink.set_colors(stroke=(0,0,0.8));ink.update()
    else:
        page.insert_text((50,195),message,fontsize=13,color=(0.8,0,0))
    doc.save(ROOT/f'{name}.pdf')
