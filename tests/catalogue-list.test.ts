import { expect, it } from "vitest";
import { parseCatalogueWorkspace, parseCatalogueCollectionRead, parseProfilesPage } from "@/lib/validation/catalogue-list";

const patient = "20000000-0000-4000-8000-000000000001", other = "20000000-0000-4000-8000-000000000002";
const item = (id = "material") => ({ product_id: id, care_recipient_id: patient, name: "Material", description: null, category: "higiene", unit: "unidade", aliases: ["Nome anterior"], is_active: true, quantity_decimals: 0, sort_order: 0, updated_at: "2026-11-11T10:00:00Z" });
const native = { careRecipientId: patient, items: [item()], total: 1, successors: [] };
const collection = { careRecipientId: patient, includeInactive: true, data: [{ ...item(), id: "material" }], total: 1 };

it("requires a complete native collection rather than guessing zero", () => {
  expect(parseCatalogueWorkspace(native, patient).items).toHaveLength(1);
  expect(parseCatalogueWorkspace({ ...native, items: [], total: 0 }, patient).items).toEqual([]);
  for (const value of [null, {}, { ...native, total: 0 }, { ...native, total: 2 }, { ...native, careRecipientId: other }, { ...native, items: [{ ...item(), care_recipient_id: other }] }, { ...native, items: [item(), item()], total: 2 }])
    expect(() => parseCatalogueWorkspace(value, patient)).toThrow();
});
it("retains every identity and guidance beyond the tabular1000-row limit", () => {
  const items = Array.from({ length: 1005 }, (_, i) => item("material-" + i));
  const result = parseCatalogueWorkspace({ ...native, items, total: 1005, successors: [{ product_id: "material-1004", successor_product_id: "material-1003" }] }, patient);
  expect(result.items.map(row => row.product_id)).toEqual(items.map(row => row.product_id));
  expect(result.successors[0].product_id).toBe("material-1004");
});
it("refuses incomplete,duplicate or self-referencing guidance", () => {
  for (const successors of [[{ product_id: "missing", successor_product_id: "material" }], [{ product_id: "material", successor_product_id: "missing" }], [{ product_id: "material", successor_product_id: "material" }]])
    expect(() => parseCatalogueWorkspace({ ...native, successors }, patient)).toThrow();
});
it("binds the normalized list to the patient,identity,count and inactive selection", () => {
  expect(parseCatalogueCollectionRead(collection, patient).data[0].id).toBe("material");
  for (const value of [{ ...collection, total: 0 }, { ...collection, careRecipientId: other }, { ...collection, data: [{ ...collection.data[0], id: "other" }] }, { ...collection, includeInactive: false }, { ...collection, data: [{ ...collection.data[0], care_recipient_id: other }] }])
    expect(() => parseCatalogueCollectionRead(value, patient)).toThrow();
  expect(() => parseCatalogueCollectionRead({ ...collection, includeInactive: false, data: [{ ...collection.data[0], is_active: false }] }, patient, false)).toThrow();
  expect(parseCatalogueCollectionRead({ ...collection, includeInactive: false }, patient, false).data).toHaveLength(1);
});
const profiles = Array.from({ length: 21 }, (_, index) => ({ id: `30000000-0000-4000-8000-${String(index).padStart(12, "0")}`, full_name: "Nome fictício", role: "family", status: "active", global_scope: false, created_at: "2026-11-11T10:00:00Z" }));
const page = { data: profiles, total: 1011, profilePage: 34, pageSize: 30, query: "Nome" };
it("accepts the last global page beyond1000 including all existing roles", () => {
  expect(parseProfilesPage(page, 34, " Nome ").data).toEqual(profiles);
  expect(parseProfilesPage({ ...page, data: [], total: 0, profilePage: 1 }, 1, "Nome").total).toBe(0);
});
it("refuses a wrong page,query,size,count or repeated account", () => {
  for (const value of [{ ...page, profilePage: 1 }, { ...page, query: "other" }, { ...page, pageSize: 20 }, { ...page, total: 1012 }, { ...page, data: [profiles[0], ...profiles.slice(0, 20)] }, { data: [] }])
    expect(() => parseProfilesPage(value, 34, "Nome")).toThrow();
});
