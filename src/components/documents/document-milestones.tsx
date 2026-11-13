"use client";

import { Icon } from "@/components/ui/primitives";
import type { DocumentMilestone } from "@/lib/documents/milestones";

export function DocumentMilestones({ items }: { items: DocumentMilestone[]; }) {
  return (
    <details className="hca-document-macro">
      <summary className="hca-document-macro-heading">
        <strong>Progresso da ficha</strong>
        <span className="hca-macro-mini" aria-hidden="true">{items.map(item => <i key={item.label} data-state={item.state} />)}</span>
        <span>{items.filter(item => item.state === "done").length} de {items.length} marcos</span>
      </summary>
      <div className="hca-milestone-scroll" role="region" aria-label="Etapas da ficha; rolagem horizontal" tabIndex={0}><ol className="hca-document-milestones" aria-label="Marcos da ficha">
        {items.map((item, index) => (
          <li key={item.label} data-state={item.state}>
            <div className="hca-milestone-track" aria-hidden="true">
              <span
                style={
                  item.percent === undefined
                    ? undefined
                    : { width: `${item.percent}%` }
                }
              />
            </div>
            <div className="hca-milestone-title">
              <span className="hca-milestone-index" aria-hidden="true">
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
