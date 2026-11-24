import type { IconName } from "@/components/ui/icon";

type GuideFact = readonly [title: string, text: string];
export type GuideTopic = {
  title: string;
  subtitle: string;
  icon: IconName;
  facts: readonly GuideFact[];
  destination?: { href: string; label: string; anyCapability?: readonly string[] };
};

export const guideTopics = {
  access: {
    title: "Contexto e responsabilidades",
    subtitle: "Seu acesso na residência",
    icon: "users",
    facts: [
      ["Confira o paciente e a função", "Sua conta pode ter contextos e permissões diferentes. Use Mudar perfil para escolher outro vínculo autorizado."],
      ["Use sua própria conta", "Cada pessoa confirma seus convites, recebimentos e decisões."],
      ["Encontre a tarefa", "Consulte o histórico e os filtros para encontrar pendências antigas. Marcar um aviso como visto mantém as tarefas e a ciência em seus fluxos próprios."],
    ],
    destination: { href: "/perfil", label: "Consultar meus vínculos" },
  },
  request: {
    title: "Preencher uma requisição",
    subtitle: "Estoque atual e necessidade",
    icon: "file",
    facts: [
      ["Confirme a identificação", "Confira o paciente e quem preenche a ficha."],
      ["Confira o estoque atual", "Mantenha o saldo da equipe, corrija inclusive para zero ou marque Não sei informar. Ao emitir, os valores informados atualizam o estoque da equipe."],
      ["Revise antes de emitir", "Confira materiais, itens extras e observações. A REQ registra a necessidade do material."],
    ],
    destination: { href: "/fichas/req", label: "Abrir requisição", anyCapability: ["req.create"] },
  },
  receiving: {
    title: "Conferir o que chegou",
    subtitle: "Entrega de materiais · equipe",
    icon: "truck",
    facts: [
      ["Confira as quantidades", "Mantenha os valores preenchidos quando corresponderem ao que você recebeu."],
      ["Ajuste apenas o que for diferente", "Ao confirmar, o sistema identifica os materiais com diferença e apresenta a divergência para conferência."],
      ["Acompanhe a avaliação familiar", "A conferência das quantidades registra o que foi recebido. A avaliação familiar registra se a necessidade foi atendida."],
    ],
    destination: { href: "/entregas", label: "Abrir entregas", anyCapability: ["ent.read"] },
  },
  consumption: {
    title: "Registrar consumo ou falta",
    subtitle: "Consumo da equipe",
    icon: "box",
    facts: [
      ["Registre o consumo conhecido", "Informe materiais e quantidades consumidas. Ao emitir, o consumo baixa o estoque da equipe."],
      ["Use o aviso para relatar uma falta", "O aviso de falta mantém o saldo e abre o acompanhamento com a família."],
      ["Confira uma resposta incerta", "Se a confirmação demorar, consulte o resultado da mesma tentativa antes de repetir a emissão."],
    ],
    destination: { href: "/consumo", label: "Consultar relatos", anyCapability: ["consumption.report", "consumption.confirm", "consumption.team.write", "consumption.team.correct"] },
  },
  purchase: {
    title: "Acompanhar compra e entrega",
    subtitle: "Compra · família",
    icon: "box",
    facts: [
      ["Confira o planejamento", "A administração do paciente avalia itens e quantidades quando a compra exige decisão."],
      ["Registre a chegada dos materiais", "O registro por familiar comum exige aprovação antes de entrar no estoque familiar."],
      ["Entregue à equipe quando necessário", "A compra pode existir sem REQ. A ENT registra a entrega à equipe e informa o atendimento da requisição vinculada."],
    ],
    destination: { href: "/historico?type=COM", label: "Consultar compras", anyCapability: ["com.read"] },
  },
  recovery: {
    title: "Quando a confirmação não chega",
    subtitle: "Continuidade da tarefa",
    icon: "refresh",
    facts: [
      ["Confira a mensagem do sistema", "Uma resposta demorada deixa o resultado da gravação em aberto."],
      ["Consulte o resultado", "A recuperação verifica a mesma tentativa e evita repetir a operação."],
      ["Peça ajuda após duas tentativas", "Se a recuperação continuar falhando, copie os detalhes e avise o responsável pelo sistema."],
    ],
  },
  contingency: {
    title: "Continue com fatos conhecidos",
    subtitle: "Contingência em caso de indisponibilidade",
    icon: "note",
    facts: [
      ["Siga o procedimento da residência", "Sem acesso ou conexão, siga a contingência acordada com o responsável. Registre fato, pessoa, instante conhecido e referência."],
      ["Confira o que já foi registrado", "Ao retornar, procure a referência original antes de registrar outro ato. Confirmações pessoais seguem o fluxo próprio."],
    ],
    destination: { href: "/contingencias", label: "Abrir contingências", anyCapability: ["contingency.read"] },
  },
  administration: {
    title: "Administre somente este paciente",
    subtitle: "Pessoas, catálogo e regras locais",
    icon: "settings",
    facts: [
      ["Confira equipe e catálogo", "Verifique vínculos, materiais, custódias, escalas e responsáveis por contingência. Administre somente os recursos autorizados para este paciente."],
      ["Revise decisões de acesso", "Compare as propostas com a referência atual. Convites dependem de aceite pessoal."],
    ],
    destination: { href: "/admin", label: "Abrir administração", anyCapability: ["access.manage"] },
  },
  shifts: {
    title: "Acompanhe dentro do seu vínculo",
    subtitle: "Escalas e responsabilidades",
    icon: "calendar",
    facts: [
      ["Consulte a programação", "A escala organiza a rotina. A presença permanece em registro próprio."],
      ["Mantenha a referência da tarefa", "O adiamento de uma obrigação segue a decisão própria. No balanço designado, a contagem vem antes da comparação. A revisão independente conserva sua autoria."],
    ],
    destination: { href: "/escalas", label: "Consultar escalas", anyCapability: ["schedule.read.own", "schedule.read.team"] },
  },
  balance: {
    title: "Conserve a responsabilidade",
    subtitle: "Balanços, adiamentos e recontagens",
    icon: "note",
    facts: [
      ["Confira a atribuição", "Use o adiamento e a recontagem quando estiver habilitado. Consulte a versão atual do balanço para conferir materiais e divergências."],
      ["Preserve o histórico", "A aplicação ao estoque usa o movimento com a referência do balanço."],
    ],
    destination: { href: "/balancos", label: "Consultar balanços", anyCapability: ["bal.read"] },
  },
  records: {
    title: "Consulte o que foi autorizado",
    subtitle: "Fichas, históricos e responsabilidades",
    icon: "file",
    facts: [
      ["Consulte o fato registrado", "Datas, autores e versões ajudam a identificar o fato original."],
      ["Use o processo responsável", "A visualização, a ciência e o recebimento têm registros próprios. Se houver erro, peça a correção à administração local."],
    ],
    destination: { href: "/historico", label: "Consultar fichas", anyCapability: ["req.read", "com.read", "ent.read", "bal.read"] },
  },
  residence: {
    title: "Criar nova residência",
    subtitle: "Identificação, responsáveis e criação confirmada",
    icon: "home",
    facts: [
      ["Identifique a residência", "Confira o nome, o fuso e a administração inicial antes da criação."],
      ["Organize a preparação local", "A criação e o vínculo local têm autorizações próprias. A equipe local confere materiais, pessoas e rotinas."],
    ],
    destination: { href: "/preparar-residencia", label: "Abrir preparação" },
  },
  technical: {
    title: "Central técnica",
    subtitle: "Observações de serviço e continuidade",
    icon: "shield",
    facts: [
      ["Confira o ambiente", "Consulte as observações e seus instantes antes de decidir se um incidente exige acompanhamento."],
      ["Preserve a separação de acesso", "A administração global usa o contexto técnico. Para dados do paciente, use um vínculo local autorizado."],
    ],
    destination: { href: "/admin?section=operations", label: "Abrir central técnica" },
  },
} satisfies Record<string, GuideTopic>;

