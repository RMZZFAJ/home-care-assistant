# Registro mestre de achados

Base: `37cb7f85e96e551d6419871f94dd950712e2565b`. Fase A investigativa.

O CSV e este documento contêm os 36 campos completos do protocolo.
Natureza e status distinguem defeito confirmado, hipótese, risco e oportunidade;
prioridade não converte hipótese em fato. Defeito estático pode estar confirmado
pela leitura do contrato, sem reprodução runtime; o campo evidência delimita
o método. Nenhum achado foi corrigido no produto nesta fase.

## Prioridades e escopo

- P0: 0.
- P1: 2.
- P2: 21.
- P3: 9.

DB-002 bloqueia a promessa de automação multipaciente no cenário demonstrado;
UX-001 bloqueia aprovação informada de mudanças de escala. Não equivalem a
perda de dados ou bypass de autorização. Recomendações de limpeza têm condições
de compatibilidade e não autorizam remoções. DB-005 e BE-006 exigem medição antes
de otimização e foram classificados P3 pela revisão coordenada.

## DB-002 — P1

**ID:** DB-002

**Título:** Requisições canceladas vencidas podem ocupar indefinidamente o
lote do lifecycle

**Natureza:** DEFECT_CONFIRMED

**Domínio:** Agendamento e notificações

**Prioridade:** P1

**Confiança:** CONFIRMED

**Estado:** CONFIRMED_LOCAL_PRIORITY_SCOPED

**Persona:** Família, recebedores e administradores de pacientes posteriores
no lote

**Jornada:** Receber lembretes e arquivar automaticamente requisições
concluídas

**Resumo:** O scheduler seleciona 25 pacientes pela menor data vencida,
incluindo lifecycle de REQ canceladas. Depois encontra cancelled e usa
continue sem remover ou avançar a candidatura.

**Observado:** Root executou26pacientes:25REQ canceladas antigas +1REQ válida.
Após3rodadas reminders0 e cancelled_still_due25. Controle removeu apenas
candidaturas canceladas: quarta rodada reminders1 e control_live_reminders1.
Rollback final.

**Esperado:** Trabalho terminal não deve impedir progresso de outros pacientes
entre execuções periódicas.

**Reprodução e alcance:** evidence/probe-lifecycle-cancelled.sql executado
pelo root com sessões Auth oficiais e rollback. Logs em
evidence/db-lifecycle-probe.log. Cancelamentos foram feitos por
transition_requisition_status, não apenas status forjado.

**Evidência:**
supabase/migrations/20261023073958_v4_verification_corrections.sql:314-336;
supabase/migrations/20261023044520_v4_event_routing_and_scheduled_reminders.sql:203-207;
supabase/migrations/20261025214537_balance_scheduler_rotation.sql:26;
evidence/database-metadata.log; evidence/db-lifecycle-probe.log

**Arquivos:**
supabase/migrations/20261023073958_v4_verification_corrections.sql;
supabase/migrations/20261025214537_balance_scheduler_rotation.sql;
src/app/api/requisitions/\[id\]/status/route.ts

**Rotas:** /historico/\[id\]

**Componentes:** Lembretes e progresso de requisição

**API:** transition_requisition_status; run_operational_schedule

**Objetos de banco:** requisition_lifecycle; operational_documents;
v4_lifecycle_schedule; fluent_pre_shift_scheduler

**Causa:** A seleção limitada não exclui estado terminal e o tratamento
terminal não avança a fila.

**Impacto humano:** Pessoas deixam de receber lembretes de materiais ou
conferência sem indicação de indisponibilidade.

**Impacto técnico:** Starvation persistente reproduzido da26ªREQ; a seleção
comum também contém candidatos ENT e archive, cujo bloqueio individual não foi
executado separadamente.

**Impacto operacional:** Falha silenciosa da automação sob distribuição
específica de dados, embora cron continue registrando execução.

**Segurança e integridade:** Disponibilidade operacional; sem alteração
incorreta de estoque demonstrada.

**Contingência:** Acompanhamento manual de pendências até confirmar e corrigir
o scheduler; evitar edição direta de eventos.

**Recomendação:** Selecionar apenas trabalho executável, revalidar estado após
locks e testar progresso entre lotes. Saúde deve informar idade do backlog,
não apenas last_run.

**Alternativas:** Cursor justo com remoção de estados terminais; filas por
tipo; ambos exigem preservar limites e idempotência.

**Invariantes:** Sem lembretes de cancelados, sem arquivar incompletos, sem
inventar ciência ou recebimento, lote limitado e progressivo.

**Dependências:** Monitoramento de operação multipaciente e futura correção
incremental

**Esforço:** S/M

**Risco de regressão:** MÉDIO: ordenação de locks e limites do cron

**Critérios de aceite:** 25 pacientes com REQ canceladas não bloqueiam o
paciente26; ENT e arquivos automáticos elegíveis avançam; execuções repetidas
não duplicam eventos.

**Testes necessários:** Regressão 25+1 com cancelamentos reais via RPC, vários
pedidos no mesmo paciente, backlog de ENT e concorrência
scheduler/cancelamento

**Decisão humana:** P1 para confiança na automação multipaciente sob cenário
demonstrado; não afirmar que paciente único ou todos os ambientes já estão
afetados.

**Contraditório:** Migration63 corrigiu seleção de trabalho
concluído/histórico, porém manteve cancelled fora do filtro. Migration84
corrige rotação BAL e ainda chama lifecycle anterior. Teste fairness atual
exercita somente regimes BAL.

**Resultado do contraditório:** Confirmado localmente em3execuções repetidas e
controle positivo na4ª; rotação BAL permaneceu ativa e não evitou o bloqueio
lifecycle.

## UX-001 — P1

**ID:** UX-001

**Título:** Aprovação de alteração de plantão não apresenta os dados que serão
aplicados

**Natureza:** DEFECT_CONFIRMED

**Domínio:** UI_UX

**Prioridade:** P1

**Confiança:** CONFIRMED

**Estado:** OPEN

**Persona:** Administrador do paciente; familiar autorizado a gerir escala

**Jornada:** Revisar proposta de alteração de plantão

**Resumo:** A lista apresenta somente o motivo e o diálogo pede revisar
período e profissional sem exibir esses valores.

**Observado:** c.reason é o único resumo da mudança. A decisão envia c.id,
approve=true e motivo fixo. O contrato contém shift_id, professional_id,
proposed_professional_id, starts_at e ends_at.

**Esperado:** Antes de aprovar, identificar o plantão, solicitante,
profissional anterior/proposto, datas, horas, fuso e consequências para BAL.

**Reprodução e alcance:** Confirmado em Chromium local como adminA: proposta
07h–19h para 08h–20h em 10/11/2026; lista só mostra motivo; diálogo1440/390px
não exibe pessoa/data/horas. Nenhuma decisão foi aplicada pelo navegador.
Reprodutores: evidence/ui-runtime.mjs e evidence/ui-runtime-ready.mjs; somente
stack local verificada.

**Evidência:** src/components/schedules/schedule-console.tsx:61;
src/components/schedules/schedule-console.tsx:66; src/types/schedules.ts:4;
docs/audits/2026-10-25-production-readiness/evidence/ui-scale-review-390.png;
docs/audits/2026-10-25-production-readiness/evidence/ui-runtime.json

**Arquivos:** src/components/schedules/schedule-console.tsx;
src/types/schedules.ts

**Rotas:** /escalas

**Componentes:** Não aplicável.

**API:** Não aplicável.

**Objetos de banco:** Não aplicável.

**Causa:** O read model da proposta é reduzido ao motivo no render e não é
preservado no objeto de revisão.

**Impacto humano:** O aprovador precisa decidir sem a informação operacional
necessária; o texto afirma revisão que a tela não possibilita.

**Impacto técnico:** Contrato de autorização/transação não é declarado
defeituoso por este achado.

**Impacto operacional:** Risco de programação equivocada e responsabilidade
deslocada, sem alegar que o banco aceita sobreposição ou desrespeita aprovação
familiar.

**Segurança e integridade:** Não constitui demonstração de bypass de
autorização; avaliar impactos de decisão no domínio correspondente.

**Contingência:** Consultar solicitante por canal externo e rejeitar propostas
não compreendidas. Não existe revisão equivalente dentro da tela.

**Recomendação:** Exibir diff de negócio e consequências antes de confirmar;
usar motivo de aprovação informado ou texto que não alegue revisão
inexistente.

**Alternativas:** Drawer de revisão da proposta, ligado à ocorrência original;
Resumo expandido na lista mais confirmação contextual

**Invariantes:** Autorização servidor e paciente explícito; Preservação
documental, versões e idempotência; Não incluir quantidade solicitada em REQ

**Dependências:** Validação runtime quando indicada; Revisão do domínio antes
de implementação

**Esforço:** M

**Risco de regressão:** Médio; preservar autoridade, concorrência e
recuperação.

**Critérios de aceite:** O aprovador vê a identidade do plantão e antes/depois
de pessoa, período e fuso; Mudanças de horário e substituição têm resumos
diferentes; Aprovação e rejeição preservam versão, idempotência e autoridade

**Testes necessários:** E2E gestor aprova proposta após ler valores concretos
em desktop e390px; E2E proposta com alteração de pessoa/período e conflito409

**Decisão humana:** Definir resumo de impactos do BAL e política para
aprovação de múltiplas ocorrências.

**Contraditório:** A agenda mostra a programação publicada e séries propostas,
mas a alteração pontual não se aplica antes da aprovação. O contrato já
retorna os valores. Autoridade transacional não substitui compreensão humana.
Runtime: Confirmado em Chromium local como adminA: proposta 07h–19h para
08h–20h em 10/11/2026; lista só mostra motivo; diálogo1440/390px não exibe
pessoa/data/horas. Nenhuma decisão foi aplicada pelo navegador.

**Resultado do contraditório:** CONFIRMED_AFTER_CHALLENGE

## BE-001 — P2

**ID:** BE-001

**Título:** Relato antigo pendente desaparece da consulta de consumo

**Natureza:** DEFECT_CONFIRMED

**Domínio:** Consumo e recuperação

**Prioridade:** P2

**Confiança:** CONFIRMED

**Estado:** OPEN

**Persona:** Familiar, supervisora e profissional

**Jornada:** Relatar consumo/falta; conferir pendência; abrir aviso antigo

**Resumo:** A API retorna os 100 relatos mais recentes sem paginação ou filtro
de pendentes. A tela não usa o ref enviado pelas notificações e não possui
consulta individual alternativa.

**Observado:** GET ordena created_at desc e aplica limit(100), sem
count/cursor. ConsumptionConsole carrega apenas essa lista. notificationHref
gera /consumo?ref=ID, mas a tela ignora ref.

**Esperado:** Toda pendência autorizada e referência histórica deve continuar
recuperável, independentemente de quantos relatos posteriores existam.

**Reprodução e alcance:** No local, criar um relato ainda reported e 100
relatos posteriores. Abrir /consumo e o link /consumo?ref=ID do primeiro: a
consulta não pode devolver o antigo. Reprodução com 101 registros não
executada por esta frente; limite e ausência de consumidor de ref confirmados
em código e leitura cruzada da UI.

**Evidência:** src/app/api/consumption/route.ts:38-52;
src/components/stock/consumption-console.tsx:59-64;
src/lib/notifications/navigation.ts:22-33; src/app/api/dashboard/route.ts:57

**Arquivos:** src/app/api/consumption/route.ts;
src/components/stock/consumption-console.tsx;
src/lib/notifications/navigation.ts; src/app/api/dashboard/route.ts

**Rotas:** /consumo

**Componentes:** ConsumptionConsole

**API:** GET /api/consumption

**Objetos de banco:** consumption_reports; operational_tasks

**Causa:** Uma janela limitada de registros recentes foi usada como fila
completa e destino de deep link.

**Impacto humano:** A pessoa vê pendência no painel ou aviso, mas não encontra
o registro para agir.

**Impacto técnico:** Contrato não oferece total, cursor, status ou detalhe por
ID.

**Impacto operacional:** Pendência pode permanecer indefinidamente sem acesso
pela experiência normal.

**Segurança e integridade:** Não demonstra perda de dados nem bypass;
autorização deve continuar em todas as consultas futuras.

**Contingência:** Conferir relatos antes de acumularem 100 posteriores; para
pendência já omitida, suporte autorizado pode localizar via consulta restrita.
Não alterar saldo diretamente.

**Recomendação:** Oferecer fila paginada/filtro de pendentes e consulta
individual autorizada; aplicar ref para abrir ou destacar o registro sem
depender da página atual.

**Alternativas:** Primeiro separar pendentes e concluídos com paginação;
depois acrescentar busca histórica.

**Invariantes:** Relato não é débito; paciente e capacidades revalidados; não
misturar escopos.

**Dependências:** Contrato HTTP e navegação da tela

**Esforço:** Médio

**Risco de regressão:** Médio: filtros e mudança de paciente

**Critérios de aceite:** Com mais de 100 relatos posteriores, pendente antigo
é localizável e concluível; deep link abre o alvo correto; outra
identidade/paciente recebe negação.

**Testes necessários:** Integração com 101 registros; E2E deep link, paginação
e contexto; histórico de concluídos.

**Decisão humana:** Definir retenção e apresentação histórica, sem usar
retenção como desculpa para ocultar pendências.

**Contraditório:** Procurados detalhe alternativo, uso de ref,
filtros/paginação e caminho do dashboard. Agente de UI confirmou ausência
desses consumidores.

**Resultado do contraditório:** CONFIRMED_AFTER_CHALLENGE

## BE-002 — P2

**ID:** BE-002

**Título:** Resumo WhatsApp usa data e contadores com significado incorreto

**Natureza:** DEFECT_CONFIRMED

**Domínio:** Notificações e conteúdo operacional

**Prioridade:** P2

**Confiança:** CONFIRMED

**Estado:** OPEN

**Persona:** Familiar e supervisora

**Jornada:** Receber atualização ENT; decidir revisão de BAL

**Resumo:** O mapa genérico de parâmetros usa data de criação para
atualização/cancelamento e issueOpen de ENT para contar diferenças BAL.

**Observado:** Probe de ent.resolve mostra 20/10 07:00 na mensagem cujo evento
ocorreu 22/10 11:00. Probe BAL com quantidade 3 e referência 10 produz
itens_divergentes=0, embora itens_ajustados=1.

**Esperado:** Cada rótulo da mensagem deve corresponder ao fato daquele
evento; diferença BAL compara contagem e referência, não estado de divergência
ENT.

**Reprodução e alcance:** Executar node node_modules/vitest/vitest.mjs run
--config
docs/audits/2026-10-25-production-readiness/evidence/backend-probes.config.mts.
Os dois probes exercitam prepareDocumentNotification real com payloads
fictícios e template aprovado simulado.

