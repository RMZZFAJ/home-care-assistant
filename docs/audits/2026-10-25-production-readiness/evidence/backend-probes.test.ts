// Diagnostic probes: assertions describe the audited behavior, not acceptance of it.
import { afterEach, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
vi.mock("@/lib/server/document-pdf", () => ({ renderDocumentPdf: async () => new Uint8Array([1]) }));
import { prepareDocumentNotification } from "@/lib/notifications/document-notification";
import { templateForEvent } from "@/lib/notifications/template-registry";
import { MetaWhatsAppProvider, type NotificationJob } from "@/lib/notifications/provider";
import { processNotifications } from "@/lib/notifications/worker";
import { formatBrazilDate } from "@/lib/receipt";

afterEach(() => vi.useRealTimers());

function fixture(type: "ENT" | "BAL", event: string) {
  const snapshot = {
    id: "10000000-0000-4000-8000-000000000001", type, code: `${type}-0001`, protocol: "fixture", version: 2,
    status: type === "BAL" ? "submitted" : "confirmed",
    createdAt: "2026-10-20T10:00:00Z", payload: {},
    actors: { issuer: { name: "Pessoa emissora fictícia" }, recipient: { name: "Pessoa destinatária fictícia" } },
    lines: [{ quantity: "3", metadata: { expectedQuantity: "10" } }],
    history: [{ action: event, actorName: "Pessoa revisora fictícia", createdAt: "2026-10-22T14:00:00Z", version: 2 }],
  };
  const definition = templateForEvent(event, snapshot.status)!;
  const client = { rpc: async (name: string) => ({ error: null, data: name === "bind_notification_template" ? { ...definition, approval: "APPROVED" } : { type, code: snapshot.code, version: 2, hash: "fixture", snapshot, eventKey: event, includePdf: true, recipientName: "Pessoa fictícia", shortPatientName: "Paciente fictício", isDesignatedRecipient: false } }) } as unknown as SupabaseClient;
  const job = { id: "20000000-0000-4000-8000-000000000001", document_id: snapshot.id, requisition_id: null, channel: "whatsapp", destination: "+15555550101" };
  return { client, job, snapshot };
}

it("records creation time instead of the later delivery resolution time", async () => {
  const { client, job, snapshot } = fixture("ENT", "ent.resolve");
  const result = await prepareDocumentNotification(client, job, "worker-fixture");
  expect(result.templateValues?.data_hora).toBe(formatBrazilDate(snapshot.createdAt));
  expect(result.templateValues?.data_hora).not.toBe(formatBrazilDate(snapshot.history[0].createdAt));
  console.log(JSON.stringify({ probe: "event-time", observed: result.templateValues?.data_hora, expectedEventTime: formatBrazilDate(snapshot.history[0].createdAt) }));
});

it("reports zero BAL differences while one counted quantity differs from its reference", async () => {
  const { client, job } = fixture("BAL", "bal.issued");
  const result = await prepareDocumentNotification(client, job, "worker-fixture");
  expect(result.template?.name).toBe("hca_bal_aprovacao_v3");
  expect(result.templateValues?.itens_divergentes).toBe("0");
  expect(result.templateValues?.itens_ajustados).toBe("1");
  console.log(JSON.stringify({ probe: "bal-differences", observed: result.templateValues?.itens_divergentes, actualDifferingLines: 1 }));
});

it("needs 140 virtual seconds for fifty jobs with two successful 14-second requests", async () => {
  vi.useFakeTimers();
  const jobs: NotificationJob[] = Array.from({ length: 50 }, (_, index) => ({ id: `fixture-${index}`, channel: "whatsapp", destination: "+15555550101", requisition_id: null, attachment: { bytes: new Uint8Array([1]), filename: "fixture.pdf" } }));
  const client = { rpc: async (name: string) => ({ error: null, data: name === "claim_notification_jobs" ? jobs : name === "validate_notification_job" ? true : null }) } as unknown as SupabaseClient;
  const provider = new MetaWhatsAppProvider({ accessToken: "fixture-only", phoneNumberId: "1", graphVersion: "v25.0", language: "pt_BR", template: "fixture", documentTemplate: "fixture_pdf" }, async (url) => {
    await new Promise(resolve => setTimeout(resolve, 14000));
    return Response.json(String(url).endsWith("/media") ? { id: "123" } : { messages: [{ id: "fixture-message" }] });
  });
  const start = Date.now();
  const result = processNotifications(client, 50, provider);
  await vi.runAllTimersAsync();
  expect(await result).toMatchObject({ accepted: 50 });
  expect(Date.now() - start).toBe(140000);
  console.log(JSON.stringify({ probe: "worker-budget", virtualElapsedMs: Date.now() - start, configuredDurationMs: 120000, caveat: "Mocks exclude database, rendering, lease enforcement and network; no external sends" }));
});
