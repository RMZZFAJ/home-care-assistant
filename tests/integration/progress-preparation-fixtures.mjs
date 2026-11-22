import { randomUUID } from "node:crypto";
import {
  setup,
  issue,
  delivery,
  actor,
  rpc,
  fixtures,
} from "./v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
export async function progressPreparationFixture(type = "REQ") {
  const f = await setup(),
    req = await issue(f.patient, f.products),
    family = await actor("family", f.patient);
  let id = req.id;
  if (type === "COM")
    id = (
      await rpc(family, "create_supply_document", {
        p_patient: f.patient,
        p_type: "COM",
        p_key: randomUUID(),
        p_draft: false,
        p_payload: {
          origin: "purchase",
          lines: [{ productId: f.products[0], quantity: "1" }],
        },
      })
    ).id;
  if (type === "ENT") id = (await delivery(f.patient, req, f.products)).id;
  if (type === "BAL") {
    await actor("adminA", f.patient);
    id = (
      await rpc(f.admin, "create_supply_document", {
        p_patient: f.patient,
        p_type: "BAL",
        p_key: randomUUID(),
        p_draft: false,
        p_payload: {
          lines: f.products.map((productId) => ({ productId, quantity: "2" })),
        },
      })
    ).id;
  }
  return {
    ...f,
    id,
    type,
    family,
    scope: { p_patient: f.patient, p_purpose: "progress_note", p_target: id },
    content: {
      documentType: type,
      note: {
        category: "action",
        stage: "issuance",
        text: "Texto pessoal fictício preservado",
        references: [],
      },
    },
  };
}
export const privateProgressCommand = (
  f,
  client,
  action = "save",
  saved = null,
  content = f.content,
  key = randomUUID(),
) =>
  rpc(client, "progress_preparation_command", {
    ...f.scope,
    p_id: saved?.id ?? null,
    p_expected: saved?.revision ?? null,
    p_key: key,
    p_body: {
      action,
      ...(action === "save"
        ? { content, navigation: { version: 1, stage: "progress_note" } }
        : {}),
    },
  });
export const privateProgressCommit = (
  f,
  saved,
  key = randomUUID(),
  content = f.content.note,
) => ({
  ...f.scope,
  p_id: saved.id,
  p_expected: saved.revision,
  p_key: key,
  p_body: content,
});
export const progressFacts = (f) =>
  sql(
    `select jsonb_build_object('document',(select to_jsonb(d) from public.operational_documents d where id=${q(f.id)}),'events',(select coalesce(jsonb_agg(to_jsonb(e) order by e.id),'[]'::jsonb) from public.document_events e where e.document_id=${q(f.id)}),'ledger',(select coalesce(jsonb_agg(to_jsonb(m) order by m.id),'[]'::jsonb) from public.stock_movements m where m.care_recipient_id=${q(f.patient)}))::text`,
  );
export { fixtures, actor, rpc, sql, q };
