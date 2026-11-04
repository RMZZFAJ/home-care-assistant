import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { getTestEnvironment, sql } from "../../../../scripts/test-environment.mjs";

const environment = getTestEnvironment();
assert.equal(environment.url, "http://127.0.0.1:54321");
const result = JSON.parse(sql(`
  begin transaction read only;
  select json_build_object(
    'entProbePatients', (select count(*) from public.care_recipients
      where id='db000000-0000-4000-8000-000000000001'),
    'lifecycleProbePatients', (select count(*) from public.care_recipients
      where display_name like 'Auditoria ciclo %')
  );
  rollback;
`));
assert.equal(result.entProbePatients, 0);
assert.equal(result.lifecycleProbePatients, 0);
const record = { checkedAt: new Date().toISOString(), localApi: environment.url,
  method: "Guarded read-only SQL; no new Auth sessions or fixtures.", ...result,
  conclusion: "Probe patients did not persist; separate E2E/UI fixtures intentionally remain." };
writeFileSync(new URL("local-final-state.json", import.meta.url), JSON.stringify(record, null, 2) + "\n");
console.log(JSON.stringify(record));
