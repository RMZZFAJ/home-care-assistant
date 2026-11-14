import {
  createECDH,
  randomBytes,
  randomUUID,
  createHmac,
  createDecipheriv,
  createPublicKey,
  verify,
} from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { allowedPushEndpoint, pushDestination } from "@/lib/push/subscription";
import {
  webPushConfiguration,
  webPushTransport,
  processWebPush,
  type WebPushConfiguration,
} from "@/lib/server/web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

afterEach(() => {
  vi.unstubAllEnvs();
});
function fixture() {
  const signing = createECDH("prime256v1"),
    recipient = createECDH("prime256v1");
  signing.generateKeys();
  recipient.generateKeys();
  const config: WebPushConfiguration = {
    environment: "local",
    keyVersion: "unit-v1",
    subject: "https://home-care-assistant.invalid",
    publicKey: signing.getPublicKey().toString("base64url"),
    privateKey: Buffer.from(
      signing.getPrivateKey("hex").padStart(64, "0"),
      "hex",
    ).toString("base64url"),
  };
  const auth = randomBytes(16);
  return {
    config,
    recipient,
    auth,
    subscription: {
      endpoint: "https://fcm.googleapis.com/wp/synthetic-unit",
      expirationTime: null,
      keys: {
        p256dh: recipient.getPublicKey().toString("base64url"),
        auth: auth.toString("base64url"),
      },
    },
  };
}
const hmac = (key: Uint8Array, value: Uint8Array) =>
  createHmac("sha256", key).update(value).digest();