**Evidência:** evidence/backend-probes.log; evidence/backend-probes.test.ts;
src/lib/notifications/document-notification.ts:178-211;
src/lib/notifications/template-catalog.json:778;
src/lib/notifications/template-catalog.json:1042;
supabase/migrations/20261022085111_operational_completion_and_authenticated_reviews.sql:174

**Arquivos:** src/lib/notifications/document-notification.ts;
src/lib/notifications/template-catalog.json; tests/template-registry.test.ts

**Rotas:** Não aplicável.

**Componentes:** prepareDocumentNotification

**API:** /api/notifications/worker

**Objetos de banco:** notification_document_payload; document_events;
document_lines

**Causa:** Parâmetros compartilhados entre eventos com semânticas distintas,
sem testes dos valores finais por tipo de documento.

**Impacto humano:** Mensagem aparentemente precisa orienta a revisão com data
ou número incorreto.

**Impacto técnico:** Payload canônico correto é apresentado de forma incorreta
pelo presenter.

**Impacto operacional:** Familiar pode interpretar que não há diferença a
revisar ou localizar o dia errado.

**Segurança e integridade:** Não modifica o ledger nem prova envio real
incorreto; falha reproduzida antes do transporte.

**Contingência:** Manter canal desabilitado até homologar conteúdo, ou
conferir detalhes no aplicativo antes de decidir.

**Recomendação:** Definir presenter por evento/tipo com timestamp e ator do
evento, diferenças BAL numéricas e testes dos parâmetros renderizados.

**Alternativas:** Reduzir resumo externo a aviso neutro e link até suportar
todos os campos corretamente.

**Invariantes:** Aceitação externa não é entrega;
aprovação/contagem/atendimento permanecem fatos separados; snapshots
imutáveis.

**Dependências:** Mapeamento SQL do evento e contrato dos templates

**Esforço:** Médio

**Risco de regressão:** Médio: templates aprovados exigem compatibilidade

**Critérios de aceite:** ENT criada e atualizada em dias diferentes comunica
data correta; BAL igual/diferente da referência informa contador correto;
autoria é a do evento; nenhum campo obrigatório fica ausente.

**Testes necessários:** Tabela de eventos × payload × valores esperados;
homologação externa posterior com dados fictícios.

**Decisão humana:** Aprovar linguagem final e nível de detalhe externo.

**Contraditório:** Verificado que notification_document_payload devolve
snapshot do evento e que BAL salva expectedQuantity; issueOpen é produzido no
fluxo ENT. Probes independentes reproduzem os dois erros sem rede.

**Resultado do contraditório:** CONFIRMED_AFTER_CHALLENGE

## BE-003 — P2

**ID:** BE-003

**Título:** Lote permitido do worker pode ultrapassar o próprio prazo

**Natureza:** RISK_SUPPORTED

**Domínio:** Confiabilidade de notificações

**Prioridade:** P2

**Confiança:** STRONG

**Estado:** OPEN

**Persona:** Administrador e operador

**Jornada:** Processar fila de mensagens com PDF

**Resumo:** O limite 50 e concorrência 10 permitem cinco ondas de upload e
envio sequenciais. Dois sucessos de 14 segundos por job exigem 140 segundos,
acima de maxDuration e lease de 120 segundos.

**Observado:** Probe com relógio virtual e transporte local simulado terminou
50 jobs em 140000 ms. O comentário afirma que o lote cabe em dois minutos, mas
considera implicitamente apenas uma chamada de 15s por job.

**Esperado:** Trabalho reservado deve respeitar prazo efetivo de
execução/lease, incluindo preparo, upload, envio e finalização.

**Reprodução e alcance:** Terceiro probe em evidence/backend-probes.test.ts;
não exerce lease real, rendering real, rede nem ambiente externo.

**Evidência:** evidence/backend-probes.log;
src/lib/notifications/worker.ts:107-110;
src/lib/notifications/provider.ts:144-178;
src/app/api/admin/notifications/route.ts:19-24;
supabase/migrations/20261020002900_alert_custody_routing_and_priority.sql:93

**Arquivos:** src/lib/notifications/worker.ts;
src/lib/notifications/provider.ts; src/app/api/admin/notifications/route.ts;
src/app/api/notifications/worker/route.ts; tests/api/worker.test.ts

**Rotas:** Não aplicável.

**Componentes:** processNotifications; MetaWhatsAppProvider

**API:** POST /api/admin/notifications; POST /api/notifications/worker

**Objetos de banco:** claim_notification_jobs; validate_notification_job;
complete_notification_job

**Causa:** Dimensionamento de lote baseado em número de jobs, sem deadline por
custo variável e duas operações HTTP sequenciais.

**Impacto humano:** Processamento manual pode terminar sem confirmação de toda
a fila.

**Impacto técnico:** Jobs reservados podem expirar antes do envio/finalização;
recuperação pode exigir conciliação.

**Impacto operacional:** Acúmulo ou atraso em canal externo sob latência alta.

**Segurança e integridade:** Duplicação ou perda real não demonstrada;
revalidação e estado incerto limitam reenvio cego.

**Contingência:** Usar lotes menores e manter acompanhamento pelo aplicativo;
não repetir estados incertos sem conciliação.

**Recomendação:** Aplicar orçamento por prazo restante e reserva proporcional;
considerar preparo e duas chamadas; medir com lease real antes de habilitar
lote máximo.

**Alternativas:** Reduzir limite administrativo enquanto não houver deadline;
worker durável apenas se volume justificar.

**Invariantes:** Não converter timeout em entrega; não reenviar incerto
automaticamente; revalidar destinatário.

**Dependências:** Política de execução/lease e hospedagem

**Esforço:** Médio

**Risco de regressão:** Médio

**Critérios de aceite:** Cenário de50 PDFs com latência alta termina dentro do
prazo ou deixa trabalho não iniciado recuperável, sem duplicação e com estados
explicáveis.

**Testes necessários:** Clock fake com50 jobs; integração lease expirando;
callback antes/depois da conclusão; interrupção de processo.

**Decisão humana:** Definir SLA e volume esperado; não presumir necessidade de
nova infraestrutura.

**Contraditório:** Lote padrão25 reduz exposição; tamanho50 é explicitamente
aceito na API. Dois sucessos de14s não atingem timeout individual e ainda
excedem prazo total. SQL/PDF foram excluídos do probe, tornando estimativa
conservadora.

**Resultado do contraditório:** CONFIRMED_AFTER_CHALLENGE

## BE-004 — P2

**ID:** BE-004

**Título:** Auditoria administrativa só permite consultar os cem eventos
recentes

**Natureza:** OBSERVABILITY_GAP

**Domínio:** Rastreabilidade operacional

**Prioridade:** P2

**Confiança:** CONFIRMED

**Estado:** OPEN

**Persona:** Administrador local, familiar responsável e suporte

**Jornada:** Reconstruir alteração de catálogo, acesso ou regra meses depois

**Resumo:** A seção audit da API limita a cem eventos e não oferece paginação,
intervalo, entidade ou busca; a retenção no banco é maior que a capacidade de
consulta da interface.

**Observado:** GET /api/admin?section=audit usa order(created_at
desc).limit(100) e devolve data sem total/cursor. Ao exceder100 eventos, os
antigos não são recuperáveis por parâmetros da rota.

**Esperado:** Responsável autorizado deve reconstruir um fato anterior com
data, ator e recurso sem acesso direto à base.

**Reprodução e alcance:** Comparar schema da rota e query audit; com101
eventos, o primeiro fica fora de toda resposta dessa seção. Teste com volume
não executado nesta frente.

**Evidência:** src/app/api/admin/route.ts:291-299;
src/app/api/admin/route.ts:308-315

**Arquivos:** src/app/api/admin/route.ts

**Rotas:** /admin?section=audit

**Componentes:** Seção administrativa de auditoria

**API:** GET /api/admin?section=audit

**Objetos de banco:** audit_events

**Causa:** Consulta recente limitada exposta como ferramenta de auditoria
completa.

**Impacto humano:** Operador não consegue responder quem alterou algo no
passado pela aplicação.

**Impacto técnico:** Não há perda demonstrada no banco; falta contrato de
leitura histórica.

**Impacto operacional:** Suporte precisa recorrer a SQL para investigação
ordinária.

**Segurança e integridade:** Adicionar busca deve preservar audit.read, escopo
paciente e redigir metadados sensíveis.

**Contingência:** Consulta restrita por operador autorizado no banco, com
procedimento sanitizado.

**Recomendação:** Paginar auditoria e filtrar por período, ator/ação/recurso,
exibindo correlação e sem despejar payload privado.

**Alternativas:** Exportação autorizada por período pode ser primeira entrega,
mantendo histórico navegável como evolução.

**Invariantes:** Não alterar ou apagar eventos para facilitar leitura; não
ampliar privilégio global.

**Dependências:** Read model administrativo e UI

**Esforço:** Médio

**Risco de regressão:** Médio

**Critérios de aceite:** Evento anterior aos100 recentes é encontrado por
período e recurso; ordenação estável; outro paciente não aparece; dados
internos indevidos não são expostos.

**Testes necessários:** Volume101+ e paginação estável; autorização negativa;
busca e exportação quando implementada.

**Decisão humana:** Definir quais filtros e informações o operador precisa;
retenção é decisão separada.

**Contraditório:** Histórico documental não substitui auditoria de
catálogo/acesso/configuração. Eventos persistidos não foram classificados como
apagados; o achado é a ferramenta de consulta.

**Resultado do contraditório:** CONFIRMED_AFTER_CHALLENGE

## BE-005 — P2

**ID:** BE-005

**Título:** Repetir proposta global após resposta perdida gera outra
identidade de tentativa

**Natureza:** RISK_SUPPORTED

**Domínio:** Administração e recuperação

**Prioridade:** P2

**Confiança:** STRONG

**Estado:** OPEN

**Persona:** Administrador global e administrador local aprovador

**Jornada:** Propor mudança no paciente e recuperar envio incerto

**Resumo:** POST /api/admin gera UUID da proposta no servidor e busca versão
atual. O mesmo corpo repetido recebe nova chave, enquanto a RPC deduplica
somente a chave recebida.

**Observado:** Ramo global chama configure_patient_access com
p_key=crypto.randomUUID(). A deduplicação SQL considera
patient+idempotency_key e não há dedupe do conteúdo equivalente.

**Esperado:** O cliente deve conservar a intenção em uma chave estável e poder
recuperar a proposta já salva após falha de transporte.

**Reprodução e alcance:** Enviar a mesma proposta global duas vezes com o
mesmo corpo, simulando perda da primeira resposta; cada chamada gera nova
chave. Reprodução mutável não executada nesta frente.

**Evidência:** src/app/api/admin/route.ts:323-356;
supabase/migrations/20261023032230_v4_active_authority_and_governance.sql:124-130;
supabase/migrations/20261023032230_v4_active_authority_and_governance.sql:166-167;
supabase/migrations/20261023120000_v4_review_regressions.sql:100-119

**Arquivos:** src/app/api/admin/route.ts;
src/app/api/patient-settings/route.ts

**Rotas:** /admin

**Componentes:** Formulários administrativos no contexto global

**API:** POST /api/admin

**Objetos de banco:** configure_patient_access; access_change_requests

**Causa:** Adaptador administrativo antigo não transporta chave e versão do
cliente para o contrato novo de propostas.

**Impacto humano:** Aprovador pode receber propostas aparentemente iguais e
perder confiança no estado do envio.

**Impacto técnico:** A deduplicação transacional existe mas é inutilizada por
nova chave em cada requisição HTTP.

**Impacto operacional:** Fila duplicada e conflitos posteriores exigem
limpeza/rejeição manual.

**Segurança e integridade:** Não prova dupla aplicação: a segunda aprovação
pode ser bloqueada pela base_version obsoleta. Independência de aprovador
permanece obrigatória.

**Contingência:** Consultar propostas pendentes antes de repetir e rejeitar
duplicatas; não dispensar segunda aprovação.

**Recomendação:** Usar chave gerada/conservada pelo cliente e versão
observada, alinhando a rota ao envelope de patient-settings; oferecer
recuperação da tentativa.

**Alternativas:** Encaminhar mudanças globais ao contrato único de
configurações, mantendo compatibilidade do endpoint antigo até migrar
consumidores.

**Invariantes:** Global propõe; outro administrador local aprova; controle de
versão e paciente não podem ser relaxados.

**Dependências:** Formulários administrativos e contrato de API

**Esforço:** Médio

**Risco de regressão:** Alto: governança exige teste integrado

**Critérios de aceite:** Repetição da mesma tentativa devolve mesmo requestId;
corpo diferente com mesma chave conflita; proposta com versão antiga não é
silenciosamente rebased; autoaprovação continua negada.

**Testes necessários:** Integração HTTP com resposta perdida e retry;
concorrência de propostas; aprovador distinto; conflito de versão.

**Decisão humana:** Nenhuma para preservar idempotência; UX de propostas
duplicadas deve ser definida.

**Contraditório:** Agente de banco verificou cadeia final/wrappers e confirmou
ausência de dedupe por conteúdo. Rebaixado de possível dupla execução para
risco de duplicação da fila porque aprovação revalida base_version.

**Resultado do contraditório:** DOWNGRADED

## DB-001 — P2

**ID:** DB-001

**Título:** Cancelamento ENT com consumo confirmado falha por referência SQL
ambígua

**Natureza:** DEFECT_CONFIRMED

**Domínio:** Estoque e documentos

**Prioridade:** P2

**Confiança:** CONFIRMED

**Estado:** CONFIRMED_LOCAL

**Persona:** Recebedor original e administrador local

**Jornada:** Cancelar entrega aceita após consumo confirmado

**Resumo:** O ramo consent_cancel com consumedQuantity>0 alcança uma consulta
cujo alias e colide com a variável PL/pgSQL e; PostgreSQL rejeita e.body com
SQLSTATE42702.

**Observado:** Root reproduziu via RPC autenticada local: result=column
reference e.body is ambiguous; sqlstate=42702; consumo atual1.000000 e
alocação passada1. A transação foi revertida. O predicado temporal adicional
ainda não foi alcançado.

**Esperado:** Recebedor original deve conseguir conciliar consumo já
confirmado sem falha interna SQL, mantendo estoque e histórico corretos.

**Reprodução e alcance:** Executar evidence/probe-ent-cancel-history.sql pelo
runner autorizado com sessões Auth oficiais. Nova ENT recebe1, confirma
consumo1, administrador pede cancelamento e recebedor consente
consumedQuantity1. Resultado capturado42702. O ramo consumedQuantity0 continua
coberto por teste existente.

**Evidência:**
supabase/migrations/20261022053539_draft_recounts_and_catalogue_contracts.sql:82;
supabase/migrations/20261022053539_draft_recounts_and_catalogue_contracts.sql:217;
evidence/db-ent-probe-captured.log; evidence/db-ent-probe-final.log

