import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  scheduleResourcePurposes,
  initialScheduleResource,
  scheduleResourceCommand,
  scheduleResourceReferenceSchema,
  checkScheduleResourceReference,
  type ScheduleResourcePurpose,
  type ScheduleResourceReference,
} from "@/lib/schedules/resource-preparations";
import {
  scheduleResourceSaveSchema,
  scheduleResourceCommitSchema,
  parseScheduleResourceReceipt,
  parseScheduleResourceConfirmation,
  parseScheduleResourceRecovery,
  scheduleResourceFieldsMatchCommand,
} from "@/lib/validation/schedule-resource-preparations";
import { creationDraftCommandSchema } from "@/lib/validation/creation-drafts";
import {
  parsePrivateDraft,
  parsePrivateDraftResult,
} from "@/lib/validation/private-draft-results";
import {
  localScheduleResourceScopes,
  scheduleResourceLocalMatches,
  scheduleResourceStoredSchema,
  scheduleResourceLocalKey,
  loadScheduleResourceLocal,
} from "@/lib/schedules/resource-local";
import { navigationAllowed } from "@/lib/forms/draft-navigation";
import { ScheduleResourceSummary } from "@/components/schedules/schedule-resource-summary";
import type { ScheduleWorkspace } from "@/types/schedules";
const actor = "11111111-1111-4111-8111-111111111111",
  patient = "22222222-2222-4222-8222-222222222222",
  type = "33333333-3333-4333-8333-333333333333",
  shiftId = "44444444-4444-4444-8444-444444444444",
  seriesId = "55555555-5555-4555-8555-555555555555",
  worker = "66666666-6666-4666-8666-666666666666",
  proposalId = "77777777-7777-4777-8777-777777777777",
  draft = "88888888-8888-4888-8888-888888888888",
  key = "99999999-9999-4999-8999-999999999999",
  hash = "a".repeat(64),
  day = "2100-04-01",
  instant = "2026-11-10T12:00:00Z";
