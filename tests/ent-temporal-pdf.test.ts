import { currentPdfFixture } from "./support/current-pdf-fixture";
import { it, expect } from "vitest";
import { composeIssuance, validateIssuanceContent } from "@/lib/server/pdf-content";
import { fidelityEmission, fidelitySourceFacts, legacyFidelitySnapshots } from "./support/pdf-fidelity-fixtures";
const compact = (v: string) => v.normalize("NFKC").replaceAll(/[^\p{L}\p{N}]/gu, "").toLocaleLowerCase("pt-BR");
it("ENT labels preparation, dispatch and later exemplar generation separately even when all three dates are present", async () => {
  const source = { ...structuredClone(legacyFidelitySnapshots.find(s => s.type === "ENT")!), sourceFacts: { ...fidelitySourceFacts, draftCreatedAt: "2026-10-31T12:00:00Z", documentCreatedAt: "2026-11-01T12:00:00Z", issuedAt: "2026-11-02T12:00:00Z" }, documentFacts: { schemaVersion: 1, deliveryResolutions: [], purchaseReceiptEvents: [] } };
  const plan = await composeIssuance(currentPdfFixture(source), "c".repeat(64), { ...fidelityEmission, rendererRevision: 16 });
  const body = compact(plan.runs.filter(r => !r.decoration).map(r => r.text).join(" "));
  for(const pair of ["02/11/2026,09:00","08/11/2026,06:00"])expect(body,pair).toContain(compact(pair));
  expect((source.sourceFacts as typeof fidelitySourceFacts).draftCreatedAt).toBe("2026-10-31T12:00:00Z");
  expect((source.sourceFacts as typeof fidelitySourceFacts).documentCreatedAt).toBe("2026-11-01T12:00:00Z");

  expect(plan.identity.requestedAt).toBe("2026-11-08T09:00:00Z");
  await expect(validateIssuanceContent(plan.bytes, { ...plan, semanticFacts: { ...plan.semanticFacts, "source/issuedAt": "01/11/2026, 09:00" } })).rejects.toMatchObject({ code: "CONTENT_INVALID" });
}, 30000);
