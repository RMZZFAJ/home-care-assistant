import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BalanceMaterials, type BalanceMaterial } from "@/components/balances/balance-materials";

const render = (counted: BalanceMaterial["counted"], reference: BalanceMaterial["reference"]) =>
  renderToStaticMarkup(createElement(BalanceMaterials, { rows: [{ id: "material", name: "Material da contagem", unit: "unidade", counted, reference }] }));

describe("physical count presentation preserves exact facts", () => {
  it("never invents a zero reference or a difference when the reference is absent", () => {
    const html = render("1", undefined);
    expect(html).toContain("1 unidade");
    expect(html).toContain("Referência não disponível");
    expect(html).toContain("Diferença não disponível");
    expect(html).not.toContain(">0 unidade<");
    expect(html).not.toContain("Sem diferença");
  });
  it("keeps an unfilled physical count distinct from explicit zero", () => {
    expect(render("", "0")).toContain("Contagem não informada");
    expect(render("", "0")).toContain("Diferença não disponível");
    expect(render("0", "0")).toContain("Sem diferença");
  });
  it("retains exact decimal differences and units without coercing to float", () => {
    const html = render("0,100001", "0.100002");
    expect(html).toContain("0,100001 unidade");
    expect(html).toContain("0,100002 unidade");
    expect(html).toContain("-0,000001 unidade");
  });
});
