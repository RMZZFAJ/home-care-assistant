import { describe, expect, it } from "vitest";
import { accessibilityEvidence } from "./support/accessibility-results";
import { verifyPdfFacts, type ExtractedPdfPage } from "./support/pdf-facts";

describe("D0 discriminating oracles", () => {
  it("retains axe incomplete as review work, independently of violations", () => {
    const finding = { id: "color-contrast", nodes: [{ target: ["button"], failureSummary: "Needs visual review" }] };
    const evidence = accessibilityEvidence("ENT receive / mobile / disputed", { violations: [], incomplete: [finding] });
    expect(evidence).toMatchObject({ status: "AUTOMATED_PASS_REVIEW_REQUIRED", surface: "ENT receive / mobile / disputed", reviewRequired: [{ rule: "color-contrast", nodes: [{ target: ["button"] }] }] });
    expect(accessibilityEvidence("control", { violations: [], incomplete: [] }).status).toBe("AUTOMATED_PASS");
    expect(accessibilityEvidence("unnamed-button", { violations: [{ ...finding, id: "button-name" }], incomplete: [finding] }).status).toBe("FAIL");
  });

  it.each(["REQ", "COM", "ENT", "BAL"])("rejects a blank %s artifact despite preserved pages and metadata", (type) => {
    const facts = [{ name: "identity", value: type + "-000001" }, { name: "product", value: "Fralda" }, { name: "quantity", value: "3 unidades" }, { name: "actor", value: "Pessoa fictícia" }, { name: "state", value: "Estado confirmado" }];
    const page: ExtractedPdfPage = { width: 595, height: 842, text: facts.map((fact) => fact.value).join("\n"), textBounds: [{ x: 20, y: 30, width: 500, height: 200 }] };
    expect(verifyPdfFacts([page], facts).passed).toBe(true);
    const blank = verifyPdfFacts([{ ...page, text: "", textBounds: [] }], facts);
    expect(blank.passed).toBe(false);
    expect(blank.failures).toContain("missing-fact:product");
    expect(verifyPdfFacts([{ ...page, text: page.text.replace("Fralda", "Outro material") }], facts).passed).toBe(false);
    expect(verifyPdfFacts([{ ...page, textBounds: [{ x: 20, y: 830, width: 500, height: 20 }] }], facts).failures).toContain("out-of-page:0");
  });
});