**Arquivos:**
supabase/migrations/20261022053539_draft_recounts_and_catalogue_contracts.sql;
src/app/api/documents/\[id\]/route.ts; src/lib/validation/documents.ts

**Rotas:** /fichas/\[id\]

**Componentes:** Conferência/cancelamento de entrega

**API:** POST /api/documents/\[id\] -> supply_document_command

**Objetos de banco:** audited_legacy_supply_command; stock_movements;
document_events; document_lines

**Causa:** Variável e public.document_events declarada na função e alias FROM
public.document_events e usados na mesma consulta do ramo de consumo; e.body é
ambíguo. Além disso, q e delta têm recortes temporais diferentes, hipótese
aritmética ainda encoberta.

**Impacto humano:** Recebedor não consegue finalizar cancelamento legítimo
quando parte aceita foi consumida e registrada; interface recebe erro de
persistência/negócio sem solução operacional correta.

**Impacto técnico:** Erro42702 aborta comando antes de reconciliar; nenhuma
corrupção de estoque demonstrada.

**Impacto operacional:** Documento pode permanecer cancellation_pending sem
solução correta pelo fluxo normal.

**Segurança e integridade:** Não demonstrada corrupção ou acesso indevido. Não
registrar novo consumo artificial como contorno.

**Contingência:** Não há contorno correto genérico no produto para material já
consumido. Manter documento e justificativa; não declarar retorno fictício nem
duplicar consumo.

**Recomendação:** Em futura migration incremental, eliminar colisão entre
variável e alias; depois executar contraditório do cálculo temporal/alocação
para não considerar a resolução sintática suficiente.

**Alternativas:** Alinhar os recortes temporais reduz falso bloqueio, mas
sozinho não prova alocação exclusiva para entregas sobrepostas.

**Invariantes:** Consumo nunca duplicado; estoque nunca negativo; aceite e
eventos históricos imutáveis; consentimento do recebedor original.

**Dependências:** Nova execução dirigida após futura correção autorizada;
decisão de alocação de consumo

**Esforço:** M

**Risco de regressão:** ALTO: compensação de estoque e concorrência

**Critérios de aceite:** consent_cancel com consumo positivo confirmado
executa sem42702; consumedQuantity0 continua funcional; consumo não é
reutilizado entre cancelamentos, nem precisa ser registrado duas vezes; saldos
e eventos permanecem íntegros.

**Testes necessários:** SQL com dois períodos; consumidores simultâneos;
consumo parcial; retorno parcial; produto em duas custódias; HTTP com sessões
Auth reais

**Decisão humana:** Preservar política de consumo real; não usar novo consumo
artificial como contorno. Definir rastreabilidade de alocações após resolver
falha SQL.

**Contraditório:** Definição final confirmada em pg_proc. Root executou
fixture com Auth real; ramo positivo chegou ao comando e falhou42702. E2E/SQL
de retorno integral usam consumedQuantity0 e portanto não contradizem.
Hipótese histórica q-delta não foi observada porque o erro de alias ocorre
antes.

**Resultado do contraditório:** Defeito de recusa confirmado localmente, P2.
Risco aritmético temporal mantido como sub-hipótese pendente; não demonstrada
corrupção ou evasão de permissão.

## DB-003 — P2

**ID:** DB-003

**Título:** Aprovar série proposta após encerrá-la pode republicar ocorrências
canceladas

**Natureza:** OPEN_QUESTION

**Domínio:** Escalas

**Prioridade:** P2

**Confiança:** MODERATE

**Estado:** PENDING_RUNTIME

**Persona:** Gestor de escala e profissional

**Jornada:** Encerrar programação e revisar proposta pendente

**Resumo:** end_series não restringe status da série nem altera proposed;
approve posterior atualiza todas as ocorrências para published, ignorando
ended_on e as ocorrências já cancelled.

**Observado:** schedule_command final permite end_series e approve no mesmo
ramo. Encerramento preenche ended_on; aprovação verifica apenas
ser.status='proposed' e publica todas as linhas. API valida formato e UI de
propostas usa status proposed.

**Esperado:** Encerramento efetivo continua respeitado por decisões
posteriores; ocorrências fora do corte permanecem canceladas.

**Reprodução e alcance:** Profissional propõe série; gestor encerra a partir
de uma data; gestor aprova a série ainda proposta usando versão atual.
Inspecionar ocorrências após cutoff. Não executado.

**Evidência:**
supabase/migrations/20261024221017_schedule_decision_scope.sql:64-80;
src/lib/validation/schedules.ts:10-11;
src/components/schedules/schedule-console.tsx:61

**Arquivos:** supabase/migrations/20261024221017_schedule_decision_scope.sql;
src/lib/validation/schedules.ts; src/components/schedules/schedule-console.tsx

**Rotas:** /escalas

**Componentes:** schedule-console; schedule-forms

**API:** schedule_command; POST /api/schedules

**Objetos de banco:** shift_series; scheduled_shifts; shift_events

**Causa:** Transições de série tratam status agregado e cutoff
independentemente; aprovação reescreve estado de ocorrências sem filtro.

**Impacto humano:** Profissional pode reaparecer em dias que o gestor havia
encerrado.

**Impacto técnico:** Inconsistência entre ended_on e ocorrências publicadas.

**Impacto operacional:** Escala e atribuições BAL podem usar períodos que
deveriam continuar cancelados.

**Segurança e integridade:** Integridade de agenda; requer gestor autorizado,
sem escalada de privilégio.

**Contingência:** Rejeitar proposta encerrada e criar outra válida,
preservando histórico; não aprovar uma série com cutoff sem revisão.

**Recomendação:** Definir máquina de estados para encerrar propostas e filtrar
aprovação pelos limites temporais/estado de cada ocorrência.

**Alternativas:** Proibir end_series em proposed e usar reject; ou suportar
aprovação parcial explicitamente.

**Invariantes:** Não republicar silenciosamente cancelamentos; preservar
eventos; conflito de profissional entre pacientes continua protegido.

**Dependências:** Decisão de produto sobre encerramento de proposta; runtime

**Esforço:** S

**Risco de regressão:** MÉDIO

**Critérios de aceite:** Encerrar e aprovar nunca publica ocorrência posterior
ao corte; UI mostra proposta encerrada corretamente.

**Testes necessários:** RPC end_series->approve/reject; alteração de cutoff;
versão stale; série parcialmente iniciada; impacto BAL

**Decisão humana:** Escolher semântica de encerramento de séries ainda
propostas.

**Contraditório:** Revisadas migrations70/71 e finais até84. Guard BAL78
protege mudança de janela de atribuição ativa; não protege genericamente série
proposta sem atribuição. Exclusion constraint impede sobreposição, mas não
publica automaticamente apenas a parte válida.

**Resultado do contraditório:** Hipótese mantida; sem reprodução runtime ou
visual desta sequência.

## DB-004 — P2

**ID:** DB-004

**Título:** Reservas de anexo abandonadas podem esgotar definitivamente os dez
lugares

**Natureza:** RISK_SUPPORTED

**Domínio:** Storage e evidências

**Prioridade:** P2

**Confiança:** STRONG

**Estado:** STATIC_CONFIRMED_RUNTIME_PENDING

**Persona:** Responsável anexando fotos e comprovantes

**Jornada:** Recuperar upload interrompido

**Resumo:** O limite conta quarantine e ready; reserva é persistida antes de
upload/finalização. Não foi encontrado prazo, cancelamento de reserva ou
coleta de quarantine abandonada.

**Observado:** reserve_attachment conta state<>'rejected' >=10. A API retorna
PERSISTENCE_UNCONFIRMED se não consegue enviar nem baixar o objeto. Retry com
mesma chave recupera a reserva, mas abandono/chave perdida deixa vaga ocupada.

**Esperado:** Interrupções recuperáveis não devem bloquear permanentemente
anexos novos; reservas abandonadas precisam de solução autorizada.

**Reprodução e alcance:** Reservar dez anexos com chaves diferentes sem
completar os uploads; tentar anexar o décimo primeiro. Cenário descrito
estaticamente, não executado.

**Evidência:**
supabase/migrations/20261022043228_communications_attachments.sql:99-110;
supabase/migrations/20261022061251_evidence_idempotency_and_final_contracts.sql:1-20;
src/app/api/attachments/route.ts:93-150

**Arquivos:**
supabase/migrations/20261022043228_communications_attachments.sql;
supabase/migrations/20261022061251_evidence_idempotency_and_final_contracts.sql;
src/app/api/attachments/route.ts

**Rotas:** /fichas/\[id\]

**Componentes:** Upload de evidências

**API:** POST /api/attachments; reserve_attachment; finalize_attachment

**Objetos de banco:** attachments; storage.objects; patient-evidence

**Causa:** Limite de recursos persistentes inclui operações incompletas sem
ciclo de expiração/abandono.

**Impacto humano:** Pessoa pode ficar impedida de incluir comprovante mesmo
sem dez arquivos visíveis utilizáveis.

**Impacto técnico:** Acúmulo de quarantine e reserva de quota por
documento/movimentação.

**Impacto operacional:** Intervenção administrativa necessária para recuperar
documento afetado.

**Segurança e integridade:** Disponibilidade de evidências; não é vazamento de
bucket, que permanece privado.

**Contingência:** Recuperar a mesma tentativa/chave quando preservada. Não
apagar evidências confirmadas.

**Recomendação:** Oferecer cancelamento autorizado de reserva não confirmada e
processo seguro de expiração com idempotência e conciliação de objeto.

**Alternativas:** Limites separados para reservas temporárias e arquivos
prontos, com quota global para impedir acúmulo ilimitado.

**Invariantes:** Arquivo ready e hash/evento nunca apagados silenciosamente;
autorização revalidada; upload tardio não ressuscita reserva expirada.

**Dependências:** Política de retenção/quarentena e UX de recuperação

**Esforço:** M

**Risco de regressão:** MÉDIO: coordenação Storage/banco

**Critérios de aceite:** Dez tentativas abandonadas podem ser
recuperadas/expiradas sem impedir novo anexo legítimo; retry tardio retorna
estado seguro.

**Testes necessários:** Falha antes/depois do upload, aba fechada, chave
perdida, execução concorrente de limpeza/finalização, revogação de acesso

**Decisão humana:** Definir prazo de quarentena e quem pode abandonar uma
tentativa.

**Contraditório:** Migration46 adiciona idempotência e API tenta baixar objeto
existente. Isso cobre retry da mesma chave, não abandono de várias chaves.
Nenhum job de expiração encontrado na cadeia completa.

**Resultado do contraditório:** Lacuna estática confirmada; frequência e
impacto real ainda não medidos.

## DB-006 — P2

**ID:** DB-006

**Título:** Lembretes legados por configuração selecionam sempre um lote sem
cursor

**Natureza:** RISK_SUPPORTED

**Domínio:** Agendamento de lembretes

**Prioridade:** P2

**Confiança:** STRONG

**Estado:** PENDING_RUNTIME

**Persona:** Pacientes com lembretes de plantão ou BAL semanal legado

**Jornada:** Receber lembrete configurado por dia e hora

**Resumo:** enqueue_scheduled_reminders seleciona até100 patient_settings
elegíveis sem ordenar, cursor ou restrição de trabalho ainda não processado.
Idempotência impede duplicação dentro do lote, mas não assegura avanço para
pacientes além dele.

**Observado:** WHERE c.is_active e presença de balReminderUsers/shiftReminder
seguido de limit100. Rodadas posteriores podem retornar os mesmos pacientes.
Migração84 aplica rotação apenas a bal_regimes.

**Esperado:** Todo paciente elegível deve ser alcançado dentro do prazo
documentado, independentemente de quantidade total de configurações.

**Reprodução e alcance:** Configurar101+ pacientes com shiftReminder no mesmo
horário; executar várias rodadas e verificar cobertura. Não executado; ordem
sem ORDER BY não é garantida, portanto não afirmar qual paciente será omitido.

**Evidência:**
supabase/migrations/20261023044520_v4_event_routing_and_scheduled_reminders.sql:187-201;
supabase/migrations/20261024221737_balance_shift_cycles.sql:383-387;
supabase/migrations/20261025214537_balance_scheduler_rotation.sql:26-43

**Arquivos:**
supabase/migrations/20261023044520_v4_event_routing_and_scheduled_reminders.sql;
supabase/migrations/20261025214537_balance_scheduler_rotation.sql

**Rotas:** /admin; /consumo

**Componentes:** Configuração de lembretes

**API:** run_operational_schedule

**Objetos de banco:** private.enqueue_scheduled_reminders; patient_settings;
operational_reminders

**Causa:** Paginação limitada sem critério de progresso entre invocações.

**Impacto humano:** Parte dos usuários pode não receber avisos programados
apesar da configuração válida.

**Impacto técnico:** Cobertura eventual não garantida após100 configurações
elegíveis.

**Impacto operacional:** Problema aparece ao expandir a operação; o teste
atual não excede esse limite específico.

**Segurança e integridade:** Disponibilidade de notificações, sem debitar
estoque.

**Contingência:** Monitorar cobertura individual; não confiar em last_run como
prova de cobertura global.

**Recomendação:** Selecionar apenas lembretes devidos ainda não emitidos ou
adotar cursor persistente e medição de atraso.

**Alternativas:** Unificar agendamento por fila de obrigações, preservando
semântica de plantão e regimes BAL.

**Invariantes:** Uma notificação por destinatário/período; respeito a
preferências; nenhum consumo ou presença inferido do lembrete.

**Dependências:** Volume real de pacientes; confirmação runtime; relação entre
lembrete legado e escala persistente

**Esforço:** S/M

**Risco de regressão:** MÉDIO

**Critérios de aceite:** 101+ configurações elegíveis recebem seus lembretes
em número finito documentado de rodadas, sem duplicação.

**Testes necessários:** 101+ pacientes, inclusão/desativação entre lotes,
horários silenciosos e coexistência BAL opt-in

**Decisão humana:** Definir se o mecanismo legado deve permanecer disponível
após escalas reais.

**Contraditório:** BAL fairness de101 regimes é verde, mas usa tabela/etapa
diferente. A modificação72 só suprime balDay quando regime BAL habilitado; não
adiciona progresso ao shiftReminder legado.

**Resultado do contraditório:** Risco mantido, sem extrapolar sucesso da
rotação BAL para todos os schedulers.

## DB-007 — P2

**ID:** DB-007

**Título:** Invalidation final omite atualização de perfil e proponente global
sem membership

**Natureza:** DEFECT_CONFIRMED

**Domínio:** Sincronização e governança

**Prioridade:** P2

**Confiança:** CONFIRMED

