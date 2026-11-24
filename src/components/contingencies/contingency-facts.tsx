"use client";
import {DefinitionGrid,Pill} from '@/components/ui/controls';
import {Icon} from '@/components/ui/icon';
import {roleLabel} from '@/lib/role-labels';
import {formatBrazilDate} from '@/lib/receipt';
import type {ContingencyContent} from '@/lib/validation/contingency';
type Facts=Omit<ContingencyContent,'materials'> & {materials:(Omit<ContingencyContent['materials'][number],'reviewedUnit'|'reviewedDecimals'>&{productName?:string|null;unit?:string|null})[]};
export function ContingencyFacts({value,scope,layout='complete'}:{value:Facts;scope:string;layout?:'complete'|'dossier'|'review'}){
 const complete=layout==='complete';
 const review=layout==='review';
 const physicalDate=value.occurredOn?.split('-').reverse().join('/')??'Data desconhecida';
 return <div className="hca-contingency-facts"><div className={complete?undefined:'hca-contingency-lead'}>
  {!complete&&<span className="hca-guide-row-icon"><Icon name="note"/></span>}
  <div><h3>{review?'Fato declarado':'O que foi declarado'}</h3><p className="whitespace-pre-wrap wrap-break-word">{value.fact}</p></div>
 </div><DefinitionGrid items={[
  ...(!review?[{label:'Referência física conhecida',value:value.knownReference??'Desconhecida'}]:[]),
  ...(review?[
   {label:'Data e hora',value:physicalDate+' · '+(value.occurredTime??'Horário desconhecido')},
   {label:'Fuso',value:value.timeZone??'Desconhecido'},
  ]:[]),
  ...(complete?[
   {label:'Data do fato físico',value:value.occurredOn?value.occurredOn.split('-').reverse().join('/'):'Desconhecida'},
   {label:'Hora do fato físico',value:value.occurredTime??'Desconhecida'},
   {label:'Fuso do fato físico',value:value.timeZone??'Desconhecido'},
  ]:[]),
  {label:'Pessoa que realizou o fato',value:value.performer??'Desconhecida'},
  {label:'Pessoa que recebeu',value:value.receiver??'Desconhecida'},
  ...(!review||value.notes?[{label:'Ressalva',value:value.notes??'Nenhuma ressalva declarada',wide:true}]:[]),
 ]}/>{!review&&<p>Os nomes acima são referências declaradas do fato físico. Não atribuem autoria digital, ciência ou recebimento no aplicativo.</p>}
 {complete||review&&value.materials.length>0?<ContingencyMaterials materials={value.materials} scope={scope} compact={review} showCustody={review}/>:null}
 {value.communications.length?<section><h3>Comunicações declaradas</h3>{value.communications.map((row,position)=>({row,key:scope+':communication:'+String(position+1)})).map(({row,key})=><p className="wrap-break-word" key={key}><strong>{row.person}</strong> · {row.channel==='paper'?'Registro físico':row.channel==='phone'?'Telefone':row.channel==='internal'?'Aplicativo':'Outro canal'} · {({pending:'Pendente',attempted:'Tentativa declarada',reported_sent:'Envio declarado',reported_read:'Leitura declarada'} as const)[row.state]}<br/>{row.basis}</p>)}<p>Esta declaração não envia avisos nem comprova a leitura ou a confirmação pessoal.</p></section>:null}
 </div>;
}
const custodyLabels={FAMILY:'Família',CARE_TEAM:'Equipe',TRANSIT:'Em trânsito'} as const;

export function ContingencyMaterials({materials,scope,compact=false,showCustody=false}:{materials:Facts['materials'];scope:string;compact?:boolean;showCustody?:boolean}){
 if(!materials.length)return <p>Nenhum material identificado nesta declaração.</p>;
 return <div className={compact?'hca-contingency-materials':'hca-contingency-rows'}>
  {materials.map((row,position)=>({row,key:scope+':material:'+String(position+1)})).map(({row,key})=>{
   const name=row.productName??row.description??'Não identificado';
   const custody=row.custody?custodyLabels[row.custody]:null;
   if(compact){
    const quantity=row.quantity===null?'Quantidade desconhecida':[row.quantity,row.unit].filter(Boolean).join(' ');
    return <div className="hca-contingency-material" key={key}>
     <span className="hca-guide-row-icon"><Icon name="box"/></span>
     <span className="hca-guide-row-label"><strong>{name}</strong><small>{quantity}{showCustody?null:' · '+(custody??'Custódia desconhecida')}</small></span>
     <Pill tone="neutral">{showCustody?(custody??'Custódia desconhecida'):'Declarado'}</Pill>
    </div>;
   }
   return <section className="ui-card" key={key}><DefinitionGrid items={[
    {label:'Material físico',value:name},{label:'Unidade',value:row.unit??'Não identificada'},
    {label:'Quantidade física declarada',value:row.quantity??'Desconhecida'},{label:'Custódia declarada',value:custody??'Desconhecida'},
   ]}/></section>;
  })}
 </div>;
}
export function ContingencyAttribution({name,role,at}:{name:string;role:string;at:string}){return <p>Registro digital por {name} · {roleLabel(role)} · {formatBrazilDate(at)}. A data do fato físico está indicada separadamente.</p>;}
