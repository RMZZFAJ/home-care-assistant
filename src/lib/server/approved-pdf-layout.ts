import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, PDFName, PDFString, rgb, degrees, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { PdfStructure } from "./pdf-structure";

export const documentColors = {
  navy: rgb(25 / 255, 60 / 255, 85 / 255),
  blue: rgb(36 / 255, 94 / 255, 134 / 255),
  ink: rgb(32 / 255, 55 / 255, 68 / 255),
  muted: rgb(87 / 255, 109 / 255, 121 / 255),
  rule: rgb(207 / 255, 222 / 255, 229 / 255),
  pale: rgb(238 / 255, 245 / 255, 249 / 255),
  good: rgb(25 / 255, 103 / 255, 72 / 255),
  goodPale: rgb(237 / 255, 247 / 255, 241 / 255),
  bad: rgb(161 / 255, 46 / 255, 61 / 255),
  badPale: rgb(1, 241 / 255, 242 / 255),
  warn: rgb(131 / 255, 85 / 255, 20 / 255),
  warnPale: rgb(1, 247 / 255, 231 / 255),
  white: rgb(1, 1, 1),
};
export type DocumentTone = "good" | "bad" | "warn" | "blue";
export type DocumentTextRun = {
  page: number; text: string; x: number; baseline: number;
  width: number; size: number; decoration?: boolean; factGroup?: string;
};
export type DocumentCell = { text: string; key?: string; strong?: boolean; tone?: DocumentTone; href?: string; badge?: string };
export type DocumentRow = { cells: DocumentCell[]; category?: string; urgent?: boolean };
export type DocumentColumn = { label: string; fraction: number; align?: "right" };
export type DocumentHeader = {
  modality: string; auditWatermark?: string; title: string; code: string; status: string; tone: DocumentTone;
  asOf: string; requestedAt: string; exporter: string; verificationCode: string;
  privateUrl: string; metric: string; metricLabel: string; urgent?: number;
  seal?: { title: string; actor: string; at: string; how: string; tone: DocumentTone; confirmed: boolean };
};
export class ApprovedPdfTextUnsupportedError extends Error {}

const c = documentColors, W = 595.28, H = 841.89, M = 32.25, BODY = W - 2 * M;
/** A4 flow shared by the approved document models. It owns layout, never business facts. */
export class ApprovedPdfLayout {
  readonly pdf: PDFDocument;
  readonly structure: PdfStructure;
  readonly width = BODY;
  readonly margin = M;
  private page: PDFPage;
  private pageIndex = 0;
  private top = 28;
  private readonly characters: Set<number>[];
  private readonly bottom: number;

  private constructor(pdf: PDFDocument, private fonts: PDFFont[], private header: DocumentHeader, private onText?: (run: DocumentTextRun) => void) {
    this.pdf = pdf;
    this.structure = new PdfStructure(pdf, true);
    this.characters = fonts.map(font => new Set(font.getCharacterSet()));
    this.page = pdf.addPage([W, H]);
    this.bottom = H - Math.max(64, 32 + this.wrap("PDF solicitado por " + header.exporter + " · " + header.requestedAt, 8, BODY - 130).length * 11);
  }

  static async create(header: DocumentHeader, onText?: (run: DocumentTextRun) => void) {
    const pdf = await PDFDocument.create();
    pdf.registerFontkit(fontkit);
    const fonts = await Promise.all(["Regular", "Semibold", "Bold"].map(async weight => pdf.embedFont(await readFile(path.join(process.cwd(), "public/fonts/SourceSans3-" + weight + ".ttf")), { subset: true })));
    pdf.setAuthor("Home Care Assistant");
    pdf.setTitle(header.code + " · " + header.title + " · " + header.modality);
    pdf.setSubject(header.modality);
    pdf.catalog.set(PDFName.of("Lang"), PDFString.of("pt-BR"));
    return new ApprovedPdfLayout(pdf, fonts, header, onText);
  }