function prepared(purpose: ScheduleResourcePurpose = "shift_type_edit") {
  const shift = {
    id: shiftId,
    series_id: seriesId,
    professional_id: worker,
    professional_name: "Profissional de origem",
    shift_type_id: type,
    type_name: "Noturno",
    starts_at: "2100-04-01T19:00:37.123456Z",
    ends_at: "2100-04-02T07:00:49.654321Z",
    timezone: "UTC",
    status: "published",
    version: 3,
    notes: "Nota de origem",
    is_exception: false,
  };
  const data: ScheduleWorkspace = {
    types: [],
    series: [],
    shifts: [],
    changes: [],
    professionals: [],
    events: [],
  };
  let target: string;
  if (purpose === "shift_type_edit") {
    target = type;
    data.types = [
      {
        id: type,
        name: "Tipo original",
        starts_local: "19:00:37",
        duration_minutes: 720,
        is_active: true,
        version: 3,
      },
    ];
  } else if (purpose.startsWith("schedule_series_")) {
    target = seriesId;
    data.series = [
      {
        id: seriesId,
        professional_id: worker,
        professional_name: shift.professional_name,
        shift_type_id: type,
        type_name: "Noturno",
        timezone: "UTC",
        recurrence: "once",
        weekdays: [],
        anchor_date: day,
        valid_until: day,
        ended_on: null,
        status: purpose === "schedule_series_end" ? "published" : "proposed",
        version: 3,
        notes: "Notas da programação",
        occurrences: [shift],
        publication_blocked: false,
      },
    ];
  } else if (purpose === "schedule_shift_edit") {
    target = shiftId;
    data.shifts = [shift];
  } else {
    target = proposalId;
    data.changes = [
      {
        id: proposalId,
        shift_id: shiftId,
        professional_id: worker,
        proposed_professional_id: actor,
        starts_at: shift.starts_at,
        ends_at: shift.ends_at,
        reason: "Motivo de quem propôs",
        status: "pending",
        shift_version: 3,
        version: 3,
        created_by: worker,
        source_snapshot: shift,
        proposed_snapshot: {
          ...shift,
          professional_id: actor,
          professional_name: "Pessoa de destino",
        },
        notes: "Notas da proposta",
        is_stale: purpose === "schedule_change_close",
        current_professional_name: shift.professional_name,
        current_proposed_professional_name: "Pessoa de destino",
        bal_impact: {
          has_assignment: false,
          changes_window: false,
          requires_family_decision: false,
          assignment_deadline: null,
        },
      },
    ];
  }
  const reference: ScheduleResourceReference = {
    patientId: patient,
    purpose,
    targetResourceId: target,
    hash,
    version: 3,
    sourceVersion: purpose.startsWith("schedule_change_") ? 3 : null,
    workspace: data,
  };
  const fields = initialScheduleResource(purpose, target, data, day, true);
  if (fields.form === "type") fields.name = "Meu nome alterado";
  else fields.reason = "Meu motivo <contato>";
  const command = scheduleResourceCommand(fields, target, reference);
  const content = {
    scheduleAction: fields,
    referenceHash: hash,
    referenceVersion: 3,
  };
  const save = {
    careRecipientId: patient,
    kind: "SCHEDULE",
    purpose,
    targetDocumentId: null,
    targetResourceId: target,
    id: null,
    expectedRevision: null,
    idempotencyKey: key,
    action: "save",
    content,
    navigation: { version: 1 as const, stage: "schedule_resource" as const },
  };
  const packet = scheduleResourceCommitSchema.parse({
    careRecipientId: patient,
    purpose,
    targetResourceId: target,
    draftCommit: { id: draft, revision: 1 },
    referenceHash: hash,
    expectedVersion: 3,
    sourceVersion: reference.sourceVersion,
    command,
    idempotencyKey: key,
  });
  const status =
    purpose === "shift_type_edit"
      ? null
      : purpose === "schedule_series_approve" ||
          purpose === "schedule_series_end" ||
          purpose === "schedule_shift_edit"
        ? "published"
        : purpose === "schedule_series_reject" ||
            purpose === "schedule_change_reject"
          ? "rejected"
          : purpose === "schedule_change_approve"
            ? "approved"
            : "obsolete";
  const receipt = {
    patientId: patient,
    purpose,
    targetResourceId: target,
    resourceId: target,
    actorId: actor,
    recordedAt: instant,
    idempotencyKey: key,
    command,
    expectedVersion: 3,
    sourceVersion: reference.sourceVersion,
    referenceHash: hash,
    fields,
    sourceTimezone: fields.form === "shift" ? "UTC" : null,
    nativeResult: {
      id: target,
      version: 4,
      status,
      active: fields.form === "type" ? fields.active : null,
    },
  };
  const confirmation = {
    draft: { id: draft, revision: 2, state: "consumed" },
    receipt,
    replayed: false,
  };
  const scope = {
    userId: actor,
    patientId: patient,
    kind: "SCHEDULE" as const,
    purpose,
    targetDocumentId: null,
    targetResourceId: target,
  };
  const read = {
    id: draft,
    ownerId: actor,
    patientId: patient,
    kind: "SCHEDULE",
    purpose,
    targetDocumentId: null,
    targetResourceId: target,
    schemaVersion: 1,
    revision: 1,
    state: "active",
    createdAt: instant,
    savedAt: instant,
    contentHash: "b".repeat(64),
    content: { ...content, reference },
    navigation: { version: 1 as const, stage: "schedule_resource" as const },
    consumedDocumentId: null,
    consumedResourceId: null,
    consumedResult: null,
  };
  const recovery = {
    patientId: patient,
    ownerId: actor,
    purpose,
    targetResourceId: target,
    key,
    expectedRevision: 1,
    expectedVersion: 3,
    sourceVersion: reference.sourceVersion,
    referenceHash: hash,
    command,
    current: { id: draft, revision: 1, state: "active" },
    status: "unknown",
    reason: null,
    source: null,
    receipt: null,
  };
  return {
    purpose,
    target,
    reference,
    fields,
    command,
    content,
    save,
    packet,
    receipt,
    confirmation,
    scope,
    read,
    recovery,
  };
}
describe("resource schedule private contracts", () => {
  for (const purpose of scheduleResourcePurposes)
    it(
      purpose + " binds scope,private navigation,source and native result",
      () => {
        const f = prepared(purpose);
        expect(scheduleResourceSaveSchema.parse(f.save).purpose).toBe(purpose);
        const generic = creationDraftCommandSchema.parse(f.save);
        expect("purpose" in generic && generic.purpose).toBe(purpose);
        expect(
          navigationAllowed("SCHEDULE", purpose, f.save.navigation, f.content),
        ).toBe(true);
        expect(parsePrivateDraft(f.read, f.scope)?.content).toEqual(
          f.read.content,
        );
        expect(
          checkScheduleResourceReference(
            scheduleResourceReferenceSchema.parse(f.reference),
            { patientId: patient, purpose, targetResourceId: f.target },
          ),
        ).toEqual(f.reference);
        expect(parseScheduleResourceReceipt(f.receipt, f.scope).actorId).toBe(
          actor,
        );
        expect(
          parseScheduleResourceConfirmation(f.confirmation, f.packet, actor)
            .receipt.fields,
        ).toEqual(f.fields);
        const acknowledged = parsePrivateDraftResult(
          {
            id: draft,
            revision: 3,
            savedAt: instant,
            state: "completed",
            patientId: patient,
            ownerId: actor,
            purpose,
            targetResourceId: f.target,
            consumedDocumentId: null,
            consumedResourceId: f.target,
            consumedResult: f.receipt,
            replayed: false,
          },
          { ...f.save, action: "acknowledge", id: draft, expectedRevision: 2 },
          actor,
        );
        expect(acknowledged.consumedResult?.resourceId).toBe(f.target);
        const html = renderToStaticMarkup(
          createElement(ScheduleResourceSummary, { content: f.content }),
        );
        expect(html).not.toContain("<input");
        expect(html).not.toContain(f.target);
        expect(html).not.toContain("<contato>");
      },
    );
  it("keeps partial fields separate from complete official commands and refuses expanded authority", () => {
    const f = prepared(),
      fields = {
        form: "type" as const,
        name: "",
        start: "",
        duration: "",
        active: false,
      };
    expect(
      scheduleResourceSaveSchema.parse({
        ...f.save,
        content: {
          scheduleAction: fields,
          referenceHash: null,
          referenceVersion: null,
        },
      }).content.scheduleAction,
    ).toEqual(fields);
    expect(() =>
      scheduleResourceCommand(fields, f.target, f.reference),
    ).toThrow();
    for (const bad of [
      { ...f.save, ownerId: worker },
      { ...f.save, targetDocumentId: seriesId },
      { ...f.save, targetResourceId: null },
      { ...f.save, purpose: "schedule_series_approve" },
      { ...f.save, navigation: { version: 1, stage: "schedule_creation" } },
      { ...f.save, content: { ...f.content, reference: f.reference } },
      { ...f.save, content: { ...f.content, referenceVersion: null } },
    ])
      expect(scheduleResourceSaveSchema.safeParse(bad).success).toBe(false);
  });
  it("retains exact native seconds and the proposal intent independently of later publication rights", () => {
    const f = prepared("schedule_shift_edit"),
      s = f.reference.workspace.shifts[0];
    const fields = initialScheduleResource(
      f.purpose,
      f.target,
      f.reference.workspace,
      day,
      false,
    );
    if (fields.form !== "shift") throw Error("Expected shift");
    fields.reason = "Somente nota própria";
    fields.notes = "<script>texto escapado</script>";
    const command = scheduleResourceCommand(fields, f.target, f.reference);
    expect(command.action).toBe("propose_change");
    if (command.action === "propose_change") {
      expect(command.body.startsAt).toBe(s.starts_at);
      expect(command.body.endsAt).toBe(s.ends_at);
    }
    const cancelled = scheduleResourceCommand(
      {
        ...fields,
        operation: "cancel",
        start: "",
        end: "",
        professionalId: "",
      },
      f.target,
      f.reference,
    );
    expect(cancelled).toEqual({
      action: "cancel",
      body: { id: f.target, reason: fields.reason },
    });
    expect(fields.start).toBe(day + "T19:00");
    expect(fields.notes).toContain("<script>");
    const html = renderToStaticMarkup(
      createElement(ScheduleResourceSummary, {
        content: { ...f.content, scheduleAction: fields },
      }),
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
  it("checks resource references before rendering another scope or unrelated operational records", () => {
    const f = prepared("schedule_shift_edit");
    for (const reference of [
      { ...f.reference, patientId: worker },
      { ...f.reference, purpose: "shift_type_edit" as const },
      { ...f.reference, targetResourceId: type },
      { ...f.reference, version: 4 },
      {
        ...f.reference,
        workspace: {
          ...f.reference.workspace,
          shifts: [{ ...f.reference.workspace.shifts[0], id: type }],
        },
      },
      {
        ...f.reference,
        workspace: {
          ...f.reference.workspace,
          professionals: [
            { id: worker, name: "Opção não deve estar no snapshot" },
          ],
        },
      },
    ]) {
      expect(() =>
        checkScheduleResourceReference(reference, {
          patientId: patient,
          purpose: f.purpose,
          targetResourceId: f.target,
        }),
      ).toThrow();
      expect(() =>
        parsePrivateDraft(
          { ...f.read, content: { ...f.read.content, reference } },
          f.scope,
        ),
      ).toThrow();
    }
    expect(
      parsePrivateDraft(
        { ...f.read, content: { ...f.content, reference: null } },
        f.scope,
      )?.content,
    ).toMatchObject({ scheduleAction: f.fields, reference: null });
  });
  it("rejects substituted actors,targets,intents,source seals and native outcomes", () => {
    const f = prepared("schedule_shift_edit");
    for (const receipt of [
      { ...f.receipt, actorId: worker },
      { ...f.receipt, patientId: worker },
      { ...f.receipt, targetResourceId: type },
      { ...f.receipt, resourceId: type },
      { ...f.receipt, nativeResult: { ...f.receipt.nativeResult, version: 9 } },
      {
        ...f.receipt,
        nativeResult: { ...f.receipt.nativeResult, status: "cancelled" },
      },
      { ...f.receipt, fields: { ...f.fields, reason: "Outro motivo" } },
      { ...f.receipt, sourceTimezone: null },
    ])
      expect(() => parseScheduleResourceReceipt(receipt, f.scope)).toThrow();
    for (const receipt of [
      { ...f.receipt, idempotencyKey: worker },
      { ...f.receipt, referenceHash: "c".repeat(64) },
      { ...f.receipt, expectedVersion: 4 },
    ])
      expect(() =>
        parseScheduleResourceConfirmation(
          { ...f.confirmation, receipt },
          f.packet,
          actor,
        ),
      ).toThrow();
    expect(
      scheduleResourceFieldsMatchCommand(
        {
          ...f.fields,
          form: "shift",
          operation: "cancel",
          professionalId: worker,
          start: "",
          end: "",
          notes: "",
          reason: "Outro motivo",
        },
        f.command,
        f.target,
        "UTC",
      ),
    ).toBe(false);
  });
  it("requires a new result identity only for a real native proposal", () => {
    const f = prepared("schedule_shift_edit");
    if (f.fields.form !== "shift") throw Error("Expected shift");
    const fields = { ...f.fields, operation: "propose_change" as const },
      command = scheduleResourceCommand(fields, f.target, f.reference);
    const receipt = {
      ...f.receipt,
      resourceId: proposalId,
      fields,
      command,
      nativeResult: {
        id: proposalId,
        version: 1,
        status: "pending",
        active: null,
      },
    };
    expect(parseScheduleResourceReceipt(receipt, f.scope).resourceId).toBe(
      proposalId,
    );
    expect(() =>
      parseScheduleResourceReceipt(
        {
          ...receipt,
          resourceId: f.target,
          nativeResult: { ...receipt.nativeResult, id: f.target },
        },
        f.scope,
      ),
    ).toThrow();
  });
  it("unknown stays unknown; numerical source/private advances and exact receipt scope are required", () => {
    const f = prepared();
    expect(
      parseScheduleResourceRecovery(f.recovery, f.packet, actor).status,
    ).toBe("unknown");
    const advanced = {
      ...f.recovery,
      status: "not_applied",
      reason: "source_advanced",
      source: {
        savedTargetVersion: 3,
        currentTargetVersion: 4,
        savedSourceVersion: null,
        currentSourceVersion: null,
      },
    };
    expect(
      parseScheduleResourceRecovery(advanced, f.packet, actor).status,
    ).toBe("not_applied");
    for (const bad of [
      { ...advanced, source: { ...advanced.source, currentTargetVersion: 3 } },
      { ...advanced, source: { ...advanced.source, savedTargetVersion: 2 } },
      { ...advanced, source: null },
      { ...f.recovery, reason: "source_advanced" },
      { ...f.recovery, current: { ...f.recovery.current, revision: 2 } },
      { ...f.recovery, targetResourceId: worker },
      { ...f.recovery, sourceVersion: 1 },
    ])
      expect(() =>
        parseScheduleResourceRecovery(bad, f.packet, actor),
      ).toThrow();
    expect(
      parseScheduleResourceRecovery(
        {
          ...f.recovery,
          status: "not_applied",
          reason: "advanced_revision",
          current: { ...f.recovery.current, revision: 2 },
        },
        f.packet,
        actor,
      ).status,
    ).toBe("not_applied");
    const applied = {
      ...f.recovery,
      status: "applied",
      current: f.confirmation.draft,
      confirmation: f.confirmation,
    };
    delete (applied as Partial<typeof f.recovery>).reason;
    delete (applied as Partial<typeof f.recovery>).source;
    delete (applied as Partial<typeof f.recovery>).receipt;
    expect(parseScheduleResourceRecovery(applied, f.packet, actor).status).toBe(
      "applied",
    );
  });
});

it("a source-only advance cannot retire an approval that may still produce the native obsolete outcome", () => {
  const f = prepared("schedule_change_approve");
  const proof = {
    ...f.recovery,
    status: "not_applied",
    reason: "source_advanced",
    source: {
      savedTargetVersion: 3,
      currentTargetVersion: 3,
      savedSourceVersion: 3,
      currentSourceVersion: 4,
    },
  };
  expect(() => parseScheduleResourceRecovery(proof, f.packet, actor)).toThrow();
  expect(
    parseScheduleResourceRecovery(
      { ...proof, source: { ...proof.source, currentTargetVersion: 4 } },
      f.packet,
      actor,
    ).status,
  ).toBe("not_applied");
  const receipt = {
    ...f.receipt,
    nativeResult: { ...f.receipt.nativeResult, status: "obsolete" },
  };
  expect(
    parseScheduleResourceConfirmation(
      { ...f.confirmation, receipt },
      f.packet,
      actor,
    ).receipt.nativeResult.status,
  ).toBe("obsolete");
});

describe("device schedule recovery inventory", () => {
  it("matches the same validated device intent despite property order and refuses another copy", () => {
    const original = {
      mode: "carry" as const,
      userId: actor,
      patientId: patient,
      purpose: "shift_type_edit" as const,
      targetResourceId: type,
      fields: {
        form: "type" as const,
        name: "Kept",
        start: "",
        duration: "",
        active: true,
      },
    };
    const loaded = scheduleResourceStoredSchema.parse(
      JSON.parse(JSON.stringify(original)),
    );
    expect(JSON.stringify(loaded)).not.toBe(JSON.stringify(original));
    expect(scheduleResourceLocalMatches(loaded, original)).toBe(true);
    expect(
      scheduleResourceLocalMatches(loaded, {
        ...original,
        fields: { ...original.fields, name: "Different" },
      }),
    ).toBe(false);
    expect(
      scheduleResourceLocalMatches(loaded, { ...original, userId: worker }),
    ).toBe(false);
    expect(scheduleResourceLocalMatches(loaded, null)).toBe(false);
  });

  it("discovers only this user and patient without reading other private values", () => {
    const own = scheduleResourceLocalKey(
        actor,
        patient,
        "shift_type_edit",
        type,
      ),
      foreign = scheduleResourceLocalKey(
        worker,
        patient,
        "shift_type_edit",
        type,
      );
    const values = new Map([
      [
        own,
        JSON.stringify({
          mode: "carry",
          userId: actor,
          patientId: patient,
          purpose: "shift_type_edit",
          targetResourceId: type,
          fields: {
            form: "type",
            name: "Own text",
            start: "",
            duration: "",
            active: true,
          },
        }),
      ],
      [foreign, "never read"],
    ]);
    const reads: string[] = [];
    const storage = {
      length: values.size,
      key: (i: number) => [...values.keys()][i] ?? null,
      getItem: (k: string) => {
        reads.push(k);
        return values.get(k) ?? null;
      },
    };
    expect(localScheduleResourceScopes(storage, actor, patient)).toEqual([
      { purpose: "shift_type_edit", target: type, damaged: false },
    ]);
    expect(reads).toEqual([own]);
    const corrupt = {
      getItem: () =>
        JSON.stringify({
          mode: "carry",
          userId: worker,
          patientId: patient,
          purpose: "shift_type_edit",
          targetResourceId: type,
          fields: {
            form: "type",
            name: "Foreign",
            start: "",
            duration: "",
            active: true,
          },
        }),
    };
    expect(
      loadScheduleResourceLocal(
        corrupt,
        own,
        actor,
        patient,
        "shift_type_edit",
        type,
      ).error,
    ).not.toBe("");
  });
  it("preserves a damaged native anchor and exposes an unseen private save without sending it", () => {
    const native = scheduleResourceLocalKey(
        actor,
        patient,
        "shift_type_edit",
        type,
      ),
      privateKey = `hca:private-draft-command:${actor}:${patient}:SCHEDULE:new:schedule_change_reject:${proposalId}`;
    const values = new Map([
      [native, "{damaged"],
      [
        privateKey,
        JSON.stringify({
          careRecipientId: patient,
          kind: "SCHEDULE",
          purpose: "schedule_change_reject",
          targetDocumentId: null,
          targetResourceId: proposalId,
          id: null,
          expectedRevision: null,
          idempotencyKey: key,
          action: "save",
          content: {
            scheduleAction: {
              form: "decision",
              operation: "reject",
              reason: "Preserved",
            },
            referenceHash: hash,
            referenceVersion: 1,
          },
          navigation: { version: 1, stage: "schedule_resource" },
        }),
      ],
    ]);
    const storage = {
      length: values.size,
      key: (i: number) => [...values.keys()][i] ?? null,
      getItem: (k: string) => values.get(k) ?? null,
    };
    expect(localScheduleResourceScopes(storage, actor, patient)).toEqual([
      { purpose: "shift_type_edit", target: type, damaged: true },
      { purpose: "schedule_change_reject", target: proposalId, damaged: false },
    ]);
    expect(values.get(native)).toBe("{damaged");
  });
});
