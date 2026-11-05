# Registro mestre de achados B3

25 registros: 0 P0, 1 P1, 19 P2, 5 P3.

16 recortes herdados das fases anteriores; nove observações/mecanismos novos B3,
incluindo riscos e decisões de governança. Não são 25 vulnerabilidades novas.
B3-024 amplia o tema BE-006 por mecanismo SQL distinto. Natureza, alcance e
contraprova prevalecem sobre rótulos de execução.

[CSV com 32 campos](14_FINDINGS_MASTER.csv), [índice dos 94
cenários](evidence/SCENARIO_INDEX.csv),
[manifestações](evidence/FINDING_MANIFESTATIONS.csv), [aceitação
futura](15_ACCEPTANCE_AND_REGRESSION_MATRIX.md).

P0 não demonstrado não equivale a ausência de vulnerabilidade. O único P1 deste
recorte é DB-002 já conhecido. O NO-GO anterior continua: UX-001 e demais
portões de liberação fora de B3 não foram corrigidos. Nenhuma correção foi
executada.

## B3-001 — Jobs/lifecycle

**Título:** Candidatos terminais podem impedir indefinidamente o progresso de
REQ

**Domínio:** Jobs/lifecycle

**Prioridade:** P1

**Natureza:** DEFECT_CONFIRMED

**Estado:** OPEN

**Confiança:** CONFIRMED_LOCAL

**Objeto afetado:** v4_lifecycle_schedule; requisition_lifecycle;
run_operational_schedule

**Processo afetado:** Ciência/lembrete/arquivamento multipaciente

**Contrato esperado:** Uma requisição elegível avança mesmo quando outros
candidatos estão cancelados.

**Comportamento observado:** 25 pacientes terminais ou100 REQs terminais de um
paciente ocupam o lote em três execuções; alvo elegível só avança no controle.

**Causa sustentada:** LIMIT aplicado antes de eliminar candidatos que o
processamento pula, sem avanço persistente nesse recorte.

**Evidência:** evidence/b39-results.json#B39-01; B39-02;
09_SCHEDULERS_JOBS_AND_MULTIPATIENT_PROGRESS.md

**Cenário reproduzido:** B39-01; B39-02

**Resultado persistido:** Alvo com 0 eventos nas três execuções; 1 após retirar
somente novos bloqueadores; tudo rollback.

**Abrangência:** Contrato vigente local; produto37cb7f85; dados fictícios B3;
remoto não verificado

**Limitações:** Simulação SQL de contexto service; não HTTP Auth nem fila de
produção.

**Contraprovas:** BAL rotativo alcançou101 regimes e preservou cursor no
rollback; problema não é de todo scheduler.

**Consequência operacional:** Lembrete ou fechamento legítimo pode ficar sem
processamento enquanto health registra execução.

**Consequência de integridade:** Atomicidade preservada, mas falta progresso
entre pacientes; ausência de evento não significa ausência de trabalho.

**Consequência de autorização:** Não demonstrou acesso indevido; seleção interna
prejudica pacientes autorizados.

**Relação A/B1/B2:** A DB-002; B2 acompanha bloqueio; B3 acrescenta limite
interno100 e repetição.

**Alternativas futuras:** Filtrar estados terminais antes do lote ou manter
cursor/resultado de candidato com retomada e deduplicação.

**Riscos da correção:** Pular trabalho pendente, alterar justiça da fila ou
gerar lembrete/arquivo duplicado.

**Legados potencialmente afetados:** REQs canceladas com next_reminder_at
vencido e backlog legítimo posterior; não apagar história.

**Dependências:** Política ciência/arquivo; DB-006; observabilidade e scheduler
health.

**Critérios de aceitação:** Com 25/100 bloqueadores e vários alvos, execuções
limitadas alcançam todos; cada lembrete elegível aparece uma vez; falha não
perde posição.

**Regressões obrigatórias:** Ciência dispensada/obrigatória; arquivo
manual/automático; BAL cursor; repetição e rollback pós-lote.

**Decisões de produto:** Definir prazo máximo de progresso e tratamento
auditável de trabalho terminal.

**Validação humana/externa:** Sem aceite humano ou homologação externa.
Evidência local não certifica produção.

**Justificativa de prioridade:** P1: automação essencial multipaciente pode
deixar trabalho válido sem progresso por tempo indefinido.

**Origem:** A_B2_REVALIDATED_AND_EXTENDED

## B3-002 — Documentos/estoque

**Título:** Cancelamento ENT com consumo real confirmado falha no SQL de
reconciliação

**Domínio:** Documentos/estoque

**Prioridade:** P2

**Natureza:** DEFECT_CONFIRMED

**Estado:** OPEN

**Confiança:** CONFIRMED_LOCAL

**Objeto afetado:** audited_legacy_supply_command consent_cancel

**Processo afetado:** Conciliar devolução e consumo anterior de entrega aceita

**Contrato esperado:** Retornar a parcela física e reconhecer consumo já
registrado, sem novo débito.

**Comportamento observado:** Caminho de consumedQuantity positivo retorna42702
por alias e ambíguo.

**Causa sustentada:** Variável/alias e no ramo de soma de eventos impede
resolver referência SQL.

**Evidência:** evidence/b36-results.json#B36-05;
06_DOCUMENT_LIFECYCLE_AND_STATE_INTEGRITY.md

**Cenário reproduzido:** B36-05

**Resultado persistido:** Versão, eventos e ledger não mudaram após erro;
cancellation_pending permaneceu.

**Abrangência:** Contrato vigente local; produto37cb7f85; dados fictícios B3;
remoto não verificado

**Limitações:** Defeito no ramo de consumo positivo; cancelamentos sem esse ramo
funcionaram.

**Contraprovas:** Cancelamento/devolução sem consumo e rollback da última linha
conservam custódias.

**Consequência operacional:** Destinatário não conclui uma reconciliação
legítima; materiais/processo ficam pendentes.

**Consequência de integridade:** Banco evita estado parcial; correção não pode
inventar ou debitar consumo novamente.

**Consequência de autorização:** Ator correto é exigido; não houve consentimento
por terceiro.

**Relação A/B1/B2:** A DB-001; B2-004; mesma causa revalidada.

**Alternativas futuras:** Desambiguar nomes em migration futura e manter teste
do domínio físico consumo/devolução.

**Riscos da correção:** Somar consumo errado, estornar quantidade consumida ou
repetir movimento de devolução.

**Legados potencialmente afetados:** ENTs cancellation_pending com aceite e
consumo anterior confirmado; preservar suas versões.

**Dependências:** Tratamento de consumo anterior e contratos de reabertura REQ.

**Critérios de aceitação:** Entrega aceita com parte consumida permite
consentimento coerente; retorno físico apenas uma vez; consumo anterior
permanece único.

**Regressões obrigatórias:** Sem consumo, parcial, total, duplicação, versão
antiga, estoque alterado e REQ arquivada/reaberta.

**Decisões de produto:** Ratificar o significado da reconciliação, sem
substituir consumo real por declaração inventada.

**Validação humana/externa:** Sem aceite humano ou homologação externa.
Evidência local não certifica produção.

**Justificativa de prioridade:** P2: impede conclusão de processo legítimo, mas
rollback impede corrupção parcial.

**Origem:** A_B2_REVALIDATED

## B3-003 — Escalas/BAL

**Título:** Aprovação posterior pode republicar plantões além do encerramento da
série

**Domínio:** Escalas/BAL

**Prioridade:** P2

**Natureza:** DEFECT_CONFIRMED

**Estado:** OPEN

**Confiança:** CONFIRMED_LOCAL

**Objeto afetado:** schedule_command approve_change/end_series;
scheduled_shifts; bal_assign

**Processo afetado:** Encerrar recorrência com proposta pendente

**Contrato esperado:** Encerrar série mantém o corte mesmo se proposta anterior
receber decisão.

**Comportamento observado:** Aprovação republicou três ocorrências além do
corte; simulação futura gerou BAL sobre ocorrência republicada.

**Causa sustentada:** Decisão aplica proposta guardada sem revalidar o corte
vigente da série na materialização.

**Evidência:** evidence/b37-results.json#B37-03;
evidence/b37c-results.json#B37-11

**Cenário reproduzido:** B37-03; B37-11

**Resultado persistido:** Ocorrências publicadas apesar do cutoff; atribuição
BAL derivada observada em rollback.

**Abrangência:** Contrato vigente local; produto37cb7f85; dados fictícios B3;
remoto não verificado

**Limitações:** BAL futuro é simulação temporal local, não presença ou jornada
real.

**Contraprovas:** Exclusão temporal global e guard de mudança de prazo BAL
continuam ativos.

**Consequência operacional:** Profissional pode reaparecer em plantão encerrado
e receber responsabilidade indevida.

**Consequência de integridade:** Fonte agenda contradiz corte; regras derivadas
podem propagar essa contradição.

**Consequência de autorização:** Revisor autorizado; falta consistência do
estado, não permissão global indevida.

**Relação A/B1/B2:** A DB-003; B2-013; B3 acrescenta derivação BAL.

**Alternativas futuras:** Revalidar cutoff na decisão; invalidar/recalcular
proposta ou restringir materialização às ocorrências válidas.

**Riscos da correção:** Apagar plantões passados, presença ou atribuições já
contadas; perder proposta original.

