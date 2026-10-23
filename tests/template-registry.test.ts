import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  templates,
  templateForEvent,
  namedBody,
  templateButtons,
  whatsappEvents,
} from "@/lib/notifications/template-registry";
import { MetaWhatsAppProvider } from "@/lib/notifications/provider";
import type { SupabaseClient } from "@supabase/supabase-js";
import { prepareDocumentNotification } from "@/lib/notifications/document-notification";

describe("immutable Meta event contracts", () => {
  it("reports a PDF configuration hold before rendering or sending a document template", async () => {
    const definition = templateForEvent("req.science_satisfied")!;
    const client = {
      rpc: async (name: string) => ({
        error: null,
        data:
          name === "bind_notification_template"
            ? { ...definition, approval: "APPROVED" }
            : {
                type: "REQ",
                code: "REQ-0001",
                version: 1,
                hash: "test",
                eventKey: "req.science_satisfied",
                includePdf: false,
                snapshot: { type: "REQ", lines: [], history: [] },
              },
      }),
    } as unknown as SupabaseClient;
    const result = await prepareDocumentNotification(
      client,
      {
        id: "10000000-0000-4000-8000-000000000001",
        document_id: "20000000-0000-4000-8000-000000000001",
        requisition_id: null,
        channel: "whatsapp",
        destination: "+15555550102",
      },
      "30000000-0000-4000-8000-000000000001",
    );
    expect(result.preparationError).toBe("PDF_TEMPLATE_VARIANT_REQUIRED");
    expect(result.attachment).toBeUndefined();
  });
  it("keeps database routing and external templates in one tested contract", () => {
    const sql = readFileSync(
      "supabase/migrations/20261023120000_v4_review_regressions.sql",
      "utf8",
    );
    const allowed = [
      ...sql.match(/p_event=any\(array\[([^\]]*)\]/)![1].matchAll(/'([^']+)'/g),
    ].map((match) => match[1]);
    expect(allowed.sort()).toEqual([...whatsappEvents].sort());
    for (const event of whatsappEvents)
      for (const status of [
        "pending_receipt",
        "confirmed",
        "received",
        "approved",
      ])
        expect(templateForEvent(event, status, true)).not.toBeNull();
    for (const event of [
      "req.science_recorded",
      "req.reopened",
      "req.archived.manual",
      "req.archived.automatic",
      "com.approve",
    ])
      expect(templateForEvent(event)).toBeNull();
    expect(templateForEvent("com.submit")?.name).toBe("hca_com_aprovacao_v3");
  });
  it("initial confirmation has no PDF and satisfied science uses a different named template", () => {
    const initial = templateForEvent("req.registered_author")!;
    const acknowledged = templateForEvent("req.science_satisfied")!;
    expect(initial.name).not.toBe(acknowledged.name);
    expect(
      initial.components.some((component) => component.format === "DOCUMENT"),
    ).toBe(false);
    expect(
      acknowledged.components.some(
        (component) => component.format === "DOCUMENT",
      ),
    ).toBe(true);
  });
  it("requires every named value and derives quick reply/URL indices from the registered order", () => {
    const template = templates.find(
      (row) => row.name === "hca_ent_confirmar_pdf_v3",
    )!;
    expect(() => namedBody(template, {})).toThrow("MISSING_TEMPLATE_PARAMETER");
    const values = Object.fromEntries(
      template.components
        .find((row) => row.type === "BODY")!
        .example!.body_text_named_params!.map((row) => [
          row.param_name,
          row.example,
        ]),
    );
    expect(
      namedBody(template, values).every(
        (row) => row.parameter_name && row.type === "text",
      ),
    ).toBe(true);
    const buttons = templateButtons(
      template,
      "opaque-document-id",
      "one-time-token",
    );
    expect(buttons).toMatchObject([
      { index: "0", sub_type: "quick_reply" },
      { index: "1", sub_type: "url" },
    ]);
    expect(() => templateButtons(template, "id")).toThrow(
      "VERIFIED_CHALLENGE_REQUIRED",
    );
  });
  it("never uploads private PDF bytes for an unapproved template", async () => {
    let requests = 0;
    const provider = new MetaWhatsAppProvider(
      {
        accessToken: "test-only",
        phoneNumberId: "1",
        graphVersion: "v25.0",
        template: "legacy",
        language: "pt_BR",
      },
      async () => {
        requests++;
        return Response.json({});
      },
    );
    const result = await provider.send({
      id: "test",
      document_id: "test",
      requisition_id: null,
      destination: "+15555550101",
      channel: "whatsapp",
      template: templateForEvent("req.science_satisfied")!,
      attachment: { bytes: new Uint8Array([1]), filename: "test.pdf" },
    });
    expect(result).toEqual({
      state: "pending",
      error: "TEMPLATE_NOT_APPROVED",
    });
    expect(requests).toBe(0);
  });
  it("all dynamic URLs use the official domain and a single suffix at the end", () => {
    for (const template of templates)
      for (const button of template.components.find(
        (row) => row.type === "BUTTONS",
      )?.buttons ?? []) {
        if (button.type === "URL") {
          expect(button.url).toMatch(
            /^https:\/\/home-care-assistant\.vercel\.app\//,
          );
          expect(button.url?.endsWith("{{1}}")).toBe(true);
        }
      }
  });
});
