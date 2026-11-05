import { describe, expect, it } from "vitest";
import { z } from "zod";
import { readJson } from "@/lib/server/api";
import { exactQuantity } from "@/lib/validation/documents";

const request = (body: string) => new Request("https://care.example/api/documents", { method: "POST", headers: { "content-type": "application/json", origin: "https://care.example" }, body });
describe("JSON number fidelity at the HTTP boundary", () => {
  it("rejects a numeric token that would round or underflow before quantity validation", async () => {
    for (const token of ["1.0000000000000001", "1e-999"])
      await expect(readJson(request('{"quantity":' + token + '}'), z.object({ quantity: exactQuantity }))).rejects.toMatchObject({ code: "VALIDATION_ERROR", status: 400 });
    await expect(readJson(request('{"revision":9007199254740993}'), z.object({ revision: z.number() }))).rejects.toMatchObject({ code: "VALIDATION_ERROR", status: 400 });
  });
  it("preserves accepted numeric and textual values, equivalent final zeros and ordinary metadata", async () => {
    for (const token of ["1.25", '"1,25"', '"1.2500000"']) expect(await readJson(request('{"quantity":' + token + '}'), z.object({ quantity: exactQuantity }))).toEqual({ quantity: "1.25" });
    expect(await readJson(request('{"quantity":0.000001,"revision":12,"enabled":true}'), z.object({ quantity: exactQuantity, revision: z.number().int(), enabled: z.boolean() }))).toEqual({ quantity: "0.000001", revision: 12, enabled: true });
  });
});