**Legados potencialmente afetados:** Séries encerradas com proposta
pendente/aprovada; reconciliar ocorrências por decisão, sem exclusão cega.

**Dependências:** Versão da série; obrigações BAL; UX-001 da aprovação
informada.

**Critérios de aceitação:** Encerrar após proposta e depois aprovar não publica
ocorrência fora do corte nem cria BAL derivado dela.

**Regressões obrigatórias:** Proposta recusada, parcial, recorrência normal,
limite de fuso, conflito global e contagem passada.

**Decisões de produto:** Decidir se proposta vencida é recusada ou reapresentada
com comparação clara.

**Validação humana/externa:** Sem aceite humano ou homologação externa.
Evidência local não certifica produção.

**Justificativa de prioridade:** P2: agenda e responsabilidade assistencial
podem divergir de decisão de encerramento.

**Origem:** A_B2_REVALIDATED_AND_EXTENDED

## B3-004 — Storage/anexos

**Título:** Reservas abandonadas ocupam permanentemente a capacidade de anexos

**Domínio:** Storage/anexos

**Prioridade:** P2

**Natureza:** DEFECT_CONFIRMED

**Estado:** OPEN

**Confiança:** CONFIRMED_LOCAL

**Objeto afetado:** reserve_attachment; attachments quarantine

**Processo afetado:** Enviar evidências e recuperar upload interrompido

**Contrato esperado:** Reserva válida protege upload; abandono possui
recuperação sem eliminar arquivos prontos.

**Comportamento observado:** Dez quarantine sem objeto esgotam o limite;
concorrência pela última vaga concede somente uma.

**Causa sustentada:** Contagem inclui reservas sem expiração/abandono e sem
percurso de recuperação de capacidade.

**Evidência:** evidence/b310-results.json#B310-05;
10_STORAGE_ATTACHMENTS_AND_RETENTION.md

**Cenário reproduzido:** B310-05

**Resultado persistido:** 10 quarantine, 0 ready, 0 objetos na fixture; nenhuma
limpeza executada.

**Abrangência:** Contrato vigente local; produto37cb7f85; dados fictícios B3;
remoto não verificado

**Limitações:** Reserva explícita sem bytes; não injetou queda física de
conexão.

**Contraprovas:** Cap10 é serializado; mesma chave recupera anexo e outro
conteúdo conflita.

**Consequência operacional:** Usuário pode ficar impedido de anexar evidência
necessária.

**Consequência de integridade:** Metadado não corresponde a arquivo pronto; não
equivale a perda de ready existente.

**Consequência de autorização:** Revalidação de membro bloqueou
upload/finalização após revogação.

**Relação A/B1/B2:** A DB-004; B2-016; B1-ERR-001 recuperação visual permanece
separada.

**Alternativas futuras:** Estado de abandono/expiração ou retomada verificável
com prazo e conciliação de bytes.

**Riscos da correção:** Excluir upload em andamento, arquivo ready ou PDF
histórico; colisão de retry com limpeza.

**Legados potencialmente afetados:** Reservas quarantine antigas; distinguir
ativas de abandonadas antes de qualquer manutenção.

**Dependências:** Retenção, TTL de reserva, Storage reconciliação e UX de
retomada.

**Critérios de aceitação:** Após abandono comprovado, nova intenção obtém vaga
sem tocar ready; retry válido recupera mesmo arquivo/hash/versão.

**Regressões obrigatórias:** Duas reservas finais concorrentes, mesma
chave/outro conteúdo, revogação, bytes existentes e ready.

**Decisões de produto:** Prazo de retomada e quem pode abandonar/recuperar
capacidade.

**Validação humana/externa:** Sem aceite humano ou homologação externa.
Evidência local não certifica produção.

**Justificativa de prioridade:** P2: capacidade documental pode ficar bloqueada
por falhas anteriores.

**Origem:** A_B2_REVALIDATED_AND_EXTENDED

## B3-005 — Ledger/rastreabilidade

**Título:** Correção compensatória aceita movimento sem referência ao fato
corrigido

**Domínio:** Ledger/rastreabilidade

**Prioridade:** P2

**Natureza:** DEFECT_CONFIRMED

**Estado:** OPEN

**Confiança:** CONFIRMED_LOCAL

**Objeto afetado:** family_stock_movement p_reference

**Processo afetado:** Corrigir entrada ou saída familiar

**Contrato esperado:** Correção identifica fato anterior compatível e preserva
ambas as versões contábeis.

**Comportamento observado:** correction_in sem referência foi aceita; referência
de outro produto foi recusada.

**Causa sustentada:** Validação de referência é condicional à presença, sem
obrigatoriedade para ação compensatória.

**Evidência:** evidence/b35-results.json#B35-11

**Cenário reproduzido:** B35-11

**Resultado persistido:** Novo crédito1 com motivo mas sem elo obrigatório ao
movimento original.

**Abrangência:** Contrato vigente local; produto37cb7f85; dados fictícios B3;
remoto não verificado

**Limitações:** Operação autorizada no estoque familiar; não demonstra edição
direta de saldo.

**Contraprovas:** Ledger direto fechado, referência incompatível recusada,
unidade histórica imutável.

**Consequência operacional:** Responsável não consegue reconstruir com segurança
qual erro foi corrigido.

**Consequência de integridade:** Conservação pode estar aritmeticamente correta
sem proveniência suficiente.

**Consequência de autorização:** Sem escalada de papel; defeito é de
contrato/rastreio.

**Relação A/B1/B2:** B2-005; não é correção implementada nesta fase.

**Alternativas futuras:** Exigir referência nas correções ou separar ajuste novo
de correção com semântica explícita.

**Riscos da correção:** Inventar referência para legado ou impedir ajuste
legítimo cuja origem é desconhecida.

**Legados potencialmente afetados:** Movimentos correction sem referência;
manter registro e classificar sem reescrever.

**Dependências:** Definição de correção versus ajuste extraordinário; interface
de seleção.

**Critérios de aceitação:** Correção sem origem é recusada sem efeito; com
origem compatível cria compensação imutável e repetível.

**Regressões obrigatórias:** Outro paciente/produto/custódia, mesma chave, teto,
precisão, overdraw e histórico original.

**Decisões de produto:** Como registrar ajustes legítimos sem origem e quem os
autoriza.

**Validação humana/externa:** Sem aceite humano ou homologação externa.
Evidência local não certifica produção.

**Justificativa de prioridade:** P2: fragiliza rastreabilidade de alterações no
estoque oficial.

**Origem:** B2_REVALIDATED

## B3-006 — BAL/revisão

**Título:** BAL legado permite ao supervisor revisar a própria contagem

**Domínio:** BAL/revisão

**Prioridade:** P2

**Natureza:** DEFECT_CONFIRMED

**Estado:** OPEN

**Confiança:** CONFIRMED_LOCAL

**Objeto afetado:** legacy BAL approval versus scheduled wrapper

**Processo afetado:** Revisão independente de contagem

**Contrato esperado:** Quando exigida independência, contador efetivo não aprova
sua própria versão.

**Comportamento observado:** Supervisor contou e aprovou no regime legado;
regime agendado recusou42501.

**Causa sustentada:** Guard de identidade distinta está no caminho agendado e
não cobre a rota legada equivalente.

**Evidência:** evidence/b37-results.json#B37-01; B37-07; B37-09

**Cenário reproduzido:** B37-01; B37-07; B37-09

**Resultado persistido:** Aprovação própria legada registrada; agendada não
alterou versão/aprovação.

**Abrangência:** Contrato vigente local; produto37cb7f85; dados fictícios B3;
remoto não verificado

**Limitações:** Não generalizar para todos BALs; política e regime determinam
alcance.

**Contraprovas:** Agendado bloqueia contador efetivo; criador histórico pode
revisar quando outra pessoa realmente recontou.

**Consequência operacional:** Revisão apresentada como independente pode ser
feita pela mesma pessoa.

**Consequência de integridade:** Contagem potencialmente errada pode cumprir
aprovação sem contraditório esperado.

**Consequência de autorização:** Capacidade existe, mas separação de
responsabilidades é incompleta.

**Relação A/B1/B2:** B2-009; B3 confirma contraste entre regimes.

**Alternativas futuras:** Aplicar regra pelo contador efetivo/versão em todos os
regimes abrangidos; preservar exceções explícitas.

**Riscos da correção:** Bloquear revisor legítimo por confundir created_by com
counted_by; invalidar contagem antiga sem processo.

**Legados potencialmente afetados:** BALs legados com autorrevisão; avaliar sem
apagar aprovações históricas.

**Dependências:** Política de revisores e transição de regime; identidade do
contador efetivo.

**Critérios de aceitação:** Contador efetivo não revisa própria versão; revisor
autorizado distinto funciona; reconto zera elegibilidade de aprovações
anteriores.

**Regressões obrigatórias:** Criador diferente do contador, duas aprovações,
any/all, reconto e ledger revision.

**Decisões de produto:** Independência obrigatória para legado e tratamento das
contagens já aprovadas.

**Validação humana/externa:** Sem aceite humano ou homologação externa.
Evidência local não certifica produção.

**Justificativa de prioridade:** P2: garantia de conferência humana independente
não é uniforme.

**Origem:** B2_REVALIDATED

