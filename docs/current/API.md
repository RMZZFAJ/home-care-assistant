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

  **Contrato:** Ciência expressa ou dialogada com versão e identidade material

- **Rota:** /api/requisitions/:id/opening

  **Contrato:** Prévia mínima autorizada, preferência pessoal e necessidade de
  diálogo; sem linhas ou ciência por consulta

- **Rota:** /api/requisitions/:id/openings

  **Contrato:** POST de exibição informada pelo aplicativo, independente de
  ciência; GET autorizado com paginação por instante e ID, sem mutação

- **Rota:** /api/profile/science

  **Contrato:** GET da preferência própria; POST versionado e idempotente,
  com consentimento expresso para diálogo/tácita

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

  **Contrato:** Relatos, complementos e decisões versionados; páginas e filtros

- **Rota:** /api/consumption/[id]

  **Contrato:** Original, complementos, decisão e movimentos no escopo autorizado

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
Quantidades são exatas e limitadas à precisão da unidade. O parser compara o
token numérico JSON com o valor decodificado antes da validação: arredondamento,
underflow e valores não finitos são recusados. Strings decimais seguem a mesma
validação exata no servidor e no banco. O campo de observação conserva texto
e vírgula decimal durante edição/retomada. B4-001 permanece evidência histórica;
a regressão atual reproduz o token 1.0000000000000001 que antes virava 1.
Linhas podem conter
requisitionItemIds explícitos do mesmo produto e paciente.

REQ histórica é somente consulta: novos vínculos COM/ENT, inclusive rascunhos,
são recusados. Vínculos/fatos anteriores permanecem preservados. Falha ao
carregar dados da ficha bloqueia edição e autosave até recarregar com sucesso.

COM aceita origin purchase ou donation. ENT exige source e destination
FAMILY/CARE_TEAM distintos e recipientId autorizado. BAL registra todos os
produtos ativos da equipe e sua referência. Campos financeiros não são
obrigatórios e não existe ficha de abastecimento externo.

Comandos incluem approve, purchase, receive, validate_receipt, reject_receipt,
close_expectation, reassign, resolve, cancel e consent_cancel, conforme tipo
e estado.
ENT receive exige divergences, mesmo vazio. Linhas não selecionadas são
integralmente aceitas; acceptedQuantity positiva parcial credita o destino.
Resolução registra received, returned ou missing com quantidade e motivo.

Atendimento da REQ deriva exclusivamente de aceite positivo de ENT vinculada.
Não é um estado administrativo nem a soma de quantidades requisitadas.
fullyCheckedLines da ENT não inclui linhas parcialmente aceitas, mesmo
quando sua diferença já foi conciliada.

## ENT — pedido de cancelamento e conciliação

Após aceite, cancel cria pedido identificado pelo banco e não movimenta
estoque. O recebedor original decide consent_cancel/refuse_cancellation;
withdraw_cancellation pertence ao solicitante. Cada decisão envia requestId,
motivo próprio, expectedVersion e idempotencyKey. Nenhum administrador assume
o ato pessoal de outra identidade. Autor/motivo/instante originais são leitura.

consent_cancel recebe referenceHash e lines com lineId/returnQuantity. Consumo
é calculado dos aceites e devoluções reais, com referência a débitos anteriores
confirmados da mesma custódia; não é input editável nem um novo desconto.
Quantidade aceita sem devolução ou consumo comprovado impede encerramento.
Trânsito pendente exige resolução física antes de consentir; essa resolução
conserva o pedido vigente e atualiza sua versão. Refuse/withdraw preservam
recebimentos e não escrevem ledger, retomando a situação dos fatos atuais.

deliveryCancellation apresenta pedido, histórico, fontes e resultado. Falta
de acesso/referência histórica não significa consumo zero. referenceHash é
revalidado sob lock, inclusive se a versão documental não mudou. Conflito exige
consulta/comparação e adoção explícita; valores e motivo próprios permanecem.
Recuperação de decisão confirmada exige acesso vivo ao resultado, sem exigir
novamente a capacidade de uma escrita já concluída. O PDF da nova versão
preserva aceite, pedido, decisor, consumo referenciado e devolução efetiva.

