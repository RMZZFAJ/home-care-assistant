import { expect, it } from "vitest";
import { readProfileDirectory } from "@/lib/client/profile-directory";
const profile = (i: number) => ({ id: "30000000-0000-4000-8000-" + String(i).padStart(12,"0"), full_name: "Pessoa " + i, role: "reader", status: "active", global_scope: false, created_at: "2026-11-12T10:00:00Z" });
const response = (page: number, total: number) => ({ data: Array.from({length:Math.min(30,Math.max(0,total-(page-1)*30))},(_,i)=>profile((page-1)*30+i)), total, profilePage: page, pageSize: 30, query: "" });
it("reaches every identity beyond the default1000-row limit and accepts a genuinely empty directory", async () => {
  const pages: number[] = [], signal = new AbortController().signal;
  const result = await readProfileDirectory(async page => { pages.push(page); return response(page,1001); },signal);
  expect(pages).toEqual(Array.from({length:34},(_,i)=>i+1));
  expect(result.map(row=>row.id)).toEqual(Array.from({length:1001},(_,i)=>profile(i).id));
  expect(await readProfileDirectory(async page=>response(page,0),signal)).toEqual([]);
});
it("rejects an incomplete page, duplicate identity or changed population instead of exposing a partial directory", async () => {
  for (const failure of ["incomplete","duplicate","changed"]) {
    await expect(readProfileDirectory(async page=> {
      if (page>2) throw new Error("Unexpected extra directory read");
      const result=response(page,failure==="changed"&&page===2?32:31);
      if(page===2) {
        if(failure==="incomplete")result.data=[];
        if(failure==="duplicate")result.data=[profile(0)];
        if(failure==="changed")result.total=32;
      }
      return result;
    },new AbortController().signal)).rejects.toThrow();
  }
});
it("stops on scope cancellation and propagates a failed later read without returning earlier identities", async () => {
  const controller=new AbortController(), pages:number[]=[];
  await expect(readProfileDirectory(async page=> { pages.push(page); const result=response(page,31); controller.abort(); return result; },controller.signal)).rejects.toThrow();
  expect(pages).toEqual([1]);
  await expect(readProfileDirectory(async page=> { if(page===2)throw new Error("Read failed"); return response(page,31); },new AbortController().signal)).rejects.toThrow("Read failed");
});