  wrap(value: string, size = 11.25, width = BODY, weight = 0) {
    const lines: string[] = [], font = this.fonts[weight];
    const clean = Array.from(value, character => character !== "\n" && (character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127) ? " " : character).join("");
    for (const paragraph of clean.split("\n")) {
      let line = "";
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        const pieces = Array.from(word);
        let part = "";
        for (const letter of pieces) {
          if (font.widthOfTextAtSize(part + letter, size) > width && part) {
            if (line) { lines.push(line); line = ""; }
            lines.push(part); part = "";
          }
          part += letter;
        }
        if (line && font.widthOfTextAtSize(line + " " + part, size) > width) {
          lines.push(line); line = part;
        } else line += (line ? " " : "") + part;
      }
      lines.push(line);
    }
    return lines;
  }

  private paint(text: string, x: number, top: number, size = 11.25, weight = 0, color = c.ink, key?: string, artifact = false) {
    if (!text) return;
    if ([...text].some(letter => !this.characters[weight].has(letter.codePointAt(0)!))) throw new ApprovedPdfTextUnsupportedError("UNREPRESENTABLE_TEXT");
    const width = this.fonts[weight].widthOfTextAtSize(text, size), baseline = H - top - size;
    this.onText?.({ page: this.pageIndex, text, x, baseline, width, size, decoration: artifact, factGroup: key });
    const draw = () => this.page.drawText(text, { x, y: baseline, size, font: this.fonts[weight], color });
    if (artifact) this.structure.artifact(this.page, draw);
    else this.structure.paint(this.page, draw);
  }

  private box(x: number, top: number, width: number, height: number, color: RGB) {
    this.structure.artifact(this.page, () => this.page.drawRectangle({ x, y: H - top - height, width, height, color }));
  }

  private rule(top: number, color = c.rule, thickness = 0.6, x = M, width = BODY) {
    this.structure.artifact(this.page, () => this.page.drawLine({ start: { x, y: H - top }, end: { x: x + width, y: H - top }, color, thickness }));
  }

  link(text: string, x: number, top: number, size: number, href: string, weight = 1) {
    this.paint(text, x, top, size, weight, c.blue);
    this.addLink(x, top, this.fonts[weight].widthOfTextAtSize(text, size), size + 3, href);
  }

  private addLink(x: number, top: number, width: number, height: number, href: string) {
    const url = new URL(href);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error("Invalid document URL");
    const annotation = this.pdf.context.obj({ Type: "Annot", Subtype: "Link", Rect: [x, H - top - height, x + width, H - top], Border: [0, 0, 0], A: { Type: "Action", S: "URI", URI: PDFString.of(url.href) } });
    this.page.node.addAnnot(this.pdf.context.register(annotation));
  }

  private newPage() {
    this.page = this.pdf.addPage([W, H]);
    this.pageIndex = this.pdf.getPageCount() - 1;
    this.box(M, 21, BODY, 49, c.pale);
    this.rule(21, c.blue, 1.5);
    this.paint("Home Care Assistant", M + 9, 28, 10, 2, c.blue, undefined, true);
    this.paint(this.header.modality + " · " + this.header.requestedAt, M + 9, 43, 8, 0, c.muted, undefined, true);
    const codeWidth = this.fonts[2].widthOfTextAtSize(this.header.code, 17);
    this.paint(this.header.code, W - M - codeWidth - 8, 26, 17, 2, c.blue, undefined, true);
    this.paint(this.header.status, W - M - this.fonts[1].widthOfTextAtSize(this.header.status, 8) - 8, 48, 8, 1, c[this.header.tone], undefined, true);
    this.top = 85;
  }

  ensure(height: number) { if (this.top + height > this.bottom) this.newPage(); }
  gap(height = 8) { this.top += height; }

  firstHeader() {
    const h = this.header, rightX = W - M - 140;
    this.rule(this.top, c.blue, 2.5); this.top += 17;
    this.box(M, this.top, 25, 26, c.navy);
    this.paint("HC", M + 4, this.top + 4, 13, 2, c.white);
    this.paint("Home Care Assistant", M + 31, this.top + 1, 9, 2, c.blue);
    this.paint("Gestão da assistência domiciliar", M + 31, this.top + 14, 7.4, 0, c.muted);
    this.top += 37;
    this.paint(h.modality.toLocaleUpperCase("pt-BR"), M, this.top, 8, 2, c.muted);
    const titleLines = this.wrap(h.title, 20.25, h.seal ? 190 : 325, 2);
    this.top += 13;
    this.structure.within(this.structure.element("H1"), () => titleLines.forEach((line, i) => this.paint(line, M, this.top + i * 21.5, 20.25, 2, c.navy)));
    this.top += titleLines.length * 21.5 + 8;
    this.paint("Situação em", M, this.top, 8.5, 0, c.muted);
    this.paint(h.asOf, M, this.top + 13, 9.5, 1, c.ink, "identity/asOf");
    const headerBottom = Math.max(this.top + 32, 169);
    const codeSize = Math.min(25.5, 130 / this.fonts[2].widthOfTextAtSize(h.code, 1));
    this.link(h.code, W - M - this.fonts[2].widthOfTextAtSize(h.code, codeSize), 45, codeSize, h.privateUrl, 2);
    const status = this.wrap(h.status, 9, 125, 1);
    this.box(rightX + 10, 80, 130, status.length * 12 + 8, c[(h.tone + "Pale") as "goodPale"] ?? c.pale);
    this.box(rightX + 10, 80, 2, status.length * 12 + 8, c[h.tone]);
    status.forEach((line, i) => this.paint(line, rightX + 17, 84 + i * 12, 9, 1, c[h.tone]));
    let metricTop = 92 + status.length * 12;
    if (h.urgent) {
      this.box(rightX + 10, metricTop, 130, 31, c.badPale);
      this.paint(h.urgent + (h.urgent === 1 ? " MATERIAL URGENTE" : " MATERIAIS URGENTES"), rightX + 17, metricTop + 7, 8.2, 2, c.bad);
      metricTop += 38;
    }
    this.paint(h.metric, W - M - this.fonts[2].widthOfTextAtSize(h.metric, 17), metricTop, 17, 2, c.navy);
    const metricLines = this.wrap(h.metricLabel, 8.5, 130);
    metricLines.forEach((line, i) => this.paint(line, W - M - this.fonts[0].widthOfTextAtSize(line, 8.5), metricTop + 22 + i * 11, 8.5, 0, c.muted));
    if (h.seal) this.seal(h.seal, M + 199, 65, rightX - M - 209);
    this.top = Math.max(this.top, headerBottom, metricTop + 24 + metricLines.length * 11) + 12;
  }

  private seal(seal: NonNullable<DocumentHeader["seal"]>, x: number, top: number, width: number) {
    const tone = c[seal.tone], flagWidth = 28;
    this.rule(top, tone, 0.8, x, width);
    this.box(x, top + 9, flagWidth, 46, tone);
    this.structure.artifact(this.page, () => this.page.drawSvgPath("M 0 0 L 14 -7 L 28 0 Z", { x, y: H - top - 55, color: c.white }));
    this.structure.artifact(this.page, () => {
      if (seal.confirmed) {
        this.page.drawLine({ start: { x: x + 8, y: H - top - 29 }, end: { x: x + 12, y: H - top - 33 }, color: c.white, thickness: 1.5 });
        this.page.drawLine({ start: { x: x + 12, y: H - top - 33 }, end: { x: x + 21, y: H - top - 23 }, color: c.white, thickness: 1.5 });
      } else this.page.drawCircle({ x: x + 14, y: H - top - 28, size: 6, borderColor: c.white, borderWidth: 1 });
    });
    const contentX = x + 36, available = width - 36;
    let y = top + 10;
    for (const [value, size, weight, color] of [[seal.title.toLocaleUpperCase("pt-BR"), 10, 2, tone], [seal.actor, 9.5, 1, c.ink], [seal.at, 8, 0, c.muted], [seal.how, 8, 0, c.muted]] as const) {
      for (const line of this.wrap(value, size, available, weight)) { this.paint(line, contentX, y, size, weight, color); y += size * 1.3; }
      y += 4;
    }
    this.rule(y + 4, c.rule, 0.6, x, width);
    this.top = Math.max(this.top, y + 7);
  }

  heading(title: string, hint?: string) {
    this.ensure(55); this.gap(10);
    this.structure.within(this.structure.element("H2"), () => this.paint(title, M, this.top, 12, 2, c.navy));
    this.top += 18; this.rule(this.top, c.blue, 0.5); this.top += 7;
    if (hint) this.paragraph(hint, undefined, { size: 9, color: c.muted });
  }

  paragraph(value: string, key?: string, options: { size?: number; strong?: boolean; color?: RGB; inset?: number; href?: string } = {}) {
    const size = options.size ?? 11.25, inset = options.inset ?? 0;
    const rows = this.wrap(value, size, BODY - inset, options.strong ? 1 : 0);
    this.structure.paragraph(() => {
      for (const row of rows) {
        this.ensure(size * 1.42);
        this.paint(row, M + inset, this.top, size, options.strong ? 1 : 0, options.color ?? (options.href ? c.blue : c.ink), key);
        if (options.href) this.addLink(M + inset, this.top, this.fonts[options.strong ? 1 : 0].widthOfTextAtSize(row, size), size + 3, options.href);
        this.top += size * 1.42;
      }
    });
    this.gap(4);
  }

  markedParagraph(value: string, key: string, paths: readonly string[], color: RGB) {
    this.ensure(34);
    this.structure.artifact(this.page, () => paths.forEach((path, index) => this.page.drawSvgPath(path, { x: M + index * 16, y: H - this.top, scale: 0.55, borderColor: color, borderWidth: 1.6 })));
    this.paragraph(value, key, { strong: true, color, inset: paths.length * 16 + 3 });
  }

  fields(fields: { label: string; value: string; key?: string; detail?: string; detailKey?: string }[]) {
    const fraction = BODY / fields.length;
    const rows = fields.map(field => this.wrap(field.value, 10.8, fraction - 12, 1));
    const height = Math.max(...rows.map((row, i) => row.length * 14 + 26 + (fields[i].detail ? this.wrap(fields[i].detail!, 8.5, fraction - 12).length * 11 : 0)));
    if (height > this.bottom - 90) {
      for (const field of fields) { this.heading(field.label); this.paragraph(field.value, field.key); if (field.detail) this.paragraph(field.detail, field.detailKey, { size: 8.5, color: c.muted }); }
      return;
    }
    this.ensure(height + 5); this.rule(this.top); this.top += 9;
    fields.forEach((field, i) => {
      const x = M + fraction * i;
      this.paint(field.label.toLocaleUpperCase("pt-BR"), x, this.top, 8, 2, c.muted);
      rows[i].forEach((line, n) => this.paint(line, x, this.top + 15 + n * 14, 10.8, 1, c.ink, field.key));
      if (field.detail) this.wrap(field.detail, 8.5, fraction - 12).forEach((line, n) => this.paint(line, x, this.top + 17 + rows[i].length * 14 + n * 11, 8.5, 0, c.muted, field.detailKey));
    });
    this.top += height; this.rule(this.top); this.top += 8;
  }

  milestones(steps: { label: string; detail: string; symbol: "document" | "people" | "box" | "check" | "cross" | "clock"; tone?: DocumentTone; done: boolean; current?: boolean }[]) {
    const cell = BODY / steps.length;
    const labels = steps.map(step => this.wrap(step.label, 9.2, cell - 12, 1));
    const details = steps.map(step => this.wrap(step.detail, 8, cell - 12));
    const height = 37 + Math.max(...labels.map(lines => lines.length)) * 12 + Math.max(...details.map(lines => lines.length)) * 11;
    this.ensure(height + 20);
    this.paint("ETAPAS PRINCIPAIS", M, this.top, 8, 2, c.muted); this.top += 24;
    steps.forEach((step, i) => {
      const x = M + cell * (i + 0.5), tone = step.tone ? c[step.tone] : c.muted;
      if (i < steps.length - 1) {
        this.rule(this.top + 8, c.rule, 1, x + 12, cell - 24);
        this.structure.artifact(this.page, () => {
          const arrow = x + cell / 2;
          this.page.drawLine({ start: { x: arrow - 3, y: H - this.top - 4 }, end: { x: arrow + 1, y: H - this.top - 8 }, thickness: 1, color: c.blue });
          this.page.drawLine({ start: { x: arrow + 1, y: H - this.top - 8 }, end: { x: arrow - 3, y: H - this.top - 12 }, thickness: 1, color: c.blue });
        });
      }
      this.structure.artifact(this.page, () => {
        this.page.drawCircle({ x, y: H - this.top - 8, size: 10, color: step.current ? c.pale : c.white, borderColor: tone, borderWidth: step.current ? 1.5 : 0.7 });
        const paths = {
          document: "M -4 -6 L 2 -6 L 5 -3 L 5 6 L -4 6 Z M 2 -6 L 2 -3 L 5 -3 M -2 0 L 3 0 M -2 3 L 3 3",
          people: "M -6 5 L -6 3 Q -6 0 -3 0 Q 0 0 0 3 L 0 5 M 1 0 Q 5 0 5 3 L 5 5 M -3 -2 A 2 2 0 1 0 -3 -6 A 2 2 0 1 0 -3 -2 M 3 -2 A 2 2 0 1 0 3 -6 A 2 2 0 1 0 3 -2",
          box: "M -5 -3 L 0 -6 L 5 -3 L 5 3 L 0 6 L -5 3 Z M -5 -3 L 0 0 L 5 -3 M 0 0 L 0 6 M -2 -4 L 3 -1",
          check: "M -5 0 L -1 4 L 5 -4",
          cross: "M -4 -4 L 4 4 M -4 4 L 4 -4",
          clock: "M 0 -5 A 5 5 0 1 0 0 5 A 5 5 0 1 0 0 -5 M 0 -3 L 0 0 L 3 1",
        };
        this.page.drawSvgPath(paths[step.symbol], { x, y: H - this.top - 8, borderColor: tone, borderWidth: 0.8 });
      });
      labels[i].forEach((line, n) => this.paint(line, x - this.fonts[1].widthOfTextAtSize(line, 9.2) / 2, this.top + 24 + n * 12, 9.2, 1, tone));
      details[i].forEach((line, n) => this.paint(line, x - this.fonts[0].widthOfTextAtSize(line, 8) / 2, this.top + 28 + labels[i].length * 12 + n * 11, 8, 0, c.muted));
    });
    this.top += height;
  }

  async verificationQr(bytes: Uint8Array, href: string) {
    this.ensure(62);
    const image = await this.pdf.embedPng(bytes), size = 55;
    this.structure.within(this.structure.element("Figure", undefined, "QR de consulta da emissão. A conferência do arquivo exige enviar o próprio PDF na página de verificação."), () => this.structure.paint(this.page, () => this.page.drawImage(image, { x: W - M - size, y: H - this.top - size, width: size, height: size })));
    this.addLink(W - M - size, this.top, size, size, href);
    this.top += size + 7;
  }

  async authenticity(description: string, url: string, code: string, qrBytes: Uint8Array) {
    const lines = this.wrap(description, 9.5, BODY - 75);
    const height = Math.max(60, lines.length * 13);
    this.ensure(Math.min(height + 70, this.bottom - 90));
    this.heading("Autenticidade e verificação");
    this.paragraph("Assinatura interna · V1 · Não ICP-Brasil", "auth/profile", { size: 8.5, color: c.muted });
    if (height > this.bottom - 100) {
      this.paragraph(description, "auth/description", { size: 9.5 });
      await this.verificationQr(qrBytes, url);
    } else {
      this.ensure(height + 8);
      this.structure.paragraph(() => lines.forEach((line, i) => this.paint(line, M, this.top + i * 13, 9.5, 0, c.ink, "auth/description")));
      const image = await this.pdf.embedPng(qrBytes), size = 55;
      this.structure.within(this.structure.element("Figure", undefined, "QR para localizar a emissão. Envie o arquivo na página de verificação para conferir seus bytes e assinatura."), () => this.structure.paint(this.page, () => this.page.drawImage(image, { x: W - M - size, y: H - this.top - size, width: size, height: size })));
      this.addLink(W - M - size, this.top, size, size, url);
      this.top += height + 8;
    }
    this.paragraph("Verifique em: " + url, "auth/url", { size: 9.5, href: url });
    this.paragraph("Código deste exemplar: " + code, "auth/code", { size: 10, strong: true });
    this.paragraph("Código e QR localizam a emissão. Para conferir o arquivo recebido e sua assinatura, envie o próprio PDF nessa página. O instante efetivo da assinatura e o carimbo interno podem ser conferidos nessa validação. A consulta detalhada de autoria e da ficha exige acesso autorizado.", "auth/guide", { size: 9, color: c.muted });
  }

  table(columns: DocumentColumn[], rows: DocumentRow[]) {
    const widths = columns.map(col => BODY * col.fraction);
    if (Math.abs(widths.reduce((a, b) => a + b, 0) - BODY) > 0.1) throw new Error("Invalid document columns");
    const tableNode = this.structure.element("Table"), headerNode = this.structure.element("TR", tableNode);
    const headerNodes = columns.map(() => this.structure.element("TH", headerNode));
    let firstHeader = true, category: string | undefined;
    const drawHeader = () => {
      const labels = columns.map((col, i) => this.wrap(col.label, 8.5, widths[i] - 12, 2));
      const height = Math.max(...labels.map(lines => lines.length)) * 11 + 11;
      this.box(M, this.top, BODY, height, c.pale);
      let x = M;
      labels.forEach((lines, i) => {
        lines.forEach((line, n) => { const paint = () => this.paint(line, x + 6, this.top + 5 + n * 11, 8.5, 2, c.muted, undefined, !firstHeader); if (firstHeader) this.structure.within(headerNodes[i], paint); else paint(); });
        x += widths[i];
      });
      this.top += height; this.rule(this.top, c.blue, 0.7); firstHeader = false;
    };
    const drawCategory = (label: string, continuation = false) => {
      const lines = this.wrap(label + (continuation ? " · continuação" : ""), 9.5, BODY - 12, 2);
      const height = lines.length * 12 + 9;
      this.box(M, this.top, BODY, height, c.pale);
      lines.forEach((line, i) => this.paint(line, M + 6, this.top + 4 + i * 12, 9.5, 2, c.navy, undefined, continuation));
      this.top += height; this.rule(this.top);
    };
    this.ensure(100); drawHeader();
    rows.forEach((row, rowIndex) => {
      const cellLines = row.cells.map((cell, i) => [...this.wrap(cell.text, i === 0 ? 9 : 10.75, widths[i] - 12, cell.strong ? 1 : 0), ...(cell.badge ? [cell.badge] : [])]);
      const maxLines = Math.max(...cellLines.map(lines => lines.length));
      if (row.category && row.category !== category) {
        if (this.top + 65 > this.bottom) { this.newPage(); drawHeader(); }
        category = row.category; drawCategory(category);
      }
      const fullHeight = Math.max(35, maxLines * 15 + 14);
      // Keep ordinary rows together; only a row taller than a fresh body splits.
      if (this.top + fullHeight > this.bottom && fullHeight <= this.bottom - 150) {
        this.newPage(); drawHeader(); if (category) drawCategory(category, true);
      }
      const rowNode = this.structure.element("TR", tableNode), cellNodes = row.cells.map(() => this.structure.element("TD", rowNode));
      let offset = 0;
      while (offset < maxLines) {
        if (this.top + 32 > this.bottom) { this.newPage(); drawHeader(); if (category) drawCategory(category, true); }
        const count = Math.min(maxLines - offset, Math.max(1, Math.floor((this.bottom - this.top - 14) / 15)));
        const height = Math.max(35, count * 15 + 14);
        if (row.urgent) { this.box(M, this.top, BODY, height, c.badPale); this.box(M, this.top, 2, height, c.bad); }
        let x = M;
        row.cells.forEach((cell, i) => {
          if (i === 0 && offset > 0 && offset >= cellLines[i].length) this.paint(cellLines[i][0] ?? "", x + 6, this.top + 7, 9, 0, c.muted, undefined, true);
          this.structure.within(cellNodes[i], () => cellLines[i].slice(offset, offset + count).forEach((line, n) => {
            const badge = Boolean(cell.badge && offset + n === cellLines[i].length - 1);
            const size = badge ? 7 : i === 0 ? 9 : 10.75, weight = badge ? 2 : cell.strong ? 1 : 0;
            const left = columns[i].align === "right" ? x + widths[i] - 6 - this.fonts[weight].widthOfTextAtSize(line, size) : x + 6;
            if (badge) this.structure.artifact(this.page, () => this.page.drawRectangle({ x: left - 2, y: H - this.top - 9 - n * 15 - size, width: this.fonts[weight].widthOfTextAtSize(line, size) + 4, height: size + 4, borderColor: c.bad, borderWidth: 0.4 }));
            this.paint(line, left, this.top + 7 + n * 15, size, weight, badge ? c.bad : cell.tone ? c[cell.tone] : c.ink, cell.key);
            if (cell.href) this.addLink(left, this.top + 7 + n * 15, this.fonts[weight].widthOfTextAtSize(line, size), size + 3, cell.href);
          }));
          x += widths[i];
        });
        this.top += height; offset += count;
        this.rule(this.top, rowIndex === rows.length - 1 || rows[rowIndex + 1]?.category !== category ? c.blue : c.rule, rowIndex === rows.length - 1 || rows[rowIndex + 1]?.category !== category ? 0.9 : 0.4);
        if (offset < maxLines) { this.newPage(); drawHeader(); if (category) drawCategory(category, true); }
      }
    });
    this.gap(8);
  }

  observation(value: string, number: number, key?: string) {
    const lines = this.wrap(value, 11.25, BODY - 33);
    let offset = 0;
    while (offset < lines.length) {
      this.ensure(38);
      const count = Math.min(lines.length - offset, Math.max(1, Math.floor((this.bottom - this.top - 16) / 16)));
      const height = count * 16 + 14;
      this.box(M, this.top, BODY, height, c.pale); this.box(M, this.top, 2, height, c.blue);
      this.paint(String(number).padStart(2, "0"), M + 8, this.top + 7, 11, 2, c.blue, undefined, offset > 0);
      this.structure.paragraph(() => lines.slice(offset, offset + count).forEach((line, n) => this.paint(line, M + 29, this.top + 7 + n * 16, 11.25, 0, c.ink, key)));
      this.top += height + 7; offset += count;
    }
  }

  finish() {
    const finalPage = this.page;
    for (const [index, page] of this.pdf.getPages().entries()) {
      this.page = page;
      this.pageIndex = index;
      if (this.header.auditWatermark) {
        if ([...this.header.auditWatermark].some(letter => !this.characters[0].has(letter.codePointAt(0)!))) throw new ApprovedPdfTextUnsupportedError("UNREPRESENTABLE_TEXT");
        const glyphs: { text: string; column: number; advance: number }[] = [];
        let column = 0, advance = 0;
        for (const text of this.header.auditWatermark) {
          // Separate vertical baselines so extraction preserves repeated letters as distinct glyphs.
          const width = Math.max(4.5, this.fonts[0].widthOfTextAtSize(text, 6.3));
          if (advance + width > 700) { column++; advance = 0; }
          if (column >= 3) throw new Error("Audit watermark does not fit the reserved margin");
          glyphs.push({ text, column, advance });
          advance += width;
        }
        this.structure.artifact(page, () => glyphs.forEach(glyph => page.drawText(glyph.text, { x: 14 + glyph.column * 8, y: 60 + glyph.advance, size: 6.3, font: this.fonts[0], color: c.muted, rotate: degrees(90), opacity: 0.5 })));
      }
      const footer = this.wrap("PDF solicitado por " + this.header.exporter + " · " + this.header.requestedAt, 8, BODY - 130);
      const top = H - 29 - footer.length * 11 - 13;
      this.rule(top - 7);
      footer.forEach((line, n) => this.paint(line, M, top + n * 11, 8, 0, c.muted, undefined, true));
      this.paint("Uso restrito · Informações pessoais de saúde.", M, top + footer.length * 11 + 2, 7.5, 0, c.muted, undefined, true);
      const shortCode = this.header.verificationCode.slice(-8).match(/.{1,4}/g)?.join("-") ?? this.header.verificationCode;
      const id = this.header.code + " · " + shortCode;
      this.paint(id, W - M - this.fonts[0].widthOfTextAtSize(id, 7), top, 7, 0, c.muted, undefined, true);
      const number = (index + 1) + " / " + this.pdf.getPageCount();
      this.paint(number, W - M - this.fonts[0].widthOfTextAtSize(number, 8), top + 13, 8, 0, c.muted, undefined, true);
    }
    this.page = finalPage; this.pageIndex = this.pdf.getPageCount() - 1; this.structure.finish();
  }
}
