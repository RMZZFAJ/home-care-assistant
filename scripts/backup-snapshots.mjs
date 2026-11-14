/** Only replay-safe cursors and clock/counter fields are projected out.
 * Policy fingerprints, versions, authority, failure cause and business rows
 * remain exact. v1 archives keep their original two documented qualifications.
 */
const clocks = new Map([
  ["private.bal_scheduler_progress", ["last_patient", "updated_at"]],
  [
    "private.scheduler_health",
    ["last_run", "processed", "failed_candidates", "unresolved_candidates"],
  ],
  [
    "private.legacy_reminder_progress",
    ["last_patient", "last_run", "processed", "created", "failed"],
  ],
  ["private.legacy_reminder_checkpoints", ["closed_through", "checked_at"]],
  ["private.legacy_reminder_failures", ["attempts", "last_failure_at"]],
  ["private.operations_components", ["observed_at", "success_at"]],
  ["private.operations_incidents", ["last_observed_at"]],
]);
const literal = (value) => "'" + value.replaceAll("'", "''") + "'";
const identifier = (value) => '"' + value.replaceAll('"', '""') + '"';
export function backupStateQuery(tables) {
  const hash = (expression) =>
    `encode(extensions.digest(coalesce(string_agg((${expression})::text,E'\\n' order by (${expression})::text),''),'sha256'),'hex')`;
  const parts = tables.map(({ schema, name }) => {
    const table = schema + "." + name,
      omitted = clocks.get(table);
    const stable =
      "to_jsonb(t)" +
      (omitted
        ? " - array[" + omitted.map(literal).join(",") + "]::text[]"
        : "");
    return `select ${literal(table)} name,count(*) rows,${hash("to_jsonb(t)")} sha256,${hash(stable)} stable_sha256 from ${identifier(schema)}.${identifier(name)} t`;
  });
  if (!parts.length)
    throw new Error("Backup requires an explicit table inventory.");
  return (
    "select jsonb_object_agg(name,jsonb_build_object('rows',rows,'sha256',sha256,'stableSha256',stable_sha256)) snapshot from (" +
    parts.join(" union all ") +
    ") s;"
  );
}
export function compareBackupSnapshots(expected, actual, version = 1) {
  const differences = [],
    unexpected = [];
  if (![1, 2].includes(version))
    throw new Error("Unsupported snapshot contract.");
  for (const name of new Set([
    ...Object.keys(expected),
    ...Object.keys(actual),
  ])) {
    const a = expected[name],
      b = actual[name];
    if (!a || !b || a.rows !== b.rows || a.sha256 !== b.sha256)
      differences.push(name);
    if (!a || !b || a.rows !== b.rows) {
      unexpected.push(name);
      continue;
    }
    if (version === 2) {
      if (
        !/^[a-f0-9]{64}$/.test(a.stableSha256 ?? "") ||
        !/^[a-f0-9]{64}$/.test(b.stableSha256 ?? "") ||
        a.stableSha256 !== b.stableSha256 ||
        (!clocks.has(name) && a.sha256 !== b.sha256)
      )
        unexpected.push(name);
    } else if (
      a.sha256 !== b.sha256 &&
      !["private.bal_scheduler_progress", "private.scheduler_health"].includes(
        name,
      )
    )
      unexpected.push(name);
  }
  return { differences, unexpected };
}