**Estado:** STATIC_CONFIRMED_RUNTIME_PENDING

**Persona:** Usuário em duas sessões e administrador global proponente

**Jornada:** Ver alteração de perfil ou decisão local sobre proposta global em
outra sessão

**Resumo:** A revisão que ordena locks preservou apenas memberships e
row_data.user_id, removendo unions de profiles.id e
access_change_requests.proposed_by.

**Observado:** Trigger profiles continua instalado, mas profiles não tem
care_recipient_id/user_id. Proponente global sem membership também não integra
conjunto final. workspace_revision não avança para essas identidades; fallback
compara a mesma revisão e não detecta a mudança.

**Esperado:** Identidade cujo perfil mudou e autor de proposta devem receber
invalidação privada mesmo sem membership no paciente.

**Reprodução e alcance:** Abrir duas sessões da mesma identidade; alterar nome
numa e observar a outra. Em outro cenário, global sem membership propõe
mudança e admin local decide; observar listagem da sessão global. Sequência
runtime ainda não executada.

**Evidência:**
supabase/migrations/20261023073958_v4_verification_corrections.sql:343-356;
supabase/migrations/20261025164621_notification_claim_conflict_recovery.sql:2-19;
src/components/workspace-sync.tsx:34-55;
src/components/profile-console.tsx:123

**Arquivos:**
supabase/migrations/20261025164621_notification_claim_conflict_recovery.sql;
src/components/workspace-sync.tsx; src/components/profile-console.tsx

**Rotas:** /perfil; /admin

**Componentes:** WorkspaceSync; WorkspaceProvider; ProfileConsole

**API:** GET /api/sync; workspace_revision

**Objetos de banco:** private.invalidate_workspace;
private.workspace_revisions; profiles; access_change_requests

**Causa:** Correção de ordem de locks reescreveu o conjunto de destinatários e
perdeu dois ramos adicionados anteriormente.

**Impacto humano:** Outra sessão pode apresentar nome ou estado de proposta
desatualizados até navegação, refresh ou evento independente.

**Impacto técnico:** Fallback de polling não recupera mudança que não
incrementou revisão; realtime também não foi emitido para o interessado.

**Impacto operacional:** Revisão local pode parecer não concluída para o
proponente global e causar repetição desnecessária de tentativa.

**Segurança e integridade:** Não há bypass demonstrado: authenticate e
autorização do banco revalidam estado;401/403 em sync provocam atualização do
perfil.

**Contingência:** Recarregar/navegar para buscar estado atual; mesma aba de
autoedição dispara hca:profile-updated e mitiga o caso local.

**Recomendação:** Restaurar conjunto completo de destinatários, deduplicado e
ordenado, preservando ordenação determinística de locks.

**Alternativas:** Invalidadores explícitos por entidade, com testes de
conjunto de destinatários e ordem; evitar duplicação de lógica.

**Invariantes:** Tópicos privados por usuário; nunca ampliar acesso ao
payload; não reintroduzir lock order inconsistente.

**Dependências:** Validação em duas sessões e cenário global sem vínculo

**Esforço:** S

**Risco de regressão:** MÉDIO: contenção de realtime/claims

**Critérios de aceite:** Mudança de perfil notifica a identidade em outra
sessão; decisão de proposta notifica autor global sem membership; revisão
avança; outro usuário não recebe payload privado.

**Testes necessários:** HTTP/realtime com duas sessões, autor global sem
membership, perfil revogado, claims concorrentes

**Decisão humana:** Definir prazo máximo de convergência da interface para
governança e perfil.

**Contraditório:** Frente backend conferiu WorkspaceSync e WorkspaceProvider:
fallback30s depende de revisão; ProfileConsole dispara evento na mesma aba;
GET sync autentica de novo e nega revogação. Esses mitigadores restringem
impacto a estado visual stale, sem poder persistente.

**Resultado do contraditório:** Regressão estática corroborada pelo
consumidor, P2. Não demonstrado bypass ou entrega cruzada de dados.

## OPS-001 — P2

**ID:** OPS-001

**Título:** Recuperação integral do ambiente de produção ainda precisa de
aceite atual

**Natureza:** EXTERNAL_DEPENDENCY

**Domínio:** Continuidade e go-live

**Prioridade:** P2

**Confiança:** CONFIRMED

**Estado:** EXTERNAL_VALIDATION_REQUIRED

**Persona:** Responsável técnico e família operadora

**Jornada:** Recuperar indisponibilidade ou perda de ambiente

**Resumo:** Evidência atual comprova replay local; história registra backups e
restauração local anterior, mas não ensaio atual completo de produção com
Storage/Auth/configurações.

**Observado:** Documentos distinguem dumps sequenciais e ausência de
bytesStorage/ensaio remoto; FaseA não executou recuperação do ambiente remoto.

**Esperado:** Antes de operar dados reais, definir e demonstrar recuperação
coerente com RPO/RTO aceitos.

**Reprodução e alcance:** Conferir limites registrados em
docs/evolution/EXECUTION.md e docs/OPERATIONS.md; seguir roteiro em
DATABASE_RESET_SEED_AND_GO_LIVE.md quando autorizado.

**Evidência:** docs/evolution/EXECUTION.md:184;
docs/evolution/EXECUTION.md:301; docs/OPERATIONS.md;
DATABASE_RESET_SEED_AND_GO_LIVE.md

**Arquivos:** docs/OPERATIONS.md; docs/DEPLOYMENT.md;
scripts/backup-local-database.mjs

**Rotas:** Não aplicável.

**Componentes:** Não aplicável.

**API:** Auth e Storage

**Objetos de banco:** Schema, dados, jobs e metadadosStorage

**Causa:** Aceite operacional depende de superfícies e responsáveis além do
replay de migrations.

**Impacto humano:** Equipe pode ficar sem acesso a documentos/anexos durante
recuperação.

**Impacto técnico:** Metadados restaurados não garantem objetos nem
configuração externa.

**Impacto operacional:** Prazo e perda admissível não comprovados para o
destino real.

**Segurança e integridade:** Não afirma backups inválidos nem perda real; é
condição de entrada em operação.

**Contingência:** Contingência manual/foto e reconciliação rastreável, com
responsável e prazo definidos.

**Recomendação:** Ensaiar recuperação autorizada completa em destino isolado,
com manifesto e smoke por papel, documento, anexo e saldo.

**Alternativas:** Começar operação interna restrita somente após aceite
explícito de contingência e requisitos mínimos de recuperação.

**Invariantes:** Sem reset remoto nesta fase; backups do ambiente correto; não
copiar segredos para Git; não inventar custódia.

**Dependências:** Destino, autorização, responsáveis, backupAuth/Storage e
configurações

**Esforço:** Médio

**Risco de regressão:** Alto se executar no destino incorreto; baixo com
ensaio isolado

**Critérios de aceite:** RPO/RTO definidos; restauração termina com login,
leitura de anexo/PDF e estoque reconciliado; manifesto identificaobjetos eSHA.

**Testes necessários:** Ensaio de restauração e smoke autenticado no ambiente
autorizado, além da suíte local.

**Decisão humana:** Aceitar RPO/RTO, retenção, destino e responsabilidade de
contingência.

**Contraditório:** Existe evidência de restauração local anterior; por isso
não se afirma inexistência total de backup/ensaio. Gate restrito ao aceite
atual integral de produção.

**Resultado do contraditório:** DOWNGRADED

## QA-001 — P2

**ID:** QA-001

**Título:** Helper de navegação E2E escolhe menu móvel por uma leitura
transitória

**Natureza:** TEST_GAP

**Domínio:** Validação e sincronização

**Prioridade:** P2

**Confiança:** CONFIRMED_FAILURE_CAUSE_SUPPORTED

**Estado:** OPEN

**Persona:** Engenharia e revisor de release

**Jornada:** Validar permissões de navegação em desktop

**Resumo:** Rodada120teve119PASS e1timeoutChromium; repetição
direcionada3xteve2PASS e1mesmafalha.

**Observado:** openNavigation consulta isVisible sem espera; quando navegação
e gatilho não estão visíveis naquele instante escolhe Navegação do plantão.
Snapshot final contém Navegação principal desktop e não o fallback procurado.

**Esperado:** O teste aguarda uma superfície pronta antes de escolher o
caminho, e verifica a permissão sem depender de um frame transitório.

**Reprodução e alcance:** Runner seguro: node scripts/run-e2e.mjs
--project=chromium --grep 'dez linhas' --repeat-each=3. Intermitente; 1/3
falhou na execução registrada.

**Evidência:** evidence/e2e-after-probe-fix.log;
evidence/e2e-navigation-repeat.log;
evidence/e2e-navigation-failure-chromium.png;
evidence/e2e-navigation-failure-context.md; tests/e2e/navigation.ts:6

**Arquivos:** tests/e2e/navigation.ts; tests/e2e/workflows.spec.ts

**Rotas:** /fichas/\[id\]

**Componentes:** WorkspaceShell

**API:** Não aplicável.

**Objetos de banco:** Não aplicável.

**Causa:** Falta de sincronização na decisão do helper é a causa sustentada
pelo código e snapshot; não se comprovou perda persistente da navegação do
produto.

**Impacto humano:** Revisor recebe falha que pode esconder uma regressão real
ou incentivar retry sem investigação.

**Impacto técnico:** Gate local não foi integralmente verde; o caso
interrompido não conclui as asserções seguintes naquela tentativa.

**Impacto operacional:** Release precisa de execução estável no novo SHA após
correção do helper.

**Segurança e integridade:** Não demonstra privilégio indevido; asserts deAPI
e casosmobile/iOS correspondentes passaram.

**Contingência:** Preservar falha e repetição separadamente; não
anunciar120/120 com base em união de runs.

**Recomendação:** Aguardar shell/contexto pronto e uma superfície de navegação
visível antes do ramo; manter asserções de papéis e três projetos.

**Alternativas:** Helper por layout conhecido com assert de prontidão, sem
relaxar regra ou apenas aumentar timeout.

**Invariantes:** Não excluir teste nem reduzir permissões verificadas para
obter verde.

**Dependências:** Runner existente e sincronização da UI

**Esforço:** Pequeno

**Risco de regressão:** Baixo

**Critérios de aceite:** Caso passa repetidamente emdesktop e continua
exercitando mobile/iOS; suíte completa passa sem remover cenário.

**Testes necessários:** Repetição dirigida após correção e suíteE2Ecompleta
noSHAfinal.

**Decisão humana:** Nenhuma para corrigir sincronização; aceite de release
deve reconhecerfalhaatual.

**Contraditório:** Inspecionados captura e snapshot: navegaçãodesktop
presente. Repetição3x confirma intermitência; CIobservada no mesmoSHA é verde,
mas não invalida falhalocal.

**Resultado do contraditório:** CONFIRMED_FAILURE_WITH_SCOPED_CAUSE

## REPO-001 — P2

**ID:** REPO-001

**Título:** Pontos de entrada da documentação apresentam baselines diferentes
como atuais

**Natureza:** DOCUMENTATION_DRIFT

**Domínio:** Documentação e operação

**Prioridade:** P2

**Confiança:** CONFIRMED

**Estado:** OPEN

**Persona:** Engenharia e responsável pela implantação

**Jornada:** Retomar manutenção; conferir preparação de release

**Resumo:** README informa cadeia35 e69unitários; AGENTS informa19hashes e
DATABASE63. O guard atual protege84 e a suíte unitária atual tem98.

**Observado:** Afirmações atuais misturadas com snapshots datados; evolução
ainda apresenta PR5 como rascunho.

**Esperado:** Entrada atual aponta para evidência do SHA e distingue instrução
permanente de relatório passado.

**Reprodução e alcance:** Comparar README81-82, AGENTS44 e DATABASE6 com
evidence/contracts.log, unit-clean.log e ci-run.json.

**Evidência:** README.md:81; AGENTS.md:44; docs/DATABASE.md:6;
docs/evolution/EXECUTION.md:6; evidence/contracts.log;
evidence/unit-clean.log; evidence/ci-run.json

**Arquivos:** README.md; AGENTS.md; docs/DATABASE.md;
docs/evolution/EXECUTION.md

**Rotas:** Não aplicável.

**Componentes:** Não aplicável.

**API:** Não aplicável.

**Objetos de banco:** Não aplicável.

**Causa:** Estado transitório copiado para vários documentos sem índice atual
único.

**Impacto humano:** Manutenção pode usar baseline e instrução de retomada
obsoletos.

**Impacto técnico:** Dificulta associar validação a código e distinguir
regressão de evolução.

**Impacto operacional:** Avaliação de prontidão pode assumir checks ou
pendências de outra versão.

**Segurança e integridade:** Não demonstra falha de RLS ou alteração de dados;
risco de decisão operacional.

**Contingência:** Consultar este relatório datado e os arquivos de evidência
do SHA explícito.

**Recomendação:** Criar índice de estado atual e retirar contagens voláteis
das instruções permanentes; preservar relatórios históricos.

**Alternativas:** Gerar resumo de release com SHA e checks, sem sobrescrever
logs anteriores.

**Invariantes:** Não reescrever evidência histórica nem liberar remoto por
documentação antiga.

**Dependências:** Fechamento da FaseB e CI do novoSHA

**Esforço:** Pequeno

**Risco de regressão:** Baixo

**Critérios de aceite:** Links iniciais levam ao SHA correto; contagens atuais
são reproduzíveis; história está identificada como datada.

**Testes necessários:** Markdown, links e comparação de contagens/SHA.

**Decisão humana:** Escolher dono da atualização do estado de release.

**Contraditório:** Relatórios datados antigos não foram classificados como
defeito por conter números antigos. Achado restrito aos pontos que se
apresentam como atuais.

**Resultado do contraditório:** CONFIRMED_AFTER_CHALLENGE

## REPO-003 — P2

**ID:** REPO-003

**Título:** Script de consulta Meta pode submeter templates apenas por
encontrar token

**Natureza:** RISK_SUPPORTED

**Domínio:** Ferramentas de integração

**Prioridade:** P2

**Confiança:** STRONG

**Estado:** OPEN

**Persona:** Operador de integração

**Jornada:** Conferir status de templates antes da publicação

**Resumo:** O script combina listagem e submissão sem modo explícito; usa IDs
de conta/app como fallback.

**Observado:** Se token existe, faz GET e cria templates ausentes na primeira
página; não existe --inspect/--submit. A listagem usa limit100 sem percorrer
paginação.

**Esperado:** Consulta deve ter efeito somente de leitura; submissão exige
destino escolhido e ação explícita.

**Reprodução e alcance:** Inspecionar ramo else após presença do token em
scripts/meta-templates.mjs, loop available e chamadas POST. Não executar
contra provedor nesta fase.