## B3-007 — Consumo/retorno transacional

**Título:** Decisão oposta de consumo retorna sucesso sem ter sido aplicada

**Domínio:** Consumo/retorno transacional

**Prioridade:** P2

**Natureza:** DEFECT_CONFIRMED

**Estado:** OPEN

**Confiança:** CONFIRMED_LOCAL

**Objeto afetado:** confirm_extraordinary_consumption; API consumption

**Processo afetado:** Confirmar ou rejeitar relato

**Contrato esperado:** Retry da mesma decisão recupera resultado; intenção
oposta informa conflito/decisão vigente.

**Comportamento observado:** Após confirmar, rejeitar devolve null/sucesso;
concorrentes confirmar/rejeitar receberam204 ambos.

**Causa sustentada:** Retorno antecipado quando status não é reported não
compara intenção nem retorna decisão tipada.

**Evidência:** evidence/b34-results.json#B34-04;
evidence/b38-results.json#B38-08

**Cenário reproduzido:** B34-04; B38-08

**Resultado persistido:** Primeira decisão permaneceu; nenhum segundo
débito/estorno foi observado.

**Abrangência:** Contrato vigente local; produto37cb7f85; dados fictícios B3;
remoto não verificado

**Limitações:** Sucesso HTTP não equivale a rejeição aplicada; falta não debita
no ensaio concorrente.

**Contraprovas:** Primeira decisão é serializada; confirmação repetida não
duplica consumo.

**Consequência operacional:** Pessoa pode acreditar que rejeitou um fato já
confirmado.

**Consequência de integridade:** Estado contábil protegido, mas resposta não
representa intenção concluída.

**Consequência de autorização:** Não houve capacidade indevida; atores
autorizados discordaram.

**Relação A/B1/B2:** B2-011; B3 acrescenta concorrência forçada.

**Alternativas futuras:** Retorno tipado com decisão atual e comparação de
intenção; conflito explícito na decisão oposta.

**Riscos da correção:** Transformar retry legítimo em duplicação ou permitir
reversão silenciosa de consumo confirmado.

**Legados potencialmente afetados:** Relatos terminais já
confirmados/rejeitados; não alterar sua decisão por retry.

**Dependências:** Contrato API/UI de sucesso, conflito e atualização da tela.

**Critérios de aceitação:** Mesma decisão recupera estado; decisão oposta recebe
conflito/resultado inequívoco; no máximo um débito sob concorrência.

**Regressões obrigatórias:** Confirmar duas vezes, rejeitar duas vezes, opostas
simultâneas, consumo/falta e resposta ignorada.

**Decisões de produto:** Como apresentar e eventualmente contestar decisão
terminal sem reescrever fato.

**Validação humana/externa:** Sem aceite humano ou homologação externa.
Evidência local não certifica produção.

**Justificativa de prioridade:** P2: feedback incorreto pode produzir decisão
operacional baseada em fato falso.

**Origem:** B2_REVALIDATED_AND_EXTENDED

## B3-008 — BAL/adiamento

**Título:** Adiamento BAL com alvo alterado permanece pendente e nem rejeição
conclui

**Domínio:** BAL/adiamento

**Prioridade:** P2

**Natureza:** DEFECT_CONFIRMED

**Estado:** OPEN

**Confiança:** CONFIRMED_LOCAL

**Objeto afetado:** balance_command deferral decision

**Processo afetado:** Decidir pedido de adiamento

**Contrato esperado:** Alvo obsoleto impede aprovação indevida, mas permite
recusa/invalidação auditada.

**Comportamento observado:** Após alteração do plantão alvo, decidir rejeição
também falha e pedido continua pending.

**Causa sustentada:** Checagem de versão/estado do alvo antecede o ramo de
rejeição e não oferece estado obsoleto terminal.

**Evidência:** evidence/b37-results.json#B37-05

**Cenário reproduzido:** B37-05

**Resultado persistido:** Pedido e prazo original preservados; nenhum
aceite/recusa terminal persistiu.

**Abrangência:** Contrato vigente local; produto37cb7f85; dados fictícios B3;
remoto não verificado

**Limitações:** Cenário específico de alvo versionado alterado; fluxo normal não
foi declarado quebrado.

**Contraprovas:** Prazo original não mudou automaticamente e alteração de janela
sem decisão familiar foi recusada.

**Consequência operacional:** Pendência antiga continua exigindo decisão que o
contrato não permite concluir.

**Consequência de integridade:** Sem adiamento indevido, mas lifecycle fica
travado.

**Consequência de autorização:** Família autorizada também não consegue
rejeitar.

**Relação A/B1/B2:** B2-012; mesma causa atual.

**Alternativas futuras:** Recusa sem exigir alvo atual ou invalidação explícita
por versão obsoleta com novo pedido.

**Riscos da correção:** Aprovar alvo diferente do apresentado ou apagar
prazo/motivo original.

**Legados potencialmente afetados:** Pedidos pending cujo target version mudou;
preservar origem e decisões.

**Dependências:** Agenda e snapshots de prazo; interface de pendências.

**Critérios de aceitação:** Alvo alterado não aprova silenciosamente;
recusa/invalidação conclui uma vez e mantém prazo original.

**Regressões obrigatórias:** Alvo válido, conflito simultâneo, fuso, alteração
de contador e repetição da decisão.

**Decisões de produto:** Estado obsoleto versus recusa familiar e quem pode
reapresentar pedido.

**Validação humana/externa:** Sem aceite humano ou homologação externa.
Evidência local não certifica produção.

**Justificativa de prioridade:** P2: bloqueia recuperação administrativa de
pendência legítima.

**Origem:** B2_REVALIDATED

## B3-009 — BAL/escala

**Título:** Substituição em reconto invalida atribuição sem criar sucessor
automaticamente

**Domínio:** BAL/escala

**Prioridade:** P2

**Natureza:** DEFECT_WITH_MANUAL_RECOVERY

**Estado:** OPEN

**Confiança:** CONFIRMED_LOCAL

**Objeto afetado:** bal_assign; resolve_balance_assignment; bal_assignments

**Processo afetado:** Recontar ciclo counted após substituir profissional

**Contrato esperado:** Responsabilidade fica alcançável para pessoa elegível ou
oferece recuperação clara.

**Comportamento observado:** Atribuição inválida não ganhou sucessor automático
no ciclo counted; assign_recount administrativo recuperou.

**Causa sustentada:** Seleção automática não percorre esse estado do
ciclo/reconto da mesma forma que ciclo aberto.

**Evidência:** evidence/b37-results.json#B37-08; B37-09

**Cenário reproduzido:** B37-08; B37-09

**Resultado persistido:** Invalidação preservada; nova atribuição manual
permitiu reconto por outra pessoa e revisão distinta.

**Abrangência:** Contrato vigente local; produto37cb7f85; dados fictícios B3;
remoto não verificado

**Limitações:** Há recuperação atual; não é perda irrecuperável de contagem.

**Contraprovas:** História do criador e contador efetivo distintos foi
preservada; aprovações anteriores não foram herdadas.

**Consequência operacional:** Sem orientação/decisão administrativa,
profissional substituto pode não encontrar contagem disponível.

**Consequência de integridade:** Ciclo mantém história, mas transição
operacional fica sem sucessor.

**Consequência de autorização:** Não liberar qualquer pessoa como contador para
resolver bloqueio.

**Relação A/B1/B2:** B2-014; B3 confirmou manual recovery e identidade efetiva.

**Alternativas futuras:** Designar sucessor formal automaticamente quando
inequívoco ou tornar recuperação administrativa explícita.

**Riscos da correção:** Duas atribuições ativas, perda de prazo original ou
herança de aprovação de outro contador.

**Legados potencialmente afetados:** Ciclos counted em reconto com atribuição
invalidada/substituição.

**Dependências:** Regime ativo, agenda, janela e identidade do contador.

**Critérios de aceitação:** Após substituição, há um único caminho elegível para
reconto; preservam-se autor, contador, prazos, atraso e revisão de versão.

**Regressões obrigatórias:** Ciclo aberto/contado, assign_recount, janela
encerrada, dupla atribuição e ledger alterado.

**Decisões de produto:** Automatizar sucessor ou exigir decisão humana
informada.

**Validação humana/externa:** Sem aceite humano ou homologação externa.
Evidência local não certifica produção.

**Justificativa de prioridade:** P2: recuperação existe, mas processo legítimo
pode ficar sem responsável disponível.

**Origem:** B2_REVALIDATED

## B3-010 — Compras/fechamento

**Título:** COM parcialmente realizada não permite desistir apenas do
remanescente

**Domínio:** Compras/fechamento

**Prioridade:** P2

**Natureza:** DOMAIN_GAP_CONFIRMED

**Estado:** OPEN

**Confiança:** CONFIRMED_LOCAL

**Objeto afetado:** supply_document_command COM cancel/purchase/receive

**Processo afetado:** Encerrar compra aprovada quando apenas parte será
realizada

**Contrato esperado:** Preservar compra/recebimento reais e encerrar
remanescente mediante decisão explícita.

**Comportamento observado:** COM 10 aprovada com 2 compradas/recebidas não tem
desistência das 8 restantes; cancelamento total é recusado.

**Causa sustentada:** Contrato só oferece cancelamento integral incompatível com
fatos físicos já existentes.

