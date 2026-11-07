import { Worker } from "node:worker_threads";
import path from "node:path";
import {
  publicPdfAnalysisSchema,
  publicPdfLimit,
  type PublicPdfAnalysis,
} from "../../documents/public-verification";
import type { SignatureTrustPolicy } from "./verify";
import { ApiError } from "../api";
let active = 0;
const limited = (
  limit: "time" | "heap" | "interrupted" = "time",
): PublicPdfAnalysis => ({
  status: "processing_limit",
  documentSignature: "not_assessed",
  timestamp: "not_assessed",
  verification: null,
  limit,
});
/** Ephemeral bounded parser; no secret env, filesystem upload or resident service. */
export async function verifyPublicPdf(
  bytes: Uint8Array,
  policy: SignatureTrustPolicy,
  timeoutMs = 4000,
): Promise<PublicPdfAnalysis> {
  if (bytes.length < 100 || bytes.length > publicPdfLimit)
    throw new ApiError(
      "PAYLOAD_TOO_LARGE",
      "Envie um PDF entre 100 bytes e 4 MB.",
      413,
    );
  if (active >= 2)
    throw new ApiError(
      "VERIFICATION_BUSY",
      "O verificador está ocupado. Tente novamente em alguns instantes.",
      503,
      true,
    );
  const copy = Uint8Array.from(bytes);
  active++;
  let worker: Worker | undefined;
  try {
    worker = new Worker(
      path.join(process.cwd(), ".generated/pdf-verifier.cjs"),
      {
        workerData: { bytes: copy, policy },
        transferList: [copy.buffer],
        env: {},
        execArgv: [],
        stdout: true,
        stderr: true,
        resourceLimits: {
          maxOldGenerationSizeMb: 96,
          maxYoungGenerationSizeMb: 16,
          stackSizeMb: 4,
        },
        name: "hca-public-pdf",
      },
    );
    worker.stdout.resume();
    worker.stderr.resume();
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve(limited()), timeoutMs);
      worker!.once("message", (value) => {
        clearTimeout(timer);
        const parsed = publicPdfAnalysisSchema.safeParse(value);
        if (parsed.success) resolve(parsed.data);
        else
          reject(
            new ApiError(
              "VERIFICATION_UNAVAILABLE",
              "A análise do arquivo está temporariamente indisponível.",
              503,
              true,
            ),
          );
      });
      worker!.once("error", (error) => {
        clearTimeout(timer);
        if (
          (error as NodeJS.ErrnoException).code === "ERR_WORKER_OUT_OF_MEMORY"
        )
          resolve(limited("heap"));
        else
          reject(
            new ApiError(
              "VERIFICATION_UNAVAILABLE",
              "A análise do arquivo está temporariamente indisponível.",
              503,
              true,
            ),
          );
      });
      worker!.once("exit", () => {
        clearTimeout(timer);
        resolve(limited("interrupted"));
      });
    });
  } finally {
    if (worker) await worker.terminate();
    active--;
  }
}
