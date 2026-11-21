import { it,expect } from "vitest";
import { archiveQuerySchema,pdfArchiveEntrySchema } from "@/lib/documents/pdf-archive";
import { GET as archiveGet } from "@/app/api/documents/[id]/archive/route";
const id="10000000-0000-4000-8000-000000000001";
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

it("legacy records cannot be selected as consolidated archive entries",()=>{
 for(const kind of ["legacy_original","legacy_render"])expect(pdfArchiveEntrySchema.safeParse({kind,at:"2026-11-01T00:00:00Z",reference:id,version:1,renderer:4,sha256:"a".repeat(64)}).success).toBe(false);
});
it("a legacy download selector is rejected by the current HTTP contract",()=>{
 for(const kind of ["legacy_original","legacy_render"])expect(archiveQuerySchema.safeParse({before:"2026-11-01T00:00:00Z",kind,reference:id}).success).toBe(false);
});
it("current archive cursors retain exact ordering identity",()=>{
 expect(archiveQuerySchema.parse({before:"2026-11-01T00:00:00Z",kind:"issuance",reference:id})).toEqual({before:"2026-11-01T00:00:00Z",kind:"issuance",reference:id});
});