GET /api/documents/delivery-preparation recebe careRecipientId/source e exige
ent.create vigente. Retorna pessoas elegíveis na direção de custódia, escala
publicada no horário consultado, sugestão somente se inequívoca e referenceHash.
Sem pessoa apta, a preparação fica pendente; não se presume recebedor.
Em payload ENT, recipientReason registra escolha manual/troca e
recipientReference vincula a referência consultada. Escolha fora da sugestão
exige motivo de 3–1000 na expedição; trocar o destinatário do rascunho também
exige motivo próprio. O banco revalida papéis/capacidades e referência na
criação, revisão, submit e reassign, inclusive ao finalizar esperas tardias.
workflow_data.recipientSelection preserva pessoa escolhida/sugerida, escala,
motivo, indicador e instante; indicações anteriores permanecem no histórico.
Indicação não é presença, assinatura ou recebimento pessoal.

## Relatos e consumo

GET /api/consumption usa páginas de 20 por created_at/id, cursor beforeAt/
beforeId e filtros q (texto original), kind, status, from e to. Datas seguem
America/Sao_Paulo. A referência abre GET /api/consumption/[id] mesmo fora da
página recente; filtros não comandam movimentos.

POST action=report conserva texto e linhas originais, autor e nome capturado
no novo fato. Texto livre sem linhas é um relato válido, sem desconto.
action=supplement exige id, text, lines, expectedVersion e idempotencyKey;
cria complemento com autoria própria e nova versão, sem substituir original
nem movimentar estoque. As linhas do último complemento formam a estrutura
proposta completa. O relator vigente e outro responsável autorizado podem
esclarecer no próprio escopo; a equipe não assume custódia familiar.

action=confirm exige id, accept booleano explícito, expectedVersion e
idempotencyKey. Rejeição exige reason de 3–1000 caracteres; confirmação não
recebe texto ou quantidade novos. Consumo exige estrutura suficiente, unidade,
precisão, saldo e autoridade vigentes. Falta e rejeição não debitam. O banco
preserva snapshot da versão decidida e referencia cada movimento ao relato.
Mesmo resultado recupera a primeira decisão; resultado oposto ou estrutura
obsoleta retorna conflito. NULL não representa rejeição.

A RPC antiga de dois argumentos confirma/recupera somente v1 sem complemento;
não pode decidir uma estrutura nova sem versão explícita. Nova rejeição exige
motivo na RPC versionada. Replays não fabricam motivos/autores históricos.
Leituras, carregamento, erros e catálogo são independentes na tela. Conteúdo,
versão e chave ficam congelados durante escrita incerta; atualização concorrente
não troca a referência do formulário ou da revisão silenciosamente.

## COM — parcelas e encerramento da expectativa

receive declara uma nova chegada, com campos inicialmente vazios. A decisão
validate_receipt/reject_receipt recebe somente receiptId e, na rejeição,
motivo obrigatório; quantidades são leitura da parcela original. A resposta
contém estado, autores/instantes preservados e purchaseProgress por linha.
submission_key vincula a chegada ao evento sem alterar sua intenção canônica.
Eventos novos guardam receiptId, purchaseReceipt e purchaseReceipts no snapshot.
Não se presume autoria histórica quando o nome não foi preservado.

close_expectation exige motivo, confirmed=true, versão atual e capacidade
com.close_expectation. O padrão é administrador local; delegação familiar
explícita usa a política de capacidades do próprio paciente. O servidor calcula
somente aprovado menos adquirido e dispensado; o cliente não informa quantidade
a dispensar. A operação não escreve ledger. Não se dispensa material adquirido,
nem se apaga compra/parcela por cancelamento integral.

Para 10 aprovados, 2 adquiridos e 2 validados, a decisão conserva 10→2+8
dispensados e entrada real de 2. Se os 2 ainda aguardam conferência, o estado
é closed_pending_validation; rejeição conserva o relato e deixa aquisição
sem chegada válida como closed_pending_arrival. Só após resolver as parcelas
físicas há closed_below_quantity. approved_quantity não é reescrito para 2.
O estado operacional received corresponde à expectativa líquida resolvida;
purchaseProgress conserva a classificação específica e todas as dimensões.

