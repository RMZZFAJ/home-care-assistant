"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { useLiveRevision } from "@/lib/use-live-revision";
import { residenceAdministrationSnapshot, type ResidenceAdministrationSnapshot } from "@/lib/validation/residence-administration";
import { Icon } from "@/components/ui/icon";
import "./people-administration.css";

export function PeopleNavigation({ patientId, area, globalMode }: { patientId: string; area: "memberships" | "invitations"; globalMode: boolean }) {
  const [counts, setCounts] = useState<ResidenceAdministrationSnapshot | null>(null);
  const live = useLiveRevision();
  useEffect(() => {
    if (globalMode) return;
    const controller = new AbortController();
    void api<unknown>(`/api/admin/residence?patientId=${patientId}`, undefined, controller.signal).then(raw => {
      if (!controller.signal.aborted) setCounts(residenceAdministrationSnapshot.parse(raw));
    }).catch(() => { if (!controller.signal.aborted) setCounts(null); });
    return () => controller.abort();
  }, [globalMode, live, patientId]);

  const back = `/admin?careRecipientId=${patientId}`;
  const snapshot = counts?.patientId === patientId ? counts : null;
  return <div className="hca-people-navigation">
    <p>Participantes e responsabilidades na residência.</p>
    {globalMode ? <p className="hca-people-hint"><Icon name="info" /><span><strong>Vínculos como propostas.</strong> Outro administrador local decide. O aceite da pessoa pode ser necessário.</span></p> :
      <nav aria-label="Pessoas e convites" className="hca-document-tab-list">
        <Link className="hca-document-tab" aria-current={area === "memberships" ? "page" : undefined} href={`${back}&section=memberships`}>
          Pessoas{snapshot ? <><span className="hca-people-count" aria-hidden="true">{snapshot.activeMembers}</span><span className="sr-only">{snapshot.activeMembers} vínculos ativos</span></> : null}
        </Link>
        <Link className="hca-document-tab" aria-current={area === "invitations" ? "page" : undefined} href={`${back}&section=invitations`}>
          Convites{snapshot ? <><span className="hca-people-count" aria-hidden="true">{snapshot.pendingInvitations}</span><span className="sr-only">{snapshot.pendingInvitations} convites pendentes</span></> : null}
        </Link>
      </nav>}
  </div>;
}
