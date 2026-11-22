import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icon";

export type MaterialReviewRow = {
  id: string;
  name: string;
  details: ReactNode;
  urgent?: boolean;
  icon?: IconName;
  consult?: ReactNode;
  edit?: ReactNode;
};

/** Read-only material records share the canonical review composition. */
export function MaterialReview({ rows }: {
  rows: readonly MaterialReviewRow[];
}) {
  if (!rows.length) return <p className="mt-2 text-sm text-(--muted)">Nenhum registro.</p>;
  return (
    <ul className="hca-material-review">
      {rows.map(row => (
        <li key={row.id} data-urgent={row.urgent || undefined}>
          {row.icon ? <span className="hca-wizard-material-icon"><Icon name={row.icon} /></span> : null}
          <div className="hca-material-review-main">
            <strong>{row.name}</strong>
            {row.urgent && row.edit ? <span className="ui-badge ui-badge-danger">Urgente</span> : null}
            {row.details}
          </div>
          {row.urgent && !row.edit ? <span className="ui-badge ui-badge-danger">Urgente</span> : null}
          {row.edit ? <div className="hca-wizard-review-actions">{row.edit}{row.consult}</div> : row.consult}
        </li>
      ))}
    </ul>
  );
}