**Evidência:** evidence/b36-results.json#B36-07

**Cenário reproduzido:** B36-07

**Resultado persistido:** Fatos2 preservados; remanescente8 continua
operacionalmente aberto.

**Abrangência:** Contrato vigente local; produto37cb7f85; dados fictícios B3;
remoto não verificado

**Limitações:** Lacuna de domínio/produto; impedir cancelamento destrutivo é
proteção correta.

**Contraprovas:** Compra/chegada/validação separadas e crédito exato
funcionaram.

**Consequência operacional:** Previsão e pendência podem continuar anunciando
material que não será comprado.

**Consequência de integridade:** Não há corrupção dos 2 recebidos; falta fato
terminal para8 não realizados.

**Consequência de autorização:** Ator autorizado não tem comando apropriado; não
ampliar permissão de apagar fatos.

**Relação A/B1/B2:** B2-001; mesma necessidade.

**Alternativas futuras:** Desistência motivada/versionada por linha ou revisão
de saldo aprovado não realizado, sem reescrever o físico.

**Riscos da correção:** Cancelar recebimento real, liberar crédito duplo ou
esconder remanescente sem evento.

**Legados potencialmente afetados:** COMs parciais antigas com previsão
pendente.

**Dependências:** Regras de previsão de estoque, compras e relatórios.

**Critérios de aceitação:** Recebidos2 permanecem; 8 podem receber encerramento
explícito sem novo movimento; previsão pendente zera apenas parte desistida.

**Regressões obrigatórias:** Compra/recebimento pendente, recusa de recibo, duas
decisões e cancelamento sem fatos físicos.

**Decisões de produto:** Quem desiste, qual motivo e se precisa nova aprovação.

**Validação humana/externa:** Sem aceite humano ou homologação externa.
Evidência local não certifica produção.

**Justificativa de prioridade:** P2: falta fechamento operacional coerente sem
desfazer fatos válidos.

**Origem:** B2_REVALIDATED

## B3-011 — Read models/consumo

**Título:** Relatos antigos não são alcançáveis pela rota normal após 100
registros recentes

**Domínio:** Read models/consumo

**Prioridade:** P2

**Natureza:** DEFECT_CONFIRMED

**Estado:** OPEN

**Confiança:** CONFIRMED_LOCAL

**Objeto afetado:** GET /api/consumption

**Processo afetado:** Conferir pendência antiga a partir de painel/notificação

**Contrato esperado:** Lista e referência direta alcançam todo relato autorizado
ainda pendente.

**Comportamento observado:** 101 pendentes no painel; 100 na lista; ref/page
ignorados e alvo antigo ausente.

**Causa sustentada:** LIMIT100 sem paginação/filtro de ID na rota, apesar de
persistência e RLS permitirem leitura direta.

**Evidência:** evidence/b311-results.json#B311-01

**Cenário reproduzido:** B311-01

**Resultado persistido:** Relato antigo reported foi recuperado por Auth direto;
nenhum dado perdido.

**Abrangência:** Contrato vigente local; produto37cb7f85; dados fictícios B3;
remoto não verificado

**Limitações:** 101 novos relatos shortage; não prova todos os filtros/UI em
navegador.

**Contraprovas:** Stock_history e documentos têm total/páginas e foram
percorridos sem perda no estado estável.

**Consequência operacional:** Pendência cobrada pode não ser encontrada ou
decidida na tela disponível.

**Consequência de integridade:** História íntegra, completude do consumidor
quebrada.

**Consequência de autorização:** Leitura direta autorizada funciona; não é falha
de RLS.

**Relação A/B1/B2:** A BE-001; B2-017; B1 caminhos de navegação dependem dessa
rota.

**Alternativas futuras:** Paginação estável e consulta por referência com mesmo
escopo/autorização.

**Riscos da correção:** Perder filtro por paciente/dono, duplicar página com
inserts ou devolver lista vazia para erro.

**Legados potencialmente afetados:** Todos relatos fora da janela100; preservar
e tornar acessíveis.

**Dependências:** Contador/dashboard/notificação; contrato de navegação direta.

**Critérios de aceitação:** Comcentenas de relatos, referência antiga abre e
todas páginas são alcançáveis; contador explica conjunto completo.

**Regressões obrigatórias:** Mesmo timestamp, novos inserts, revogação, outro
paciente, sem resultado e erro de banco.

**Decisões de produto:** Filtros prioritários e comportamento ao seguir
referência antiga.

**Validação humana/externa:** Sem aceite humano ou homologação externa.
Evidência local não certifica produção.

**Justificativa de prioridade:** P2: impede executar uma tarefa que o sistema
continua cobrando.

**Origem:** A_B2_REVALIDATED

## B3-012 — Auditoria/read models

**Título:** Auditoria administrativa trunca eventos antigos sem percurso de
consulta

**Domínio:** Auditoria/read models

**Prioridade:** P2

**Natureza:** DEFECT_CONFIRMED

**Estado:** OPEN

**Confiança:** CONFIRMED_LOCAL

**Objeto afetado:** GET /api/admin?section=audit

**Processo afetado:** Investigar ação administrativa antiga

**Contrato esperado:** Autorizado consegue consultar história completa com
filtros/páginas proporcionais.

**Comportamento observado:** 201 eventos B3 existentes; rota retorna100 e ignora
page/ref; evento antigo lido por Auth direto.

**Causa sustentada:** Query administrativa fixa LIMIT100 sem contrato de
paginação ou referência.

**Evidência:** evidence/b311-results.json#B311-02;
evidence/b311-plans.json#QP-04

**Cenário reproduzido:** B311-02; QP-04

**Resultado persistido:** História não foi removida; nenhuma fixture extra de
auditoria foi necessária.

**Abrangência:** Contrato vigente local; produto37cb7f85; dados fictícios B3;
remoto não verificado

**Limitações:** Plano local pequeno não determina índice ótimo em produção.

**Contraprovas:** Grants/RLS protegem leitura; evento antigo permanece acessível
por query autorizada.

**Consequência operacional:** Investigação de incidente ou decisão antiga fica
limitada pela aplicação.

**Consequência de integridade:** Rastro existe, mas recuperação operacional é
incompleta.

**Consequência de autorização:** A solução precisa manter audit.read e paciente
correto.

**Relação A/B1/B2:** A BE-004; causa de rota independente da lista de consumo.

**Alternativas futuras:** Paginação/filtros de entidade/ator/período com ordem
estável; medir índice por escopo JSON ou coluna tipada.

**Riscos da correção:** Expor metadados de outro paciente ou criar índice
oneroso sem seletividade.

**Legados potencialmente afetados:** Eventos mais antigos que janela100; nenhum
expurgo autorizado.

**Dependências:** Observabilidade, governança, retenção e suporte de operação.

**Critérios de aceitação:** Evento antigo alcançável por referência/página;
ordem determinística e escopo idêntico sob limites.

**Regressões obrigatórias:** Vários pacientes, mesmo timestamp, ato global sem
paciente, revogação e volume.

**Decisões de produto:** Horizonte de consulta/retencão e responsáveis pelo
acesso auditável.

**Validação humana/externa:** Sem aceite humano ou homologação externa.
Evidência local não certifica produção.

**Justificativa de prioridade:** P2: rastreio relevante existe, mas não fica
disponível ao responsável autorizado.

**Origem:** A_REVALIDATED

## B3-013 — Contexto/frescor

**Título:** Edição de perfil não avisa consumidores pela revisão de workspace

**Domínio:** Contexto/frescor

**Prioridade:** P2

**Natureza:** DEFECT_CONFIRMED

**Estado:** OPEN

**Confiança:** CONFIRMED_LOCAL

**Objeto afetado:** private.invalidate_workspace; profiles; workspace_revision

**Processo afetado:** Atualizar nome/perfil refletido no contexto

**Contrato esperado:** Mudança relevante avisa os usuários afetados, sem payload
privado em Realtime.

**Comportamento observado:** Nome novo persistiu e my_workspace fresco o
retornou; revisão1684 permaneceu igual.

**Causa sustentada:** Trigger extrai care_recipient_id/user_id; profiles usa id
e não gera destinatário nesse ramo.

**Evidência:** evidence/b311-results.json#B311-03;
evidence/contracts/private.invalidate_workspace.19764.sql

**Cenário reproduzido:** B311-03

**Resultado persistido:** Perfil B3 atualizado; nenhuma revisão nova nesse
comando.

**Abrangência:** Contrato vigente local; produto37cb7f85; dados fictícios B3;
remoto não verificado

**Limitações:** Efeito visual de cache não foi observado; proponente global sem
vínculo permanece análise estática.

**Contraprovas:** Nova leitura já correta; operações protegidas consultam
autoridade atual e não confiam em nome/cache.

**Consequência operacional:** Tela pode conservar identificação/contexto
percebido obsoleto até outra atualização.

**Consequência de integridade:** Estado derivado/frescor divergente, sem prova
de corrupção de documento histórico.

**Consequência de autorização:** Não demonstrou bypass por cache; preservar
revogação em tempo de comando.

**Relação A/B1/B2:** A DB-007; B3 revalida perfil; B1 estados de atualização
dependem do sinal.

