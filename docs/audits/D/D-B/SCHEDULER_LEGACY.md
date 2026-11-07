# D5.3 — lembretes legados e períodos perdidos

Base4016105. Migration20261107213013 aplicada local/remoto145, sem reset.
O agendador mantém operational_reminders e enqueue_notice como produtores.
Não cria motor paralelo de obrigação e não desativa mecanismo legado.

## Rotação e diagnóstico

Configurações sem destinatário BAL e com shift desligado não ocupam o lote.
Cursor privado rotativo processa até100 configurações por rodada, dentro da
mesma transação dos efeitos. Sobreposição de workers é serializada. Rollback
conserva cursor e lembretes. O caso com101 configurações alcança todas em três
rodadas, sem duplicar usuário/tipo/período. A contraprova anterior alcançou95/101.

Uma configuração malformada gera diagnóstico técnico isolado, com fingerprint,
SQLSTATE, tentativas e intervalo de falha; não armazena payload ou nomes. Os
demais pacientes avançam. Recuperação preserva o histórico da falha. Tabelas e
view privadas têm RLS/sem grants diretos; helper não pode ser chamado por clientes.
O RPC de serviço existente conserva assinatura/grants e acrescenta contadores
legacyReminderPatients, legacyReminderFailures e legacyReminderGaps.

## Política implementada para períodos perdidos

A opção técnica conservadora mantém os dois legados. BAL legado funciona somente
sem regime BAL moderno habilitado; programação por plantão mantém seu produtor.
Shift usa destinatário atual autorizado, dia e horário configurados, em Brasília.
Não há ciência, presença, contagem ou estoque automático.

Na primeira observação não há prova da vigência histórica: processa somente o
dia corrente. Nas seguintes, configuração com fingerprint, versão e updated_at
iguais permite recuperar até sete datas por visita, avançando o checkpoint até
alcançar o presente. Dia corrente continua sujeito ao horário e à deduplicação.
Uma ausência D→D+1 recupera o período original uma única vez, sem trocar sua data.

Mudança de versão/data, mesmo com fingerprint igual, não prova destinatários
anteriores. O intervalo não coberto vira lacuna técnica policy_changed. Falha
prolongada corrigida conserva intervalo invalid_configuration. Não se aplicam
destinatários de hoje retroativamente e não se escondem os períodos desconhecidos.
Essas lacunas exigem revisão técnica posterior; não são nova obrigação clínica.

## Provas e limites

16/16 casos passaram: seis novos de serviço/Auth, nove consumidores pessoais de
referência e o scheduler REQ concorrente existente. Cobrem101, D→D+1, backlog de
22 datas, concorrência, rollback, política inválida/recuperada, mudança de versão,
BAL moderno e ausência de ciência/contagem fabricada. O consumidor Auth recuperou
a referência passada original, sem marcar resposta ao ler.

Preflight revertido exerceu efeitos/recuperação e grants. Ambiguidade de alias
foi corrigida antes de aplicar. Primeira fixture usou enum presumido e falhou
antes do mecanismo; a contraprova material95/101 está separada. Nenhuma migration
aplicada foi alterada. [Provas](D5_3_EVIDENCE.json) e
[pós-validação remota](D5_3_REMOTE_MIGRATIONS.json).

Não há nova tela neste lote. Conciliação/suporte e observabilidade globais ainda
precisam de consumidor próprio em OPS.3; contadores de worker não são uma central
de incidentes. CI do novo SHA e gates D-C/D6 permanecem separados.
