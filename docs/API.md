# Contratos de API

## Regras comuns

As rotas usam sessão Supabase, perfil ativo e capacidades efetivas no paciente.
IDs, nomes e flags do navegador não autorizam operações. Mutações JSON exigem
application/json; upload usa multipart validado. Origens externas são recusadas.
Respostas sensíveis usam no-store e correlação; erros omitem SQL e payloads.

careRecipientId identifica o contexto, validado no banco. Rotas por UUID
resolvem a associação documental no servidor. A mesma intenção reutiliza
idempotencyKey; conteúdo diferente com a mesma chave gera conflito. Comandos
documentais também exigem expectedVersion para detectar concorrência.

## Rotas operacionais

| Rota | Contrato |
| --- | --- |
| /api/context | Contexto autorizado por my_workspace |
| /api/context (POST) | Seleciona modo global ou vínculo local real da sessão |
| /api/sync | Revisão privada e contexto vigente, sem payload documental |
| /api/catalog | Catálogo do paciente |
| /api/catalog/presentations | Unidades, apresentações e código de barras |
| /api/units | Unidades de medida globais ou locais |
| /api/requisitions | Submissão e consulta REQ |
| /api/requisitions/:id | Snapshot, atendimento e vínculos |
| /api/requisitions/:id/status | Etapa administrativa por PATCH |
| /api/requisitions/:id/science | Ciência com modalidade e versão esperada |
| /api/requisitions/:id/archive | Arquivamento local justificado e auditado |
| /api/requisitions/:id/resolve | Identificação auditável de item extra |
| /api/requisitions/item-context | Pendências e consulta mínima por produto |
| /api/documents | Lista unificada e criação COM, ENT ou BAL |
| /api/documents/:id | Documento e comando transacional |
| /api/documents/:id/revise | Edição de rascunho ou reconto BAL |
| /api/documents/:id/pdf | PDF privado da versão autorizada |
| /api/documents/:id/notifications | Estados seguros dos envios |
| /api/stock/balances | Confirmados, previsões, trânsito e métricas |
| /api/stock/movements | Ledger e operações administrativas familiares |
| /api/stock/inventory | Consulta legada; escrita aposentada com HTTP 410 |
| /api/attachments | Reserva, upload validado, vínculo e links privados |
| /api/consumption | Relatos e confirmação autorizada |
| /api/dashboard | Tarefas pendentes e ações pertinentes |
| /api/profile | Perfil, foto, contatos, preferências e sessões |
| /api/patient-settings | Regras e alterações de acesso com aprovação |
| /api/notifications | Caixa pessoal paginada e ciência independente |

## Documentos e quantidades

REQ contém lines com productId, currentStock, urgent e repeatReason opcional,
extraItems e observations. Não aceita quantidade solicitada. Catálogo e
snapshots são resolvidos no banco. A resposta confirma persistence e receipt;
RECEIPT_PENDING preserva o ID e a chave se a leitura posterior falhar.

COM, ENT e BAL usam type, payload.lines, idempotencyKey e draft.
As quantidades são strings decimais normalizadas, limitadas à precisão da
unidade, com teto e validação também na RPC. Linhas podem conter
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
paciente usa initialAdministratorEmail confirmado e atribuição inicial explícita.
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

## História e erros

Importação preserva fatos conhecidos, identifica campos desconhecidos e
exige revisão explícita. Protocolos físicos não geram fatos nem notificações
retroativas. Histórico permanece acessível a vínculos autorizados após a
inativação do paciente.

O catálogo em src/lib/server/error-catalog.ts define code, categoria,
retryable, recommendedAction e HTTP. Validação, sessão expirada, capacidade
negada, paciente inativo, saldo insuficiente, versão antiga, idempotência
conflitante e dependência externa indisponível têm respostas próprias.
