"use client";
import {DefinitionGrid} from '@/components/ui/controls';
import {roleLabel} from '@/lib/role-labels';
import {formatBrazilDate} from '@/lib/receipt';
import type {ContingencyContent} from '@/lib/validation/contingency';
type Facts=Omit<ContingencyContent,'materials'> & {materials:(Omit<ContingencyContent['materials'][number],'reviewedUnit'|'reviewedDecimals'>&{productName?:string|null;unit?:string|null})[]};
export function ContingencyFacts({value,scope}:{value:Facts;scope:string}){
 return <div className="hca-contingency-facts"><p className="whitespace-pre-wrap wrap-break-word">{value.fact}</p><DefinitionGrid items={[
  {label:'Referência física conhecida',value:value.knownReference??'Desconhecida'},
  {label:'Data do fato físico',value:value.occurredOn?value.occurredOn.split('-').reverse().join('/'):'Desconhecida'},
  {label:'Hora do fato físico',value:value.occurredTime??'Desconhecida'},
  {label:'Fuso do fato físico',value:value.timeZone??'Desconhecido'},
  {label:'Pessoa que realizou o fato',value:value.performer??'Desconhecida'},
  {label:'Pessoa que recebeu',value:value.receiver??'Desconhecida'},
  {label:'Ressalva',value:value.notes??'Nenhuma ressalva declarada',wide:true},
 ]}/><p>Os nomes acima são referências declaradas do fato físico. Não atribuem autoria digital, ciência ou recebimento no aplicativo.</p>
 {value.materials.length?<div className="hca-contingency-rows">{value.materials.map((row,position)=>({row,key:scope+':material:'+String(position+1)})).map(({row,key})=><section className="ui-card" key={key}><DefinitionGrid items={[{label:'Material físico',value:row.productName??row.description??'Não identificado'},{label:'Unidade',value:row.unit??'Não identificada'},{label:'Quantidade física declarada',value:row.quantity??'Desconhecida'},{label:'Custódia declarada',value:row.custody==='FAMILY'?'Família':row.custody==='CARE_TEAM'?'Equipe':row.custody==='TRANSIT'?'Em trânsito':'Desconhecida'}]}/></section>)}</div>:<p>Nenhum material identificado nesta declaração.</p>}
 {value.communications.length?<section><h3>Comunicações declaradas</h3>{value.communications.map((row,position)=>({row,key:scope+':communication:'+String(position+1)})).map(({row,key})=><p className="wrap-break-word" key={key}><strong>{row.person}</strong> · {row.channel==='paper'?'Registro físico':row.channel==='phone'?'Telefone':row.channel==='internal'?'Aplicativo':'Outro canal'} · {({pending:'Pendente',attempted:'Tentativa declarada',reported_sent:'Envio declarado',reported_read:'Leitura declarada'} as const)[row.state]}<br/>{row.basis}</p>)}<p>Esta declaração não envia avisos nem comprova a leitura ou a confirmação pessoal.</p></section>:null}
 </div>;
}
export function ContingencyAttribution({name,role,at}:{name:string;role:string;at:string}){return <p>Registro digital por {name} · {roleLabel(role)} · {formatBrazilDate(at)}. A data do fato físico está indicada separadamente.</p>;}