Aprovação/validação imediatas por administrador exigem também com.approve e
com.validate efetivos, respectivamente. Negação explícita conserva a nova
emissão em pending_approval ou a parcela em pending; papel sozinho não concede
o ato. Submeter draft recalcula a aprovação vigente, sem reaproveitar valor
provisório como decisão oficial. Validação reconsulta autoridade após lock e
antes de retornar. Retry recupera a mesma parcela/evento, sem novo crédito.

Conflito de versão conserva edição e oferece consulta/comparação explícita
antes de usar o novo resumo. O motivo permanece; a concordância do encerramento
volta desmarcada. Resposta incerta conserva intenção e bloqueia fechamento/
edição do modal até recuperar; a explicação aparece dentro do diálogo.
Mensagens distinguem aquisição, chegada pendente, validação, rejeição e
dispensa da expectativa. Persistência entre navegações/aparelhos pertence ao
contrato D3 e não foi comprovada por esse estado mantido na mesma tela.

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

## Ciência REQ — P02

SCI-001 é o ato manual expresso. SCI-002 registra confirmação antes de abrir,
somente com preferência pessoal expressa e permissão administrativa capturada
na emissão. Cabeçalho, scroll, GET, download e leitura de WhatsApp não registram
nova ciência. SCI-003 é comunicação; SCI-004 continua desativada, aguardando
homologação externa futura. Nenhuma mensagem real foi enviada nos testes.

SCI-005 é invariável: expedição oficial de ENT vinculada por representante
familiar habilitado registra o expedidor efetivo, REQ/material, ENT/versão e
instante na mesma transação. Flags legadas false não a desativam. Rascunho,
edição, erro e rollback não registram esse ato. Expedidor autorizado sem
representação familiar conserva sua autoria física, sem ciência familiar.

Uma ciência familiar válida satisfaz o agregado ANY; a interface distingue
Família ciente, Minha ciência e pendência de designação. Desobrigação antiga
não fabrica ciência e revogação posterior não apaga fatos válidos. Versões
técnicas, identidade material e hash/identidade do PDF são conceitos separados.
Novo PDF ou atendimento não invalida ciência do mesmo material emitido.

Preferência própria usa manual/dialog/tacit, expectedVersion, idempotencyKey
e consent. Sem registro, manual é o padrão, sem backfill de opt-in por flags
antigas. Tácita só atua em nova emissão com elegibilidade, permissão e
preferência anteriores; conserva regra, versão, consentimento e autoria do
sistema. Mudança posterior não retroage. Retry da chave antiga recupera seu
resultado sem restaurar preferência já substituída. Falha/conflito conserva
edição e exige consulta explícita. A alternativa manual permanece acessível.

O diálogo usa referência material, não exige que a versão técnica continue
igual depois de um evento. Confirmação salva seguida de falha do conteúdo é
informada como tal; recuperar não duplica ciência.

POST de openings recebe materialIdentity, referenceVersion e openingKey;
identidade, nome e horário do registro vêm do servidor. O aplicativo só o
chama junto ao conteúdo carregado e renderizado em primeiro plano. Prévia,
prefetch/GET técnico, falha do corpo, ciência tácita e download não o chamam.
Repetir a chave recupera a mesma abertura; nova abertura usa chave própria.
Referência técnica anterior continua válida para o mesmo material.
Falha do registro não transforma conteúdo exibido em ciência nem retira uma
ciência confirmada; a recuperação conserva a intenção. A API revalida Auth,
paciente e req.read após espera; o registro não concede autoridade.

GET lista 20 registros por página, com beforeAt/beforeId recebidos no cursor;
instantes conservam a precisão textual do servidor. A interface oferece
histórico, atualização e páginas anteriores sem modificar o documento.
O aplicativo informa exibição; isso não comprova atenção ou leitura humana.

Importação preserva fatos conhecidos, identifica campos desconhecidos e
exige revisão explícita. Protocolos físicos não geram fatos nem notificações
retroativas. Histórico permanece acessível a vínculos autorizados após a
inativação do paciente.

O catálogo em src/lib/server/error-catalog.ts define code, categoria,
retryable, recommendedAction e HTTP. Validação, sessão expirada, capacidade
negada, paciente inativo, saldo insuficiente, versão antiga, idempotência
conflitante e dependência externa indisponível têm respostas próprias.
