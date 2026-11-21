import { describe, expect, it } from "vitest";
import { parseProfileRead } from "@/lib/validation/profile";
import { parseConsumptionPage } from "@/lib/validation/consumption";
const patient = "10000000-0000-4000-8000-000000000001", other = "10000000-0000-4000-8000-000000000002";
const profile = { data: { full_name: "Pessoa fictícia", professional_registration: null, professional_state: null, professional_category: null, notification_preferences: {}, avatar: null, email: "pessoa@example.test", phone: null, providers: [] }, memberships: [], sessions: [] };
describe("personal and consumption read states", () => {
  it("accepts a profile without optional data and confirms empty collections only after a valid result", () => {
    expect(parseProfileRead(profile)).toEqual(profile); expect(parseConsumptionPage({ data: [], next: null }, patient)).toEqual({ data: [], next: null });
  });
  it.each([null, {}, { ...profile, data: null }, { ...profile, memberships: undefined }])("rejects an unreadable profile instead of retaining loading forever", value => {
    expect(() => parseProfileRead(value)).toThrow("A resposta da consulta do perfil não pôde ser lida");
  });
  it("retains nullable device information without inventing a device or timestamp", () => {
    const session = { id: other, createdAt: "2026-11-07T02:47:19.123456+00:00", updatedAt: null, userAgent: null, current: true };
    expect(parseProfileRead({ ...profile, sessions: [session] }).sessions[0]).toEqual(session);
  });
  it.each([null, {}, { data: null, next: null }, { data: [], next: "bad-cursor" }])("does not replace an invalid consumption read with an empty list", value => {
    expect(() => parseConsumptionPage(value, patient)).toThrow("A resposta da consulta dos relatos não pôde ser lida");
  });
  it("rejects another patient's otherwise valid report", () => {
    const row = { id: other, care_recipient_id: other, kind: "shortage", location: "FAMILY", status: "reported", body: "Relato fictício", created_at: "2026-11-07T02:47:19Z", version: 1, reported_by: patient, reported_name: null };
    expect(() => parseConsumptionPage({ data: [row], next: null }, patient)).toThrow("Atualize a lista");
    expect(parseConsumptionPage({ data: [{ ...row, care_recipient_id: patient }], next: null }, patient).data).toHaveLength(1);
  });
});
