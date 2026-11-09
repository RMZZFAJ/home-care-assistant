"use client";

import { Icon } from "@/components/ui/primitives";
import type { DocumentMilestone } from "@/lib/documents/milestones";

export function DocumentMilestones({ items }: { items: DocumentMilestone[] }) {
  return (
    <div className="hca-document-macro">
      <div className="hca-document-macro-heading">
        <strong>Progresso da ficha</strong>
        <span>Marcos independentes da ordem dos Andamentos</span>
      </div>
      <ol className="hca-document-milestones" aria-label="Marcos da ficha">
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
      </ol>
    </div>
  );
}
