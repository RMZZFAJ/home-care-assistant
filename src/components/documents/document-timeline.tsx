"use client";
import { documentEventLabel } from "@/lib/notifications/event-labels";
import { formatBrazilDate } from "@/lib/receipt";

import { SettingsSection } from "@/components/forms/settings-section";

export type TimelineEvent = {
  id: string;
  action: string;
  createdAt: string;
  actorName?: string;
  actorId?: string;
  version?: number;
};
export function DocumentTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <SettingsSection title="Linha do tempo" summary={events.length + " evento(s) registrados"}>
      {events.length ? (
        <ol className="mt-4 space-y-4 border-l-2 border-(--line) pl-4">
          {events.map((event) => (
            <li key={event.id}>
              <p className="text-sm font-semibold">
                {documentEventLabel(event.action)}
              </p>
              <p className="text-xs text-(--muted)">
                {formatBrazilDate(event.createdAt)} ·{" "}
                {event.actorName ||
                  (event.actorId
                    ? "Pessoa identificada no registro"
                    : "Sistema")}
                {event.version ? " · versão " + event.version : ""}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-sm text-(--muted)">
          Sem eventos documentais disponíveis.
        </p>
      )}
    </SettingsSection>
  );
}