**Alternativas futuras:** Derivar destinatários por tipo de tabela/mudança e
cobrir proponente/usuário afetado.

**Riscos da correção:** Fan-out excessivo, canal de outro usuário, payload
privado ou loop de invalidação.

**Legados potencialmente afetados:** Clientes abertos e revisões correntes; não
reescrever snapshots de nomes históricos.

**Dependências:** Workspace client, sync, Realtime e governança multipaciente.

**Critérios de aceitação:** Editar perfil próprio incrementa revisão e atualiza
consumidor; outro usuário sem relação não recebe dados.

**Regressões obrigatórias:** Membership revogado, proposta global, último admin,
alteração de catálogo e nomes em PDF histórico.

**Decisões de produto:** Quais mudanças exigem atualização imediata e para quem.

**Validação humana/externa:** Sem aceite humano ou homologação externa.
Evidência local não certifica produção.

**Justificativa de prioridade:** P2: contexto operacional pode não receber sinal
de mudança relevante.

**Origem:** A_REVALIDATED

## B3-014 — Recuperação/continuidade

**Título:** Restauração operacional conjunta ainda não foi comprovada

**Domínio:** Recuperação/continuidade

**Prioridade:** P2

**Natureza:** VALIDATION_GAP

**Estado:** NOT_VERIFIED_FULL_RESTORE

**Confiança:** CONFIRMED_LIMIT_OF_EVIDENCE

**Objeto afetado:** PostgreSQL/Auth/Storage/Vault/cron/configuração/provedor

**Processo afetado:** Recuperar operação após perda de ambiente

**Contrato esperado:** Procedimento recupera relações, bytes, identidade e
automações dentro de RPO/RTO aceitos.

**Comportamento observado:** Dump privado legível e hash idêntico; Auth e
metadados Storage presentes; nenhum restore completo.

**Causa sustentada:** Sem ensaio em destino isolado autorizado com
bytes/configuração e validação operacional conjunta.

**Evidência:** evidence/b312-recovery.json;
12_ADVERSARIAL_INTEGRITY_AND_RECOVERY.md

**Cenário reproduzido:** Inventário somente leitura; B310-09 delimita metadado
sem bytes

**Resultado persistido:** Nenhuma restauração ou alteração de ambiente
executada; backup anterior preservado.

**Abrangência:** Contrato vigente local; produto37cb7f85; dados fictícios B3;
remoto não verificado

**Limitações:** Ausência de prova não é falha de restore reproduzida; destino
existente não pode ser substituído.

**Contraprovas:** Backup possui Auth/users, documentos e contexto; hashes/bytes
locais testados em outros cenários.

**Consequência operacional:** Tempo real e completude da recuperação continuam
desconhecidos.

**Consequência de integridade:** Restore parcial pode deixar ready sem bytes,
referências ou jobs inseguros para reenvio.

**Consequência de autorização:** Chaves, sessões e grants precisam ser
recuperados/rotacionados sem restaurar autoridade indevida.

**Relação A/B1/B2:** A OPS-001 continua aberto; B3 amplia inventário de
dependências.

**Alternativas futuras:** Ensaio isolado aprovado com inventário de segredos,
bytes, Auth e reconciliação de jobs antes de retomar envio.

**Riscos da correção:** Restaurar sobre ambiente errado, repetir mensagens
externas, invalidar login ou perder evidência histórica.

**Legados potencialmente afetados:** Toda base histórica, objetos Storage e
integrações; nenhuma cópia pública de dump.

**Dependências:** Operação, plataforma, segredos, RPO/RTO e homologação externa.

**Critérios de aceitação:** Restore isolado recupera login, permissões, hashes,
ledger, bytes e filas conciliadas; responsável mede RPO/RTO e documenta
recuperação.

**Regressões obrigatórias:** Versão antiga/PDF, usuário revogado, lease incerto,
metadado sem objeto e referência externa já enviada.

**Decisões de produto:** Dono, RPO, RTO, retenção e autorização do destino de
ensaio.

**Validação humana/externa:** Sem aceite humano ou homologação externa.
Evidência local não certifica produção.

**Justificativa de prioridade:** P2: capacidade de recuperação antes da operação
real não pode ser inferida do dump legível.

**Origem:** A_STILL_OPEN

## B3-015 — História/capacidade

**Título:** Snapshots acumulam quadraticamente resumos do histórico

**Domínio:** História/capacidade

**Prioridade:** P3

**Natureza:** RISK_SUPPORTED_MEASURED_STRUCTURE

**Estado:** OPEN

**Confiança:** CONFIRMED_STRUCTURE_NOT_PRODUCTION_INCIDENT

**Objeto afetado:** private.science_snapshot; document_events.body;
operational_document

**Processo afetado:** Manter e consultar documento de longa duração

**Contrato esperado:** Retenção e leitura histórica possuem orçamento conhecido,
sem perda de verificabilidade.

**Comportamento observado:** 1000 eventos acumularam500500 entradas resumidas
e71.056.717 bytes de corpos em texto; versão1 e todos digests válidos.

**Causa sustentada:** Cada evento inclui resumo de todos os anteriores, sem
copiar recursivamente corpos completos.

**Evidência:** evidence/b312h-results.json#B312-06;
evidence/b312v-results.json#B312-09

**Cenário reproduzido:** B312-06; B312-09

**Resultado persistido:** Fixtures200/1000 integralmente rollback; 0digest
divergente; nenhuma versão histórica editada.

**Abrangência:** Contrato vigente local; produto37cb7f85; dados fictícios B3;
remoto não verificado

**Limitações:** COM sintética, um membro, sem linhas; 6,361s é preparo/medição,
não latência de usuário nem tamanho completo do banco.

**Contraprovas:** Compressão reduziu soma pg_column_size a3.194.326 bytes;
antigo permaneceu acessível e verificável.

**Consequência operacional:** Custos de consulta, backup/render e retenção podem
crescer com documentos longos.

**Consequência de integridade:** Hashes corretos hoje; redesenho deve preservar
versões existentes e significado de eventos.

**Consequência de autorização:** Nenhuma exposição demonstrada; otimização não
pode retirar filtro de acesso.

**Relação A/B1/B2:** A DB-005; B3 acrescenta medição100/500/1000; não é achado
novo.

**Alternativas futuras:** Aceitar desenho com SLO medido ou separar referências
ao histórico/snapshot futuro sem reescrever passado.

**Riscos da correção:** Mudar canonicalização, quebrar PDFs/hash antigos ou
apagar lembretes necessários.

**Legados potencialmente afetados:** Documentos com muitas versões/lembretes e
seus PDFs.

**Dependências:** Retenção, política de lembretes, volume/SLO e renderer.

**Critérios de aceitação:** Publicar orçamento em volume representativo e manter
hash/PDF de versões antigas após eventual evolução.

**Regressões obrigatórias:** Mil eventos, digests, previousHash, PDF histórico,
restore e ciência desconhecida legada.

**Decisões de produto:** SLO, retenção e se lembrete gera versão documental
semântica.

**Validação humana/externa:** Sem aceite humano ou homologação externa.
Evidência local não certifica produção.

**Justificativa de prioridade:** P3: crescimento medido; nenhum incidente ou SLA
de produção descumprido foi demonstrado.

**Origem:** A_REVALIDATED_WITH_NEW_MEASUREMENT

## B3-016 — Workers/integrações

**Título:** Orçamento máximo do worker externo permanece sem validação
operacional

**Domínio:** Workers/integrações

**Prioridade:** P2

**Natureza:** RISK_SUPPORTED

**Estado:** MEASUREMENT_AND_EXTERNAL_VALIDATION_REQUIRED

**Confiança:** STRONG_STATIC_WITH_HISTORICAL_A_SIMULATION

**Objeto afetado:** notification worker; Meta upload/send; lease/time budget

**Processo afetado:** Processar lote de notificações externas com atraso do
provedor

**Contrato esperado:** Tempo de lote/lease/tentativa comporta latências e falhas
sem reenvio cego.

**Comportamento observado:** Código mantém até 50 jobs, concorrência10 e
caminhos de upload+send com 15s cada frente a120s de orçamento.

**Causa sustentada:** Pior caso de caminhos encadeados pode exceder orçamento de
execução; sem medição B3 de provedor.

**Evidência:** src/lib/notifications/worker.ts;
09_SCHEDULERS_JOBS_AND_MULTIPATIENT_PROGRESS.md;
evidence/b39s-results.json#B39-05

**Cenário reproduzido:** Inspeção vigente; B39-05 leases; simulação anterior A
não recontada como teste B3

**Resultado persistido:** Nenhuma mensagem real enviada; estado uncertain
protegido no ensaio local.

**Abrangência:** Contrato vigente local; produto37cb7f85; dados fictícios B3;
remoto não verificado

**Limitações:** Não houve repetição da simulação A nem medição de latência real;
risco não é timeout observado B3.

**Contraprovas:** Lease externo expirado vira uncertain e retry exige
confirmação explícita; callback tardio não rebaixa read.

**Consequência operacional:** Lote pode terminar incompleto/ambíguo e exigir
conciliação humana.

**Consequência de integridade:** Estado interno não prova entrega externa;
evitar duplicar mensagem após timeout.

**Consequência de autorização:** Destinatário/contato revalidados, sem bypass
demonstrado.

