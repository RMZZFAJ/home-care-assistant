# Continuidade humana e segunda passagem

## Perspectiva da residência e da equipe

- **WhatsApp não chega** — O que a pessoa pode saber/fazer hoje: Documento e
  tarefas continuam no app; regra required mantém aviso interno; Condição
  futura para confiar: Definir quem consulta, prazo e escalonamento; não
  presumir acompanhamento espontâneo.

- **texto enviado não vira relato** — O que a pessoa pode saber/fazer hoje: Em
  contexto ambíguo não há pendência criada; pessoa pode usar app com paciente
  explícito; Condição futura para confiar: B5-006 precisa
  continuação/diagnóstico sem adivinhar paciente.

- **resposta rápida inválida** — O que a pessoa pode saber/fazer hoje: Não
  executa operação; parte das recusas ENT tem registro; Condição futura para
  confiar: Explicação/handoff mínimo, sem expor dados ou aceitar comando
  desconhecido.

- **cancelamento durante envio** — O que a pessoa pode saber/fazer hoje:
  Estado pode ser uncertain; mensagem já aceita não é recolhida; Condição
  futura para confiar: Definir ponto de corte, registrar efeito externo e
  conciliar B4-010/B5-013.

- **profissional não responde** — O que a pessoa pode saber/fazer hoje: ENT
  não vira aceite por silêncio; atribuição BAL e lembrete são fatos distintos;
  Condição futura para confiar: Responsável e prazo aprovados pela operação;
  não inventar presença/culpa.

- **mensagem duplicada** — O que a pessoa pode saber/fazer hoje: Idempotência,
  versão e tokens protegem operações de banco; Condição futura para confiar:
  Conferir resultado antes de repetir operação física; mensagem não é nova
  entrega.

- **documento antigo** — O que a pessoa pode saber/fazer hoje: Evento/versão
  preservados e acesso revalidado; Condição futura para confiar: Texto deve
  deixar claro fato/data corretos; BE-002/B5-004 antes de prometer aviso fiel.

- **Flow pendente com app aberto** — O que a pessoa pode saber/fazer hoje:
  Pode ficar invisível até reload; Condição futura para confiar: B5-010 e
  pendências antigas precisam consulta recuperável, sem depender do sino.

- **canal externo desligado** — O que a pessoa pode saber/fazer hoje:
  REQ/COM/ENT/BAL, ciência e relatos essenciais têm percursos autenticados;
  Condição futura para confiar: Validar esses percursos com família/equipe e
  corrigir bloqueadores anteriores.

Não há decisão de que toda residência deve usar WhatsApp, SMS, Google ou Flow.
Um canal pode permanecer desligado se a promessa de produto e a contingência
forem coerentes. Isso não elimina os defeitos essenciais de processo/banco das
fases anteriores nem concede GO. A fotografia/formulário físico e registro
posterior autorizado podem fazer parte de decisão operacional futura, sem
substituir ledger ou fabricar confirmação de recebimento.

## Contraditório por mecanismo

- Progresso: BAL rotativo funciona no recorte B3; não generalizar starvation
  legado a todos os regimes. Lembrete perdido ao atravessar o dia é risco de
  continuidade legado, não prova de presença omitida ou incidente existente.
- Holds: aprovação de template conhecido libera; problema B5-002 é o estado
  missing-template/infinity sem nome retomável. A prova injetou esse resultado
  em linha nova; não removeu template vigente nem demonstrou falha no registro
  completo normal. Confirmar a ocorrência concreta antes de uma recuperação.
- Transporte: incerteza depois de messages é correta; antes de messages pode
  ser simplificada. Não concluir entrega real a partir de chamada falsa.
- Conteúdo: contagem ENT positiva e filename versionado funcionaram; não
  reescrever todos os templates/PDFs por uma causa de presenter. A correção
  precisa preservar textos corretos, modalidade de ciência e eventos antigos.
- Entrada: texto válido isolado funciona e status desconhecido é negado.
  Perda do lote e falta de encaminhamento são causas distintas; desconhecido
  nunca deve ser promovido a comando para “aproveitar” o lote.
- Flows: prazo/revogação, revisão do autor e ausência de débito automático
  foram demonstrados; ocorrência bearer não é recebimento ENT. Corpo estranho
  gerou sugestão inválida, sem conferir autoridade física ou outro paciente.
- Atualização: contexto e sino reagiram; FlowReviews não. Troca de paciente
  remontou e limpou seleção, refutando a hipótese de mistura persistente.
- Identidade: verificação atual de phone cancela contato antigo divergente;
  recuperação Auth→registro ainda tem janela. Não declarar SMS homologado
  pelo cadastro administrativo de telefone fictício.
- Retry: callback novo funciona com referência limpa; referência de tentativa
  anterior é a causa demonstrada. Não trocar correlação por reenvio cego.
- Operação: painel, paginação, retry auditado e confirmação de uncertain já
  existem. Melhorar identificação e alertas não exige reinventar essas peças.

## O que permanece dependente de pessoas/provedores

Entendimento das mensagens, prazo aceitável, quem assume incidentes, conferência
física, consentimento de governança, dispositivos reais e contingência familiar
não foram certificados. Meta, SMTP, SMS, OAuth, callbacks e latências reais
continuam sem homologação desta fase. Não houve restauração integral nem teste
em produção. Provas locais só valem para os contratos/cenários indicados.

Nova passagem reconciliou gatilhos realmente ativos em
[active-topology](evidence/active-topology.json): 25 eventos externos têm
suporte
SQL; outbox atual vem de document_events. A função antiga
enqueue_requisition_notifications não tem gatilho ativo identificado e fica
como legado no inventário, sem tratá-la como cadeia corrente ou removê-la.

Os achados finais registram causa, contraprova, impacto, recuperação, limite e
critério futuro individualmente. O diagnóstico termina aqui; decisões C,
correções D, B6 e habilitação externa dependem de nova autorização.
