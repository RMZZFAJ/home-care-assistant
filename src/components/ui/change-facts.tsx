import { Icon } from "./icon";

export function ChangeFacts({ changes, proposal = false }: {
  changes: ReadonlyArray<{ id: string; label: string; before?: string; after: string }>;
  proposal?: boolean;
}) {
  return <dl className="hca-document-change-list">
    {changes.map(change => <div key={change.id}>
      <dt>{change.label}</dt>
      <dd>{change.before !== undefined ? <>
        <del><span className="sr-only">{proposal ? "Vigente agora: " : "Antes: "}</span>{change.before}</del>
        <Icon name={proposal ? "chevron" : "arrow"} width={15} height={15} />
      </> : null}
        <strong>{change.before !== undefined ? <span className="sr-only">{proposal ? "Proposta registrada: " : "Agora: "}</span> : null}{change.after}</strong></dd>
    </div>)}
  </dl>;
}
