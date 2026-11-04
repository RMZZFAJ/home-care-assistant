# Registro mestre B5

14 registros, 31 campos cada: 12 P2 e 2 P3. Nenhum novo P0/P1. Oito causas de
defeito novas (com prova local/controlada delimitada), dois riscos novos, uma
questão de governança, uma lacuna operacional e duas manifestações ampliadas.
Não são 14 incidentes externos nem 14 descobertas independentes de todo o
histórico.

B5-004 amplia BE-002; B5-010 amplia B4-012. B4-011, DB-002/B3-001 e outros
achados anteriores continuam nas dependências, sem inflar este registro.
Provas de adaptador, SQL e navegador não equivalem a homologação. Estado de
falha sintético e risco simulado são declarados individualmente.

## B5-001 — Continuidade de lembretes legados

**Título:** Lembretes legados não recuperam períodos perdidos ao atravessar o
dia

**Prioridade:** P2

**Natureza:** Risco sustentado de continuidade

**Estado:** ABERTO_DIAGNOSTICO

**Confiança:** ALTA_FONTE;sem incidente temporal executado

**Origem na B5:** NOVO_B5_RISCO

**Integração afetada:** Cron e lembrete BAL/plantão legado

**Processo:** Solicitar contagem ou relato do período

**Persona:** Profissional e responsável pela automação

**Evento de origem:** Interrupção que atravesse o dia agendado

**Contrato esperado:** Recuperação ou lacuna explicitamente identificada, sem
afirmar presença ou contagem retroativa.

**Resultado observado:** Seleção usa today e clock_hour; só cria period=today
quando dia configurado coincide; não busca período perdido.

**Causa sustentada:** Elegibilidade calculada somente no instante corrente,
sem agenda persistida/cursor de datas nesse legado.

**Caminho técnico:** private.enqueue_scheduled_reminders; catálogo B3
verificado no baseline; relatório02

**Evidência:**
[02_SCHEDULERS_CRON_AND_PROGRESS.md](02_SCHEDULERS_CRON_AND_PROGRESS.md) ;
[evidence/active-topology.json](evidence/active-topology.json)

**Método de prova:** Leitura estática da definição SQL vigente; contraprova
temporal por predicado, sem relógio alterado.

**Estado persistido:** Nenhum dado criado para este cenário; ausência de
backfill inferida do contrato.

**Efeito externo observado ou simulado:** Nenhum envio; interrupção real de
cron não induzida.

**Consequência operacional:** Lembrete do dia anterior pode nunca ser
materializado após retorno do serviço.

**Consequência humana:** Equipe/família pode interpretar ausência de aviso
como ausência de tarefa.

**Consequência de segurança:** Sem bypass demonstrado; não se deve inventar
responsabilidade/presença passada.

**Recuperação disponível:** Registrar/consultar tarefa manualmente; legado não
fornece recuperação automática do período perdido.

**Contraprova:** Após falha curta no mesmo dia ainda há elegibilidade; BAL por
plantão usa obrigações/cursor próprios.

**Limitações:** Não foi simulada indisponibilidade real; política de catch-up
do legado ainda precisa decisão. Não generalizar ao BAL por plantão.

**Relação A/B1/B2/B3/B4:** DB-006/B3-001 tratam alcance/lotes; esta é uma
dimensão temporal diferente, sem repetir starvation.

**Alternativas futuras:** Definir aviso de lacuna, catch-up limitado ou
retirar legado do escopo; aproveitar obrigações existentes quando adequado.

**Risco de regressão:** Gerar lembrete retroativo enganoso, duplicar janelas
ou imputar falta de presença.

**Critérios de aceitação:** Com serviço ausente no dia D e retorno D+1,
política escolhida identifica o período perdido ou o recupera uma vez; nenhuma
contagem/ciência é fabricada.

**Testes futuros:** Antes/depois da hora, mesmo dia, dia seguinte, fuso,
mudança de configuração, cron repetido e regime BAL ativo.

**Decisão pendente:** Decisão operacional/produto: catch-up e responsável ou
legado desabilitado no piloto.

## B5-002 — Retomada de hold sem template

**Título:** Hold por template ausente fica pendente sem retomada pela API

**Prioridade:** P2

**Natureza:** Falha de recuperação em estado suportado

**Estado:** ABERTO_DIAGNOSTICO

**Confiança:** CONFIRMADO_SQL_ESTADO_SINTETICO

**Origem na B5:** NOVO_B5_DEFEITO

**Integração afetada:** Outbox e registro de templates

**Processo:** Regularizar configuração e retomar envio

**Persona:** Administrador local/operador do canal

**Evento de origem:** complete recebe EVENT_TEMPLATE_NOT_CONFIGURED

**Contrato esperado:** Depois de regularizar a causa, há retomada autorizada
identificável, sem editar fila diretamente.

**Resultado observado:** pending/infinity sem template vinculado não foi
liberado por inserção aprovada; retry recusou estado pending.

**Causa sustentada:** Holds e retry têm conjuntos incompatíveis: liberação só
cobre aprovação de nome/versão já vinculados ou PDF; retry só
failed/uncertain.

**Caminho técnico:** public.complete_notification_job;
private.release_template_holds; public.retry_notification_job

