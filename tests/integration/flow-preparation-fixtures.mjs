import { randomUUID } from "node:crypto";
import { setup, rpc, fixtures } from "./v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
export async function flowPreparationFixture(accept = true) {
  const f = await setup(),
    target = randomUUID(),
    session = randomUUID();
  sql(
    `insert into public.flow_sessions(id,care_recipient_id,user_id,token_hash,expires_at) values(${q(session)},${q(f.patient)},${q(fixtures.adminA.id)},encode(extensions.digest(${q(session)},'sha256'),'hex'),now()+interval '10 minutes');insert into public.flow_submissions(id,session_id,care_recipient_id,user_id,body) values(${q(target)},${q(session)},${q(f.patient)},${q(fixtures.adminA.id)},${q(JSON.stringify({ kind: "consumption", text: "Sugestão original fictícia do Flow", products: [f.products[0]] }))}::jsonb);`,
  );
  const scope = {
    p_patient: f.patient,
    p_purpose: "flow_review",
    p_target: target,
  };
  const fields = {
    accept,
    kind: "consumption",
    text: "\uFEFFMinha revisão fictícia preservada\u00A0",
    lines: [
      { productId: f.products[0], name: "", unit: "", quantity: "1,000000" },
    ],
  };
  const reference = await rpc(f.admin, "flow_preparation_reference", {
    ...scope,
    p_fields: fields,
  });
  fields.lines = fields.lines.map((l) => {
    const c = reference.reference.catalog.find((c) => c.id === l.productId);
    return { ...l, name: c.name, unit: c.unit };
  });
  return { ...f, scope, content: { review: fields, ...reference } };
}
export function saveFlowPreparation(
  f,
  content = f.content,
  current = null,
  key = randomUUID(),
  client = f.admin,
) {
  return rpc(client, "flow_preparation_command", {
    ...f.scope,
    p_id: current?.id ?? null,
    p_expected: current?.revision ?? null,
    p_key: key,
    p_body: {
      action: "save",
      content,
      navigation: { version: 1, stage: "flow_review" },
    },
  });
}
export function flowPreparationPacket(f, saved, key = randomUUID()) {
  const fields = f.content.review,
    command = fields.accept
      ? {
          id: f.scope.p_target,
          accept: true,
          kind: fields.kind,
          text: fields.text.trim(),
          lines: fields.lines.map((l) => ({
            productId: l.productId,
            quantity: String(Number(l.quantity.replace(",", "."))),
          })),
        }
      : {
          id: f.scope.p_target,
          accept: false,
          kind: "shortage",
          text: "Sugestão descartada pelo próprio autor",
          lines: [],
        };
  return {
    ...f.scope,
    p_id: saved.id,
    p_expected: saved.revision,
    p_key: key,
    p_body: { referenceHash: f.content.referenceHash, command },
  };
}
