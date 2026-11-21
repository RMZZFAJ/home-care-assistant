import { createECDH, ECDH } from "node:crypto";
import { readFileSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { generateRequestDetails } from "web-push";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, rpc } from "@/lib/server/api";
import {
  allowedPushEndpoint,
  pushSubscription,
  type WebPushSubscription,
} from "@/lib/push/subscription";

const secretSchema = z
  .object({
    environment: z.enum(["local", "preview", "production"]),
    keyVersion: z.string().regex(/^[A-Za-z0-9_.-]{1,80}$/),
    subject: z
      .string()
      .max(2048)
      .refine(
        (value) => /^(https:\/\/|mailto:)/.test(value) && !/[\r\n]/.test(value),
      ),
    publicKey: z.string().regex(/^B[A-Za-z0-9_-]{86}$/),
    privateKey: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  })
  .strict();
export type WebPushConfiguration = z.infer<typeof secretSchema>;

export function webPushConfiguration(
  env: Record<string, string | undefined> = process.env,
): WebPushConfiguration | null {
  const value = env.HCA_WEB_PUSH_SECRET,
    file = env.HCA_WEB_PUSH_SECRET_FILE;
  if (!value && !file) return null;
  try {
    if (value && file) throw new Error("Ambiguous custody");
    let text = value;
    if (file) {
      const child = relative(process.cwd(), resolve(file));
      const external =
        isAbsolute(child) || child === ".." || child.startsWith(".." + sep);
      if (
        env.VERCEL_ENV ||
        !isAbsolute(file) ||
        !external ||
        realpathSync(file) !== resolve(file) ||
        statSync(file).size > 16384
      )
        throw new Error("Invalid local custody");
      text = readFileSync(file, "utf8");
    }
    if (!text || Buffer.byteLength(text) > 16384)
      throw new Error("Invalid custody");
    const config = secretSchema.parse(JSON.parse(text));
    if (config.environment !== (env.VERCEL_ENV ?? "local"))
      throw new Error("Environment mismatch");
    const key = createECDH("prime256v1");
    key.setPrivateKey(Buffer.from(config.privateKey, "base64url"));
    if (key.getPublicKey().toString("base64url") !== config.publicKey)
      throw new Error("Key mismatch");
    return config;
  } catch {
    throw new ApiError(
      "PUSH_NOT_CONFIGURED",
      "Os avisos neste aparelho ainda não estão disponíveis. Suas pendências continuam na central de notificações.",
      503,
    );
  }
}

export function validatePushPublicKey(subscription: WebPushSubscription): void {
  try {
    ECDH.convertKey(
      Buffer.from(subscription.keys.p256dh, "base64url"),
      "prime256v1",
    );
  } catch {
    throw new ApiError(
      "VALIDATION_ERROR",
      "A inscrição do navegador não é válida. Consulte novamente os avisos deste aparelho.",
      400,
    );
  }
}

export type PushResult = {
  state: "accepted" | "pending" | "expired" | "failed" | "uncertain";
  code?: string;
};
export type PushTransport = {
  keyVersion: string;
  send: (
    subscription: WebPushSubscription,
    deliveryId: string,
    kind?: "test",
  ) => Promise<PushResult>;
};

