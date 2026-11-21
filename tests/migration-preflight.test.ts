import { describe, expect, it } from "vitest";
import { migrationHistoryMatches } from "../scripts/migration-history.mjs";
import { assertProbeDatabase } from "../scripts/restore-backup-probe.mjs";

describe("migration preflight evidence", () => {
  it("ignores statement formatting while retaining quoted values and token boundaries", () => {
    expect(migrationHistoryMatches("-- source\nselect 1;\n\nselect 'a b';", ["select 1", "select 'a b'"])).toBe(true);
    expect(migrationHistoryMatches("select 'a b';", ["select 'ab'"])).toBe(false);
    expect(migrationHistoryMatches("select a b;", ["select ab"])).toBe(false);
    expect(migrationHistoryMatches("select $$begin\n return 'a b';\nend;$$;", ["select $$begin\n return 'ab';\nend;$$"])).toBe(false);
    expect(migrationHistoryMatches("/* a /* nested */ comment */ select 1;", ["select 1"])).toBe(true);
    expect(() => migrationHistoryMatches("select 'missing", [])).toThrow();
  });
  it("cannot turn a database name or remote URL into a destructive recovery target", () => {
    for (const value of ["postgres", "template0", "home-care-assistant", "hca_restore_probe_", "hca_restore_probe_000000000000;drop database postgres", "postgres://remote/db", null]) {
      expect(() => assertProbeDatabase(value)).toThrow();
    }
    expect(assertProbeDatabase("hca_restore_probe_000000000000")).toBe("hca_restore_probe_000000000000");
  });
});
