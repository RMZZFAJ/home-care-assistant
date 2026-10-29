# Transferência de decisões para a Fase C

Este é um pacote de entrada para decisão posterior. Nenhuma escolha abaixo foi
aprovada, nenhuma implementação foi iniciada e a Fase C não foi executada. Os
oito defeitos precisam de comportamento coerente; onde há alternativas de
produto, o responsável escolhe o contrato antes de orientar desenvolvimento.

## Decisões concretas e consequências

- **ID:** D01; **Questão e base:** Ordem dos gates: P1 A UX-001/DB-002 e
  defeitos B2; **Alternativas e efeito:** Resolver decisão informada/progresso
  de jobs antes de ampliar operação; definir sequência com bloqueios de
  cancelamento e revisão; **Quem precisa participar:** Responsável, escala,
  backend/banco; **Prova futura:** AC-X09 e aceites B1 de decisão; B2 não
  autoriza lançamento

- **ID:** D02; **Questão e base:** Desistir de 8 não adquiridos após
  receber2deCOM10; B2-001/O02; **Alternativas e efeito:** Dispensa por linha com
  motivo; ou revisão remanescente com nova aprovação; manter adquirido/recebido
  intocados; **Quem precisa participar:** Família, aprovador de compra; **Prova
  futura:** AC-B2-001; previsão cai8, estoque continua2

- **ID:** D03; **Questão e base:** Desacordo de cancelamento ENT; B2-002/O03;
  **Alternativas e efeito:** Recusa pelo recebedor; retirada pelo solicitante;
  ou ambos com regras de concorrência e estado de retorno; **Quem precisa
  participar:** Família e profissional recebedor; **Prova futura:**
  AC-B2-002/003/004; sem estorno unilateral

- **ID:** D04; **Questão e base:** Quem assume restante após desligamento;
  B2-015/O07; **Alternativas e efeito:** Inventário/tarefas de domínio; termo de
  transferência futura; conciliação excepcional por pessoas distintas; **Quem
  precisa participar:** Família, admin, supervisão, profissional substituto;
  **Prova futura:** Revogar imediatamente; história e outro paciente intactos;
  AC-B2-015

- **ID:** D05; **Questão e base:** Inativar com saldo; B2-007/O12;
  **Alternativas e efeito:** Impedir até destinar; estado de esgotamento; ou
  reativação explícita com aviso/procedimento; **Quem precisa participar:**
  Família, admin catálogo, equipe; **Prova futura:** AC-B2-007; zero baixa
  automática; fato físico identificado

- **ID:** D06; **Questão e base:** Independência de revisão BAL; B2-009;
  **Alternativas e efeito:** Uniformizar contador/revisor distinto em ambos
  regimes; qualquer exceção precisa política explícita e explicação; **Quem
  precisa participar:** Família/supervisão/responsável; **Prova futura:**
  AC-B2-009; contador real de cada versão não herda aprovação

- **ID:** D07; **Questão e base:** Quantidade de consumo só textual; B2-010/O05;
  **Alternativas e efeito:** Exigir estrutura ao relatar consumo; ou complemento
  versionado; ou relato substituto ligado ao original; **Quem precisa
  participar:** Relator e confirmador; **Prova futura:** AC-B2-010; sem
  interpretação automática de texto como débito

- **ID:** D08; **Questão e base:** Consumo já decidido e correção posterior;
  B2-011; **Alternativas e efeito:** Retry igual recupera; oposto conflita; se
  fato anterior errado, compensação separada com autoridade/origem; **Quem
  precisa participar:** Família, confirmador, domínio de estoque; **Prova
  futura:** AC-B2-011; feedback não declara rejeição inexistente

- **ID:** D09; **Questão e base:** Troca de pessoa durante reconto; B2-014/O06;
  **Alternativas e efeito:** Aviso/tarefa ao revisor com assign_recount
  existente; ou transferência automática somente em casos definidos; **Quem
  precisa participar:** Gestor, contador, revisor; **Prova futura:** AC-B2-014;
  sem intervalo invisível nem assinatura herdada

- **ID:** D10; **Questão e base:** Pedido de adiamento obsoleto; B2-012;
  **Alternativas e efeito:** Encerrar como stale automaticamente com motivo; ou
  permitir recusa segura; aprovação antiga continua proibida; **Quem precisa
  participar:** Família/gestor; **Prova futura:** AC-B2-012; prazo original
  permanece até decisão legítima

- **ID:** D11; **Questão e base:** Série proposta encerrada; B2-013;
  **Alternativas e efeito:** Recusar aprovação terminal; ou publicar somente
  parcela anterior ao corte se houver necessidade real; **Quem precisa
  participar:** Gestor de escala; **Prova futura:** AC-B2-013; nenhuma
  republicação futura após corte

