import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MetaWhatsAppProvider, metaConfiguration, type NotificationJob } from "@/lib/notifications/provider";
import { metaStatuses, secretMatches, verifyMetaSignature } from "@/lib/notifications/webhook";

const config = { accessToken: "TEST_SECRET", phoneNumberId: "123456", graphVersion: "v25.0", template: "event_notification", language: "pt_BR" };
const job: NotificationJob = { id: "10000000-0000-4000-8000-000000000001", channel: "whatsapp", destination: "+5511999999999", requisition_id: "20000000-0000-4000-8000-000000000001" };
afterEach(() => vi.restoreAllMocks());

describe("configured Meta adapter with deterministic test transport", () => {
  it("stays disabled without complete explicit configuration", () => {
    expect(metaConfiguration({})).toBeNull();
    expect(metaConfiguration({ NOTIFICATIONS_EXTERNAL_ENABLED: "true" })).toBeNull();
  });
  it("uses only the official fixed origin and returns acceptance rather than delivery", async () => {
    const transport = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ messages: [{ id: "wamid.fixture" }] }), { status: 200 }));
    const result = await new MetaWhatsAppProvider(config, transport).send(job);
    expect(result).toEqual({ state: "accepted", providerReference: "wamid.fixture" });
    expect(transport.mock.calls[0][0]).toBe("https://graph.facebook.com/v25.0/123456/messages");
    const body = JSON.parse(transport.mock.calls[0][1]?.body as string);
    expect(body.biz_opaque_callback_data).toBe(job.id);
    expect(body.template.components[0].parameters[0].text).toBe(job.requisition_id);
    expect(transport.mock.calls[0][1]?.redirect).toBe("error");
  });
  it("treats timeout, provider server failure and unusable success as uncertain", async () => {
    const timeout = vi.fn<typeof fetch>(async () => { throw new DOMException("timeout", "TimeoutError"); });
    const serverFailure = vi.fn<typeof fetch>(async () => new Response("failure", { status: 503 }));
    const missingReference = vi.fn<typeof fetch>(async () => new Response("{}", { status: 200 }));
    for (const transport of [timeout, serverFailure, missingReference]) expect(await new MetaWhatsAppProvider(config, transport).send(job)).toEqual({ state: "uncertain", error: "PROVIDER_RESULT_UNCERTAIN" });
  });
  it("distinguishes rejected and rate-limited requests and validates destination", async () => {
    const rejected = vi.fn<typeof fetch>(async () => new Response("{}", { status: 400 }));
    const rateLimited = vi.fn<typeof fetch>(async () => new Response("{}", { status: 429 }));
    expect(await new MetaWhatsAppProvider(config, rejected).send(job)).toMatchObject({ state: "failed" });
    expect(await new MetaWhatsAppProvider(config, rateLimited).send(job)).toMatchObject({ state: "pending" });
    const transport = vi.fn<typeof fetch>();
    expect(await new MetaWhatsAppProvider(config, transport).send({ ...job, destination: "https://attacker.test" })).toMatchObject({ state: "failed", error: "INVALID_DESTINATION" });
    expect(transport).not.toHaveBeenCalled();
  });
});

describe("Meta webhook authentication", () => {
  it("authenticates the exact raw body and rejects altered/invalid signatures", () => {
    const body = '{"event":true}';
    const signature = `sha256=${createHmac("sha256", "test-app-secret").update(body).digest("hex")}`;
    expect(verifyMetaSignature(body, signature, "test-app-secret")).toBe(true);
    expect(verifyMetaSignature(`${body} `, signature, "test-app-secret")).toBe(false);
    expect(verifyMetaSignature(body, "sha256=bad", "test-app-secret")).toBe(false);
    expect(secretMatches("token", undefined)).toBe(false);
    expect(secretMatches("token", "token")).toBe(true);
  });
  it("extracts only recognized states and supports late callback reconciliation", () => {
    expect(metaStatuses({ object: "whatsapp_business_account", entry: [{ changes: [{ value: { statuses: [{ id: "wamid.fixture", status: "sent", biz_opaque_callback_data: job.id }] } }] }] })).toEqual([{ providerReference: "wamid.fixture", state: "accepted", notificationId: job.id }]);
    expect(metaStatuses({ object: "forged", entry: [] })).toBeNull();
    expect(metaStatuses({ object: "whatsapp_business_account", entry: [{ changes: [{ value: { statuses: [{ id: "wamid.fixture", status: "invented" }] } }] }] })).toBeNull();
  });
});
