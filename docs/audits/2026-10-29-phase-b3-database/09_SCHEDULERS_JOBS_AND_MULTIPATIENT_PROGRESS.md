# Jobs, progresso e recuperação

## Cadeia real

Cron de minuto → scheduled_operations → run_operational_schedule → lifecycle
REQ/ENT → lembretes legados → BAL rotativo → entrega interna. Outro cron lê
URL/bearer do Vault e invoca o worker HTTP somente quando configurado. O worker
autentica segredo, executa scheduler e depois claim/validate/prepare/send/
complete. Aceitação do provedor, delivered/read e seen_at são fatos separados.

O baseline local tem dois jobs ativos, mas não URL/bearer configurados nem
fila HTTP. Nenhuma invocação de provedor foi feita. Sete cenários B39 usam
novas fixtures SQL e rollback; simulam contexto de serviço, sem afirmar prova
de autenticação HTTP. O retry administrativo usa sessão Auth real B3. Os
contratos de serviço/assinatura e configuração remota não são certificados.

## DB-002 aprofundado: dois limites diferentes

B39-01 confirmou novamente25 pacientes com REQs canceladas mais outro
elegível. Três chamadas criaram zero lembretes do alvo. O grupo de pacientes é
selecionado antes de excluir canceladas; ao encontrar cancelled o loop continua
sem mover next_reminder_at. As mesmas candidaturas ocupam25 vagas em todas as
chamadas. Mover somente os25 candidatos sintéticos para fora do vencimento
permitiu o evento do alvo na chamada seguinte. Todo o ensaio foi rollback.

B39-02 demonstrou uma manifestação adicional: um único paciente com 100 REQs
canceladas antigas bloqueou sua REQ elegível de posição101 por três chamadas.
O limite interno100 também é consumido antes de filtrar cancelled. O controle
com somente esses candidatos novos afastados permitiu o evento. Não são dois
achados independentes; a mesma causa afeta limites25 e100. A seleção pode
prejudicar também ENT, que compartilha o conjunto de pacientes selecionado.

O scheduler continuou retornando contagens BAL e health.last_run atualizado,
embora a capacidade REQ estivesse sem progresso. Portanto sucesso de execução
e progresso útil por paciente precisam de observabilidade distinta. DB-002
permanece P1 para depender dessa automação multipaciente; não significa que
todo paciente já esteja afetado nem autoriza limpar canceladas em produção.

## DB-006 passa de risco a reprodução local

B39-03 criou110 configurações novas elegíveis à consulta, mas sem trabalho,
seguidas de um paciente com lembrete de plantão válido. Três chamadas da função
legada não produziram o lembrete. A consulta limita100 settings sem cursor,
ordenação ou atualização que obrigue progresso. A unicidade evita duplicação
dos já processados, mas não faz avançar o lote. Retirar somente as110 fixtures
novas do predicado permitiu o alvo. Tudo foi rollback.

É a causa A DB-006 agora confirmada no estado local, não uma nova descoberta
independente. Afeta lembretes legados selecionados por settings; não deve ser
generalizada ao BAL por plantão, cujo cursor foi testado separadamente.

## BAL oferece contraprova concreta

B39-04 acrescentou101 regimes fictícios. Primeiro lote alcançou84 deles na
presença dos regimes anteriores; o segundo alcançou101; terceiro manteve101
obrigações, sem duplicação. Cursor por UUID faz rotação e processamento confirma
junto com avanço. Erro deliberado depois de um lote, capturado em subtransação,
desfez cursor e eventos desse lote. Não foram fabricados profissionais,
presença ou contagens físicas. Essas garantias devem ser preservadas ao
corrigir os outros schedulers; não substituir todos por uma fila genérica.

## Leases e resultados concorrentes

B39-05: lease interno vencido voltou a pending e foi reservado; lease externo
vencido virou uncertain e não foi reenviado. Destinatário revogado virou
cancelled. Worker incorreto não concluiu lease alheio. Retry uncertain sem
confirmação foi recusado; confirmação explícita permitiu pending/attempts0.
Isso não é prova de conciliação humana com provedor real.

B39-06: callback read antecipado e repetido preservou um registro; callbacks
delivered/accepted tardios não rebaixaram read. Conclusão atrasada do worker
foi recusada por lease perdido e não sobrescreveu o callback. seen_at continuou
independente. SQL de webhook local não comprova assinatura/canal externo.

Claim usa prioridade, next_attempt_at, SKIP LOCKED e limite de tentativas;
wrapper recupera até três deadlocks de lote abortado. Entrega interna conclui
ou cancela registros e avança sua seleção. Deadlock real não foi induzido.
BE-003 permanece: dois requests externos sequenciais de até 15s por job e lotes
de 50/concorrência10 podem exceder120s. B3 leu o contrato vigente, mas não
repetiu o relógio virtual A nem mediu provedor; não declarar esse risco fechado.

## Falha intermediária e dados legados inválidos

B39-07 inseriu somente numa fixture owner com rollback uma política legada
malformada. Três chamadas abortaram antes de persistir lembretes e health não
avançou. Atomicidade correta não oferece isolamento de registro venenoso nem
registro durável de falha dentro da transação que aborta. É risco sustentado
de recuperação de legado/configuração privilegiada, sem exploração pela API:
o contrato público valida esse campo e recusa o valor malformado.

Antes da operação real: provar cron/credenciais/destinos, backlog por domínio,
idade máxima de tarefa, execução fracassada, lease expirado, estado incerto,
procedimento de conciliação e contingência manual com responsável. Outbox
persistido não é entrega externa, e cron agendado não é garantia de progresso.
Nenhuma regra, job, Vault, fila ou dado remoto foi alterado.