- **ID:** D12; **Questão e base:** Reservas de anexo; B2-016/O13; **Alternativas
  e efeito:** Prazo de abandono, consulta e cancelamento pelo titular; ou
  expiração de serviço com retenção de metadados; **Quem precisa participar:**
  Responsável, Storage/backend, operador móvel; **Prova futura:** AC-B2-016;
  upload ativo/ready protegidos; B1-ERR-001 tratado em conjunto

- **ID:** D13; **Questão e base:** Fila e consulta antiga; B2-003/017/O04;
  **Alternativas e efeito:** Completar paginação/detalhe e filtros existentes
  antes de nova central; definir ordenação e triagem de bloqueados; **Quem
  precisa participar:** Família, profissional, revisor; **Prova futura:**
  AC-B2-003/017; alvo individual alcançável sem depender da janela

- **ID:** D14; **Questão e base:** Embalagem e origem de movimento;
  B2-006/008/O08/O09; **Alternativas e efeito:** Snapshot opcional quando
  apresentação usada; links autorizados e rótulos por origem; entrada base
  continua; **Quem precisa participar:** Família, equipe, catálogo; **Prova
  futura:** AC-B2-006/008; sem conversão retroativa ou vazamento de COM

- **ID:** D15; **Questão e base:** Preparação e contingência inicial; O01/O19;
  **Alternativas e efeito:** Primeiro roteiro/lista de links e responsável
  humano; depois recursos adicionais se estudo provar necessidade; **Quem
  precisa participar:** Primeira família, equipe, admin, continuidade; **Prova
  futura:** Primeiro ciclo acompanhado; reconciliação de ficha física; restore
  integral autorizado

- **ID:** D16; **Questão e base:** Hipóteses adicionais O16/O17/O18/O20;
  **Alternativas e efeito:** Validar listas recorrentes, lotes, visão
  multipaciente e duplicatas; abandonar se custo/risco superar benefício; **Quem
  precisa participar:** Usuários dos públicos específicos; **Prova futura:**
  Métricas do catálogo12; nenhuma obrigação genérica de novo módulo

- **ID:** D17; **Questão e base:** Suficiência após aceite pequeno; O11;
  **Alternativas e efeito:** Explicar regra atual e oferecer novaREQjustificada;
  declarar necessidade remanescente só se família precisar; **Quem precisa
  participar:** Família e emissor REQ; **Prova futura:** Sem campo quantidade
  solicitada; ciência/atendimento distintos

## O que não precisa de reinvenção

Reaproveitamento por requisitionId já existe; O10 foi descartada como capacidade
genérica nova. Estoque familiar avulso já permite abertura e ajustes motivados.
Reconto formal, reatribuição de ENT sem aceite, arquivo manual motivado,
consulta
histórica por versão e retry da mesma intenção funcionaram. Aprimoramento deve
preservar esses caminhos e não substituí-los por abstrações sem consumidor.

Lacunas não autorizam fusões silenciosas: compra/entrega, expedição/aceite,
ciência/atendimento, relato/débito, contagem/consumo, agenda/presença,
global/local.
O custo humano de escrever o mesmo dado pode ser reduzido reaproveitando
seleção,
mas nenhuma autorização ou quantidade pode ser inferida de forma indevida.

## Sequência sugerida para avaliar, sem executar C

Primeiro confirmar escopo dos gates herdados e fatos operacionais dos oito
defeitos. Depois escolher saídas dos processos incompletos: desistência COM,
discordância ENT, inativação, complemento de consumo e sucessão. Em seguida
avaliar
oportunidades menores de consulta, proveniência e preparação. Capacidades novas
dependem de necessidade demonstrada; não precisam bloquear diagnóstico nem
virar condição genérica de primeiro uso.

Para cada decisão futura, registrar escolhida/adiada/descartada, justificativa,
público, regra preservada, dependências e aceite correspondente. Prioridade
operacional e esforço técnico são dimensões diferentes. Não foram estimados
prazos, orçamento ou ganhos percentuais sem baseline humano.

## Material pronto para revisão

- [Executivo](16_GROUP_B2_EXECUTIVE_ASSESSMENT.md): comportamento e implicações.
- [Registro13](13_FINDINGS_MASTER.md):17 achados com 29 atributos no CSV.
- [Catálogo12](12_NEW_FUNCTIONALITIES_AND_PROCESS_GAPS.md):20 alternativas, uma
  descartada.
- [Aceites14](14_ACCEPTANCE_SCENARIOS.md):17 por achado e11sequências de
  preservação.
- [Exceções10](10_CROSS_PROCESS_EXCEPTIONS.md):21 situações com estados e
  recuperação.
- [Dependências15](15_CROSS_GROUP_DEPENDENCIES.md): outros grupos e não
  verificados.

Limite final: B2 documenta e transfere. B3, Fase C, Fase D, deploy, PR, merge e
qualquer
operação remota exigem autorização futura correspondente. Esta entrega não as
inicia nem substitui validação humana ou decisão de liberação do produto.
