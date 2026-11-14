import { describe, expect, it } from "vitest";
import { avatarCommandSchema, avatarAttemptSchema, parseAvatarRead } from "@/lib/validation/avatar";
import { ApiError, databaseError } from "@/lib/server/api";

const id = "10000000-0000-4000-8000-000000000001";
const attempt = { id, key: id, sourceHash: "1".repeat(64), sourceSize: 100, filename: "Foto original.png", referenceRevision: 1, prepared: true, verified: false, state: "pending", current: false, createdAt: "2026-11-09T00:00:00Z", appliedAt: null };
describe("recoverable own avatar contract", () => {
  it("retains an opaque filename and source identity while stripping server-only object and attestation fields", () => {
    const value = avatarAttemptSchema.parse({ ...attempt, objectPath: "private-internal-path", expectedHash: "2".repeat(64) });
    expect(value.filename).toBe("Foto original.png"); expect(value.sourceHash).toBe(attempt.sourceHash);
    expect(value).not.toHaveProperty("objectPath"); expect(value).not.toHaveProperty("expectedHash");
  });
  it("refuses browser-supplied owner, paths, verification, state and reference in a recovery command", () => {
    for (const patch of [{ ownerId: id }, { objectPath: "other/photo.jpg" }, { verified: true }, { state: "applied" }, { referenceRevision: 2 }])
      expect(avatarCommandSchema.safeParse({ action: "recover", key: id, ...patch }).success).toBe(false);
    expect(avatarCommandSchema.parse({ action: "abandon", key: id })).toEqual({ action: "abandon", key: id });
  });
  it("does not turn malformed or unavailable reads into an empty profile or editable historical facts", () => {
    expect(parseAvatarRead({ referenceRevision: 2, attempt: null, avatar: null, avatarUnavailable: true }).avatarUnavailable).toBe(true);
    for (const value of [null, {}, { referenceRevision: 1, attempt, avatar: null }, { referenceRevision: 0, attempt: null, avatar: null, avatarUnavailable: false }])
      expect(() => parseAvatarRead(value)).toThrow("Não foi possível conferir a consulta da foto");
  });
  it("maps a permanent avatar conflict without a stock recount instruction or transient database code", () => {
    for (const message of ["avatar reference changed", "avatar intention pending", "avatar not verified", "avatar bytes differ", "avatar already applied"])
      expect(() => databaseError({ code: "P0001", message })).toThrowError(expect.objectContaining({ code: "VERSION_CONFLICT", status: 409 }));
    expect(() => databaseError({ code: "P0001", message: "avatar intention differs" })).toThrowError(expect.objectContaining({ code: "IDEMPOTENCY_CONFLICT", status: 409 }));
  });
  it("keeps authorization denial distinct from an editable photo conflict", () => {
    try { databaseError({ code: "42501", message: "avatar unavailable" }); }
    catch (error) { expect(error).toBeInstanceOf(ApiError); expect(error).toMatchObject({ code: "FORBIDDEN", status: 403 }); return; }
    throw new Error("Authorization failure was accepted");
  });
});
