import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { actor, fixtures, issue, rpc, setup } from "./v4-fixtures.mjs";
import { personalReminderFixture, reminderState, shiftReminder } from "./notice-reference-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";

async function teamFixture(t) {
  const f = await setup();
  t.after(() => sql("update public.care_recipients set is_active=false where id=" + q(f.patient)));
  const professional = await actor("professional", f.patient);
  const { data: { user } } = await professional.auth.getUser();
  const delivery = await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient, p_type: "ENT", p_draft: false, p_key: randomUUID(),
    p_payload: {
      source: "FAMILY", destination: "CARE_TEAM", recipientId: user.id,
      recipientReason: "Entrega de dois materiais para o plantão.",
      lines: f.products.map(productId => ({ productId, quantity: "10" })),
    },
  });
  await rpc(professional, "supply_document_command", {
    p_id: delivery.id, p_action: "receive", p_version: delivery.version, p_key: randomUUID(),
    p_body: { divergences: [] },
  });
  const reference = (p_products = f.products) => rpc(professional, "team_consumption_reference", { p_patient: f.patient, p_products });
  const args = (p_body, p_key = randomUUID(), p_reference = null) => ({ p_patient: f.patient, p_key, p_body, p_reference });
  const command = async (body, key, client = professional) => rpc(client, "submit_team_consumption", args(body, key,
    body.action === "issue" ? (await reference(body.lines.map(item => item.productId))).referenceHash : null));
  const quantities = async () => {
    const products = await rpc(f.admin, "stock_overview", { p_patient: f.patient });
    return f.products.map(id => {
      const row = products.find(product => product.productId === id);
      return { team: Number(row.team.confirmed), family: Number(row.family.confirmed) };
    });
  };
  const lines = values => f.products.map((productId, i) => ({ productId, quantity: String(values[i]) }));
  return { ...f, professional, command, args, reference, quantities, lines };
}

test("team consumption issues directly, corrects by differences, and compensates only once", async t => {
  const f = await teamFixture(t);
  const periodStart = sql("select clock_timestamp()");
  const metrics = periodEnd => rpc(f.admin, "stock_consumption_metrics", {
    p_patient: f.patient, p_from: periodStart, p_to: periodEnd,
  });
  const metricValues = rows => f.products.map(id => {
    const row = rows.find(entry => entry.productId === id && entry.location === "CARE_TEAM");
    return row ? Number(row.quantity) : null;
  });
  const started = await f.quantities();
  const issue = { action: "issue", observation: "Materiais utilizados durante o plantão.", lines: f.lines([4, 3]) };
  const key = randomUUID();
  const initial = await f.command(issue, key);
  const issueCutoff = sql("select clock_timestamp()");
  const initialMetrics = await metrics(issueCutoff);
  assert.deepEqual(metricValues(initialMetrics), [4, 3]);
  assert.deepEqual(await f.command({ ...issue, lines: [...issue.lines].reverse() }, key), initial);
  assert.deepEqual(await f.quantities(), started.map((row, i) => ({ ...row, team: row.team - [4, 3][i] })));
  assert.deepEqual(await rpc(f.professional, "team_consumption_result", { p_patient: f.patient, p_key: key }), initial);
  const detail = await rpc(f.admin, "consumption_record_detail", { p_id: initial.id });
  assert.equal(detail.status, "recorded");
  assert.equal(detail.decision, null);
  assert.equal(detail.movements.length, 2);
  for (const movement of detail.movements) {
    assert.equal(await rpc(f.admin, "team_consumption_movement_origin", { p_patient: f.patient, p_movement: movement.id }), initial.id);
  }
  const correct = { action: "correct", reportId: initial.id, expectedVersion: 1, reason: "Conferência do registro de uso.", lines: f.lines([2, 4]) };
  const fixed = await f.command(correct, randomUUID(), f.admin);
  assert.equal(fixed.version, 2);
  const correctionCutoff = sql("select clock_timestamp()");
  const correctedMetrics = await metrics(correctionCutoff);
  assert.deepEqual(metricValues(correctedMetrics), [2, 4]);
  assert.deepEqual(await f.quantities(), started.map((row, i) => ({ ...row, team: row.team - [2, 4][i] })));
  const cancelled = { action: "cancel", reportId: initial.id, expectedVersion: 2, reason: "Registro substituído pela equipe do plantão." };
  const cancelKey = randomUUID();
  const final = await f.command(cancelled, cancelKey);
  assert.deepEqual(await f.command(cancelled, cancelKey), final);
  assert.deepEqual(await f.quantities(), started);
  assert.deepEqual(await metrics(issueCutoff), initialMetrics);
  assert.deepEqual(await metrics(correctionCutoff), correctedMetrics);
  assert.deepEqual(metricValues(await metrics(sql("select clock_timestamp()"))), [null, null]);
  const result = await rpc(f.professional, "consumption_record_detail", { p_id: initial.id });
  assert.equal(result.status, "cancelled");
  assert.deepEqual(result.acts.map(row => row.action), ["issue", "correct", "cancel"]);
  assert.equal(result.movements.length, 6);
  const effects = result.acts.map(act => {
    const movement = result.movements.find(row => row.actId === act.id && row.productId === f.products[0]);
    assert.ok(movement);
    return [act.action, Number(movement.balanceBefore), Number(movement.balanceAfter), Number(movement.quantity)];
  });
  const balance = started[0].team;
  assert.deepEqual(effects, [
    ["issue", balance, balance - 4, 4],
    ["correct", balance - 4, balance - 2, 2],
    ["cancel", balance - 2, balance, 2],
  ]);
  const history = await rpc(f.professional, "stock_operation_history", {
    p_patient: f.patient, p_product: null, p_from: null, p_to: null, p_location: "CARE_TEAM",
    p_page: 1, p_size: 20, p_search: null, p_origin: "CON",
  });
  assert.equal(history.total, 3);
  assert.ok(history.data.every(group => group.rows.length === 2));
});

