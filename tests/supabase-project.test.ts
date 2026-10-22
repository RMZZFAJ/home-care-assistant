import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

function command(args: string[], extraEnv: Record<string,string> = {}) {
  return spawnSync(process.execPath,["scripts/supabase-project.mjs",...args],{encoding:"utf8",env:{...process.env,...extraEnv}});
}

describe("Supabase project boundary",() => {
  it.each([["db","push","--db-url=postgres://other.example/db"],["migration","list","--profile","other"],["db","query","--project-ref","other"]])("rejects target override before contacting the CLI: %j",(...args) => {
    const result=command(args);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Target/profile overrides");
  });
  it.each([["db","reset","--linked"],["projects","delete","wrong-project"],["migration","repair"],["unlink"]])("rejects unrelated or destructive remote operation: %j",(...args) => {
    const result=command(args);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("outside the project update workflow");
  });
  it("does not silently accept an inherited account token",() => {
    const result=command(["doctor"],{SUPABASE_ACCESS_TOKEN:"fixture-not-a-real-token"});
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Remove SUPABASE_ACCESS_TOKEN");
    expect(result.stderr).not.toContain("fixture-not-a-real-token");
  });
});
