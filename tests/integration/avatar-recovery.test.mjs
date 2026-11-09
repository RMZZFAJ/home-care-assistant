import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { randomUUID, createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { fixtures, env, rpc, actor } from "./v4-fixtures.mjs";
import { whileRowWaits } from "./lock-barrier.mjs";
import { patientA, patientB } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";

const owner = fixtures.family.id;
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const pointer = () => sql(`select coalesce(avatar_path,'') from public.profiles where id=${sqlLiteral(owner)};`);
async function fixture(run) {
  const client = await actor("family", patientA), service = createClient(env.url, env.serviceKey, { auth: { persistSession: false } });
  const before = JSON.parse(sql(`select coalesce(jsonb_agg(id),'[]') from private.avatar_changes where owner_id=${sqlLiteral(owner)};`)), old = pointer();
  const jpeg = await sharp({ create: { width: 20, height: 20, channels: 3, background: "#337799" } }).jpeg({ quality: 88 }).toBuffer();
  const start = async (key = randomUUID(), reference) => {
    const state = await rpc(client, "my_avatar_change", {});
    return rpc(client, "begin_my_avatar_change", { p_key: key, p_hash: sha(jpeg), p_size: jpeg.length, p_name: "foto-ficticia.jpg", p_reference: reference ?? state.referenceRevision });
  };
  const upload = async attempt => {
    await rpc(service, "prepare_avatar_change", { p_id: attempt.id, p_hash: sha(jpeg), p_size: jpeg.length });
    assert.ifError((await service.storage.from("profile-avatars").upload(attempt.objectPath, jpeg, { contentType: "image/jpeg", upsert: false })).error);
    const data = await service.storage.from("profile-avatars").download(attempt.objectPath); assert.ifError(data.error); assert.equal(sha(new Uint8Array(await data.data.arrayBuffer())), sha(jpeg));
    const info = await service.storage.from("profile-avatars").info(attempt.objectPath); assert.ifError(info.error);
    await rpc(service, "verify_avatar_change", { p_id: attempt.id, p_hash: sha(jpeg), p_size: jpeg.length, p_object: info.data.id });
  };
  try { await run({ client, service, start, upload, jpeg, old }); }
  finally {
    sql(`update public.profiles set avatar_path=${old ? sqlLiteral(old) : "null"} where id=${sqlLiteral(owner)};`);
    const rows = JSON.parse(sql(`select coalesce(jsonb_agg(jsonb_build_object('id',id,'path',object_path)),'[]') from private.avatar_changes where owner_id=${sqlLiteral(owner)} ${before.length ? `and id not in (${before.map(sqlLiteral).join(",")})` : ""};`));
    if (rows.length) {
      assert.ifError((await service.storage.from("profile-avatars").remove(rows.map(row => row.path))).error);
      sql(`delete from private.avatar_changes where id in (${rows.map(row => sqlLiteral(row.id)).join(",")});`);
    }
  }
}

test("avatar serializes one pending intention, denies forged upload/attestation and binds only verified real Storage bytes", async () => fixture(async ({ client, service, start, upload, jpeg }) => {
  const key = randomUUID(), [a, b] = await Promise.all([start(key), start(key)]); assert.equal(a.id, b.id);
  assert.equal(sql(`select count(*) from private.avatar_changes where owner_id=${sqlLiteral(owner)} and state='pending';`), "1");
  assert.equal((await client.rpc("begin_my_avatar_change", { p_key: randomUUID(), p_hash: sha(jpeg), p_size: jpeg.length, p_name: "outro.jpg", p_reference: a.referenceRevision })).error?.code, "P0001");
  assert.ok((await client.storage.from("profile-avatars").upload(a.objectPath, jpeg, { contentType: "image/jpeg" })).error);
  assert.equal((await client.rpc("prepare_avatar_change", { p_id: a.id, p_hash: sha(jpeg), p_size: jpeg.length })).error?.code, "42501");
  assert.equal((await client.rpc("finish_my_avatar_change", { p_key: key })).error?.code, "P0001");
  await upload(a);
  assert.equal((await service.rpc("verify_avatar_change", { p_id: a.id, p_hash: "0".repeat(64), p_size: jpeg.length, p_object: randomUUID() })).error?.code, "P0001");
  const applied = await rpc(client, "finish_my_avatar_change", { p_key: key }); assert.equal(applied.current, true); assert.equal(pointer(), a.objectPath);
  assert.equal((await start(key, a.referenceRevision)).id, a.id);
  const next = await start(); await upload(next); await rpc(client, "finish_my_avatar_change", { p_key: next.key });
  const revision = (await rpc(client, "my_avatar_change", {})).referenceRevision;
  const old = await rpc(client, "finish_my_avatar_change", { p_key: key }); assert.equal(old.current, false); assert.equal(pointer(), next.objectPath);
  assert.equal((await rpc(client, "my_avatar_change", {})).referenceRevision, revision);
  assert.equal((await client.rpc("begin_my_avatar_change", { p_key: randomUUID(), p_hash: sha(jpeg), p_size: jpeg.length, p_name: "atrasada.jpg", p_reference: a.referenceRevision })).error?.code, "P0001");
}));

test("avatar revalidates a revoked real session after the profile row wait; a fresh session recovers the same uploaded object", async () => fixture(async ({ client, start, upload, old }) => {
  const a = await start(); await upload(a);
  const current = (await rpc(client, "my_sessions", {})).find(session => session.current);
  const denied = await whileRowWaits("profiles", owner, "finish_my_avatar_change", () => client.rpc("finish_my_avatar_change", { p_key: a.key }), async () => {
    assert.equal(pointer(), old); sql(`delete from auth.sessions where id=${sqlLiteral(current.id)} and user_id=${sqlLiteral(owner)};`);
  });
  assert.equal(denied.error?.code, "42501"); assert.equal(pointer(), old);
  const fresh = await actor("family", patientA), state = await rpc(fresh, "my_avatar_change", { p_key: a.key });
  assert.equal(state.attempt.id, a.id); assert.equal(state.attempt.verified, true);
  await rpc(fresh, "finish_my_avatar_change", { p_key: a.key }); assert.equal(pointer(), a.objectPath);
  assert.equal(sql(`select count(*) from storage.objects where bucket_id='profile-avatars' and name=${sqlLiteral(a.objectPath)};`), "1");
}));

test("avatar isolates owners and privileges, preserves current bytes during abandonment and prevents obsolete managed-path resurrection", async () => fixture(async ({ client, service, start, upload, jpeg }) => {
  const a = await start(); await upload(a); await rpc(client, "finish_my_avatar_change", { p_key: a.key });
  const b = await start(); await upload(b); await rpc(client, "abandon_my_avatar_change", { p_key: b.key });
  assert.equal(pointer(), a.objectPath);
  assert.equal((await client.rpc("finish_my_avatar_change", { p_key: b.key })).error?.code, "P0001");
  const outside = await actor("adminB", patientB); assert.equal((await rpc(outside, "my_avatar_change", { p_key: a.key })).attempt, null);
  assert.equal((await outside.rpc("finish_my_avatar_change", { p_key: a.key })).error?.code, "42501");
  assert.equal((await client.rpc("set_my_avatar", { p_path: b.objectPath })).error?.code, "42501");
  const garbage = await rpc(service, "avatar_cleanup_candidates", { p_owner: owner, p_limit: 20 });
  assert.ok(garbage.some(item => item.id === b.id)); assert.ok(!garbage.some(item => item.id === a.id));
  assert.ifError((await service.storage.from("profile-avatars").remove([b.objectPath])).error);
  await rpc(service, "ack_avatar_cleanup", { p_id: b.id }); assert.equal(pointer(), a.objectPath);
  assert.ifError((await client.storage.from("profile-avatars").download(a.objectPath)).error);
  for (const name of ["prepare_avatar_change", "verify_avatar_change", "avatar_cleanup_candidates", "ack_avatar_cleanup"])
    assert.equal(sql(`select has_function_privilege('authenticated',oid,'execute') from pg_proc where pronamespace='public'::regnamespace and proname=${sqlLiteral(name)};`), "f");
  assert.equal(sql("select has_column_privilege('authenticated','public.profiles','avatar_path','UPDATE') or has_table_privilege('authenticated','private.avatar_changes','SELECT');"), "f");
  assert.equal((await client.rpc("begin_my_avatar_change", { p_key: a.key, p_hash: "0".repeat(64), p_size: jpeg.length, p_name: "falso.jpg", p_reference: a.referenceRevision })).error?.code, "P0001");
}));
