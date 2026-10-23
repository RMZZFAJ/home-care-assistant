import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
const graph = "https://graph.facebook.com/v25.0";
const names = JSON.parse(readFileSync("docs/meta/templates-v4-submission.json", "utf8"));
const token = process.env.META_WHATSAPP_ACCESS_TOKEN;
const account = process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID ?? "1681890620206653";
const app = process.env.META_APP_ID ?? "1588654625805793";
const destination = process.argv[2] ?? ".private/v4/meta-submission-results.json";
if (!destination.startsWith(".private/")) throw new Error("Provider diagnostics must remain private");
const results = names.requests.map(request => ({ name: request.name, language: request.language, status: "prepared", checkedAt: new Date().toISOString() }));
function save() { writeFileSync(destination, JSON.stringify(results, null, 2) + "\n", { mode: 0o600 }); }
async function call(url, init = {}) {
  const response = await fetch(url, { ...init, headers: { authorization: "Bearer " + token, ...init.headers }, redirect: "error", signal: AbortSignal.timeout(20000) });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error("META_REQUEST_REJECTED"), { safe: { httpStatus: response.status, code: data.error?.code, subcode: data.error?.error_subcode } });
  return data;
}
if (!token) {
  results.forEach(row => Object.assign(row, { status: "blocked", dependency: "META_WHATSAPP_ACCESS_TOKEN" })); save();
} else {
  let available;
  try { available = await call(`${graph}/${account}/message_templates?fields=id,name,status,language&limit=100`); }
  catch (error) { results.forEach(row => Object.assign(row, { status: "blocked", dependency: "Meta management authorization", ...error.safe })); save(); }
  if (available) for (const [index, input] of names.requests.entries()) {
    const row = results[index];
    const existing = available.data?.find(item => item.name === input.name && item.language === input.language);
    if (existing) { Object.assign(row, { status: existing.status === "APPROVED" ? "approved" : existing.status === "REJECTED" ? "rejected" : "pending_review", providerStatus: existing.status, providerId: existing.id }); save(); continue; }
    try {
      const request = globalThis.structuredClone(input);
      const header = request.components.find(component => component.type === "HEADER" && component.format === "DOCUMENT");
      if (header) {
        const filename = input.name.includes("ciencia_registrada") ? "req-science.pdf" : input.name.includes("_req_") ? "req-issued.pdf" : input.name.includes("concluida") ? "ent-confirmed.pdf" : "ent-pending.pdf";
        const path = ".private/v4/pdf/" + filename;
        if (!existsSync(path)) throw Object.assign(new Error("SAMPLE_PDF_REQUIRED"), { safe: { dependency: path } });
        const bytes = readFileSync(path);
        const session = await call(`${graph}/${app}/uploads?file_name=${encodeURIComponent(filename)}&file_length=${bytes.length}&file_type=application%2Fpdf`, { method: "POST" });
        if (!session.id || !/^upload:/.test(session.id)) throw new Error("INVALID_UPLOAD_SESSION");
        const uploaded = await call(`${graph}/${session.id}`, { method: "POST", headers: { file_offset: "0", "content-type": "application/pdf" }, body: bytes });
        if (!uploaded.h) throw new Error("UPLOAD_HANDLE_MISSING");
        header.example.header_handle = [uploaded.h];
        Object.assign(row, { sampleSha256: createHash("sha256").update(bytes).digest("hex") });
      }
      const created = await call(`${graph}/${account}/message_templates`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request) });
      Object.assign(row, { status: created.status === "APPROVED" ? "approved" : created.status === "REJECTED" ? "rejected" : "pending_review", submitted: true, providerStatus: created.status, providerId: created.id });
    } catch (error) { Object.assign(row, { status: "blocked", dependency: error.message, ...error.safe }); }
    save();
  }
}
console.log(JSON.stringify(results.map(({ name, status, httpStatus, code, subcode }) => ({ name, status, httpStatus, code, subcode }))));
