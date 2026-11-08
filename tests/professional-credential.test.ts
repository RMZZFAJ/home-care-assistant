import { describe,it,expect } from "vitest";
import { credentialReviewInput,credentialRevision,parseProfessionalCredential } from "@/lib/validation/professional-credential";
const patient="20000000-0000-4000-8000-000000000001",subject="10000000-0000-4000-8000-000000000001";
const input={careRecipientId:patient,subjectId:subject,expectedRevision:"1",outcome:"checked",note:"",idempotencyKey:"30000000-0000-4000-8000-000000000001"};
describe("professional credential facts never become caller-selected proof",()=>{
 it.each(["author","recordedAt","externalValidation","role"])("rejects caller-selected %s",field=>{expect(credentialReviewInput.safeParse({...input,[field]:"invented"}).success).toBe(false);});
 it("requires a real outcome and a reason for an unfinished check",()=>{expect(credentialReviewInput.safeParse(input).success).toBe(true);expect(credentialReviewInput.safeParse({...input,outcome:"externally_validated"}).success).toBe(false);expect(credentialReviewInput.safeParse({...input,outcome:"not_confirmed"}).success).toBe(false);expect(credentialReviewInput.safeParse({...input,outcome:"not_confirmed",note:"Documento não apresentado"}).success).toBe(true);});
 it("preserves exact bigint revisions and refuses overflow or leading zeroes",()=>{expect(credentialRevision.parse("9223372036854775807")).toBe("9223372036854775807");for(const v of ["9223372036854775808","01","0","1.0"])expect(credentialRevision.safeParse(v).success).toBe(false);});
 it("checks both patient and subject before displaying a read",()=>{
  const data={subjectId:subject,patientId:patient,declaration:{revision:"1",changedAt:"2026-11-08T12:00:00Z",valueHash:"a".repeat(64),values:{fullName:"Cuidadora fictícia",category:"Cuidadora",registration:null,state:null}},state:"informed",latestReview:null,externalValidation:null,canReview:false,history:[],nextCursor:null};
  expect(parseProfessionalCredential(data,patient,subject).declaration.values.registration).toBeNull();
  expect(()=>parseProfessionalCredential(data,subject,patient)).toThrow();expect(()=>parseProfessionalCredential({...data,externalValidation:{verified:true}},patient,subject)).toThrow();
 });
});