**Evidência:** scripts/meta-templates.mjs:4; scripts/meta-templates.mjs:7;
scripts/meta-templates.mjs:55; scripts/meta-templates.mjs:63;
scripts/meta-templates.mjs:135

**Arquivos:** scripts/meta-templates.mjs

**Rotas:** Não aplicável.

**Componentes:** Não aplicável.

**API:** Meta Graph management

**Objetos de banco:** Não aplicável.

**Causa:** Comando imperativo misturado com diagnóstico e seleção implícita de
destino.

**Impacto humano:** Operador pode publicar uma proposta quando pretendia
apenas verificar disponibilidade.

**Impacto técnico:** Página parcial pode ser interpretada como ausência; erro
do provedor não substitui contrato seguro do comando.

**Impacto operacional:** Submissões indevidas e revisão externa desnecessária.

**Segurança e integridade:** Não houve envio/submissão nem uso de credencial
real nesta auditoria.

**Contingência:** Não executar o script para consulta; inspecionar via
interface/API somente leitura autorizada.

**Recomendação:** Separar inspect/submit, requerer WABA/app explícitos,
paginar leitura, normalizar destino privado e gerar plano antes de submeter.

**Alternativas:** Dois comandos distintos compartilhando adaptador de
transporte.

**Invariantes:** Não publicar templates nem acionar provedor sem autorização
correspondente; segredos e diagnósticos privados.

**Dependências:** Homologação Meta

**Esforço:** Pequeno a médio

**Risco de regressão:** Baixo no produto; médio no fluxo operacional

**Critérios de aceite:** Modo consulta não contém POST; destino inválido falha
antes da rede; listagem completa; submissão declara exatamente o que será
criado.

**Testes necessários:** Transporte simulado para token presente, paginação e
dry-run; homologação autorizada posterior.

**Decisão humana:** Selecionar conta/app e autorizar submissão na FaseB.

**Contraditório:** Nome do script sugere gestão e não há chamada automática na
CI; token por si só não é autorização. Risco restrito à ferramenta manual, sem
alegar incidente ocorrido.

**Resultado do contraditório:** CONFIRMED_AFTER_CHALLENGE

## REPO-004 — P2

**ID:** REPO-004

**Título:** Cópia de verificação Linux não exclui o diretório privado local

**Natureza:** RISK_SUPPORTED

**Domínio:** Ferramentas e minimização

**Prioridade:** P2

**Confiança:** STRONG

**Estado:** OPEN

**Persona:** Engenharia

**Jornada:** Verificar checkout local em container

**Resumo:** Tar exclui env e outputs, mas não .private, cuja finalidade
documentada inclui credenciais de homologação.

**Observado:** scripts/verify-linux.sh:4 copia toda /workspace para
/tmp/hca-verification; .gitignore/.vercelignore não governam esse tar.

**Esperado:** Verificação de código deve receber somente arquivos necessários
e nenhum segredo privado de outro ambiente.

**Reprodução e alcance:** Revisar lista --exclude contra
docs/evolution/EXECUTION.md:200-205; pode demonstrar com arquivo sentinela
fictício, sem ler credenciais reais.

**Evidência:** scripts/verify-linux.sh:4; docs/evolution/EXECUTION.md:200;
.gitignore; .vercelignore

**Arquivos:** scripts/verify-linux.sh

**Rotas:** Não aplicável.

**Componentes:** Não aplicável.

**API:** Não aplicável.

**Objetos de banco:** Não aplicável.

**Causa:** Exportação por lista incompleta de exclusões em vez de conjunto
necessário ao build.

**Impacto humano:** Operador pode acreditar que todos os diretórios privados
foram omitidos.

**Impacto técnico:** Arquivos privados ficam acessíveis ao processo de
build/dependências dentro do container se existirem no mount.

**Impacto operacional:** Amplia superfície e retenção de segredos sem
necessidade da verificação.

**Segurança e integridade:** Cópia potencial local, não exfiltração ou
exposição remota demonstrada. Conteúdo privado não foi lido.

**Contingência:** Executar em checkout limpo sem dados privados e confirmar
conteúdo exportado.

**Recomendação:** Exportar tracked files e dependências necessárias ou excluir
.private explicitamente, com sentinela para evitar regressão.

**Alternativas:** Usar workspace efêmero do CI, que já nasce sem diretório
privado local.

**Invariantes:** Segredos não entram em build, logs ou artefatos; preservar
arquivos locais existentes.

**Dependências:** Ferramenta de verificação manual

**Esforço:** Pequeno

**Risco de regressão:** Baixo

**Critérios de aceite:** Sentinela .private não chega à cópia; código e assets
necessários continuam compilando.

**Testes necessários:** Inspeção do arquivo tar com conteúdo fictício, sem
copiar segredo real.

**Decisão humana:** Nenhuma para minimizar arquivos; não implica rotação sem
incidente.

**Contraditório:** CI atual usa checkout limpo; não há publicação automática
desse diretório. Mantido como risco local condicionado, sem elevar a incidente
de segurança.

**Resultado do contraditório:** DOWNGRADED

## UX-002 — P2

**ID:** UX-002

**Título:** Ciência automática observa o cabeçalho antes da lista de materiais

**Natureza:** RISK_SUPPORTED

**Domínio:** UI_UX

**Prioridade:** P2

**Confiança:** CONFIRMED

**Estado:** OPEN

**Persona:** Familiar com ciência automática habilitada

**Jornada:** Abrir REQ recebida no celular

**Resumo:** O sinal app_visible é disparado pela visibilidade do
DocumentHeader; materiais ficam em seção posterior.

**Observado:** IntersectionObserver usa threshold0.5 e observa visibleRef
anexada ao cabeçalho. A mensagem afirma exibição do conteúdo.

**Esperado:** A semântica da ciência automática deve corresponder exatamente
ao que foi exposto, sem sugerir leitura integral.

**Reprodução e alcance:** Confirmado em Chromium390x844 como family: POST
mode=app_visible, expectedVersion=1; cabeçalho top217.5/bottom819.5; título
dos materiais top858.5, fora do viewport. RPC subsequente confirma ciência
family/app_visible. Reprodutores: evidence/ui-runtime.mjs e
evidence/ui-runtime-ready.mjs; somente stack local verificada.

**Evidência:** src/components/requisitions/requisition-detail.tsx:130;
src/components/requisitions/requisition-detail.tsx:142;
src/components/requisitions/requisition-detail.tsx:175;
src/components/requisitions/requisition-detail.tsx:226;
src/components/requisitions/requisition-detail.tsx:278;
docs/audits/2026-10-25-production-readiness/evidence/ui-science-top-390.png;
docs/audits/2026-10-25-production-readiness/evidence/ui-runtime.json

**Arquivos:** src/components/requisitions/requisition-detail.tsx

**Rotas:** /documentos/\[id\]; /historico/\[id\]

**Componentes:** Não aplicável.

**API:** Não aplicável.

**Objetos de banco:** Não aplicável.

**Causa:** A referência de visibilidade representa a área de identificação,
não a lista de materiais.

**Impacto humano:** Família e equipe podem atribuir significado excessivo ao
registro automático.

**Impacto técnico:** Contrato de autorização/transação não é declarado
defeituoso por este achado.

**Impacto operacional:** Rastreabilidade de exposição do conteúdo menos
precisa que a mensagem apresentada.

**Segurança e integridade:** Não constitui demonstração de bypass de
autorização; avaliar impactos de decisão no domínio correspondente.

**Contingência:** Usar ciência expressa e desativar preferência automática até
definir a semântica.

**Recomendação:** Definir ciência automática como abertura do documento e
nomear assim, ou observar conteúdo pertinente com critério explícito;
preservar diferença de ciência expressa.

**Alternativas:** Registrar abertura como evento distinto sem satisfazer
ciência; Exigir ação expressa para documentos selecionados

**Invariantes:** Autorização servidor e paciente explícito; Preservação
documental, versões e idempotência; Não incluir quantidade solicitada em REQ

**Dependências:** Validação runtime quando indicada; Revisão do domínio antes
de implementação

**Esforço:** M

**Risco de regressão:** Médio; preservar autoridade, concorrência e
recuperação.

**Critérios de aceite:** Texto descreve o sinal realmente medido; Teste
viewport mostra qual conteúdo ficou visível antes do registro; Preferência,
política, elegibilidade e modo são preservados

**Testes necessários:** E2E390px cabeçalho visível/material fora da tela; E2E
aba oculta e preferência desativada

**Decisão humana:** Decidir se ciência significa abertura, exposição dos
materiais ou confirmação expressa.

**Contraditório:** Há opt-in duplo, verificação document.hidden, autorização e
modo app_visible distinto de ciência expressa. Não é alegada falsificação ou
prova de leitura. O risco é a correspondência entre sinal e linguagem.
Runtime: Confirmado em Chromium390x844 como family: POST mode=app_visible,
expectedVersion=1; cabeçalho top217.5/bottom819.5; título dos materiais
top858.5, fora do viewport. RPC subsequente confirma ciência
family/app_visible.

**Resultado do contraditório:** CONFIRMED_AFTER_CHALLENGE

## UX-003 — P2

**ID:** UX-003

**Título:** Falha de transporte no anexo mantém arquivo editável na mesma
tentativa

**Natureza:** DEFECT_CONFIRMED

**Domínio:** UI_UX

**Prioridade:** P2

**Confiança:** CONFIRMED

**Estado:** OPEN

**Persona:** Profissional ou familiar anexando ficha física

**Jornada:** Recuperar upload após resposta perdida

**Resumo:** O catch de fetch/JSON não marca uncertain, embora a FormData e a
chave permaneçam reservadas.

**Observado:** pendingRef conserva FormData; a próxima execução faz
form.set('file',file). Input só bloqueia busy||uncertain; uncertain é ativado
para HTTPinesperado, não para exceção de transporte.

**Esperado:** Uma tentativa de resultado desconhecido deve congelar arquivo e
oferecer recuperação antes de iniciar outro upload.

**Reprodução e alcance:** Confirmado em Chromium390px: POST de foto sintética
recebeu201 no servidor e a resposta foi abortada no navegador; input permanece
habilitado e botão Enviar anexo, com Failed to fetch. A troca de arquivo e
segundo envio não foram executados; risco de conflito permanece apoiado no
fluxo estático. Reprodutores: evidence/ui-runtime.mjs e
evidence/ui-runtime-ready.mjs; somente stack local verificada.

**Evidência:** src/components/documents/attachments.tsx:78;
src/components/documents/attachments.tsx:84;
src/components/documents/attachments.tsx:107;
src/components/documents/attachments.tsx:189;
docs/audits/2026-10-25-production-readiness/evidence/ui-attachment-lost-response.png;
docs/audits/2026-10-25-production-readiness/evidence/ui-runtime.json

**Arquivos:** src/components/documents/attachments.tsx

**Rotas:** /documentos/\[id\]; /estoque

**Componentes:** Não aplicável.

**API:** Não aplicável.

**Objetos de banco:** Não aplicável.

**Causa:** Tratamento de incerteza incompleto no ramo de exceção; tentativa
reutiliza payload mutável.

**Impacto humano:** O usuário pode perder a compreensão de qual foto foi
registrada e receber conflito ao tentar substituir.

**Impacto técnico:** Contrato de autorização/transação não é declarado
defeituoso por este achado.

**Impacto operacional:** Recuperação exige consultar anexos/reiniciar o fluxo.

**Segurança e integridade:** Não constitui demonstração de bypass de
autorização; avaliar impactos de decisão no domínio correspondente.

**Contingência:** Manter mesmo arquivo, repetir e conferir a lista de anexos
antes de substituí-lo.

**Recomendação:** Marcar resultado incerto no catch de transporte e preservar
payload imutável até reconciliação.

**Alternativas:** Consultar tentativa por chave antes de permitir outra
seleção

**Invariantes:** Autorização servidor e paciente explícito; Preservação
documental, versões e idempotência; Não incluir quantidade solicitada em REQ

**Dependências:** Validação runtime quando indicada; Revisão do domínio antes
de implementação

**Esforço:** M

**Risco de regressão:** Médio; preservar autoridade, concorrência e
recuperação.

**Critérios de aceite:** Resposta perdida bloqueia edição do arquivo e
apresenta Recuperar confirmação; Mesma chave recupera mesmo conteúdo; Novo
arquivo só usa nova chave depois da reconciliação

**Testes necessários:** E2E resposta perdida após gravação; E2E falha antes de
envio; Teste hash diferente na mesma chave continua recusado

**Decisão humana:** Não necessária para corrigir consistência da tentativa.

**Contraditório:** Backend reserva chave, verifica hash e usa upsert=false; a
hipótese de sobrescrita silenciosa foi refutada pelo responsável backend.
Achado limitado à experiência de recuperação. Runtime: Confirmado em
Chromium390px: POST de foto sintética recebeu201 no servidor e a resposta foi
abortada no navegador; input permanece habilitado e botão Enviar anexo, com
Failed to fetch. A troca de arquivo e segundo envio não foram executados;
risco de conflito permanece apoiado no fluxo estático.

**Resultado do contraditório:** CONFIRMED_AFTER_CHALLENGE

## UX-004 — P2

**ID:** UX-004

**Título:** Algumas leituras apresentam vazio ou configuração ausente antes de
concluir a consulta

**Natureza:** DEFECT_CONFIRMED

**Domínio:** UI_UX

**Prioridade:** P2

**Confiança:** CONFIRMED

**Estado:** OPEN

**Persona:** Todos os perfis autorizados a consultar ocorrências, avisos e
sugestões

**Jornada:** Abrir listas com rede lenta ou falha

**Resumo:** Listas iniciam vazias e não distinguem carregamento; erros podem
coexistir com mensagens de ausência.

**Observado:** Consumo rows=\[\] e Nenhum relato; Flows configured=false e
rows=\[\] geram configuração ausente/vazio; sino rows=\[\] gera Você está em dia.

**Esperado:** Carregamento, erro com repetição, vazio confirmado e conteúdo
devem ser estados distintos.

**Reprodução e alcance:** Confirmado em /consumo390px com GET retido e
depois500 sintético: Nenhum relato registrado aparece pendente e junto da
falha. Flows/sino continuam evidência estática, sem ampliar indevidamente a
reprodução. Reprodutores: evidence/ui-runtime.mjs e
evidence/ui-runtime-ready.mjs; somente stack local verificada.

**Evidência:** src/components/stock/consumption-console.tsx:45;
src/components/stock/consumption-console.tsx:72;
src/components/stock/consumption-console.tsx:291;
src/components/stock/flow-reviews.tsx:36;
src/components/stock/flow-reviews.tsx:115;
src/components/stock/flow-reviews.tsx:166;
src/components/notifications/notification-bell.tsx:31;
src/components/notifications/notification-bell.tsx:115;
docs/ui-ux/DESIGN_SYSTEM.md:42;
docs/audits/2026-10-25-production-readiness/evidence/ui-consumption-error-390.png;
docs/audits/2026-10-25-production-readiness/evidence/ui-runtime.json

