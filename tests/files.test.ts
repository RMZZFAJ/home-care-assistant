import { describe, expect, it } from "vitest";
import { PDFDocument, PDFName, PDFString } from "pdf-lib";
import sharp from "sharp";
import { sanitizeFile } from "@/lib/server/files";

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
});
