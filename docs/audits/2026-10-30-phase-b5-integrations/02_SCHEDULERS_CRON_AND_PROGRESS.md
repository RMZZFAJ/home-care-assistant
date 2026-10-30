# Schedulers, cron e progresso

## Contrato vigente e reaproveitamento

Cron operacional de minuto → `private.scheduled_operations` →
`run_operational_schedule` → `fluent_pre_shift_scheduler` → lifecycle REQ/ENT
e lembretes legados → cursor BAL → entrega interna de até 100 avisos.
O endpoint worker também chama o scheduler antes de reservar jobs. Cron worker
independente só envia HTTPS se Vault tiver destino oficial e bearer válido.

Definições conferidas com B3 no baseline. Provas B39-01–07 em
[B3](../2026-10-29-phase-b3-database/09_SCHEDULERS_JOBS_AND_MULTIPATIENT_PROGRESS.md)
,
commit `315399dc5c19cacc9d9cc3c609174498608f4af0`, são reutilizadas sem replay.

- **REQ lembrete/ciência** — Seleção/avanço: 25 pacientes por menor
  vencimento; 100 REQs; lock scheduler e estoque; Garantia e falha
  delimitadas: Canceladas ocupam vagas sem mover vencimento: DB-002/B3-001 P1,
  entre pacientes e dentro de um paciente.

- **Arquivo REQ** — Seleção/avanço: conclusão, ciência satisfeita, prazo e
  ausência de exceção manual; Garantia e falha delimitadas: Não arquiva
  incompleta para desobstruir fila; compartilha seleção com lembretes.

- **ENT pendente** — Seleção/avanço: pending_receipt há 24h; 50 por pacientes
  selecionados; Garantia e falha delimitadas: Atualiza updated_at ao lembrar;
  seleção de paciente pode ser prejudicada por REQs terminais.

- **Legado BAL/plantão** — Seleção/avanço: 100 settings sem cursor; somente
  dia atual; Garantia e falha delimitadas: DB-006 confirmado na B3; repetição
  do mesmo lote não implica alcance universal.

- **BAL por plantão** — Seleção/avanço: até 100 regimes enabled, cursor UUID
  circular e lock singleton; Garantia e falha delimitadas: B39-04 alcançou 101
  regimes em duas rodadas, sem duplicar obrigações; erro reverte cursor junto
  com efeitos.

- **Entrega interna** — Seleção/avanço: 100 pending vencidas, created_at, SKIP
  LOCKED; Garantia e falha delimitadas: Conclui ou cancela e libera vagas; não
  depende de Meta; depende de cron chegar a essa etapa.

- **Claim externo** — Seleção/avanço: prioridade crítica, next_attempt_at/ID;
  até 50 no TS; Garantia e falha delimitadas: Trabalho sai de pending; lease
  externa vencida vira uncertain; sem garantia de prazo/fairness por paciente
  sob chegada contínua.

## Nova hipótese de continuidade temporal: B5-001

`enqueue_scheduled_reminders` calcula `today` e `clock_hour` a partir de now,
compara dia da semana e cria `period=today`. Não há janela persistida anterior,
cursor de data ou busca dos períodos que ficaram sem execução. Após interrupção
que atravesse o dia, voltar a executar não materializa o lembrete daquele dia.

É risco sustentado por contrato estático, sem simulação de relógio SQL nem
incidente real: um agendamento configurado para ontem não é elegível hoje.
Contraprova: falha curta dentro do mesmo dia, depois da hora configurada, ainda
pode ser recuperada; unicidade impede duplicação. BAL por plantão usa obrigações
e atrasos próprios, portanto não recebe essa conclusão automaticamente.
Decidir se o legado deve recuperar período, avisar a lacuna ou ficar fora do
escopo inicial. Não criar lembretes retroativos que afirmem presença física.

## Falha de um domínio e saúde aparente

B3-025 mostrou registro legado privilegiado inválido abortando toda a transação.
A B5 rastreia a consequência adicional: não se chega ao cursor BAL nem à entrega
interna nessa chamada; o endpoint automático falha antes de claim/envio.
O cron worker continua podendo ser chamado, mas não prova comunicação útil.
Não é achado novo duplicado. O contrato público recusa o campo malformado;
nunca se afirmou entrada normal ou produção afetada.

`scheduler_health.last_run/processed` pertence ao lifecycle e só persiste se a
transação confirmar. Não representa última entrega Meta, sucesso do BAL por
paciente, idade máxima da fila ou falha durável quando a própria transação
aborta. Com starvation conhecido, last_run pode continuar novo com processed
zero enquanto outro domínio retorna contagens. Monitorar só cron verde é
insuficiente. Não houve medição ou reconfiguração de cron remoto.

## Contraditório e encerramento B5.2

Não reproduzir 25/100 candidatos ou 101 regimes: as definições permanecem
idênticas e as provas anteriores respondem às mesmas dúvidas. Não desligar
cron, limpar canceladas ou arquivar incompletas. Tarefas manuais, ciência e
conferência documental seguem disponíveis conforme autorização; a decisão de
contingência e seu responsável ainda precisa de validação humana.

Nova investigação: recuperação de dia perdido, estática e delimitada. Riscos
anteriores: progresso, legado inválido e prazo do worker conservados. Nenhum
teste de carga ou garantia de tempo de produção foi inferido. Próximo: leases,
resultado incerto e recuperação da outbox.
