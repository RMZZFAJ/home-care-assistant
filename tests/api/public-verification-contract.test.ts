import { it, expect } from "vitest";
import { GET, POST } from "@/app/api/verification/route";
import { boundedPublicPdf } from "@/lib/server/public-pdf";
import { publicPdfLimit } from "@/lib/documents/public-verification";
it("rejects unbounded, non-PDF or origin-invalid input before privileged processing", async () => {
  for (const [headers, status] of [
    [
      {
        "content-type": "application/pdf",
        "content-length": String(publicPdfLimit + 1),
      },
      413,
    ],
    [{ "content-type": "text/plain" }, 415],
    [
      { "content-type": "application/pdf", origin: "https://other.example" },
      403,
    ],
  ] as const) {
    const r = await POST(
      new Request("https://care.example/api/verification", {
        method: "POST",
        headers,
        body: "%PDF-",
      }),
    );
    expect(r.status).toBe(status);
  }
  const r = await GET(
    new Request("https://care.example/api/verification?code=123&sha256=forged"),
  );
  expect(r.status).toBe(400);
});
it("enforces actual streamed bytes even without a declared length", async () => {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(publicPdfLimit));
      controller.enqueue(new Uint8Array(1));
      controller.close();
    },
  });
  const request = new Request("https://care.example/api/verification", {
    method: "POST",
    headers: { "content-type": "application/pdf" },
    body,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
  await expect(boundedPublicPdf(request)).rejects.toMatchObject({
    code: "PAYLOAD_TOO_LARGE",
    status: 413,
  });
});
