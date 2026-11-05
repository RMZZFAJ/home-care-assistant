# Escalas, plantões e responsabilidades

P-SCH-01–06 e relações com BAL; T066–075. Doze cenários em
[B2.6](evidence/b26-results.json), com Auth real, RPC e persistência. Leitura de
schedule-console/forms, time.ts, API/schema, schedule_command e guards BAL.
Programação não comprova presença; nenhum teste foi chamado de comparecimento.

## Objetivo, atores e estados

Tipo define horário civil e duração para novas séries. Série materializa
ocorrências: uma vez, dias da semana ou ciclo de trabalho/descanso. Ocorrência
conserva intervalo UTC, fuso, pessoa, versão, estado e exceção. Alteração de
tipo
não retima ocorrências já publicadas. Validade limitada e materialização
transacional evitam programação parcial diante de conflito.

- **Intenção:** Manter tipos; **Quem inicia:** schedule.types.manage;
  **Estado/fato:** Tipo ativo/inativo e versão; **Quem conclui e como
  recuperar:** Gestor; novas séries usam nova definição

- **Intenção:** Programar equipe; **Quem inicia:** schedule.manage.team;
  **Estado/fato:** Série/ocorrências published; **Quem conclui e como
  recuperar:** Gestor; conflito desfaz toda gravação

- **Intenção:** Programar a si; **Quem inicia:** manage.own, quando concedido;
  **Estado/fato:** Publicação própria; **Quem conclui e como recuperar:** Não
  concede gestão de terceiros

- **Intenção:** Propor série; **Quem inicia:** schedule.propose para a própria
  pessoa; **Estado/fato:** proposed, sem ocupar agenda publicada; **Quem conclui
  e como recuperar:** Gestor aprova/rejeita com versão

- **Intenção:** Propor alteração; **Quem inicia:** Proponente autorizado sobre
  ocorrência publicada; **Estado/fato:** pending, com shift_version original;
  **Quem conclui e como recuperar:** Gestor decide; aprovação revalida
  ocorrência

- **Intenção:** Substituir/alterar; **Quem inicia:** Gestão própria/equipe
  conforme escopo; **Estado/fato:** Nova versão e is_exception; **Quem conclui e
  como recuperar:** Autoridade real; sem sobreposição

- **Intenção:** Cancelar ocorrência; **Quem inicia:** Gestor; motivo;
  **Estado/fato:** cancelled; **Quem conclui e como recuperar:** História
  mantida; janela BAL pode exigir decisão familiar antes

- **Intenção:** Encerrar série; **Quem inicia:** Gestor; data no fuso; motivo;
  versão; **Estado/fato:** ended_on e cancelamento após corte; **Quem conclui e
  como recuperar:** Nova série substituta quando necessária

Série conserva status published mesmo após corte; ended_on é dimensão própria.
Não tratar o nome do estado agregado como prova de que todas ocorrências ainda
estão ativas. Propostas antigas também têm estado independente de ocorrências.
Ausência é comunicada por motivo/cancelamento/substituição; não há check-in/out
nem atestado de presença. Adicionar esse controle exige necessidade real e
proporcionalidade, sem transformar uma agenda correta em sistema clínico.

## Intervalos, noite, fusos e conflitos

B26-01 propôs ciclo noturno 12×36: três plantões de 12 horas, com 48 horas entre
inícios,19h em São Paulo representadas por 22 h UTC. O fim ocorreu no dia civil
seguinte. Retry recuperou a mesma série; profissional não aprovou a própria
proposta sem capacidade de gestão. B26-02 recusou sobreposição com 23 P01 e não
deixou série parcial; plantão seguinte iniciando exatamente no fim foi
permitido.

Programação semanal conserva horário civil no fuso; ciclos conservam horas
corridas desde a âncora. O conversor cliente usa o fuso do plantão e rejeita
horário civil inexistente. Não foram executadas todas as mudanças de horário
sazonal ou zonas. B26-12 criou segundo paciente fictício com o mesmo
profissional:
conflito entre residências devolveu só schedule overlap, sem agenda ou nome do
outro contexto. Sessão no contexto principal não leu ocorrências do segundo,
embora o usuário tivesse outro vínculo legítimo.

## Propostas, decisões e corte

B26-03 confirmou que propor alteração pontual não muda o plantão. Após decisão
autorizada, o intervalo mudou e a exceção ficou preservada. B26-04 criou
proposta,
alterou legitimamente a ocorrência depois e tentou aprovar a intenção antiga:
stale document, sem sobrescrita. Rejeitar explicitamente a proposta antiga ainda
foi possível. Isso contrasta com o adiamento BAL obsoleto de B2-012; não
generalizar o defeito de um domínio para o outro.