// Independent RFC8291 §3.4 decryption using only Node crypto, not web-push/http_ece.
function decrypt(
  body: Buffer,
  recipient: ReturnType<typeof createECDH>,
  auth: Buffer,
) {
  const salt = body.subarray(0, 16),
    keyLength = body[20],
    sender = body.subarray(21, 21 + keyLength);
  expect(keyLength).toBe(65);
  expect(body.readUInt32BE(16)).toBeGreaterThan(body.length);
  const shared = recipient.computeSecret(sender);
  const ikm = hmac(
    hmac(auth, shared),
    Buffer.concat([
      Buffer.from("WebPush: info\0"),
      recipient.getPublicKey(),
      sender,
      Buffer.from([1]),
    ]),
  );
  const prk = hmac(salt, ikm);
  const key = hmac(
    prk,
    Buffer.from("Content-Encoding: aes128gcm\0\x01"),
  ).subarray(0, 16);
  const nonce = hmac(
    prk,
    Buffer.from("Content-Encoding: nonce\0\x01"),
  ).subarray(0, 12);
  const cipher = body.subarray(21 + keyLength),
    decipher = createDecipheriv("aes-128-gcm", key, nonce);
  decipher.setAuthTag(cipher.subarray(-16));
  const plain = Buffer.concat([
    decipher.update(cipher.subarray(0, -16)),
    decipher.final(),
  ]);
  expect(plain.at(-1)).toBe(2);
  return JSON.parse(plain.subarray(0, -1).toString());
}
describe("Web Push protected configuration and provider protocol", () => {
  it("accepts only matching environment/key pairs and never includes a secret in its error", () => {
    const f = fixture();
    expect(webPushConfiguration({})).toBeNull();
    expect(
      webPushConfiguration({ HCA_WEB_PUSH_SECRET: JSON.stringify(f.config) }),
    ).toEqual(f.config);
    for (const env of [
      { HCA_WEB_PUSH_SECRET: JSON.stringify(f.config), VERCEL_ENV: "preview" },
      {
        HCA_WEB_PUSH_SECRET: JSON.stringify({
          ...f.config,
          publicKey: fixture().config.publicKey,
        }),
      },
      {
        HCA_WEB_PUSH_SECRET: JSON.stringify(f.config),
        HCA_WEB_PUSH_SECRET_FILE: "/tmp/ambiguous",
      },
    ]) {
      try {
        webPushConfiguration(env);
        expect.unreachable("Invalid custody accepted");
      } catch (error) {
        expect(error).toMatchObject({ code: "PUSH_NOT_CONFIGURED" });
        expect(String(error)).not.toContain(f.config.privateKey);
      }
    }
  });
  it("encrypts only the opaque delivery reference, and signs a verifiable VAPID audience with bounded privacy defaults", async () => {
    const f = fixture(),
      id = randomUUID();
    let request: RequestInit | undefined;
    const send = vi.fn<typeof fetch>(async (_url, init) => {
      request = init;
      return new Response(null, { status: 201 });
    });
    expect(
      await webPushTransport(f.config, send).send(f.subscription, id),
    ).toEqual({ state: "accepted" });
    expect(send).toHaveBeenCalledOnce();
    expect(request?.redirect).toBe("manual");
    expect(request?.signal).toBeInstanceOf(AbortSignal);
    const headers = new Headers(request?.headers);
    expect(headers.get("TTL")).toBe("300");
    expect(headers.get("urgency")).toBe("normal");
    expect(headers.get("content-encoding")).toBe("aes128gcm");
    const bytes = Buffer.from(request!.body as Uint8Array);
    expect(bytes.includes(Buffer.from(id))).toBe(false);
    expect(decrypt(bytes, f.recipient, f.auth)).toEqual({ v: 1, id });
    const authorization = headers.get("authorization")!;
    const token = /t=([^, ]+)/.exec(authorization)![1];
    const [head, payload, signature] = token.split(".");
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
    expect(claims.aud).toBe("https://fcm.googleapis.com");
    expect(claims.sub).toBe(f.config.subject);
    const publicBytes = Buffer.from(f.config.publicKey, "base64url");
    const key = createPublicKey({
      key: {
        kty: "EC",
        crv: "P-256",
        x: publicBytes.subarray(1, 33).toString("base64url"),
        y: publicBytes.subarray(33).toString("base64url"),
      },
      format: "jwk",
    });
    expect(
      verify(
        "sha256",
        Buffer.from(head + "." + payload),
        { key, dsaEncoding: "ieee-p1363" },
        Buffer.from(signature, "base64url"),
      ),
    ).toBe(true);
  });
  it("encrypts a dedicated generic test marker without changing normal notification payloads", async () => {
    const f = fixture(), id = randomUUID();
    let body: Uint8Array | undefined;
    const send = vi.fn<typeof fetch>(async (_url, init) => {
      body = init?.body as Uint8Array;
      return new Response(null, { status: 201 });
    });
    expect(await webPushTransport(f.config, send).send(f.subscription, id, "test")).toEqual({ state: "accepted" });
    expect(decrypt(Buffer.from(body!), f.recipient, f.auth)).toEqual({ v: 1, id, kind: "test" });
  });
  it.each([
    [410, "expired"],
    [404, "expired"],
    [429, "pending"],
    [503, "pending"],
    [403, "failed"],
    [307, "failed"],
  ] as const)(
    "maps known HTTP%s to %s without reading provider bodies or following redirects",
    async (status, state) => {
      const f = fixture(),
        send = vi.fn<typeof fetch>(
          async () => new Response("private provider diagnostics", { status }),
        );
      expect(
        (
          await webPushTransport(f.config, send).send(
            f.subscription,
            randomUUID(),
          )
        ).state,
      ).toBe(state);
      expect(send).toHaveBeenCalledOnce();
    },
  );
  it("keeps network loss uncertain and does not repeat the send or expose its diagnostic", async () => {
    const f = fixture(),
      send = vi.fn<typeof fetch>(async () => {
        throw new Error(f.subscription.endpoint + " private diagnostic");
      });
    expect(
      await webPushTransport(f.config, send).send(f.subscription, randomUUID()),
    ).toEqual({ state: "uncertain", code: "PUSH_RESULT_UNCERTAIN" });
    expect(send).toHaveBeenCalledOnce();
  });
  it("rejects private hosts, authority confusion, bad curve points and invalid references before any HTTP", async () => {
    const f = fixture(),
      send = vi.fn<typeof fetch>();
    for (const endpoint of [
      "http://fcm.googleapis.com/wp/test",
      "https://127.0.0.1/x",
      "https://fcm.googleapis.com.evil.test/x",
      "https://fcm.googleapis.com:8443/x",
      "https://fcm.googleapis.com@127.0.0.1/x",
    ]) {
      expect(allowedPushEndpoint(endpoint)).toBe(false);
      expect(
        (
          await webPushTransport(f.config, send).send(
            { ...f.subscription, endpoint },
            randomUUID(),
          )
        ).state,
      ).toBe("failed");
    }
    expect(
      (
        await webPushTransport(f.config, send).send(
          {
            ...f.subscription,
            keys: { ...f.subscription.keys, p256dh: "B" + "A".repeat(86) },
          },
          randomUUID(),
        )
      ).state,
    ).toBe("failed");
    expect(
      (
        await webPushTransport(f.config, send).send(
          f.subscription,
          "https://evil.test/",
        )
      ).state,
    ).toBe("failed");
    expect(send).not.toHaveBeenCalled();
    expect(pushDestination("//evil.test/")).toBe("/notificacoes");
  });
  it("does not claim any queue while external delivery is disabled", async () => {
    vi.stubEnv("WEB_PUSH_EXTERNAL_ENABLED", "false");
    const rpc = vi.fn();
    expect(
      await processWebPush({ rpc } as unknown as SupabaseClient),
    ).toMatchObject({ configured: false, claimed: 0 });
    expect(rpc).not.toHaveBeenCalled();
  });
});
