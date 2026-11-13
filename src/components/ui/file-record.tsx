import type { ReactNode } from "react";
import { Icon } from "./primitives";

/** Canonical file row; full native content and its actions remain separate. */
export function FileRecord({ title, children, actions, identity, mime, filename }: {
  title: ReactNode; children: ReactNode; actions?: ReactNode; identity?: string; mime?: string; filename?: string;
}) {
  const name = filename ?? (typeof title === "string" ? title : "");
  const kind = mime === "application/pdf" || /\.pdf$/i.test(name) ? "PDF" : mime?.startsWith("image/") || /\.(png|jpe?g|webp|gif|heic)$/i.test(name) ? "IMG" : /\.(docx?|odt|txt|rtf)$/i.test(name) ? "DOC" : "ARQ";
  return <li className="hca-file-record" data-file-id={identity}>
    <span className="hca-file-mark" data-file-kind={kind} aria-label={kind === "IMG" ? "Imagem" : kind === "DOC" ? "Documento de texto" : kind === "PDF" ? "Arquivo PDF" : "Arquivo"}><Icon name={kind === "IMG" ? "camera" : "file"} /><small>{kind}</small></span>
    <div className="hca-file-main"><strong className="hca-file-title">{title}</strong>{children}</div>
    {actions ? <div className="hca-file-actions">{actions}</div> : null}
  </li>;
}