O problema de decisão informada **A-UX-001/B1-UX-001 permanece**. A tela de
propostas pontuais mostra motivo e um diálogo genérico, omitindo pessoa, período
atual/proposto, fuso e efeitos BAL antes de confirmar. B26-03 examinou o
processo
e código, não fez nova renderização desse defeito já comprovado. Autorizar
tecnicamente a aprovação não supre a informação necessária à pessoa.

B26-05 encerrou série publicada com corte e conservou primeiro plantão,
cancelando
dois posteriores. **B2-013 revalida A-DB-003**, agora com execução local:
B26-06 propôs outra série, encerrou a partir da segunda ocorrência e aprovou a
versão atual da proposta depois. Os dois plantões cancelados voltaram a
published, embora ended_on continuasse preenchido. Não foi preciso versão velha.

A sequência é aceita por API/RPC; a UI atual só oferece Encerrar série para
série published, portanto o cenário não foi apresentado como cliques do fluxo
visual atual. Isso restringe incidência, mas mantém a contradição de contrato:
um corte válido perde efeito quando chega outra decisão legítima da proposta.
Consequências possíveis são agenda restaurada, expectativa de cobertura e
futuras
atribuições BAL sobre programação que o gestor havia encerrado. B2 não afirmou
ter criado essas obrigações derivadas nem comprovado presença indevida.

AC-B2-013: aprovação posterior deve respeitar corte ou recusar a série
encerrada;
nenhuma ocorrência após data efetiva volta a publicada; conservar motivo, antes/
depois e tentativas. Testar segunda aprovação, rejeição posterior, substituta e
concorrência. Não apagar cancelled nem impedir todo encerramento de série como
atalho. A apresentação P1 continua dependência separada da transição P2.

## Passagem de responsabilidade durante BAL

B26-08 recusou deslocar horário de plantão com reconto ativo: gestão de escala
não autoriza adiamento familiar. Documento e atribuição não mudaram. Trocar
apenas a pessoa, conservando início/fim, é uma operação diferente.

**B2-014:** B26-09 substituiu pessoa no mesmo intervalo de um **reconto formal
em ciclo já contado**. A atribuição anterior virou invalidated; refresh não
criou sucessor. O documento continuou submitted. O processamento sai do ciclo
counted depois de invalidar e não aplica a transferência automática do ciclo
open. Não se generaliza essa conclusão ao draft da primeira contagem, coberto
por outra lógica e testes históricos.

Recuperação existe: B26-10 fez o revisor designar novo reconto no mesmo plantão
substituído. O contador anterior foi recusado; substituto executou nova versão;
created_by original permaneceu e balanceContext passou a indicar quem contou
de fato. A questão operacional é tornar essa necessidade explícita na troca
de pessoa e atribuí-la a um revisor, evitando janela sem contador executável.
Uma transferência automática não é requisito obrigatório: alternativa segura
é aviso/tarefa de nova designação familiar ou de supervisão competente.

B26-11 concluiu revisão por pessoas distintas. A contagem zero diante de
referência um reduziu estoque de equipe um→zero como ajuste BAL; métricas de
consumo permaneceram idênticas. Não se inventou relato de uso para limpar a
diferença. A cadeia conservou contadora original, recontagens, substituto e
aprovações, cobrindo agenda→atribuição→contagem→revisão→ledger.

## Segunda passada, simplificação e limites

Foram confrontados status agregado/corte, proposta/ocorrência e ciclo open/
counted. Essa segunda distinção revelou B2-014 e impediu afirmar transferência
universal. Mudança do tipo não alterou intervalos anteriores em B26-07; não
recomendar congelar todos os tipos apenas por haver histórico. É útil mostrar
antes/depois, pessoa que deve agir e o efeito no BAL no resumo existente, sem
duplicar a agenda ou exigir confirmação em cada consulta.

Propostas sem prazo de expiração podem ficar pendentes; rejeição e versão já
oferecem parte da gestão. Prazo/triagem só devem ser novos requisitos após
definir responsáveis e frequência. Profissional revogado não deve continuar
elegível só porque aparece em escala antiga; desligamento segue B2.7.

Não verificados: presença humana, ausência em residência real, horário sazonal
completo, carga de366 dias com muitos profissionais, todas corridas entre
aprovação/corte/substituição e dispositivos físicos. Nenhum teste alterou
escala de pessoa real ou operou em banco remoto. Aceites futuros devem preservar
privacidade de conflito, intervalos adjacentes, idempotência e história.