**Arquivos:** src/components/stock/consumption-console.tsx;
src/components/stock/flow-reviews.tsx;
src/components/notifications/notification-bell.tsx;
docs/ui-ux/DESIGN_SYSTEM.md

**Rotas:** /consumo; /notificacoes; sino global

**Componentes:** Não aplicável.

**API:** Não aplicável.

**Objetos de banco:** Não aplicável.

**Causa:** Ausência de estado independente de leitura; valores iniciais são
tratados como respostas de negócio.

**Impacto humano:** A pessoa pode concluir que não há pendências ou que a
integração está desligada antes de conhecer o resultado.

**Impacto técnico:** Contrato de autorização/transação não é declarado
defeituoso por este achado.

**Impacto operacional:** Consulta pode ser abandonada cedo; repetições
dependem de atualização de página em alguns módulos.

**Segurança e integridade:** Não constitui demonstração de bypass de
autorização; avaliar impactos de decisão no domínio correspondente.

**Contingência:** Aguardar/atualizar e conferir eventual erro; não é uma
garantia de ausência.

**Recomendação:** Aplicar estados de leitura compartilhados com retry
explícito e conservar dados anteriores marcados como atualização pendente.

**Alternativas:** Skeleton somente no primeiro carregamento e indicador
discreto nas atualizações

**Invariantes:** Autorização servidor e paciente explícito; Preservação
documental, versões e idempotência; Não incluir quantidade solicitada em REQ

**Dependências:** Validação runtime quando indicada; Revisão do domínio antes
de implementação

**Esforço:** M

**Risco de regressão:** Médio; preservar autoridade, concorrência e
recuperação.

**Critérios de aceite:** Nenhum vazio é exibido antes de consulta
bem-sucedida; Erro oferece repetição e não afirma ausência; Configuração
desconhecida é distinta de indisponível

**Testes necessários:** E2E delay/500/200vazio/200comdados; Leitor de tela
anuncia carregamento e falha

**Decisão humana:** Não necessária.

**Contraditório:** Workspace, histórico, estoque e outros módulos já têm
loading/retry. A recomendação reutiliza padrão existente; não afirma ausência
universal de estados. Runtime: Confirmado em /consumo390px com GET retido e
depois500 sintético: Nenhum relato registrado aparece pendente e junto da
falha. Flows/sino continuam evidência estática, sem ampliar indevidamente a
reprodução.

**Resultado do contraditório:** CONFIRMED_AFTER_CHALLENGE

## UX-005 — P2

**ID:** UX-005

**Título:** Aprovação de propostas de configuração exige interpretar JSON e
identificadores

**Natureza:** EXPERIENCE_INCONSISTENCY

**Domínio:** UI_UX

**Prioridade:** P2

**Confiança:** CONFIRMED

**Estado:** OPEN

**Persona:** Administrador local aprovando proposta global

**Jornada:** Pessoas e propostas

**Resumo:** A revisão mostra change.kind e JSON.stringify(change.proposed),
sem comparação contextual em linguagem de negócio.

**Observado:** Kind e payload serializado antecedem Aceitar/Rejeitar; relações
e efeitos dependem de interpretação técnica.

**Esperado:** Nome da pessoa/recurso, política afetada, antes/depois e impacto
compreensíveis antes da aprovação.

**Reprodução e alcance:** Criar proposta global autorizada e abrir
Configurações > Pessoas e propostas como administrador local.

**Evidência:** src/components/admin/policy-console.tsx:319;
src/components/admin/policy-console.tsx:321;
src/components/admin/policy-console.tsx:337

**Arquivos:** src/components/admin/policy-console.tsx

**Rotas:** /configuracoes?area=people

**Componentes:** Não aplicável.

**API:** Não aplicável.

**Objetos de banco:** Não aplicável.

**Causa:** Payload técnico foi reutilizado como visualizador de decisão.

**Impacto humano:** Aprovação depende de conhecimento dos contratos e aumenta
carga cognitiva.

**Impacto técnico:** Contrato de autorização/transação não é declarado
defeituoso por este achado.

**Impacto operacional:** Erro de configuração pode persistir mesmo com
autorização correta.

**Segurança e integridade:** Não constitui demonstração de bypass de
autorização; avaliar impactos de decisão no domínio correspondente.

**Contingência:** Revisar com operador técnico; preservar JSON como detalhe
diagnóstico.

**Recomendação:** Criar resumos por kind, resolver nomes no contexto
autorizado e mostrar diff; manter identificadores recolhidos.

**Alternativas:** Reutilizar resumos dos editores de política e vínculo

**Invariantes:** Autorização servidor e paciente explícito; Preservação
documental, versões e idempotência; Não incluir quantidade solicitada em REQ

**Dependências:** Validação runtime quando indicada; Revisão do domínio antes
de implementação; BE-005 cobre UUID novo no retry; causa distinta da
compreensão visual.

**Esforço:** M

**Risco de regressão:** Médio; preservar autoridade, concorrência e
recuperação.

**Critérios de aceite:** Uma pessoa não técnica identifica quem/o quê muda e o
resultado; Valores anteriores/propostos aparecem juntos; JSON fica opcional e
cópia diagnóstica é segura

**Testes necessários:** E2E proposta de vínculo e de regra; Conflito de versão
obriga rever resumo

**Decisão humana:** Definir vocabulário para cada tipo de proposta.

**Contraditório:** JSON preserva exatidão e é útil em auditoria; não deve ser
removido sem alternativa. A autorização local e aprovação separada são pontos
fortes.

**Resultado do contraditório:** CONFIRMED_AFTER_CHALLENGE

## UX-007 — P2

**ID:** UX-007

**Título:** Rascunho dito salvo no dispositivo tem alcance de sessão da aba

**Natureza:** RISK_SUPPORTED

**Domínio:** UI_UX

**Prioridade:** P2

**Confiança:** STRONG

**Estado:** OPEN

**Persona:** Profissional interrompido no preenchimento da REQ

**Jornada:** Salvar e retomar requisição

**Resumo:** O texto promete recuperação do dispositivo enquanto a REQ usa
sessionStorage com prazo local.

**Observado:** Autosave500ms e botão manual gravam sessionStorage; recuperação
valida savedAt e remove dados expirados.

**Esperado:** A mensagem deve explicitar onde o rascunho existe, por quanto
tempo e o que encerra sua recuperação.

**Reprodução e alcance:** Preencher REQ, salvar, recarregar na mesma aba;
comparar com nova aba independente e encerramento da sessão. Persistência
entre sessões ainda não testada.

**Evidência:** src/components/requisitions/requisition-wizard.tsx:78;
src/components/requisitions/requisition-wizard.tsx:96;
src/components/requisitions/requisition-wizard.tsx:149;
src/components/requisitions/requisition-wizard.tsx:424

**Arquivos:** src/components/requisitions/requisition-wizard.tsx

**Rotas:** /fichas/req

**Componentes:** Não aplicável.

**API:** Não aplicável.

**Objetos de banco:** Não aplicável.

**Causa:** Mensagem de persistência mais ampla que o mecanismo escolhido.

**Impacto humano:** Interrupção pode resultar em redigitação quando a pessoa
espera armazenamento durável.

**Impacto técnico:** Contrato de autorização/transação não é declarado
defeituoso por este achado.

**Impacto operacional:** Perda de trabalho antes da emissão; documentos já
emitidos não são afetados.

**Segurança e integridade:** Não constitui demonstração de bypass de
autorização; avaliar impactos de decisão no domínio correspondente.

**Contingência:** Retomar na mesma aba e emitir antes de encerrá-la; não
copiar dados de cuidado para canais inseguros.

**Recomendação:** Mostrar origem, hora e alcance do rascunho; avaliar rascunho
servidor para REQ se recuperação entre dispositivos for necessária.

**Alternativas:** Manter armazenamento de sessão com texto preciso; Rascunho
servidor autorizado por usuário/paciente, com retenção definida

**Invariantes:** Autorização servidor e paciente explícito; Preservação
documental, versões e idempotência; Não incluir quantidade solicitada em REQ

**Dependências:** Validação runtime quando indicada; Revisão do domínio antes
de implementação

**Esforço:** S–M

**Risco de regressão:** Baixo a médio; validar consumidores e linguagem.

**Critérios de aceite:** Mensagem descreve sessão da aba e expiração;
Recuperação distingue rascunho local/servidor e tentativa incerta; Sair/trocar
paciente não mistura rascunhos

**Testes necessários:** E2E reload/novaaba/logout/expiração; Teste de
isolamento entre usuário e paciente

**Decisão humana:** Definir necessidade de continuidade entre
abas/dispositivos e retenção.

**Contraditório:** Há autosave e recuperação idempotente; a hipótese de
ausência de rascunho foi refutada. COM/BAL têm caminhos de documento servidor
e não devem ser generalizados como exclusivamente locais.

**Resultado do contraditório:** DOWNGRADED

## UX-012 — P2

**ID:** UX-012

**Título:** Acompanhamento inicial ignora configuração e altera mensagem ao
vencer prazo fixo

**Natureza:** DEFECT_CONFIRMED

**Domínio:** UI_UX

**Prioridade:** P2

**Confiança:** CONFIRMED

**Estado:** OPEN

**Persona:** Administrador local e pessoa consultando documento

**Jornada:** Configurar acompanhamento e abrir comprovante

**Resumo:** shareWaitSeconds é editável de 0 a 10, mas DocumentActions usa 10s
fixos e sobrescreve o texto mesmo sem avisos pendentes.

**Observado:** PolicyRules apresenta campo; PolicyConsole salva valor.
DocumentActions deadline10_000 aborta PDF/tracking e afirma processamento em
andamento. O timeout não é limpo quando tracking conclui sem pendências.

**Esperado:** Campo precisa alterar comportamento efetivo; após conclusão a
mensagem não deve regredir para pendência sem nova evidência.

**Reprodução e alcance:** Confirmado em Chromium390px: política efetiva
shareWaitSeconds=3 lida da API; consulta de avisos interceptada com
200/data\[\]; mensagem de estado concluído permanece após4s e é sobrescrita
após~10s por avisos continuam sendo processados. Não simula entrega de
provedor. Reprodutores: evidence/ui-runtime.mjs e
evidence/ui-runtime-ready.mjs; somente stack local verificada.

**Evidência:** src/components/admin/policy-rules.tsx:42;
src/components/admin/policy-console.tsx:189;
src/components/documents/document-actions.tsx:22;
src/components/documents/document-actions.tsx:28;
src/components/documents/document-actions.tsx:33;
src/components/documents/document-actions.tsx:62;
docs/audits/2026-10-25-production-readiness/evidence/ui-document-deadline-390.png;
docs/audits/2026-10-25-production-readiness/evidence/ui-runtime-ready.json

**Arquivos:** src/components/admin/policy-rules.tsx;
src/components/admin/policy-console.tsx;
src/components/documents/document-actions.tsx

**Rotas:** /configuracoes?area=rules; /documentos/\[id\]

**Componentes:** PolicyRules; PolicyConsole; DocumentActions

**API:** Não aplicável.

**Objetos de banco:** Não aplicável.

**Causa:** Configuração persistida não é passada ao consumidor; timeout
compartilhado muda mensagem sem considerar resultado final do tracking.

**Impacto humano:** Configuração aparenta funcionar e feedback pode sugerir
atraso inexistente.

**Impacto técnico:** Contrato de autorização/transação não é declarado
defeituoso por este achado.

**Impacto operacional:** Dificulta distinguir atraso de comunicação de
comportamento local fixo; compartilhar PDF depende de preparação que também
usa esse limite.

**Segurança e integridade:** Não constitui demonstração de bypass de
autorização; avaliar impactos de decisão no domínio correspondente.

**Contingência:** Usar Baixar PDF e consultar estados individuais dos avisos;
não inferir pendência somente pela mensagem do cabeçalho.

**Recomendação:** Consumir política efetiva ou retirar configuração; separar
preparação PDF do prazo de acompanhamento e preservar resultado conhecido.

**Alternativas:** Prazo fixo documentado sem campo editável; Acompanhamento
configurável com estado final e preparação PDF independente

**Invariantes:** Autorização servidor e paciente explícito; Preservação
documental, versões e idempotência; Não incluir quantidade solicitada em REQ

**Dependências:** Validação runtime quando indicada; Revisão do domínio antes
de implementação

**Esforço:** M

**Risco de regressão:** Médio; preservar autoridade, concorrência e
recuperação.

**Critérios de aceite:** Valores 0/3/10s têm comportamento definido e
verificável; Avisos concluídos não voltam a mensagem de processamento;
Baixar/compartilhar PDF tem recuperação clara

**Testes necessários:** E2E política 0/3/10s com relógio controlado; E2E
notifications vazio/concluído/pendente e PDF lento

**Decisão humana:** Definir se prazo limita acompanhamento dos avisos ou
também preparação do arquivo.

**Contraditório:** A configuração é validada e persistida, mas busca de
consumidores frontend/backend não encontrou uso efetivo; DocumentActions
recebe somente id/code/version. Não é afirmada perda do documento nem entrega
externa. Runtime: Confirmado em Chromium390px: política efetiva
shareWaitSeconds=3 lida da API; consulta de avisos interceptada com
200/data\[\]; mensagem de estado concluído permanece após4s e é sobrescrita
após~10s por avisos continuam sendo processados. Não simula entrega de
provedor.

**Resultado do contraditório:** CONFIRMED_AFTER_CHALLENGE

## BE-006 — P3

**ID:** BE-006

**Título:** Dashboard combina muitas viagens ao Supabase antes de montar a
resposta

**Natureza:** RISK_SUPPORTED

**Domínio:** Desempenho e manutenção

**Prioridade:** P3

**Confiança:** STRONG

**Estado:** OPEN

**Persona:** Usuário no celular e operador

**Jornada:** Abrir ou atualizar painel do paciente

**Resumo:** A carga com capacidades amplas executa quatro chamadas de
autenticação, quatro de contexto e até17 consultas/RPCs do dashboard. Há
paralelismo na última etapa, mas as etapas prévias continuam encadeadas.

**Observado:** Contagem estática máxima25 operações Supabase; autenticação e
contexto repetidos antes do Promise.all do painel. Não foi medida latência
remota nem afirmada lentidão efetiva.

**Esperado:** Tempo e custo de abertura devem ser medidos em conexão móvel
representativa; read models podem reduzir viagens preservando autoridade
atual.

**Reprodução e alcance:** Instrumentar somente contagens/durações sanitizadas
das chamadas GET /api/dashboard em ambiente local e homologação, para perfil
com todas as capacidades.

