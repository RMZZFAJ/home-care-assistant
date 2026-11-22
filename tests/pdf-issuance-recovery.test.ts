import { beforeAll, beforeEach, afterAll, afterEach, it, expect, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { testSigningIdentity } from "./support/test-signing-identity.mjs";
import { modeSource, modeEmission, modeId } from "./support/pdf-mode-fixtures";
import { type PdfIssuance } from "@/lib/documents/pdf-issuance";
import { type DocumentSnapshot } from "@/lib/server/operational-pdf";
import { type PdfDocumentExpansion } from "@/lib/documents/pdf-modes";
import { ApiError } from "@/lib/server/api";
import { issuePdf, downloadPdfIssuance } from "@/lib/server/pdf-issuance";
import { loadPdfSigningProvider, type PdfTrustConfiguration } from "@/lib/server/pdf-signing/providers";

// Controlled RPC/Storage faults qualify the orchestrator only. Native Auth,
// leases and database authorization remain covered by integration/browser cases.
const adapters = vi.hoisted(() => ({ rpc: vi.fn(), worker: vi.fn(), signing: vi.fn() }));
vi.mock("@/lib/server/api", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/server/api")>(), rpc: adapters.rpc }));
vi.mock("@/lib/server/service-client", () => ({ createWorkerClient: adapters.worker }));
vi.mock("@/lib/server/pdf-signing/providers", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/server/pdf-signing/providers")>(), loadPdfSigningProvider: adapters.signing }));
let identity: Awaited<ReturnType<typeof testSigningIdentity>>, policy: PdfTrustConfiguration;
let row: PdfIssuance & { snapshot: DocumentSnapshot; sourceHash: string; objectPath: string };
let object: Uint8Array | null, uploads: number, completeCount: number;
let fault: "none" | "before-upload" | "upload-response" | "complete-response";
const client = {} as SupabaseClient, key = modeId(601), origin = "http://127.0.0.1:3100";
const names = ["VERCEL_ENV", "HCA_PDF_TRUST_POLICY", "HCA_PDF_TRUST_POLICY_FILE", "HCA_PDF_SIGNING_SECRET", "HCA_PDF_SIGNING_SECRET_FILE"];
const previous = names.map(name => process.env[name]);
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const recover = () => issuePdf(client, row.documentId, key, row.version, origin, row.documentOptions);
beforeAll(async () => { identity = await testSigningIdentity(); policy = JSON.parse(await readFile(identity.trustFile, "utf8")); }, 90000);
beforeEach(async () => {
  names.forEach(name => { delete process.env[name]; });
  process.env.HCA_PDF_TRUST_POLICY = JSON.stringify(policy);
  process.env.HCA_PDF_SIGNING_SECRET_FILE = identity.secretFile;
  object = null; uploads = 0; completeCount = 0; fault = "none";
  const snapshot = modeSource("REQ", "expanded", 0);
  row = { id: modeId(600), documentId: snapshot.id, careRecipientId: modeId(602), version: snapshot.version, requestedBy: modeId(603), requestedName: modeEmission.requestedName,
    requestedAt: modeEmission.requestedAt, readyAt: null, verificationCode: modeEmission.verificationCode, rendererRevision: 17,
    documentOptions: (snapshot.documentExpansion as PdfDocumentExpansion).options, representation: "operational", state: "reserved", step: "reserved",
    sha256: null, sizeBytes: null, validation: null, keyVersion: null, trustRevision: null, lastError: null,
    snapshot, sourceHash: "a".repeat(64), objectPath: "synthetic-recovery/" + modeId(600) + ".pdf" };
  const actual = await vi.importActual<typeof import("@/lib/server/pdf-signing/providers")>("@/lib/server/pdf-signing/providers");
  adapters.signing.mockReset().mockImplementation(actual.loadPdfSigningProvider);
  adapters.rpc.mockReset().mockImplementation(async (_client: SupabaseClient, name: string, args: Record<string, unknown>) => {
    if (name === "reserve_pdf_expanded_issuance") { expect(args.p_key).toBe(key); expect(args.p_options).toEqual(row.documentOptions); return structuredClone(row); }
    if (name === "pdf_issuance") return structuredClone(row);
    if (name === "pdf_issuance_stage") {
      if (row.state === "ready") throw new ApiError("PERSISTENCE_UNCONFIRMED", "Completed lease cannot be changed");
      row.step = args.p_step as PdfIssuance["step"];
      if (row.step === "uncertain") { row.state = "uncertain"; row.lastError = args.p_error as PdfIssuance["lastError"]; }
      if (row.step === "persisting" && fault === "before-upload") { fault = "none"; throw new ApiError("PERSISTENCE_UNCONFIRMED", "Controlled pre-upload interruption"); }
      return structuredClone(row);
    }
    if (name === "complete_pdf_issuance") {
      expect(object).not.toBeNull(); expect(args.p_hash).toBe(hash(object!)); expect(args.p_size).toBe(object!.length);
      row = { ...row, state: "ready", step: "ready", readyAt: new Date().toISOString(), sha256: args.p_hash as string, sizeBytes: args.p_size as number,
        validation: args.p_validation as PdfIssuance["validation"], keyVersion: args.p_key_version as string, trustRevision: args.p_trust_revision as string, lastError: null };
      completeCount++;
      if (fault === "complete-response") { fault = "none"; throw new ApiError("PERSISTENCE_UNCONFIRMED", "Controlled lost completion response"); }
      return structuredClone(row);
    }
    throw new Error("Unexpected controlled RPC: " + name);
  });
  adapters.worker.mockReset().mockReturnValue({
    rpc: async () => { row.state = "processing"; return { data: { objectPath: row.objectPath, workerToken: "controlled-native-boundary-token" }, error: null }; },
    storage: { from: () => ({
      download: async () => object ? { data: new Blob([Uint8Array.from(object)]), error: null } : { data: null, error: { statusCode: "404", message: "not found" } },
      upload: async (_path: string, bytes: Uint8Array, options: { upsert: boolean }) => {
        expect(options.upsert).toBe(false); expect(object).toBeNull(); object = Uint8Array.from(bytes); uploads++;
        if (fault === "upload-response") { fault = "none"; throw new ApiError("PERSISTENCE_UNCONFIRMED", "Controlled lost upload response"); }
        return { data: {}, error: null };
      },
    }) },
  });
});
afterEach(() => names.forEach((name, i) => { if (previous[i] === undefined) delete process.env[name]; else process.env[name] = previous[i]; }));
afterAll(async () => { await identity?.dispose(); });

it("recovers a real TSA failure on the same intention without publishing an unsigned or B-B fallback", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/pdf-signing/providers")>("@/lib/server/pdf-signing/providers");
  adapters.signing.mockImplementationOnce(async () => ({ ...await actual.loadPdfSigningProvider(), timestampAuthority: { timestamp: async () => { throw new Error("Controlled TSA interruption"); } } }));
  await expect(recover()).rejects.toMatchObject({ code: "SIGNING_UNAVAILABLE" });
  expect(row).toMatchObject({ id: modeId(600), state: "uncertain", lastError: "SIGNING_UNAVAILABLE" });
  expect(object).toBeNull(); expect(completeCount).toBe(0);
  expect(await recover()).toMatchObject({ id: modeId(600), state: "ready", validation: { accepted: true, profile: "PAdES-B-T" } });
  expect(uploads).toBe(1); expect(completeCount).toBe(1);
}, 30000);

it("recovers an interruption after signing but before upload without advertising readiness", async () => {
  fault = "before-upload";
  await expect(recover()).rejects.toMatchObject({ code: "PERSISTENCE_UNCONFIRMED" });
  expect(row.state).toBe("uncertain"); expect(object).toBeNull(); expect(uploads).toBe(0); expect(completeCount).toBe(0);
  expect((await recover()).state).toBe("ready"); expect(completeCount).toBe(1); expect(uploads).toBe(1);
}, 30000);

it("reconciles a committed upload with a lost response using the exact stored bytes and no private signing key", async () => {
  fault = "upload-response";
  await expect(recover()).rejects.toMatchObject({ code: "PERSISTENCE_UNCONFIRMED" });
  expect(object).not.toBeNull(); expect(row.state).toBe("uncertain"); const storedHash = hash(object!);
  delete process.env.HCA_PDF_SIGNING_SECRET_FILE;
  const before = adapters.signing.mock.calls.length;
  const result = await recover();
  expect(result).toMatchObject({ id: modeId(600), state: "ready", sha256: storedHash });
  expect(adapters.signing.mock.calls.length).toBe(before); expect(uploads).toBe(1); expect(completeCount).toBe(1);
  expect(hash((await downloadPdfIssuance(client, row.documentId, row.id)).bytes)).toBe(storedHash);
}, 30000);

it("reconciles a committed completion with a lost response without completing or uploading twice", async () => {
  fault = "complete-response";
  await expect(recover()).rejects.toMatchObject({ code: "PERSISTENCE_UNCONFIRMED" });
  expect(row.state).toBe("ready"); const storedHash = hash(object!);
  expect(await recover()).toMatchObject({ state: "ready", sha256: storedHash });
  expect(uploads).toBe(1); expect(completeCount).toBe(1);
  expect(hash((await downloadPdfIssuance(client, row.documentId, row.id)).bytes)).toBe(storedHash);
}, 30000);

it("does not finalize a cached signed file whose covered bytes were altered during uncertain persistence", async () => {
  fault = "upload-response";
  await expect(recover()).rejects.toMatchObject({ code: "PERSISTENCE_UNCONFIRMED" });
  const altered = Uint8Array.from(object!); altered[7] = altered[7] === 55 ? 54 : 55; object = altered;
  await expect(recover()).rejects.toMatchObject({ code: "SIGNATURE_INVALID" });
  expect(row.state).toBe("uncertain"); expect(completeCount).toBe(0); expect(uploads).toBe(1);
}, 30000);

it("rechecks current public trust on download without altering the historical issuance or re-signing its bytes", async () => {
  const result = await recover(), storedHash = hash(object!), signedCalls = adapters.signing.mock.calls.length;
  process.env.HCA_PDF_TRUST_POLICY = JSON.stringify({ ...policy, revision: "controlled-incident", revokedFingerprints: [result.validation!.timestampCertificateFingerprint] });
  await expect(downloadPdfIssuance(client, row.documentId, row.id)).rejects.toMatchObject({ code: "SIGNATURE_INVALID" });
  expect(row.state).toBe("ready"); expect(row.validation!.accepted).toBe(true); expect(hash(object!)).toBe(storedHash);
  expect(adapters.signing.mock.calls.length).toBe(signedCalls); expect(uploads).toBe(1);
  process.env.HCA_PDF_TRUST_POLICY = JSON.stringify(policy);
  delete process.env.HCA_PDF_SIGNING_SECRET_FILE;
  expect(hash((await downloadPdfIssuance(client, row.documentId, row.id)).bytes)).toBe(storedHash);
  expect(vi.mocked(loadPdfSigningProvider).mock.calls.length).toBe(signedCalls);
}, 30000);
