import type { ReactNode } from "react";
import { Icon } from "./primitives";

/** Canonical file row; full native content and its actions remain separate. */
export function FileRecord({ title, children, actions, identity, mime, filename }: {
  title: ReactNode; children: ReactNode; actions?: ReactNode; identity?: string; mime?: string; filename?: string;
}) {
  const name = filename ?? (typeof title === "string" ? title : "");
  const kind = mime === "application/pdf" || /\.pdf$/i.test(name) ? "PDF" : mime?.startsWith("image/") || /\.(png|jpe?g|webp|gif|heic)$/i.test(name) ? "IMG" : /\.(docx?|odt|txt|rtf)$/i.test(name) ? "DOC" : "ARQ";
  return <li className="doc-file-card" data-file-id={identity}>
    <span className="doc-pdf-icon" data-file-kind={kind} aria-label={kind === "IMG" ? "Imagem" : kind === "DOC" ? "Documento de texto" : kind === "PDF" ? "Arquivo PDF" : "Arquivo"}><Icon name={kind === "IMG" ? "image" : "file"} width={22} height={22} /><small>{kind}</small></span>
    <div className="doc-file-main"><div className="doc-file-title"><h3>{title}</h3></div>{children}</div>
    {actions ? <div className="doc-file-actions">{actions}</div> : null}
  </li>;
}