**Evidência:** src/lib/server/api.ts:266-311; src/lib/server/api.ts:330-408;
src/app/api/dashboard/route.ts:21-39

**Arquivos:** src/lib/server/api.ts; src/app/api/dashboard/route.ts

**Rotas:** /

**Componentes:** Dashboards por perfil

**API:** GET /api/dashboard

**Objetos de banco:** my_session_valid; my_active_context;
patient_capabilities; operational_tasks; stock_overview; balance_workspace

**Causa:** Composição crescente de consultas independentes sobre bootstrap de
autorização com múltiplas viagens.

**Impacto humano:** Risco de espera maior em conexão ou backend lento; ainda
não medido.

**Impacto técnico:** Custo de consultas cresce com recargas/realtime; um erro
de dependência pode derrubar resposta agregada.

**Impacto operacional:** Abertura do painel concentra dependências de domínios
diversos.

**Segurança e integridade:** Não remover verificações ou usar cache
compartilhado de sessão para otimizar.

**Contingência:** Usar links diretos para jornadas quando painel estiver
lento; não considerado mitigação de indisponibilidade geral.

**Recomendação:** Medir p50/p95 e operações; se demonstrado gargalo,
consolidar bootstrap/read model em RPC autorizada, com plano de consulta e
erro por seção quando seguro.

**Alternativas:** Priorizar carregamento progressivo de informações
secundárias antes de nova RPC; evitar reescrever backend por preferência.

**Invariantes:** Sessão e capacidades atuais, RLS e segregação paciente;
nenhum cache público de payload privado.

**Dependências:** Medição representativa antes de implementação

**Esforço:** Médio a alto

**Risco de regressão:** Alto se autorização for alterada

**Critérios de aceite:** Orçamento de resposta acordado e medido; redução
demonstrada de viagens/custo; mesmos resultados e negações em perfis revogados
ou com override.

**Testes necessários:** Benchmark com dados/latência representativos;
equivalência do read model e testes negativos Auth/RLS.

**Decisão humana:** Definir orçamento de latência e volume esperado.

**Contraditório:** Promise.all evita execução serial das17 operações e
capacidades podem reduzir número. Portanto registrado como risco sustentado,
não defeito de desempenho confirmado. Prioridade rebaixada porque não existe
medição de latência/custo nem orçamento descumprido demonstrado.

**Resultado do contraditório:** DOWNGRADED

## BE-007 — P3

**ID:** BE-007

**Título:** PDF da REQ omite o estoque observado que aparece na ficha

**Natureza:** PRODUCT_OPPORTUNITY

**Domínio:** Consistência documental

**Prioridade:** P3

**Confiança:** CONFIRMED

**Estado:** OPEN

**Persona:** Familiar, supervisora e profissional

**Jornada:** Compartilhar e consultar a requisição fora do aplicativo

**Resumo:** O estoque observado é capturado e preservado no snapshot da REQ e
exibido no detalhe, mas a tabela do PDF renderizador4 não o apresenta.

**Observado:** A tabela REQ contém Nº, material, apresentação e prioridade;
não há consumo de current_stock no renderizador. A tela mostra Estoque
observado na emissão com a quantidade e unidade.

**Esperado:** Ao compartilhar a REQ, preservar o contexto observado que
motivou a necessidade ou declarar explicitamente a opção de omiti-lo. Nunca
rotular esse valor como quantidade solicitada ou saldo oficial.

**Reprodução e alcance:** Comparar uma linha com current_stock preenchido em
requisition-detail.tsx308–313 com a seleção de colunas em
operational-pdf.ts437–447. Ausência confirmada estaticamente; PDF específico
novo não foi renderizado nesta frente.

**Evidência:** src/lib/server/operational-pdf.ts:437-447;
src/components/requisitions/requisition-detail.tsx:308-313;
supabase/migrations/20261022085111_operational_completion_and_authenticated_reviews.sql:298;
src/lib/server/document-pdf.ts:67-78

**Arquivos:** src/lib/server/operational-pdf.ts;
src/lib/server/document-pdf.ts;
src/components/requisitions/requisition-detail.tsx; tests/document-pdf.test.ts

**Rotas:** /historico/:id

**Componentes:** PDF REQ e RequisitionDetail

**API:** GET /api/documents/:id/pdf

**Objetos de banco:** document_events.body; requisition_items.current_stock

**Causa:** Apresentações da tela e PDF selecionam conjuntos diferentes de
informações do mesmo snapshot.

**Impacto humano:** Quem recebe apenas o PDF perde a informação de quanto
havia no momento da requisição.

**Impacto técnico:** O dado permanece no snapshot; não há corrupção nem
necessidade de recálculo de estoque.

**Impacto operacional:** Pode exigir retorno ao aplicativo ou contato
adicional para contextualizar urgência e abastecimento.

**Segurança e integridade:** Incluir o valor exige distinguir observação
histórica de saldo oficial e conservar a versão original.

**Contingência:** Consultar o detalhe autenticado no aplicativo para ver o
estoque observado.

**Recomendação:** Definir apresentação legível de estoque observado e unidade
no PDF, com rótulo inequívoco e tratamento de desconhecido; versionar novo
renderer sem substituir objetos históricos.

**Alternativas:** Se a decisão de produto for omitir a observação, registrar a
limitação no documento e oferecer link claro ao detalhe autorizado.

**Invariantes:** REQ sem quantidade solicitada; observação não é ledger;
PDFs/snapshots históricos preservados; sem consulta ao saldo atual para
reconstruir passado.

**Dependências:** Decisão editorial do documento e versão do renderizador

**Esforço:** Pequeno a médio

**Risco de regressão:** Médio: quebra de página e cache documental

**Critérios de aceite:** REQ com estoque zero, fracionário e histórico
desconhecido possui representação aprovada; tela/PDF referem-se à mesma
observação; quantidades solicitadas continuam ausentes; versão antiga
permanece recuperável.

**Testes necessários:** Extração textual e inspeção visual de PDF com nomes
longos/mais páginas; teste de preservação de renderer histórico.

**Decisão humana:** Confirmar se o documento compartilhado deve incluir a
observação e aprovar rótulo/posição; a ausência é fato, sua correção é decisão
de produto.

**Contraditório:** Verificado que a proibição de quantidade solicitada não
proíbe estoque observado; UI usa rótulo separado e snapshot incorpora
requisition_items inteiro. Não foi classificado como perda de dado nem
obrigação de recalcular saldo. Contraprova final com auditor raiz: a ausência
é confirmada, mas a inclusão é opção editorial, sem bloqueio de produção
isolado.

**Resultado do contraditório:** DOWNGRADED

## DB-005 — P3

**ID:** DB-005

**Título:** Cada evento copia todo o histórico resumido anterior do documento

**Natureza:** RISK_SUPPORTED

**Domínio:** Banco, snapshots e PDFs

**Prioridade:** P3

**Confiança:** STRONG

**Estado:** MEASUREMENT_REQUIRED

**Persona:** Operação de longo prazo e manutenção

**Jornada:** Manter requisições pendentes com lembretes recorrentes

**Resumo:** science_snapshot acrescenta a lista de todos os eventos anteriores
a cada novo snapshot; lembretes incrementam versão e geram novo evento. O
volume agregado desses resumos cresce quadraticamente com a quantidade de
eventos por documento.

**Observado:** jsonb_agg dos eventos anteriores por document_id é
materializado dentro de cada body, seguido do evento novo. É um histórico
resumido, não cópia recursiva dos corpos completos.

**Esperado:** Retenção íntegra deve ter capacidade conhecida e sustentada para
documentos longos, sem crescer silenciosamente além do orçamento operacional.

**Reprodução e alcance:** Medir pg_column_size(body), tabela/TOAST e latência
de emissão para 10/100/1000 eventos de uma REQ isolada, mantendo semântica e
rollback ou ambiente descartável autorizado. Não executado.

**Evidência:**
supabase/migrations/20261023073958_v4_verification_corrections.sql:291-305;
supabase/migrations/20261023073958_v4_verification_corrections.sql:328-336

**Arquivos:**
supabase/migrations/20261023073958_v4_verification_corrections.sql

**Rotas:** /historico/\[id\]; /fichas/\[id\]

**Componentes:** Histórico e PDF versionado

**API:** operational_document; register_document_render

**Objetos de banco:** document_events.body;
operational_documents.canonical_snapshot; private.science_snapshot

**Causa:** Desnormalização cumulativa de histórico dentro de cada versão
imutável.

**Impacto humano:** Possível lentidão crescente ao consultar ou atualizar
documentos muito antigos.

**Impacto técnico:** n eventos armazenam aproximadamente n(n+1)/2 entradas
resumidas, além dos snapshots de linhas e ciência.

**Impacto operacional:** Custos de armazenamento, backup e geração de
documentos dependem de retenção e repetição de lembretes.

**Segurança e integridade:** Disponibilidade/capacidade; integridade
criptográfica atual não foi contestada.

**Contingência:** Monitorar eventos por documento e backlog de requisições;
resolver pendências reais sem arquivar artificialmente.

**Recomendação:** Estabelecer benchmark e SLO; avaliar snapshot de estado com
referências/versionamento ao histórico canônico sem reescrever evidência
antiga.

**Alternativas:** Manter desenho atual se capacidade medida for aceitável;
separar eventos técnicos de lembrete das mudanças semânticas, mediante decisão
documental.

**Invariantes:** Hashes/PDFs existentes verificáveis; histórico preservado;
nenhuma alteração retroativa de versões.

**Dependências:** Volume esperado, retenção, política de lembretes e orçamento
de produção

**Esforço:** M para medir; L para redesenho

**Risco de regressão:** ALTO se alterar canonicalização

**Critérios de aceite:** Publicar limites medidos de latência/tamanho para
documento longo; desenho escolhido cumpre SLO e preserva verificação
histórica.

**Testes necessários:** Benchmark de crescimento e carga, restauração de
backup, hash de versões antigas, geração PDF longa

**Decisão humana:** Definir retenção, SLO e se lembrete deve gerar uma versão
semântica documental.

**Contraditório:** Não há recursão de corpos completos; o custo é quadrático
de entradas resumidas, não exponencial. Lotes limitam quantidade de documentos
por execução, não tamanho acumulado de um documento.

**Resultado do contraditório:** Estrutura de crescimento confirmada; nenhum
incidente ou tempo limite atribuído a ela sem benchmark. Revisão coordenada:
P3, sem latência/custo descumprido medido; priorização alinhada a BE-006.

## REPO-002 — P3

**ID:** REPO-002

**Título:** Ferramentas reutilizáveis gravam diretamente em auditorias
históricas

**Natureza:** REPOSITORY_HYGIENE

**Domínio:** Scripts e evidência

**Prioridade:** P3

**Confiança:** CONFIRMED

**Estado:** OPEN

**Persona:** Engenharia

**Jornada:** Repetir diagnóstico de catálogo, schema ou rastreabilidade

**Resumo:** Geradores usam destinos fixos de20/21outubro; inventárioUI fixa
baseline em código.

**Observado:** writeFileSync aponta para docs/audits/2026-10-20 ou21 e não
exige novo diretório/SHA; inventory-ui embute d467f92.

**Esperado:** Execução nova produz artefato datado sem substituir evidência
anterior implicitamente.

**Reprodução e alcance:** Inspecionar constantes de destino e chamadas
writeFileSync nos quatro scripts; execução mutável não necessária.

**Evidência:** scripts/build-traceability.mjs:3; scripts/audit-catalogue.mjs;
scripts/reconcile-database.mjs; scripts/inventory-ui.mjs

**Arquivos:** scripts/build-traceability.mjs; scripts/audit-catalogue.mjs;
scripts/reconcile-database.mjs; scripts/inventory-ui.mjs

**Rotas:** Não aplicável.

**Componentes:** Não aplicável.

**API:** Não aplicável.

**Objetos de banco:** Não aplicável.

**Causa:** Scripts de uma execução histórica mantidos como ferramentas
genéricas sem contrato de saída.

**Impacto humano:** Revisor pode perder a relação entre arquivo e execução
original.

**Impacto técnico:** Reprodutibilidade depende de cuidado manual com destino e
base.

**Impacto operacional:** Nova auditoria pode sobrescrever a anterior se a
ferramenta for reaproveitada.

**Segurança e integridade:** Não demonstra exposição de segredo nem corrupção
de banco.

**Contingência:** Não executar geradores antigos; produzir evidência em pasta
nova como nesta FaseA.

**Recomendação:** Parametrizar saída, SHA e data; recusar sobrescrita por
padrão ou mover para pasta histórica claramente identificada.

**Alternativas:** Manter script congelado junto do relatório para reprodução
exata em cópia isolada.

**Invariantes:** Preservar evidências e fontes históricas.

**Dependências:** Decisão de organização documental

**Esforço:** Pequeno

**Risco de regressão:** Baixo

**Critérios de aceite:** Execução padrão não altera relatórios antigos; nova
saída identificaSHA/data; overwrite exige escolha explícita.

**Testes necessários:** Dry-run do gerador em diretório temporário autorizado
e comparação de Git.

**Decisão humana:** Ferramenta reutilizável ou script histórico preservado.

**Contraditório:** Os arquivos não são chamados pela CI atual. Portanto risco
de uso manual e higiene, não bloqueador do produto.

**Resultado do contraditório:** DOWNGRADED

## UX-006 — P3

**ID:** UX-006

**Título:** Códigos internos e destinos ambíguos atravessam a linguagem da
interface

**Natureza:** EXPERIENCE_INCONSISTENCY

**Domínio:** UI_UX

**Prioridade:** P3

**Confiança:** CONFIRMED

**Estado:** OPEN

**Persona:** Família, supervisão e administração

**Jornada:** Pesquisar pendências e configurar a operação

**Resumo:** Filtros especiais mostram science_required/archive_pending;
convite mostra status bruto; histórico da escala mostra action; preferências
no menu levam à central de avisos.

**Observado:** Chips usam documentStatuses embora filtros especiais estejam em
historyStatuses. Menu Preferências e notificações abre /notificacoes, enquanto
preferências estão em /perfil.

**Esperado:** Termos portugueses do domínio e rótulos que descrevem destino e
ação.

**Reprodução e alcance:** Abrir link Ciências pendentes do dashboard e ler
chip; abrir menu pessoal; revisar convite e histórico de escala.

**Evidência:** src/components/documents/document-history.tsx:36;
src/components/documents/document-history.tsx:310;
src/components/documents/document-history.tsx:321;
src/components/layout/workspace-shell.tsx:52;
src/components/profile-console.tsx:206;
src/components/admin/admin-console.tsx:321;
src/components/schedules/schedule-console.tsx:63

**Arquivos:** src/components/documents/document-history.tsx;
src/components/layout/workspace-shell.tsx; src/components/profile-console.tsx;
src/components/admin/admin-console.tsx;
src/components/schedules/schedule-console.tsx

