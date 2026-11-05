import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { sql, getTestEnvironment, fixtureFile } from '../../../../scripts/test-environment.mjs';
import { fixturePassword } from '../../../../scripts/test-constants.mjs';
const environment = getTestEnvironment(); // exact local container and loopback ports
const fixtures = JSON.parse(readFileSync(fixtureFile, 'utf8'));
// The E2E logout removes sessions. Issue fresh synthetic sessions through Auth,
// exactly as the repository SQL runner does; never forge auth.sessions rows.
for (const actor of ['adminA', 'professional']) {
  const client = createClient(environment.url, environment.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.signInWithPassword({ email: fixtures[actor].email, password: fixturePassword });
  if (error) throw new Error('Local synthetic Auth login failed');
}
console.log(sql(readFileSync(process.argv[2], 'utf8').replace('-- INCLUDE_AUTH_HELPER', () => readFileSync('tests/database/assume-context.sql', 'utf8'))));
