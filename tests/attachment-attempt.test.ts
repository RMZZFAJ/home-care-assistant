import { describe, expect, it } from "vitest";
import { attachmentForm, attachmentMaxBytes, confirmedAttachment, freezeAttachment } from "@/lib/documents/attachment-attempt";

describe("frozen attachment intent", () => {
  it("retains original bytes, name, key and fingerprint when a new picker choice exists", async () => {
    const original = new File(["original"], "ficha.png", { type: "image/png" }), another = new File(["altered"], "outra.png", { type: "image/png" });
    const pending = await freezeAttachment(original), form = attachmentForm(pending, "patient", "document");
    expect(Object.isFrozen(pending)).toBe(true);
    expect(await (form.get("file") as File).text()).toBe("original");
    expect(form.get("idempotencyKey")).toBe(pending.key);
    expect((form.get("file") as File).name).not.toBe(another.name);
    expect(attachmentForm(pending, "patient", "document").get("idempotencyKey")).toBe(pending.key);
  });
  it("accepts only a complete receipt for this original and reservation", async () => {
    const pending = await freezeAttachment(new File(["bytes"], "ficha.pdf")), id = crypto.randomUUID();
    const receipt = { id, sha256: "a".repeat(64), sourceSha256: pending.sourceSha256, persistence: "confirmed" };
    expect(confirmedAttachment(receipt, pending.sourceSha256, id)).toEqual(receipt);
    for (const body of [{}, { ...receipt, persistence: "prepared" }, { ...receipt, id: crypto.randomUUID() }, { ...receipt, sha256: "invalid" }, { ...receipt, sourceSha256: "b".repeat(64) }]) expect(confirmedAttachment(body, pending.sourceSha256, id)).toBeNull();
  });
  it("keeps the request envelope below the documented function ceiling", () => {
    expect(attachmentMaxBytes + 32_000).toBeLessThan(4_500_000);
  });
});
