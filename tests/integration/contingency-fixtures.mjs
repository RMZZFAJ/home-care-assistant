import {randomUUID} from 'node:crypto';
import {rpc} from './v4-fixtures.mjs';
export const contingencyBody=(patch={})=>({fact:'Registro físico fictício, preservado sem presumir recebimento pessoal.',knownReference:null,occurredOn:null,occurredTime:null,timeZone:null,performer:null,receiver:null,materials:[],notes:null,communications:[],...patch});
export const contingencyPacket=(patient,process='REQ',patch={})=>({p_patient:patient,p_process:process,p_id:null,p_expected:null,p_action:'record',p_body:contingencyBody(),p_key:randomUUID(),...patch});
export const recordContingency=(client,patient,process='REQ',body=contingencyBody())=>rpc(client,'contingency_command',contingencyPacket(patient,process,{p_body:body}));
