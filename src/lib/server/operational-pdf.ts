import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb, degrees, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import QRCode from "qrcode";
import { documentStatuses, type DocumentType } from "@/types/documents";
import { documentEventLabel } from "@/lib/notifications/event-labels";
import { formatBrazilDate } from "@/lib/receipt";
import { formatQuantity, quantity } from "@/lib/quantity";

type Person = { id?: string; name: string; registration?: string; state?: string; category?: string };
export type DocumentSnapshot = {
  id: string; type: DocumentType; code: string; protocol: string; version: number; status: string; createdAt?: string;
  actors?: { issuer?: Person; recipient?: Person; patient?: Person };
  lines: Record<string, unknown>[]; payload: Record<string, unknown>; workflow?: Record<string, unknown>;
  attachments?: { filename: string; sha256: string }[];
  sciencePolicy?: { science_satisfied_at?: string; policy?: Record<string, unknown>; manual_archive_required?: boolean; completed_at?: string; archived_at?: string };
  scienceEvents?: { actor_name: string; mode: string; created_at: string }[];
  history?: { action: string; actorName: string; createdAt: string; version: number }[];
  fulfillmentLines?: { id: string; attended: boolean }[];
  demo?: boolean;
};
const navy = rgb(0.073, 0.18, 0.235), teal = rgb(0.07, 0.49, 0.52), muted = rgb(0.39, 0.47, 0.53);
const lineColor = rgb(0.83, 0.88, 0.90), pale = rgb(0.96, 0.975, 0.98), mint = rgb(0.90, 0.96, 0.95);
const white = rgb(1, 1, 1), pageWidth = 595.28, pageHeight = 841.89, margin = 44, width = pageWidth - margin * 2;
function wrap(value: unknown, font: PDFFont, size: number, maxWidth: number) {
  const result: string[] = [];
  const clean = Array.from(String(value ?? "Não informado"), character => character !== "\n" && (character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127) ? " " : character).join("");
  for (const paragraph of clean.split("\n")) {
    let row = "";
    for (const word of paragraph.split(/\s+/)) {
      let remaining = word;
      while (remaining && font.widthOfTextAtSize(remaining, size) > maxWidth) {
        if (row) { result.push(row); row = ""; }
        let cut = 1;
        while (cut < remaining.length && font.widthOfTextAtSize(remaining.slice(0, cut + 1), size) <= maxWidth) cut++;
        result.push(remaining.slice(0, cut)); remaining = remaining.slice(cut);
      }
      if (row && font.widthOfTextAtSize(row + " " + remaining, size) > maxWidth) { result.push(row); row = remaining; }
      else row = row ? row + " " + remaining : remaining;
    }
    result.push(row);
  }
  return result;
}
export async function renderDocumentPdf(snapshot: DocumentSnapshot, hash: string) {
  const pdf = await PDFDocument.create(); pdf.registerFontkit(fontkit);
  const [regularBytes, boldBytes] = await Promise.all([readFile(path.join(process.cwd(), "public/fonts/NotoSans-Regular.ttf")), readFile(path.join(process.cwd(), "public/fonts/NotoSans-Bold.ttf"))]);
  const [font, bold] = await Promise.all([pdf.embedFont(regularBytes, { subset: true }), pdf.embedFont(boldBytes, { subset: true })]);
  const date = new Date(snapshot.createdAt ?? "2000-01-01T00:00:00Z");
  pdf.setTitle(`${snapshot.code} - Home Care Assistant`); pdf.setAuthor("Home Care Assistant"); pdf.setCreationDate(date); pdf.setModificationDate(date);
  pdf.setSubject(`Comprovante operacional · conteúdo v${snapshot.version} · renderizador V4`);
  let page = pdf.addPage([pageWidth, pageHeight]), y = 736;
  const draw = (text: string, x: number, top: number, size = 9, strong = false, color = navy) => page.drawText(text, { x, y: top - size, size, font: strong ? bold : font, color });
  function header() {
    page.drawRectangle({ x: 0, y: pageHeight - 82, width: pageWidth, height: 82, color: navy });
    page.drawRectangle({ x: 0, y: pageHeight - 86, width: pageWidth, height: 4, color: teal });
    page.drawCircle({ x: 58, y: pageHeight - 44, size: 19, color: teal });
    draw("HCA", 46, pageHeight - 35, 10, true, white);
    draw("HOME CARE ASSISTANT", 87, pageHeight - 26, 16, true, white);
    draw("GESTÃO DE INSUMOS / COMPROVANTE OPERACIONAL", 87, pageHeight - 49, 7.5, false, rgb(0.74, 0.83, 0.86));
    if (snapshot.demo) page.drawText("EXEMPLO FICTÍCIO", { x: 90, y: 290, font: bold, size: 43, color: lineColor, opacity: 0.34, rotate: degrees(31) });
  }
  header();
  function nextPage() { page = pdf.addPage([pageWidth, pageHeight]); y = 736; header(); }
  function ensure(height: number) { if (y - height < 70) nextPage(); }
  function text(value: unknown, size = 9, strong = false, color = navy) {
    for (const row of wrap(value, strong ? bold : font, size, width)) { ensure(size * 1.6); draw(row, margin, y, size, strong, color); y -= size * 1.6; }
  }
  function section(title: string) { ensure(55); y -= 17; text(title.toLocaleUpperCase("pt-BR"), 10, true); y -= 6; }
  function fields(entries: [string, unknown][]) {
    for (let i = 0; i < entries.length; i += 2) {
      const cells = entries.slice(i, i + 2);
      const rows = cells.map(([, value]) => wrap(value, font, 9, width / 2 - 24));
      const height = Math.max(42, ...rows.map(row => 27 + row.length * 12)); ensure(height);
      cells.forEach(([label], index) => {
        const x = margin + index * width / 2;
        page.drawRectangle({ x, y: y - height, width: width / 2, height, color: pale, borderColor: lineColor, borderWidth: 0.5 });
        draw(label.toLocaleUpperCase("pt-BR"), x + 12, y - 8, 7, true, muted);
        rows[index].forEach((row, n) => draw(row, x + 12, y - 21 - n * 12, 9));
      }); y -= height;
    }
  }
  function table(headers: string[], fractions: number[], rows: string[][]) {
    const widths = fractions.map(fraction => width * fraction);
    const heading = () => { ensure(45); page.drawRectangle({ x: margin, y: y - 24, width, height: 24, color: navy }); let x = margin; headers.forEach((title, i) => { draw(title, x + 8, y - 7, 7, true, white); x += widths[i]; }); y -= 24; };
    heading();
    rows.forEach((cells, index) => {
      const lines = cells.map((cell, i) => wrap(cell, font, 8, widths[i] - 16));
      const height = Math.max(22, ...lines.map(row => row.length * 11 + 12));
      if (y - height < 70) { nextPage(); heading(); }
      if (index % 2 === 0) page.drawRectangle({ x: margin, y: y - height, width, height, color: pale });
      let x = margin; lines.forEach((cell, i) => { cell.forEach((row, n) => draw(row, x + 8, y - 6 - n * 11, 8)); x += widths[i]; }); y -= height;
    });
  }
  const title = { REQ: "REQUISIÇÃO DE MATERIAIS", COM: "COMPRA DE INSUMOS DA FAMÍLIA", ENT: "COMPROVANTE DE ENTREGA DE MATERIAIS", BAL: "BALANÇO DO ESTOQUE DA EQUIPE" }[snapshot.type];
  text(title, snapshot.type === "ENT" ? 17 : 19, true); y -= 6;
  const statusText = snapshot.type === "REQ" && snapshot.status !== "cancelled" ? snapshot.sciencePolicy?.archived_at ? "Arquivada" : snapshot.sciencePolicy?.completed_at ? "Atendimento concluído" : snapshot.sciencePolicy?.science_satisfied_at ? "Aguardando atendimento" : "Ciência e atendimento pendentes" : documentStatuses[snapshot.status] ?? snapshot.status;
  text(`${snapshot.code} · ${formatBrazilDate(snapshot.createdAt ?? null)} · ${statusText}`, 9); y -= 12;
  const total = snapshot.lines.length, checked = snapshot.lines.filter(item => item.fully_checked === true).length;
  const attended = snapshot.fulfillmentLines?.filter(item => item.attended).length ?? 0;
  const issues = snapshot.lines.filter(item => (item.metadata as Record<string, unknown> | undefined)?.issueOpen === true).length;
  const metrics = snapshot.type === "REQ" ? [[String(total), "ITENS SOLICITADOS"], [String(snapshot.lines.filter(item => item.urgent).length), "URGENTES"], [String(attended), "ITENS ATENDIDOS"], [snapshot.sciencePolicy?.science_satisfied_at ? "REGISTRADA" : "PENDENTE", "CIÊNCIA FAMILIAR"]]
    : snapshot.type === "ENT" ? [[String(total), "ITENS DECLARADOS"], [String(checked), "CONFERIDOS INTEGRALMENTE"], [String(issues), "DIVERGÊNCIAS"], [snapshot.status === "confirmed" ? "CONCLUÍDO" : "PENDENTE", "RECEBIMENTO"]]
      : [[String(total), "ITENS REGISTRADOS"], [String(snapshot.version), "VERSÃO"], [snapshot.type, "OPERAÇÃO"], [snapshot.type === "BAL" && snapshot.status === "approved" || snapshot.type === "COM" && snapshot.status === "received" ? "CONCLUÍDO" : "EM ANDAMENTO", "SITUAÇÃO"]];
  ensure(43); metrics.forEach(([value, label], i) => { const x = margin + i * width / 4; page.drawRectangle({ x, y: y - 42, width: width / 4, height: 42, color: mint, borderColor: rgb(0.65, 0.83, 0.82), borderWidth: 0.5 }); draw(value, x + 10, y - 8, 9, true); draw(label, x + 10, y - 24, 6.2, true, muted); }); y -= 42;
  section(snapshot.type === "ENT" ? "Identificação da entrega" : "Identificação e responsáveis");
  const who = snapshot.actors?.issuer, patient = snapshot.actors?.patient?.name ?? snapshot.payload.patientName ?? "Registrado no documento";
  fields([["Paciente", patient], [snapshot.type === "REQ" ? "Solicitado por" : "Responsável", who?.name ?? snapshot.payload.requesterName ?? "Registrado no documento"],
    ["Número do documento", snapshot.code], ["Protocolo", snapshot.protocol],
    ...(snapshot.type === "ENT" ? [["Origem", snapshot.payload.source === "FAMILY" ? "Estoque da família" : "Estoque da equipe"], ["Destino", snapshot.payload.destination === "FAMILY" ? "Estoque da família" : "Estoque da equipe"], ["Recebedor designado", snapshot.actors?.recipient?.name ?? "Registrado no documento"], ["Emissão", formatBrazilDate(snapshot.createdAt ?? null)]] as [string, unknown][] : [["Registro profissional", who?.registration ? `${who.registration}/${who.state ?? ""}` : "Não informado"], ["Situação", statusText]] as [string, unknown][])]);
  section(snapshot.type === "REQ" ? "Materiais solicitados" : "Relação dos materiais declarados");
  const name = (item: Record<string, unknown>) => String(item.name_snapshot ?? item.product_name_snapshot ?? item.custom_name ?? item.product_id ?? "Material");
  if (snapshot.type === "REQ") table(["Nº","MATERIAL","APRESENTAÇÃO","PRIORIDADE"], [.06,.47,.24,.23], snapshot.lines.map((item,i) => [String(i + 1).padStart(2,"0"),name(item),String(item.unit_snapshot ?? "Não informada"),item.urgent ? "URGENTE" : "Rotina"]));
  else table(["Nº","MATERIAL",snapshot.type === "ENT" ? "EXPEDIDO" : snapshot.type === "BAL" ? "CONTADO" : "PROPOSTO","UNIDADE"], [.06,.51,.16,.27], snapshot.lines.map((item,i) => [String(i+1).padStart(2,"0"),name(item),formatQuantity(String(item.quantity ?? 0)),String(item.unit_snapshot ?? "")]));
  y -= 10;
  const intent = snapshot.payload.intent as { observations?: string[] } | undefined;
  const notes = snapshot.payload.notes ?? intent?.observations?.join("\n");
  if (notes) text("Observação: " + String(notes), 8);
  text(snapshot.type === "REQ" ? "Esta requisição não informa quantidades solicitadas. O atendimento é acompanhado por item após aceite positivo em ENT explicitamente vinculada. A ciência familiar possui registro independente."
    : snapshot.type === "ENT" ? "A expedição não comprova recebimento. Apenas quantidades efetivamente aceitas entram no saldo confirmado do destino; diferenças permanecem registradas até resolução formal."
      : snapshot.type === "COM" ? "Aquisição e recebimento abastecem o estoque familiar após validação. Doações não exigem comprovante de pagamento. Somente ENT recebida pode atender a equipe."
        : "Contagem física exclusiva da equipe. Ajustes aplicados ao ledger dependem da política e das aprovações registradas.", 8);
  if (snapshot.type === "REQ") { section("Situação do atendimento"); fields([["Linhas atendidas",`${attended} de ${total}`],["Linhas pendentes",String(total-attended)],["Ciência familiar",snapshot.sciencePolicy?.science_satisfied_at ? formatBrazilDate(snapshot.sciencePolicy.science_satisfied_at) : "Pendente nesta versão"],["Próximo passo",snapshot.sciencePolicy?.archived_at ? "Documento arquivado" : "Providenciar ENT e conferir recebimento"]]); }
  nextPage(); text(snapshot.type === "REQ" ? "RASTREABILIDADE DA REQUISIÇÃO" : "CONFERÊNCIA E AUDITORIA", 19, true); y -= 7; text(`${snapshot.code} · Versão documental ${snapshot.version}`, 9);
  if (snapshot.type === "REQ") {
    section("Ciência familiar");
    if (snapshot.scienceEvents?.length) table(["RESPONSÁVEL","ORIGEM","DATA"],[.33,.37,.30],snapshot.scienceEvents.map(event => [event.actor_name,{ express:"Expressa no aplicativo",app_visible:"Automática: conteúdo exibido",whatsapp_read:"Automática: leitura WhatsApp",whatsapp_confirm:"WhatsApp: confirmação verificada",dispatch:"Expedição autorizada" }[event.mode] ?? event.mode,formatBrazilDate(event.created_at)]));
    else text("Nenhuma ciência foi registrada até esta versão. Emissão, envio ou disponibilização do PDF não comprovam ciência.");
  } else if (snapshot.type === "ENT") {
    section("Declaração do recebimento"); text(snapshot.workflow?.acceptedAt ? `Conferência registrada em ${formatBrazilDate(String(snapshot.workflow.acceptedAt))}. Os aceites positivos são preservados independentemente das divergências.` : "Este comprovante foi emitido antes do aceite. A pessoa designada deve conferir os itens e informar quantidades efetivamente recebidas. Nenhum aceite é presumido.");
    y -= 8; table(["MATERIAL","ACEITO","CONCILIADO","SITUAÇÃO"],[.43,.15,.16,.26],snapshot.lines.map(item => [name(item),formatQuantity(String(item.accepted_quantity ?? 0)),formatQuantity(String(item.reconciled_quantity ?? 0)),item.fully_checked ? "Integralmente conferido" : (item.metadata as Record<string,unknown> | undefined)?.issueOpen ? "Divergência aberta" : quantity(String(item.reconciled_quantity ?? 0)).gt(0) ? "Diferença conciliada" : "Aguardando conferência"]));
  } else if (snapshot.type === "COM") { section("Aquisição e validação"); table(["MATERIAL","APROVADO","ADQUIRIDO","VALIDADO"],[.46,.18,.18,.18],snapshot.lines.map(item => [name(item),formatQuantity(String(item.approved_quantity ?? 0)),formatQuantity(String(item.purchased_quantity ?? 0)),formatQuantity(String(item.accepted_quantity ?? 0))])); }
  else { section("Referência e reconciliação"); table(["MATERIAL","REFERÊNCIA","CONTADO"],[.50,.25,.25],snapshot.lines.map(item => [name(item),formatQuantity(String((item.metadata as Record<string,unknown> | undefined)?.expectedQuantity ?? 0)),formatQuantity(String(item.quantity ?? 0))])); }
  section("Linha do tempo operacional");
  table(["DATA/HORA","RESPONSÁVEL","EVENTO"],[.28,.25,.47], (snapshot.history ?? []).map(event => [formatBrazilDate(event.createdAt),event.actorName || "Sistema",`${documentEventLabel(event.action)} · v${event.version}`]));
  section("Identificação e integridade"); fields([["Documento",snapshot.code],["Versão",String(snapshot.version)],["ID técnico",snapshot.id],["Hash do conteúdo canônico",hash]]);
  y -= 11; text("O SHA-256 permite comparar o conteúdo canônico registrado. Não é assinatura digital nem garantia absoluta contra alteração por administradores do banco. Versões e eventos confirmados preservam o histórico operacional. O hash do arquivo PDF é registrado separadamente.", 7.5, false, muted);
  if (!snapshot.demo) {
    ensure(86);
    const verifyUrl = `https://home-care-assistant.vercel.app/verificar/${snapshot.id}?version=${snapshot.version}&hash=${hash}`;
    const qr = await pdf.embedPng(await QRCode.toBuffer(verifyUrl, { errorCorrectionLevel: "M", margin: 1, width: 180 }));
    page.drawImage(qr, { x: margin, y: y - 76, width: 76, height: 76 });
    draw("Verificação de integridade", margin + 88, y - 8, 9, true);
    for (const [index, row] of wrap("O QR exibe somente correspondência do hash e versão. O documento completo continua exigindo acesso autorizado.", font, 8, width - 100).entries()) draw(row, margin + 88, y - 25 - index * 12, 8);
    y -= 86;
  }
  if (snapshot.attachments?.length) { section("Anexos vinculados"); table(["ARQUIVO","SHA-256"],[.40,.60],snapshot.attachments.map(item => [item.filename,item.sha256])); }
  pdf.getPages().forEach((item,index) => {
    item.drawLine({ start: {x:margin,y:52}, end:{x:pageWidth-margin,y:52}, color:lineColor, thickness:.5 });
    item.drawText(snapshot.demo ? "Documento demonstrativo · Nenhum dado real · Sem valor operacional" : `${snapshot.code} · v${snapshot.version} · Conteúdo autorizado`, {x:margin,y:38,font,size:7,color:muted});
    item.drawText(`Página ${index+1} de ${pdf.getPageCount()}`, {x:pageWidth-margin-58,y:38,font,size:7,color:muted});
  });
  return Buffer.from(await pdf.save({ useObjectStreams:true }));
}
