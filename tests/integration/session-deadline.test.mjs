import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import {
  privateDraftFixture,
  reqContent,
  savePacket,
  rpc,
  officialState,
} from "./private-draft-fixtures.mjs";
import { request } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { whileAdvisoryWaits } from "./lock-barrier.mjs";

async function expireWhileWaiting(client) {
  const session = (await client.auth.getSession()).data.session;
  assert.ok(session);
  const claims = JSON.parse(
    Buffer.from(session.access_token.split(".")[1], "base64url").toString(),
  );
  // This is a real local Auth session. Only its test deadline changes; the
  // account, role, membership, selected context and session row stay intact.
  sql(
    `update auth.sessions set not_after=clock_timestamp()+interval '200 milliseconds' where id=${sqlLiteral(claims.session_id)};`,
  );
  const started = Date.now();
  while (
    sql(
      `select (not_after<clock_timestamp())::text from auth.sessions where id=${sqlLiteral(claims.session_id)};`,
    ) !== "true"
  )
    assert.ok(
      Date.now() - started < 5000,
      "Actual Auth deadline must elapse while the command is locked",
    );
}

for (const family of ["private_save", "requisition", "family_stock"]) {
  test(`real Auth deadline after transaction start is rechecked after ${family} lock wait`, async () => {
    const f = await privateDraftFixture();
    let client = f.pro,
      lock,
      send,
      beforePrivate = null;
    if (family === "private_save") {
      const saved = await rpc(client, "creation_draft_command", savePacket(f));
      beforePrivate = sql(
        `select to_jsonb(d) from private.creation_drafts d where id=${sqlLiteral(saved.id)};`,
      );
      const packet = savePacket(
        f,
        "REQ",
        {
          ...reqContent(f),
          observations: ["Esta nova escrita deve ser recusada após o prazo"],
        },
        saved.id,
        saved.revision,
      );
      // A verified Auth user id is obtained below without logging the token.
      lock = `creation-draft-slot:${(await client.auth.getUser()).data.user.id}:${f.patient}:REQ:new`;
      send = () => client.rpc("creation_draft_command", packet);
    } else if (family === "requisition") {
      await rpc(
        client,
        "submit_requisition",
        request(f.patient, [f.products[1]]),
      );
      const packet = request(f.patient, [f.products[0]]);
      lock = "requisition-patient:" + f.patient;
      send = () => client.rpc("submit_requisition", packet);
    } else {
      client = f.admin;
      await rpc(client, "family_stock_movement", {
        p_patient: f.patient,
        p_product: f.products[0],
        p_quantity: "1",
        p_action: "inbound",
        p_reason: "Controle positivo anterior ao prazo",
        p_key: randomUUID(),
        p_reference: null,
      });
      lock = "stock:" + f.patient;
      send = () =>
        client.rpc("family_stock_movement", {
          p_patient: f.patient,
          p_product: f.products[0],
          p_quantity: "1",
          p_action: "inbound",
          p_reason: "Escrita que deve ser recusada após expirar",
          p_key: randomUUID(),
          p_reference: null,
        });
    }
    const before = officialState(f);
    const result = await whileAdvisoryWaits(lock, send, () =>
      expireWhileWaiting(client),
    );
    assert.equal(result.error?.code, "42501", result.error?.message);
    assert.equal(officialState(f), before);
    if (beforePrivate)
      assert.equal(
        sql(
          `select to_jsonb(d) from private.creation_drafts d where care_recipient_id=${sqlLiteral(f.patient)};`,
        ),
        beforePrivate,
      );
  });
}
