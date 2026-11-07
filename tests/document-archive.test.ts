import { beforeEach, it, expect, vi } from "vitest";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { archiveQuerySchema } from "@/lib/documents/pdf-archive";
import { GET as archiveGet } from "@/app/api/documents/[id]/archive/route";
const state = vi.hoisted(() => ({ download: vi.fn() }));
vi.mock("@/lib/server/service-client", () => ({
  createWorkerClient: () => ({
    storage: { from: () => ({ download: state.download }) },
  }),
}));
import { documentPdf } from "@/lib/server/document-pdf";
const id = "10000000-0000-4000-8000-000000000001",
  bytes = Buffer.from("%PDF-fictional preserved legacy byte sequence");
function client(record: unknown) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: record, error: null })),
  };
  const value = {
    rpc: vi.fn(async () => ({
      data: { version: 3, code: "COM-0001", protocol: "COM-0001" },
      error: null,
    })),
    from: vi.fn(() => query),
  };
  return value;
}
beforeEach(() => state.download.mockReset());
it("rejects partial or unbounded archive cursors before reading authentication", async () => {
  expect(archiveQuerySchema.parse({})).toEqual({});
  for (const query of [
    { before: new Date().toISOString() },
    { kind: "issuance", reference: id },
    { before: new Date().toISOString(), kind: "forged", reference: id },
    { version: "0" },
    { version: "2147483648" },
    { reference: "x".repeat(97) },
    { path: "private.pdf" },
  ]) {
    const params = new URLSearchParams(
        Object.entries(query).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      ),
      response = await archiveGet(
        new Request(
          `https://care.example/api/documents/${id}/archive?${params}`,
        ),
        { params: Promise.resolve({ id }) },
      );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
  }
});
it("legacy download preserves bytes and rechecks live authority after privileged storage IO", async () => {
  const c = client({
    object_path: `${id}/1.pdf`,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
  state.download.mockResolvedValue({ data: new Blob([bytes]), error: null });
  const result = await documentPdf(
    c as unknown as SupabaseClient,
    id,
    1,
    "legacy",
  );
  expect(Buffer.compare(result.bytes, bytes)).toBe(0);
  expect(c.rpc).toHaveBeenCalledTimes(2);
  expect(state.download).toHaveBeenCalledExactlyOnceWith(`${id}/1.pdf`);
  c.rpc
    .mockResolvedValueOnce({
      data: { version: 3, code: "COM-0001", protocol: "COM-0001" },
      error: null,
    })
    .mockResolvedValueOnce({ data: null, error: { code: "42501" } } as never);
  await expect(
    documentPdf(c as unknown as SupabaseClient, id, 1, "legacy"),
  ).rejects.toMatchObject({ status: 403 });
});
it("legacy bytes must match their immutable digest without returning the altered content", async () => {
  const c = client({ object_path: "registered.pdf", sha256: "a".repeat(64) });
  state.download.mockResolvedValue({ data: new Blob([bytes]), error: null });
  await expect(
    documentPdf(c as unknown as SupabaseClient, id, 1, 4),
  ).rejects.toMatchObject({
    code: "PDF_BYTES_DIVERGE",
    status: 503,
    retryable: true,
  });
});
it("an unregistered legacy URL does not render, upload or claim a PDF issuance", async () => {
  const c = client(null);
  await expect(
    documentPdf(c as unknown as SupabaseClient, id, 1, 4),
  ).rejects.toMatchObject({ code: "PDF_NOT_GENERATED", status: 404 });
  expect(state.download).not.toHaveBeenCalled();
  expect(c.rpc).toHaveBeenCalledExactlyOnceWith("operational_document", {
    p_id: id,
  });
});
