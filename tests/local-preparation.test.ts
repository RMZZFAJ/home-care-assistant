import { expect, it } from "vitest";
import { localPreparationQuery, parseLocalPreparation, mayPrepareLocally } from "@/lib/validation/local-preparation";
import type { WorkspaceContext } from "@/types/workspace";
const id="20000000-0000-4000-8000-000000000abc",other="20000000-0000-4000-8000-000000000def";
const value={patientId:id,observedAt:"2026-11-12T11:00:00Z",source:"registered_metadata",patient:{name:"Residência fictícia",active:true,referenceTimeZone:null},people:null,catalogue:{activeProducts:0,inactiveProducts:1},stock:{familyMovements:null,teamMovements:null,canManageFamily:true},schedules:null,balance:null,communication:null};
it("keeps unknown and restricted data distinct from a confirmed empty catalogue",()=>{
  const data=parseLocalPreparation(value,id);
  expect(data.catalogue?.activeProducts).toBe(0);expect(data.people).toBeNull();expect(data.stock?.familyMovements).toBeNull();expect(data.patient.referenceTimeZone).toBeNull();
  for(const invalid of [{...value,patientId:other},{...value,catalogue:{activeProducts:null,inactiveProducts:0}},{...value,source:"physical_verification"},{...value,physicalVerified:true},null])expect(()=>parseLocalPreparation(invalid,id)).toThrow();
});
it("requires one known patient filter and canonicalizes UUID input",()=>{
  expect(localPreparationQuery.parse({careRecipientId:id.toUpperCase()}).careRecipientId).toBe(id);
  for(const invalid of [{},{careRecipientId:"invalid"},{careRecipientId:id,role:"admin"}])expect(localPreparationQuery.safeParse(invalid).success).toBe(false);
});
it("local navigation requires an actual local capability rather than identity or global administration",()=>{
  const context={userId:id,fullName:"Nome declarado",isGlobalAdmin:true,patients:[],refresh:async()=>{},activeContext:{mode:"global",care_recipient_id:null,revision:1},patient:{id,display_name:"Residência",role:"admin",capabilities:{"access.manage":true}}} satisfies WorkspaceContext;
  expect(mayPrepareLocally(context)).toBe(false);
  const local={...context,activeContext:{mode:"patient" as const,care_recipient_id:id,revision:2}};
  expect(mayPrepareLocally(local)).toBe(true);
  expect(mayPrepareLocally({...local,patient:{...local.patient,capabilities:{"access.manage":false}}})).toBe(false);
});
