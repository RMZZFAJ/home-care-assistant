import { expect,it } from "vitest";
import { applyMaterialSelection } from "@/lib/requisitions/recurring-selection";
import { selectionCommandSchema,parseSelectionLibrary,selectionConfirmed } from "@/lib/validation/recurring-selection";
const owner="10000000-0000-4000-8000-000000000001",patient="20000000-0000-4000-8000-000000000001",product="30000000-0000-4000-8000-000000000001",other="40000000-0000-4000-8000-000000000001";
const catalogue=[{id:product,name:"Gaze atual",category:"higiene" as const,unit:"unidade",active:true}];
const packet={careRecipientId:patient,name:"Materiais habituais",productIds:[product],idempotencyKey:other};
const row={id:other,ownerId:owner,patientId:patient,name:packet.name,productIds:[product],createdAt:"2026-11-08T17:45:00Z"};
it("creates fresh declarations from membership only, without copying seven, urgency or reasons",()=>{
 const source={...catalogue[0],currentStock:"7",stockObservation:"observed",urgent:true,repeatReason:"Motivo antigo"};
 const result=applyMaterialSelection([], [product], [source]);
 expect(result.lines).toEqual([{productId:product,productName:"Gaze atual",category:"higiene",unit:"unidade",currentStock:null,stockObservation:"unfilled",stockObservationAt:null,urgent:false}]);
 expect(result.added).toEqual([product]);
});
it("preserves current edits on duplicates and refuses unavailable members without mutating the saved membership",()=>{
 const existing={...applyMaterialSelection([],[product],catalogue).lines[0],currentStock:"2",urgent:true,repeatReason:"Motivo atual"};
 const ids=[product,other,other],result=applyMaterialSelection([existing],ids,catalogue);
 expect(result.lines).toEqual([existing]);expect(result.lines[0]).toBe(existing);expect(result.duplicate).toEqual([product]);expect(result.unavailable).toEqual([other]);expect(ids).toEqual([product,other,other]);
 expect(applyMaterialSelection([],[product],[{...catalogue[0],active:false}]).lines).toEqual([]);
});
it("bounds a named private set and rejects old observations, extra fields and duplicate IDs",()=>{
 expect(selectionCommandSchema.parse({...packet,productIds:["patient-product-text-identity"]}).productIds).toEqual(["patient-product-text-identity"]);
 expect(selectionCommandSchema.parse({...packet,name:"  Materiais habituais  "})).toEqual(packet);
 for(const bad of [{...packet,currentStock:"7"},{...packet,urgent:true},{...packet,name:"x"},{...packet,name:"x".repeat(81)},{...packet,name:"Linha\nquebrada"},{...packet,productIds:[]},{...packet,productIds:[product,product]},{...packet,ownerId:owner}])expect(selectionCommandSchema.safeParse(bad).success).toBe(false);
});
it("never presents a foreign owner, patient or untyped response as the user's library",()=>{
 expect(parseSelectionLibrary([row],owner,patient)).toEqual([row]);
 for(const bad of [[{...row,ownerId:other}],[{...row,patientId:other}],[{...row,name:" Com espaços "}],[row,row],[{...row,stock:"7"}]])expect(()=>parseSelectionLibrary(bad,owner,patient)).toThrow();
});
it("requires exact original command facts to confirm a200 or a replay",()=>{
 expect(selectionConfirmed({data:{selection:row,replayed:true}},packet,owner)).toBe(true);
 for(const change of [{ownerId:other},{patientId:other},{name:"Outra lista"},{productIds:[other]},{name:" Materiais habituais "}])expect(selectionConfirmed({data:{selection:{...row,...change},replayed:false}},packet,owner)).toBe(false);
 expect(selectionConfirmed({ok:true},packet,owner)).toBe(false);
});
