import type { ReactNode } from "react";
import { Icon } from "./primitives";

export function PdfFormatMark() {
  return <span className="doc-pdf-icon" data-file-kind="PDF" aria-hidden="true">
    <svg viewBox="0 0 32 36" width={29} height={32} fill="none">
      <path d="M5 1h15l8 8v25H5V1Z" fill="currentColor" />
      <path d="M20 1v8h8" fill="white" fillOpacity={0.45} />
      <path d="M12 25c3.5-5 6-12 4.8-15-1.9-3.7-4.9 1.2-1.5 7.2 2.8 4.6 8.5 7 9.2 4.5.6-2.3-8.5-2.2-13.4 1.1-5.2 3.5-3.8 6.3.9 2.2Z"
        stroke="white" strokeWidth={1.3} strokeLinejoin="round" />
    </svg><small>PDF</small>
  </span>;
}

export function FileRecord({ title, children, actions, identity, mime, filename, archive }: {
  title: ReactNode; children: ReactNode; actions?: ReactNode; identity?: string; mime?: string; filename?: string;
  archive?: { description: ReactNode; details: ReactNode; facts: ReactNode; };
}) {
  const name = filename ?? (typeof title === "string" ? title : "");
  const kind = mime === "application/pdf" || /\.pdf$/i.test(name) ? "PDF" : mime?.startsWith("image/") || /\.(png|jpe?g|webp|gif|heic)$/i.test(name) ? "IMG" : /\.(docx?|odt|txt|rtf)$/i.test(name) ? "DOC" : "ARQ";
  const mark = kind === "PDF" ? <PdfFormatMark /> : <span className="doc-pdf-icon" data-file-kind={kind} aria-label={kind === "IMG" ? "Imagem" : kind === "DOC" ? "Documento de texto" : "Arquivo"}>
    <Icon name={kind === "IMG" ? "image" : "file"} width={22} height={22} /><small>{kind}</small>
  </span>;
  if (archive) return <li className="hca-file-archive-record" data-file-id={identity}>
    <div className="hca-file-record-heading">
      {mark}
      <div className="doc-file-title"><h3>{title}</h3><p>{archive.description}</p></div>
      {archive.details}
    </div>
    <div className="hca-file-record-meta">{children}</div>
    <div className="hca-file-record-footer">
      <div className="hca-file-record-facts">{archive.facts}</div>
      {actions ? <div className="hca-file-record-actions">{actions}</div> : null}
    </div>
  </li>;
  return <li className="doc-file-card" data-file-id={identity}>
    {mark}
    <div className="doc-file-main"><div className="doc-file-title"><h3>{title}</h3></div>{children}</div>
    {actions ? <div className="doc-file-actions">{actions}</div> : null}
  </li>;
}