test("a shortage acknowledges only the actor's selected reminder and remains recoverable", async t => {
  const f = await personalReminderFixture();
  t.after(() => sql("update public.care_recipients set is_active=false where id=" + q(f.patient)));
  const unrelated = shiftReminder(f, f.pro.id, true);
  const before = JSON.parse(reminderState(f));
  const unrelatedBefore = reminderState(f, unrelated);
  const packet = {
    p_patient: f.patient, p_key: randomUUID(), p_reference: null,
    p_body: { action: "shortage", observation: "Reposição necessária para a troca da equipe.", reminderId: f.reminder },
  };
  const receipt = await rpc(f.pro.client, "submit_team_consumption", packet);
  const after = JSON.parse(reminderState(f));
  assert.ok(after.reminder.acknowledged_at);
  assert.ok(after.notices.length > 0 && after.notices.every(notice => notice.seen_at));
  assert.deepEqual(after.stock, before.stock);
  assert.equal(reminderState(f, unrelated), unrelatedBefore);
  const report = await rpc(f.pro.client, "consumption_record_detail", { p_id: receipt.id });
  assert.equal(report.source_reminder_id, f.reminder);
  assert.deepEqual(await rpc(f.pro.client, "submit_team_consumption", packet), receipt);
  assert.deepEqual(await rpc(f.pro.client, "team_consumption_result", { p_patient: f.patient, p_key: packet.p_key }), receipt);
});