/** Crypto comes from web-push; native fetch supplies an absolute deadline and no redirects. */
export function webPushTransport(
  config: WebPushConfiguration,
  send: typeof fetch = fetch,
): PushTransport {
  return {
    keyVersion: config.keyVersion,
    async send(subscription, deliveryId, kind) {
      let details;
      try {
        const parsed = pushSubscription.parse(subscription);
        validatePushPublicKey(parsed);
        if (
          !allowedPushEndpoint(parsed.endpoint) ||
          !z.string().uuid().safeParse(deliveryId).success
        )
          throw new Error("Invalid target");
        details = generateRequestDetails(
          parsed,
          JSON.stringify({ v: 1, id: deliveryId, ...(kind === "test" ? { kind } : {}) }),
          {
            vapidDetails: {
              subject: config.subject,
              publicKey: config.publicKey,
              privateKey: config.privateKey,
            },
            TTL: 300,
            urgency: "normal",
            contentEncoding: "aes128gcm",
          },
        );
      } catch {
        return { state: "failed", code: "PUSH_SUBSCRIPTION_INVALID" };
      }
      try {
        const response = await send(details.endpoint, {
          method: "POST",
          redirect: "manual",
          signal: AbortSignal.timeout(10000),
          headers: Object.fromEntries(
            Object.entries(details.headers).map(([key, value]) => [
              key,
              String(value),
            ]),
          ),
          body: details.body ? Uint8Array.from(details.body) : undefined,
        });
        // No provider body, endpoint or credential is logged or persisted.
        try {
          await response.body?.cancel();
        } catch {
          /* The known HTTP result remains authoritative. */
        }
        if (response.ok) return { state: "accepted" };
        if ([404, 410].includes(response.status))
          return { state: "expired", code: "PUSH_SUBSCRIPTION_EXPIRED" };
        if (response.status === 429 || response.status >= 500)
          return { state: "pending", code: "PUSH_PROVIDER_RETRYABLE" };
        return { state: "failed", code: "PUSH_PROVIDER_REJECTED" };
      } catch {
        return { state: "uncertain", code: "PUSH_RESULT_UNCERTAIN" };
      }
    },
  };
}

export async function processWebPush(
  client: SupabaseClient,
  transport?: PushTransport,
) {
  const configured =
    transport ??
    (process.env.WEB_PUSH_EXTERNAL_ENABLED === "true"
      ? (() => {
          const config = webPushConfiguration();
          return config ? webPushTransport(config) : null;
        })()
      : null);
  if (!configured)
    return {
      configured: false,
      claimed: 0,
      accepted: 0,
      pending: 0,
      expired: 0,
      failed: 0,
      uncertain: 0,
      skipped: 0,
    };
  const provider = configured;
  const worker = crypto.randomUUID();
  const leases = z
    .array(
      z
        .object({ id: z.string().uuid(), leaseToken: z.string().uuid() })
        .strict(),
    )
    .max(25)
    .parse(
      await rpc(client, "claim_web_push_deliveries", {
        p_limit: 25,
        p_worker: worker,
        p_key_version: configured.keyVersion,
      }),
    );
  const counts = {
    configured: true,
    claimed: leases.length,
    accepted: 0,
    pending: 0,
    expired: 0,
    failed: 0,
    uncertain: 0,
    skipped: 0,
  };
  let unconfirmed = false;
  async function processLease(lease: (typeof leases)[number]) {
    const args = {
      p_id: lease.id,
      p_worker: worker,
      p_token: lease.leaseToken,
    };
    const payload = await rpc(client, "prepare_web_push_delivery", {
      ...args,
      p_key_version: provider.keyVersion,
    });
    if (!payload) {
      counts.skipped++;
      return;
    }
    const prepared = z
      .object({ id: z.literal(lease.id), subscription: pushSubscription })
      .strict()
      .parse(payload);
    let result: PushResult;
    try {
      result = await provider.send(prepared.subscription, prepared.id);
    } catch {
      result = { state: "uncertain", code: "PUSH_RESULT_UNCERTAIN" };
    }
    try {
      const state = z
        .enum([
          "accepted",
          "pending",
          "expired",
          "failed",
          "uncertain",
          "cancelled",
        ])
        .parse(
          await rpc(client, "complete_web_push_delivery", {
            ...args,
            p_result: result.state,
            p_error: result.code ?? null,
          }),
        );
      if (
        state === "accepted" ||
        state === "pending" ||
        state === "expired" ||
        state === "failed" ||
        state === "uncertain"
      )
        counts[state]++;
      else counts.skipped++;
    } catch {
      unconfirmed = true;
    }
  }
  // Five bounded sends at a time fit the existing worker runtime and lease.
  for (let offset = 0; offset < leases.length; offset += 5)
    await Promise.all(leases.slice(offset, offset + 5).map(processLease));
  if (unconfirmed)
    throw new ApiError(
      "PUSH_RESULT_UNCONFIRMED",
      "Parte do envio de avisos ainda não foi confirmada. As tentativas permanecem registradas para conciliação.",
      503,
      true,
    );
  return counts;
}
