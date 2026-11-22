import { describe, expect, it } from "vitest";
import { PDFDocument, PDFName, PDFString } from "pdf-lib";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { boundedUpload, sanitizeFile } from "@/lib/server/files";
import { attachmentMaxBytes } from "@/lib/documents/attachment-attempt";

describe("private evidence normalization", () => {
  it("strips image metadata and applies the stored orientation", async () => {
    const source = await sharp({
      create: { width: 8, height: 4, channels: 3, background: "#123456" },
    })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
    const result = await sanitizeFile(source, "image/jpeg");
    const metadata = await sharp(result.bytes).metadata();
    expect(result.mime).toBe("image/jpeg");
    expect(metadata.width).toBe(4);
    expect(metadata.height).toBe(8);
    expect(metadata.exif).toBeUndefined();
    expect(await sanitizeFile(source, "image/jpeg")).toEqual(result);
  });
  it("rejects active PDF actions even when compressed in object streams", async () => {
    const source = await PDFDocument.create();
    const page = source.addPage();
    page.node.set(
      PDFName.of("AA"),
      source.context.obj({
        O: {
          S: PDFName.of("JavaScript"),
          JS: PDFString.of("app.alert('test')"),
        },
      }),
    );
    const bytes = Buffer.from(await source.save({ useObjectStreams: true }));
    await expect(sanitizeFile(bytes, "application/pdf")).rejects.toThrow();
  });
  it("retains passive page content in deterministic sanitized PDFs", async () => {
    const source = await PDFDocument.create();
    source.addPage().drawText("Evidence");
    const bytes = Buffer.from(await source.save());
    const first = await sanitizeFile(bytes, "application/pdf");
    const second = await sanitizeFile(bytes, "application/pdf");
    expect(first).toEqual(second);
    expect((await PDFDocument.load(first.bytes)).getPageCount()).toBe(1);
    await expect(
      sanitizeFile(Buffer.from("invalid"), "image/png"),
    ).rejects.toThrow();
  });
  it.each(["FreeText", "Ink"])("refuses passive %s annotations with a specific explanation instead of deleting visible evidence", async subtype => {
    const source = await PDFDocument.create(), page = source.addPage();
    page.drawText("Documento com ressalva que deve permanecer visivel");
    const annotation = source.context.obj({ Type: "Annot", Subtype: subtype, Rect: [20, 20, 400, 100], Contents: PDFString.of("RESSALVA: faltam duas unidades"), ...(subtype === "Ink" ? { InkList: [[20, 20, 200, 90]] } : { DA: PDFString.of("/Helv 12 Tf 0 g") }) });
    page.node.set(PDFName.of("Annots"), source.context.obj([source.context.register(annotation)]));
    await expect(sanitizeFile(Buffer.from(await source.save({ useObjectStreams: true })), "application/pdf")).rejects.toMatchObject({ code: "PDF_ANNOTATIONS_UNSUPPORTED", status: 400 });
  });
  it("refuses a visible form field rather than dropping its value during page copying", async () => {
    const source = await PDFDocument.create(), page = source.addPage();
    const field = source.getForm().createTextField("ressalva");
    field.setText("Duas unidades faltantes"); field.addToPage(page, { x: 20, y: 20, width: 300, height: 30 });
    await expect(sanitizeFile(Buffer.from(await source.save()), "application/pdf")).rejects.toMatchObject({ code: "PDF_ANNOTATIONS_UNSUPPORTED" });
  });
  it("rejects the retained B6 annotation counterexample and accepts its passive-page control", async () => {
    const base = "docs/audits/B/B6/2026-10-30-phase-b6-documents/evidence/attachments/";
    await expect(sanitizeFile(await readFile(base + "annotation-source.pdf"), "application/pdf")).rejects.toMatchObject({ code: "PDF_ANNOTATIONS_UNSUPPORTED" });
    const result = await sanitizeFile(await readFile(base + "content-source.pdf"), "application/pdf");
    expect((await PDFDocument.load(result.bytes)).getPageCount()).toBe(1);
  });
  it("accepts a full4MiB multipart file and rejects the next byte without relying on content-length", async () => {
    for (const extra of [0, 1]) {
      const form = new FormData(); form.set("file", new File([new Uint8Array(attachmentMaxBytes + extra)], "boundary.png", { type: "image/png" }));
      const request = new Request("http://127.0.0.1/api/attachments", { method: "POST", body: form });
      expect(request.headers.get("content-length")).toBeNull();
      if (extra) await expect(boundedUpload(request)).rejects.toMatchObject({ code: "PAYLOAD_TOO_LARGE", status: 413 });
      else expect((await boundedUpload(request)).bytes.length).toBe(attachmentMaxBytes);
    }
  });
});
