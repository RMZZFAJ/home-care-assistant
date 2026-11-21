/** Patient roles are display data. Global administration is a separate context. */
export const roleLabels: Record<string,string> = {
  admin:"Administrador do paciente",supervisor:"Supervisor",professional:"Profissional",family:"Familiar",reader:"Leitor",
};
export function roleLabel(value:unknown) {
  return typeof value==="string"&&Object.hasOwn(roleLabels,value)?roleLabels[value]:"Função não reconhecida";
}
