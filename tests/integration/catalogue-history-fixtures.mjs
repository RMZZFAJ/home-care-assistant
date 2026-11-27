import { randomUUID } from "node:crypto";
import { rpc, setup } from "./v4-fixtures.mjs";

export async function catalogueHistoryFixture() {
  const f = await setup();
  const originalName = "Material do histórico " + randomUUID().slice(0, 8);
  const currentName = originalName + " revisado";
  const fields = {
    name: originalName, category: "higiene", unit: "unidade", aliases: "",
    description: "Cadastro confirmado", sortOrder: "0", isActive: true,
  };
  const operation = { p_patient: f.patient, p_mode: "patient", p_purpose: "create", p_target: null };
  async function command(scope, values) {
    const reference = await rpc(f.admin, "reviewed_catalogue_reference", { ...scope, p_selection: null });
    const request = { ...scope, p_key: randomUUID(), p_fields: values, p_reference_hash: reference.hash };
    const result = await rpc(f.admin, "reviewed_catalogue_command", request);
    return { request, result };
  }
  const created = await command(operation, fields);
  const productId = created.result.outcome.productId;
  const edited = await command({ ...operation, p_purpose: "edit", p_target: productId }, {
    ...fields, name: currentName, aliases: "Nome de busca",
  });
  const presentation = { productId, name: "Pacote com equivalência revisada", barcode: "0123456789012", active: true };
  const first = await rpc(f.admin, "catalogue_presentation_command", {
    p_patient: f.patient, p_id: null, p_version: null, p_key: randomUUID(), p_body: { ...presentation, baseQuantity: "10" },
  });
  await rpc(f.admin, "catalogue_presentation_command", {
    p_patient: f.patient, p_id: first.result.id, p_version: first.result.version, p_key: randomUUID(),
    p_body: { ...presentation, baseQuantity: "8" },
  });
  for (const action of ["retire", "reactivate"]) {
    const snapshot = await rpc(f.admin, "catalogue_identity_context", {
      p_patient: f.patient, p_product: productId,
    });
    await rpc(f.admin, "catalogue_identity_command", {
      p_patient: f.patient, p_product: productId, p_successor: null, p_reference: snapshot.referenceHash,
      p_body: { action, reason: "Decisão oficial sobre o material" }, p_key: randomUUID(),
    });
  }
  return { ...f, productId, originalName, currentName, edited };
}