**Relação A/B1/B2:** A BE-003; fronteira externa ainda aberta.

**Alternativas futuras:** Medir cenários de latência e ajustar
lote/concorrência/lease/orçamento por caminhos reais.

**Riscos da correção:** Aumentar concorrência sem capacidade, duplicar envio ou
mascarar timeout com aceitação fictícia.

**Legados potencialmente afetados:** Jobs uncertain/processing e referências
externas que podem já ter sido entregues.

**Dependências:** B4/homologação externa futura, observabilidade e política de
conciliação.

**Critérios de aceitação:** Lote sob atrasos/falhas termina dentro do orçamento
ou reprograma estado inequívoco; no máximo envio conciliado por intenção.

**Regressões obrigatórias:** Uploadlento, sendlento, callbackantescomplete,
workererrado, recipientrevoked e uncertainretry.

**Decisões de produto:** SLA de notificação e procedimento para confirmar
reenvio incerto.

**Validação humana/externa:** Sem aceite humano ou homologação externa.
Evidência local não certifica produção.

**Justificativa de prioridade:** P2: risco concreto de continuidade externa já
sustentado, sem autorização para fechar por inferência.

**Origem:** A_RISK_RECHECKED_STATIC

## B3-017 — RPC/validação

**Título:** Valor nulo na decisão de consumo é persistido como rejeição

**Domínio:** RPC/validação

**Prioridade:** P2

**Natureza:** DEFECT_CONFIRMED

**Estado:** OPEN

**Confiança:** CONFIRMED_LOCAL

**Objeto afetado:** confirm_extraordinary_consumption p_accept

**Processo afetado:** Decidir relato por RPC autorizada

**Contrato esperado:** Decisão deve ser true/false explícito; nulo não produz
decisão.

**Comportamento observado:** p_accept=null em reported devolveu sucesso e gravou
rejected.

**Causa sustentada:** CASE WHEN p_accept THEN confirmed ELSE rejected sem
rejeição explícita de NULL.

**Evidência:** evidence/b34-results.json#B34-05

**Cenário reproduzido:** B34-05

**Resultado persistido:** Relato sintético mudou para rejected sem decisão
booleana válida.

**Abrangência:** Contrato vigente local; produto37cb7f85; dados fictícios B3;
remoto não verificado

**Limitações:** Somente ator com capacidade confirm; API Zod boolean mitiga
caminho normal.

**Contraprovas:** review_flow_submission já recusa p_accept null e negócio
continua exigindo capacidade.

**Consequência operacional:** Cliente alternativo/erro de integração pode
rejeitar relato sem intenção definida.

**Consequência de integridade:** Decisão persistida não representa comando
válido.

**Consequência de autorização:** Não ultrapassa papel/paciente; validação
incompleta no banco exposto.

**Relação A/B1/B2:** Nova B3; distinta da decisão oposta terminal B2-011.

**Alternativas futuras:** Rejeitar NULL no entrypoint, retornar decisão tipada e
manter false legítimo.

**Riscos da correção:** Trocar semântica de false ou impedir retry da mesma
decisão.

**Legados potencialmente afetados:** Não é possível inferir quais rejected
antigos vieram de NULL; sem atribuição retroativa inventada.

**Dependências:** Contrato de parâmetros e erro seguro da API/RPC.

**Critérios de aceitação:** Reported+null falha sem mudar status/ledger/eventos;
true/false explícitos funcionam com mesma capacidade.

**Regressões obrigatórias:** Nulo, omitido, false, true, terminaloposto,
concorrência e ator sem capacidade.

**Decisões de produto:** Nenhuma semântica de negócio exige NULL; definir erro
público consistente.

**Validação humana/externa:** Sem aceite humano ou homologação externa.
Evidência local não certifica produção.

**Justificativa de prioridade:** P2: decisão incorreta persiste no banco apesar
de API atual validar booleano.

**Origem:** B3_NEW

## B3-018 — Ledger/quantidades

**Título:** RPC familiar arredonda excesso de casas antes de validar precisão do
produto

**Domínio:** Ledger/quantidades

**Prioridade:** P2

**Natureza:** DEFECT_CONFIRMED

**Estado:** OPEN

**Confiança:** CONFIRMED_LOCAL

**Objeto afetado:** family_stock_movement; numeric18,6;
guard_stock_movement_balance

**Processo afetado:** Registrar quantidade base exata de material

**Contrato esperado:** Valor incompatível com precisão do produto é recusado,
sem correção silenciosa.

**Comportamento observado:** Produto inteiro aceitou1.0000004 e
persistiu1.000000.

**Causa sustentada:** Coerção numeric18,6 ocorre antes da validação do trigger;
valor original já foi perdido.

**Evidência:** evidence/b35-results.json#B35-09

**Cenário reproduzido:** B35-09

**Resultado persistido:** Um movimento1.000000 para comando original1.0000004.

**Abrangência:** Contrato vigente local; produto37cb7f85; dados fictícios B3;
remoto não verificado

**Limitações:** API exactQuantity limita seis casas; RPC direta autorizada
continua exposta.

**Contraprovas:** Precisão comum1.1 no produto inteiro e
zero/negativo/overdraw/teto foram recusados; conservação serializada.

**Consequência operacional:** Quantidade registrada pode diferir da intenção sem
aviso de erro.

**Consequência de integridade:** Ledger é exato para valor convertido, mas
contrato de entrada exata foi violado.

**Consequência de autorização:** Sem escopo/papel indevido; risco está no valor
do comando.

**Relação A/B1/B2:** Nova B3; não é defeito aritmético de floating point.

**Alternativas futuras:** Validar precisão/finitude no numeric original antes de
coerção e manter trigger de defesa.

**Riscos da correção:** Mudar rounding de legado, aceitar notação inesperada ou
quebrar unidades fracionárias válidas.

**Legados potencialmente afetados:** Não reconstruir casas originais perdidas;
movimentos existentes permanecem imutáveis.

**Dependências:** Unidade/quantity_decimals; parse de todos entrypoints
equivalentes.

**Critérios de aceitação:** 1.0000004 em produto inteiro é recusado sem
movimento; quantidade permitida persiste exatamente e retry mantém ID.

**Regressões obrigatórias:** Valores perto da fronteira0/1, NaN/Infinity, teto,
decimais0..6, JSONstring e número.

**Decisões de produto:** Reafirmar política de rejeitar precisão inválida;
qualquer arredondamento deve ser explícito e auditável.

**Validação humana/externa:** Sem aceite humano ou homologação externa.
Evidência local não certifica produção.

**Justificativa de prioridade:** P2: quantidade oficial difere silenciosamente
do comando aceito.

**Origem:** B3_NEW

## B3-019 — Catálogo/conversão

**Título:** Fator NaN de apresentação é aceito no catálogo por RPC direta

**Domínio:** Catálogo/conversão

**Prioridade:** P2

**Natureza:** DEFECT_CONFIRMED

**Estado:** OPEN

**Confiança:** CONFIRMED_LOCAL

**Objeto afetado:** configure_catalogue_unit;
product_presentations.base_quantity

**Processo afetado:** Definir conversão de apresentação para quantidade base

**Contrato esperado:** Fator é finito, positivo e compatível com
precisão/unidade.

**Comportamento observado:** baseQuantity NaN foi armazenado na apresentação
sintética.

**Causa sustentada:** Comparações de positividade/arredondamento não excluem NaN
de numeric no PostgreSQL.

**Evidência:** evidence/b35-results.json#B35-10;
05_LEDGER_STOCK_AND_QUANTITY_INTEGRITY.md

**Cenário reproduzido:** B35-10

**Resultado persistido:** Metadado de conversão NaN permaneceu; nenhum NaN de
ledger foi produzido.

**Abrangência:** Contrato vigente local; produto37cb7f85; dados fictícios B3;
remoto não verificado

**Limitações:** Requer capacidade de catálogo; API valida formato; efeito de uso
futuro dessa apresentação não foi executado.

**Contraprovas:** Entrada pública do ledger rejeitou NaN pelo teto; unidade
histórica continua imutável.

**Consequência operacional:** Conversão de embalagem/unidade pode falhar ou
apresentar quantidade não utilizável.

**Consequência de integridade:** Catálogo contém fator fora do domínio numérico
esperado.

**Consequência de autorização:** Não há autorização indevida; regra de domínio
ausente na camada final.

**Relação A/B1/B2:** Nova B3; independente da coerção de escala familiar.

**Alternativas futuras:** Excluir numeric não finito explicitamente no contrato
e constraint apropriada, com diagnóstico de legados.

**Riscos da correção:** Substituir fator inválido por número inventado ou
alterar unidade com história.

**Legados potencialmente afetados:** Apresentações com valores especiais
precisam de diagnóstico autorizado; não inferir produção afetada.

**Dependências:** Contrato de unidade/apresentação; quantidade exata na API.

**Critérios de aceitação:** NaN/Infinity/zero/negativo recusados sem alteração
de catálogo; fatores fracionários válidos preservados.

**Regressões obrigatórias:** Conversão exata, unidade com histórico,
apresentação inativa e autorização local.

**Decisões de produto:** Política para desabilitar apresentação inválida sem
reinterpretar documentos antigos.

**Validação humana/externa:** Sem aceite humano ou homologação externa.
Evidência local não certifica produção.

