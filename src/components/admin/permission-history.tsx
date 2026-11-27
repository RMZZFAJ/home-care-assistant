"use client";

import { useCallback, useState, type RefObject } from "react";
import { ChangeFacts } from "@/components/ui/change-facts";
import { ActionButton, LoadingIndicator, Pill } from "@/components/ui/controls";
import { FeedbackBanner } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { Drawer } from "@/components/ui/overlays";
import { capabilityLabels } from "@/lib/capability-labels";
import { formatBrazilDate } from "@/lib/receipt";
import { roleLabel } from "@/lib/role-labels";
import { useScopedRead } from "@/lib/use-scoped-read";
import { parseGovernanceListRead } from "@/lib/validation/governance-list";

const pageSize = 20;
const permissionState = (allowed: boolean) => allowed ? "Permitida" : "Restrita";
const reportingState = (allowed: boolean) => allowed ? "Permitidos" : "Restritos";

export function PermissionHistory({ patientId, revision, opener, onClose }: {
  patientId: string;
  revision: number;
  opener: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);
  const search = new URLSearchParams({
    careRecipientId: patientId, status: "applied", kind: "capability",
    page: String(page), pageSize: String(pageSize), changesOnly: "true",
  });
  const decode = useCallback((value: unknown) => parseGovernanceListRead(value, {
    careRecipientId: patientId, status: "applied", kind: "capability", query: "", page, pageSize,
  }), [patientId, page]);
  const { data, loading, error, refresh } = useScopedRead("/api/patient-settings?" + search, String(revision), decode);
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  return <Drawer open title="Histórico de permissões" subtitle="Alterações nesta residência" kicker="Organização da residência" headingIcon="history"
    popupClassName="hca-preference-sheet hca-residence-settings-sheet hca-permission-history-sheet"
    keyboardScrollable finalFocus={opener} onClose={onClose} footer={<ActionButton onClick={onClose}>Voltar</ActionButton>}>
    <div className="hca-form-stack" aria-busy={loading}>
      {loading && <LoadingIndicator label="Consultando histórico de permissões" />}
      {error && <FeedbackBanner tone="error">{error} <ActionButton onClick={refresh}>Consultar novamente</ActionButton></FeedbackBanner>}
      {!loading && !error && data?.changes.length === 0 && <FeedbackBanner heading="Sem alterações nesta consulta">
        As alterações registradas nesta residência aparecerão aqui.
      </FeedbackBanner>}
      {!loading && !error && data?.changes.map(change => {
        const snapshot = change.resolution?.permission;
        const code = snapshot?.capability ?? (typeof change.proposed.capability === "string" ? change.proposed.capability : "");
        const role = snapshot?.role ?? (typeof change.proposed.subjectRole === "string" ? change.proposed.subjectRole : "");
        const profile = role ? roleLabel(role) : "Perfil da residência";
        const subject = change.subjectName ?? (snapshot?.personId || change.proposed.subjectUser
          ? "Identidade histórica" : profile);
        const actor = snapshot?.actorName ?? change.reviewerName ?? change.proposerName;
        const beforeReporting = snapshot?.familyReportingBefore;
        const afterReporting = snapshot?.familyReportingAfter;
        return <article className="ui-card hca-permission-group hca-permission-history-entry" key={change.id}>
          <h3>{subject}</h3>
          <div className="hca-guide-row">
            <span className="hca-guide-row-icon"><Icon name="shield" /></span>
            <span className="hca-guide-row-label">
              <strong>{capabilityLabels[code] ?? (code || "Alteração de permissão")}</strong>
              <small>{actor} · {formatBrazilDate(change.decided_at ?? change.created_at)}</small>
            </span>
            <Pill tone="success">Registrado</Pill>
          </div>
          {snapshot ? <div className="hca-permission-history-comparison">
            <ChangeFacts changes={[
              { id: "access", label: "Acesso", before: permissionState(snapshot.before), after: permissionState(snapshot.after) },
              ...(beforeReporting !== undefined && afterReporting !== undefined
                ? [{ id: "reporting", label: "Relatos da família", before: reportingState(beforeReporting), after: reportingState(afterReporting) }]
                : []),
            ]} />
          </div> : <p className="hca-field-hint hca-permission-history-comparison">Comparação indisponível neste registro.</p>}
        </article>;
      })}
      {(page > 1 || totalPages > 1) && <nav className="hca-toolbar" aria-label="Páginas do histórico de permissões">
        <ActionButton disabled={page === 1 || loading} onClick={() => setPage(page - 1)}>Página anterior</ActionButton>
        <ActionButton disabled={page >= totalPages || loading || Boolean(error)} onClick={() => setPage(page + 1)}>Próxima página</ActionButton>
      </nav>}
    </div>
  </Drawer>;
}
