# Contratos de API

Contrato AS_IS da base funcional `37cb7f85e96e551d6419871f94dd950712e2565b`.
Precisão number/string, etapa parcialmente confirmada, paginação e
classificação de erro têm desvios B4. Correção de estoque sem referência ainda
é aceita por caminhos diretos B3-005, apesar do contrato exigido abaixo.
Estado e limites: [PROJECT_STATUS](PROJECT_STATUS.md). Planejamento futuro
em [C](../audits/C/README.md); decisões aprovadas não equivalem a
implementação.

## Regras comuns

As rotas usam sessão Supabase, perfil ativo e capacidades efetivas no
paciente.
IDs, nomes e flags do navegador não autorizam operações. Mutações JSON exigem
application/json; upload usa multipart validado. Origens externas são
recusadas.
Respostas sensíveis usam no-store e correlação; erros omitem SQL e payloads.

careRecipientId identifica o contexto, validado no banco. Rotas por UUID
resolvem a associação documental no servidor. A mesma intenção reutiliza
idempotencyKey; conteúdo diferente com a mesma chave gera conflito. Comandos
documentais também exigem expectedVersion para detectar concorrência.

## Rotas operacionais

<!-- c-table:start -->

- **Rota:** /api/context

  **Contrato:** Contexto autorizado por my_workspace

- **Rota:** /api/context (POST)

  **Contrato:** Seleciona modo global ou vínculo local real da sessão

- **Rota:** /api/sync

  **Contrato:** Revisão privada e contexto vigente, sem payload documental

- **Rota:** /api/catalog

  **Contrato:** Catálogo do paciente

- **Rota:** /api/catalog/presentations

  **Contrato:** Unidades, apresentações e código de barras

- **Rota:** /api/units

  **Contrato:** Unidades de medida globais ou locais

- **Rota:** /api/requisitions

  **Contrato:** Submissão e consulta REQ

- **Rota:** /api/requisitions/:id

  **Contrato:** Snapshot, atendimento e vínculos

- **Rota:** /api/requisitions/:id/status

  **Contrato:** Etapa administrativa por PATCH

- **Rota:** /api/requisitions/:id/science

  **Contrato:** Ciência com modalidade e versão esperada

- **Rota:** /api/requisitions/:id/archive

  **Contrato:** Arquivamento local justificado e auditado

- **Rota:** /api/requisitions/:id/resolve

  **Contrato:** Identificação auditável de item extra

- **Rota:** /api/requisitions/item-context

  **Contrato:** Pendências e consulta mínima por produto

- **Rota:** /api/documents

  **Contrato:** Lista unificada e criação COM, ENT ou BAL

- **Rota:** /api/documents/:id

  **Contrato:** Documento e comando transacional

- **Rota:** /api/documents/:id/revise

  **Contrato:** Edição de rascunho ou reconto BAL

- **Rota:** /api/documents/:id/pdf

  **Contrato:** PDF privado da versão autorizada

- **Rota:** /api/documents/:id/notifications

  **Contrato:** Estados seguros dos envios

- **Rota:** /api/stock/balances

  **Contrato:** Confirmados, previsões, trânsito e métricas

- **Rota:** /api/stock/movements

  **Contrato:** Ledger e operações administrativas familiares

- **Rota:** /api/stock/inventory

  **Contrato:** Consulta legada; escrita aposentada com HTTP 410

- **Rota:** /api/attachments

  **Contrato:** Reserva, upload validado, vínculo e links privados

- **Rota:** /api/consumption

  **Contrato:** Relatos e confirmação autorizada

- **Rota:** /api/dashboard

  **Contrato:** Tarefas pendentes e ações pertinentes

- **Rota:** /api/profile

  **Contrato:** Perfil, foto, contatos, preferências e sessões

- **Rota:** /api/patient-settings

  **Contrato:** Regras e alterações de acesso com aprovação

