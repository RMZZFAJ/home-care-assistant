import { beforeEach, describe, expect, it, vi } from "vitest";

const setup = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => setup.client,
}));
import { POST } from "@/app/api/requisitions/route";

const patientId = "10000000-0000-4000-8000-000000000001";
const requisitionId = "20000000-0000-4000-8000-000000000001";
const body = {
  careRecipientId: patientId,
  lines: [
    {
      productId: "product",
      productName: "Client label is untrusted",
      category: "higiene",
      currentStock: 4,
      urgent: false,
    },
  ],
  extraItems: [],
  observations: [],
  idempotencyKey: "30000000-0000-4000-8000-000000000001",
};
function request() {
  return new Request("https://care.example/api/requisitions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://care.example",
    },
    body: JSON.stringify(body),
  });
}
function fixture(
  options: {
    absentProfile?: boolean;
    absentPatient?: boolean;
    receiptFailure?: boolean;
    conflict?: boolean;
  } = {},
) {
  const receipt = {
    id: requisitionId,
    protocol: "HC-000012",
    created_at: "2026-10-20T12:00:00Z",
    requester_name_snapshot: "Original requester",
    recipient_name_snapshot: "Original patient",
    profiles: { full_name: "Changed requester" },
    care_recipients: { display_name: "Changed patient" },
    requisition_items: [
      {
        id: "item",
        product_id: "product",
        current_stock: 4,
        urgent: false,
        product_name_snapshot: "Original product",
        category_snapshot: "higiene",
        unit_snapshot: "pacote",
        snapshot_source: "persisted",
        products: { name: "Changed product", category: "dieta", unit: "caixa" },
      },
    ],
    requisition_observations: [],
  };
  const rpc = vi.fn(async (name: string, args?: Record<string, unknown>) => {
    void args;
    if (name === "my_session_valid") return { data: true, error: null };
    if (name === "my_active_context")
      return {
        data: { mode: "patient", care_recipient_id: patientId },
        error: null,
      };
    if (name === "patient_capabilities")
      return { data: { "req.create": true, "bal.count": true }, error: null };
    return name === "is_global_administrator"
      ? { data: false, error: null }
      : options.conflict
        ? {
            data: null,
            error: { code: "P0001", message: "idempotency conflict" },
          }
        : {
            data: [{ requisition_id: requisitionId, protocol: "HC-000012" }],
            error: null,
          };
  });
  const from = vi.fn((table: string) => {
    const result =
      table === "profiles"
        ? { full_name: "Current requester", status: "active" }
        : table === "care_recipients"
          ? { id: patientId, display_name: "Current patient", is_active: true }
          : table === "care_recipient_memberships"
            ? { role: "professional", status: "active", can_count_stock: true }
            : receipt;
    const data =
      (table === "profiles" && options.absentProfile) ||
      (table === "care_recipients" && options.absentPatient)
        ? null
        : result;
    const query = {
      select: () => query,
      eq: () => query,
      maybeSingle: async () =>
        table === "requisitions" && options.receiptFailure
          ? { data: null, error: { message: "temporary outage" } }
          : { data, error: null },
    };
    return query;
  });
  setup.client = {
    auth: {
      getUser: async () => ({
        data: { user: { id: "40000000-0000-4000-8000-000000000001" } },
        error: null,
      }),
    },
    from,
    rpc,
  };
  return { rpc, from };
}

beforeEach(() => {
  fixture();
});
describe("requisition persistence response", () => {
  it("uses persisted original snapshots and excludes client catalogue labels from the transaction", async () => {
    const { rpc } = fixture();
    const response = await POST(request());
    expect(response.status).toBe(201);
    const result = await response.json();
    expect(result).toMatchObject({
      persistence: "confirmed",
      receipt: {
        requisitionId,
        requesterName: "Original requester",
        recipientName: "Original patient",
        legacyReconstructed: false,
        lines: [
          {
            productName: "Original product",
            category: "higiene",
            unit: "pacote",
            currentStock: 4,
          },
        ],
      },
    });
    const args = rpc.mock.calls.find(
      ([name]) => name === "submit_requisition",
    )?.[1] as Record<string, unknown> | undefined;
    expect(args?.p_lines).toEqual([
      { productId: "product", currentStock: 4, urgent: false },
    ]);
    expect(args?.p_care_recipient_id).toBe(patientId);
  });
  it("returns the confirmed persistent identity when receipt recovery fails", async () => {
    fixture({ receiptFailure: true });
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      code: "RECEIPT_PENDING",
      persistence: "confirmed",
      requisitionId,
      protocol: "HC-000012",
      retryable: true,
    });
  });
  it("reports conflicting idempotency content without emitting a receipt", async () => {
    fixture({ conflict: true });
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      code: "IDEMPOTENCY_CONFLICT",
    });
  });
  it("denies missing profile and unauthorized patient before the persistence call", async () => {
    for (const options of [{ absentProfile: true }, { absentPatient: true }]) {
      const { rpc } = fixture(options);
      const response = await POST(request());
      expect([403, 404]).toContain(response.status);
      expect(
        rpc.mock.calls.some(([name]) => name === "submit_requisition"),
      ).toBe(false);
    }
  });
});
