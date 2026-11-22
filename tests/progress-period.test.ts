import { expect, it } from "vitest";
import { parseProgressPage } from "@/lib/validation/document-progress";
const id = "11111111-1111-4111-8111-111111111111";
it("binds a chronology result to its civil period and refuses UTC-day substitution", () => {
  const page = { documentId: id, documentType: "REQ", filter: "all", page: 1, size: 20, total: 1, canPublish: false, from: "2026-11-13", through: "2026-11-13", timeZone: "America/Sao_Paulo", data: [{ id, source: "automatic", documentId: id, action: "req.issued", version: 1, recordedAt: "2026-11-14T02:30:00Z", authorId: id, authorName: "Pessoa fictícia" }] };
  const period = { from: "2026-11-13", through: "2026-11-13" };
  expect(parseProgressPage(page, id, "all", 1, period).total).toBe(1);
  expect(() => parseProgressPage({ ...page, through: "2026-11-14" }, id, "all", 1, period)).toThrow();
  expect(() => parseProgressPage({ ...page, timeZone: "UTC" }, id, "all", 1, period)).toThrow();
  expect(() => parseProgressPage({ ...page, data: [{ ...page.data[0], recordedAt: "2026-11-14T03:00:00Z" }] }, id, "all", 1, period)).toThrow();
});
