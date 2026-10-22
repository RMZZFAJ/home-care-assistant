import { describe, expect, it } from "vitest";
import { safeReturnPath } from "@/lib/safe-return-path";

describe("destino do callback de autenticação", () => {
  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "\\evil.example", "/admin\n", "/rota-inexistente", "javascript:alert(1)"])("rejeita %s", (path) => {
    expect(safeReturnPath(path, "https://home.example")).toBe("/");
  });
  it.each(["/historico", "/historico/123", "/admin?patient=123", "/inventarios", "/recuperar-senha", "/convites/aceitar?token=x"])("preserva destino interno autorizado %s", (path) => {
    expect(safeReturnPath(path, "https://home.example")).toBe(path);
  });
});
