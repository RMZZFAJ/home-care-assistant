import { createHmac } from "node:crypto";

export function totp(secret: string, time = Date.now()) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = [...secret.replaceAll("=", "")].map(character => alphabet.indexOf(character).toString(2).padStart(5, "0")).join("");
  const key = Buffer.from((bits.match(/.{8}/g) ?? []).map(part => Number.parseInt(part, 2))), counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(time / 30_000)));
  const mac = createHmac("sha1", key).update(counter).digest(), offset = mac[mac.length - 1] & 15;
  return String((mac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}
