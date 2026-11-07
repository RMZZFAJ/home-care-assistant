import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { getTestEnvironment, sql } from "../../scripts/test-environment.mjs";
import { fixtures } from "./v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";

test("public runtime marker exposes no identity or authority and retains closed private registry grants", async () => {
  const env = getTestEnvironment();
  const anonymous = createClient(env.url, env.anonKey, {
    auth: { persistSession: false },
  });
  const { data, error } = await anonymous.rpc("client_schema_contract");
  assert.ifError(error);
  assert.deepEqual(data, { protocol: 1, schema: 1 });
  const authenticated = createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  assert.ifError(
    (
      await authenticated.auth.signInWithPassword({
        email: fixtures.family.email,
        password: fixturePassword,
      })
    ).error,
  );
  const result = await authenticated.rpc("client_schema_contract");
  assert.ifError(result.error);
  assert.deepEqual(result.data, data);
  assert.equal(
    sql(
      "select not prosecdef and provolatile='s' and proconfig=array['search_path=\"\"'] from pg_proc where oid='public.client_schema_contract()'::regprocedure;",
    ),
    "t",
  );
  assert.equal(
    sql(
      "select not has_function_privilege('service_role','public.client_schema_contract()','execute');",
    ),
    "t",
  );
  assert.equal(
    sql(
      "select not has_table_privilege('anon','private.pdf_issuances','select') and not has_table_privilege('authenticated','private.pdf_issuances','select');",
    ),
    "t",
  );
});
