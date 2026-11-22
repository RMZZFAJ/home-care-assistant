import { PDFArray, PDFDict, PDFHexString, PDFName, PDFNumber, PDFOperator, PDFOperatorNames, type PDFDocument, type PDFPage, type PDFRef } from "pdf-lib";

type Role = "Document" | "Div" | "H1" | "H2" | "P" | "Table" | "TR" | "TH" | "TD" | "Figure";
export type StructureElement = { ref: PDFRef; kids: PDFArray; role: Role } | null;

/** Logical tags for the server's own painter; not a public-upload PDF processor. */
export class PdfStructure {
  private root: PDFDict | null = null;
  private document: StructureElement = null;
  private current: StructureElement = null;
  private artifactDepth = 0;
  private pages = new Map<PDFPage, PDFRef[]>();

  constructor(private pdf: PDFDocument, enabled: boolean) {
    if (!enabled) return;
    const root = pdf.context.obj({ Type: "StructTreeRoot", K: [] });
    this.root = root;
    const ref = pdf.context.register(root);
    const doc = this.make("Document", ref);
    root.lookup(PDFName.of("K"), PDFArray).push(doc.ref);
    this.document = doc;
    pdf.catalog.set(PDFName.of("StructTreeRoot"), ref);
    pdf.catalog.set(PDFName.of("MarkInfo"), pdf.context.obj({ Marked: true }));
    pdf.catalog.set(PDFName.of("ViewerPreferences"), pdf.context.obj({ DisplayDocTitle: true }));
  }

  private make(role: Role, parent: PDFRef) {
    const dict = this.pdf.context.obj({ Type: "StructElem", S: role, P: parent, K: [] });
    if (role === "TH") dict.set(PDFName.of("A"), this.pdf.context.obj({ O: "Table", Scope: "Column" }));
    return { ref: this.pdf.context.register(dict), kids: dict.lookup(PDFName.of("K"), PDFArray), role };
  }

  element(role: Exclude<Role, "Document">, parent = this.document, alternative?: string): StructureElement {
    if (!parent) return null;
    const node = this.make(role, parent.ref);
    parent.kids.push(node.ref);
    if (alternative) this.pdf.context.lookup(node.ref, PDFDict).set(PDFName.of("Alt"), PDFHexString.fromText(alternative));
    return node;
  }

  within<T>(node: StructureElement, paint: () => T): T {
    const previous = this.current;
    this.current = node;
    try { return paint(); } finally { this.current = previous; }
  }

  paragraph<T>(paint: () => T): T {
    return this.within(this.current ?? this.element("P"), paint);
  }

  artifact<T>(page: PDFPage, paint: () => T): T {
    if (!this.root || this.artifactDepth) return paint();
    page.pushOperators(PDFOperator.of(PDFOperatorNames.BeginMarkedContent, [PDFName.of("Artifact")]));
    this.artifactDepth++;
    try { return paint(); } finally {
      this.artifactDepth--;
      page.pushOperators(PDFOperator.of(PDFOperatorNames.EndMarkedContent));
    }
  }

  paint<T>(page: PDFPage, paint: () => T): T {
    if (!this.root || this.artifactDepth) return paint();
    const node = this.current ?? this.element("P")!;
    let parents = this.pages.get(page);
    if (!parents) {
      page.node.set(PDFName.of("StructParents"), PDFNumber.of(this.pages.size));
      page.node.set(PDFName.of("Tabs"), PDFName.of("S"));
      parents = [];
      this.pages.set(page, parents);
    }
    const mcid = parents.length;
    parents.push(node.ref);
    node.kids.push(this.pdf.context.obj({ Type: "MCR", Pg: page.ref, MCID: mcid }));
    page.pushOperators(PDFOperator.of(PDFOperatorNames.BeginMarkedContentSequence, [PDFName.of(node.role), this.pdf.context.obj({ MCID: mcid }).toString()]));
    try { return paint(); } finally { page.pushOperators(PDFOperator.of(PDFOperatorNames.EndMarkedContent)); }
  }

  finish() {
    if (!this.root) return;
    const nums = this.pdf.context.obj([]);
    for (const [index, parents] of [...this.pages.values()].entries()) {
      nums.push(PDFNumber.of(index));
      nums.push(this.pdf.context.obj(parents));
    }
    this.root.set(PDFName.of("ParentTree"), this.pdf.context.register(this.pdf.context.obj({ Nums: nums })));
    this.root.set(PDFName.of("ParentTreeNextKey"), PDFNumber.of(this.pages.size));
  }
}
