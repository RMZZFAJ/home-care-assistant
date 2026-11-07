import { describe, expect, it } from "vitest";
import { POST as preference } from "@/app/api/profile/science/route";
import { POST as science } from "@/app/api/requisitions/[id]/science/route";
import { GET as openings, POST as display } from "@/app/api/requisitions/[id]/openings/route";
import { ApiError, databaseError } from "@/lib/server/api";

const id = "20000000-0000-4000-8000-000000000001";
const request = (body: unknown) => new Request("https://care.example/api/profile/science", { method: "POST", headers: { "content-type": "application/json", origin: "https://care.example" }, body: JSON.stringify(body) });
describe("P02 boundaries", () => {
  it("refuses a forged opening actor, invalid references and unsafe pagination before authentication", async () => {
    const base = { materialIdentity: "a".repeat(64), referenceVersion: 1, openingKey: id };
    for (const body of [{ ...base, userId: id }, { ...base, origin: "human_read" }, { ...base, referenceVersion: 0 }, { ...base, materialIdentity: "" }]) {
      const response = await display(request(body), { params: Promise.resolve({ id }) }); expect(response.status).toBe(400);
    }
    for (const query of ["beforeAt=bad&beforeId=" + id, "beforeId=" + id, "beforeAt=2026-11-05T18:25:00Z&beforeId=bad"]) {
      const response = await openings(new Request("https://care.example/api/requisitions/" + id + "/openings?" + query), { params: Promise.resolve({ id }) }); expect(response.status).toBe(400);
    }
  });
  it("refuses forged owners, absent consent and invalid versions before authentication or storage", async () => {
    const base = { mode: "manual", consent: false, expectedVersion: 0, idempotencyKey: id };
    for (const body of [{ ...base, userId: id }, { ...base, mode: "tacit" }, { ...base, consent: null }, { ...base, expectedVersion: 2147483648 }]) {
      const response = await preference(request(body)); expect(response.status).toBe(400); expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    }
  });
  it("refuses visibility/WhatsApp/tacit commands and dialogue without its material reference", async () => {
    for (const body of [{ mode: "app_visible", expectedVersion: 1 }, { mode: "whatsapp_read", expectedVersion: 1 }, { mode: "tacit", expectedVersion: 1 }, { mode: "dialog", expectedVersion: 1 }, { mode: "express", expectedVersion: 2147483648 }]) {
      const response = await science(request(body), { params: Promise.resolve({ id }) }); expect(response.status).toBe(400); expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    }
  });
  it("describes a preference/material conflict without asking for a stock recount", () => {
    for (const message of ["stale preference version", "science preference or authority changed", "stale document material"]) {
      try { databaseError({ code: "PT409", message }); expect.unreachable(); }
      catch (error) { expect(error).toBeInstanceOf(ApiError); expect(error).toMatchObject({ code: "VERSION_CONFLICT", status: 409 }); expect((error as Error).message).not.toMatch(/estoque|contagem/i); }
    }
  });
  it("describes a historical source as read-only without allowing a retry as a new operational link", () => {
    try { databaseError({ code: "23514", message: "historical requisition is read only" }); expect.unreachable(); }
    catch (error) { expect(error).toMatchObject({ code: "VALIDATION_ERROR", status: 400, retryable: false }); expect((error as Error).message).toContain("histórica é somente consulta"); }
  });
});
