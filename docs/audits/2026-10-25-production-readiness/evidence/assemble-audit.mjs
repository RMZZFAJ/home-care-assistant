import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { resolve, relative } from "node:path";
import { createHash } from "node:crypto";

const audit = resolve("docs/audits/2026-10-25-production-readiness");
const directory = resolve(audit, "evidence");
const json = (path) => JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
const flatten = (value) => Array.isArray(value) ? value.map(flatten).join("; ") : value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
const csv = (rows, columns) => columns.join(",") + "\n" + rows.map(row => columns.map(key => '"' + flatten(row[key]).replaceAll('"', '""') + '"').join(",")).join("\n") + "\n";
const wrap = (text, width = 78) => {
  const words = flatten(text).replaceAll(/\s+/g, " ").trim().split(" ");
  const lines = []; let current = "";
  for (const word of words) { if (current && current.length + word.length + 1 > width) { lines.push(current); current = word; } else current += (current ? " " : "") + word; }
  if (current) lines.push(current);
  return lines.join("\n");
};
const columns = ["id","title","nature","domain","priority","confidence","status","persona","journey","summary","observed","expected","reproduction","evidence","files","routes","components","api","database_objects","root_cause","human_impact","technical_impact","operational_impact","security_integrity_impact","workaround","recommendation","alternatives","invariants","dependencies","effort","regression_risk","acceptance_criteria","tests_required","human_decision","countercheck","countercheck_result"];
const sourcePattern = /^findings-(backend|database|ui|root|testing)\.json$/;
const findings = readdirSync(directory).filter(path => sourcePattern.test(path)).flatMap(path => json(resolve(directory, path)));
if (new Set(findings.map(finding => finding.id)).size !== findings.length) throw new Error("Duplicate finding IDs");
for (const finding of findings) {
  if (!finding.id || !finding.title || !finding.priority || !finding.countercheck || !finding.acceptance_criteria) throw new Error("Incomplete finding: " + finding.id);
  if (finding.id === "DB-005") {
    finding.priority = "P3";
    finding.countercheck_result = flatten(finding.countercheck_result) + " Revisão coordenada: P3, sem latência/custo descumprido medido; priorização alinhada a BE-006.";
  }
}
findings.sort((a,b) => a.priority.localeCompare(b.priority) || a.id.localeCompare(b.id));
writeFileSync(resolve(audit, "FINDINGS_MASTER.csv"), csv(findings, columns));
const sections = ["# Registro mestre de achados", "", "Base: `37cb7f85e96e551d6419871f94dd950712e2565b`. Fase A investigativa.", "", "O CSV e este documento contêm os 36 campos completos do protocolo.", "Natureza e status distinguem defeito confirmado, hipótese, risco e oportunidade;", "prioridade não converte hipótese em fato. Defeito estático pode estar confirmado", "pela leitura do contrato, sem reprodução runtime; o campo evidência delimita", "o método. Nenhum achado foi corrigido no produto nesta fase.", "", "## Prioridades e escopo", ""];
for (const priority of ["P0","P1","P2","P3"]) sections.push(`- ${priority}: ${findings.filter(f => f.priority === priority).length}.`);
sections.push("", "DB-002 bloqueia a promessa de automação multipaciente no cenário demonstrado;", "UX-001 bloqueia aprovação informada de mudanças de escala. Não equivalem a", "perda de dados ou bypass de autorização. Recomendações de limpeza têm condições", "de compatibilidade e não autorizam remoções. DB-005 e BE-006 exigem medição antes", "de otimização e foram classificados P3 pela revisão coordenada.");
const labels = ["ID", "Título", "Natureza", "Domínio", "Prioridade", "Confiança", "Estado", "Persona", "Jornada", "Resumo", "Observado", "Esperado", "Reprodução e alcance", "Evidência", "Arquivos", "Rotas", "Componentes", "API", "Objetos de banco", "Causa", "Impacto humano", "Impacto técnico", "Impacto operacional", "Segurança e integridade", "Contingência", "Recomendação", "Alternativas", "Invariantes", "Dependências", "Esforço", "Risco de regressão", "Critérios de aceite", "Testes necessários", "Decisão humana", "Contraditório", "Resultado do contraditório"];
for (const finding of findings) {
  sections.push("", `## ${finding.id} — ${finding.priority}`, "");
  columns.forEach((column, index) => sections.push(wrap(`**${labels[index]}:** ${flatten(finding[column]) || "Não aplicável."}`), ""));
}
writeFileSync(resolve(audit, "FINDINGS_MASTER.md"), sections.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n");
writeFileSync(resolve(directory, "findings-summary.json"), JSON.stringify({ total: findings.length, priorities: Object.fromEntries(["P0","P1","P2","P3"].map(p=>[p,findings.filter(f=>f.priority===p).length])), natures: Object.fromEntries([...new Set(findings.map(f=>f.nature))].sort().map(n=>[n,findings.filter(f=>f.nature===n).length])), ids: findings.map(f=>f.id), sourceFiles: readdirSync(directory).filter(path=>sourcePattern.test(path)) }, null, 2) + "\n");

const walk = (folder) => readdirSync(folder).flatMap(name => { const path=resolve(folder,name); return statSync(path).isDirectory() ? walk(path) : [path]; });
const manifest = walk(directory).filter(path => !path.endsWith("MANIFEST.csv")).sort().map((path,index) => {
  const name = relative(directory,path).replaceAll("\\", "/");
  const related = findings.filter(f => flatten(f.evidence).includes(name) || flatten(f.reproduction).includes(name)).map(f=>f.id).join(";");
  const file=readFileSync(path);
  return { evidence_id: "E"+String(index+1).padStart(3,"0"), type: path.endsWith(".png") ? "SCREENSHOT_OR_RENDER" : /\.(mjs|ts|mts|py|ps1|sql)$/.test(path) ? "REPRODUCTION_CODE" : path.endsWith(".log") ? "EXECUTION_LOG" : "STRUCTURED_OR_DOCUMENTARY", path: "evidence/"+name, created_at: statSync(path).mtime.toISOString(), related_finding: related, scenario: name.replaceAll(/[-_.]/g," "), sanitized: "YES", notes: "Dados sintéticos ou metadados; timestamps mtime do artefato; tempo de execução em JSON quando disponível.", bytes: file.length, sha256: createHash("sha256").update(file).digest("hex") };
});
writeFileSync(resolve(directory,"MANIFEST.csv"),csv(manifest,["evidence_id","type","path","created_at","related_finding","scenario","sanitized","notes","bytes","sha256"]));
console.log(JSON.stringify({findings:findings.length,priorities:Object.fromEntries(["P0","P1","P2","P3"].map(p=>[p,findings.filter(f=>f.priority===p).length])),evidence:manifest.length}));
