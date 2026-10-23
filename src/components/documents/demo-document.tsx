import { demoDocuments } from "@/lib/demo-documents";
export function DemoDocument({ id }: { id: string }) {
  const doc = demoDocuments[id];
  if (!doc) return null;
  return <main className="mx-auto max-w-3xl space-y-5 p-5"><p className="ui-notice">Exemplo fictício · Nenhum dado real · Sem valor operacional</p><h1 className="text-2xl font-bold">{doc.code} · Demonstração Home Care Assistant</h1><p>Modelo público usado para revisar a apresentação de documentos e templates. Este identificador pertence a uma lista fixa de demonstração e não consulta pacientes reais.</p><ul className="space-y-2">{doc.lines.map(line => <li key={String(line.id)} className="ui-card">{String(line.name_snapshot)} · {String(line.unit_snapshot)}</li>)}</ul><a className="ui-button ui-button-primary" href={"/api/demonstracao/" + id + "/pdf"}>Consultar PDF fictício</a><a className="ui-button ui-button-secondary" href="/login">Acessar o sistema</a></main>;
}