**Justificativa de prioridade:** P2: o banco aceita um fator de conversão sem
significado operacional.

**Origem:** B3_NEW

## B3-020 — Autorização/concorrência

**Título:** Movimento já em espera pode concluir depois da revogação ou troca de
contexto

**Domínio:** Autorização/concorrência

**Prioridade:** P2

**Natureza:** AUTHORIZATION_BOUNDARY_GAP

**Estado:** DECISION_AND_HARDENING_REQUIRED

**Confiança:** CONFIRMED_LOCAL

**Objeto afetado:** family_stock_movement authorization before stock advisory
lock

**Processo afetado:** Revogar autoridade enquanto comando aguarda transação

**Contrato esperado:** Definir e cumprir ponto de validade da autorização, com
tratamento consistente após espera.

**Comportamento observado:** Revogação comitou antes da liberação; movimento
iniciado antes persistiu depois; troca A→B teve janela equivalente.

**Causa sustentada:** private.require_cap é executado antes do lock e não
repetido após esperar; BAL agendado possui revalidação.

**Evidência:** evidence/b38-results.json#B38-06;
evidence/b312-results.json#B312-02

**Cenário reproduzido:** B38-06; B312-02

**Resultado persistido:** Um movimento adicional emA por intenção pré-iniciada;
novas chamadas foram42501.

**Abrangência:** Contrato vigente local; produto37cb7f85; dados fictícios B3;
remoto não verificado

**Limitações:** Não permite iniciar comando depois de revogação, não afeta outro
paciente e não muda destino explícito.

**Contraprovas:** Nova chamada revogada/contexto errado foi negada; anexo
revalida entre passos; BAL protegido após lock.

**Consequência operacional:** Responsável pode considerar revogação concluída
enquanto uma escrita pendente ainda finaliza.

**Consequência de integridade:** Quantidade continua conservada; autoridade
temporal percebida difere do momento de commit.

**Consequência de autorização:** Janela demonstrada de comando pré-iniciado; sem
escalada universal de revogado.

**Relação A/B1/B2:** Nova B3; duas manifestações da mesma ordem de
autorização/lock.

**Alternativas futuras:** Revalidar capacidade/contexto após lock ou aceitar
explicitamente linearização no início com observabilidade.

**Riscos da correção:** Deadlock por nova ordem de locks, recusar retry já
aplicado ou aumentar contenção de sessão.

**Legados potencialmente afetados:** História permanece atribuída ao autor;
nenhum movimento retroativo deve ser apagado.

**Dependências:** Semântica de revogação, ordem global de locks e consistência
com BAL/anexos.

**Critérios de aceitação:** Política escolhida é demonstrada com barreira; se
exigir autoridade no commit, revogação impede novo movimento após espera sem
parcial.

**Regressões obrigatórias:** Revogação simultânea, contextoA/B, mesma chave,
overdraw, último admin e BALrecuperação.

**Decisões de produto:** Revogação cancela intenções em curso ou só impede
novas? Documentar garantia concreta.

**Validação humana/externa:** Sem aceite humano ou homologação externa.
Evidência local não certifica produção.

**Justificativa de prioridade:** P2: fronteira de autoridade temporal precisa
ser resolvida antes de prometer revogação imediata.

**Origem:** B3_NEW

## B3-021 — Sessões/identidade/Storage

**Título:** JWT de sessão encerrada ainda escreve identidade e avatar próprios

**Domínio:** Sessões/identidade/Storage

**Prioridade:** P2

**Natureza:** SECURITY_CONTRACT_GAP_CONFIRMED

**Estado:** OPEN

**Confiança:** CONFIRMED_LOCAL

**Objeto afetado:** update_my_profile; set_my_avatar; profile-avatars policies

**Processo afetado:** Encerrar sessão e impedir seu uso posterior no produto

**Contrato esperado:** Escritas abrangidas pela sessão operacional exigem sessão
Auth ainda ativa.

**Comportamento observado:** my_session_valid=false e APIperfil401; JWT ainda no
prazo escreveu avatar próprio e alterou nome/preferências/ponteiro por RPC.

**Causa sustentada:** Esses contratos verificam auth.uid/ownprefix/status, sem
consultar auth_session como os entrypoints de negócio.

**Evidência:** evidence/b310s-results.json#B310-10;
evidence/b312-results.json#B312-01

**Cenário reproduzido:** B310-10; B312-01

**Resultado persistido:** Novo JPEG e atualização do novo perfil próprio
confirmados; stock_overview recusado42501.

**Abrangência:** Contrato vigente local; produto37cb7f85; dados fictícios B3;
remoto não verificado

**Limitações:** JWT não expirado, identidade própria; sem senha/email/outro
usuário/dados de paciente. Outro login legítimo não foi encerrado.

**Contraprovas:** API e funções de operação protegidas recusaram sessão
encerrada; patient-evidence tem guards complementares.

**Consequência operacional:** Encerrar aquela sessão não impede todas as
alterações prometidas à própria identidade.

**Consequência de integridade:** Identificação/registro/preferências podem ser
mudados por credencial que app já considera encerrada.

**Consequência de autorização:** Desalinhamento de revogação entre camadas;
nenhum acesso cruzado demonstrado.

**Relação A/B1/B2:** Nova B3; B33 proteção de negócio não podia ser generalizada
para perfil/Storage.

**Alternativas futuras:** Exigir sessão ativa no entrypoint de perfil e policies
abrangidas, com política explícita para URLs temporárias.

**Riscos da correção:** Bloquear upload/login legítimo, inviabilizar
OAuth/refresh ou confundir logout de uma sessão com todas.

**Legados potencialmente afetados:** Tokens ainda não expirados de sessões
encerradas; objetos próprios existentes não devem ser apagados.

**Dependências:** Fronteira auth_session, Storage policy, fluxo de
logout/refresh e revisão de todas escritas de identidade.

**Critérios de aceitação:** JWT de sessão encerrada não escreve perfil/avatar
nem ponteiro; login novo legítimo funciona; negado não muda registro/bytes.

**Regressões obrigatórias:** Uma versus todas sessões, refresh, perfil revogado,
ownprefix/crossprefix, patient-evidence e URLjáemitida.

**Decisões de produto:** Abrangência exata de logout/revogação por sessão e
comunicação ao usuário.

**Validação humana/externa:** Sem aceite humano ou homologação externa.
Evidência local não certifica produção.

**Justificativa de prioridade:** P2: prova de escrita após encerramento, com
alcance limitado a identidade própria.

**Origem:** B3_NEW

## B3-022 — Storage/governança

**Título:** URL de arquivo já emitida continua válida durante TTL após revogar
vínculo

**Domínio:** Storage/governança

**Prioridade:** P3

**Natureza:** GOVERNANCE_BOUNDARY_CONFIRMED

**Estado:** PRODUCT_DECISION_REQUIRED

**Confiança:** CONFIRMED_LOCAL

**Objeto afetado:** Signed URLs patient-evidence TTL120s

**Processo afetado:** Revogar acesso a arquivo privado

**Contrato esperado:** Garantia anunciada distingue impedir novas URLs de
invalidar credenciais já emitidas.

**Comportamento observado:** Nova API404 após revogação; URL anteriormente
emitida retornou 200 dentro do prazo.

**Causa sustentada:** URL assinada é credencial temporária independente da
consulta de membership em cada download.

**Evidência:** evidence/b310-results.json#B310-06

**Cenário reproduzido:** B310-06

**Resultado persistido:** Arquivo não mudou; nenhuma URL/token foi exportada.

**Abrangência:** Contrato vigente local; produto37cb7f85; dados fictícios B3;
remoto não verificado

**Limitações:** Expiração depois120s não foi testada; sem exposição a terceiro
ou acesso permanente demonstrado.

**Contraprovas:** Novas autorizações/URLs foram negadas; usuário era autorizado
quando recebeu o link.

**Consequência operacional:** Promessa de bloqueio instantâneo pode ser
interpretada além da garantia real.

**Consequência de integridade:** Não houve corrupção de arquivo; problema é
prazo de credencial de leitura.

**Consequência de autorização:** Janela limitada de credencial previamente
legítima, distinta de falha de RLS.

**Relação A/B1/B2:** Nova observação B3; requer política de revogação, sem
classificar comportamento padrão como invasão.

**Alternativas futuras:** Aceitar TTL documentado, reduzi-lo ou usar proxy
autenticado quando requisito justificar custo.

**Riscos da correção:** Downloads interrompidos, custo/latência de proxy e falsa
promessa de revogar cópias já baixadas.

**Legados potencialmente afetados:** Links emitidos ainda dentro do TTL; bytes
históricos devem permanecer.

**Dependências:** Modelo de ameaça, privacidade, UX e orçamento de downloads.

**Critérios de aceitação:** Decisão publicada; seTTLaceito, linkexpira no prazo
e novaAPInega; seproxy, revogação revalidada por download.

**Regressões obrigatórias:** Download autorizado, revogado, TTLexpirado,
PDFhistórico, cache e linkjárecebido.

**Decisões de produto:** Qual janela residual é aceitável para arquivos
privados?

**Validação humana/externa:** Sem aceite humano ou homologação externa.
Evidência local não certifica produção.

**Justificativa de prioridade:** P3: credencial temporária previamente
autorizada; sem vazamento indevido demonstrado.