- **Rota:** /api/notifications

  **Contrato:** Caixa pessoal paginada e ciência independente

<!-- c-table:end -->

## Documentos e quantidades

REQ recebe currentStock como valor exato ou NULL e stockObservation como
observed, unknown ou unfilled. Observed inclui zero explicitamente informado;
os outros modos exigem NULL. Sem modo, um valor de cliente antigo permanece
legacy_unclassified, sem afirmar que foi observado. Não há quantidade solicitada.
stockObservationAt opcional é ISO 8601 com fuso e até seis casas de segundo:
horário declarado pelo dispositivo, sem valor de autorização ou prova física.
O servidor conserva esse instante e sua origem client_draft; na ausência,
registra server_submission na emissão. Registros anteriores mantêm instante
desconhecido. Retry da mesma chave conserva intenção/hash antigos, inclusive
antes dos novos campos; reinterpretar modo ou instante recebe conflito.

REQ contém lines com productId, currentStock, urgent e repeatReason opcional,
extraItems e observations. Não aceita quantidade solicitada. Catálogo e
snapshots são resolvidos no banco. A resposta confirma persistence e receipt;
RECEIPT_PENDING preserva o ID e a chave se a leitura posterior falhar.

COM, ENT e BAL usam type, payload.lines, idempotencyKey e draft.
O contrato requer quantidades exatas e limitadas à precisão da unidade; a
validação atual aceita string ou number e B4-001 prova arredondamento indevido
no braço number. Não apresentar o requisito de exatidão como garantia integral
já corrigida. Linhas podem conter
requisitionItemIds explícitos do mesmo produto e paciente.

COM aceita origin purchase ou donation. ENT exige source e destination
FAMILY/CARE_TEAM distintos e recipientId autorizado. BAL registra todos os
produtos ativos da equipe e sua referência. Campos financeiros não são
obrigatórios e não existe ficha de abastecimento externo.

Comandos incluem approve, purchase, receive, validate_receipt, reject_receipt,
reassign, resolve, cancel e consent_cancel, conforme tipo e estado.
ENT receive exige divergences, mesmo vazio. Linhas não selecionadas são
integralmente aceitas; acceptedQuantity positiva parcial credita o destino.
Resolução registra received, returned ou missing com quantidade e motivo.

Atendimento da REQ deriva exclusivamente de aceite positivo de ENT vinculada.
Não é um estado administrativo nem a soma de quantidades requisitadas.
fullyCheckedLines da ENT não inclui linhas parcialmente aceitas, mesmo
quando sua diferença já foi conciliada.

Movimento familiar recebe productId, quantity positiva, action inbound,
outbound, correction_in ou correction_out, reason e idempotencyKey.
Correções exigem referenceId. Não há escrita direta de saldo nem exceção
pública para saldo negativo. Transferência entre custódias usa ENT.

## Administração, identidade e canais

/api/admin administra recursos locais e contas globais conforme autorização.
Convites são criados, reemitidos e revogados por administração local;
registro e aceite usam /api/invitations/register e /api/invitations/accept.
O administrador nunca recebe a senha de outra identidade.

Administração local aplica alterações do próprio paciente imediatamente.
Administração global propõe mudanças no paciente; a aprovação exige outra
identidade com administração local. Trocar o perfil ativo não permite aprovar
a própria proposta. A proposta conserva a versão da política. Cadastro de
paciente usa initialAdministratorEmail confirmado e atribuição inicial
explícita.
Administração de acesso de um administrador ativo não é removida por override.

Worker e webhook ficam em /api/notifications/worker e
/api/notifications/webhook. O primeiro exige segredo de servidor; o segundo
verifica assinatura Meta antes de processar estado ou mensagem.
Também confere WABA e Phone Number ID configurados; assinatura válida de outro
ativo não autoriza eventos neste ambiente.
O serviço usa apenas RPCs explicitamente concedidas, sem DML público livre.

