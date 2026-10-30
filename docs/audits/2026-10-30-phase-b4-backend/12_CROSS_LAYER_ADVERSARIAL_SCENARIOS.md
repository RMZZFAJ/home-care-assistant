# Investigação adversarial transversal

## Segunda passagem: duas causas novas

**B4-012, P2.** Relato novo deveria aparecer após invalidação confirmada sem
trocar paciente ou permissões. B412-01 abriu ConsumptionConsole em Chromium
local, criou um relato sintético por HTTP e comprovou avanço de
workspace_revision.
Injetou o evento `hca:data-changed` explicitamente e observou nova GET de
contexto.
Houve **zero novas GETs de consumo** e relato invisível; reload completo exibiu
o fato persistido. Não houve teste de entrega Realtime do provedor ou
participante.

Causa: `WorkspaceProvider` reutiliza a linha de paciente igual; o effect de
Reports depende de context.patient/attempt, sem assinatura da revisão. Polling
do backend não resolve um consumidor que ignora o sinal. É causa diferente de
B3-013, em que a revisão nem avança. A hipótese inicial de propagação automática
do pai foi corrigida por esta contraprova, sem repetir a auditoria B1.
Evidência: [browser/HTTP/revisão](evidence/b412-freshness-results.json).

**B4-013, P2.** Administração global cria paciente com `isActive=false` e
administrador inicial confirmado. API aceita a entrada, mas omite esse campo
ao chamar `create_patient_with_administrator`; a RPC passa true fixo. B412-02
recebeu 200 com is_active=true e confirmou o mesmo estado no banco.
O formulário oferece checkbox “Paciente ativo”, portanto a intenção é real.
A atualização local posterior para false funcionou e conservou o administrador;
o paciente fictício termina inativo. Nenhum terceiro ganhou autoridade.
Evidência: [HTTP e persistência](evidence/b412-create-state-results.json).

Criar sempre ativo pode ser uma decisão futura de produto, mas nesse caso o
contrato deve recusar/remover a opção de inatividade na criação. Aceitar false
e executar true silenciosamente é o defeito. Não se recomenda contornar a
criação explícita do administrador inicial.

## Matriz transversal selecionada

- **Resposta REQ perdida, mesma intenção** — Resultado/evidência: B44-06:
  mesmo ID, conteúdo alterado409; Consequência, recuperação e contraprova:
  Ledger não duplicado; recuperar chave, sem confiar em rótulo cliente.
- **Proposta repetida com UUID nova** — Resultado/evidência: B44-02 e B45-01:
  duas pending, corte50; Consequência, recuperação e contraprova: Fila oculta
  pode crescer; mesma chave recupera ID; não dupla aplicação.
- **Aprovação salva, link perdido** — Resultado/evidência: B44-03–04: retry200
  sem URL, um convite; Consequência, recuperação e contraprova: Reemissão
  manual funciona; não ignorar aceite nem guardar segredo em claro.
- **Revisão confirma, envio falha** — Resultado/evidência: B44-05: draft
  atualizado e409; Consequência, recuperação e contraprova: Resposta precisa
  informar efeito parcial; retry não duplica evento.
- **Número transformado antes do ledger** — Resultado/evidência:
  B43-10:1.0000001→1.000000; Consequência, recuperação e contraprova: String
  equivalente recusada; validar original em API e banco.
- **Troca de paciente com pessoa compartilhada** — Resultado/evidência:
  B42-10–11, B47-03; Consequência, recuperação e contraprova: Seleção real
  necessária; cache não autoriza documento de outro contexto.
- **Janela de revogação em envio** — Resultado/evidência: B49-01 controlado;
  Consequência, recuperação e contraprova: Mensagem ainda chamada após
  cancelamento simulado; complete protege estado; risco externo pendente.
- **Erro interno comunica conflito de produto** — Resultado/evidência: B46-01
  e B3-002; Consequência, recuperação e contraprova: Usuário não resolve
  cancelamento editando apelido; SQL continua em rollback.
- **Mensagem incompatível afeta texto vizinho** — Resultado/evidência:
  B49-02–03 controlados; Consequência, recuperação e contraprova: 200 sem
  ingestão perde recuperação do lote; texto isolado funciona.
- **Invalidação chega, consumidor não consulta** — Resultado/evidência:
  B412-01 real local; Consequência, recuperação e contraprova: Relato
  invisível até reload; revisão SQL avançou, logo causa não é B3-013.
- **Campo de ativação aceito e ignorado** — Resultado/evidência: B412-02 real
  local; Consequência, recuperação e contraprova: Paciente nasce ativo contra
  intenção; atualização posterior funciona.
- **Anexo em duas etapas e PDF histórico** — Resultado/evidência: B47 e
  B3-004/022; Consequência, recuperação e contraprova: Preservar
  chave/hash/versão; não limpar bucket ou prometer revogar cópia.
- **Decisão oposta sem efeito** — Resultado/evidência: B3-007 + API/consumidor
  atuais; Consequência, recuperação e contraprova: 200 não prova nova decisão;
  preservar primeiro débito e informar conflito.
- **Revogação ENT parcial e tarefa sem sucessor** — Resultado/evidência:
  B2-015 + diretório/admin atuais; Consequência, recuperação e contraprova:
  Não reativar automaticamente nem assinar pelo antigo recebedor.

Oito dimensões foram consideradas por risco: caminho normal, erro, recuperação,
autoridade, repetição, concorrência pertinente, consequência persistida e
limite.
Não se executou corrida para toda rota; provas anteriores foram referenciadas
quando suficientes. Tabela não soma cenários novamente nem cria novos IDs de
achado para cada cruzamento de causas já registradas.

## Contraditório e encerramento

Refutados/limitados: toda ausência de hook implicar stale; todo erro expired
virar convite inválido; cache PDF ignorar autoridade; upload PDF concorrente
devolver bytes locais diferentes; admin global conferir poder operacional;
HTTP204 ser falha atual de uma rota; ausência de header provar exploração.
O teste de consumo mostrou por que o contraditório precisa seguir até o
consumidor concreto: o listener existe, mas compartilhamento estrutural muda
o resultado. Nenhuma regressão foi “corrigida” por mudar o oráculo do produto.

Concluída B4.0–B4.12. Próximo é apenas consolidação documental, reconciliação,
preservação e commit/push autorizados. Não se iniciou B5, C ou implementação.
