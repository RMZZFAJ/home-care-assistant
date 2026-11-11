import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFString,
  rgb,
  degrees,
  type PDFFont,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import QRCode from "qrcode";
import { PdfStructure } from "./pdf-structure";
import {
  documentStatuses,
  type DocumentType,
  type PurchaseProgress,
  type PurchaseReceipt,
  type DeliveryCancellationContext,
  type DeliveryRecipientSelection,
  type DeliveryRegularizationContext,
  type BalanceReviewFacts,
} from "@/types/documents";
import { receiptStates } from "@/lib/documents/purchase";
import { documentEventLabel } from "@/lib/notifications/event-labels";
import { formatBrazilDate } from "@/lib/receipt";
import {
  sourceNameLabels,
  type PdfSourceFacts,
} from "@/lib/documents/pdf-source-facts";
import { formatQuantity, quantity } from "@/lib/quantity";
import {
  readPresentationConversions,
  presentationCaption,
} from "@/lib/presentation-conversion";
import {
  formatStockObservation,
  formatStockObservationTime,
} from "@/lib/stock-observation";
import type {
  StockObservation,
  StockObservationTimeSource,
} from "@/types/requisition";
import { documentVariant } from "@/lib/documents/variant";
import type { PdfFidelityFacts } from "@/lib/documents/pdf-fidelity";
import { entReceiptState } from "@/lib/documents/ent-receipt-state";
import { balanceApplicationFacts } from "@/lib/validation/balance-application";
import { balanceCorrectionFacts } from "@/lib/validation/balance-corrections";
import { purchaseEntryBalances } from "@/lib/validation/purchase-entry-balances";

type Person = {
  id?: string;
  name: string;
  registration?: string;
  state?: string;
  category?: string;
};
export type DocumentSnapshot = {
  id: string;
  type: DocumentType;
  code: string;
  protocol: string;
  version: number;
  status: string;
  createdAt?: string;
  sourceFacts?: unknown;
  documentFacts?: unknown;
  balanceApplication?: unknown;
  balanceReviewCorrections?: unknown;
  materialIdentity?: string;
  materialIdentitySource?: string;
  purchaseProgress?: PurchaseProgress;
  purchaseReceipts?: PurchaseReceipt[];
  purchaseEntryBalances?: unknown;
  deliveryCancellation?: DeliveryCancellationContext | null;
  deliveryRegularization?: DeliveryRegularizationContext | null;
  transfer?: Omit<
    import("@/types/transfers").TransferFacts,
    "canAgree" | "canDispatch" | "canWithdraw"
  >;
  balanceReviews?: BalanceReviewFacts;
  actors?: { issuer?: Person; recipient?: Person; patient?: Person };
  lines: Record<string, unknown>[];
  payload: Record<string, unknown>;
  workflow?: Record<string, unknown>;
  attachments?: { filename: string; sha256: string }[];
  sciencePolicy?: {
    familyAware?: boolean;
    science_satisfied_at?: string;
    policy?: Record<string, unknown>;
    manual_archive_required?: boolean;
    completed_at?: string;
    archived_at?: string;
  };
  scienceEvents?: { actor_name: string; mode: string; created_at: string }[];
  history?: {
    action: string;
    actorName: string;
    createdAt: string;
    version: number;
  }[];
  fulfillmentLines?: { id: string; attended: boolean }[];
  demo?: boolean;
  isHistorical?: boolean;
};
const navy = rgb(0.073, 0.18, 0.235),
  teal = rgb(0.07, 0.49, 0.52),
  muted = rgb(0.39, 0.47, 0.53);
const lineColor = rgb(0.83, 0.88, 0.9),
  pale = rgb(0.96, 0.975, 0.98),
  mint = rgb(0.9, 0.96, 0.95);
const white = rgb(1, 1, 1),
  pageWidth = 595.28,
  pageHeight = 841.89,
  margin = 44,
  width = pageWidth - margin * 2;
