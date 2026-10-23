import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { demoDocuments } from "@/lib/demo-documents";
import { renderDocumentPdf } from "@/lib/server/operational-pdf";

describe("approved document presentation", () => {
  it("renders all four types, pending science and confirmed receipts as distinct paginated artifacts", async () => {
    await mkdir(".private/v4/pdf", { recursive: true });
    const filenames = ["req-issued", "req-science", "ent-pending", "ent-confirmed", "com", "bal"];
    const hashes: string[] = [];
    for (const [index, snapshot] of Object.values(demoDocuments).entries()) {
      const hash = createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
      const bytes = await renderDocumentPdf(snapshot, hash);
      const pdf = await PDFDocument.load(bytes);
      expect(pdf.getPageCount()).toBeGreaterThanOrEqual(2);
      expect(pdf.getTitle()).toContain(snapshot.code);
      expect(pdf.getPages().every(page => Math.abs(page.getWidth()-595.28) < 0.01)).toBe(true);
      hashes.push(createHash("sha256").update(bytes).digest("hex"));
      await writeFile(`.private/v4/pdf/${filenames[index]}.pdf`, bytes);
    }
    expect(new Set(hashes).size).toBe(6);
  }, 45000);
  it("paginates long material lists and unbroken hashes without dropping pages", async () => {
    const first = Object.values(demoDocuments)[0];
    const bytes = await renderDocumentPdf({ ...first, lines: Array.from({ length: 80 }, (_, index) => ({ ...first.lines[0], product_name_snapshot: `Produto ${index} com nome extenso para conferir quebra e legibilidade`, name_snapshot: `Produto ${index} com nome extenso para conferir quebra e legibilidade` })) }, "a".repeat(64));
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(4);
  }, 20000);
});