**Origem:** B3_NEW

## B3-023 — Read models/contrato

**Título:** NULL explícito remove o limite de página da RPC documental

**Domínio:** Read models/contrato

**Prioridade:** P3

**Natureza:** CONTRACT_DEFECT_CONFIRMED

**Estado:** OPEN

**Confiança:** CONFIRMED_LOCAL

**Objeto afetado:** operational_document_list p_page/p_size

**Processo afetado:** Listar documentos por cliente autorizado

**Contrato esperado:** Paginação respeita page1..100000 e size1..100 ou recusa
nulo explícito.

**Comportamento observado:** size=null, page=null retornaram todos16 documentos
e campos de página nulos.

**Causa sustentada:** IF NOT BETWEEN com NULL não entra no erro; LIMIT NULL
significa sem limite.

**Evidência:** evidence/b312-results.json#B312-05

**Cenário reproduzido:** B312-05

**Resultado persistido:** Somente leitura; nenhum documento alterado.

**Abrangência:** Contrato vigente local; produto37cb7f85; dados fictícios B3;
remoto não verificado

**Limitações:** Apenas paciente autorizado; API pageParameters valida; nenhum
DoS/carga de produção demonstrado.

**Contraprovas:** Parâmetro numérico size1 limita; stock_history trata NULL
explicitamente.

**Consequência operacional:** Cliente RPC pode obter resposta maior que o
contrato e consumir recursos imprevisíveis.

**Consequência de integridade:** Nenhuma alteração de dados; limite operacional
do contrato não é garantido.

**Consequência de autorização:** Filtros de capacidade/paciente continuam; sem
exfiltração cruzada.

**Relação A/B1/B2:** Nova B3; independente da falta de paginação nas duas rotas
antigas.

**Alternativas futuras:** Rejeitar NULL ou definir default explícito coerente,
antes da query.

**Riscos da correção:** Mudar tratamento de parâmetros omitidos ou quebrar
consumidor que usa NULL como default.

**Legados potencialmente afetados:** Não há estado persistido a migrar; mapear
clientes RPC existentes.

**Dependências:** API/RPC de filtros e orçamento de leitura.

**Critérios de aceitação:** NULL explícito tem comportamento definido; nenhuma
chamada autorizada passa do limite máximo; omissão mantém default normal.

**Regressões obrigatórias:** Nulo/omitido/0/negativo/teto, filtros, contagem,
total e paciente sem vínculo.

**Decisões de produto:** Rejeitar nulo ou convertê-lo ao default, sem permitir
leitura ilimitada involuntária.

**Validação humana/externa:** Sem aceite humano ou homologação externa.
Evidência local não certifica produção.

**Justificativa de prioridade:** P3: quebra do limite só em leitura autorizada,
sem indisponibilidade demonstrada.

**Origem:** B3_NEW

## B3-024 — Desempenho/SQL

**Título:** Custo de autorização e alerta por movimento exige orçamento medido

**Domínio:** Desempenho/SQL

**Prioridade:** P3

**Natureza:** RISK_SUPPORTED_LOCAL_MEASUREMENT

**Estado:** MEASUREMENT_REQUIRED

**Confiança:** LOCAL_SAMPLE_AND_CANCELED_FIXTURE_NOT_PRODUCTION

**Objeto afetado:** current_stock_balances; evaluate_stock_alert; private.can;
workspace invalidation

**Processo afetado:** Crescer ledger sem prolongar operações e locks
excessivamente

**Contrato esperado:** Custo por comando/consulta é conhecido em volume
representativo sem enfraquecer autorização.

**Comportamento observado:** View100 linhas234.4ms; preparo owner1000 cancelado
após 120s dentro do stack de alerta/view/autorização.

**Causa sustentada:** Cálculo de saldo/permits por linha reutilizado em trigger
e fan-out; medição isola sinal, não causa única de latência remota.

**Evidência:** evidence/b311-plans.json#QP-01; QP-07;
evidence/b311-plans-initial-attempt.json

**Cenário reproduzido:** QP-01..QP-07; QP-07-ATTEMPT-1

**Resultado persistido:** Todas fixtures de volume rollback; total ledger igual
e pacientes restantes0.

**Abrangência:** Contrato vigente local; produto37cb7f85; dados fictícios B3;
remoto não verificado

**Limitações:** Amostras únicas locais; a inserção owner não tinha claims de
cliente e não mede throughput Auth; sem SLA/produção.

**Contraprovas:** RPCs amostrais ficaram27..45ms; índice de paciente já é
utilizado; amostra não justifica remover RLS.

**Consequência operacional:** Crescimento pode alongar lock por paciente e
tarefas concorrentes.

**Consequência de integridade:** Otimização que abandone soma/locks pode
comprometer garantias hoje corretas.

**Consequência de autorização:** Nunca trocar custo de policy por acesso
irrestrito ou cache sem escopo.

**Relação A/B1/B2:** A BE-006 já tratava viagens do dashboard; B3 acrescenta
mecanismo SQL/alerta e amostras, sem declarar tudo novo.

**Alternativas futuras:** Benchmark descartável com claims/volumes
representativos; comparar cálculo interno/preagregação e invalidação
proporcional.

**Riscos da correção:** Saldo obsoleto, precisão perdida, vazamento por cache e
índice/fan-out mais caro na escrita.

**Legados potencialmente afetados:** Ledger grande e pacientes com muitos
membros; história não pode ser expurgada por conveniência.

**Dependências:** SLO/volume esperado, autorização e observabilidade de locks.

**Critérios de aceitação:** Medir distribuição de latências/locks e custo por
volume; desenho escolhido conserva RLS, ledger exato e rollback.

**Regressões obrigatórias:** Leitor/equipe/família, overdrawconcorrente,
quantidadesdecimais, alertasdeduplicados e crescimento.

**Decisões de produto:** Orçamento de latência e volume inicial antes de
escolher otimização.

**Validação humana/externa:** Sem aceite humano ou homologação externa.
Evidência local não certifica produção.

**Justificativa de prioridade:** P3: sinal local relevante, sem incidente ou
limite de produção demonstrado.

**Origem:** B3_NEW_MECHANISM_RELATED_TO_A_BE006

## B3-025 — Jobs/recuperação de legado

**Título:** Um registro legado malformado pode abortar repetidamente o lote
operacional

**Domínio:** Jobs/recuperação de legado

**Prioridade:** P3

**Natureza:** RISK_SUPPORTED_PRIVILEGED_FIXTURE

**Estado:** LEGACY_REPAIR_AND_OBSERVABILITY_DECISION

**Confiança:** CONFIRMED_FIXTURE; NORMAL_INGRESS_NOT_DEMONSTRATED

**Objeto afetado:** run_operational_schedule; legacy requisition_lifecycle
policy cast

**Processo afetado:** Processar backlog após evolução/restauração de dados

**Contrato esperado:** Dado inválido é detectado e recuperado sem perda
silenciosa de progresso ou falsa saúde.

**Comportamento observado:** Política legada sintética com repeatHours inválido
abortou três execuções; health não avançou e nenhum lembrete persistiu.

**Causa sustentada:** Cast inválido não é isolado por candidato; transação
inteira aborta preservando atomicidade.

**Evidência:** evidence/b39s-results.json#B39-07

**Cenário reproduzido:** B39-07

**Resultado persistido:** 0 eventos e health inalterado; fixture e tentativas
rollback.

**Abrangência:** Contrato vigente local; produto37cb7f85; dados fictícios B3;
remoto não verificado

**Limitações:** Somente fixture owner malformada; configuração pública valida
campo e não aceita esse valor.

**Contraprovas:** Não foi demonstrado ingresso pelo usuário normal; erro
explícito evita resultado parcial enganoso.

**Consequência operacional:** Dado legado/restaurado defeituoso pode impedir
retomada até diagnóstico administrativo.

**Consequência de integridade:** Não corrompe lote parcialmente; precisa de
política de recuperação verificável.

**Consequência de autorização:** Não é exploração pública de serviço; depende de
dado privilegiado/legado inválido.

**Relação A/B1/B2:** Mecanismo novo B3; distinto do lote ocupado por estados
terminais DB-002.

**Alternativas futuras:** Validar legado em restore/migration, alertar falha e
definir recuperação/quarentena por candidato quando seguro.

**Riscos da correção:** Engolir erro e reportar sucesso, pular trabalho
essencial ou fabricar configuração retroativa.

**Legados potencialmente afetados:** Registros de política fora do contrato após
operação privilegiada/evolução; produção não inspecionada.

**Dependências:** OPS-001, observabilidade, semântica transacional e
procedimento de reparo.

**Critérios de aceitação:** Dado inválido provoca alerta identificável;
recuperação autorizada preserva origem e retoma alvos válidos sem duplicar
efeitos.

**Regressões obrigatórias:** Poisonrow, rollback, totalhealth, 25/100starvation
e configuração normal recusando malformado.

**Decisões de produto:** Dono da triagem e critério para isolar candidato sem
esconder falha.

**Validação humana/externa:** Sem aceite humano ou homologação externa.
Evidência local não certifica produção.

**Justificativa de prioridade:** P3: risco de recuperação sustentado por fixture
privilegiada, sem origem normal demonstrada.

**Origem:** B3_NEW
