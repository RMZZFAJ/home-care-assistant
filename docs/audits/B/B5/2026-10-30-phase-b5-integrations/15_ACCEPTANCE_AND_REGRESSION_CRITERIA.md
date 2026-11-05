# Critérios futuros de aceitação e regressão

Propostas para C/D, sem testes permanentes ou correções nesta auditoria. Em
cada caso: ambiente local/isolado autorizado, identidade e paciente
explícitos, resultado HTTP e leitura independente do estado; sem mensagens
reais fora de homologação autorizada. Preservar dados/história, RLS,
modalidade de ciência, custódia e idempotência.

## B5-001 — Continuidade de lembretes legados

**Entrada/identidade/paciente:** Interrupção que atravesse o dia agendado.
Persona: Profissional e responsável pela automação. Revalidar autoridade atual
e o contexto antes do efeito.

**Estado e efeito esperado:** Com serviço ausente no dia D e retorno D+1,
política escolhida identifica o período perdido ou o recupera uma vez; nenhuma
contagem/ciência é fabricada.

**Repetição, falha e recuperação:** Antes/depois da hora, mesmo dia, dia
seguinte, fuso, mudança de configuração, cron repetido e regime BAL ativo.

**Proibido regredir:** Gerar lembrete retroativo enganoso, duplicar janelas ou
imputar falta de presença.

**Decisão prévia e limite de validação:** Decisão operacional/produto:
catch-up e responsável ou legado desabilitado no piloto. Não foi simulada
indisponibilidade real; política de catch-up do legado ainda precisa decisão.
Não generalizar ao BAL por plantão.

## B5-002 — Retomada de hold sem template

**Entrada/identidade/paciente:** complete recebe
EVENT_TEMPLATE_NOT_CONFIGURED. Persona: Administrador local/operador do canal.
Revalidar autoridade atual e o contexto antes do efeito.

**Estado e efeito esperado:** Hold por contrato ausente, depois de
regularizado, tem ação suportada e auditada que torna elegível apenas o
trabalho autorizado; template conhecido e PDF continuam liberando
corretamente.

**Repetição, falha e recuperação:** Registro ausente, aprovação tardia,
versão/idioma distintos, disabled, telefone trocado, quinto attempt e retry
incerto proibido.

**Proibido regredir:** Despausar em massa sem correção, enviar para revogado
ou perder prioridade/quiet hours.

**Decisão prévia e limite de validação:** Definir quais holds podem ser
reavaliados e quem confirma configuração; condicionado ao uso do canal.
Resultado missing-template foi injetado em linha nova; registro normal contém
os contratos preparados. Não foi demonstrado incidente no registro completo
normal nem remoção via API.

## B5-003 — Incerteza anterior ao envio

**Entrada/identidade/paciente:** Exceção/timeout em media upload. Persona:
Destinatário e operador de notificações. Revalidar autoridade atual e o
contexto antes do efeito.

**Estado e efeito esperado:** Exceção anterior a messages não afirma mensagem
aceita/entregue nem exige conciliação de entrega; exceção durante/depois de
messages mantém uncertain e não reenvia automaticamente.

**Repetição, falha e recuperação:** Timeout e JSON inválido em upload, upload
aceito/resposta perdida, falha de messages,5xx,429 e crash após resposta.

**Proibido regredir:** Transformar resultado messages desconhecido em retry
seguro e causar duplicação externa.

**Decisão prévia e limite de validação:** Definir recuperação de upload e
eventual reutilização/retencão de mediaId, sem serviço novo obrigatório. Não
mede latência real nem prova upload órfão ou comportamento Meta. O exemplo usa
PDF sintético.

## B5-004 — Fidelidade das mensagens por evento

**Entrada/identidade/paciente:** req.completed;com.receive parcial
administrativo;ent.cancel final. Persona: Família, profissional e
administrador. Revalidar autoridade atual e o contexto antes do efeito.

**Estado e efeito esperado:** REQ usa data do atendimento concluído; COM já
validada não pede validação; ENT final se distingue de consentimento pendente;
contadores/atores corretos por evento. Lembrete distingue ciência de materiais;
aviso ao confirmador não atribui autoria de relato alheio.

**Repetição, falha e recuperação:** Emissão/revisão, doação, COM parcial/total
por admin/outro, ciência antes/depois da entrega, ENT
cancellation_pending/cancelled, BAL/reconto.
Incluir atendimento concluído com ciência pendente e relato destinado a
confirmador diferente do autor; as duas manifestações B5 são estáticas.

**Proibido regredir:** Trocar ciência por atendimento, perder parcialidade,
atribuir ator errado ou reescrever templates/PDFs históricos.

**Decisão prévia e limite de validação:** Aprovar linguagem e fatos por evento
antes de homologar templates; preservar versões antigas e fronteira B6. BE-002
BAL/data A não foi reexecutado; novos payloads são controlados. Outros
atores/contadores revistos estaticamente não foram todos persistidos.

## B5-005 — Minimização e governança