export type GuideTopicId = keyof typeof guideTopics;

// Keep the existing six progress slots per scope. The index is stored by the
// guide RPC, independently from the order in which the shortcuts are displayed.
const topicsByRole: Record<string, readonly GuideTopicId[]> = {
  professional: ["access", "consumption", "request", "receiving", "recovery", "contingency"],
  supervisor: ["access", "consumption", "shifts", "balance", "recovery", "contingency"],
  family: ["access", "receiving", "purchase", "records", "recovery", "contingency"],
  admin: ["access", "purchase", "administration", "receiving", "recovery", "contingency"],
  reader: ["access", "receiving", "records", "balance", "recovery", "contingency"],
  global: ["residence", "technical", "records", "balance", "recovery", "contingency"],
};

export function guideTopicsFor(role: string) {
  const topics = topicsByRole[role] ?? topicsByRole.reader;
  const order = role === "professional" ? [2, 3, 1, 4, 0, 5]
    : role === "family" ? [0, 2, 1, 4, 3, 5]
    : role === "reader" ? [0, 2, 4, 5]
    : role === "global" ? [0, 1]
    : [0, 2, 3, 4, 1, 5];
  return order.map(index => ({ index, id: topics[index], topic: guideTopics[topics[index]] as GuideTopic }));
}
