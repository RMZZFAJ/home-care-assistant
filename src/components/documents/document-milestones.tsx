"use client";

import { Icon } from "@/components/ui/primitives";
import type { DocumentMilestone } from "@/lib/documents/milestones";

export function DocumentMilestones({ items, summary }: { items: DocumentMilestone[]; summary?: string }) {
  return (
    <details className="hca-document-macro doc-macro doc-progress-accordion">
      <summary aria-label={`Progresso da ficha: ${items.filter(item => item.state === "done").length} de ${items.length} marcos`}>
        <span className="doc-macro-label">Progresso da ficha</span>
        <span className="doc-macro-summary-bar" aria-hidden="true">{items.map(item => <span key={item.label} className="doc-macro-segment" data-state={item.state === "pending" && item.percent !== undefined ? "active" : item.state} title={`${item.label}: ${item.detail}`}><i style={{ width: `${item.state === "done" ? 100 : item.percent ?? 0}%` }} /></span>)}</span>
        <span className="doc-macro-current">{summary ?? items.find(item => item.state === "pending")?.label ?? "Etapas da ficha"}</span><Icon name="down" width={17} height={17} />
      </summary>
      <div className="doc-step-scroll" role="region" aria-label="Etapas da ficha; rolagem horizontal" tabIndex={0}><ol className="doc-steps" aria-label="Marcos da ficha">
        {items.map((item, index) => (
          <li className="doc-step" key={item.label} data-state={item.state}>
            <div className="doc-step-title">
              <span className="doc-step-index" aria-hidden="true">
                {item.state === "done" ? (
                  <Icon name="check" width={13} />
                ) : (
                  index + 1
                )}
              </span>
              <strong>{item.label}</strong>
            </div>
            <p>{item.detail}</p>
          </li>
        ))}
      </ol></div>
    </details>
  );
}