**Entrada/identidade/paciente:** Preparar nome_paciente, alerta de produto e
PDF. Persona: Paciente, família e controlador da operação. Revalidar
autoridade atual e o contexto antes do efeito.

**Estado e efeito esperado:** Responsável aprova matriz de campos/destinos;
mensagem real sintética contém só o conjunto aprovado e explica limites de
cópia/retencão; documentação corresponde ao contrato.

**Repetição, falha e recuperação:** Short name ausente/presente, nomes longos,
alertas sensíveis, PDF, tela bloqueada, contato trocado e acesso revogado.

**Proibido regredir:** Remover informação indispensável para tarefa ou criar
ambiguidade entre pacientes; copiar dados em nova telemetria.

**Decisão prévia e limite de validação:** Decisão de governança/produto sobre
conteúdo, retenção, operadores e canais iniciais; não conclusão jurídica. Sem
parecer jurídico, inspeção de aparelho real, base legal definida ou prova de
envio. Medicamento em alerta depende do catálogo usado.

## B5-006 — Continuação de entrada não processada

**Entrada/identidade/paciente:** Texto com contexto ambíguo;RPC de desafio
retorna false;tipo sem processador. Persona: Profissional vinculado a dois
pacientes e destinatário de desafio. Revalidar autoridade atual e o contexto
antes do efeito.

**Estado e efeito esperado:** Texto ambíguo e comando recusado ficam
explicitamente ignorados/pendentes com recuperação aprovada; processed não
afirma efeito inexistente; contexto único continua deduplicado.

**Repetição, falha e recuperação:** Dois pacientes, nenhum vínculo, revogação
entre contexto/ingestão, telefone trocado, item desconhecido, lote parcial,
replay e retomada autenticada.

**Proibido regredir:** Atribuir ao paciente errado, processar áudio/comando
desconhecido ou duplicar relato em reentrega.

**Decisão prévia e limite de validação:** Escolher handoff e retenção mínimos;
áudio pode continuar fora da promessa. Não houve lote ou perda Meta real. Nem
toda recusa é sem registro: ENT registra rejected em certos ramos. Retenção de
texto precisa governança.

## B5-007 — Origem do estado visto

**Entrada/identidade/paciente:** HCA_NO_ISSUES válido. Persona: Profissional e
familiar que acompanha avisos. Revalidar autoridade atual e o contexto antes
do efeito.

**Estado e efeito esperado:** Resposta externa resolve uma vez e exibe origem
verdadeira; visto interno continua independente de delivered/read e ciência.

**Repetição, falha e recuperação:** Resposta rápida, app mark seen, no_issues
Flow, replay, vários canais e contador.

**Proibido regredir:** Voltar a contar lembrete respondido ou transformar
resposta sem ocorrências em contagem/consumo.

**Decisão prévia e limite de validação:** Escolher rótulo/modelo mínimo de
origem; melhoria pode acompanhar correções de notificação. Não houve render
específico desse rótulo nem aparelho físico; ligação campo→label é estática.

## B5-008 — Replay de Flow sem ocorrências

**Entrada/identidade/paciente:** Repetir token/payload no_issues dentro do
prazo após primeiro sucesso. Persona: Profissional preenchendo Flow. Revalidar
autoridade atual e o contexto antes do efeito.

**Estado e efeito esperado:** Replay idêntico dentro da política recupera o
mesmo resultado e uma submissão; conteúdo divergente recusa; prazo/revogação
seguem política explícita.

**Repetição, falha e recuperação:** Resposta perdida, duplo clique
concorrente, retry após expiração, payload diferente e no_issues versus texto.

**Proibido regredir:** Aceitar conteúdo divergente no mesmo token ou registrar
ausência de ocorrências para período errado.

**Decisão prévia e limite de validação:** Definir prazo e autoridade da
consulta de resultado terminal sem reativar sessão usada. No_issues não
comprova presença ou vínculo a um plantão específico; não houve perda de rede
real nem Meta.

## B5-009 — Erros do protocolo Flow

**Entrada/identidade/paciente:** Token inválido/expirado ou data.error do
cliente. Persona: Usuário de Flow e operador da integração. Revalidar
autoridade atual e o contexto antes do efeito.

**Estado e efeito esperado:** Token inválido e client error seguem contrato
oficial escolhido e são verificáveis no cliente Meta; nenhuma operação é
aplicada em recusa; código/erro não expõem dados.

**Repetição, falha e recuperação:** Token vencido/revogado, chave rotacionada,
HMAC errado, erro cliente, INIT/BACK/data_exchange e indisponibilidade SQL.

**Proibido regredir:** Responder sucesso para operação recusada, plaintext
privado ou enfraquecer assinatura/cifra.

**Decisão prévia e limite de validação:** Corrigir fronteira e homologar
códigos/formatos na versão Meta antes de habilitar Flow. Referência oficial
exemplifica427 cifrado e432; ausência de homologação não prova que todo Flow
falha. A cifra local correta não certifica publicação.

## B5-010 — Frescor dos consumidores

