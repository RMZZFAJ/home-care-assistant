import { CATEGORY_LABELS } from "@/lib/catalog";
import { originalAuthorDetail, documentCutLabel } from "@/lib/documents/pdf-presentation";
import { appendDocumentOriginContext, appendDocumentRelated, appendOriginalObservations, appendDocumentCancellation, appendVerificationAndPrivacy } from "./approved-document-sections";
import { PDFHexString, PDFName } from "pdf-lib";
import { ApprovedPdfLayout, type DocumentCell, type DocumentHeader, type DocumentTone } from "./approved-pdf-layout";
import type { DocumentSnapshot, PdfEmissionContext } from "./operational-pdf";
import { pdfSourceFactsSchema } from "@/lib/documents/pdf-source-facts";
import { requirePdfLifecycleFacts } from "@/lib/documents/pdf-lifecycle";
import { formatBrazilDate } from "@/lib/receipt";
import { formatStockObservation, formatStockObservationTime } from "@/lib/stock-observation";
import { readPresentationConversions, presentationCaption } from "@/lib/presentation-conversion";
import type { StockObservation, StockObservationTimeSource } from "@/types/requisition";

const nameOf = (line: Record<string, unknown>) => String(line.name_snapshot ?? line.product_name_snapshot ?? line.custom_name ?? "Material não identificado");
const scienceLabels: Record<string, string> = {
  express: "Ciência expressa · aplicativo", dialog: "Confirmação antes de abrir",
  tacit: "Preferência anterior à emissão", app_visible: "Conteúdo exibido no aplicativo",
  whatsapp_read: "Leitura observada no WhatsApp", whatsapp_confirm: "Confirmação verificada no WhatsApp",
  dispatch: "Expedição autorizada",
};
/** Approved REQ composition. Input is a frozen authorized source; this function performs no reads or mutations. */
export async function renderApprovedRequisitionPdf(snapshot: DocumentSnapshot, emission: PdfEmissionContext) {
  if (snapshot.type !== "REQ") throw new Error("Requisition source required");
  const source = pdfSourceFactsSchema.parse(snapshot.sourceFacts);
  const lifecycle = requirePdfLifecycleFacts(snapshot.lifecycleFacts, snapshot);
  const origin = new URL(emission.verificationOrigin);
  if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') throw new Error("Verification origin required");
  const privateUrl = new URL("/documentos/" + snapshot.id, origin).href;
  const verificationUrl = new URL("/verificar/emissao/" + emission.verificationCode, origin).href;
  const formattedCode = emission.verificationCode.match(/.{1,4}/g)?.join("-") ?? emission.verificationCode;
  const issuer = source.issuerName ?? "Autoria nominal desconhecida";
  const patient = source.patientName ?? "Nome do paciente não preservado";
  const operationalAt = source.historical ? source.sourceCreatedAt : source.issuedAt;
  const awareness = [...(snapshot.scienceEvents ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const familyAware = !source.historical && (snapshot.sciencePolicy?.familyAware === true || Boolean(snapshot.sciencePolicy?.science_satisfied_at));
  const satisfying = familyAware ? awareness.find(event => event.created_at === snapshot.sciencePolicy?.science_satisfied_at) ?? awareness[0] : undefined;
  const complete = Boolean(snapshot.sciencePolicy?.completed_at), archived = Boolean(snapshot.sciencePolicy?.archived_at), cancelled = snapshot.status === "cancelled";
  const status = cancelled ? "Cancelada" : archived ? "Arquivada" : complete ? "Atendimento concluído" : source.historical ? "Registro histórico" : familyAware ? "Em atendimento" : "Ciência e atendimento pendentes";
  const tone: DocumentTone = cancelled ? "bad" : complete || archived ? "good" : "warn";
  const attended = source.historical ? null : snapshot.fulfillmentLines?.filter(line => line.attended).length ?? null;
  const header: DocumentHeader = {
    modality: "Ficha", title: source.historical ? "Requisição histórica de materiais" : "Requisição de materiais",
    code: snapshot.code, status, tone, asOf: documentCutLabel(snapshot), privateUrl,
    requestedAt: formatBrazilDate(emission.requestedAt), exporter: emission.requestedName,
    verificationCode: emission.verificationCode,
    metric: attended === null ? String(snapshot.lines.length) : attended + " / " + snapshot.lines.length,
    metricLabel: attended === null ? "materiais no registro · atendimento não apurado" : "materiais com aceite positivo",
    urgent: snapshot.lines.filter(line => line.urgent === true).length,
    seal: satisfying ? { title: "Família ciente", actor: satisfying.actor_name, at: formatBrazilDate(satisfying.created_at), how: scienceLabels[satisfying.mode] ?? satisfying.mode, tone: "good", confirmed: true }
      : { title: source.historical ? "Ciência não comprovada" : "Ciência pendente", actor: source.historical ? "Origem histórica" : "Sem ato que satisfaça a regra familiar", at: "", how: "Ausência de ciência não é recusa.", tone: "warn", confirmed: false },
  };
  const layout = await ApprovedPdfLayout.create(header, emission.onText);
  const identity = { verificationCode: emission.verificationCode, requestedAt: emission.requestedAt };
  layout.pdf.catalog.set(PDFName.of("HCAIssuance"), PDFHexString.fromText(JSON.stringify(identity)));
  layout.pdf.setCreationDate(new Date(emission.requestedAt));
  layout.pdf.setModificationDate(new Date(emission.requestedAt));
  layout.firstHeader();
  const actorDetail = originalAuthorDetail(snapshot);
  layout.fields([
    { label: "Paciente", value: patient, key: "identity/patient" },
    { label: "Registrado por", value: issuer, detail: actorDetail, detailKey: "identity/issuerRole", key: "identity/issuer" },
    { label: "Data da solicitação", value: formatBrazilDate(operationalAt), key: "identity/recordedAt" },
  ]);
  appendDocumentOriginContext(layout, snapshot);
  appendDocumentRelated(layout, snapshot, lifecycle, origin);
  layout.milestones([
    { label: "Emissão", symbol: "document", detail: formatBrazilDate(operationalAt), done: operationalAt !== null, tone: "blue" },
    { label: "Ciência familiar", symbol: "people", detail: satisfying ? formatBrazilDate(satisfying.created_at) : source.historical ? "Não comprovada na origem" : "Não registrada", done: Boolean(satisfying), current: !familyAware && !cancelled, tone: satisfying ? "good" : "warn" },
    { label: "Atendimento", symbol: "box", detail: attended === null ? "Não apurado" : attended + " de " + snapshot.lines.length + " materiais", done: complete, current: familyAware && !complete && !cancelled, tone: complete ? "good" : "warn" },
    { label: cancelled ? "Cancelamento" : archived ? "Arquivamento" : "Conclusão", symbol: cancelled ? "cross" : "check", detail: cancelled ? "Não presume atendimento" : complete ? formatBrazilDate(snapshot.sciencePolicy?.completed_at ?? null) : "Em acompanhamento", done: complete || archived || cancelled, tone: cancelled ? "bad" : complete || archived ? "good" : undefined },
  ]);
  layout.heading("Relação de materiais", "Estoque observado na solicitação. Não representa quantidade pedida nem saldo atual.");
  const grouped = new Map<string, { line: Record<string, unknown>; index: number }[]>();
  snapshot.lines.forEach((line, index) => { const key = String(line.category_snapshot ?? ""); const category = Object.hasOwn(CATEGORY_LABELS, key) ? CATEGORY_LABELS[key as keyof typeof CATEGORY_LABELS] : key || "Materiais sem categoria preservada"; const group = grouped.get(category) ?? []; group.push({ line, index }); grouped.set(category, group); });
  const rows = [...grouped.entries()].flatMap(([category, lines]) => lines.map(({ line, index }) => {
    const key = "material/" + index;
    const stock = typeof line.current_stock === "number" || typeof line.current_stock === "string" ? line.current_stock : null;
    const stockKind = line.stock_observation as StockObservation;
    const state = snapshot.fulfillmentLines?.find(entry => entry.id === line.id);
    const timeSource = ["client_draft", "server_submission", "legacy_unknown"].includes(String(line.stock_observation_time_source)) ? line.stock_observation_time_source as StockObservationTimeSource : "legacy_unknown";
    const presentation = readPresentationConversions(line.presentation_conversions).map(presentationCaption);
    const cells: DocumentCell[] = [
      { text: String(index + 1).padStart(2, "0") },
      { text: nameOf(line) + (presentation.length ? "\n" + presentation.join("\n") : ""), badge: line.urgent ? "URGENTE" : undefined, key: key + "/name", strong: true },
      { text: String(line.unit_snapshot ?? "Unidade não preservada"), key: key + "/unit" },
      { text: formatStockObservation(stock, stockKind, typeof line.unit_snapshot === "string" ? line.unit_snapshot : undefined) + "\n" + formatStockObservationTime(typeof line.stock_observation_at === "string" ? line.stock_observation_at : null, timeSource), key: key + "/stock" },
      { text: source.historical ? "Atendimento não apurado na origem histórica" : state ? state.attended ? "Aceite positivo registrado" : "Sem aceite positivo" : "Situação não preservada", key: key + "/fulfillment", tone: state?.attended ? "good" : undefined },
    ];
    return { cells, category, urgent: line.urgent === true };
  }));
  layout.table([{ label: "Nº", fraction: 0.045 }, { label: "Material / apresentação", fraction: 0.355 }, { label: "Unidade", fraction: 0.12 }, { label: "Estoque informado", fraction: 0.25 }, { label: "Atendimento", fraction: 0.23 }], rows);
  layout.paragraph("Atendimento indica algum aceite positivo na entrega vinculada; não comprova satisfação integral da necessidade. A requisição não define quantidade solicitada.", "materials/scope", { size: 9 });
  appendOriginalObservations(layout, snapshot);
  if (awareness.length || source.historical) {
    layout.heading("Ciência familiar preservada");
    if (awareness.length) layout.table([{ label: "Responsável", fraction: 0.34 }, { label: "Tipo e meio", fraction: 0.34 }, { label: "Momento", fraction: 0.32 }], awareness.map((event, index) => ({ cells: [{ text: event.actor_name, key: "science/" + index + "/actor" }, { text: scienceLabels[event.mode] ?? event.mode, key: "science/" + index + "/mode" }, { text: formatBrazilDate(event.created_at), key: "science/" + index + "/at" }] })));
    else layout.paragraph("Registro histórico: a ciência original não está comprovada. A importação não comprova a data da emissão original nem sua ciência.", "science/historical");
  }
  appendDocumentCancellation(layout, lifecycle, "Cancelamento da requisição");
  await appendVerificationAndPrivacy(layout, emission, "Esta requisição", issuer, operationalAt, verificationUrl, formattedCode);
  layout.finish();
  return { bytes: Buffer.from(await layout.pdf.save({ useObjectStreams: false })), identity };
}
