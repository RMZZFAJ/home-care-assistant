import {z} from 'zod';
import {exactQuantity} from './exact-quantity';
export const contingencyProcesses={REQ:'Requisição',COM:'Compra ou doação',ENT:'Entrega de materiais',RETURN:'Devolução de materiais',BAL:'Balanço',CONSUMPTION_FAMILY:'Consumo — família',CONSUMPTION_TEAM:'Consumo — equipe'} as const;
export const contingencyProcess=z.enum(['REQ','COM','ENT','RETURN','BAL','CONSUMPTION_FAMILY','CONSUMPTION_TEAM']);
const nullableText=(max=300)=>z.string().trim().min(1).max(max).nullable();
export const contingencyContent=z.object({
 fact:z.string().trim().min(3).max(4000),knownReference:nullableText(),occurredOn:z.iso.date().nullable(),occurredTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),timeZone:nullableText(),
 performer:nullableText(),receiver:nullableText(),notes:nullableText(2000),
 materials:z.array(z.object({productId:nullableText(120),description:nullableText(),quantity:exactQuantity.nullable(),custody:z.enum(['FAMILY','CARE_TEAM','TRANSIT']).nullable(),reviewedUnit:nullableText(30),reviewedDecimals:z.number().int().min(0).max(6).nullable()}).strict()).max(100),
 communications:z.array(z.object({person:z.string().trim().min(1).max(300),channel:z.enum(['internal','phone','paper','other']),state:z.enum(['pending','attempted','reported_sent','reported_read']),basis:z.string().trim().min(3).max(1000)}).strict()).max(30),
}).strict().refine(v=>v.occurredTime===null||Boolean(v.occurredOn&&v.timeZone),{path:['occurredTime'],message:'Informe data e fuso do horário conhecido, ou declare o horário desconhecido.'});
export type ContingencyContent=z.infer<typeof contingencyContent>;
export const emptyContingency=():ContingencyContent=>({fact:'',knownReference:null,occurredOn:null,occurredTime:null,timeZone:null,performer:null,receiver:null,notes:null,materials:[],communications:[]});
const common={expectedActorId:z.uuid(),careRecipientId:z.uuid().transform(v=>v.toLowerCase()),process:contingencyProcess,idempotencyKey:z.uuid()};
const target={id:z.uuid(),expectedRevision:z.number().int().positive()};
export const contingencyCommand=z.discriminatedUnion('action',[
 z.object({...common,action:z.literal('record'),content:contingencyContent}).strict(),
 z.object({...common,...target,action:z.literal('supplement'),content:contingencyContent}).strict(),
 z.object({...common,...target,action:z.enum(['needs_clarification','link_existing']),reason:z.string().trim().min(3).max(2000),targetId:z.uuid().nullable()}).strict().refine(v=>v.action==='link_existing'?v.targetId!==null:v.targetId===null,{path:['targetId'],message:'Selecione a referência existente para vincular; esclarecimento não confirma vínculo.'}),
 z.object({...common,action:z.literal('resolve')}).strict(),
]);
export type ContingencyCommand=z.infer<typeof contingencyCommand>;
const instant=z.iso.datetime({offset:true});
const receipt=z.object({patientId:z.uuid(),process:contingencyProcess,key:z.uuid(),actorId:z.uuid(),persistence:z.enum(['confirmed','not_executed','unconfirmed']),caseId:z.uuid().optional(),revision:z.number().int().positive().optional(),action:z.string().optional(),recordedAt:instant.optional()});
export function parseContingencyReceipt(value:unknown,scope:{patientId:string;process:string;key:string;actorId?:string}){const r=receipt.safeParse(value);if(!r.success||r.data.patientId!==scope.patientId||r.data.process!==scope.process||r.data.key!==scope.key||(scope.actorId&&r.data.actorId!==scope.actorId)||r.data.persistence==='confirmed'&&(!r.data.caseId||!r.data.revision||!r.data.action))throw new Error('O comprovante não corresponde à sua tentativa. Consulte o resultado.');return r.data;}
export const storedContingencyContent=z.object({...contingencyContent.shape,materials:z.array(contingencyContent.shape.materials.element.omit({reviewedUnit:true,reviewedDecimals:true}).extend({productName:z.string().nullable(),unit:z.string().nullable(),decimals:z.number().int().nullable()}))});
export const contingencyCase=z.object({id:z.uuid(),patientId:z.uuid(),process:contingencyProcess,content:storedContingencyContent,actorId:z.uuid(),actorName:z.string(),actorRole:z.string(),recordedAt:instant,revision:z.number().int().positive(),state:z.enum(['recorded','needs_clarification','linked']),canReport:z.boolean(),canReview:z.boolean(),events:z.array(z.object({id:z.uuid(),sequence:z.number().int().positive(),action:z.enum(['supplement','needs_clarification','link_existing']),body:z.record(z.string(),z.unknown()),actorId:z.uuid(),actorName:z.string(),actorRole:z.string(),recordedAt:instant}))});
export type ContingencyCase=z.infer<typeof contingencyCase>;
export const contingencyDossier=contingencyCase.extend({
  evidence:z.array(z.object({id:z.uuid(),filename:z.string(),confirmedAt:instant.nullable()}).strict()),
});
export type ContingencyDossier=z.infer<typeof contingencyDossier>;
export const contingencyQuery=z.object({careRecipientId:common.careRecipientId,process:contingencyProcess,view:z.enum(['cases','references','recovery']).default('cases'),id:z.uuid().transform(v=>v.toLowerCase()).optional(),page:z.coerce.number().int().min(0).max(100000).default(0),query:z.string().trim().max(200).default(''),attemptKey:z.uuid().optional()}).strict();

const caseIndexRow = contingencyCase.pick({ id:true, patientId:true, process:true, recordedAt:true, state:true }).extend({
  reference: z.string().nullable(), description: z.string().min(1).refine(value => Array.from(value).length <= 240),
}).strict();
const caseIndex = z.object({
  patientId: z.uuid(), process: contingencyProcess, query: z.string(), page: z.number().int(), pageSize: z.literal(25),
  total: z.number().int().nonnegative(), canReport: z.boolean(), data: z.array(caseIndexRow),
}).strict();

export function parseContingencyCases(value: unknown, patient: string, process: string, page: number, query = '') {
  const result = caseIndex.safeParse(value);
  if (!result.success) throw new Error('A consulta não corresponde às contingências deste paciente. Atualize a seção.');
  const {data} = result;
  if (data.patientId !== patient || data.process !== process || data.page !== page || data.query !== query
    || data.data.some(row => row.patientId !== patient || row.process !== process)
    || new Set(data.data.map(row => row.id)).size !== data.data.length
    || data.data.length !== Math.min(data.pageSize, Math.max(0, data.total - page * data.pageSize))) {
    throw new Error('A consulta não corresponde às contingências deste paciente. Atualize a seção.');
  }
  return data;
}