**Rotas:** /historico?type=REQ&status=science_required; /perfil;
/notificacoes; /escalas

**Componentes:** Não aplicável.

**API:** Não aplicável.

**Objetos de banco:** Não aplicável.

**Causa:** Dicionários incompletamente reutilizados e rótulo de menu agregando
intenções diferentes.

**Impacto humano:** Exige traduzir códigos e procurar controles em outra área.

**Impacto técnico:** Contrato de autorização/transação não é declarado
defeituoso por este achado.

**Impacto operacional:** Atrito de treinamento e suporte, sem alteração de
autorização.

**Segurança e integridade:** Não constitui demonstração de bypass de
autorização; avaliar impactos de decisão no domínio correspondente.

**Contingência:** Consultar perfil para preferências; usar filtros pelo
formulário.

**Recomendação:** Centralizar rótulos por domínio; separar Meus avisos de
Preferências de avisos; revisar nomes acessíveis dos chips.

**Alternativas:** Link de preferências dentro da central de avisos

**Invariantes:** Autorização servidor e paciente explícito; Preservação
documental, versões e idempotência; Não incluir quantidade solicitada em REQ

**Dependências:** Validação runtime quando indicada; Revisão do domínio antes
de implementação

**Esforço:** S–M

**Risco de regressão:** Baixo a médio; validar consumidores e linguagem.

**Critérios de aceite:** Filtros especiais e ações exibem rótulos conhecidos;
Menu leva ao destino indicado; Enums desconhecidos têm mensagem segura e
diagnóstico separado

**Testes necessários:** Snapshots de rótulos de filtros especiais; E2E destino
do menu e retorno

**Decisão humana:** Aprovar glossário, sem renomear contratos de banco.

**Contraditório:** StatusBadge tem vários rótulos já traduzidos; não se assume
que todo fallback bruto é alcançável. Evidências restritas aos caminhos
concretos.

**Resultado do contraditório:** CONFIRMED_AFTER_CHALLENGE

## UX-008 — P3

**ID:** UX-008

**Título:** Camadas visuais legadas mantêm decisões fora da fundação Fluent

**Natureza:** ARCHITECTURE_DEBT

**Domínio:** UI_UX

**Prioridade:** P3

**Confiança:** STRONG

**Estado:** OPEN

**Persona:** Todos os perfis; manutenção de UI

**Jornada:** Alternar entre gestão, wizards e comprovantes

**Resumo:** Tokens, overrides globais, utilitários e controles locais
coexistem; seleção de produto ainda possui cores próprias.

**Observado:** Fundação Fluent real convive com ui-* legadas, classes Tailwind
e cores de seleção/recibo definidas nos consumidores.

**Esperado:** Decisões recorrentes de seleção, espaçamento, foco e campo
derivadas de padrões compartilhados com consumidores reais.

**Reprodução e alcance:** Comparar shell, edição administrativa, seleção REQ e
recibo no mesmo viewport. Inspeção visual atual pendente; referências
históricas foram vistas.

**Evidência:** src/app/globals.css:1; src/theme/tokens.css:1;
src/app/design-system.css:48;
src/components/requisitions/requisition-steps.tsx:1;
src/components/requisitions/requisition-receipt.tsx:1

**Arquivos:** src/app/globals.css; src/theme/tokens.css;
src/app/design-system.css; src/components/requisitions/requisition-steps.tsx;
src/components/requisitions/requisition-receipt.tsx

**Rotas:** /admin; /fichas/req; /documentos/\[id\]

**Componentes:** Não aplicável.

**API:** Não aplicável.

**Objetos de banco:** Não aplicável.

**Causa:** Migração visual incremental preservou compatibilidade, sem
finalizar consolidação dos consumidores.

**Impacto humano:** Possível variação de hierarquia e estados; impacto
perceptivo atual exige render, não inferência por nomes de classe.

**Impacto técnico:** Aumenta superfície de manutenção e risco de mudança
inconsistente.

**Impacto operacional:** Manutenção precisa verificar múltiplas camadas para
mudar o mesmo padrão.

**Segurança e integridade:** Não constitui demonstração de bypass de
autorização; avaliar impactos de decisão no domínio correspondente.

**Contingência:** Preservar contratos atuais e revisar cada consumidor antes
de remover CSS.

**Recomendação:** Consolidar campo, grupo de quantidade, opção selecionável,
sumário de revisão e mensagens; migrar por consumidor com captura e teclado.

**Alternativas:** Manter controles nativos padronizados onde são mais
adequados à plataforma

**Invariantes:** Autorização servidor e paciente explícito; Preservação
documental, versões e idempotência; Não incluir quantidade solicitada em REQ

**Dependências:** Validação runtime quando indicada; Revisão do domínio antes
de implementação

**Esforço:** S–M

**Risco de regressão:** Baixo a médio; validar consumidores e linguagem.

**Critérios de aceite:** Seleção não se confunde com sucesso; Mesmo estado usa
tokens equivalentes; Não há regressão em toque/foco/contraste ou quantidades
exatas

**Testes necessários:** Inspeção320–1920 e contraste; Regressão visual por
componente migrado

**Decisão humana:** Escolher identidade documental e densidade; não copiar a
marca Microsoft.

**Contraditório:** Usar Fluent não exige substituir todo input nativo.
Roottokens antigos são sobrescritos e não provam cor final. Proposta de
reescrita integral foi rejeitada por falta de necessidade.

**Resultado do contraditório:** DOWNGRADED

## UX-009 — P3

**ID:** UX-009

**Título:** Histórico documental pode explicar versões em linguagem de negócio

**Natureza:** PRODUCT_OPPORTUNITY

**Domínio:** UI_UX

**Prioridade:** P3

**Confiança:** MODERATE

**Estado:** OPEN

**Persona:** Família e supervisor reconstruindo decisão antiga

**Jornada:** Investigar documento meses após emissão

**Resumo:** Eventos, autoria, versões e hashes existem, mas comparar versões e
compreender mudanças requer leitura de registros técnicos.

**Observado:** Timeline REQ mostra evento, autor e versão; supply detail lista
versões/eventos/hash. Não há diff de materiais antes/depois integrado.

**Esperado:** Oferecer comparação pertinente à tarefa sem apagar cadeia de
eventos.

**Reprodução e alcance:** Abrir documento com várias versões; expandir
histórico e tentar explicar quem mudou o quê.

**Evidência:** src/components/documents/document-timeline.tsx:15;
src/components/documents/supply-detail.tsx:1;
src/components/documents/document-actions.tsx:5

**Arquivos:** src/components/documents/document-timeline.tsx;
src/components/documents/supply-detail.tsx;
src/components/documents/document-actions.tsx

**Rotas:** /documentos/\[id\]

**Componentes:** Não aplicável.

**API:** Não aplicável.

**Objetos de banco:** Não aplicável.

**Causa:** Visualização expõe trilha técnica, com pouca síntese de alterações
de negócio.

**Impacto humano:** Auditoria cotidiana demanda esforço de comparação manual.

**Impacto técnico:** Contrato de autorização/transação não é declarado
defeituoso por este achado.

**Impacto operacional:** Suporte pode precisar de consultas técnicas para
reconstruir decisão.

**Segurança e integridade:** Não constitui demonstração de bypass de
autorização; avaliar impactos de decisão no domínio correspondente.

**Contingência:** Consultar eventos e comprovantes/versionamento já
preservados.

**Recomendação:** Links para PDF da versão e diff de itens/estado/autor,
distinguindo alteração e novo evento de comunicação.

**Alternativas:** Exportação resumida do histórico sem nova timeline

**Invariantes:** Autorização servidor e paciente explícito; Preservação
documental, versões e idempotência; Não incluir quantidade solicitada em REQ

**Dependências:** Validação runtime quando indicada; Revisão do domínio antes
de implementação

**Esforço:** S–M

**Risco de regressão:** Baixo a médio; validar consumidores e linguagem.

**Critérios de aceite:** Documento atual e versão histórica são identificados
inequivocamente; Comparação usa snapshots preservados; Sem confundir
ciência/atendimento/conferência

**Testes necessários:** E2E documento com versões e PDF anterior; Controle de
acesso também na versão histórica

**Decisão humana:** Definir quais diferenças são úteis e prioridade após
correções de decisão.

**Contraditório:** Histórico e versões não estão ausentes. É melhoria de
interpretação, sem alegação de perda de integridade.

**Resultado do contraditório:** DOWNGRADED

## UX-010 — P3

**ID:** UX-010

**Título:** Três componentes legados não possuem consumidores demonstráveis

**Natureza:** REPOSITORY_HYGIENE

**Domínio:** UI_UX

**Prioridade:** P3

**Confiança:** STRONG

**Estado:** OPEN

**Persona:** Manutenção do produto

**Jornada:** Alterar histórico, inventário e impressão

**Resumo:** RequisitionHistory, InventoryConsole e PrintButton têm
declarações, sem import/uso no código e testes examinados.

**Observado:** Busca de símbolos e caminhos em src/tests/scripts/docs/.github
encontra declarações e inventário histórico. /inventarios redireciona para
histórico BAL.

**Esperado:** Código mantido tem consumidor ou razão de retenção explícita.

**Reprodução e alcance:** Executar rg dos três símbolos/caminhos e rastrear
/inventarios até /historico?type=BAL.

**Evidência:** src/components/requisitions/requisition-history.tsx:1;
src/components/stock/inventory-console.tsx:1;
src/components/requisitions/print-button.tsx:1; src/app/inventarios/page.tsx:1

**Arquivos:** src/components/requisitions/requisition-history.tsx;
src/components/stock/inventory-console.tsx;
src/components/requisitions/print-button.tsx; src/app/inventarios/page.tsx

**Rotas:** /inventarios

**Componentes:** Não aplicável.

**API:** Não aplicável.

**Objetos de banco:** Não aplicável.

**Causa:** Adaptadores visuais anteriores permaneceram após unificação de
histórico/documento.

**Impacto humano:** Sem impacto direto comprovado no runtime atual.

**Impacto técnico:** Aumenta superfície de manutenção e risco de mudança
inconsistente.

**Impacto operacional:** Confusão para manutenção e revisões que tratam
componente órfão como fluxo ativo.

**Segurança e integridade:** Não constitui demonstração de bypass de
autorização; avaliar impactos de decisão no domínio correspondente.

**Contingência:** Marcar candidatos no inventário até alteração autorizada.

**Recomendação:** Candidatos a DELETE em fase posterior, após reconferir
consumidores estáticos/dinâmicos e build. Preservar rotas de compatibilidade e
contratos históricos.

**Alternativas:** Arquivar racional no histórico Git e remover arquivo; Reter
somente com consumidor/documentação explícitos

**Invariantes:** Autorização servidor e paciente explícito; Preservação
documental, versões e idempotência; Não incluir quantidade solicitada em REQ

**Dependências:** Validação runtime quando indicada; Revisão do domínio antes
de implementação

**Esforço:** S–M

**Risco de regressão:** Baixo a médio; validar consumidores e linguagem.

**Critérios de aceite:** Nenhum consumidor de build/importação/demonstração
depende do arquivo; Compatibilidade de URLs permanece testada; Nenhuma
migration/API histórica é removida por associação

**Testes necessários:** Busca completa de import e caminho; Build e smoke das
rotas substitutas

**Decisão humana:** Autorizar limpeza em Fase B após decisão de retenção.

**Contraditório:** Nomes e caminhos foram buscados além de src, incluindo
tests/scripts/docs/.github; referências de inventário são metadados, não
execução. Não foi proposta remoção imediata nem do backend legado.

**Resultado do contraditório:** CONFIRMED_AFTER_CHALLENGE

## UX-011 — P3

**ID:** UX-011

**Título:** Captura histórica rotulada revisão BAL ainda apresenta a primeira
etapa

**Natureza:** DOCUMENTATION_DRIFT

**Domínio:** UI_UX

**Prioridade:** P3

**Confiança:** CONFIRMED

**Estado:** OPEN

**Persona:** Revisor de evidências

**Jornada:** Avaliar homologação visual anterior

**Resumo:** bal-revisao-ios.png mostra Etapa 1 de 2 Contagem, revisão
desabilitada e campos de contagem.

**Observado:** A imagem inspecionada não contém a tela de comparação/revisão,
embora o nome e a matriz a apontem como evidência de revisão.

**Esperado:** Captura deve identificar e mostrar o estado declarado.

**Reprodução e alcance:** Abrir a imagem e comparar texto com seu nome e o
link da matriz ACCEPTANCE.

**Evidência:** docs/ui-ux/evidence/2026-10-25/bal-revisao-ios.png;
docs/ui-ux/ACCEPTANCE.md:63; docs/ui-ux/evidence/2026-10-25/manifest.json:71

**Arquivos:** docs/ui-ux/evidence/2026-10-25/bal-revisao-ios.png;
docs/ui-ux/ACCEPTANCE.md; docs/ui-ux/evidence/2026-10-25/manifest.json

**Rotas:** /fichas/bal

**Componentes:** Não aplicável.

**API:** Não aplicável.

**Objetos de banco:** Não aplicável.

**Causa:** Captura histórica aparentemente produzida durante transição; causa
não reproduzida nesta auditoria.

**Impacto humano:** Leitor pode superestimar cobertura visual da etapa.

**Impacto técnico:** Contrato de autorização/transação não é declarado
defeituoso por este achado.

**Impacto operacional:** Evidência de homologação menos precisa; não prova
defeito atual.

**Segurança e integridade:** Não constitui demonstração de bypass de
autorização; avaliar impactos de decisão no domínio correspondente.

**Contingência:** Tratar imagem como contagem/transição e gerar evidência
atual da revisão com título/estado aguardados.

**Recomendação:** Nova captura datada da segunda etapa, com manifesto de
SHA/viewport/perfil/estado e sem substituir história silenciosamente.

**Alternativas:** Corrigir descrição histórica e anexar evidência atual

**Invariantes:** Autorização servidor e paciente explícito; Preservação
documental, versões e idempotência; Não incluir quantidade solicitada em REQ

**Dependências:** Validação runtime quando indicada; Revisão do domínio antes
de implementação

**Esforço:** S–M

**Risco de regressão:** Baixo a médio; validar consumidores e linguagem.

**Critérios de aceite:** Imagem mostra Etapa2 de2 e comparação
contada/referência; Manifesto identifica commit e ambiente

**Testes necessários:** Inspeção humana da imagem além de assert de screenshot

**Decisão humana:** Não necessária para classificar alcance da evidência.

**Contraditório:** Contagem e rodapé têm imagens distintas coerentes; problema
limitado à captura chamada revisão. Testes históricos podem ter validado o
fluxo sem que essa imagem o prove.

**Resultado do contraditório:** CONFIRMED_AFTER_CHALLENGE