**Evidência:**
[evidence/b53-queue-results.json#B53-S01](evidence/b53-queue-results.json#B53-S01)
;
[evidence/b53-queue-results.json#B53-S02](evidence/b53-queue-results.json#B53-S02)

**Método de prova:** SQL vigente, fixtures novas, rollback; retry com claims
de sessão Auth real e contexto administrativo.

**Estado persistido:** Na transação: pending, next_attempt_at infinity,
template_name null; rollback final.

**Efeito externo observado ou simulado:** Nenhum; não houve remoção de
template, envio ou alteração de registro existente.

**Consequência operacional:** Configuração pode ficar corrigida enquanto
trabalho continua indefinidamente inelegível.

**Consequência humana:** Responsável vê pendência sem ação de retomada
aplicável.

**Consequência de segurança:** Retomar não deve dispensar revalidação de
destinatário/opt-in ou reenviar incerto.

**Recuperação disponível:** Gatilho existente funciona para template
conhecido; não existe retry HTTP desse pending. Intervenção técnica exigiria
autorização futura.

**Contraprova:** PREPARED→APPROVED de template conhecido liberou hold e zerou
attempts; PDF tem liberação própria.

**Limitações:** Resultado missing-template foi injetado em linha nova;
registro normal contém os contratos preparados. Não foi demonstrado incidente
no registro completo normal nem remoção via API.

**Relação A/B1/B2/B3/B4:** B3/B4 conservaram estados/retentativas; lacuna
específica de retomada do hold não estava catalogada.

**Alternativas futuras:** Identificar motivo/contrato esperado e permitir
reavaliação autorizada de hold após configuração, com audit.

**Risco de regressão:** Despausar em massa sem correção, enviar para revogado
ou perder prioridade/quiet hours.

**Critérios de aceitação:** Hold por contrato ausente, depois de regularizado,
tem ação suportada e auditada que torna elegível apenas o trabalho autorizado;
template conhecido e PDF continuam liberando corretamente.

**Testes futuros:** Registro ausente, aprovação tardia, versão/idioma
distintos, disabled, telefone trocado, quinto attempt e retry incerto
proibido.

**Decisão pendente:** Definir quais holds podem ser reavaliados e quem
confirma configuração; condicionado ao uso do canal.

## B5-003 — Incerteza anterior ao envio

**Título:** Timeout no upload de mídia vira entrega incerta antes de iniciar a
mensagem

**Prioridade:** P2

**Natureza:** Defeito confirmado de classificação/recuperação

**Estado:** ABERTO_DIAGNOSTICO

**Confiança:** CONFIRMADO_ADAPTADOR;PERSISTENCIA_SQL_SEPARADA

**Origem na B5:** NOVO_B5_DEFEITO

**Integração afetada:** Meta media/messages e worker

**Processo:** Preparar PDF e recuperar falha anterior ao envio

**Persona:** Destinatário e operador de notificações

**Evento de origem:** Exceção/timeout em media upload

**Contrato esperado:** Distinguir upload incerto de mensagem possivelmente
aceita; não exigir conciliação de entrega que não foi iniciada.

**Resultado observado:** Só /media foi chamado; provider retornou
uncertain/PROVIDER_RESULT_UNCERTAIN. HTTP503 de upload retornou
pending/MEDIA_UPLOAD_FAILED.

**Causa sustentada:** Catch geral ignora a etapa em que falhou e aplica
semântica de messages ao upload.

**Caminho técnico:** src/lib/notifications/provider.ts:145 e catch final;
worker.ts:65; public.complete_notification_job

**Evidência:**
[evidence/b53-provider-results.json#B53-C01](evidence/b53-provider-results.json#B53-C01)
;
[evidence/b53-queue-results.json#B53-S03](evidence/b53-queue-results.json#B53-S03)

**Método de prova:** Provider real com transporte controlado sem rede; SQL
complete vigente em fixture separada com rollback.

**Estado persistido:** SQL guardou uncertain sem referência; não há vínculo
transacional com o teste de transporte.

**Efeito externo observado ou simulado:** Simulado: uma chamada de upload,
zero messages. Nenhum efeito Meta real observado.

**Consequência operacional:** Entrega fica bloqueada para retry automático
apesar de a mensagem não ter sido iniciada.

**Consequência humana:** Operador recebe trabalho de conciliação sem
referência de mensagem consultável.

**Consequência de segurança:** Classificação conservadora protege contra
reenvio após messages; preservá-la nessa etapa.

**Recuperação disponível:** Conciliação/retry manual atual; nova preparação
pode repetir upload sem repetir mensagem.

**Contraprova:** Timeout depois de upload bem-sucedido e chamada messages
permaneceu uncertain corretamente; upload503 retornou pending.

**Limitações:** Não mede latência real nem prova upload órfão ou comportamento
Meta. O exemplo usa PDF sintético.

**Relação A/B1/B2/B3/B4:** BE-003 trata orçamento; B4-010 janela de envio. A
distinção de etapa do catch é nova.

**Alternativas futuras:** Rastrear estágio do adaptador e usar resultado
próprio para falha anterior à chamada de mensagem.

**Risco de regressão:** Transformar resultado messages desconhecido em retry
seguro e causar duplicação externa.

**Critérios de aceitação:** Exceção anterior a messages não afirma mensagem
aceita/entregue nem exige conciliação de entrega; exceção durante/depois de
messages mantém uncertain e não reenvia automaticamente.

**Testes futuros:** Timeout e JSON inválido em upload, upload aceito/resposta
perdida, falha de messages,5xx,429 e crash após resposta.

**Decisão pendente:** Definir recuperação de upload e eventual
reutilização/retencão de mediaId, sem serviço novo obrigatório.

## B5-004 — Fidelidade das mensagens por evento

**Título:** Representação genérica também confunde conclusão REQ, COM parcial
e cancelamento ENT

**Prioridade:** P2

**Natureza:** Falha de comunicação;manifestação anterior ampliada

**Estado:** ABERTO_DIAGNOSTICO

**Confiança:** CONFIRMADO_APRESENTADOR;SQL_LIDO

**Origem na B5:** MANIFESTACAO_ANTERIOR_AMPLIADA

**Integração afetada:** Presenter WhatsApp e catálogo de templates

**Processo:** Informar conclusão, validação e cancelamento

**Persona:** Família, profissional e administrador

**Evento de origem:** req.completed;com.receive parcial
administrativo;ent.cancel final

**Contrato esperado:** Texto e cada variável devem corresponder ao fato e
estado do evento, sem solicitar ação já concluída.

**Resultado observado:** REQ concluída usou data anterior de ciência; COM
parcial escolheu pedido de validação; ENT já cancelled usou
revisão/manifestação de cancelamento.
Leitura estática adicional: req.reminder só por ciência pode anunciar materiais
pendentes com zero linhas; occurrence.received atribui autoria a confirmador
que não criou o relato. Não foram novas execuções ou envios.

**Causa sustentada:** Seleção/valores genéricos por evento/status não
distinguem fato operacional, origem do ato e data pertinente.

**Caminho técnico:** src/lib/notifications/document-notification.ts;
src/lib/notifications/template-registry.ts; audited_legacy_supply_command
vigente

**Evidência:**
[evidence/b54-content-cases.json#B54-C01](evidence/b54-content-cases.json#B54-C01)
;
[evidence/b54-content-cases.json#B54-C02](evidence/b54-content-cases.json#B54-C02)
;
[evidence/b54-content-cases.json#B54-C03](evidence/b54-content-cases.json#B54-C03)
;
[Relatório semântico 04](04_WHATSAPP_OUTBOUND_TEMPLATES_AND_MEDIA.md)

**Método de prova:** Presenter/registry reais com payload SQL controlado; ramo
SQL de recebimento administrativo lido. Sem envio ou nova COM/ENT persistida.

**Estado persistido:** Nenhum documento novo neste teste; provas anteriores de
eventos/snapshots reutilizadas.

**Efeito externo observado ou simulado:** Texto/parâmetros preparados em
memória, sem transmissão Meta.

**Consequência operacional:** Mensagem pode indicar data errada ou providência
desnecessária e divergir do app.

**Consequência humana:** Família pode procurar validação/consentimento que já
ocorreu ou interpretar errado a última entrega.

**Consequência de segurança:** Sem autorização indevida demonstrada; conteúdo
não pode inventar ciência/recebimento/consumo.

**Recuperação disponível:** Consultar documento/evento no aplicativo; mensagem
já enviada não pode ser apagada por correção do presenter.

**Contraprova:** ENT integral exibiu 1 de 1 e filename versionado correto;
evento/PDF selecionado não virou versão atual silenciosamente.

**Limitações:** BE-002 BAL/data A não foi reexecutado; novos payloads são
controlados. Outros atores/contadores revistos estaticamente não foram todos
persistidos. As duas manifestações adicionais de lembrete/autoria decorrem
de SQL/template, sem execução nova ou transmissão.

**Relação A/B1/B2/B3/B4:** Amplia BE-002 da A, preservado em B3/B4; não são
três descobertas independentes nem correção de PDF B6.

**Alternativas futuras:** Semântica por evento/fato e variantes de estado;
testar valores finais e texto, preservando contratos corretos.

**Risco de regressão:** Trocar ciência por atendimento, perder parcialidade,
atribuir ator errado ou reescrever templates/PDFs históricos.

**Critérios de aceitação:** REQ usa data do atendimento concluído; COM já
validada não pede validação; ENT final se distingue de consentimento pendente;
contadores/atores corretos por evento. Lembrete distingue ciência de materiais;
aviso ao confirmador não atribui autoria de relato alheio.

**Testes futuros:** Emissão/revisão, doação, COM parcial/total por
admin/outro, ciência antes/depois da entrega, ENT
cancellation_pending/cancelled, BAL/reconto.

**Decisão pendente:** Aprovar linguagem e fatos por evento antes de homologar
templates; preservar versões antigas e fronteira B6.

## B5-005 — Minimização e governança

**Título:** Minimização anunciada não é garantida pelo conteúdo externo
preparado

**Prioridade:** P2

**Natureza:** Questão de governança e privacidade sustentada

**Estado:** PENDENTE_DECISAO_GOVERNANCA

**Confiança:** ALTA_FONTE_E_PARAMETRO_CONTROLADO

**Origem na B5:** NOVO_B5_GOVERNANCA

**Integração afetada:** Templates, payload de aviso e PDF externo

**Processo:** Definir conteúdo necessário e destino antes de habilitar

**Persona:** Paciente, família e controlador da operação

**Evento de origem:** Preparar nome_paciente, alerta de produto e PDF

**Contrato esperado:** Promessa de minimização deve corresponder aos campos
efetivos e à decisão de governança.

**Resultado observado:** nome_paciente aceita nome completo; SQL tem fallback
ao nome do paciente; alerta inclui produto/saldo; documentação anuncia omissão
de nome/dados clínicos.

**Causa sustentada:** Texto de governança diverge do contrato de templates e
fallback; short name é opcional, sem gate de conteúdo mínimo.

**Caminho técnico:**
notification_document_payload;notification_notice_payload;template-catalog.json;docs/WHATSAPP_AI.md

**Evidência:**
[evidence/b54-content-cases.json#B54-C05](evidence/b54-content-cases.json#B54-C05)
;
[11_PRIVACY_OBSERVABILITY_AND_CAPACITY.md](11_PRIVACY_OBSERVABILITY_AND_CAPACITY.md)

**Método de prova:** Leitura de payload SQL e catálogo; namedBody com valor
inteiramente fictício; nenhuma comunicação real.

**Estado persistido:** Nenhum dado pessoal real foi usado ou persistido pelos
testes de conteúdo.

**Efeito externo observado ou simulado:** Nenhum; não houve vazamento ou envio
indevido observado.

**Consequência operacional:** Habilitar o canal pode transmitir mais contexto
que o responsável imagina pelo documento atual.

**Consequência humana:** Nome/material pode aparecer em aparelho compartilhado
ou tela bloqueada após envio autorizado.

**Consequência de segurança:** Governança de dados, não bypass de
telefone/RLS. Opt-in e capacidade existem, mas não decidem necessidade de cada
campo.

**Recuperação disponível:** Manter canal desligado até decisão; usar app
privado e conteúdo mínimo. Revogação não recolhe cópia externa já recebida.

**Contraprova:** Paciente pode configurar nome curto;
destinatário/telefone/opt-in são revalidados; logs não incluem payload.

**Limitações:** Sem parecer jurídico, inspeção de aparelho real, base legal
definida ou prova de envio. Medicamento em alerta depende do catálogo usado.

**Relação A/B1/B2/B3/B4:** A/B1 registraram texto/privacidade geral; esta
divergência concreta de promessa e payload é uma questão B5, sem chamar toda
configuração de vulnerabilidade.

**Alternativas futuras:** Aprovar campos por evento, exigir identificador
mínimo quando necessário e alinhar documentação/consentimento; PDF pode
permanecer app-only.

**Risco de regressão:** Remover informação indispensável para tarefa ou criar
ambiguidade entre pacientes; copiar dados em nova telemetria.

**Critérios de aceitação:** Responsável aprova matriz de campos/destinos;
mensagem real sintética contém só o conjunto aprovado e explica limites de
cópia/retencão; documentação corresponde ao contrato.

**Testes futuros:** Short name ausente/presente, nomes longos, alertas
sensíveis, PDF, tela bloqueada, contato trocado e acesso revogado.

**Decisão pendente:** Decisão de governança/produto sobre conteúdo, retenção,
operadores e canais iniciais; não conclusão jurídica.

## B5-006 — Continuação de entrada não processada

**Título:** Entrada sem contexto ou resposta recusada não recebe continuação
recuperável

**Prioridade:** P2

**Natureza:** Falha de recuperação e comunicação

**Estado:** ABERTO_DIAGNOSTICO

**Confiança:** CONFIRMADO_SQL_E_HANDLER_CONTROLADO

**Origem na B5:** NOVO_B5_DEFEITO

**Integração afetada:** Webhook inbound e seleção de paciente

**Processo:** Relatar falta/consumo ou responder desafio

**Persona:** Profissional vinculado a dois pacientes e destinatário de desafio

**Evento de origem:** Texto com contexto ambíguo;RPC de desafio retorna
false;tipo sem processador

**Contrato esperado:** Recusar operação insegura, mas distinguir
descartado/pendente e encaminhar a pessoa para continuação autorizada.

**Resultado observado:** Duas memberships elegíveis retornaram
needsAuthenticatedSelection, sem inbound/relato; handler conta processed1.
Áudio e botão desconhecido somaram processed sem RPC.

**Causa sustentada:** Resultado de contexto/RPC é ignorado para a resposta;
processed usa tamanho de arrays, sem handoff durável mínimo.

**Caminho técnico:** src/app/api/notifications/webhook/route.ts:104
e127;public.inbound_report_context;public.ingest_whatsapp_report

**Evidência:**
[evidence/b55-webhook-cases.json#B55-C03](evidence/b55-webhook-cases.json#B55-C03)
;
[evidence/b55-inbound-results.json#B55-S01](evidence/b55-inbound-results.json#B55-S01)

**Método de prova:** Handler/HMAC reais com RPC controlada; SQL vigente com
telefone Auth fictício e novas memberships em rollback.

**Estado persistido:** Ambíguo:0inbound/0relatos. Controle único:1relato
pending, replay duplicate,0ledger.

**Efeito externo observado ou simulado:** Nenhuma mensagem real ou resposta
automática externa enviada.

**Consequência operacional:** Comunicação legítima pode não virar tarefa de
revisão e não ter recuperação local identificável.

**Consequência humana:** Quem informou falta pode acreditar que a
equipe/família recebeu a pendência.

**Consequência de segurança:** É correto não adivinhar paciente nem aceitar
comando desconhecido; preservar esse controle.

**Recuperação disponível:** Usar app com paciente selecionado; não há handoff
criado para esse texto na rota. Algumas recusas ENT têm registro próprio.

**Contraprova:** Com contexto único, relato/dedup funcionaram e nenhum débito
ocorreu; erro RPC devolveu503 em vez de sucesso.

**Limitações:** Não houve lote ou perda Meta real. Nem toda recusa é sem
registro: ENT registra rejected em certos ramos. Retenção de texto precisa
governança.

**Relação A/B1/B2/B3/B4:** B4-011 é validação de lote inteiro e200com
descarte; aqui o item válido é reconhecido, mas não encaminhado. B3-011 limita
busca de relatos que chegaram a existir.

**Alternativas futuras:** Resultado por item e continuação autenticada com
diagnóstico mínimo; não armazenar todo envelope por padrão.

**Risco de regressão:** Atribuir ao paciente errado, processar áudio/comando
desconhecido ou duplicar relato em reentrega.

**Critérios de aceitação:** Texto ambíguo e comando recusado ficam
explicitamente ignorados/pendentes com recuperação aprovada; processed não
afirma efeito inexistente; contexto único continua deduplicado.

**Testes futuros:** Dois pacientes, nenhum vínculo, revogação entre
contexto/ingestão, telefone trocado, item desconhecido, lote parcial, replay e
retomada autenticada.

**Decisão pendente:** Escolher handoff e retenção mínimos; áudio pode
continuar fora da promessa.

## B5-007 — Origem do estado visto

**Título:** Resposta externa sem ocorrências é apresentada como vista no
aplicativo

**Prioridade:** P3

**Natureza:** Falha de comunicação de origem

**Estado:** ABERTO_DIAGNOSTICO

**Confiança:** CONFIRMADO_SQL_E_FONTE_UI

**Origem na B5:** NOVO_B5_DEFEITO

**Integração afetada:** No-issues e central de notificações

**Processo:** Resolver lembrete de turno

**Persona:** Profissional e familiar que acompanha avisos

**Evento de origem:** HCA_NO_ISSUES válido

**Contrato esperado:** Resolução externa tem origem própria e não prova visita
ao aplicativo.

**Resultado observado:** acknowledge_no_issues marcou seen_at em notificações
do lembrete; central usa rótulo Vista no aplicativo, sem app aberto.

**Causa sustentada:** seen_at acumula resolução externa e visualização
interna, enquanto UI atribui origem única.

**Caminho técnico:**
public.acknowledge_no_issues;src/components/notifications/notification-center.tsx

**Evidência:**
[evidence/b56-interaction-results.json#B56-S02](evidence/b56-interaction-results.json#B56-S02)

**Método de prova:** SQL vigente com phone Auth fictício, fixture nova e
rollback; apresentação lida em fonte.

**Estado persistido:** Um audit shift.no_issues e seen_at definidos; nenhum
movimento. Rollback final.

**Efeito externo observado ou simulado:** Resposta simulada na RPC, sem
WhatsApp ou abertura de app.

**Consequência operacional:** Histórico visual não diferencia resolver por
WhatsApp de visitar o aplicativo.

**Consequência humana:** Pode sugerir que a pessoa viu conteúdo no app quando
apenas respondeu ao lembrete.

**Consequência de segurança:** Sem efeito físico ou capacidade extra; não
tratar visto como ciência ou aceite.

**Recuperação disponível:** Audit preserva origem; consultar ação
shift.no_issues esclarece a resolução.

**Contraprova:** Replay não duplicou audit; telefone/propósito/prazo/revogação
recusados; lembrete foi legitimamente resolvido.

**Limitações:** Não houve render específico desse rótulo nem aparelho físico;
ligação campo→label é estática.

**Relação A/B1/B2/B3/B4:** B1 diferenciava visto/ciência; nova origem externa
do mesmo campo não havia sido demonstrada.

**Alternativas futuras:** Separar motivo de resolução ou ajustar rótulo sem
recriar pendência já respondida.

**Risco de regressão:** Voltar a contar lembrete respondido ou transformar
resposta sem ocorrências em contagem/consumo.

**Critérios de aceitação:** Resposta externa resolve uma vez e exibe origem
verdadeira; visto interno continua independente de delivered/read e ciência.

**Testes futuros:** Resposta rápida, app mark seen, no_issues Flow, replay,
vários canais e contador.

**Decisão pendente:** Escolher rótulo/modelo mínimo de origem; melhoria pode
acompanhar correções de notificação.

## B5-008 — Replay de Flow sem ocorrências

**Título:** Flow sem ocorrências recusa replay idêntico após sucesso

**Prioridade:** P2

**Natureza:** Falha de recuperação

**Estado:** ABERTO_DIAGNOSTICO

**Confiança:** CONFIRMADO_SQL_SINTETICO

**Origem na B5:** NOVO_B5_DEFEITO

**Integração afetada:** Flow occurrence/no_issues

**Processo:** Recuperar resultado quando resposta se perde

**Persona:** Profissional preenchendo Flow

**Evento de origem:** Repetir token/payload no_issues dentro do prazo após
primeiro sucesso

**Contrato esperado:** Recuperar o resultado confirmado, sem novo efeito nem
erro de operação não concluída.

**Resultado observado:** Primeira chamada retornou noIssues true; replay
idêntico deu42501, com uma única submissão persistida na transação.

**Causa sustentada:** Ramo no_issues rejeita used_at antes de recuperar
resultado, diferentemente do ramo de texto.

**Caminho técnico:** public.flow_exchange ramo occurrence/no_issues

**Evidência:**
[evidence/b57-flow-results.json#B57-S03](evidence/b57-flow-results.json#B57-S03)

**Método de prova:** SQL vigente, nova sessão criada com claims Auth reais;
exchange serviço simulado; rollback.

**Estado persistido:** Uma submissão no_issues e sessão usada; nenhum ledger;
rollback final.

**Efeito externo observado ou simulado:** Nenhum Flow real publicado ou
cliente Meta exercitado; perda de resposta é hipótese temporal modelada por
replay.

**Consequência operacional:** Cliente não obtém confirmação recuperável de
trabalho já registrado.

**Consequência humana:** Pessoa pode repetir preenchimento em outra sessão ou
duvidar de que informou corretamente.

**Consequência de segurança:** Não duplicou operação física; correção não deve
reabrir token para comando diferente.

**Recuperação disponível:** Histórico técnico pode confirmar resultado;
endpoint não recupera esse replay. Consulta autenticada é alternativa futura.

**Contraprova:** Texto idêntico repetido retornou pendingConfirmation e
conservou uma submissão; ENT confirm tem resultado salvo por contrato.

**Limitações:** No_issues não comprova presença ou vínculo a um plantão
específico; não houve perda de rede real nem Meta.

**Relação A/B1/B2/B3/B4:** BE-005/B4 recuperação de intenção dão contexto;
este ramo Flow tem causa específica nova.

**Alternativas futuras:** Guardar/recuperar resultado do propósito por sessão
e exigir payload equivalente para replay.

**Risco de regressão:** Aceitar conteúdo divergente no mesmo token ou
registrar ausência de ocorrências para período errado.

**Critérios de aceitação:** Replay idêntico dentro da política recupera o
mesmo resultado e uma submissão; conteúdo divergente recusa; prazo/revogação
seguem política explícita.

**Testes futuros:** Resposta perdida, duplo clique concorrente, retry após
expiração, payload diferente e no_issues versus texto.

**Decisão pendente:** Definir prazo e autoridade da consulta de resultado
terminal sem reativar sessão usada.

## B5-009 — Erros do protocolo Flow

**Título:** Erros de sessão e avisos do cliente Flow não usam a recuperação do
protocolo cifrado

**Prioridade:** P2

**Natureza:** Falha de integração local;homologação externa pendente

**Estado:** ABERTO_DIAGNOSTICO

**Confiança:** CONFIRMADO_HANDLER_CONTROLADO_E_REFERENCIA_OFICIAL

**Origem na B5:** NOVO_B5_DEFEITO

**Integração afetada:** Endpoint cifrado Meta Flows

**Processo:** Expiração, revogação e diagnóstico do cliente

**Persona:** Usuário de Flow e operador da integração

**Evento de origem:** Token inválido/expirado ou data.error do cliente

**Contrato esperado:** Erro autorizado usa formato/código apropriado ao Flow e
aviso de erro é reconhecido sem executar comando.

**Resultado observado:** RPC expired simulada gerou403 JSON aberto; data.error
recebeu400 antes de RPC, sem acknowledged.

**Causa sustentada:** Wrapper API genérico trata falhas da fronteira Flow;
union de data não inclui notificação de erro.

**Caminho técnico:**
src/app/api/whatsapp/flows/route.ts;src/lib/notifications/flows.ts:flowRequest;src/lib/server/api.ts

**Evidência:**
[evidence/b57-endpoint-cases.json#B57-C02](evidence/b57-endpoint-cases.json#B57-C02)
;
[evidence/b57-endpoint-cases.json#B57-C03](evidence/b57-endpoint-cases.json#B57-C03)
;
[07_WHATSAPP_FLOWS_SECURITY_AND_CONTRACTS.md](07_WHATSAPP_FLOWS_SECURITY_AND_CONTRACTS.md)

**Método de prova:** Chaves efêmeras reais, HMAC/envelope/handler reais, RPC
controlada; comparação com exemplos oficiais WhatsApp-Flows-Tools.

**Estado persistido:** Nenhuma persistência atribuída à RPC fake; schema
rejeitou aviso antes de processamento.

**Efeito externo observado ou simulado:** Nenhum cliente Meta real. Efeito
visual/retry externos não demonstrados.

**Consequência operacional:** Fluxo de expiração/erro pode ficar sem a
recuperação e diagnóstico previstos pelo protocolo.

**Consequência humana:** Pessoa pode ver erro genérico em vez de encerramento
compreensível da sessão.

**Consequência de segurança:** HMAC/cipher inválidos continuam negados;
adaptar resposta não deve revelar outro paciente ou token.

**Recuperação disponível:** Abrir aplicativo/sessão nova quando permitido; não
há tratamento específico cifrado de token inválido no handler.

**Contraprova:** Ping cifrado com IV invertido funcionou; assinatura errada403
e ciphertext alterado421 não chamaram RPC.

**Limitações:** Referência oficial exemplifica427 cifrado e432; ausência de
homologação não prova que todo Flow falha. A cifra local correta não certifica
publicação.

**Relação A/B1/B2/B3/B4:** B4 examinou fronteira e erros genéricos; tratamento
protocolar de expiração/client error é aprofundamento novo.

**Alternativas futuras:** Adaptador de erro específico Flow após decifragem e
ACK seguro para client error; manter logs sanitizados.

**Risco de regressão:** Responder sucesso para operação recusada, plaintext
privado ou enfraquecer assinatura/cifra.

**Critérios de aceitação:** Token inválido e client error seguem contrato
oficial escolhido e são verificáveis no cliente Meta; nenhuma operação é
aplicada em recusa; código/erro não expõem dados.

**Testes futuros:** Token vencido/revogado, chave rotacionada, HMAC errado,
erro cliente, INIT/BACK/data_exchange e indisponibilidade SQL.

**Decisão pendente:** Corrigir fronteira e homologar códigos/formatos na
versão Meta antes de habilitar Flow.

## B5-010 — Frescor dos consumidores

**Título:** FlowReviews não consulta após invalidação confirmada;fila admin
tem padrão semelhante

**Prioridade:** P2

**Natureza:** Falha de comunicação/frescor;manifestação ampliada

**Estado:** ABERTO_DIAGNOSTICO

**Confiança:** CONFIRMADO_BROWSER_FLOW;ADMIN_ESTATICO

**Origem na B5:** MANIFESTACAO_ANTERIOR_AMPLIADA

**Integração afetada:** Realtime, WorkspaceProvider e consumidores

**Processo:** Encontrar submissão pendente e acompanhar fila

**Persona:** Autor de Flow e administrador

**Evento de origem:** Submissão nova com tela já aberta e revisão de workspace
alterada

**Contrato esperado:** Sinal confirmado atualiza read model ou informa
atualização acionável sem reload completo.

**Resultado observado:** Sync3→5, evento1, contexto1 e sino3consultas; zero
GET Flow em 35s. Reload mostrou a submissão. Admin queue não depende de live
revision em fonte.

**Causa sustentada:** FlowReviews depende somente de patientId/attempt; admin
load depende de seção/ID/página, sem revisão. Contexto igual não força o
efeito.

**Caminho técnico:**
src/components/stock/flow-reviews.tsx:45;src/components/admin/admin-console.tsx:100;src/components/layout/workspace-context.tsx

**Evidência:**
[evidence/b58-browser-results.json#B58-U01](evidence/b58-browser-results.json#B58-U01)
; [evidence/b58-submission-results.json](evidence/b58-submission-results.json)

**Método de prova:** Chrome real, servidor próprio/guard, Auth/RPC locais e
SQL independente; build B3 reaproveitado. Admin apenas leitura estática.

**Estado persistido:** Uma nova submissão pending_confirmation em paciente
sintético permaneceu para inspeção.

**Efeito externo observado ou simulado:** Nenhum Flow Meta; canal externo
false e origem do browser limitada a local.

**Consequência operacional:** Pendência recebida pode ficar fora do percurso
da tela aberta, embora sinal e dados existam.

**Consequência humana:** Profissional/família pode acreditar que não há nada a
revisar.

**Consequência de segurança:** Sem acesso cruzado demonstrado; contexto e RLS
continuam revalidados.

**Recuperação disponível:** Reload completo recuperou; revisão própria
atualiza attempt. Lista não tem refresh próprio para nova submissão.

**Contraprova:** Sino/contexto reagiram; troca de paciente remontou e limpou
seleção em B58-U02; emissão não estava ausente.

**Limitações:** Uma amostra Chrome desktop; admin não foi exercitado
dinamicamente; sem humano/device real. Não confundir22 testes controlados com
E2E.

**Relação A/B1/B2/B3/B4:** Amplia B4-012 para outro consumidor. B3-013 é falha
de emissão diferente; aqui emissão foi comprovada.

**Alternativas futuras:** Consumir revisão/invalidação nos read models com
escopo correto e preservar rascunhos de formulário.

**Risco de regressão:** Apagar edição em andamento, loop de fetch, resposta
antiga sobrescrever nova ou misturar paciente.

**Critérios de aceitação:** Nova submissão aparece sem reload após
sinal/reconexão; fila admin atualiza conforme política; troca de paciente
continua limpando seleção e dados anteriores.

**Testes futuros:** Invalidação repetida/fora de ordem, offline/reconnect, aba
oculta, erro401/403, pacienteA/B e rascunho de revisão.

**Decisão pendente:** Definir frescor/indicador de atualização e fechar
correção compartilhada com B4-012 sem trocar todo Realtime.

## B5-011 — Propósito do payload Flow

**Título:** Sessão Flow de ocorrência aceita corpo de confirmação de outro
propósito

**Prioridade:** P3

**Natureza:** Falha de contrato sem efeito físico

**Estado:** ABERTO_DIAGNOSTICO

**Confiança:** CONFIRMADO_SQL;SCHEMA_HTTP_LIDO

**Origem na B5:** NOVO_B5_DEFEITO

**Integração afetada:** Flow occurrence e union compartilhada de payload

**Processo:** Coletar sugestão revisável

**Persona:** Autor e revisor da própria sugestão

**Evento de origem:** operation confirm em sessão occurrence válida

**Contrato esperado:** Payload deve ser compatível com propósito/tela; comando
ENT não vira sugestão sem conteúdo.

**Resultado observado:** flow_exchange armazenou pending_confirmation para
objeto operation confirm, sem texto/kind; nenhum relato ou movimento foi
criado.

**Causa sustentada:** Union HTTP mistura propósitos e v3_flow_exchange valida
só objeto/tamanho para sessão occurrence.

**Caminho técnico:**
src/lib/notifications/flows.ts:flowRequest;public.flow_exchange;public.v3_flow_exchange

**Evidência:**
[evidence/b57-flow-results.json#B57-S04](evidence/b57-flow-results.json#B57-S04)

**Método de prova:** SQL vigente com sessão Auth fictícia e service context
simulado; schema de entrada revisto. Rollback.

**Estado persistido:** Submissão vazia pending em fixture rollback; nenhum
report/ledger.

**Efeito externo observado ou simulado:** Nenhum Flow real; não é prova de
comando ENT executado via occurrence.

**Consequência operacional:** Fila de revisão pode receber objeto que não
representa um relato utilizável.

**Consequência humana:** Autor precisa preencher/reconstruir contexto ou
descartar sugestão sem explicação suficiente.

**Consequência de segurança:** Não ganhou capacidade, paciente ou estoque.
Token bearer continua limitado à sessão; revisão autoral protege efeito
posterior.

**Recuperação disponível:** Autor pode editar texto/kind na revisão ou
descartar; não há execução automática do corpo estranho.

**Contraprova:** Revisão exige capacidade/autor e entrada válida; prazo e
revogação recusados; saldo não mudou.

**Limitações:** Entrada sintética válida na union, não ação disponível no JSON
normal de ocorrência; não exploração sem token válido.

**Relação A/B1/B2/B3/B4:** B3/B4 validaram revisão e limites; descompasso de
propósito desta union não estava catalogado.

**Alternativas futuras:** Validar payload pelo propósito e ação/tela, mantendo
tratamento explícito de client error e replay.

**Risco de regressão:** Recusar payload legítimo de outra família ou aceitar
comando desconhecido para corrigir lote.

**Critérios de aceitação:** Sessão occurrence recusa operation
confirm/mode/line de ENT sem consumir token nem criar submissão; payload
occurrence correto segue revisável.

**Testes futuros:** Todos os braços da union em ambas famílias, campos extras,
replay, BACK e client error.

**Decisão pendente:** Endurecer contrato por propósito quando Flow entrar no
escopo; não bloqueador isolado do app sem Flow.

## B5-012 — Recuperação do vínculo de telefone

**Título:** Confirmação Auth de telefone pode concluir sem vínculo interno
retomável por HTTP

**Prioridade:** P2

**Natureza:** Risco sustentado de recuperação entre serviços

**Estado:** ABERTO_DIAGNOSTICO

**Confiança:** CONFIRMADO_ADAPTADOR_COM_EFEITO_AUTH_SIMULADO

**Origem na B5:** NOVO_B5_RISCO

**Integração afetada:** Supabase Auth OTP e verified_phones

**Processo:** Confirmar telefone e habilitar contato WhatsApp

**Persona:** Titular da conta

**Evento de origem:** verifyOtp conclui e register_verified_phone falha

**Contrato esperado:** Resultado parcial é comunicado e registro pode ser
retomado sem reutilizar OTP já concluído.

**Resultado observado:** Handler real com Auth simulado confirmado retornou503
no registro; retry com OTP simulado usado deu400 e não repetiu registro.

**Causa sustentada:** Duas etapas confirmam fora de uma transação única; HTTP
só oferece verifyPhone completo e não distingue etapa confirmada.

**Caminho técnico:**
src/app/api/profile/route.ts:214;src/app/api/profile/route.ts:224;ContactSettings;public.register_verified_phone

**Evidência:**
[evidence/b59-phone-cases.json#B59-C01](evidence/b59-phone-cases.json#B59-C01)
;
[evidence/b59-phone-cases.json#B59-C02](evidence/b59-phone-cases.json#B59-C02)

**Método de prova:** Handler real, Auth e SQL controlados; sem OTP/SMS real ou
mutação Auth nesse teste.

**Estado persistido:** Somente estado em memória no probe; divergência
Auth/verified_phones é consequência sustentada do corte entre etapas, não
read-back real de falha OTP.

**Efeito externo observado ou simulado:** Nenhum SMS/e-mail/OAuth; consumo
único do OTP foi simulado explicitamente.

**Consequência operacional:** Pessoa pode ficar com telefone confirmado no
Auth e contato interno desatualizado, sem retomada orientada.

**Consequência humana:** Erro sugere repetir código quando a verificação pode
já ter terminado.

**Consequência de segurança:** Validação de envio compara phone Auth ao
registro, evitando envio ao número antigo divergente; não há bypass
demonstrado.

**Recuperação disponível:** RPC register_verified_phone existe com sessão
recente; app não expõe ação independente de ressincronização. Nova verificação
pode ser exigida operacionalmente hoje.

**Contraprova:** Caminho Auth+registro sem falha retornou200; comparação de
telefone continua protegendo o canal.

**Limitações:** Não afirma incidente Supabase ou OTP real consumido. Deve
receber ensaio isolado de duas etapas antes de fechar como remediado.

**Relação A/B1/B2/B3/B4:** B4-003/004 tratam resultados parciais em outros
processos; esta é fronteira Auth/contato adicional.

**Alternativas futuras:** Retomada autorizada apenas do registro e resultado
por etapa, aproveitando RPC existente.

**Risco de regressão:** Aceitar número do browser como confirmado, dispensar
sessão recente ou reativar contato antigo.

**Critérios de aceitação:** Falha após confirmação informa etapa real e retoma
vínculo pelo phone atual Auth; retry não depende de OTP já usado; número não
confirmado nunca é registrado.

**Testes futuros:** Falha antes/depois de verifyOtp, timeout do registro,
troca de número concorrente, sessão antiga, revogação e SMS real em
homologação autorizada.

**Decisão pendente:** Escolher experiência de recuperação e necessidade de SMS
no piloto; manter risco externo separado de prova controlada.

## B5-013 — Correlação entre tentativas

**Título:** Callback de tentativa antiga encerra lease nova e impede
correlação da nova mensagem

**Prioridade:** P2

**Natureza:** Falha de recuperação e correlação

**Estado:** ABERTO_DIAGNOSTICO

**Confiança:** CONFIRMADO_SQL_COM_ORDEM_EXTERNA_SIMULADA

**Origem na B5:** NOVO_B5_DEFEITO

**Integração afetada:** Retry outbox, provider_reference e callbacks

**Processo:** Reenviar falha confirmada e reconciliar resultados

**Persona:** Operador e destinatário

**Evento de origem:** Retry de failed com referência anterior; callback antigo
chega durante nova tentativa

**Contrato esperado:** Callback antigo preserva seu histórico sem concluir a
lease nem substituir resultado da tentativa corrente.

**Resultado observado:** Retry reteve referência; accepted antigo encerrou
lease nova; complete com referência nova falhou; delivered novo com opaque ID
foi ignorado.

**Causa sustentada:** Uma referência na mesma linha atravessa retries; webhook
correlaciona por referência ou ID somente quando referência é nula, sem
geração da tentativa.

**Caminho técnico:**
public.retry_notification_job;public.v3_notification_webhook;public.v4_complete_notification_job

**Evidência:**
[evidence/b510-callback-results.json#B510-S01](evidence/b510-callback-results.json#B510-S01)
;
[evidence/b510-callback-results.json#B510-S02](evidence/b510-callback-results.json#B510-S02)
;
[evidence/b510-callback-results.json#B510-S03](evidence/b510-callback-results.json#B510-S03)

**Método de prova:** Quatro checkpoints numa fixture SQL nova/rollback; retry
com claims Auth reais; lease nova montada como fixture e callbacks service
simulados.

**Estado persistido:** Na transação: accepted com referência antiga e
delivered_at nulo após callback da nova; nova conclusão recusada. Rollback
final.

**Efeito externo observado ou simulado:** Nenhum envio nem sequência real Meta
observada. O efeito externo de nova mensagem foi representado por nova
referência/callback.

**Consequência operacional:** Resultado da tentativa corrente pode ficar sem
correlação; estado aparenta aceitação referente à tentativa anterior.

**Consequência humana:** Responsável pode concluir que aviso foi aceito ou não
saber qual mensagem conciliar.

**Consequência de segurança:** Risco de reenvio incorreto e comunicação
duplicada; nenhuma operação física duplicada demonstrada.

**Recuperação disponível:** Consulta técnica ao provedor/banco; retry atual
não conserva identidade de tentativa suficiente para esse caso. Não reenviar
accepted/incerto por adivinhação.

**Contraprova:** Linha com referência nula correlacionou callback pelo opaque
ID e terminou delivered; monotonicidade dentro da referência segue útil.

**Limitações:** Não reproduziu claim global nem entrega Meta. Ordem atrasada
accepted após failed/retry é hipótese adversarial sustentada, frequência real
desconhecida.

**Relação A/B1/B2/B3/B4:** B3 B39-06 protege callback versus complete na mesma
tentativa; B4-010 resumo skipped relacionado. A correlação entre gerações é
causa nova.

**Alternativas futuras:** Identidade de tentativa e histórico mínimo;
distinguir callback antigo sem perder referência anterior. Não apagar
referência cegamente.

**Risco de regressão:** Perder callback tardio legítimo, reenviar uncertain,
romper dedup ou multiplicar exposição de dados.

**Critérios de aceitação:** Retry gera contexto de tentativa distinto;
callback antigo não encerra lease atual; novo callback/complete é
reconciliado; história de ambas permanece e nenhum reenvio cego ocorre.

**Testes futuros:** sent antigo após failed, callbacks antes/depois do
claim/complete, novo wamid, opaque ID, crash, read→delivered e revogação
simultânea.

**Decisão pendente:** Definir identidade/retenção de tentativas e procedimento
de conciliação antes de habilitar retry externo.

## B5-014 — Dados para conciliação operacional

**Título:** Percurso administrativo omite referência e tentativa necessárias à
conciliação prescrita

**Prioridade:** P2

**Natureza:** Lacuna funcional operacional

**Estado:** ABERTO_DIAGNOSTICO

**Confiança:** ALTA_FONTE_API_E_CONSUMIDOR

**Origem na B5:** NOVO_B5_LACUNA

**Integração afetada:** Admin notifications e console de recuperação

**Processo:** Conferir provedor antes de retry uncertain

**Persona:** Administrador da residência sem acesso SQL

**Evento de origem:** Fila uncertain ou investigação de falha externa

**Contrato esperado:** Responsável consegue identificar com dados mínimos a
mensagem/tentativa que deve conciliar e registrar decisão segura.

**Resultado observado:** API lista estado/pessoa/tentativas/erro/hora, mas
omite provider_reference, event_key, document_id,lease/next_at; UI pede
confirmar consulta no provedor sem apresentar referência.

**Causa sustentada:** Read model e apresentação não atendem ao procedimento de
conciliação exigido pela ação de retry.

**Caminho técnico:**
src/app/api/admin/notifications/route.ts:58;src/components/admin/notification-settings.tsx:NotificationQueue

**Evidência:**
[11_PRIVACY_OBSERVABILITY_AND_CAPACITY.md](11_PRIVACY_OBSERVABILITY_AND_CAPACITY.md)
; `src/app/api/admin/notifications/route.ts` ;
`src/components/admin/notification-settings.tsx`

**Método de prova:** Leitura estática da projeção API, tipos e consumidor
ativo; sem consulta ou tentativa de conciliação Meta.

**Estado persistido:** Nenhuma alteração; referência pode existir no banco,
mas não atravessa esse percurso UI.

**Efeito externo observado ou simulado:** Nenhum. Não se afirma que toda
consulta manual ao provedor seja impossível.

**Consequência operacional:** Recuperação depende de operador técnico ou
pistas externas incompletas, sobretudo com várias tentativas.

**Consequência humana:** Administrador pode confirmar reenvio sem saber
exatamente qual resultado foi conferido.

**Consequência de segurança:** Risco de duplicar comunicação; expor dado de
outro paciente ou telefone completo não é solução aceitável.

**Recuperação disponível:** Painel e paginação já existem; administrador
técnico pode consultar referência autorizada no banco ou buscar por
horário/contato como contingência.

**Contraprova:** UI tem estados, erros seguros, última tentativa, botão de
retry e confirmação explícita/audit para uncertain; não é ausência total de
ferramentas.

**Limitações:** Sem volume real, medição de tempo ou avaliação humana de
conciliação. Referência ausente também pode refletir resultado externo
realmente desconhecido.

**Relação A/B1/B2/B3/B4:** A apontou sinais operacionais faltantes; B5
identifica lacuna concreta entre o procedimento prescrito e os campos do
percurso atual.

**Alternativas futuras:** Exibir identificação mínima e histórico de tentativa
por paciente, com consulta/audit e tratamento de referência ausente;
aproveitar painel existente.

**Risco de regressão:** Vazar destinos/conteúdo, tratar ausência de referência
como prova de não envio ou simplificar confirmação para um clique sem
consulta.

**Critérios de aceitação:** Operador autorizado distingue evento/job/tentativa
e referência quando existente; ausência não significa não aceito; decisão de
conciliação fica auditável e scoped ao paciente.

**Testes futuros:** Várias mensagens mesmo destinatário, referência ausente,
tentativa antiga/nova, perfil sem manage, dois pacientes,
failed/uncertain/accepted e paginação.

**Decisão pendente:** Definir responsável, dados mínimos, evidência exigida
para retry e contingência técnica no escopo inicial.