**Entrada/identidade/paciente:** Submissão nova com tela já aberta e revisão
de workspace alterada. Persona: Autor de Flow e administrador. Revalidar
autoridade atual e o contexto antes do efeito.

**Estado e efeito esperado:** Nova submissão aparece sem reload após
sinal/reconexão; fila admin atualiza conforme política; troca de paciente
continua limpando seleção e dados anteriores.

**Repetição, falha e recuperação:** Invalidação repetida/fora de ordem,
offline/reconnect, aba oculta, erro401/403, pacienteA/B e rascunho de revisão.

**Proibido regredir:** Apagar edição em andamento, loop de fetch, resposta
antiga sobrescrever nova ou misturar paciente.

**Decisão prévia e limite de validação:** Definir frescor/indicador de
atualização e fechar correção compartilhada com B4-012 sem trocar todo
Realtime. Uma amostra Chrome desktop; admin não foi exercitado dinamicamente;
sem humano/device real. Não confundir22 testes controlados com E2E.

## B5-011 — Propósito do payload Flow

**Entrada/identidade/paciente:** operation confirm em sessão occurrence
válida. Persona: Autor e revisor da própria sugestão. Revalidar autoridade
atual e o contexto antes do efeito.

**Estado e efeito esperado:** Sessão occurrence recusa operation
confirm/mode/line de ENT sem consumir token nem criar submissão; payload
occurrence correto segue revisável.

**Repetição, falha e recuperação:** Todos os braços da union em ambas
famílias, campos extras, replay, BACK e client error.

**Proibido regredir:** Recusar payload legítimo de outra família ou aceitar
comando desconhecido para corrigir lote.

**Decisão prévia e limite de validação:** Endurecer contrato por propósito
quando Flow entrar no escopo; não bloqueador isolado do app sem Flow. Entrada
sintética válida na union, não ação disponível no JSON normal de ocorrência;
não exploração sem token válido.

## B5-012 — Recuperação do vínculo de telefone

**Entrada/identidade/paciente:** verifyOtp conclui e register_verified_phone
falha. Persona: Titular da conta. Revalidar autoridade atual e o contexto
antes do efeito.

**Estado e efeito esperado:** Falha após confirmação informa etapa real e
retoma vínculo pelo phone atual Auth; retry não depende de OTP já usado;
número não confirmado nunca é registrado.

**Repetição, falha e recuperação:** Falha antes/depois de verifyOtp, timeout
do registro, troca de número concorrente, sessão antiga, revogação e SMS real
em homologação autorizada.

**Proibido regredir:** Aceitar número do browser como confirmado, dispensar
sessão recente ou reativar contato antigo.

**Decisão prévia e limite de validação:** Escolher experiência de recuperação
e necessidade de SMS no piloto; manter risco externo separado de prova
controlada. Não afirma incidente Supabase ou OTP real consumido. Deve receber
ensaio isolado de duas etapas antes de fechar como remediado.

## B5-013 — Correlação entre tentativas

**Entrada/identidade/paciente:** Retry de failed com referência anterior;
callback antigo chega durante nova tentativa. Persona: Operador e
destinatário. Revalidar autoridade atual e o contexto antes do efeito.

**Estado e efeito esperado:** Retry gera contexto de tentativa distinto;
callback antigo não encerra lease atual; novo callback/complete é
reconciliado; história de ambas permanece e nenhum reenvio cego ocorre.

**Repetição, falha e recuperação:** sent antigo após failed, callbacks
antes/depois do claim/complete, novo wamid, opaque ID, crash, read→delivered e
revogação simultânea.

**Proibido regredir:** Perder callback tardio legítimo, reenviar uncertain,
romper dedup ou multiplicar exposição de dados.

**Decisão prévia e limite de validação:** Definir identidade/retenção de
tentativas e procedimento de conciliação antes de habilitar retry externo. Não
reproduziu claim global nem entrega Meta. Ordem atrasada accepted após
failed/retry é hipótese adversarial sustentada, frequência real desconhecida.

## B5-014 — Dados para conciliação operacional

**Entrada/identidade/paciente:** Fila uncertain ou investigação de falha
externa. Persona: Administrador da residência sem acesso SQL. Revalidar
autoridade atual e o contexto antes do efeito.

**Estado e efeito esperado:** Operador autorizado distingue
evento/job/tentativa e referência quando existente; ausência não significa não
aceito; decisão de conciliação fica auditável e scoped ao paciente.

**Repetição, falha e recuperação:** Várias mensagens mesmo destinatário,
referência ausente, tentativa antiga/nova, perfil sem manage, dois pacientes,
failed/uncertain/accepted e paginação.

**Proibido regredir:** Vazar destinos/conteúdo, tratar ausência de referência
como prova de não envio ou simplificar confirmação para um clique sem
consulta.

**Decisão prévia e limite de validação:** Definir responsável, dados mínimos,
evidência exigida para retry e contingência técnica no escopo inicial. Sem
volume real, medição de tempo ou avaliação humana de conciliação. Referência
ausente também pode refletir resultado externo realmente desconhecido.
