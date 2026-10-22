import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  type PDFObject,
} from "pdf-lib";
import sharp from "sharp";
import { ApiError } from "./api";

function assertPassivePdf(document: PDFDocument) {
  const visited = new Set<PDFObject>();
  let count = 0;
  const prohibited = new Set([
    "javascript",
    "js",
    "launch",
    "embeddedfile",
    "richmedia",
    "openaction",
    "aa",
    "xfa",
  ]);
  function inspect(object: PDFObject, depth = 0) {
    if (visited.has(object)) return;
    visited.add(object);
    if (++count > 100_000 || depth > 64)
      throw new Error("PDF complexity limit");
    if (
      object instanceof PDFName &&
      prohibited.has(object.decodeText().toLowerCase())
    )
      throw new Error("Active PDF content");
    if (object instanceof PDFDict)
      for (const [key, value] of object.entries()) {
        inspect(key, depth + 1);
        inspect(value, depth + 1);
      }
    else if (object instanceof PDFArray)
      for (const value of object.asArray()) inspect(value, depth + 1);
  }
  for (const [, object] of document.context.enumerateIndirectObjects())
    inspect(object);
}

export async function boundedUpload(request: Request, maxBytes = 10_485_760) {
  if (Number(request.headers.get("content-length") ?? 0) > maxBytes + 32_000)
    throw new ApiError("PAYLOAD_TOO_LARGE", "O anexo deve ter até 10 MB.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError("VALIDATION_ERROR", "Selecione um arquivo.");
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes + 32_000) {
        await reader.cancel();
        throw new ApiError(
          "PAYLOAD_TOO_LARGE",
          "O anexo deve ter até 10 MB.",
          413,
        );
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const form = await new Response(Buffer.concat(parts), {
    headers: { "content-type": request.headers.get("content-type") ?? "" },
  })
    .formData()
    .catch(() => {
      throw new ApiError("VALIDATION_ERROR", "Arquivo inválido.");
    });
  const file = form.get("file");
  if (!(file instanceof File) || !file.size || file.size > maxBytes)
    throw new ApiError(
      "VALIDATION_ERROR",
      "Selecione um arquivo de até 10 MB.",
    );
  return { form, file, bytes: Buffer.from(await file.arrayBuffer()) };
}
export async function sanitizeFile(
  bytes: Buffer,
  declaredMime: string,
  avatar = false,
) {
  if (
    bytes.subarray(0, 5).toString() === "%PDF-" &&
    declaredMime === "application/pdf" &&
    !avatar
  ) {
    if (
      /\/(?:JavaScript|JS|Launch|EmbeddedFile|RichMedia|OpenAction|AA)\b/.test(
        bytes.toString("latin1"),
      )
    )
      throw new ApiError(
        "VALIDATION_ERROR",
        "Envie um PDF sem scripts ou arquivos incorporados.",
      );
    try {
      const original = await PDFDocument.load(bytes);
      assertPassivePdf(original);
      if (original.getPageCount() > 100) throw new Error();
      const clean = await PDFDocument.create();
      clean.setCreationDate(new Date("2000-01-01T00:00:00Z"));
      clean.setModificationDate(new Date("2000-01-01T00:00:00Z"));
      const pages = await clean.copyPages(original, original.getPageIndices());
      pages.forEach((page) => {
        page.node.delete(PDFName.of("Annots"));
        clean.addPage(page);
      });
      return {
        bytes: Buffer.from(await clean.save()),
        mime: "application/pdf",
      };
    } catch {
      throw new ApiError(
        "VALIDATION_ERROR",
        "PDF inválido, protegido ou acima de 100 páginas.",
      );
    }
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(declaredMime))
    throw new ApiError(
      "VALIDATION_ERROR",
      "Use imagem JPEG, PNG, WebP ou PDF.",
    );
  try {
    const image = sharp(bytes, {
      limitInputPixels: 40_000_000,
      animated: false,
    });
    const metadata = await image.metadata();
    if (
      !["jpeg", "png", "webp"].includes(metadata.format ?? "") ||
      (metadata.pages && metadata.pages > 1)
    )
      throw new Error();
    return {
      bytes: await image
        .rotate()
        .resize(avatar ? 512 : 4096, avatar ? 512 : 4096, {
          fit: avatar ? "cover" : "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 88 })
        .toBuffer(),
      mime: "image/jpeg",
    };
  } catch {
    throw new ApiError(
      "VALIDATION_ERROR",
      "Imagem inválida ou acima do limite de resolução.",
    );
  }
}
