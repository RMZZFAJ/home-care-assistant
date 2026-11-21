import { expect, it } from "vitest";
import { documentIssuerName } from "../src/lib/documents/presentation";

it("uses the frozen issuer name even when other current names are available", () => {
  expect(documentIssuerName({ actors: { issuer: { name: "Autoria preservada" } }, currentProfile: { name: "Nome posterior" }, created_by: "id" })).toBe("Autoria preservada");
});

it("does not infer a historical name from an ID, current directory or malformed snapshot", () => {
  for (const snapshot of [{ created_by: "id", currentProfile: { name: "Nome atual" } }, { actors: null }, { actors: { issuer: { name: 10 } } }, { actors: { issuer: { name: " " } } }]) {
    expect(documentIssuerName(snapshot)).toBe("Nome histórico não preservado");
  }
});
