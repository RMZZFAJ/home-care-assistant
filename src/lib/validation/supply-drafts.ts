import { z } from "zod";
const text=(max:number)=>z.string().max(max,`Este campo permite até ${max} caracteres.`);
const entries=<T extends z.ZodType>(value:T,max=1000,keyLength=120)=>z.record(text(keyLength).min(1),value).refine(value=>Object.keys(value).length<=max,"Há campos demais neste preenchimento.");
export const comOperationPurposes = ["approve", "purchase", "receive", "validate_receipt", "reject_receipt", "close_expectation", "cancel"] as const;
export const comOperationDraftPurpose = z.enum(comOperationPurposes);
export type ComOperationPurpose = z.infer<typeof comOperationDraftPurpose>;
export const isComOperationPurpose = (value: string): value is ComOperationPurpose => comOperationDraftPurpose.safeParse(value).success;
export const entOperationPurposes = ["receive", "divergence", "reassign", "resolve", "cancel", "refuse_cancellation", "withdraw_cancellation", "consent_cancel"] as const;
export const entOperationDraftPurpose = z.enum(entOperationPurposes);
export type EntOperationPurpose = z.infer<typeof entOperationDraftPurpose>;
export const isEntOperationPurpose = (value: string): value is EntOperationPurpose => entOperationDraftPurpose.safeParse(value).success;
export const entRegularizationPurposes = ["propose_regularization", "approve_regularization", "reject_regularization", "withdraw_regularization", "record_regularization_finding"] as const;
export const entTransferPurposes = ["transfer_agree", "transfer_decline", "transfer_withdraw", "transfer_dispatch"] as const;
export const entDeclarationPurposes = ["transfer_declare_family", "transfer_declare_team"] as const;
export const entDeclarationDraftPurpose = z.enum(entDeclarationPurposes);
export const newSupplyDraftPurposes: readonly string[] = ["create",...entDeclarationPurposes];
export const declarationSourceForPurpose = (purpose:string) => purpose === "transfer_declare_family" ? "FAMILY" : purpose === "transfer_declare_team" ? "CARE_TEAM" : undefined;
export const entDraftPurposes = [...entOperationPurposes, ...entRegularizationPurposes, ...entTransferPurposes,...entDeclarationPurposes] as const;
export const entDraftPurpose = z.enum(entDraftPurposes);
export const draftPurpose=z.enum(["create","revise","receive","divergence","approve","purchase","validate_receipt","reject_receipt","close_expectation","cancel","reassign","resolve","refuse_cancellation","withdraw_cancellation","consent_cancel",...entRegularizationPurposes,...entTransferPurposes,...entDeclarationPurposes]);
export const draftMaterials=z.array(z.object({id:text(120).min(1),name:text(200),unit:text(80),quantityDecimals:z.number().int().min(0).max(6)}).strict()).max(1000);
export const supplyDraftContent=z.object({
  form:z.object({
    quantities:entries(text(64)),notes:text(3000),origin:z.enum(["","purchase","donation"]),source:z.enum(["FAMILY","CARE_TEAM"]),
    recipientId:z.union([z.literal(""),z.uuid()]),recipientReason:text(1000).optional(),
    sharedNeedReasons:entries(text(1000)).optional(),manualQuantities:entries(text(64)).optional(),
    presentationSelections:entries(z.array(z.object({id:z.uuid(),version:z.number().int().positive(),packages:text(64),barcode:text(64),name:text(200),baseQuantity:text(64),unit:text(80)}).strict()).max(100)).optional(),
  }).strict(),links:entries(z.array(z.uuid()).max(1000)),materials:draftMaterials,
  context:z.object({documentId:z.uuid().nullable(),documentVersion:z.number().int().positive().nullable(),requisitionId:z.uuid().nullable(),recipientName:text(200)}).strict(),
}).strict();
export const receiptDraftContent=z.object({documentVersion:z.number().int().positive(),fields:entries(text(3000),3000,160),divergentIds:z.array(z.uuid()).max(1000),materials:draftMaterials}).strict();
export const transferDeclarationDraftContent = receiptDraftContent.extend({documentVersion:z.null()}).refine(value=>new Set(value.materials.map(item=>item.id)).size===value.materials.length,"Não repita materiais no preenchimento da declaração.");
export type TransferDeclarationDraftContent=z.infer<typeof transferDeclarationDraftContent>;
export type SupplyDraftContent=z.infer<typeof supplyDraftContent>;
export type ReceiptDraftContent=z.infer<typeof receiptDraftContent>;
export type DraftPurpose=z.infer<typeof draftPurpose>;