export function requisitionNextStep(snapshot: DocumentSnapshot) {
  const policy = snapshot.sciencePolicy;
  if (snapshot.isHistorical) return "Preservar o registro histórico";
  if (snapshot.status === "cancelled") return "Documento cancelado";
  if (policy?.archived_at) return "Documento arquivado";
  if (policy?.completed_at) {
    if (policy.manual_archive_required)
      return "Revisão e arquivamento manual pelo administrador";
    return "Aguardar arquivamento ou revisão administrativa";
  }
  if (
    snapshot.fulfillmentLines?.length &&
    snapshot.fulfillmentLines.every((line) => line.attended)
  )
    return "Conferir e conciliar a ENT vinculada";
  return "Providenciar ENT e conferir recebimento";
}
function wrap(value: unknown, font: PDFFont, size: number, maxWidth: number) {
  const result: string[] = [];
  const clean = Array.from(String(value ?? "Não informado"), (character) =>
    character !== "\n" &&
    (character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
      ? " "
      : character,
  ).join("");
  for (const paragraph of clean.split("\n")) {
    let row = "";
    for (const word of paragraph.split(/\s+/)) {
      let remaining = word;
      while (remaining && font.widthOfTextAtSize(remaining, size) > maxWidth) {
        if (row) {
          result.push(row);
          row = "";
        }
        let cut = 1;
        while (
          cut < remaining.length &&
          font.widthOfTextAtSize(remaining.slice(0, cut + 1), size) <= maxWidth
        )
          cut++;
        result.push(remaining.slice(0, cut));
        remaining = remaining.slice(cut);
      }
      if (
        row &&
        font.widthOfTextAtSize(row + " " + remaining, size) > maxWidth
      ) {
        result.push(row);
        row = remaining;
      } else row = row ? row + " " + remaining : remaining;
    }
    result.push(row);
  }
  return result;
}
export type PdfEmissionContext = {
  rendererRevision?: 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
  sourceFacts?: PdfSourceFacts;
  fidelityFacts?: PdfFidelityFacts;
  id: string;
  verificationCode: string;
  requestedAt: string;
  requestedName: string;
  representation: "operational" | "derived";
  verificationOrigin: string;
  onText?: (run: {
    page: number;
    text: string;
    x: number;
    baseline: number;
    width: number;
    size: number;
    decoration?: boolean;
    factGroup?: string;
  }) => void;
};
export class PdfTextUnsupportedError extends Error {}
export async function renderDocumentPdf(
  snapshot: DocumentSnapshot,
  hash: string,
  emission?: PdfEmissionContext,
) {
  const revision = emission?.rendererRevision ?? 5;
  const sourceFacts = revision >= 6 ? emission?.sourceFacts : undefined;
  const fidelity = revision >= 7 ? emission?.fidelityFacts : undefined;
  const corrections = revision >= 12 && snapshot.type === "BAL" ? balanceCorrectionFacts.parse(snapshot.balanceReviewCorrections) : undefined;
  const entries = revision >= 13 && snapshot.type === "COM" ? purchaseEntryBalances.parse(snapshot.purchaseEntryBalances) : undefined;
  const cancelledV6 = Boolean(sourceFacts && snapshot.status === "cancelled");
  const entState = revision >= 9 && snapshot.type === "ENT" ? entReceiptState(snapshot.status,Boolean(sourceFacts?.historical),typeof snapshot.workflow?.acceptedAt === "string" ? snapshot.workflow.acceptedAt : null,emission?.representation) : null;
  if (emission && revision >= 6 && !sourceFacts)
    throw new Error("Frozen source facts required");
  if (emission && revision >= 7 && !fidelity)
    throw new Error("Frozen fidelity facts required");
  const pdf = await PDFDocument.create();
  const structure = new PdfStructure(pdf, revision >= 10);
  pdf.registerFontkit(fontkit);
  const [regularBytes, boldBytes] = await Promise.all([
    readFile(path.join(process.cwd(), "public/fonts/NotoSans-Regular.ttf")),
    readFile(path.join(process.cwd(), "public/fonts/NotoSans-Bold.ttf")),
  ]);
  const [font, bold] = await Promise.all([
    pdf.embedFont(regularBytes, { subset: true }),
    pdf.embedFont(boldBytes, { subset: true }),
  ]);
  const regularCharacters = sourceFacts
    ? new Set(font.getCharacterSet())
    : null;
  const boldCharacters = sourceFacts ? new Set(bold.getCharacterSet()) : null;
  const date = new Date(
    emission?.requestedAt ?? snapshot.createdAt ?? "2000-01-01T00:00:00Z",
  );
  pdf.setTitle(`${fidelity ? documentVariant(snapshot.type, snapshot.payload, snapshot.workflow) + " · " : ""}${snapshot.code} - Home Care Assistant`);
  pdf.setAuthor("Home Care Assistant");
  pdf.setCreationDate(date);
  pdf.setModificationDate(date);
  if (fidelity) pdf.catalog.set(PDFName.of("Lang"), PDFString.of("pt-BR"));
  pdf.setSubject(
    `${fidelity ? emission?.representation === "derived" ? "Representação de versão histórica" : "Representação documental" : "Comprovante operacional"} · conteúdo v${snapshot.version} · renderizador V${emission ? revision : 4}`,
  );
  if (emission)
    pdf.catalog.set(
      PDFName.of("HCAIssuance"),
      PDFHexString.fromText(
        JSON.stringify({
          id: emission.id,
          verificationCode: emission.verificationCode,
          requestedAt: emission.requestedAt,
          documentId: snapshot.id,
          version: snapshot.version,
          sourceHash: hash,
          rendererRevision: revision,
        }),
      ),
    );
  let page = pdf.addPage([pageWidth, pageHeight]),
    y = 736;
  let decoration = false;
  let headerDecoration = false;
  let factGroup: string | undefined;
  let groupCounter = 0;
  const draw = (
    text: string,
    x: number,
    top: number,
    size = 9,
    strong = false,
    color = navy,
  ) => {
    const characters = strong ? boldCharacters : regularCharacters;
    if (
      characters &&
      [...text].some((character) => !characters.has(character.codePointAt(0)!))
    )
      throw new PdfTextUnsupportedError("UNREPRESENTABLE_TEXT");
    emission?.onText?.({
      page: pdf.getPageCount() - 1,
      text,
      x,
      baseline: top - size,
      width: (strong ? bold : font).widthOfTextAtSize(text, size),
      size,
      decoration,
      factGroup,
    });
    const paint = () => page.drawText(text, {
      x,
      y: top - size,
      size,
      font: strong ? bold : font,
      color,
    });
    if (headerDecoration) structure.artifact(page, paint);
    else structure.paint(page, paint);
  };
  const rectangle = (options: Parameters<typeof page.drawRectangle>[0]) =>
    structure.artifact(page, () => page.drawRectangle(options));
  function header() {
    decoration = true;
    headerDecoration = true;
    rectangle({
      x: 0,
      y: pageHeight - 82,
      width: pageWidth,
      height: 82,
      color: navy,
    });
    rectangle({
      x: 0,
      y: pageHeight - 86,
      width: pageWidth,
      height: 4,
      color: teal,
    });
    structure.artifact(page, () => page.drawCircle({ x: 58, y: pageHeight - 44, size: 19, color: teal }));
    draw("HCA", 46, pageHeight - 35, 10, true, white);
    draw("HOME CARE ASSISTANT", 87, pageHeight - 26, 16, true, white);
    draw(
      "GESTÃO DE INSUMOS / COMPROVANTE OPERACIONAL",
      87,
      pageHeight - 49,
      7.5,
      false,
      rgb(0.74, 0.83, 0.86),
    );
    if (snapshot.demo) {
      const watermark = () => page.drawText("EXEMPLO FICTÍCIO", {
        x: 90,
        y: 290,
        font: bold,
        size: 43,
        color: lineColor,
        opacity: 0.34,
        rotate: degrees(31),
      });
      if (pdf.getPageCount() === 1) structure.paint(page, watermark);
      else structure.artifact(page, watermark);
    }
    decoration = false;
    headerDecoration = false;
  }
  header();
  function nextPage() {
    page = pdf.addPage([pageWidth, pageHeight]);
    y = 736;
    header();
  }
  function ensure(height: number) {
    if (y - height < 70) nextPage();
  }
  function text(value: unknown, size = 9, strong = false, color = navy) {
    structure.paragraph(() => {
    for (const row of wrap(value, strong ? bold : font, size, width)) {
      ensure(size * 1.6);
      draw(row, margin, y, size, strong, color);
      y -= size * 1.6;
    }
    });
  }
  function fidelityFact(key: string, label: string, value: string) {
    ensure(45);
    text(label, 9, true);
    factGroup = "fidelity/" + key;
    text(value, 9);
    factGroup = undefined;
  }
  function section(title: string) {
    ensure(55);
    y -= 17;
    structure.within(structure.element("H2"), () => text(title.toLocaleUpperCase("pt-BR"), 10, true));
    y -= 6;
  }
  function fields(entries: [string, unknown][]) {
    for (let i = 0; i < entries.length; i += 2) {
      const cells = entries.slice(i, i + 2);
      const fieldGroup = structure.element("Div");
      const fieldNodes = cells.map(() => structure.element("P", fieldGroup));
      const group = ++groupCounter;
      const rows = cells.map(([, value]) =>
        wrap(value, font, 9, width / 2 - 24),
      );
      if (emission && Math.max(...rows.map((row) => row.length)) > 40) {
        // Split an oversized field pair before painting. Every fragment retains its label.
        for (
          let offset = 0;
          offset < Math.max(...rows.map((row) => row.length));
          offset += 40
        ) {
          if (offset) nextPage();
          const fragment = rows.map((row) => row.slice(offset, offset + 40)),
            height = Math.max(
              42,
              ...fragment.map((row) => 27 + row.length * 12),
            );
          ensure(height);
          cells.forEach(([label], index) => {
            const x = margin + (index * width) / 2;
            decoration = true;
            const labelText = () => draw(
              label.toLocaleUpperCase("pt-BR") +
                (offset ? " (CONTINUAÇÃO)" : ""),
              x + 12,
              y - 8,
              7,
              true,
              muted,
            );
            if (offset) structure.artifact(page, labelText);
            else structure.within(fieldNodes[index], labelText);
            decoration = false;
            factGroup = `${group}:${index}`;
            structure.within(fieldNodes[index], () => fragment[index].forEach((row, n) =>
              draw(row, x + 12, y - 21 - n * 12, 9),
            ));
            factGroup = undefined;
          });
          y -= height;
        }
        continue;
      }
      const height = Math.max(42, ...rows.map((row) => 27 + row.length * 12));
      ensure(height);
      cells.forEach(([label], index) => {
        const x = margin + (index * width) / 2;
        rectangle({
          x,
          y: y - height,
          width: width / 2,
          height,
          color: pale,
          borderColor: lineColor,
          borderWidth: 0.5,
        });
        structure.within(fieldNodes[index], () => draw(label.toLocaleUpperCase("pt-BR"), x + 12, y - 8, 7, true, muted));
        factGroup = `${group}:${index}`;
        structure.within(fieldNodes[index], () => rows[index].forEach((row, n) => draw(row, x + 12, y - 21 - n * 12, 9)));
        factGroup = undefined;
      });
      y -= height;
    }
  }
  function table(headers: string[], fractions: number[], rows: string[][], rowKeys?: string[]) {
    const widths = fractions.map((fraction) => width * fraction);
    const tableNode = structure.element("Table");
    const headerRow = structure.element("TR", tableNode);
    const headerNodes = headers.map(() => structure.element("TH", headerRow));
    let repeatedHeader = false;
    const heading = () => {
      ensure(45);
      rectangle({
        x: margin,
        y: y - 24,
        width,
        height: 24,
        color: navy,
      });
      let x = margin;
      decoration = true;
      headers.forEach((title, i) => {
        const paint = () => draw(title, x + 8, y - 7, 7, true, white);
        if (repeatedHeader) structure.artifact(page, paint);
        else structure.within(headerNodes[i], paint);
        x += widths[i];
      });
      decoration = false;
      repeatedHeader = true;
      y -= 24;
    };
    heading();
    rows.forEach((cells, index) => {
      const rowNode = structure.element("TR", tableNode);
      const cellNodes = cells.map(() => structure.element("TD", rowNode));
      const group = ++groupCounter;
      const cellGroup = (column: number) => rowKeys?.[index] ? `${rowKeys[index]}/${column}` : `${group}:${column}`;
      const lines = cells.map((cell, i) => wrap(cell, font, 8, widths[i] - 16));
      if (emission && Math.max(...lines.map((row) => row.length)) > 45) {
        for (
          let offset = 0;
          offset < Math.max(...lines.map((row) => row.length));
          offset += 45
        ) {
          if (offset || y - 520 < 70) {
            nextPage();
            heading();
          }
          const fragment = lines.map((row) => row.slice(offset, offset + 45));
          let x = margin;
          fragment.forEach((cell, i) => {
            factGroup = cellGroup(i);
            structure.within(cellNodes[i], () => cell.forEach((row, n) => draw(row, x + 8, y - 6 - n * 11, 8)));
            factGroup = undefined;
            x += widths[i];
          });
          y -= Math.max(22, ...fragment.map((row) => row.length * 11 + 12));
        }
        return;
      }
      const height = Math.max(22, ...lines.map((row) => row.length * 11 + 12));
      if (y - height < 70) {
        nextPage();
        heading();
      }
      if (index % 2 === 0)
        rectangle({
          x: margin,
          y: y - height,
          width,
          height,
          color: pale,
        });
      let x = margin;
      lines.forEach((cell, i) => {
        factGroup = cellGroup(i);
        structure.within(cellNodes[i], () => cell.forEach((row, n) => draw(row, x + 8, y - 6 - n * 11, 8)));
        factGroup = undefined;
        x += widths[i];
      });
      y -= height;
    });
  }
  const title = {
    REQ: sourceFacts?.historical
      ? "REQUISIÇÃO HISTÓRICA DE MATERIAIS"
      : "REQUISIÇÃO DE MATERIAIS",
    COM:
      snapshot.payload.origin === "donation"
        ? "DOAÇÃO DE INSUMOS À FAMÍLIA"
        : snapshot.payload.origin === "purchase"
          ? "COMPRA DE INSUMOS DA FAMÍLIA"
          : "COMPRA OU DOAÇÃO DE INSUMOS",
    ENT: "COMPROVANTE DE ENTREGA DE MATERIAIS",
    BAL: "BALANÇO DO ESTOQUE DA EQUIPE",
  }[snapshot.type];
  structure.within(structure.element("H1"), () => text(fidelity && !(snapshot.type === "REQ" && sourceFacts?.historical)
    ? documentVariant(snapshot.type, snapshot.payload, snapshot.workflow).toLocaleUpperCase("pt-BR") : title,
    snapshot.type === "ENT" ? 17 : 19, true));
  y -= 6;
  const familyAware =
    snapshot.sciencePolicy?.familyAware ??
    Boolean(snapshot.sciencePolicy?.science_satisfied_at);
  const purchaseOrigin =
    snapshot.type === "COM" &&
    (snapshot.payload.origin === "purchase" ||
      snapshot.payload.origin === "donation")
      ? snapshot.payload.origin
      : undefined;
  const preservedEntStatus=entState?Object.hasOwn(documentStatuses,snapshot.status)?documentStatuses[snapshot.status]:"Situação não reconhecida nesta versão":null;
  const statusText = entState
    ? entState.kind==="historical" ? "Registro histórico · recebimento original não apurado" : entState.kind==="derived" ? "Estado da versão preservada: "+preservedEntStatus : preservedEntStatus
    : snapshot.isHistorical
    ? sourceFacts && snapshot.status === "cancelled"
      ? "Registro histórico cancelado · ciência original não comprovada"
      : "Registro histórico · ciência original não comprovada"
    : sourceFacts && ["cancelled", "rejected"].includes(snapshot.status)
      ? documentStatuses[snapshot.status]
      : snapshot.type === "REQ" && snapshot.status !== "cancelled"
        ? snapshot.sciencePolicy?.archived_at
          ? "Arquivada"
          : snapshot.sciencePolicy?.completed_at
            ? "Atendimento concluído"
            : familyAware
              ? "Aguardando atendimento"
              : "Ciência e atendimento pendentes"
        : (documentStatuses[
            snapshot.type === "COM"
              ? (snapshot.purchaseProgress?.state ?? snapshot.status)
              : snapshot.status
          ] ?? snapshot.status);
  text(
    `${snapshot.code} · ${sourceFacts ? `${sourceFacts.historical ? "Origem" : "Emissão operacional"}: ${formatBrazilDate(sourceFacts.historical ? sourceFacts.sourceCreatedAt : sourceFacts.issuedAt)}` : formatBrazilDate(snapshot.createdAt ?? null)} · ${statusText}`,
    9,
  );
  y -= 12;
  const total = snapshot.lines.length,
    checked = snapshot.lines.filter(
      (item) => item.fully_checked === true,
    ).length;
  const attended =
    snapshot.fulfillmentLines?.filter((item) => item.attended).length ?? 0;
  const issues = snapshot.lines.filter(
    (item) =>
      (item.metadata as Record<string, unknown> | undefined)?.issueOpen ===
      true,
  ).length;
  const metrics =
    snapshot.type === "REQ"
      ? [
          [
            String(total),
            sourceFacts?.historical ? "ITENS NO REGISTRO" : "ITENS SOLICITADOS",
          ],
          [
            String(snapshot.lines.filter((item) => item.urgent).length),
            "URGENTES",
          ],
          [
            sourceFacts?.historical ? "NÃO APURADO" : String(attended),
            sourceFacts?.historical
              ? "ATENDIMENTO DE ORIGEM"
              : "ITENS ATENDIDOS",
          ],
          [
            sourceFacts?.historical
              ? "NÃO COMPROVADA"
              : cancelledV6
                ? familyAware
                  ? "PRESERVADA"
                  : "NÃO EXIGIDA"
                : familyAware
                  ? "FAMÍLIA CIENTE"
                  : "PENDENTE",
            sourceFacts?.historical
              ? "CIÊNCIA ORIGINAL"
              : cancelledV6
                ? "REGISTRO DE CIÊNCIA"
                : "CIÊNCIA FAMILIAR",
          ],
        ]
      : snapshot.type === "ENT"
        ? [
            [String(total), "ITENS DECLARADOS"],
            [String(checked), "CONFERIDOS INTEGRALMENTE"],
            [String(issues), "DIVERGÊNCIAS"],
            [
              entState ? entState.metric : sourceFacts && snapshot.status === "cancelled"
                ? "ENCERRADO"
                : snapshot.workflow?.acceptedAt
                  ? "REGISTRADO"
                  : snapshot.status === "cancelled"
                    ? "ENCERRADO"
                    : snapshot.status === "confirmed"
                      ? "CONCLUÍDO"
                      : "PENDENTE",
              entState?.label ?? "RECEBIMENTO",
            ],
          ]
        : [
            [String(total), "ITENS REGISTRADOS"],
            [String(snapshot.version), "VERSÃO"],
            [snapshot.type, "OPERAÇÃO"],
            [
              sourceFacts && ["cancelled", "rejected"].includes(snapshot.status)
                ? snapshot.status === "cancelled"
                  ? "CANCELADO"
                  : "REJEITADO"
                : (snapshot.type === "BAL" && snapshot.status === "approved") ||
                    (snapshot.type === "COM" && snapshot.status === "received")
                  ? "CONCLUÍDO"
                  : "EM ANDAMENTO",
              "SITUAÇÃO",
            ],
          ];
  ensure(43);
  metrics.forEach(([value, label], i) => {
    const x = margin + (i * width) / 4;
    rectangle({
      x,
      y: y - 42,
      width: width / 4,
      height: 42,
      color: mint,
      borderColor: rgb(0.65, 0.83, 0.82),
      borderWidth: 0.5,
    });
    draw(value, x + 10, y - 8, 9, true);
    draw(label, x + 10, y - 24, 6.2, true, muted);
  });
  y -= 42;
  section(
    snapshot.type === "ENT"
      ? "Identificação da entrega"
      : "Identificação e responsáveis",
  );
  const who = snapshot.actors?.issuer,
    patient = sourceFacts
      ? (sourceFacts.patientName ?? "Nome do paciente não preservado")
      : (snapshot.actors?.patient?.name ??
        snapshot.payload.patientName ??
        "Registrado no documento");
  fields([
    ["Paciente", patient],
    [
      snapshot.type === "REQ" ? "Solicitado por" : "Responsável",
      sourceFacts
        ? (sourceFacts.issuerName ?? "Autoria nominal desconhecida")
        : (who?.name ??
          snapshot.payload.requesterName ??
          "Registrado no documento"),
    ],
    ["Número do documento", snapshot.code],
    ["Protocolo", snapshot.protocol],
    ...(snapshot.type === "ENT"
      ? ([
          [
            "Origem",
            snapshot.payload.source === "FAMILY"
              ? "Estoque da família"
              : "Estoque da equipe",
          ],
          [
            "Destino",
            snapshot.payload.destination === "FAMILY"
              ? "Estoque da família"
              : "Estoque da equipe",
          ],
          [
            "Recebedor designado",
            snapshot.actors?.recipient?.name ?? "Registrado no documento",
          ],
          [
            sourceFacts ? "Expedição operacional" : "Emissão",
            formatBrazilDate(
              sourceFacts ? sourceFacts.issuedAt : (snapshot.createdAt ?? null),
            ),
          ],
        ] as [string, unknown][])
      : ([
          [
            "Registro profissional",
            who?.registration
              ? `${who.registration}/${who.state ?? ""}`
              : "Não informado",
          ],
          ["Situação", statusText],
        ] as [string, unknown][])),
  ]);
  if (sourceFacts) {
    section("Origem, autoria e marcos documentais");
    const fact = (key: string, label: string, value: string) => {
      factGroup = "source/" + key;
      text(`${label}: ${value}`, 9);
      factGroup = undefined;
    };
    if (sourceFacts.historical) {
      fact(
        "originalAt",
        "Data do documento de origem",
        formatBrazilDate(sourceFacts.sourceCreatedAt),
      );
      fact(
        "importedAt",
        "Importação no sistema",
        formatBrazilDate(sourceFacts.importedAt),
      );
      fact(
        "registeredAt",
        "Primeiro registro técnico no sistema",
        formatBrazilDate(sourceFacts.registeredAt),
      );
      text(
        "O registro da importação não comprova a data da emissão original nem sua ciência.",
        8,
      );
    } else {
      if (sourceFacts.draftCreatedAt)
        fact(
          "draftCreatedAt",
          "Primeiro rascunho privado salvo",
          formatBrazilDate(sourceFacts.draftCreatedAt),
        );
      fact(
        "documentCreatedAt",
        "Criação da ficha",
        formatBrazilDate(sourceFacts.documentCreatedAt),
      );
      fact(
        "issuedAt",
        "Emissão operacional registrada",
        formatBrazilDate(sourceFacts.issuedAt),
      );
    }
    fact(
      "issuer",
      "Responsável na origem",
      sourceFacts.issuerName ?? "Autoria nominal desconhecida",
    );
    fact(
      "issuerSource",
      "Proveniência do nome do responsável",
      sourceNameLabels[sourceFacts.issuerSource],
    );
    fact(
      "issuerId",
      "Identidade vinculada ao responsável",
      sourceFacts.issuerId ?? "Identidade não preservada",
    );
    fact(
      "patient",
      "Paciente no registro de origem",
      sourceFacts.patientName ?? "Nome do paciente não preservado",
    );
    fact(
      "patientSource",
      "Proveniência do nome do paciente",
      sourceNameLabels[sourceFacts.patientSource],
    );
  }
  const balanceContext =
    snapshot.type === "BAL"
      ? (snapshot.payload.balanceContext as Record<string, unknown> | undefined)
      : undefined;
  if (balanceContext) {
    section("Plantão e obrigações do balanço");
    const zone = String(balanceContext.timezone ?? "America/Sao_Paulo");
    const stamp = (value: unknown) =>
      typeof value === "string"
        ? new Intl.DateTimeFormat("pt-BR", {
            timeZone: zone,
            dateStyle: "short",
            timeStyle: "short",
          }).format(new Date(value))
        : "Registrado na ficha";
    text(
      "Profissional da contagem: " +
        String(balanceContext.professionalName) +
        " · Plantão: " +
        String(balanceContext.shiftType),
      9,
      true,
    );
    text(
      "Plantão: " +
        stamp(balanceContext.startsAt) +
        " até " +
        stamp(balanceContext.endsAt) +
        " · " +
        zone,
      9,
    );
    text("Contagem efetiva atual: " + stamp(balanceContext.countedAt), 9);
    if (Array.isArray(balanceContext.weeks) && balanceContext.weeks.length)
      text(
        "Semanas vinculadas: " +
          balanceContext.weeks
            .map((week) => String(week).split("-").reverse().join("/"))
            .join(", "),
      );
    text(
      Array.isArray(balanceContext.weeks) && !balanceContext.weeks.length
        ? "Esta contagem tem uma janela formal, sem obrigações semanais vinculadas. Não foram criadas semanas retroativas."
        : "A contagem física é atual. Eventuais semanas anteriores são regularizadas por este documento; seus prazos e atrasos permanecem no histórico.",
      8,
    );
  }
  section(
    snapshot.type === "REQ"
      ? "Materiais solicitados"
      : "Relação dos materiais declarados",
  );
  const name = (item: Record<string, unknown>) =>
    String(
      item.name_snapshot ??
        item.product_name_snapshot ??
        item.custom_name ??
        item.product_id ??
        "Material",
    );
  if (snapshot.type === "REQ")
    table(
      ["Nº", "MATERIAL", "APRESENTAÇÃO", "PRIORIDADE"],
      [0.06, 0.47, 0.24, 0.23],
      snapshot.lines.map((item, i) => [
        String(i + 1).padStart(2, "0"),
        fidelity || item.stock_observation
          ? name(item) +
            "\nEstoque da equipe: " +
            formatStockObservation(
              typeof item.current_stock === "string" ||
                typeof item.current_stock === "number"
                ? item.current_stock
                : null,
              item.stock_observation as StockObservation,
              typeof item.unit_snapshot === "string"
                ? item.unit_snapshot
                : undefined,
            ) +
            (fidelity || Object.hasOwn(item, "stock_observation_at")
              ? "\n" +
                formatStockObservationTime(
                  typeof item.stock_observation_at === "string"
                    ? item.stock_observation_at
                    : null,
                  (fidelity && !["client_draft", "server_submission", "legacy_unknown"].includes(String(item.stock_observation_time_source))
                    ? "legacy_unknown" : item.stock_observation_time_source) as StockObservationTimeSource,
                )
              : "")
          : name(item),
        String(item.unit_snapshot ?? "Não informada"),
        item.urgent ? "URGENTE" : "Rotina",
      ]),
      fidelity ? snapshot.lines.map((item, index) => `fidelity/requisition/${item.id ?? index}`) : undefined,
    );
  else
    table(
      [
        "Nº",
        "MATERIAL",
        snapshot.type === "ENT"
          ? "EXPEDIDO"
          : snapshot.type === "BAL"
            ? "CONTADO"
            : "PROPOSTO",
        "UNIDADE",
      ],
      [0.06, 0.51, 0.16, 0.27],
      snapshot.lines.map((item, i) => [
        String(i + 1).padStart(2, "0"),
        name(item),
        formatQuantity(String(item.quantity ?? 0)),
        String(item.unit_snapshot ?? ""),
      ]),
    );
  if (fidelity && snapshot.type === "REQ") {
    text("O estoque informado é uma observação pontual, não é quantidade pedida nem saldo oficial. Atendimento indica algum aceite positivo na ENT vinculada; não comprova satisfação integral da necessidade.", 8);
    for (const [index, item] of snapshot.lines.entries()) {
      const state = typeof item.id === "string" ? snapshot.fulfillmentLines?.find(line => line.id === item.id) : undefined;
      factGroup = `fidelity/requisition/${item.id ?? index}/status`;
      text(`Item ${String(index + 1).padStart(2, "0")} · ${sourceFacts?.historical
        ? "Atendimento não apurado na origem histórica"
        : state ? state.attended ? "Atendimento com aceite positivo registrado" : "Sem aceite positivo registrado"
          : "Situação de atendimento não preservada nesta versão"}`, 8);
      factGroup = undefined;
    }
  }
  y -= 10;
  const intent = snapshot.payload.intent as
    { observations?: string[] } | undefined;
  const notes = snapshot.payload.notes ?? intent?.observations?.join("\n");
  if (notes) text("Observação: " + String(notes), 8);
  text(
    snapshot.type === "REQ"
      ? "Esta requisição não informa quantidades solicitadas. O atendimento é acompanhado por item após aceite positivo em ENT explicitamente vinculada. A ciência familiar possui registro independente."
      : snapshot.type === "ENT"
        ? "A expedição não comprova recebimento. Apenas quantidades efetivamente aceitas entram no saldo confirmado do destino; diferenças permanecem registradas até resolução formal."
        : snapshot.type === "COM"
          ? "Somente uma parcela de chegada validada credita o estoque familiar. Aquisição e dispensa de expectativa não movimentam estoque. Doações não exigem comprovante de pagamento. Somente ENT recebida pode atender a equipe."
          : "Contagem física exclusiva da equipe. Ajustes aplicados ao ledger dependem da política e das aprovações registradas.",
    8,
  );
  let continueRequisitionTrace = false;
  if (snapshot.type === "REQ") {
    // Keep the heading with its two rows of status fields when observations
    // and their declaration times push this block across a page boundary.
    const materialPage = page;
    ensure(160);
    continueRequisitionTrace = page !== materialPage;
    section("Situação do atendimento");
    fields([
      [
        sourceFacts?.historical ? "Atendimento da origem" : "Linhas atendidas",
        sourceFacts?.historical
          ? "Não comprovado por este registro"
          : `${attended} de ${total}`,
      ],
      [
        sourceFacts?.historical
          ? "Uso deste registro"
          : cancelledV6
            ? "Linhas não atendidas no registro"
            : "Linhas pendentes",
        sourceFacts?.historical
          ? "Consulta histórica; sem pendência operacional"
          : String(total - attended),
      ],
      [
        sourceFacts?.historical ? "Ciência original" : "Ciência familiar",
        sourceFacts?.historical
          ? "Não comprovada"
          : cancelledV6
            ? familyAware
              ? "Preservada no histórico"
              : "Sem comprovação registrada; documento cancelado"
            : familyAware
              ? "Família ciente" +
                (snapshot.sciencePolicy?.science_satisfied_at
                  ? " · " +
                    formatBrazilDate(
                      snapshot.sciencePolicy.science_satisfied_at,
                    )
                  : "")
              : "Pendente nesta versão",
      ],
      ["Próximo passo", requisitionNextStep(snapshot)],
    ]);
  }
  if (continueRequisitionTrace) y -= 20;
  else nextPage();
  text(
    snapshot.type === "REQ"
      ? "RASTREABILIDADE DA REQUISIÇÃO"
      : "CONFERÊNCIA E AUDITORIA",
    19,
    true,
  );
  y -= 7;
  text(`${snapshot.code} · Versão documental ${snapshot.version}`, 9);
  if (snapshot.type === "REQ") {
    const source = snapshot.payload.sourceRequisition as
      | { code?: string; protocol?: string; version?: number; reason?: string }
      | undefined;
    if (source) {
      section("Origem da necessidade remanescente");
      text(
        `${source.code ?? source.protocol ?? "Requisição de origem"} · Referência na emissão: versão ${source.version}`,
        9,
        true,
      );
      text("Motivo próprio: " + source.reason, 9);
      text(
        "Nova intenção com ciência e atendimento próprios. Aceites anteriores e estoque não são duplicados.",
        8,
      );
    }
    section("Ciência familiar");
    if (snapshot.scienceEvents?.length)
      table(
        ["RESPONSÁVEL", "ORIGEM", "DATA"],
        [0.33, 0.37, 0.3],
        snapshot.scienceEvents.map((event) => [
          event.actor_name,
          {
            express: "Expressa no aplicativo",
            dialog: "Diálogo: confirmação antes de abrir",
            tacit: "Tácita: preferência anterior à emissão",
            app_visible: "Automática: conteúdo exibido",
            whatsapp_read: "Automática: leitura WhatsApp",
            whatsapp_confirm: "WhatsApp: confirmação verificada",
            dispatch: "Expedição autorizada",
          }[event.mode] ?? event.mode,
          formatBrazilDate(event.created_at),
        ]),
      );
    else if (sourceFacts?.historical)
      text(
        "Registro histórico: a ciência original não está comprovada. Esta representação preserva o acervo e não inicia uma pendência operacional de ciência.",
      );
    else if (cancelledV6)
      text(
        "Nenhuma ciência foi registrada nesta versão cancelada. O documento não exige nova ciência ou atendimento.",
      );
    else
      text(
        "Nenhuma ciência foi registrada até esta versão. Emissão, envio ou disponibilização do PDF não comprovam ciência.",
      );
  } else if (snapshot.type === "ENT") {
    if (snapshot.transfer) {
      const transfer = snapshot.transfer,
        declaration = transfer.declaration;
      ensure(150);
      section("Declaração e concordância da transferência");
      const custody = (source: string) =>
        source === "FAMILY" ? "Família" : "Equipe";
      text(
        `${custody(declaration.source)} para ${custody(declaration.destination)}`,
        10,
        true,
      );
      text(
        `Declarante: ${declaration.actor.name} · ${formatBrazilDate(declaration.recordedAt)}`,
        9,
      );
      text("Justificativa original: " + declaration.reason, 9);
      text(
        "Contraparte para concordância: " + declaration.counterparty.name,
        9,
      );
      text("Recebedor físico designado: " + declaration.recipient.name, 9);
      if (transfer.agreement) {
        text(
          `${transfer.agreement.decision === "agree" ? "Concordância própria" : "Recusa própria"}: ${transfer.agreement.actor.name} · ${formatBrazilDate(transfer.agreement.recordedAt)}`,
          9,
          true,
        );
        text(transfer.agreement.reason, 9);
      } else text("Sem concordância registrada nesta versão.", 9);
      text(
        transfer.dispatchedAt
          ? "Expedição efetiva: " + formatBrazilDate(transfer.dispatchedAt)
          : "Sem expedição registrada nesta versão.",
        9,
      );
      text(
        transfer.originDocumentId
          ? "ENT documental de origem: " + transfer.originDocumentId
          : "Origem documental não informada.",
        8,
      );
      text(
        "A concordância não comprova recebimento nem credita o destino. O vínculo documental não individualiza lotes.",
        8,
      );
      if (transfer.withdrawal)
        text(
          `${transfer.withdrawal.kind === "administrative_close" ? "Encerramento administrativo" : "Retirada pelo declarante"}: ${transfer.withdrawal.actor.name} · ${formatBrazilDate(transfer.withdrawal.recordedAt)} · ${transfer.withdrawal.reason}`,
          9,
        );
    }
    const selection = snapshot.workflow?.recipientSelection as
      DeliveryRecipientSelection | undefined;
    if (selection) {
      ensure(135);
      section("Indicação do recebedor");
      text(
        `${selection.recipientName} · ${selection.manual ? "Escolha manual" : "Sugestão da escala mantida"}`,
        10,
        true,
      );
      text(
        `Indicado por ${selection.selectedName} · ${formatBrazilDate(selection.recordedAt)}`,
        9,
      );
      if (selection.reason)
        text("Justificativa da escolha: " + selection.reason, 9);
      if (selection.suggestedId)
        text(
          "Pessoa sugerida pela escala: " +
            (selection.shifts.find(
              (shift) => shift.professionalId === selection.suggestedId,
            )?.professionalName ?? "Referência preservada na indicação"),
          9,
        );
      text(
        "A indicação não comprova presença nem substitui o aceite pessoal do recebedor.",
        8,
      );
    }
    section("Declaração do recebimento");
    if(entState)factGroup="fidelity/ent/receipt-state";
    text(
      entState ? entState.declaration : snapshot.workflow?.acceptedAt
        ? `Conferência registrada em ${formatBrazilDate(String(snapshot.workflow.acceptedAt))}. Os aceites positivos são preservados independentemente das divergências.`
        : "Este comprovante foi emitido antes do aceite. A pessoa designada deve conferir os itens e informar quantidades efetivamente recebidas. Nenhum aceite é presumido.",
    );
    if(entState)factGroup=undefined;
    y -= 8;
    table(
      ["MATERIAL", "ACEITO", "CONCILIADO", "SITUAÇÃO"],
      [0.43, 0.15, 0.16, 0.26],
      snapshot.lines.map((item) => [
        name(item),
        formatQuantity(String(item.accepted_quantity ?? 0)),
        formatQuantity(String(item.reconciled_quantity ?? 0)),
        entState && entState.kind !== "pending"
          ? item.fully_checked ? "Conferência integral preservada" : (item.metadata as Record<string,unknown>|undefined)?.issueOpen ? "Situação física não confirmada no registro" : quantity(String(item.reconciled_quantity??0)).gt(0) ? "Conciliação preservada" : entState.pendingLine
          : item.fully_checked
          ? "Integralmente conferido"
          : (item.metadata as Record<string, unknown> | undefined)?.issueOpen
            ? "Divergência aberta"
            : quantity(String(item.reconciled_quantity ?? 0)).gt(0)
              ? "Diferença conciliada"
              : "Aguardando conferência",
      ]),
    );
    if (fidelity) {
      for (const item of snapshot.lines) {
        const metadata = item.metadata as Record<string, unknown> | undefined;
        const receipt = metadata?.receipt as Record<string, unknown> | undefined;
        if (!receipt || !Object.keys(receipt).length) continue;
        section("Divergência preservada · " + name(item));
        const problem = { shortage: "Quantidade menor", damaged: "Material avariado", wrong: "Produto divergente", other: "Outra diferença" };
        fidelityFact(`delivery/${item.id}/problem`, "Classificação declarada", Object.hasOwn(problem, String(receipt.problem)) ? problem[receipt.problem as keyof typeof problem] : "Classificação não preservada");
        fidelityFact(`delivery/${item.id}/notes`, "Nota do recebimento", typeof receipt.notes === "string" && receipt.notes ? receipt.notes : "Nota não preservada");
        fidelityFact(`delivery/${item.id}/accepted`, "Aceito na declaração divergente original", receipt.acceptedQuantity == null ? "Quantidade não preservada" : formatQuantity(String(receipt.acceptedQuantity), String(item.unit_snapshot ?? "")));
      }
      for (const event of fidelity.deliveryResolutions) {
        const line = snapshot.lines.find(item => item.id === event.lineId);
        section("Resolução de divergência · " + (line ? name(line) : "Material não identificado no registro"));
        fidelityFact(`resolution/${event.eventId}/event`, "Evento e versão preservados", `${event.eventId} · v${event.version}`);
        fidelityFact(`resolution/${event.eventId}/actor`, "Responsável no evento", `${event.actorName ?? "Nome histórico não preservado"} · ${event.actorId ?? "Identidade não preservada"} · ${formatBrazilDate(event.recordedAt)}`);
        const labels = { received: "Recebimento complementar", returned: "Devolução à origem", missing: "Falta ou perda conciliada" };
        fidelityFact(`resolution/${event.eventId}/outcome`, "Destino desta parcela da diferença", event.resolution ? labels[event.resolution] : "Resolução não preservada");
        fidelityFact(`resolution/${event.eventId}/quantity`, "Quantidade desta resolução", event.quantity === null ? "Quantidade não preservada" : formatQuantity(event.quantity, line ? String(line.unit_snapshot ?? "") : undefined));
        fidelityFact(`resolution/${event.eventId}/reason`, "Motivo preservado", event.reason || "Motivo não preservado");
      }
    }
    if (snapshot.deliveryCancellation) {
      const cancellation = snapshot.deliveryCancellation,
        request = cancellation.request;
      ensure(140);
      section("Pedido de cancelamento e decisão");
      const labels = {
        pending: "Aguardando decisão do recebedor",
        consented: "Consentido e conciliado",
        refused: "Recusado pelo recebedor",
        withdrawn: "Retirado pelo solicitante",
      };
      text(
        cancellation.historical
          ? "Pedido anterior sem decisão pessoal"
          : labels[request.status],
        10,
        true,
      );
      text(
        `Pedido de ${request.requestedName ?? "nome não preservado"} · ${formatBrazilDate(request.requestedAt)}`,
        9,
      );
      text("Motivo original: " + request.reason, 9);
      if (request.outcome) {
        text(
          `Decisão de ${request.outcome.actorName ?? "nome não preservado"} · ${formatBrazilDate(request.outcome.recordedAt)}`,
          9,
        );
        text("Justificativa da decisão: " + request.outcome.reason, 9);
      }
      if (cancellation.historical) {
        text(
          "Pedido preservado após encerramento administrativo. Não houve consentimento pessoal atribuído ao recebedor; consulte o dossiê de regularização e os efeitos efetivamente apurados.",
          9,
        );
      } else if (request.status === "pending") {
        text(
          "Pedido pendente não estorna material. Devolução real e consumo já confirmado dependem da conciliação pessoal do recebedor.",
          9,
        );
        if (!cancellation.sourceReady)
          text(
            "Referências de consumo indisponíveis neste exemplar. Isso não declara consumo zero.",
            9,
          );
        if (cancellation.lines.length)
          table(
            ["MATERIAL", "ACEITO", "CONSUMO DISPONÍVEL", "EM TRÂNSITO"],
            [0.4, 0.18, 0.24, 0.18],
            cancellation.lines.map((line) => [
              line.name,
              formatQuantity(line.acceptedQuantity, line.unit),
              formatQuantity(line.availableConsumedQuantity, line.unit),
              formatQuantity(line.unresolvedTransit, line.unit),
            ]),
          );
      } else if (request.status === "consented") {
        text(
          "Devoluções físicas declaradas nesta decisão foram registradas. O consumo anterior foi referenciado, sem novo débito.",
          9,
        );
        table(
          ["MATERIAL", "ACEITO", "DEVOLVIDO", "CONSUMO REFERENCIADO"],
          [0.4, 0.18, 0.18, 0.24],
          cancellation.lines.map((line) => [
            line.name,
            formatQuantity(line.acceptedQuantity, line.unit),
            formatQuantity(line.returnQuantity, line.unit),
            formatQuantity(line.consumedQuantity, line.unit),
          ]),
        );
        for (const line of cancellation.lines)
          for (const reference of line.consumptionReferences) {
            ensure(42);
            text(
              `${line.name} · ${formatQuantity(reference.quantity, line.unit)} de consumo confirmado em ${formatBrazilDate(reference.recordedAt)}`,
              9,
            );
            text("Relato de origem: " + reference.reportId, 8);
            text("Movimento de consumo: " + reference.movementId, 8);
          }
      } else
        text(
          "Esta recusa ou retirada preservou os fatos de recebimento e não movimentou estoque.",
          9,
        );
      for (const previous of cancellation.history) {
        ensure(100);
        section("Pedido anterior preservado");
        text(
          `${labels[previous.status]} · pedido de ${previous.requestedName ?? "nome não preservado"} · ${formatBrazilDate(previous.requestedAt)}`,
          9,
        );
        text("Motivo: " + previous.reason, 9);
        if (previous.outcome)
          text(
            `Decisão de ${previous.outcome.actorName ?? "nome não preservado"}: ${previous.outcome.reason}`,
            9,
          );
      }
    }
    for (const item of snapshot.deliveryRegularization?.cases ?? []) {
      ensure(150);
      section("Regularização administrativa");
      const states = {
        pending: "Proposta aguardando conferência independente",
        approved: "Encerramento administrativo aprovado",
        rejected: "Proposta rejeitada, sem movimentação",
        withdrawn: "Proposta retirada, sem movimentação",
        obsolete: "Proposta obsoleta encerrada, sem movimentação",
      };
      text(states[item.state], 10, true);
      text("Procedimento: " + item.id, 8);
      if (revision >= 8) {
        const key = `regularization/${item.id}`;
        fidelityFact(key + "/before", "Estado anterior da ficha", `${documentStatuses[item.before_snapshot.status] ?? item.before_snapshot.status} · v${item.before_snapshot.version}`);
        fidelityFact(key + "/after", "Resultado deste procedimento", states[item.state] + (item.decision ? ` · v${item.decision.version}` : " · sem decisão registrada"));
        fidelityFact(key + "/proposer", "Identidade do proponente", `${item.proposal.proposedName} · ${item.proposed_by} · ${formatBrazilDate(item.proposed_at)}`);
        fidelityFact(key + "/reviewer", "Identidade do conferente designado", `${item.proposal.reviewerName} · ${item.reviewer_id}`);
        fidelityFact(key + "/receipt", "Identidade do aceite pessoal original", item.before_snapshot.acceptedBy ?? "Sem aceite pessoal declarado");
        fidelityFact(key + "/decision", "Identidade da decisão", item.decision ? `${item.decision.actorName} · ${item.decision.actorId} · ${formatBrazilDate(item.decision.recordedAt)}` : "Sem decisão registrada");
        const executed = item.state === "approved" && item.decision?.lines.some(line => line.movementIds?.length);
        fidelityFact(key + "/executor", "Execução transacional dos movimentos", executed && item.decision ? `${item.decision.actorName} · ${item.decision.actorId} · ${formatBrazilDate(item.decision.recordedAt)}` : "Sem movimentação de estoque identificada neste procedimento");
      }
      text(
        `Proposta de ${item.proposal.proposedName} · ${formatBrazilDate(item.proposed_at)} · referência v${item.before_snapshot.version}`,
        9,
      );
      text(
        item.before_snapshot.acceptedBy
          ? `Recebimento pessoal original preservado: ${item.before_snapshot.receiptName ?? "nome não preservado"} · ${formatBrazilDate(item.before_snapshot.acceptedAt)}`
          : "Sem recebimento pessoal declarado no registro original.",
        9,
      );
      if (revision >= 8) {
        fidelityFact(`regularization/${item.id}/reason`, "Motivo original", item.proposal.reason);
        fidelityFact(`regularization/${item.id}/basis`, "Evidências e limites", item.proposal.basis);
      } else {
        text("Motivo original: " + item.proposal.reason, 9);
        text("Evidências e limites: " + item.proposal.basis, 9);
      }
      text(
        "Conferente independente designado: " + item.proposal.reviewerName,
        9,
      );
      text(
        item.state === "approved"
          ? "Efeitos administrativos abaixo não alteram a autoria nem as quantidades do aceite pessoal original."
          : "Quantidades propostas abaixo não representam movimentação confirmada. O histórico e o estoque anterior permanecem preservados.",
        9,
      );
      const lines = item.decision?.lines.length
        ? item.decision.lines
        : item.proposal.lines;
      for (const line of lines) {
        ensure(130);
        text(line.name + " · " + line.unit, 10, true);
        if (revision >= 8) {
          const key = `regularization/${item.id}/${line.lineId}`;
          const applied = item.state === "approved" ? quantity(line.receivedQuantity).plus(line.returnedQuantity).plus(line.missingQuantity) : quantity("0");
          fidelityFact(key + "/before", "Conciliação anterior e trânsito anterior", `${formatQuantity(line.priorReconciledQuantity, line.unit)} · ${formatQuantity(line.pendingQuantity, line.unit)}`);
          fidelityFact(key + "/after", "Conciliação após este procedimento e trânsito restante", `${formatQuantity(quantity(line.priorReconciledQuantity).plus(applied).toFixed(), line.unit)} · ${formatQuantity(quantity(line.pendingQuantity).minus(applied).toFixed(), line.unit)}`);
        }
        text(
          `Expedido: ${formatQuantity(line.expeditedQuantity)} · Aceite pessoal preservado: ${formatQuantity(line.acceptedQuantity)} · Conciliação anterior: ${formatQuantity(line.priorReconciledQuantity)}`,
          9,
        );
        text(
          "Em trânsito antes desta proposta: " +
            formatQuantity(line.pendingQuantity, line.unit),
          9,
        );
        table(
          [
            "RECEBIMENTO APURADO",
            "DEVOLUÇÃO APURADA",
            "FALTA APURADA",
            "DESCONHECIDO",
          ],
          [0.25, 0.25, 0.25, 0.25],
          [
            [
              formatQuantity(line.receivedQuantity),
              formatQuantity(line.returnedQuantity),
              formatQuantity(line.missingQuantity),
              formatQuantity(line.unknownQuantity),
            ],
          ],
        );
        for (const id of line.movementIds ?? [])
          text("Movimento administrativo vinculado: " + id, 8);
      }
      if (item.decision) {
        ensure(70);
        text(
          `Decisão própria de ${item.decision.actorName} · ${formatBrazilDate(item.decision.recordedAt)} · v${item.decision.version}`,
          9,
          true,
        );
        if (revision >= 8) fidelityFact(`regularization/${item.id}/decisionReason`, "Justificativa da decisão", item.decision.reason);
        else text("Justificativa da decisão: " + item.decision.reason, 9);
      }
      if (quantity(item.proposal.unknownQuantity).gt(0)) {
        ensure(65);
        text(
          "Situação física desconhecida permanece em trânsito. Responsável designado para apuração futura: " +
            (item.proposal.followUpOwnerName ?? "nome não preservado") +
            ". Relatos futuros não equivalem a aceite pela pessoa desligada.",
          9,
        );
      }
      for (const finding of item.findings) {
        ensure(65);
        text(
          `Apuração própria de ${finding.actor_name} · ${formatBrazilDate(finding.recorded_at)}`,
          9,
          true,
        );
        text(finding.body, 9);
      }
    }
  } else if (snapshot.type === "COM") {
    section("Aquisição e validação");
    if (entries) {
      section("Saldo da família após a última entrada validada");
      text("Cada material conserva o saldo imediatamente após sua última entrada validada nesta COM. As datas podem ser diferentes. Movimentos posteriores não substituem esse saldo.", 8);
      table(["MATERIAL E UNIDADE", "ADQUIRIDO", "ENTRADA VALIDADA", "SALDO APÓS ENTRADA"], [.34, .18, .20, .28], snapshot.lines.map(item => {
        const fact = entries.find(entry => entry.lineId === item.id)!;
        return [name(item) + " · " + String(item.unit_snapshot ?? "Unidade não preservada"),
          formatQuantity(String(item.purchased_quantity ?? 0), String(item.unit_snapshot ?? "")),
          formatQuantity(String(item.accepted_quantity ?? 0), String(item.unit_snapshot ?? "")),
          fact.state === "known" ? formatQuantity(fact.quantity, String(item.unit_snapshot ?? "")) : fact.state === "restricted" ? "Acesso restrito" : fact.state === "not_validated" ? "Sem entrada validada" : "Não disponível no registro"];
      }), snapshot.lines.map(item => "purchase-entry/" + item.id));
      for (const fact of entries) if (fact.entry) {
        const entry = fact.entry, source = snapshot.lines.find(item => item.id === fact.lineId)!;
        const prefix = "purchase-entry/" + fact.lineId;
        fidelityFact(prefix + "/source", "Última entrada — " + name(source), entry.receiptId + " · evento " + entry.eventId + " · versão " + entry.eventVersion + " · entrada de " + formatQuantity(entry.enteredQuantity, String(source.unit_snapshot ?? "")));
        fidelityFact(prefix + "/submitted", "Registro da parcela", (entry.submittedName ?? "Nome histórico não preservado") + " · " + formatBrazilDate(entry.submittedAt));
        fidelityFact(prefix + "/validated", "Validação desta entrada", (entry.validatorName ?? "Nome histórico não preservado") + " · " + (entry.validatorId ?? "Identidade não preservada") + " · " + formatBrazilDate(entry.validatedAt));
      }
      section("Quantidades e expectativa da aquisição");
    }
    table(
      snapshot.purchaseProgress
        ? [
            "MATERIAL",
            "PREVISTO",
            "APROVADO",
            "ADQUIRIDO",
            "VALIDADO",
            "DISPENSADO",
          ]
        : ["MATERIAL", "APROVADO", "ADQUIRIDO", "VALIDADO"],
      snapshot.purchaseProgress
        ? [0.35, 0.13, 0.13, 0.13, 0.13, 0.13]
        : [0.46, 0.18, 0.18, 0.18],
      snapshot.lines.map((item) => [
        name(item),
        ...(snapshot.purchaseProgress
          ? [formatQuantity(String(item.quantity ?? 0))]
          : []),
        formatQuantity(String(item.approved_quantity ?? 0)),
        formatQuantity(String(item.purchased_quantity ?? 0)),
        formatQuantity(String(item.accepted_quantity ?? 0)),
        ...(snapshot.purchaseProgress
          ? [formatQuantity(String(item.waived_quantity ?? 0))]
          : []),
      ]),
    );
    if (snapshot.purchaseProgress) {
      const progress = snapshot.purchaseProgress;
      table(
        ["MATERIAL", "EM CONFERÊNCIA", "SEM CHEGADA VÁLIDA", "POR ADQUIRIR"],
        [0.4, 0.2, 0.2, 0.2],
        progress.lines.map((line) => [
          line.name,
          formatQuantity(line.pendingValidationQuantity, line.unit),
          formatQuantity(line.unarrivedQuantity, line.unit),
          formatQuantity(line.remainingExpectation, line.unit),
        ]),
      );
      if (progress.closure) {
        ensure(80);
        section("Encerramento da expectativa");
        text(
          `${progress.closure.actorName ?? "Nome não preservado"} · ${formatBrazilDate(progress.closure.recordedAt)}`,
          9,
        );
        text("Motivo: " + progress.closure.reason, 9);
        text(
          progress.physicalPending
            ? "Expectativa não adquirida encerrada. Parcelas em conferência ou aquisição sem chegada válida continuam pendentes. Não é conclusão física."
            : "Expectativa encerrada com quantidade inferior. A parte dispensada não foi recebida e não gerou entrada ou baixa de estoque.",
          9,
        );
      }
    }
    for (const [index, receipt] of (
      snapshot.purchaseReceipts ?? []
    ).entries()) {
      ensure(100);
      section(
        `Parcela ${index + 1} · ${receiptStates[receipt.state] ?? receipt.state}`,
      );
      text(
        `Informada por ${receipt.submitted_name ?? "Autor histórico não preservado"} · ${formatBrazilDate(receipt.created_at)}`,
        9,
      );
      text("Identificador da parcela: " + receipt.id, 8);
      table(
        ["MATERIAL", "DECLARADO NESTA PARCELA", "UNIDADE"],
        [0.5, 0.3, 0.2],
        receipt.lines.map((item) => {
          const line = snapshot.lines.find((line) => line.id === item.lineId);
          return [
            line ? name(line) : "Material identificado na parcela",
            formatQuantity(item.quantity),
            String(line?.unit_snapshot ?? "Não preservada"),
          ];
        }),
      );
      if (receipt.validated_at)
        text(
          `${receipt.state === "rejected" ? "Rejeitada" : "Validada"} por ${receipt.validated_name ?? "Nome histórico não preservado"} · ${formatBrazilDate(receipt.validated_at)}`,
          9,
        );
      if (receipt.reason) text("Motivo: " + receipt.reason, 9);
      if (fidelity) {
        const events = fidelity.purchaseReceiptEvents.filter(event => event.receiptId === receipt.id);
        if (!events.length) text("Vínculo com o evento de origem da parcela não preservado; não foi inferido por quantidade ou data.", 8);
        for (const event of events) {
          fidelityFact(`purchase/${event.eventId}/event`, "Evento desta parcela", `${event.eventId} · v${event.version} · ${documentEventLabel(event.action, purchaseOrigin)}`);
          fidelityFact(`purchase/${event.eventId}/actor`, "Responsável no evento", `${event.actorName ?? "Nome histórico não preservado"} · ${event.actorId ?? "Identidade não preservada"} · ${formatBrazilDate(event.recordedAt)}`);
        }
      }
    }
    if (fidelity) for (const event of fidelity.purchaseReceiptEvents.filter(event => !snapshot.purchaseReceipts?.some(receipt => receipt.id === event.receiptId))) {
      section("Evento de chegada sem parcela preservada no snapshot");
      fidelityFact(`purchase/${event.eventId}/event`, "Evento preservado", `${event.eventId} · v${event.version} · ${documentEventLabel(event.action, purchaseOrigin)}`);
      fidelityFact(`purchase/${event.eventId}/actor`, "Responsável no evento", `${event.actorName ?? "Nome histórico não preservado"} · ${event.actorId ?? "Identidade não preservada"} · ${formatBrazilDate(event.recordedAt)}`);
      text(event.receiptId ? "Referência da parcela preservada: " + event.receiptId : "Identificador da parcela não preservado; não foi inferido por quantidade ou data.", 8);
    }
  } else {
    section("Referência e reconciliação");
    if (revision >= 11) {
      const application = balanceApplicationFacts.parse(snapshot.balanceApplication);
      const after = (id: unknown) => {
        if (application.state !== "applied") return application.state === "not_applied" ? "Não aplicado" : "Não disponível no registro";
        const line = application.lines.find(item => item.lineId === id);
        if (!line) throw new Error("BAL application line missing");
        const source = snapshot.lines.find(item => item.id === id)!;
        return line.state === "restricted" ? "Acesso restrito" : formatQuantity(line.quantity, String(source.unit_snapshot ?? ""));
      };
      table(["MATERIAL E UNIDADE", "REFERÊNCIA", "CONTADO", "SALDO APÓS BALANÇO"], [.34, .20, .20, .26], snapshot.lines.map(item => [
        name(item) + " · " + String(item.unit_snapshot ?? "Unidade não preservada"),
        formatQuantity((item.metadata as Record<string, unknown> | undefined)?.expectedQuantity as string | number | null | undefined),
        item.quantity == null ? "Não informado" : formatQuantity(String(item.quantity)), after(item.id),
      ]));
      fidelityFact("balance/application-state", "Situação da aplicação", application.state === "not_applied" ? "Não aplicado" : application.state === "unavailable" ? "Não disponível no registro" : "Aplicação registrada");
      if (application.state === "applied") {
        fidelityFact("balance/application-act", "Ato e momento do saldo", application.id + " · " + application.actorName + " · " + formatBrazilDate(application.appliedAt) + " · versão " + application.documentVersion);
        for (const line of application.lines) fidelityFact("balance/after/" + line.lineId, "Saldo preservado após aplicação — " + name(snapshot.lines.find(item => item.id === line.lineId)!), after(line.lineId));
        text("O saldo corresponde ao momento desta aplicação. Movimentos posteriores não substituem esse registro.", 8);
      }
    } else {
    table(
      ["MATERIAL", "REFERÊNCIA", "CONTADO"],
      [0.5, 0.25, 0.25],
      snapshot.lines.map((item) => [
        name(item),
        formatQuantity(
          (item.metadata as Record<string, unknown> | undefined)
            ?.expectedQuantity as string | number | null | undefined,
        ),
        formatQuantity(String(item.quantity ?? 0)),
      ]),
    );
    }
  }
  if (snapshot.type === "BAL" && snapshot.balanceReviews) {
    const facts = snapshot.balanceReviews;
    section("Autoria da contagem e revisão");
    text(
      `Contador efetivo: ${facts.counter.name ?? "Autoria não disponível"} · contagem ${facts.countVersion ?? "não identificada"}`,
      10,
      true,
    );
    if (facts.counter.source === "current_profile")
      text("Nome atual do cadastro; o nome histórico não foi preservado.", 8);
    text("Observações originais de quem contou:", 9, true);
    text(facts.notes || "Nenhuma observação registrada.");
    const policy = snapshot.workflow?.reviewPolicy as
      { balReview?: string; balRequirement?: string; balApprovers?: string[] } | undefined;
    text(
      policy?.balReview === "optional"
        ? "Revisão facultativa; a contagem válida não exige fila universal de aprovação."
        : "Revisão conforme a política registrada para esta contagem.",
    );
    if (fidelity) {
      const groups = Array.isArray(policy?.balApprovers) ? policy.balApprovers.map(group => group === "family" ? "Família" : group === "supervisor" ? "Supervisão" : "Grupo não identificado").join(", ") : "Grupos não preservados";
      fidelityFact("review-policy/groups", "Grupos na política desta contagem", groups || "Nenhum grupo habilitado");
      fidelityFact("review-policy/requirement", "Condição preservada de revisão", policy?.balReview === "optional" ? "Revisão facultativa"
        : policy?.balRequirement === "all" ? "Todos os grupos habilitados" : policy?.balRequirement === "any" ? "Qualquer grupo habilitado" : "Condição não preservada");
    }
    for (const review of facts.reviews) {
      section(
        `Parecer da ${review.review_group === "family" ? "família" : "supervisão"} · contagem ${review.count_version}`,
      );
      text(
        `${review.reviewer_name} · ${formatBrazilDate(review.recorded_at)} · versão revisada ${review.reviewed_document_version}`,
        9,
        true,
      );
      if (fidelity) fidelityFact(`review/${review.id}/scope`, "Alcance deste parecer", review.count_version !== facts.countVersion
        ? "Registro de contagem anterior; não é parecer vigente da contagem atual."
        : facts.counter.id && review.reviewer_id !== facts.counter.id && review.reference_state === "current" && Array.isArray(policy?.balApprovers) && policy.balApprovers.includes(review.review_group)
          ? "Parecer da contagem atual e grupo habilitado na política preservada."
          : "Parecer preservado; elegibilidade vigente não comprovada por este contexto.");
      text(
        `Contagem de ${review.reviewed_snapshot.counter.name ?? "Autoria não disponível"}.`,
      );
      text("Observações preservadas de quem contou:", 9, true);
      text(review.reviewed_snapshot.notes || "Nenhuma observação registrada.");
      if (review.count_version !== facts.countVersion)
        for (const line of review.reviewed_snapshot.lines)
          text(
            `${line.name_snapshot}: contado ${formatQuantity(line.quantity, line.unit_snapshot)}.`,
            9,
          );
      text("Parecer próprio do revisor:", 9, true);
      text(review.comment || "Parecer sem comentário adicional.");
      if (review.reviewed_snapshot.opinionOnly) {
        text("Parecer sem efeito de estoque; aplicação, reconto ou ajuste exigem ato próprio.", 9, true);
        const items = review.item_results ?? [];
        if (items.length) {
          table(["Material", "Resultado", "Encaminhamento", "Comentário"], [.28, .18, .24, .30], items.map(item => {
            const source = review.reviewed_snapshot.lines.find(line => line.id === item.lineId);
            return [source ? `${source.name_snapshot} · ${source.unit_snapshot}` : "Material não identificado no registro",
              item.result === "confirmed" ? "Confirmado" : "Diferença apontada",
              item.forwarding === "none" ? "Sem encaminhamento adicional" : item.forwarding === "recount" ? "Reconto indicado; execução não comprovada por este parecer" : "Ajuste autorizado indicado; execução não comprovada por este parecer",
              item.comment || "Sem comentário adicional"];
          }));
          text("Os demais materiais não têm resultado individual declarado neste parecer.", 8);
          if (fidelity) for (const item of items) {
            const source = review.reviewed_snapshot.lines.find(line => line.id === item.lineId);
            fidelityFact(`review/${review.id}/item/${item.lineId}`, "Parecer individual preservado", `${source?.name_snapshot ?? "Material não identificado"} · ${item.result === "confirmed" ? "Confirmado" : "Diferença apontada"} · ${item.forwarding === "none" ? "Sem encaminhamento" : item.forwarding === "recount" ? "Reconto indicado" : "Ajuste autorizado indicado"} · ${item.comment || "Sem comentário adicional"}`);
          }
          if (corrections) for (const item of items.filter(item => item.result === "difference")) {
            const entry = corrections.find(row => row.reviewId === review.id && row.sourceLineId === item.lineId);
            if (!entry) throw new Error("BAL correction reference missing");
            const source = review.reviewed_snapshot.lines.find(line => line.id === item.lineId);
            const prefix = "correction/" + review.id + "/" + item.lineId;
            section("Atos posteriores — " + (source?.name_snapshot ?? "Material não identificado"));
            fidelityFact(prefix + "/scope", "Vínculo demonstrado", entry.sourceState === "unavailable" ? "Identidade histórica do material indisponível; nenhum vínculo presumido." : entry.acts.length ? "Atos posteriores da mesma ficha e material." : "Nenhum reconto posterior vinculado a este material nesta ficha.");
            for (const act of entry.acts) {
              const key = prefix + "/" + act.eventId;
              fidelityFact(key + "/count", "Reconto próprio", "Reconto " + act.countVersion + " · versão " + act.version + " · " + act.line.name + " · " + formatQuantity(act.line.quantity, act.line.unit));
              fidelityFact(key + "/actor", "Autoria e momento", (act.actorName ?? "Nome histórico não preservado") + " · " + formatBrazilDate(act.recordedAt));
              text("Vínculo: " + act.documentId + " · evento " + act.eventId + " · versão " + act.version, 8);
              fidelityFact(key + "/application", "Resultado do ato posterior", act.application.state === "not_applied" ? "Reconto registrado; contagem não aplicada ao estoque." : act.application.state === "unavailable" ? "Saldo após a aplicação: Não disponível no registro." : "Aplicado por " + act.application.actorName + " · " + formatBrazilDate(act.application.appliedAt) + " · versão " + act.application.documentVersion);
              if (act.application.state === "applied") fidelityFact(key + "/after", "Saldo após a aplicação deste reconto", act.application.lines[0].state === "restricted" ? "Acesso restrito" : formatQuantity(act.application.lines[0].quantity, act.line.unit));
            }
            text("Esses atos não substituem o Contado nem o saldo da contagem anterior. Este parecer não confirma as contagens seguintes.", 8);
          }
        } else text("Parecer geral; nenhum resultado individual por material foi declarado.", 8);
      }
      text(
        review.reviewed_snapshot.opinionOnly
          ? "Este parecer não aplicou a contagem ao estoque."
          : review.reviewed_snapshot.appliedBeforeReview
          ? "Revisão posterior: nenhuma reaplicação de estoque."
          : "Revisão da contagem para conciliação conforme política e referência.",
        8,
      );
      if (review.reference_state !== "current")
        text(
          "Referência posterior alterada ou não preservada; este parecer não valida o estoque atual.",
          8,
        );
    }
    if (!facts.reviews.length)
      text("Nenhum parecer independente deste contrato registrado.");
    if (fidelity && facts.legacyApprovals.length) {
      section("Registros legados de aprovação");
      for (const approval of facts.legacyApprovals) {
        const group = approval.review_group === "family" ? "Família" : approval.review_group === "supervisor" ? "Supervisão" : "Grupo não identificado";
        fidelityFact(`legacy-review/${approval.actor_id}/${approval.count_version}`, "Registro legado preservado", `Contagem ${approval.count_version} · ${group} · ${approval.actor_id} · ${approval.actorName ?? "Nome não preservado"} · ${formatBrazilDate(approval.created_at)}`);
        text(approval.count_version !== facts.countVersion ? "Aprovação de contagem anterior; não é aprovação vigente da contagem atual." : "Registro legado desta contagem; elegibilidade histórica não reconstituída.", 8);
        text("O nome é o cadastro consultado ao compor o snapshot; não é prova do nome histórico no ato.", 8);
      }
    }
  }
  const convertedLines = snapshot.lines.flatMap((item) =>
    readPresentationConversions(item.presentation_conversions).map((row) => [
      name(item),
      presentationCaption(row),
    ]),
  );
  if (convertedLines.length) {
    section("Apresentações e equivalências registradas");
    table(
      ["MATERIAL", "EMBALAGENS E UNIDADE BASE"],
      [0.3, 0.7],
      convertedLines,
    );
  }
  if (snapshot.type === "ENT" && snapshot.deliveryRegularization?.cases.length)
    ensure(115);
  section("Linha do tempo operacional");
  table(
    ["DATA/HORA", "RESPONSÁVEL", "EVENTO"],
    [0.28, 0.25, 0.47],
    (snapshot.history ?? []).map((event) => [
      formatBrazilDate(event.createdAt),
      sourceFacts
        ? (() => {
            const actor = sourceFacts.historyActors.find(
              (a) => a.version === event.version,
            );
            return `${actor?.name ?? "Nome do responsável não preservado"}${actor?.id ? ` · Identidade ${actor.id}` : ""}`;
          })()
        : event.actorName || "Sistema",
      `${documentEventLabel(event.action, purchaseOrigin)} · v${event.version}`,
    ]),
  );
  if (
    (snapshot.type === "COM" && snapshot.purchaseProgress) ||
    (snapshot.type === "ENT" &&
      (snapshot.deliveryCancellation ||
        snapshot.deliveryRegularization?.cases.length))
  )
    ensure(300);
  section("Identificação e integridade");
  fields([
    ["Documento", snapshot.code],
    ["Versão", String(snapshot.version)],
    ["ID técnico", snapshot.id],
    ["Hash do conteúdo canônico", hash],
    ...(snapshot.materialIdentity
      ? ([
          ["Identidade material REQ", snapshot.materialIdentity],
          [
            "Origem da referência material",
            snapshot.materialIdentitySource === "legacy_projection"
              ? "Projeção dos dados legados preservados"
              : snapshot.materialIdentitySource === "historical_import"
                ? "Dados conhecidos na importação histórica"
                : "Conteúdo da emissão no sistema",
          ],
        ] as [string, unknown][])
      : []),
  ]);
  y -= 11;
  text(
    "O SHA-256 permite comparar o conteúdo canônico registrado. Não é assinatura digital nem garantia absoluta contra alteração por administradores do banco. Versões e eventos confirmados preservam o histórico operacional. O hash do arquivo PDF é registrado separadamente.",
    7.5,
    false,
    muted,
  );
  if (!snapshot.demo) {
    if (emission) {
      if (sourceFacts) ensure(390);
      section("Emissão deste exemplar");
      fields([
        ["Solicitação de geração", formatBrazilDate(emission.requestedAt)],
        ["Solicitante da geração", emission.requestedName],
        [
          "Representação",
          emission.representation === "derived"
            ? "Nova representação de uma versão histórica"
            : "Documento operacional",
        ],
        ["Assinador técnico", "Home Care Assistant"],
      ]);
      text(
        "A assinatura técnica do sistema e o carimbo de tempo interno não representam assinatura pessoal nem confiança ICP-Brasil. O horário do token é verificado no arquivo; a TSA interna não oferece independência temporal de terceiro.",
        8,
      );
      text(
        `Código de verificação: HCA-${emission.verificationCode.match(/.{4}/g)!.join("-")}`,
        8,
        true,
      );
      text(`Identificação do exemplar: ${emission.id}`, 8);
    }
    ensure(86);
    const verifyUrl = emission
      ? `${emission.verificationOrigin}/verificar/emissao/${emission.verificationCode}`
      : `https://home-care-assistant.vercel.app/verificar/${snapshot.id}?version=${snapshot.version}&hash=${hash}`;
    const qr = await pdf.embedPng(
      await QRCode.toBuffer(verifyUrl, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 180,
      }),
    );
    structure.within(structure.element("Figure", undefined, "QR Code para consultar a integridade deste exemplar; o código digitável consta no texto."), () => structure.paint(page, () => page.drawImage(qr, { x: margin, y: y - 76, width: 76, height: 76 })));
    draw("Verificação de integridade", margin + 88, y - 8, 9, true);
    for (const [index, row] of wrap(
      emission
        ? "O QR consulta o registro deste exemplar. Para comparar os bytes e validar a assinatura, envie o PDF na página de verificação. O conteúdo privado exige acesso autorizado."
        : "O QR exibe somente correspondência do hash e versão. O documento completo continua exigindo acesso autorizado.",
      font,
      8,
      width - 100,
    ).entries())
      draw(row, margin + 88, y - 25 - index * 12, 8);
    y -= 86;
  }
  if (snapshot.attachments?.length) {
    section("Anexos vinculados");
    table(
      ["ARQUIVO", "SHA-256"],
      [0.4, 0.6],
      snapshot.attachments.map((item) => [item.filename, item.sha256]),
    );
  }
  pdf.getPages().forEach((item, index) => {
    structure.artifact(item, () => {
    item.drawLine({
      start: { x: margin, y: 52 },
      end: { x: pageWidth - margin, y: 52 },
      color: lineColor,
      thickness: 0.5,
    });
    item.drawText(
      snapshot.demo
        ? "Documento demonstrativo · Nenhum dado real · Sem valor operacional"
        : `${snapshot.code} · v${snapshot.version} · Conteúdo autorizado`,
      { x: margin, y: 38, font, size: 7, color: muted },
    );
    item.drawText(`Página ${index + 1} de ${pdf.getPageCount()}`, {
      x: pageWidth - margin - 58,
      y: 38,
      font,
      size: 7,
      color: muted,
    });
    });
  });
  structure.finish();
  return Buffer.from(await pdf.save({ useObjectStreams: true }));
}
