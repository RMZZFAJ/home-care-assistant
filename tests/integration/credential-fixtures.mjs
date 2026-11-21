import { randomUUID } from "node:crypto";
import { setup, rpc, fixtures } from "./v4-fixtures.mjs";
import { shiftWorker } from "./shift-fixtures.mjs";
import { draftDevice } from "./private-draft-fixtures.mjs";
import { sql,sqlLiteral } from "../../scripts/test-environment.mjs";
export async function credentialFixture() {
 const f=await setup(),subject=await shiftWorker(f.patient),reviewer=await draftDevice(f.patient,"adminA");
 const state=await subject.client.from("profiles").select("notification_preferences").eq("id",subject.id).single();
 if(state.error)throw state.error;
 await rpc(subject.client,"update_my_profile",{p_name:"Técnica fictícia",p_registration:"001234",p_state:"SP",p_category:"Técnica de enfermagem",p_preferences:state.data.notification_preferences});
 return {...f,subject,reviewer,preferences:state.data.notification_preferences};
}
export const credentialRead=(f,client=f.reviewer,extra={})=>rpc(client,"patient_professional_credential",{p_patient:f.patient,p_subject:f.subject.id,...extra});
export const reviewPacket=(f,read,extra={})=>({p_patient:f.patient,p_subject:f.subject.id,p_expected:read.declaration.revision,p_outcome:"checked",p_note:"",p_key:randomUUID(),...extra});
export const credentialHistory=f=>sql(`select coalesce(jsonb_agg(to_jsonb(r) order by recorded_at,id),'[]') from private.professional_credential_reviews r where care_recipient_id=${sqlLiteral(f.patient)};`);
export {rpc,fixtures,draftDevice};