test("shortages can be repeated without ledger writes and failed or stale commands leave no partial changes", async t => {
  const f = await teamFixture(t);
  const started = await f.quantities();
  const shortage = await f.command({ action: "shortage", observation: "Reserva de material precisa ser reposta." });
  const repeat = await f.command({ action: "shortage", repeatedReportId: shortage.id, observation: "A equipe segue aguardando a reposição." });
  assert.notEqual(shortage.id, repeat.id);
  const family = await actor("family", f.patient);
  const familyRead = await rpc(family, "consumption_record_detail", { p_id: repeat.id });
  assert.equal(familyRead.status, "communicated");
  assert.equal(familyRead.acts[0].repeatedReportId, shortage.id);
  assert.deepEqual(familyRead.movements, []);
  const familyId = (await family.auth.getUser()).data.user.id;
  const deliveries = JSON.parse(sql(`select jsonb_agg(jsonb_build_object('channel',n.channel,'event',n.event_key,'allowed',private.consumption_notice_allowed(n)))
    from public.requisition_notifications n where n.care_recipient_id=${q(f.patient)}
      and n.recipient_user_id=${q(familyId)} and n.consumption_report_id in (${q(shortage.id)},${q(repeat.id)})`));
  assert.deepEqual(deliveries, Array.from({ length: 2 }, () => ({ channel: "internal", event: "shortage.communicated", allowed: true })));
  assert.equal((await family.rpc("submit_team_consumption", f.args({ action: "issue", lines: f.lines([1, 1]) }))).error?.code, "42501");
  const failed = f.args({ action: "issue", lines: f.lines([1, 40]) }, randomUUID(), (await f.reference()).referenceHash);
  assert.ok((await f.professional.rpc("submit_team_consumption", failed)).error);
  assert.equal(await rpc(f.professional, "team_consumption_result", { p_patient: f.patient, p_key: failed.p_key }), null);
  assert.deepEqual(await f.quantities(), started);

  const initial = await f.command({ action: "issue", lines: f.lines([1, 1]) });
  const change = f.args({ action: "correct", reportId: initial.id, expectedVersion: 1, reason: "Revisão da passagem de plantão.", lines: f.lines([2, 3]) });
  const concurrent = { ...change, p_key: randomUUID() };
  const results = await Promise.all([f.professional.rpc("submit_team_consumption", change), f.admin.rpc("submit_team_consumption", concurrent)]);
  assert.equal(results.filter(result => result.error === null).length, 1);
  assert.equal(results.find(result => result.error)?.error?.code, "PT409");
  assert.deepEqual(await f.quantities(), started.map((row, i) => ({ ...row, team: row.team - [2, 3][i] })));
});

test("server review revalidates stock and retires only the exact confirmed draft", async t => {
  const f = await teamFixture(t);
  const inputs = f.lines([2, 3]);
  const content = { consumption: {
    kind: "consumption", location: "CARE_TEAM", text: "Materiais usados no plantão.", reason: "", reminderId: "",
    lines: inputs.map((line, i) => ({ ...line, name: `Material ${i}`, unit: "unidade" })),
  }, reference: null, referenceHash: null };
  const saved = await rpc(f.professional, "consumption_preparation_command", {
    p_patient: f.patient, p_purpose: "consumption_report_team", p_target: f.patient,
    p_id: null, p_expected: null, p_key: randomUUID(),
    p_body: { action: "save", content, navigation: { version: 1, stage: "consumption_preparation" } },
  });
  const firstReference = await f.reference();
  await f.command({ action: "issue", lines: f.lines([1, 1]) });
  const key = randomUUID();
  const packet = {
    ...f.args({ action: "issue", observation: content.consumption.text, lines: inputs }, key, firstReference.referenceHash),
    p_draft_id: saved.id, p_draft_revision: saved.revision,
  };
  assert.equal((await f.professional.rpc("submit_team_consumption", packet)).error?.code, "PT409");
  assert.equal(await rpc(f.professional, "team_consumption_result", { p_patient: f.patient, p_key: key }), null);
  const readDraft = () => rpc(f.professional, "consumption_preparation_context", {
    p_patient: f.patient, p_purpose: "consumption_report_team", p_target: f.patient,
  });
  assert.equal((await readDraft()).revision, saved.revision);
  packet.p_reference = (await f.reference()).referenceHash;
  const confirmed = await rpc(f.professional, "submit_team_consumption", packet);
  assert.equal(await readDraft(), null);
  const newer = await rpc(f.professional, "consumption_preparation_command", {
    p_patient: f.patient, p_purpose: "consumption_report_team", p_target: f.patient,
    p_id: null, p_expected: null, p_key: randomUUID(),
    p_body: { action: "save",
      content: { ...content, consumption: { ...content.consumption, text: "Próximo plantão, registro em preenchimento." } },
      navigation: { version: 1, stage: "consumption_preparation" } },
  });
  const beforeReplay = await readDraft();
  assert.equal(beforeReplay.id, newer.id);
  assert.equal(beforeReplay.revision, newer.revision);
  assert.deepEqual(await rpc(f.professional, "submit_team_consumption", packet), confirmed);
  assert.deepEqual(await readDraft(), beforeReplay);
  assert.deepEqual(await rpc(f.professional, "team_consumption_result", { p_patient: f.patient, p_key: key }), confirmed);
});