Flows usa /api/whatsapp/flows para envelope cifrado e webhook autenticado,
/api/whatsapp/flows/session para sessão curta e
/api/whatsapp/flows/submissions para revisão autenticada. O aceite do Flow
cria relato pendente, não uma movimentação. Ausência de configuração responde
de forma controlada e não simula entrega externa.

## Escalas e BAL por plantão

`/api/schedules` consulta intervalos de até 42 dias e recebe comandos de tipo,
série, proposta, decisão, exceção, substituição, cancelamento e encerramento.
Toda escrita usa careRecipientId, idempotencyKey e expectedVersion quando o
registro já existe. Sobreposição retorna SCHEDULE_OVERLAP sem revelar o outro
paciente. Não há escrita direta em agenda ou operação de check-in.

Proposta de alteração tem versão própria e snapshots antes/depois. Decisão
envia expectedVersion da proposta exibida; motivo do decisor não substitui
motivo/notas do proponente. close_obsolete encerra uma proposta desatualizada
com motivo e preserva a agenda atual. Se uma aprovação encontrar o alvo
obsoleto, o banco registra o encerramento e a API retorna conflito seguro.
Série encerrada ou profissional desligado não podem ganhar novas ocorrências
por aprovação. Administração autorizada pode cancelar tarefas futuras do
desligado, com sua própria autoria. O readmodel apresenta efeito BAL e todas
as ocorrências da série para revisão, sem dispensar a decisão familiar que
altera sua janela.

`/api/balances` consulta a atribuição, elegibilidade, obrigações, destinos e
eventos. Comandos configuram o regime por paciente, solicitam/decidem
adiamento,
resolvem cobertura ambígua e designam reconto. A aprovação familiar é distinta
da gestão de escala. Não se pode deslocar ou cancelar uma janela de BAL
vigente
por uma simples alteração de agenda.

No regime ativado, payload BAL inclui balanceAssignment com id, version e
referenceRevision capturados na leitura. O servidor revalida identidade,
janela, vínculo e versão do ledger em criação, edição e submissão. Contexto
documental é produzido pelo banco; não é aceito como autoridade do cliente.
Recuperar uma tentativa confirmada reutiliza a chave e não duplica documento
ou ajustes. [Regras e experiência](../ui-ux/BALANCES.md).

## História e erros

`POST /api/invitations/preview` recebe o token fora da URL de consulta.
Token inválido, expirado ou revogado não revela dados do paciente. Paciente,
função, emissor, destinatário e validade aparecem somente para a conta
convidada, confirmada e com sessão Auth vigente; a prévia não cria vínculo.
Aceitar/recusar revalida os fatos e não recebe paciente ou papel editáveis.
Retry de aprovação já confirmada retorna recuperação explícita por reemissão;
o administrador local pode rotacionar o link existente, sem novo convite.

Nova senha usa mínimo de 12 caracteres e máximo de 72 bytes UTF-8 em cadastro,
recuperação e perfil. Perfil/avatar e policies do bucket privado verificam
sessão ainda existente. URLs/bytes anteriormente entregues conservam seus
limites próprios de transporte, tratados separadamente em D4.

Movimentação familiar valida precisão antes de gravar numeric(18,6).
Correção exige referência a movimento do mesmo paciente/produto/custódia,
em direção oposta. Entrada/retirada avulsa não recebe essa referência.
Números e texto usam o mesmo limite de seis casas decimais, sem arredondamento.

Importação preserva fatos conhecidos, identifica campos desconhecidos e
exige revisão explícita. Protocolos físicos não geram fatos nem notificações
retroativas. Histórico permanece acessível a vínculos autorizados após a
inativação do paciente.

O catálogo em src/lib/server/error-catalog.ts define code, categoria,
retryable, recommendedAction e HTTP. Validação, sessão expirada, capacidade
negada, paciente inativo, saldo insuficiente, versão antiga, idempotência
conflitante e dependência externa indisponível têm respostas próprias.
