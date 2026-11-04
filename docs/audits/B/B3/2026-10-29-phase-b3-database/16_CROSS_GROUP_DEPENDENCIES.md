# Dependências entre grupos e garantias compartilhadas

- **B3-001/025** — Interface B1: Pendência/erro/última atualização; Processo B2:
  Ciência, arquivo, automação; Dependência técnica/operacional: Progresso,
  backlog, health e reparo de legado; Preservar: Sem lembrete/arquivo duplicado.

- **B3-002/005** — Interface B1: Erro recuperável, motivo e origem; Processo B2:
  ENT/consumo/correção; Dependência técnica/operacional: Fato físico e
  referência do ledger; Preservar: Consumo anterior não é debitado novamente.

- **B3-003/008/009** — Interface B1: Comparação de proposta e responsável;
  Processo B2: Agenda, adiamento, reconto; Dependência técnica/operacional:
  Corte, prazo, contador e obrigação; Preservar: Histórico de presença/contagem
  e revisão distinta.

- **B3-004/022** — Interface B1: Retomada de upload, acesso revogado; Processo
  B2: Evidência e retenção; Dependência técnica/operacional: Reserva, bytes,
  TTL, governança; Preservar: Ready e versões PDF existentes.

- **B3-006** — Interface B1: Explicar quem conta/revisa; Processo B2: BAL
  legado/agendado; Dependência técnica/operacional: Identidade efetiva e
  política de revisão; Preservar: Aprovações ligadas à versão correta.

- **B3-007/017** — Interface B1: Feedback de decisão/conflito; Processo B2:
  Confirmar/rejeitar consumo; Dependência técnica/operacional: Retorno tipado e
  entrada válida; Preservar: Primeira decisão e débito único.

- **B3-010** — Interface B1: Encerramento do remanescente; Processo B2: Compra
  parcial; Dependência técnica/operacional: Aprovação versus fato físico;
  Preservar: Recebimento validado real.

- **B3-011/012/023** — Interface B1: Navegação a registro antigo; Processo B2:
  Pendências/auditoria; Dependência técnica/operacional: Paginação, filtro e
  ordem estável; Preservar: Escopo e erro distintos de vazio.

- **B3-013** — Interface B1: Atualização de contexto/cache; Processo B2:
  Governança/perfil; Dependência técnica/operacional: Destinatários de
  invalidação; Preservar: Sem payload privado em Realtime.

- **B3-014** — Interface B1: Recuperação e comunicação; Processo B2: Operação
  após incidente; Dependência técnica/operacional: Auth, bytes, config, Vault,
  jobs e RPO/RTO; Preservar: Sem reenvio cego nem perda de história.

- **B3-015/024** — Interface B1: Desempenho percebido; Processo B2: Documentos
  longos/estoque; Dependência técnica/operacional: Volume, SLO, locks,
  compressão e render; Preservar: Exatidão, autorização e verificabilidade.

- **B3-016** — Interface B1: Estado de entrega e retry; Processo B2: Notificação
  externa; Dependência técnica/operacional: Provedor, lease, budget, uncertain;
  Preservar: Seen_at separado de entrega externa.

- **B3-018/019** — Interface B1: Entrada/unidade/apresentação; Processo B2:
  Catálogo e movimentação; Dependência técnica/operacional: Validação original
  antes de coerção; Preservar: Unidade histórica e quantidade exata.

- **B3-020/021** — Interface B1: Logout, contexto e acesso encerrado; Processo
  B2: Revogação/identidade; Dependência técnica/operacional: Sessão real,
  Storage e ordem de locks; Preservar: Usuário legítimo e papéis por paciente.

UX-001 da Fase A continua portão externo a B3: a aprovação informada de mudança
de escala não foi corrigida. Regras sólidas no banco não substituem comparação
clara para a pessoa que decide. Da mesma forma, feedback visual correto não
corrige um comando SQL que retorna sucesso sem aplicar a intenção.

Há relações que pedem decisão conjunta, sem reunir causas independentes num
achado genérico: consulta antiga de consumo e consulta de auditoria têm duas
rotas distintas; nulo de decisão e nulo de paginação têm efeitos diferentes;
reserva abandonada e URL emitida tratam momentos diferentes do acesso.

Uma futura correção deve percorrer interface→API→sessão→RPC→trigger→estado→
evento/ledger→resposta. Ajustar só formulário ou wrapper pode deixar o contrato
direto exposto. Ajustar só banco pode deixar mensagem de sucesso errada ou
pendência inalcançável. A [matriz de
aceitação](15_ACCEPTANCE_AND_REGRESSION_MATRIX.md)
liga cada causa à regressão e ao que não poderá ser perdido.

Não se iniciou B4 nem se decidiu/implementou C/D. Integração externa,
dispositivo
físico, uso assistencial e restore continuam tarefas de validação autorizável,
sem serem substituídas pelos cenários locais.