test("Andamentos link real consumption, shortage and document records without changing the ledger", async t => {
  const f = await teamFixture(t);
  const consumption = await f.command({ action: "issue", observation: "Consumo registrado na troca de turno.", lines: f.lines([1, 1]) });
  const shortage = await f.command({ action: "shortage", observation: "Falta material para o próximo plantão." });
  const requisition = await issue(f.patient, f.products);
  const stock = await f.quantities();
  const family = await actor("family", f.patient);
  const scope = { p_patient: f.patient, p_purpose: "progress_note", p_target: shortage.id };
  const note = { category: "contact", stage: "communication", text: "Reposição combinada com a equipe.", references: [consumption.id, requisition.id] };
  const draft = await rpc(family, "progress_preparation_command", {
    ...scope, p_id: null, p_expected: null, p_key: randomUUID(),
    p_body: { action: "save", content: { documentType: "FAL", note }, navigation: { version: 1, stage: "progress_note" } },
  });
  assert.equal((await rpc(family, "progress_preparation_context", scope)).id, draft.id);
  assert.equal(await rpc(f.professional, "progress_preparation_context", scope), null);

  const publication = { relevance: "attention", visibility: "family", mentions: [fixtures.professional.id] };
  const commit = { ...scope, p_id: draft.id, p_expected: draft.revision, p_key: randomUUID(), p_body: { ...note, publication } };
  const published = await rpc(family, "commit_record_progress_preparation", commit);
  assert.equal(published.receipt.documentType, "FAL");
  assert.equal(published.receipt.nativeResult.note.authorId, fixtures.family.id);
  assert.deepEqual(published.receipt.nativeResult.note.references.map(row => row.type), ["CON", "REQ"]);
  const recovered = await rpc(family, "recover_record_progress_preparation", commit);
  assert.equal(recovered.status, "applied");
  assert.equal(recovered.confirmation.receipt.resourceId, published.receipt.resourceId);

  await rpc(family, "publish_record_progress", {
    p_document: shortage.id, p_key: randomUUID(), p_body: { ...note, text: "Alinhamento familiar privado." },
  });
  const feed = await rpc(f.professional, "document_progress", { p_document: shortage.id });
  assert.equal(feed.documentType, "FAL");
  assert.deepEqual(feed.data.map(row => row.source === "automatic" ? row.action : row.id), ["consumption.shortage", published.receipt.resourceId]);
  assert.equal((await rpc(f.professional, "document_progress_location", {
    p_document: shortage.id, p_note: published.receipt.resourceId,
  })).page, 1);
  const referenceQuery = {
    p_document: requisition.id, p_search: published.receipt.resourceId,
    p_page: 1,
  };
  const reference = await rpc(f.professional, "record_progress_references", referenceQuery);
  assert.equal(reference.data[0].type, "FAL");
  assert.equal(reference.data[0].documentId, shortage.id);
  assert.equal((await rpc(f.professional, "document_progress_references", referenceQuery)).total, 0);
  const legacyReport = await f.admin.from("consumption_reports").select("id,status").eq("care_recipient_id", f.patient);
  assert.ifError(legacyReport.error);
  assert.deepEqual(legacyReport.data, []);
  assert.equal((await f.admin.rpc("consumption_report", { p_id: consumption.id })).error?.code, "42501");
  const listInput = {
    p_patient: f.patient, p_kind: "consumption", p_status: "recorded", p_search: "",
    p_reminder: null, p_from: null, p_until: null, p_before_at: null, p_before_id: null,
  };
  assert.deepEqual((await rpc(f.professional, "consumption_record_list", listInput)).map(row => row.id), [consumption.id]);

  sql(`insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled)
    values(${q(f.patient)},'stock.team.read',${q(fixtures.professional.id)},false)`);
  assert.equal((await f.professional.rpc("document_progress", { p_document: shortage.id })).error?.code, "42501");
  assert.equal((await rpc(f.professional, "record_progress_references", referenceQuery)).total, 0);
  assert.deepEqual(await rpc(f.professional, "consumption_record_list", listInput), []);
  assert.deepEqual(await f.quantities(), stock);
});
