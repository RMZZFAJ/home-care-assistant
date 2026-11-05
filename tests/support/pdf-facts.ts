/** D0 contract. D4 must feed this with independent text/geometry extraction. */
export type ExtractedPdfPage = { width: number; height: number; text: string; textBounds: { x: number; y: number; width: number; height: number }[] };
export type PdfFact = { name: string; value: string };

export function verifyPdfFacts(pages: ExtractedPdfPage[], facts: PdfFact[]) {
  const normalize = (text: string) => text.normalize("NFKC").replaceAll(/\s+/g, " ").trim();
  const text = normalize(pages.map((page) => page.text).join(" "));
  const failures: string[] = [];
  if (!pages.length) failures.push("missing-pages");
  if (!text) failures.push("missing-text");
  if (!facts.length) failures.push("missing-expected-facts");
  for (const fact of facts) if (!normalize(fact.value) || !text.includes(normalize(fact.value))) failures.push("missing-fact:" + fact.name);
  for (const [index, page] of pages.entries()) {
    if (![page.width, page.height].every((n) => Number.isFinite(n) && n > 0)) failures.push(`invalid-page:${index}`);
    if (page.text.trim() && !page.textBounds.length) failures.push(`missing-geometry:${index}`);
    for (const b of page.textBounds) if (![b.x, b.y, b.width, b.height].every(Number.isFinite) || b.x < 0 || b.y < 0 || b.width <= 0 || b.height <= 0 || b.x + b.width > page.width || b.y + b.height > page.height) failures.push(`out-of-page:${index}`);
  }
  return { passed: failures.length === 0, failures };
}
