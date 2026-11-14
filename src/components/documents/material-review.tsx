import type { ReactNode } from "react";

/** Read-only material records share the canonical review composition. */
export function MaterialReview({ rows }: {
  rows: readonly { id: string; name: string; details: ReactNode; urgent?: boolean }[];
}) {
  if (!rows.length) return <p className="mt-2 text-sm text-(--muted)">Nenhum registro.</p>;
  return (
    <ul className="hca-material-review">
      {rows.map(row => (
        <li key={row.id}>
          <div className="hca-material-review-main">
            <strong>{row.name}</strong>
            {row.details}
          </div>
          {row.urgent ? <span className="ui-badge ui-badge-danger">Urgente</span> : null}
        </li>
      ))}
    </ul>
  );
}
