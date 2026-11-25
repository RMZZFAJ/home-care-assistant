import { Icon } from "./icon";

export function ChangeFacts({ changes }: {
  changes: ReadonlyArray<{ id: string; label: string; before?: string; after: string }>;
}) {
  return <dl className="hca-document-change-list">
    {changes.map(change => <div key={change.id}>
      <dt>{change.label}</dt>
      <dd>{change.before !== undefined ? <>
        <del><span className="sr-only">Antes: </span>{change.before}</del>
        <Icon name="arrow" width={15} height={15} />
      </> : null}
        <strong>{change.before !== undefined ? <span className="sr-only">Agora: </span> : null}{change.after}</strong></dd>
    </div>)}
  </dl>;
}
