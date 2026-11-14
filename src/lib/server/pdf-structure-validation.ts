import { decodePDFRawStream, PDFArray, PDFBool, PDFDict, PDFHexString, PDFName, PDFNumber, PDFRawStream, PDFRef, type PDFDocument } from "pdf-lib";

const key = PDFName.of;
const requireStructure: (condition: unknown) => asserts condition = (condition) => {
  if (!condition) throw new Error("Invalid composed PDF structure");
};

/** Strict validation of our own V10 content grammar; never used for public PDF uploads. */
export function validatePdfStructure(pdf: PDFDocument) {
  const rootRef = pdf.catalog.get(key("StructTreeRoot"));
  requireStructure(rootRef instanceof PDFRef);
  const root = pdf.context.lookup(rootRef, PDFDict);
  requireStructure(root.lookup(key("Type"), PDFName).asString() === "/StructTreeRoot");
  requireStructure(pdf.catalog.lookup(key("MarkInfo"), PDFDict).lookup(key("Marked"), PDFBool).asBoolean());
  const top = root.lookup(key("K"), PDFArray);
  requireStructure(top.size() === 1);
  const seen = new Set<string>(), roles: Record<string, number> = {};
  const content = new Map<string, { node: PDFRef; role: string }>();
  const allowed = new Set(["Document", "Div", "H1", "H2", "P", "Table", "TR", "TH", "TD", "Figure"]);
  const visit = (ref: PDFRef, parent: PDFRef, parentRole: string) => {
    requireStructure(ref instanceof PDFRef && !seen.has(ref.toString()) && seen.size < 100_000);
    seen.add(ref.toString());
    const node = pdf.context.lookup(ref, PDFDict), role = node.lookup(key("S"), PDFName).decodeText();
    requireStructure(node.lookup(key("Type"), PDFName).asString() === "/StructElem" && node.get(key("P"))?.toString() === parent.toString() && allowed.has(role));
    requireStructure(parentRole === "root" ? role === "Document" : role !== "Document");
    if (parentRole === "Table") requireStructure(role === "TR");
    if (parentRole === "TR") requireStructure(role === "TH" || role === "TD");
    if (role === "TR") requireStructure(parentRole === "Table");
    if (role === "TH" || role === "TD") requireStructure(parentRole === "TR");
    if (role === "TH") {
      const attrs = node.lookup(key("A"), PDFDict);
      requireStructure(attrs.lookup(key("O"), PDFName).asString() === "/Table" && attrs.lookup(key("Scope"), PDFName).asString() === "/Column");
    }
    if (role === "Figure") requireStructure(Boolean(node.lookup(key("Alt"), PDFHexString).decodeText().trim()));
    roles[role] = (roles[role] ?? 0) + 1;
    const children = node.lookup(key("K"), PDFArray);
    for (const child of children.asArray()) {
      if (child instanceof PDFRef) visit(child, ref, role);
      else {
        requireStructure(child instanceof PDFDict && child.lookup(key("Type"), PDFName).asString() === "/MCR");
        requireStructure(["H1", "H2", "P", "TH", "TD", "Figure"].includes(role));
        const page = child.get(key("Pg")), mcid = child.lookup(key("MCID"), PDFNumber).asNumber();
        requireStructure(page instanceof PDFRef && Number.isSafeInteger(mcid) && mcid >= 0);
        const id = `${page}:${mcid}`;
        requireStructure(!content.has(id));
        content.set(id, { node: ref, role });
      }
    }
    if (role === "Table") {
      requireStructure(children.size() > 0);
      const rows = children.asArray().map(row => pdf.context.lookup(row, PDFDict));
      const count = rows[0].lookup(key("K"), PDFArray).size();
      requireStructure(count > 0);
      rows.forEach((row, index) => {
        const cells = row.lookup(key("K"), PDFArray);
        requireStructure(cells.size() === count);
        cells.asArray().forEach(cell => requireStructure(pdf.context.lookup(cell, PDFDict).lookup(key("S"), PDFName).decodeText() === (index ? "TD" : "TH")));
      });
    }
  };
  visit(top.get(0) as PDFRef, rootRef, "root");
  requireStructure(roles.H1 === 1 && roles.H2 > 0 && roles.Table > 0 && roles.Figure === 1);
  const nums = root.lookup(key("ParentTree"), PDFDict).lookup(key("Nums"), PDFArray);
  const pages = pdf.getPages(), used = new Set<string>();
  requireStructure(nums.size() === pages.length * 2 && root.lookup(key("ParentTreeNextKey"), PDFNumber).asNumber() === pages.length);
  pages.forEach((page, index) => {
    requireStructure(page.node.lookup(key("StructParents"), PDFNumber).asNumber() === index && page.node.lookup(key("Tabs"), PDFName).asString() === "/S");
    requireStructure(nums.lookup(index * 2, PDFNumber).asNumber() === index);
    const parents = nums.lookup(index * 2 + 1, PDFArray);
    parents.asArray().forEach((ref, mcid) => requireStructure(content.get(`${page.ref}:${mcid}`)?.node.toString() === ref.toString()));
    const streams = page.node.lookup(key("Contents"));
    const raw = streams instanceof PDFArray ? streams.asArray() : [streams];
    const stack: ("artifact" | string)[] = [];
    for (const item of raw) {
      const stream = pdf.context.lookup(item);
      requireStructure(stream instanceof PDFRawStream);
      const body = Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1")
        .replace(/\/(H1|H2|P|TH|TD|Figure)\s*<<\s*\/MCID\s+(\d+)\s*>>\s*BDC/g, (_, role: string, mcid: string) => `\n@MARK ${role} ${mcid}\n`);
      for (const line of body.split(/\r?\n/).map(value => value.trim())) {
        const marker = /^@MARK (\w+) (\d+)$/.exec(line);
        if (marker) {
          const id = `${page.ref}:${Number(marker[2])}`;
          requireStructure(!used.has(id) && content.get(id)?.role === marker[1]);
          used.add(id); stack.push(id);
        } else if (line === "/Artifact BMC") stack.push("artifact");
        else if (line === "EMC") requireStructure(stack.pop() !== undefined);
        else if (/(?:^|\s)(?:BMC|BDC)$/.test(line)) throw new Error("Unsupported composed PDF tag grammar");
        else if (/(?:^|\s)(?:Tj|TJ|Do)(?:\s|$)/.test(line) || /(?:^|\s)(?:S|s|f\*?|F|B\*?|b\*?)$/.test(line)) requireStructure(stack.length > 0);
      }
    }
    requireStructure(stack.length === 0);
  });
  requireStructure(content.size > 0 && used.size === content.size);
  return { elements: seen.size, markedContent: used.size, roles, pages: pages.length };
}
