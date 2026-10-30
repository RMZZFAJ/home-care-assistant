# B7.6 — Observabilidade, saúde e detecção

## Controles existentes e limites

Há health do scheduler: `private.scheduler_health` registra last_run e
processed; RPC `scheduler_health()` permite leitura administrativa autorizada.
Há cursor BAL com updated_at, cron.job_run_details, estados/tentativas de outbox
e respostas pg_net. A hipótese de ausência total de sinais foi refutada. Não foi
encontrado consumidor da RPC de health, endpoint dedicado de readiness,
heartbeat completo do worker ou alerta operacional no código/configuração
versionados examinados. Não se infere ausência de toda ferramenta fora do repo.

Erros HTTP já registram operation, código seguro e correlationId, devolvido no
header e na resposta, com no-store. Isso ajuda a correlacionar uma falha sem
logar paciente, payload, SQL ou segredo. Não retirar essa minimização para
adicionar métricas. O fluxo de sucesso retorna contadores claimed/skipped/etc.;
não há registro durável de invocação com início/fim/duração/candidato/SHA que
confronte esses contadores com backlog elegível e idade por paciente.

## Fotografia de leitura local/remota

`evidence/observability-metadata.json` e seu SQL retêm somente agregados:

- Remoto: dois jobs ativos por minuto; 1.440 sucessos por job nas 24h
  consultadas e zero falhas registradas nesse intervalo. Health com last_run
  recente e processed=0 no instante; cursor BAL atualizado.
- Remoto pg_net: 360 respostas HTTP 200, sem timeout, na janela de 6h. Demonstra
  resposta do destino invocado, não entrega Meta nem conclusão de cada tarefa.
  URL/bearer existem por nome no Vault; seus valores não foram lidos.
- Remoto outbox: 208 internos delivered e um cancelled; nenhuma lease expirada
  na agregação observada. Não foi demonstrada estagnação remota nesse instante.
- Local: job do worker também registra sucesso, mas Vault não tem URL/bearer,
  fila HTTP está vazia e não há resposta pg_net. O invocador retorna sem enviar
  quando o par não é válido; cron success não demonstra worker chamado.
- Local: 465 leases antigas expiradas (463 internas/duas WhatsApp) e 21 pending
  WhatsApp já existiam no conjunto sintético. Não são incidente produtivo nem
  foram criadas/limpas pela B7. Nenhum claim/retry foi executado para a prova.

Contraprova de disponibilidade atual deve ser preservada: o remoto tem invocação
HTTP respondendo e entrega interna registrada. A lacuna OBS-REUSE é detecção de
progresso e resposta operacional; não é diagnóstico de outage.

## Matriz mínima de sinais e ação

- **Aplicação**. **Sinal já acessível:** Status do deploy, erro/correlação.
  **Lacuna / condição a distinguir:** Login 200 versus processos indisponíveis.
  **Ação e dono propostos:** Smoke de leitura e dependências; release.
- **DB/Auth**. **Sinal já acessível:** Erros seguros e métricas de plataforma.
  **Lacuna / condição a distinguir:** Expiração de sessão versus
  indisponibilidade. **Ação e dono propostos:** Testar jornada aprovada;
  acesso/infra.
- **Lifecycle**. **Sinal já acessível:** last_run/processed e cron. **Lacuna /
  condição a distinguir:** Executou com zero elegíveis versus lote sem
  progresso. **Ação e dono propostos:** Idade de elegíveis e watermark por
  paciente; operação.
- **BAL**. **Sinal já acessível:** Cursor/updated_at e obrigações. **Lacuna /
  condição a distinguir:** Cursor moveu versus atribuição correta. **Ação e dono
  propostos:** Conferir ciclo/atraso/ação pendente; família/supervisão.
- **Worker**. **Sinal já acessível:** HTTP e estados de jobs. **Lacuna /
  condição a distinguir:** Invocou, reservou, completou, persistiu ou expirou.
  **Ação e dono propostos:** Contadores por execução e aging;
  técnico/comunicação.
- **Outbox**. **Sinal já acessível:** state, attempts, last_error, lease e
  datas. **Lacuna / condição a distinguir:** pending legítimo, hold, uncertain e
  retry vencido. **Ação e dono propostos:** Fila por causa/prazo, referência
  segura; operador.
- **Meta**. **Sinal já acessível:** Referência/status/callback no DB. **Lacuna /
  condição a distinguir:** accepted versus delivered/read, callback antigo.
  **Ação e dono propostos:** Conciliação preservando tentativas; comunicação.
- **Storage/PDF**. **Sinal já acessível:** Erros e hashes/metadados. **Lacuna /
  condição a distinguir:** Objeto ausente, divergente ou cache sem conferência.
  **Ação e dono propostos:** Inventário/hash e retenção; recuperação.
- **Backup**. **Sinal já acessível:** Manifesto/data/hash/TOC. **Lacuna /
  condição a distinguir:** Cópia recente versus restaurável e off-site. **Ação e
  dono propostos:** Rotina verificável e ensaio; backup/DR.
- **Segurança**. **Sinal já acessível:** Recusas e controle de sessão. **Lacuna
  / condição a distinguir:** Uso indevido versus sessão revogada em janela.
  **Ação e dono propostos:** Auditar agregado sem dados privados; segurança.

Os limiares de idade, falha, backlog e latência precisam refletir o prazo de
cada processo. A B7 não inventa p95, RPO/RTO ou tempo de reação de produção.
Antes de operação, cada sinal precisa de responsável, substituto, periodicidade,
canal de aviso, prazo, reconhecimento e evidência de resolução. Uma consulta
manual com escala acordada pode ser suficiente no piloto; não exige contratar
plataforma adicional antes de demonstrar a necessidade.

## Por que HTTP 200 não basta

DB-002/B3-001 já demonstrou REQs terminais ocupando o lote e impedindo outras
REQs de avançar. A função pode terminar e atualizar health, sem alcançar a
pendência relevante; não repetimos o teste de starvation. Contagem global zero
não separa ausência de trabalho de seleção injusta. BE-003/B3-016 ainda limita o
orçamento temporal do worker; o status da requisição não prova que todas as
conclusões foram persistidas antes do fim da lease.

B5-013/014 tratam correlação de tentativa e insuficiência da tela para
conciliar. Na B7, esses achados se tornam dependências da resposta a incidentes.
Métrica ou alerta sem capacidade de localizar e resolver a pendência não fecha o
ciclo.

## Aceitação e limites

Induzir em futuro ambiente autorizado: cron parado, chamada recusada, HTTP 200
sem avanço, lease vencida, configuração ausente, Storage/PDF indisponível e
callback atrasado. Medir detecção, responsável avisado, contenção, reconciliação
e retorno; preservar no-store e ausência de payload privado. Não foi induzida
falha remota nem entregue alerta real nesta fase. Acesso a logs completos,
retenção efetiva e receiver externo não foi usado como substituto de aceite.
