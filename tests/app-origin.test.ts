import { afterEach, describe, expect, it, vi } from "vitest";
import { appOrigin, appOrigins } from "@/lib/server/app-origin";

afterEach(()=>vi.unstubAllEnvs());
describe("trusted application origins",()=>{
  it("keeps the configured local origin behind Next's internal hostname",()=>{
    vi.stubEnv("NEXT_PUBLIC_APP_URL","http://127.0.0.1:3100");
    vi.stubEnv("VERCEL_ENV","");
    expect(appOrigin(new Request("http://localhost:3100/auth/callback"))).toBe("http://127.0.0.1:3100");
  });
  it("accepts the exact preview deployment and branch hosts supplied by Vercel",()=>{
    vi.stubEnv("NEXT_PUBLIC_APP_URL","https://home.example");
    vi.stubEnv("VERCEL_ENV","preview");
    vi.stubEnv("VERCEL_URL","home-care-123-team.vercel.app");
    vi.stubEnv("VERCEL_BRANCH_URL","home-care-audit-team.vercel.app");
    const request=new Request("http://localhost/auth/callback",{headers:{origin:"https://home-care-audit-team.vercel.app"}});
    expect(appOrigin(request)).toBe("https://home-care-audit-team.vercel.app");
    expect(appOrigins(request).has("https://another-project.vercel.app")).toBe(false);
  });
  it("does not trust forwarded host, arbitrary Origin, or malformed deployment metadata",()=>{
    vi.stubEnv("NEXT_PUBLIC_APP_URL","https://home.example");
    vi.stubEnv("VERCEL_ENV","preview");
    vi.stubEnv("VERCEL_URL","evil.example/path");
    vi.stubEnv("VERCEL_BRANCH_URL","");
    expect(appOrigin(new Request("https://evil.example/",{headers:{origin:"https://evil.example","x-forwarded-host":"evil.example"}}))).toBe("https://home.example");
  });
  it("does not use preview metadata for production redirects",()=>{
    vi.stubEnv("NEXT_PUBLIC_APP_URL","https://home.example");
    vi.stubEnv("VERCEL_ENV","production");
    vi.stubEnv("VERCEL_URL","home-care-123-team.vercel.app");
    expect(appOrigin(new Request("https://home-care-123-team.vercel.app/auth/callback"))).toBe("https://home.example");
  });
});
