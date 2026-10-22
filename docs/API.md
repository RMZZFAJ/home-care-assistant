# Contratos de API

## Regras comuns

Rotas operacionais usam sessão Supabase em cookie, perfil ativo e autorização
por paciente. Mutações exigem application/json e rejeitam origem externa.
Respostas sensíveis têm no-store e x-correlation-id. Erros usam error, code,
category, recommendedAction, retryable e correlationId; não contêm detalhes
de SQL ou stack. O catálogo central em src/lib/server/error-catalog.ts
define categoria, status, possibilidade de repetição e ação recomendada.

careRecipientId é obrigatório nos contratos de contexto operacional. Rotas
por ID existente resolvem o paciente a partir do banco. Idempotência exige
UUID estável para a mesma intenção; repetir conteúdo diferente gera conflito.

## Rotas

| Rota | Operações |
| --- | --- |
| /api/context | Sessão, pacientes autorizados e capacidades efetivas |
| /api/catalog | Consulta e administração do catálogo do paciente |
| /api/requisitions | Histórico paginado e submissão idempotente |
| /api/requisitions/:id | Detalhe persistido e comprovante por snapshots |
| /api/requisitions/:id/status | Transição justificada por PATCH |
| /api/stock/balances | Saldos por custódia e atualização |
| /api/stock/movements | Consulta e movimento normal/extraordinário |
| /api/stock/inventory | Consulta, contagem, revisão, aprovação e recontagem |
| /api/admin | Recursos administrativos por paciente e contas globais |
| /api/admin/notifications | Consulta, reprocessamento e processamento global |
| /api/invitations/register | Cadastro pessoal validado por convite |
| /api/invitations/accept | Aceite por identidade com e-mail verificado |
| /api/notifications/worker | Worker sob segredo de servidor |
| /api/notifications/webhook | Verificação e eventos assinados do provedor |

## Formatos relevantes

Submissão possui careRecipientId, idempotencyKey, lines, extraItems e
observations. Cada linha tem productId, currentStock e urgent. Metadados
visuais legados aceitos não substituem atributos canônicos. Campos adicionais
do contrato removido são rejeitados. A resposta confirma persistence e receipt.
Se o comprovante não puder ser lido após salvar, retorna RECEIPT_PENDING com
ID/protocolo confirmados, preservando a chave para recuperação.

Movimento informa paciente, produto, quantidade positiva, tipo, origem,
destino, justificativa e chave. A transferência é representada no ledger
legado como outbound com origem e destino; não é uma saída parcial.
exceptionalAdjustment exige administrador global, quantidade assinada,
justificativa e confirmation true, com RPC própria.

Importação histórica tem preview explícito e lote revisado. O formato aceita
protocolos físicos 1–11, paciente, produtos associados, contagens e informações
originais conhecidas. Data, solicitante, status e estoque desconhecidos são
nulos/ausentes; extraItems aceita customName sem associação automática.
Registros inválidos recebem relatório; não geram notificações retroativas.

A consulta de histórico e detalhe usa um modelo seguro de notificações por
requisição: grupo, canal, estado, tentativas, horários e código de erro seguro.
Destinos privados e referências do provedor continuam protegidos. Reenvio de
resultado incerto exige confirmação também na RPC, com registro em auditoria.

Convites retornam link uma única vez, para compartilhamento manual. O token
fica no fragmento, é removido da URL pela interface e persistido apenas como
hash no banco. Não retornar credencial de login para o administrador.

## Códigos estáveis

SESSION_EXPIRED, FORBIDDEN, PATIENT_REQUIRED, PATIENT_INACTIVE, NOT_FOUND,
VALIDATION_ERROR, INVALID_JSON, INVALID_ORIGIN, PAYLOAD_TOO_LARGE,
IDEMPOTENCY_CONFLICT, LAST_GLOBAL_ADMIN, INSUFFICIENT_STOCK,
INVENTORY_CONFLICT, INVITATION_INVALID, RECONCILIATION_REQUIRED,
RECEIPT_PENDING, DATABASE_UNAVAILABLE e INTERNAL_ERROR representam os
caminhos tratados. Consulte os schemas e testes para detalhes por operação.
