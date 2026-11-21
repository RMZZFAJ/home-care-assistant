export const scheduleEventLabels: Record<string, string> = {
  "schedule.type": "Tipo de plantão atualizado",
  "schedule.proposed": "Programação proposta",
  "schedule.published": "Programação publicada",
  "schedule.approve": "Programação aprovada",
  "schedule.reject": "Programação recusada",
  "schedule.end_series": "Programação encerrada",
  "schedule.change_requested": "Alteração proposta",
  "schedule.change_decided": "Decisão de alteração",
  "schedule.change": "Plantão alterado",
  "schedule.cancel": "Plantão cancelado",
};
export function scheduleEventLabel(action:string){return Object.hasOwn(scheduleEventLabels,action)?scheduleEventLabels[action]:"Alteração registrada";}
