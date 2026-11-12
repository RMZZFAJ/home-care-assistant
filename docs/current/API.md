# Contratos de API

## Compatibilidade pública do cliente

GET /api/runtime consulta somente client_schema_contract, sem sessão, cookie ou
metadata privada. Resposta200 informa state=ready, protocol e schema. Ausência
do marcador ou versão divergente retorna503/RUNTIME_INCOMPATIBLE; falha de
infraestrutura retorna503/RUNTIME_UNAVAILABLE. Respostas têm no-store e
x-correlation-id. O endpoint não concede autorização para dados ou comandos.
O cliente conserva edições e bloqueia novos envios até recuperar compatibilidade.
O contrato e os limites do worker estão em
[PWA D5.1](../audits/D/D-B/PWA_RUNTIME.md).

## Emissões documentais D4

GET /api/documents/:id/issuances consulta20 registros por página, com cursor
before/beforeId (par obrigatório). A leitura depende da sessão, contexto e
capacidade vigente do documento. A lista não envia snapshot, caminho privado
ou credencial de processamento. Não cria arquivo por simples consulta.

POST na mesma rota recebe idempotencyKey, version opcional positiva e
documentOptions opcional para Ficha Ampliada ou auditoria. Não recebe fontes,
bytes, estado de assinatura, revisão de renderização ou prova do worker.
O banco congela versão, snapshot canônico, autoria nominal, instante, código
público aleatório e identidade da emissão. A chave pessoal reapresentada
recupera a mesma intenção; mudança de seletor documental conflita. Cada nova
chave explícita cria outra emissão, sem alterar documento, SCI ou estoque.
Resposta200 exige ready;202 representa processamento ainda não concluído.

A reserva atual usa reserve_pdf_issuance_v16 para novas emissões dos cinco
modelos (REQ, COM, ENT, devolução e BAL). Intenções anteriores mantêm revisão,
fonte e identidade, inclusive se recuperadas pela entrada nova.
Além da fonte canônica preservada,
balanceApplication congela
o ato correspondente à contagem e ao corte de versão escolhidos. not_applied,
unavailable e applied com linhas known/restricted são distintos; quantidade
restrita é null e não transporta o valor. Perda de stock.team.read impede
retornar snapshot ou baixar emissão anterior com saldo known, inclusive por
entradas antigas que recuperam a mesma intenção. Pode ser emitido outro exemplar
mascarado. Ganho de acesso não altera o mascaramento já congelado.

Na COM V13, purchaseEntryBalances congela por material o saldo FAMILY após a
última entrada validada naquela COM até o corte escolhido. Cada linha contém
lineId, state, quantity e entry. Os estados são known, restricted,
not_validated e unavailable; somente known contém quantidade. entry identifica
parcela, primeiro evento de validação, versão, quantidade da entrada, autores e
instantes de declaração/validação. O total accepted_quantity continua acumulado.
Dados legados sem captura não são aproximados pelo estoque atual. A captura
ocorre na validação nativa e reverte com a transação, sem escrita do cliente.

GET /api/documents/:id acrescenta a mesma projeção autorizada para a versão
atual da COM. A interface confere materiais, parcelas, eventos e corte antes de
mostrar o saldo. Os fatos privados ficam fora do conteúdo canônico. Perda de
stock.family.read impede obter emissão antiga com linha known, inclusive pelas
entradas anteriores de recuperação. Outra emissão pode congelar o mascaramento;
ganho posterior de acesso não altera os bytes ou a fonte já preservados.
[Implementação e limites](../audits/D/D-B/PURCHASE_ENTRY_BALANCES.md).

Na ENT V14, natureza e percurso vêm da origem/destino congelados. A declaração
bilateral precisa concordar com esse par; contradição é recusada. Entrega segue
FAMILY→CARE_TEAM; devolução segue CARE_TEAM→FAMILY, com origem documental
opcional e sem desfazer outra entrada. Ausência histórica do percurso fica
explícita. V10 conserva seu título original e os exemplares já emitidos não
mudam. A entrada autenticada /fichas/devolucao reaproveita os comandos e a
recuperação existentes; não confere autoridade por selecionar uma rota.
[Implementação e limites](../audits/D/D-B/AUTONOMOUS_RETURNS.md).

A orquestração obtém claim de serviço com lease de cinco minutos e token
aleatório que nunca vai ao navegador. Composição/oráculo precedem assinatura
PAdES-B-T e verificação. Upload usa caminho exclusivo e upsert=false. Read-back
confere identidade, texto, geometria, assinatura e bytes vencedores antes do
registro final pela sessão Auth e pelo token do worker. Falha/ambiguidade
preservam a intenção; objeto enviado sem ready pode ser recuperado e validado.
As RPCs não concedem ao cliente a capacidade de forjar sucesso só com sua chave.

GET /api/documents/:id/pdf?issuance=UUID recupera somente exemplar ready daquele
documento; não renderiza. Revalida leitura antes e depois do I/O, hash/tamanho
e assinatura sob a política pública atual, sem exigir chave privada. Bytes
divergentes são recusados. O parâmetro antigo de versão/renderer ainda possui
consumidores legados; a migração desses consumidores continua pendente e não
deve ser confundida com o contrato novo por emissão.

pdf_issuance_public é exclusiva do servidor e aceita código ou digest e
devolve somente metadados mínimos
de exemplar ready. O resultado é um registro; não constitui verificação atual
de assinatura nem prova dos bytes de um PDF que o visitante esteja segurando.
A página canônica e o upload limitado/isolado foram acrescentados no lote D4.3.
A resolução antiga de QR continua preservada. Segredos e limites estão descritos
na [custódia D4](../audits/D/D-B/SIGNING_CUSTODY.md).

Contrato AS_IS da base funcional `37cb7f85e96e551d6419871f94dd950712e2565b`.
Precisão number/string, etapa parcialmente confirmada, paginação e
classificação de erro têm desvios B4. Correção de estoque sem referência ainda
é aceita por caminhos diretos B3-005, apesar do contrato exigido abaixo.
Estado e limites: [PROJECT_STATUS](PROJECT_STATUS.md). Planejamento futuro
em [C](../audits/C/README.md); decisões aprovadas não equivalem a
implementação.

## Emissão V16 — composição aprovada e fatos preservados

A composição usa Source Sans 3 incorporada, categorias, bandeira lateral quando
aplicável, macroetapas, tabelas e observações completas, com continuidade entre
páginas. A revisão identifica o contrato documental e preserva a recuperação de
intenções antigas; não muda a versão pública do produto.

presentationFacts congela o instante exato do corte, a função do autor no
primeiro ato emitido e referências operacionais explicitamente preservadas.
A função não é inferida do exportador nem de um importador histórico. As
referências reversas da REQ usam eventos canônicos de COM/ENT até o corte,
sem afirmar que o vínculo significa atendimento integral. Sem leitura da ficha
relacionada, somente a indicação restrita é congelada. Perda posterior dessa
leitura impede recuperar uma emissão que preservou a referência conhecida;
outra emissão pode ser criada com o mascaramento vigente.

O catálogo HCAIssuance dos PDFs V16/V17 contém somente verificationCode e
requestedAt.
O vínculo com documento, versão, fonte, revisão e digest permanece no registro
imutável de emissão; identificadores internos não são despejados no corpo
operacional. Na ENT, recebimento pessoal, conciliação administrativa e quantidade
ainda pendente são fatos distintos; pendente desconta aceito e conciliado.

O ciclo herdado de V15 congela cancelamento, ciências próprias e vínculos até a
versão solicitada. Referências autorizadas preservam código, protocolo,
versão/hash, motivo, autor e instante do vínculo. Sem leitura do documento
relacionado, a representação é restrita e não transporta esses dados. A guarda
comum revalida essa leitura ao recuperar, concluir ou baixar uma cópia conhecida.
As intenções antigas mantêm revisão e fonte; download não reemite o arquivo.
Campos COM, BAL, devoluções, assinatura interna e TSA continuam no mesmo ciclo.
[Resultados e limites](../audits/D/D-B/PDF_LIFECYCLE.md).

## Emissão V17 — modalidades e fontes selecionadas

documentOptions contém mode (expanded/audit), sections, period e purpose.
sections escolhe progress, communications, confirmations, relations e access;
no mínimo uma seção, sem duplicatas. period informa from/through como dias ISO
completos e inclusivos ou ambos null, com timeZone=America/Sao_Paulo. purpose
é null para expanded e texto de 3–500 caracteres para audit. A ordem das seções
é normalizada no cliente e no banco e participa do hash da intenção.

reserve_pdf_expanded_issuance reserva V17. A entrada cotidiana sem opções
continua V16. Novas modalidades preservam toda a Ficha e congelam o complemento
em uma consulta nativa, sem leituras paginadas parciais. A versão canônica e o
instante de referência do complemento são distintos e declarados. O período
filtra registros; vínculos refletem a versão preservada. Comunicações mostram
destinatário, canal, estado e momento disponíveis na reserva, sem destino,
referência do provedor, template ou payload. Não são ciência pessoal.

Auditoria exige audit.read do paciente; access exige document.access.read,
além da leitura da ficha. As mesmas competências e as referências manuais
conhecidas são reavaliadas na recuperação, conclusão e download. Listas de
emissão/acervo filtram essas modalidades restritas e a interface oculta seus
registros após mudança confirmada do contexto. Não há concessão por identidade
global. Relatório inclui finalidade, fontes, período e limites, com marca
nominativa em todas as páginas antes da assinatura, conferida nos bytes.

O pacote oficial preservado no aparelho inclui a seleção e recupera a mesma
emissão. Referência local danificada impede iniciar outra emissão por engano;
nenhum rascunho comum foi ampliado. Os bytes anteriores não são reescritos.
As recusas/limites e a custódia ainda parciais seguem nos critérios gerais D4;
estas modalidades não aprovam confiança externa, homologação humana ou produção.

## Histórico de acesso às fichas

GET /api/documents/:id/access exige sessão, contexto, leitura da ficha e
document.access.read. Retorna vinte registros por página, com beforeAt/beforeId
completos para continuar. A competência tem padrão de administrador local do
paciente e pode ser concedida explicitamente; identidade global ou simples
leitura documental não a substituem. A REQ mantém sua rota anterior de consulta,
com os campos legados e a mesma competência específica. RLS aplica a restrição
também à leitura direta de requisition_openings.

POST recebe somente referenceVersion e key. Registra exibição informada em
primeiro plano, depois do conteúdo disponível; GET, prefetch, rascunho privado
e emissão de PDF não criam o relato. COM, ENT e BAL usam o mesmo contrato; REQ
conserva seu registrador anterior e suas chaves. A mesma pessoa/versão compartilha
o registro durante vinte minutos do primeiro relato. Versão ou pessoa distintas
têm janela própria. Novas chaves agrupadas conservam a recuperação do registro
original após a janela, sem substituir seus nomes ou instantes.

A autoridade é revalidada depois da espera, inclusive nas recuperações. As
respostas são private/no-store. O relato não registra ciência, leitura integral,
recebimento, notificação, versão documental ou movimento de estoque. A consulta
do histórico mantém paginação, estado de abertura e recuperação de falha.

## Fichas complementares

GET /api/documents/:id/complements consulta relações paginadas; mode=candidates
recebe type,search e page para procurar nova ficha emitida elegível. mode=attempt
recebe key e consulta somente a tentativa do usuário atual, após as mesmas
travas da gravação. Consulta não registra vínculo nem ciência.

POST recebe childId,sourceVersion,childVersion,reason e idempotencyKey. Mesmo
paciente,origem emitida,nova ficha posterior não cancelada,leitura de ambas e
permissão nativa de emissão são verificadas no banco. Só emissor/administrador
habilitado vincula; motivo e autoria são próprios. Versões avançam com eventos
opacos,sem editar materiais,estoque,atendimento ou ciências. Referência mudou:
conflito; mesma chave com intenção trocada:conflito. Sem acesso à outra ficha,
a consulta não envia código,motivo,autor ou conteúdo do documento restrito.
A própria confirmação permanece consultável sem permissão de emissão,desde que
as leituras continuem autorizadas. [Escopo](../audits/D/D-B/DOCUMENT_COMPLEMENTS.md).

## Ciência própria do cancelamento

GET /api/documents/:id/cancellation consulta o ato cancelado preservado e as
ciências próprias, sem gravar acesso ou confirmação. Revalida a leitura integral
do documento. Histórico sem ato/protocolo preservado fica unavailable, sem
ciência presumida. A retirada de uma preparação bilateral não é cancelamento
de ficha expedida.

POST recebe somente cancellationEventId e idempotencyKey. Exige habilitação
familiar vigente e confirma a referência; segue lock do paciente antes do
documento e revalida autoridade após espera/registro. Um ato por pessoa/evento,
inclusive com chaves concorrentes. Chave registrada com outro alvo conflita.
Recuperação da própria chave após perder ciência exige conservar leitura.
O novo evento não altera material emitido, SCI anterior ou estoque. Pedido
interno obrigatório independe de canais/preferências opcionais; não ativa
transporte externo. A consulta ou marcação de aviso não é esta confirmação.
[Implementação e limites](../audits/D/D-B/CANCELLATION_AWARENESS.md).

## Comparação das versões documentais

GET /api/documents/:id/history recebe version obrigatória e before opcional,
ambas positivas em formato decimal. A referência precisa existir e ser anterior
à versão escolhida; omissão escolhe a anterior disponível. Não substitui uma
versão ausente pela atual. Retorna data com selected, before (ou null) e versões
disponíveis, sem corpo canônico bruto ou contexto de autoridade.

A sessão Auth precisa da leitura vigente do documento antes e depois do I/O;
as linhas de origem passam pelo RLS desse mesmo cliente. A resposta usa private,
no-store. Dados são imutáveis em leitura; a rota não emite PDF nem cria evento.
COM conserva a barreira financeira do papel familiar/administrativo; um
override clínico não a remove. Capacidade de leitura não concede compra.
Nome é o preservado no evento, desconhecido explícito ou sistema sem autor
pessoal. Não consulta perfil/catálogo atual para recompor autoria ou materiais.

Cada versão contém hash canônico, autoria/data, fatos rotulados e indicador de
campos ainda sem descrição. Números usam o token original de body::text e são
formatados por Decimal. Hash do evento, SHA-256 do arquivo e verificação da
assinatura permanecem resultados separados. Campos futuros não são despejados
como JSON nem tratados silenciosamente como comparação completa.

Inválido retorna400; sem sessão401; sem leitura403; versão ausente ou referência
invertida404; corpo congelado incompatível409/CONTENT_INVALID. Interface oferece
Atualizar a seção, sem transformar fatos antigos em campos editáveis.
[Contrato e provas](../audits/D/D-B/DOCUMENT_VERSION_HISTORY.md).

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

  **Contrato:** Unidades, apresentações e código de barras textual. POST exige
  catalog.manage, fator finito positivo e código/nome/fator conjuntos.
  /api/catalog e ação product de /api/admin usam a mesma catalog.manage;
  delegação de catálogo não concede access.manage.

  Com action=presentation, POST recebe id/referenceVersion (ambos NULL na
  criação), productId, barcode textual, name, baseQuantity, active e
  idempotencyKey. A RPC distingue nova escrita de recuperação do próprio ato:
  result preserva o resultado aplicado; current informa eventual versão
  posterior de outra pessoa. Recuperação exige leitura viva; nova mutação
  exige catalog.manage e paciente ativo. Conflito retorna HTTP 409.
  O contrato legado ainda configura unidade ou cria código novo; alterar
  código existente exige o comando com identidade e versão.

  GET aceita includeInactive=true, productId e presentationId; a consulta de
  uma apresentação inclui versions/versionTotal, em páginas de 20 versões
  por historyPage. Histórico e definições respeitam o paciente selecionado.

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

  GET conserva data,total,page,pageSize e acrescenta careRecipientId e
  filters(search,type,status,from,to), com filtros vazios como NULL.
  O servidor confere a estrutura nativa, os totais e a página antes de responder;
  resultado interno inconsistente é erro de consulta, não vazio ou rejeição de
  preenchimento. A tela confere esse âmbito, preserva somente a leitura válida
  do mesmo filtro e a identifica quando a atualização falha. 401/403/404 retiram
  os dados anteriores. Busca e paginação não registram abertura, ciência ou
  operação de estoque. A ordenação nativa é created_at decrescente e id crescente.

- **Rota:** /api/documents/:id

  **Contrato:** Documento e comando transacional

- **Rota:** /api/documents/:id/revise

  **Contrato:** Edição de rascunho ou reconto BAL

- **Rota:** /api/documents/:id/pdf

  **Contrato:** PDF privado da versão autorizada

- **Rota:** /api/documents/:id/notifications

  **Contrato:** Estados seguros dos envios

- **Rota:** /api/stock/balances

  **Contrato:** Confirmados, previsões, trânsito e métricas. A tela consulta
  saldos e histórico independentemente, com atualização e erro por fonte.
  Falha transitória conserva a consulta válida do mesmo filtro, com instante
  e aviso de desatualização; erro inicial não significa vazio nem saldo zero.
  Outra custódia/filtro não reutiliza dados anteriores como resultado atual.

- **Rota:** /api/stock/movements

  **Contrato:** Ledger e operações administrativas familiares

- **Rota:** /api/stock/movements/:id/origin

  **Contrato:** Consulta tipada, somente leitura, com careRecipientId explícito.
  O UUID identifica um movimento visível pela RLS da própria sessão. A origem
  exige também leitura do recurso: purchase_receipt resolve sua parcela e COM,
  BAL/ENT resolvem a ficha, consumption resolve o relato e family_manual conserva
  o ato avulso ou seu movimento compensado. Inventário legado permanece somente
  leitura. Sem movimento autorizado, responde404; sem origem autorizada ou
  identificável, retorna kind=unavailable sem presumir outro UUID ou expor a ficha.
  Quantidades do movimento são texto decimal exato. Não cria eventos ou efeitos.
  Na tela, a gaveta conserva filtros, informa falha/consulta anterior e restaura
  foco. Nome atual do catálogo/perfil é identificado como atual, distinto dos
  nomes históricos preservados na origem. Resposta privada usa no-store.

- **Rota:** /api/stock/inventory

  **Contrato:** Consulta legada; escrita aposentada com HTTP 410

- **Rota:** /api/catalog/identities

  **Contrato:** Comparação e situação de uma identidade no paciente. GET exige
  catalog.manage e aceita productId, successorId opcional e page, com20 escolhas
  históricas por página. Retorna unidade, situação, aliases e saldos somente das
  custódias autorizadas; NULL significa restrição, nunca zero inferido. POST
  recebe productId, successorId, referenceHash, action, reason e idempotencyKey.
  Os atos são retire, reactivate e clear_successor. Motivo próprio tem3–1000
  unidades UTF-16, com mínimo de três caracteres. Banco exige referência atual,
  paciente ativo e catalog.manage para nova escrita; chave própria já confirmada
  recupera com leitura viva. Sucessor precisa ser outro material ativo do mesmo
  paciente e não formar ciclo. Inativar pode conservar saldo sem sucessor;
  reativar remove a orientação, mantendo a mesma identidade. Nada movimenta
  estoque, converte unidade ou reescreve documento. A resposta é privada/no-store.

  GET /api/catalog inclui successor e selectionPredecessors como orientação de
  escolha explícita. O material inativo continua fora da seleção normal; nomes
  anteriores não se tornam aliases nem substituem IDs persistidos. A busca por
  nome/alias em COM/ENT/REQ não modifica as seleções feitas em outras categorias.

- **Rota:** /api/attachments

  **Contrato:** Reserva, upload validado, vínculo e links privados

- **Rota:** /api/consumption

  **Contrato:** Relatos, complementos e decisões versionados; páginas e filtros

- **Rota:** `/api/consumption/[id]`

  **Contrato:** Original, complementos, decisão e movimentos no escopo autorizado

- **Rota:** /api/dashboard

  **Contrato:** Tarefas pendentes e ações pertinentes

- **Rota:** /api/profile

  **Contrato:** Perfil, foto, contatos, preferências e sessões

- **Rota:** /api/patient-settings

  **Contrato:** Regras e alterações de acesso com aprovação

- **Rota:** /api/notifications

  **Contrato:** Caixa pessoal paginada e marcação como vista, independente da ciência

<!-- c-table:end -->

Na caixa pessoal, GET /api/notifications usa o paciente selecionado na sessão
revogável do banco e filtra também a identidade destinatária. O parâmetro
careRecipientId, quando informado, deve corresponder a essa seleção: divergência
retorna409 CONTEXT_REQUIRED. Sem contexto de paciente, responde
availability=patient_context_required, sem consultar notificações de outros
pacientes. A seleção é conferida novamente depois das leituras autorizadas.
Resposta consultada inclui availability=ready, careRecipientId, data, total,
unreadCount, page, pageSize, unread e surface. A central confere a seleção,
o tamanho esperado da página e identidades únicas; resposta inconsistente
não substitui a leitura válida. O sino exclui silenciosas antes da paginação;
na central, o filtro de não vistas se aplica antes da página. Falha de leitura
ou resultado inválido não vira caixa vazia. POST marca vista no aplicativo;
não registra ciência, aceite documental ou leitura confirmada por provedor.

Em GET /api/patient-settings, a leitura de propostas mantém a RPC nativa e
inclui careRecipientId, status, kind e query, além de changes, total, page e
pageSize. Em changesOnly=true, esse é o envelope direto; nas leituras compostas,
os metadados ficam em changePage. Servidor e lista conferem paciente, seleção,
comprimento esperado e identidades, preservando campos e tipos futuros seguros.
Isso não altera permissões, proposta original ou autorização para decidir.

Na leitura section=audit de /api/admin, a resposta preserva o RPC nativo e
identifica careRecipientId e filters. Servidor e lista conferem paciente,
seleção, página, tamanho, comprimento esperado e identidades únicas. Erro
não vira vazio; autoria continua explicitamente como nome atual do cadastro.

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

Opcionalmente, remainingNeed contém requisitionId, version e reason próprios
para emitir nova necessidade vinculada. Não aceita ator, protocolo, snapshots
ou quantidade solicitada nessa referência. A origem deve ser REQ operacional
do mesmo paciente e conter ao menos um dos materiais novamente selecionados.
O motivo tem no mínimo três caracteres Unicode e no máximo1.000 unidades
UTF-16. Versão obsoleta recebe VERSION_CONFLICT; a interface preserva seleção,
observação e motivo e exige adoção explícita da referência consultada.
Detalhe/comprovante incluem sourceRequisition; o detalhe da origem mostra os
vinte vínculos seguintes mais recentes, com total declarado. Ciência e aceites
do original não são atribuídos à nova REQ. Recuperar a própria chave confirmada
exige leitura viva; uma nova emissão exige req.create no banco, após esperas.

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

COM emitida exige origin purchase ou donation explícita. Rascunho pode
conservar origem desconhecida; submit exige escolha válida. Eventos antigos
não são preenchidos retroativamente e a leitura histórica permanece neutra.
ENT exige source e destination
FAMILY/CARE_TEAM distintos e recipientId autorizado. BAL registra todos os
produtos ativos da equipe e sua referência. Campos financeiros não são
obrigatórios e não existe ficha de abastecimento externo.

Comandos incluem approve, purchase, receive, validate_receipt, reject_receipt,
close_expectation, reassign, resolve, cancel e consent_cancel, conforme tipo
e estado.
BAL approve aceita group family/supervisor, comment opcional com até2.000
unidades UTF-16 e reviewReference SHA-256 da referência retornada pelo banco.
items opcional declara somente materiais examinados:lineId,result
confirmed/difference,forwarding none/recount/adjustment e comment até500 UTF-16.
Não examinado é omissão; diferença exige encaminhamento próprio. Não aceita
quantidade, autoria escolhida ou alteração de notas da contagem. A opinião
nova é marcada opinionOnly e nunca aplica estoque. Registros antigos mantêm
sua proveniência. Parecer sobre referência histórica não valida saldo atual.
Hash/versão obsoletos exigem consulta e adoção explícita da referência.
O contrato antigo com somente group continua aceito; a UI envia a referência
e expectedVersion. balanceReview distingue reviewSatisfied,hasItemDifferences,
applicationGroups e application, além de contador, contagem e pareceres.
corrections acrescenta referências de atos posteriores por reviewId/sourceLineId.
Cada referência distingue origem known/unavailable e uma cronologia de atos.
Somente reconto da mesma ficha, identidade textual exata do produto e contagem
posterior geram vínculo. Nomes, quantidades parecidas, outra ficha, ENT ou consumo
não são presumidos como correção daquele parecer. Cada ato preserva evento,
versão, contador, instante, linha congelada e aplicação correspondente ao corte.
A aplicação é filtrada ao material e mascarada pela permissão atual de estoque.
A leitura não muda estoque, parecer, protocolo, hash ou snapshots públicos.

A emissão BAL V12 congela balanceReviewCorrections no corte selecionado;
versões anteriores não recebem atos futuros. A leitura de exemplar com valores
privados de uma correção também exige stock.team.read, ainda que a contagem
atual não tenha sido aplicada. V11 e anteriores conservam sua fonte/revisão.

BAL apply_balance exige idempotencyKey,expectedVersion e body com group e
reviewReference. Requer revisões previstas, grupo/pessoa autorizados distintos
do contador, paciente ativo, referência atual e ausência de diferença apontada.
Tem evento bal.apply e efeito próprios. A contagem facultativa mantém a aplicação
nativa; seu parecer posterior não repete esse efeito. Valores após aplicação
ficam em tabela privada e retornam mascarados conforme stock.team.read.

GET /api/balances/application recebe careRecipientId,documentId,idempotencyKey,
expectedVersion,group e reviewReference. Exige bal.read e escopo exato antes da
consulta bloqueada balance_application_result. found identifica evento, versão
e aplicação da própria tentativa. not_found não confirma efeito; obsolete só
é retornado quando a versão observada antes da consulta já impede um futuro
commit daquela intenção. Consulta não cria ou repete movimento. Reenvio exige
ato explícito, mesma chave e corpo. A recuperação por leitura permite perda de
escrita, nunca perda de bal.read; saldos respeitam a permissão atual.

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

## Transferência bilateral — P07

GET /api/transfers/preparation recebe careRecipientId/source. Exige ent.create,
ent.read e leitura do estoque da origem. Retorna pessoas elegíveis na custódia
oposta, materiais ativos ou inativos com saldo positivo na origem, quantidades
disponíveis, até 100 ENT recentes com aceite nessa custódia e referenceHash.
originTotal informa o recorte documental; nenhuma COM ou saldo geral de outra
custódia é exposto por essa preparação.

POST /api/transfers recebe careRecipientId, idempotencyKey e declaration, com
source, counterpartyId, recipientId, originDocumentId opcional, referenceHash,
reason e lines de productId/quantity na unidade base. Reason tem 3–1000 unidades
UTF-16, com pelo menos três caracteres; quantidades são positivas e exatas.
Cria ENT em transfer_pending, com materiais e três papéis congelados, sem
protocolo ou movimento. A ENT de origem é documental, deve ter aceite positivo
dos materiais na custódia de origem e não identifica lotes individuais.

POST /api/documents/{id}/transfer recebe action, body, expectedVersion e
idempotencyKey. Agree/decline são decisões pessoais da contraparte, com reason
próprio. Agree produz transfer_ready; nenhum deles expede ou recebe. Dispatch
recebe body vazio e pertence ao declarante autorizado: exige concordância e
elegibilidade vigentes, gera protocolo ENT e usa o motor existente para origem
→ trânsito. Withdraw encerra declaração ainda não expedida; administrador apto
pode encerrá-la com autoria administrativa própria. Versão obsoleta, referência
alterada e intenção incompatível são conflitos, sem efeito parcial.

O recebimento posterior continua no comando ENT existente e pertence somente
ao recebedor designado. A mesma pessoa pode ser contraparte e recebedor, mas
registra dois atos distintos. O recebedor desta declaração fica congelado;
substituí-lo exige encerrar/cancelar e preparar outra transferência. A troca de
destinatário das ENT comuns mantém seu contrato. Cancelamento após consumo,
divergências e conciliação usam o motor ENT preservado.

Recuperação da mesma chave/intenção confirmada exige ent.read vivo, sem exigir
novamente a capacidade da escrita concluída. Nova intenção revalida todas as
permissões, inclusive após esperas tardias. A API não aceita autores, concordância
ou aceite fabricados pelo cliente. Delivery task list filtra decisões da
contraparte e expedições do declarante antes da paginação e aceita os dois novos
estados. O escopo próprio inclui os três participantes da transferência.

O PDF a partir da expedição contém declaração, concordância e recebimento
separados. Versões anteriores à expedição ficam no histórico e não são servidas
como comprovante ENT. Nenhum ato representa assinatura digital.

## Apresentações registradas em COM e ENT

COM/ENT também aceitam lines[].presentations com id/version/packages e
manualQuantity adicional. packages é inteiro positivo textual; quantity
continua em unidade base e deve coincidir com a soma calculada no banco.
Fator/código/nome/unidade vêm do cadastro versionado autorizado. A fonte
obsoleta exige comparação e adoção explícita, sem aplicar fator novo à escolha
antiga. BAL permanece contagem física em base. Entrada manual não exige código.
presentation_conversions é preenchida pelo banco, integra snapshot/hash e
alimenta consulta/PDF; metadata legada não é promovida a proveniência validada.
Documento emitido e recuperação da mesma intenção conservam o fator original.

## ENT — regularização administrativa e tarefas

Quando o recebedor original perde a autorização, resolve exige o procedimento
administrativo. O aceite pessoal e sua autoria permanecem preservados.
POST /api/documents/:id aceita quatro ações versionadas com chave própria:

- propose_regularization: reason, basis, reviewerId e todas as linhas com
  lineId/receivedQuantity/returnedQuantity/missingQuantity explícitos. O banco
  calcula unknownQuantity; se houver desconhecido, followUpOwnerId é obrigatório.
- review_regularization: caseId, accept booleano e motivo próprio. Somente o
  conferente independente designado decide; não altera as quantidades propostas.
- withdraw_regularization: caseId e motivo próprio. Autor retira sua proposta;
  autoridade familiar pode encerrar uma proposta obsoleta com sua própria autoria.
- record_regularization_finding: caseId e text do responsável futuro designado.
  O relato preserva os fatos anteriores e não movimenta estoque.

ent.regularize exige capacidade efetiva e vínculo local ativo de família/admin.
Suporte global sem esse vínculo não administra o procedimento. Conferente deve
ser outra pessoa elegível; situação desconhecida exige responsável ativo com
ent.follow_up/ent.read e papel operacional compatível. Leitor não assume relato
físico por flag. Confirmação crítica revalida autoridade, destinatário e unidade
após esperas; proposta, recusa, retirada e relato não produzem movimentos.

deliveryRegularization apresenta dossiês, antes/depois, evidências, decisões,
movimentos e relatos com autores próprios. Aprovação credita apenas recebimento
físico apurado, devolve apenas retorno comprovado e baixa apenas falta apurada.
Desconhecido conserva trânsito e responsabilidade futura. Não altera
accepted_quantity, acceptedBy/At ou fully_checked do recebimento pessoal.
Pedido de cancelamento anterior sem decisão pessoal permanece histórico,
identificado como tal; não se fabrica consentimento da pessoa desligada.
Recuperação da mesma intenção confirmada exige ent.read vivo, sem exigir
novamente a capacidade de escrita. Decisão oposta conflita sem efeito parcial.

GET /api/deliveries usa delivery_task_list; padrão scope=own/status=tasks.
Filtra tarefas executáveis da identidade antes de contar/paginar: recebimento,
divergência, cancelamento pessoal, conferência administrativa ou apuração futura.
Não equivale a filtrar apenas recipient_id. Histórico autorizado usa status
específico ou vazio e scope own/team; tasks exige own. Terminal sai da fila,
salvo uma nova obrigação administrativa explicitamente designada. Falha de
consulta mantém somente a lista válida do mesmo paciente, seleção e página,
identificada com seu instante, sem vazio falso. Outra seleção não reaproveita
os registros anteriores como resultado atual;401/403/404 retiram o conteúdo.
O envelope conserva data,total e acrescenta careRecipientId,page,pageSize e
filters(scope,status). Servidor e consumidor conferem estrutura, identidade
única, total e âmbito antes de adotar a resposta. A tarefa própria continua
calculada no banco, sem derivar autorização de recipient_id no navegador.

Cada ENT inclui deliverySummary com source,destination,recordedByName,
recipientName,counterpartyName e receivedByName, todos anuláveis. O percurso
é oposto entre FAMILY/CARE_TEAM ou ambos nulos. Nomes vêm dos snapshots de
declaração, seleção e eventos, nunca do perfil atual. O recebedor designado
precisa corresponder ao recipient_id atual; sem snapshot compatível, o nome
fica ausente. Conferência pessoal não implica aceite integral. A consulta
enriquece somente a página autorizada, sem diretório ou saldos adicionais.
Resumo ausente/corrompido gera erro recuperável. Na interface, filtros/página
usam deliveryScope,deliveryStatus,deliveryPage e deliveryPatient na URL; esses
parâmetros não conferem autoridade. O atalho da tarefa abre Atendimento e fica
suspenso enquanto a consulta estiver desatualizada ou falhar.

## Coleções completas de catálogo e contas globais

GET /api/catalog conserva data e os campos de seleção anteriores, incluindo
aliases, active, successor e selectionPredecessors. Acrescenta careRecipientId,
total e includeInactive. A leitura catalogue_workspace agrega itens e orientação
em um único snapshot estável sob o usuário/RLS/contexto originais; não há corte
em1000 linhas. Servidor confere total, unicidade e referências do paciente antes
de mapear as mesmas identidades. Nenhum saldo ou quantidade é convertido.

GET /api/admin?section=catalog usa a mesma leitura no contexto local e preserva
o agregado nativo da administração global. Ambos retornam data,total,
careRecipientId e includeInactive=true. O consumidor confere o envelope antes
de apresentar a coleção completa, com busca e páginas locais. Falha conserva
só leitura válida da mesma seleção e recusa retira os dados, sem vazio falso.

GET /api/admin?section=profiles&profilePage=N&query=texto mantém guarda global,
RPC e ordem full_name/id. Retorna data,total,profilePage,pageSize30 e query
normalizada. A tela global e o seletor de vínculos conferem página, tamanho,
consulta, quantidade e IDs. Count/data ausentes não viram zero. A tela usa
profilePage/profileQuery na URL, com Voltar/recarga e revisão global anterior.
A busca é submetida por Buscar contas/Enter. A resposta legada sem profilePage
permanece para compatibilidade, sem ser a fonte paginada da tela global.

## Relatos e consumo

GET /api/consumption usa páginas de 20 por created_at/id, cursor beforeAt/
beforeId e filtros q (texto original), kind, status, from, to e sourceReminder.
Datas seguem America/Sao_Paulo. O envelope conserva data/next e acrescenta
careRecipientId,pageSize20,before e filters normalizados. Servidor e consumidor
conferem âmbito, identidade única, ordem decrescente por instante/ID e cursor
ligado à última linha da página completa, preservando microssegundos. Uma
continuação precisa avançar além da referência solicitada, sem repetir IDs.
Falhas preservam somente a seleção válida anterior, com instante; recusas
401/403/404/409 retiram também páginas acumuladas. Erro bloqueia continuação
até atualizar a consulta. A lista usa a RLS de cada custódia: perder leitura
familiar conserva somente relatos da equipe ainda autorizados, sem exigir
uma recusa global para uma lista parcialmente permitida.
A referência abre GET `/api/consumption/[id]` mesmo fora da página recente;
filtros não comandam movimentos. URL, recarga e Voltar/Avançar restauram os
filtros, sem rascunho de negócio ou nova persistência.

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
Recuperar o próprio relato, complemento ou decisão pela chave original exige
leitura viva da custódia, sem exigir novamente a capacidade da escrita concluída.
API consulta o escopo de leitura e a RPC distingue atomicamente recuperação de
novo comando; novas escritas mantêm papel/capacidade e revalidações após espera.
Trocar conteúdo/versão da chave conflita. Complemento antigo pode ser recuperado
depois de o relato ser conferido; a tela mostra o estado atual e a decisão real.
Perda de leitura continua bloqueando o resultado, inclusive após espera no lock.
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

GET /api/admin/membership-impact recebe careRecipientId/userId e exige gestão
local ativa. O alvo precisa ter vínculo neste paciente. membership_impact retorna
ENT pendentes com aceite/trânsito por material, regularizações designadas, BAL
vigente, adiamentos pendentes, plantões em andamento/futuros e propostas de escala.
Cada grupo respeita a capacidade de leitura do processo: falta de acesso retorna
available=false/total=null, nunca zero inventado. Totais antecedem o limite de
20 registros por grupo e 20 linhas por ENT; a interface informa o recorte.

A consulta não revoga, transfere, recebe, conta, aprova ou movimenta estoque.
Revogar agora permanece disponível durante carregamento/erro da prévia, usando
o comando de revogação existente com autorização vigente no servidor. Após a
revogação, P05 e os processos de BAL/escala encaminham as tarefas futuras sem
atribuir a outra pessoa a autoria do passado. Atualizar a prévia conserva a
última consulta identificada e restaura foco após a resposta.

Editar função mantém a identidade da conta em leitura; outra conta usa vínculo
ou convite explícito. Vínculo revogado usa a ação própria de reativação.

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

GET /api/patient-settings exige careRecipientId e retorna configuração,
diretório e propostas autorizadas. changesOnly=true retorna somente changes,
total, page e pageSize. A consulta aceita status open, pending,
awaiting_acceptance, applied, rejected ou all; open é o padrão e reúne aprovação
pendente e aceite pendente. kind filtra os cinco tipos de governança; query
busca referência/conteúdo no paciente autorizado. page inicia em1 e tem teto
1000000; pageSize usa20 e aceita1–50. NULL explícito é inválido nas RPCs.
Filtros precedem contagem/paginação, com ordem created_at/id determinística.

POST /api/patient-settings recebe careRecipientId, kind, change,
idempotencyKey e expectedVersion; decisões incluem requestId e decision.
Propostas globais pelo alias /api/admin também exigem idempotencyKey e
expectedVersion do cliente, preservados em cada reenvio. A rota não gera
automaticamente outra chave nem busca uma versão nova para reaplicar o comando.
O banco recupera a mesma proposta e conflita quando conteúdo ou versão da
intenção diferem. Revisar a configuração vigente é uma ação explícita anterior
a outra intenção. Aprovação local distinta e aceite pessoal permanecem exigidos.

Resultado de transporte incerto conserva o pacote da tentativa na tarefa atual;
um reenvio recusado não comprova a não execução da primeira tentativa.
JSON200 sem id/status reconhecíveis também não confirma a ação. Uma resposta
válida é distinguida de falha na consulta posterior. A leitura não revela hash
secreto de convite: aprovação recuperada oferece reemissão explícita, invalidando
o link anterior. Não há concessão de vínculo somente por aprovar a proposta.

GET /api/admin?section=audit exige vínculo/contexto do paciente e audit.read,
inclusive na RPC patient_audit_page. Modo global não concede essa leitura.
Retorna data, total, page, pageSize e opções autorizadas actions/entityTypes.
page usa1 e aceita1–100000; pageSize usa20 e aceita1–100. query busca código de
evento, tipo ou nome atual da pessoa; reference corresponde ao evento ou recurso;
action e entityType filtram códigos persistidos. from/to são dias civis de São
Paulo, com limite final exclusivo no dia seguinte. Datas impossíveis e períodos
invertidos são recusados. Filtros antecedem paginação, com created_at/id estáveis.
Os campos anteriores do evento/metadata são preservados; actor_name_current
identifica o nome do cadastro atual e não um snapshot da data do evento.

operational_document_list conserva defaults1/20 e teto100. NULL explícito de
página/tamanho é inválido, inclusive na chamada RPC direta; a API documental
mantém a normalização limitada anterior. Query inválida das duas consultas
administrativas recebe400 seguro; falha de schema interno não é reclassificada
como recusa de input do usuário.

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

## Histórico completo da agenda

GET /api/schedules/events exige careRecipientId e sessão de paciente, com
schedule.read.team ou schedule.read.own. Consulta shift_events com Auth/RLS
originais; a visão pessoal acrescenta professional_id igual ao usuário.
Contexto e alcance são conferidos novamente após a leitura. Não há service
role, grant novo, escrita ou replay. Sem capacidade retorna403; sem Auth401.

Aceita query literal no motivo, action, reference UUID do evento/plantão/série,
from/to em dias de São Paulo, page1–100000 e pageSize1–100, padrão20. Ordem por
created_at/ID decrescentes e total exato. Resposta inclui data,total,page,
pageSize,careRecipientId,readerId,scope e filters. Campos e metadados são
conferidos no servidor e cliente. O snapshot100 do RPC anterior continua
compatível; o histórico ativo usa esta consulta completa.

## Escalas e BAL por plantão

`/api/schedules` consulta intervalos de até 42 dias e recebe comandos de tipo,
série, proposta, decisão, exceção, substituição, cancelamento e encerramento.
Toda escrita usa careRecipientId, idempotencyKey e expectedVersion quando o
registro já existe. Sobreposição retorna SCHEDULE_OVERLAP sem revelar o outro
paciente. Não há escrita direta em agenda ou operação de check-in.

GET conserva o workspace nativo em data e acrescenta careRecipientId e
period(from,until). A diferença entre datas admite até42 dias, inclusive,
como a RPC; datas inválidas, invertidas ou mais extensas recebem400 antes da
consulta nativa. Servidor e consumidor reutilizam o schema completo já usado
na referência da agenda, conferindo coleções, identidades únicas, paciente,
período e horários compatíveis. As ocorrências da série podem ultrapassar o
período da grade, pois continuam necessárias à revisão da programação.

Um plantão que começou antes da grade e ainda alcança seu período aparece
uma vez no primeiro dia, identificado como iniciado no período anterior,
com horários originais preservados. Os demais continuam no dia de início.
A consulta usa useScopedRead: somente a leitura válida do mesmo período pode
ser preservada, com instante e ações suspensas durante falha/atualização.
Outro período não herda linhas anteriores e401/403/404 retiram os dados.
Filtros de pessoa/situação continuam locais sobre a coleção autorizada;
um filtro de equipe oculto por perda de capacidade não restringe a consulta
pessoal restante. O histórico resumido de eventos da RPC ainda tem o limite
nativo100; sua completude permanece no ponto05.10, sem aprovação nesta etapa.

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

decide_deferral recebe somente id do pedido, approve booleano e motivo próprio
de 3 a 1.000 unidades UTF-16. Destino e autoria não são campos editáveis.
decisionContext informa se a mesma proposta ainda pode ser aprovada ou recusada,
com referência do prazo original e situação atual do plantão. Alvo/atribuição
obsoletos bloqueiam aprovação com VERSION_CONFLICT, mas permitem recusar o
pedido pendente. Aprovação válida muda somente o prazo efetivo; recusa não
altera prazos, atribuição ou estoque. Retry com mesma intenção recupera a decisão
confirmada, com bal.read vivo mesmo após perda só de bal.defer.approve.

No regime ativado, payload BAL inclui balanceAssignment com id, version e
referenceRevision capturados na leitura. O servidor revalida identidade,
janela, vínculo e versão do ledger em criação, edição e submissão. Contexto
documental é produzido pelo banco; não é aceito como autoridade do cliente.
Recuperar uma tentativa confirmada reutiliza a chave e não duplica documento
ou ajustes. [Regras e experiência](../ui-ux/BALANCES.md).

`GET /api/balances/recount?documentId=...` consulta a contagem efetiva,
observações originais, atribuição e destinos reais elegíveis, com bal.read
revalidado pelo banco. Para BAL emitido submetido ou conciliado, assign_recount
exige
documentId, targetShiftId, targetShiftVersion, referenceHash e justificativa
própria de 3 a 1.000 unidades UTF-16, mais expectedVersion documental.
Pessoa, autoria e janela são resolvidas no banco. Referência ou alvo obsoletos
retornam VERSION_CONFLICT para comparação e adoção explícita na interface.
Mesma intenção/chave recupera a designação confirmada com leitura viva, mesmo
após perda apenas da capacidade de designar. O resultado congela o ato original;
não comprova uma contagem física nem substitui a consulta da atribuição atual.
balance_workspace inclui recountRecovery com total e até 100 pendências antigas;
o histórico paginado e o detalhe permitem abrir os demais registros.
Legado sem ciclo recebe atribuição formal em plantão real, sem ativar o regime
semanal. A designação conserva o estado e os movimentos da contagem anterior.
Só a confirmação pessoal da nova contagem gera versão e conciliação conforme
reviewPolicy preservada: facultativa aplica a diferença atual; exigida aguarda
os novos pareceres. Retry confirmado com leitura viva recupera o mesmo ato,
inclusive após perda apenas de bal.count. PDF com version seleciona o snapshot
daquela versão; o detalhe oferece links das contagens físicas anteriores.

## História e erros

`POST /api/invitations/preview` recebe o token fora da URL de consulta.
Token inválido, expirado ou revogado não revela dados do paciente. Paciente,
função, emissor, destinatário e validade aparecem somente para a conta
convidada, confirmada e com sessão Auth vigente; a prévia não cria vínculo.
Aceitar/recusar revalida os fatos e não recebe paciente ou papel editáveis.
O envelope da prévia contém `data` e `actorId`, identidade Auth consultada
no servidor, ou `null` no acesso anônimo. `ready` e `accepted` exigem sessão
confirmada e prévia completa; os demais estados não incluem dados do paciente.
`POST /api/invitations/accept` admite `expectedActor` para vincular a intenção
à conta que conferiu a prévia. Se a conta mudou, retorna `VERSION_CONFLICT`
sem executar a decisão. O parâmetro é opcional por compatibilidade; toda
decisão continua autorizada pelo servidor e pela RPC transacional.
A interface confirma aceite ou recusa pela prévia atual do mesmo token,
sem deduzir o vínculo de uma resposta HTTP bem-sucedida. Uma tentativa incerta
conserva token, conta e decisão na aba; a recuperação consulta o resultado e
só reenvia explicitamente a mesma intenção quando o convite ainda está pronto.
Respostas atrasadas não substituem outro convite ou outra conta.
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

## Rascunhos privados de criação e conferência

GET /api/requisitions/selections lista os conjuntos de materiais do usuário
autenticado no paciente selecionado, com Cache-Control no-store. POST recebe
careRecipientId, name de2–80 caracteres, productIds textuais distintos
(1–1000) e idempotencyKey UUID. Não recebe estoque, urgência ou motivo.
Nova lista exige req.create; leitura e recuperação da própria intenção exigem
req.read atual. RPCs revalidam sessão/contexto/capacidade após esperas.
Nomes são únicos por dono/paciente, sem alterar uma lista anterior. A mesma
chave recupera o resultado original; mudar seus fatos é conflito. As tabelas
privadas não têm grants diretos para clientes. Aplicar é edição do formulário;
a emissão continua usando o contrato transacional de requisição existente.

GET /api/drafts recebe careRecipientId, kind REQ/BAL/COM/ENT e targetDocumentId.
REQ/BAL preservam o contrato anterior, com alvo opcional para BAL existente.
COM/ENT usam purpose=create ou revise; ENT também aceita receive/divergence,
com alvo obrigatório nesses contextos. A consulta retorna só o preenchimento próprio
da sessão
autorizada ou o resultado consumido ainda não reconhecido. POST usa action
save/discard/acknowledge, id/expectedRevision nulos na criação e a revisão exata
nas alterações. Conteúdo parcial é tipado por domínio; dono, papel, estado e
campos arbitrários não são aceitos. Save retorna revisão/instante do servidor.
Save aceita navigation opcional: objeto estrito com version=1 e stage de uma
lista fechada compatível com tipo, finalidade e modo do formulário. É metadado
privado separado de content/contentHash, sem autoridade ou efeito oficial.
Omitir navigation em um novo save limpa a etapa anterior. Drafts antigos sem
etapa continuam legíveis e retomam o início; o resumo informa essa ausência.
A consulta esconde navigation e content quando o rascunho foi consumido.
Retry conserva o pacote original, inclusive sua etapa, e não a etapa atual
do navegador. Conferência de ficha, plantão e estoque continua obrigatória.
DRAFT_VERSION_CONFLICT exige comparação; retry recupera a própria tentativa,
inclusive quando outra revisão já foi salva, sem adotar essa revisão sozinho.

draftCommit opcional em POST /api/requisitions e na criação/revisão COM/ENT/BAL
contém id/revision do rascunho. A confirmação e o consumo são uma
transação; disputa com descarte decide uma única vez. Conferência ENT também pode
consumir o contexto privado em POST /api/documents/:id. Um resultado consumido
pode ser reconhecido sem alterar o documento. COM/ENT novos salvam o preenchimento
privado antes da confirmação final, mesmo sem save manual anterior.
Os quatro formulários oferecem retomada explícita, resumo tipado, comparação
CAS e descarte confirmado. Salvamento e descarte incertos recuperam a mesma
chave; recuperação consulta eventual revisão posterior ou ficha consumida.
Uma recusa de acesso durante recuperação desconhecida conserva a chave original;
cache restaurado exige leitura viva antes de exibir conteúdo protegido.
Revisão/submit sem draftCommit usam revise_and_submit_supply_document e as duas
chaves da intenção. Para uma intenção nova, as duas etapas são atômicas.
Uma revisão legada já confirmada recebe tratamento próprio: se submit falhar,
a API consulta supply_revision_receipt com ator/chave/conteúdo/versão originais.
Havendo comprovante autorizado, responde503 REVISION_SAVED_SUBMISSION_PENDING
com confirmedStage contendo kind revision, documentId, idempotencyKey e version.
A mensagem distingue revisão salva de submissão ainda não confirmada; logs
conservam somente operação/código/correlação. Ausência do comprovante não afirma
que nenhuma etapa ocorreu. Conflito de chave continua409 IDEMPOTENCY_CONFLICT.
O replay conserva a versão original ao submeter: uma edição posterior não é
adotada automaticamente. A segunda chave recupera submissão antiga concluída.
Abertura BAL nova consulta GET /api/balances com reference=true: revisão e
quantidades do ledger são retornadas no mesmo snapshot sem criar ficha.
O payload BAL sem atribuição pode informar balanceReferenceRevision; a criação
confere essa referência após o lock de estoque. Caminhos anteriores continuam
aceitos; uma abertura documental antiga pendente conserva sua chave original.
REQ de paciente inativo retorna PATIENT_INACTIVE/409 para chave nova; a chave
própria já emitida segue para recuperação canônica sob leitura viva. Esse
mínimo não implementa persistência geral COM/ENT nem amplia a fase para D3.

## Escalas por datas escolhidas

POST /api/schedules aceita series com recurrence dates, dates únicas dentro de
anchorDate/validUntil e shiftTypeVersion da referência consultada. Essa
modalidade usa weekdays vazio e não recebe workHours/restHours. De1 a367 datas
respeitam a janela de até366 dias após a âncora. Instantes usam o
horário/duração do tipo e o fuso explícito. Mudança do tipo revisado retorna
VERSION_CONFLICT/409; a confirmação não adota outro horário automaticamente.
Once/weekly/cycle mantêm os contratos anteriores.

A criação continua uma transação com verificação de conflitos do profissional
entre pacientes. Nenhuma data ou série parcial persiste quando uma ocorrência
conflita; o erro externo não identifica o outro paciente. Exceção altera só o
plantão indicado. Corte conserva linhas históricas e impede republicação
posterior. Leitura continua limitada a42 dias por consulta; a UI pagina/navega
o calendário sem ampliar esse limite.

## Conferência pessoal ENT

GET/POST /api/documents/:id acrescentam linkedRequisitions e
unavailableRequisitionItems às ENT. Referências vêm dos itens vinculados pelo
banco, filtradas pelo paciente e RLS do leitor; não há consulta administrativa.
Falta de acesso ao vínculo é informada, sem expor dados da REQ protegida.
O comando receive continua aceitando somente divergences: quantidade recebida,
problema e observação por linha. Origem/destino/material/vínculos/ator não são
editáveis nesse ato. A conferência mostra também as linhas integrais.

## Preparação de residência e guias

GET /api/residence-preparations é exclusivo do modo global autorizado. Lista
preparações próprias em páginas de20, com page/query; id consulta a preparação
e seu resumo de metadados. POST aceita save/create/discard com revisão esperada
e chave da mesma intenção. Salvar não cria paciente. Criar exige identidade,
fuso explícito, administração inicial confirmada e responsáveis distintos;
isActive=false é preservado. Não concede vínculo ao criador global. Resumo,
contagens e progresso não aprovam estoque físico nem liberação operacional.

GET /api/guides deriva papel/contexto vigentes no banco. POST progress recebe
expectedScope, revisão, etapa, escolha e chave; troca de contexto rejeita o
comando sem gravar no paciente seguinte. Recuperação conserva a mesma intenção.
POST configure exige administração local do paciente e revisão da configuração.
Progresso próprio e apresentação opcional não alteram SCI ou permissões.
O cliente confere paciente, papel e escopo da resposta antes de exibir tarefas;
os links preservam o paciente consultado. A preparação usa o diretório global
paginado de contas, com trinta pessoas por página e contagem conferida, sem
tratar uma coleção parcial como lista completa. Alterar uma preparação não
reconsulta esse diretório; falha de consulta tem recuperação própria e não
apaga os campos já preenchidos.

GET /api/guides/preparation exige careRecipientId único, UUID válido, sessão
Auth, paciente selecionado e competência local de preparação. A RPC
local_preparation_context revalida vínculo, contexto e capacidades no banco;
uma identidade global sem vínculo não obtém a consulta. A resposta privada
no-store informa somente metadados de pessoas, convites, catálogo, movimentos,
escalas, regime BAL e apresentação do guia. Cada domínio exige a sua leitura;
valor restrito é null, inclusive quando há escrita sem leitura de estoque.
Não retorna quantidades, não concede acesso, não altera fatos ou preferências
e não confirma conferência física. O cliente valida estrutura e paciente;
recusa de acesso elimina a consulta anterior, e falha transitória permite
reconsulta sem comandos.

## Contingência e conciliação

GET /api/contingencies exige careRecipientId e process, com filtros únicos e
sessão/vínculo local vigentes. Processos: REQ, COM, ENT, RETURN, BAL,
CONSUMPTION_FAMILY e CONSUMPTION_TEAM. A competência contingency.read e a
leitura do domínio são revalidadas no banco. view=cases lista páginas de25;
id consulta a declaração e seus atos imutáveis. view=references recebe
query/page e consulta somente referências emitidas do mesmo paciente e
processo, separando entrega e devolução. Respostas são privadas/no-store;
identidade global sem vínculo local não concede acesso.

POST recebe expectedActorId, careRecipientId, process, idempotencyKey e
action. A API compara a conta esperada com Auth antes da RPC. record recebe
content; supplement também exige id e expectedRevision. Datas, fuso, pessoas,
referência, quantidade e custódia desconhecidos são null explícito. Materiais
selecionados levam reviewedUnit/reviewedDecimals; o banco confere e bloqueia
a referência durante a gravação e preserva nome/unidade/precisão próprios.
Zero não vira desconhecido. Autor, papel e instante digitais vêm do servidor,
separados das pessoas e do instante físico declarados. Comunicações manuais
registram estado declarado, sem enviar aviso ou produzir ciência.

needs_clarification/link_existing exigem id, expectedRevision, reason e
targetId (null no esclarecimento). A decisão exige contingency.review e
outra identidade, que não tenha criado ou complementado a declaração.
Vínculo só alcança registro existente do mesmo processo/paciente e congela
referência e evidências prontas; envio em quarentena impede concluir. Não
cria documento, débito/crédito, ciência, recebimento ou assinatura pessoal.
Histórico não é editado ou apagado; concorrência rejeita a revisão obsoleta.

view=recovery e attemptKey consultam o resultado próprio; action=resolve
confere a mesma intenção. Se ainda não há resultado, encerra aquela chave
atomicamente, impedindo um comando tardio; resultado confirmado é recuperado.
Somente a referência oficial, sem conteúdo do formulário, pode ficar em
sessionStorage por conta/paciente. Esta recuperação não cria rascunho comum.

/api/attachments também aceita contingencyId como pai exclusivo, em lugar
de documentId/movementId. Usa a mesma reserva, quarentena, sanitização,
atestação pelo servidor, Storage, recuperação e abandono. Autoridade atual é
conferida no envio e na finalização. Conciliação fecha novos envios e conserva
a recuperação dos arquivos já prontos; exemplares e hashes não são trocados.

## Referências individuais de notificações

GET /api/notifications/target recebe careRecipientId, ref, area e namespace.
Áreas: schedule, balance, stock e consumption. Namespace: reminder, report,
alert ou auto para links antigos. Exige sessão Auth, paciente selecionado e
permissão vigente para o recurso. O identificador nunca concede acesso.
Retorna fatos do evento e referência atual autorizada, sem marcar resposta,
presença, ciência ou movimentação. Plantões usam o dia e fuso do recurso;
um fuso histórico ausente é informado. Alertas distinguem saldo observado e
saldo oficial atual. Lembrete antigo de BAL não inicia contagem retroativa.

POST na mesma rota aceita apenas careRecipientId, ref, action=no_issues e
idempotencyKey. Somente o titular autorizado responde ao próprio lembrete
shift vencido. A revisão pessoal confirma ausência de ocorrências; o banco
registra resposta, aviso visto e auditoria em uma transação, sem SCI, presença
ou estoque. Recuperação repete a chave original. Relato já vinculado impede
uma nova declaração contraditória de ausência.

POST /api/consumption, action=report, pode receber reminderId. A origem precisa
ser lembrete shift do próprio autor no mesmo paciente e custódia CARE_TEAM.
Relato, origem, resposta e auditoria são atômicos. Chave antiga de relato avulso
não é adotada retroativamente. Recuperação de ato confirmado exige leitura
vigente; criar novo ato exige capacidade de registro. O comprovante inclui
id, careRecipientId, reminderId e idempotencyKey. Nenhuma baixa é antecipada.
GET /api/consumption aceita sourceReminder, mantendo paginação por cursor.
O detalhe devolve source_reminder_id e permite retornar ao lembrete original.
Prévia do lembrete limita-se a20 relatos; o histórico filtrado permite os demais.

GET /api/whatsapp/flows/submissions pagina pendências próprias no paciente
autorizado, com total exato, page/pageSize e máximo100 por página. Ordenação é
created_at/id descendentes. Falha de consulta não confirma lista vazia.

## Verificação pública por código e arquivo

GET /api/verification aceita somente code. POST aceita code opcional na query e
corpo application/pdf de100 bytes a4 MiB, sem hash ou recibo enviados pelo cliente.
Não exige conta. Código é normalizado e validado; o servidor calcula SHA dos
bytes e consulta a referência e eventual outra emissão correspondente ao arquivo.
Retorna metadados mínimos, resultados criptográficos separados e estado da
política. QR isolado não equivale a conferência dos bytes. Arquivo não localizado,
legado sem assinatura, perfil não suportado e serviço indisponível são distintos.

Leitura limitada, orçamento compartilhado no banco e worker efêmero protegem
processamento. Anon/authenticated não executam diretamente as RPCs de consulta
mínima ou orçamento. Nenhum upload público é persistido no acervo.
Detalhes, limites e coortes de validação na [verificação D4](../audits/D/D-B/PUBLIC_VERIFICATION.md).

## Acervo privado e compatibilidade de PDFs

GET /api/documents/:id/archive reúne emissões independentes, originais e
representações legadas. Aceita version opcional e cursor completo
before/kind/reference; máximo20 por página. Revalida contexto e leitura, sem
expor caminhos, snapshots ou provas do worker. A página
/documentos/:id/arquivos oferece os mesmos arquivos e geração explícita.

GET /api/documents/:id/pdf com issuance recupera a emissão assinada exata.
Com version e renderer=legacy recupera o original; renderer numérico seleciona
uma representação legada registrada, com padrão4. Ausência retorna
PDF_NOT_GENERATED404; GET nunca gera ou substitui arquivo. SHA divergente
retorna PDF_BYTES_DIVERGE503. Autorização é conferida antes e após Storage;
o stream começa somente depois da verificação integral. Uma nova emissão
histórica usa POST e não recebe o instante do ato antigo como data de emissão.
[Contrato do acervo](../audits/D/D-B/DOCUMENT_ARCHIVE.md).

## Proveniência de novas emissões V6–V9

POST de emissões recebe somente chave idempotente e versão opcional. O servidor
usa reserve_pdf_issuance_v9: o banco escolhe V9 para ENT e V7 para os demais
tipos, congelando fatos documentais suplementares. Antes, V8 era escolhida
para evento ENT com regularizações. O navegador
não define autoria, datas, revisão ou snapshot. Contexto suplementar não altera
o hash do evento canônico. Histórico físico separa data de origem/importação;
rascunho, ficha, emissão operacional e solicitação do exemplar são distintos.
Nomes/IDs históricos são preservados e nome atual recebe rótulo específico.
Intenções V5/V6/V7/V8 existentes continuam recuperáveis pela revisão original.
CONTENT_INVALID pode informar caracteres não suportados, sem assinatura ou
arquivo persistido. [Contrato e provas](../audits/D/D-B/PDF_SOURCE_FACTS.md).

V7 conserva conferências e resoluções com suas autorias. V8 explicita o estado
anterior, resultado do procedimento, identidades e instantes de proposta/decisão/
execução e conciliação/trânsito antes/depois. Proposta sem aprovação não executa
estoque; desconhecido permanece em trânsito e o aceite original é preservado.
Os entrypoints antigos permanecem; a mesma chave recupera o exemplar anterior.
[Contrato V8](../audits/D/D-B/REGULARIZATION_PDF.md).

V9 conserva esses fatos e distingue estado encerrado, aceite pessoal e versão
preservada. Só a representação operacional pendente sem aceite solicita nova
conferência. Acervo ENT mostra aviso para revisões anteriores, sem alterar
o download original. [Contrato V9](../audits/D/D-B/ENT_TERMINAL.md).

## Web Push por aparelho

GET /api/push/devices retorna configuração pública e metadados próprios; não
retorna endpoints/chaves das inscrições. A variante ?context=consent acrescenta
userId e contextReference, obtida da conta/sessão verificadas e do par VAPID.
POST exige consentimento explícito, inscrição estrita, sessão Auth atual e
contextReference correspondente. PATCH também exige essa referência e pausa
por oito horas, retoma ou revoga somente um aparelho próprio. Referência
ausente ou alterada retorna VERSION_CONFLICT antes da RPC, exigindo atualizar
a página e confirmar outra vez. A referência é precondição de concorrência;
Auth e autorização nativos continuam obrigatórios. O GET original não muda
sua forma. POST /api/push/session revoga somente as
inscrições vinculadas à sessão corrente. Todos os comandos conferem origem/CSRF.

GET /api/push/open?id recebe UUID opaco, exige Auth e revalida destinatário,
vínculo e recurso antes de construir um caminho interno. Não marca visto ou
ciência. O worker operacional existente processa a fila derivada do aviso
interno, com três RPCs exclusivas de serviço e revalidação imediatamente antes
do transporte. WEB_PUSH_EXTERNAL_ENABLED permanece desligado por padrão.
Accepted é aceite HTTP do serviço; perda de resposta após preparo fica incerta,
sem reenvio automático. [Contrato, privacidade e limites](../audits/D/D-B/WEB_PUSH.md).

## Progresso dos lembretes legados

O RPC de serviço run_operational_schedule conserva argumentos/grants e os
campos anteriores. schedule no worker acrescenta legacyReminderPatients,
legacyReminderFailures e legacyReminderGaps. Contadores não revelam payloads
ou pessoas e não substituem uma central de incidentes. O helper legado continua
privado. Rotação100, recuperação de sete datas por visita e lacunas por mudança
de configuração estão descritas em [D5.3](../audits/D/D-B/SCHEDULER_LEGACY.md).

## Declaração profissional e conferência familiar

GET /api/admin/credentials recebe careRecipientId/userId e cursor opcional
beforeAt/beforeId. Exige contexto explícito e access.manage no paciente, com
regra local no RPC. Retorna declaração consultada, revisão/hash, estado,
histórico20 e cursor; externalValidation é null. Resposta private/no-store.
POST aceita somente paciente, pessoa, expectedRevision textual bigint,
outcome checked/not_confirmed, note e idempotencyKey. Auth/CSRF, limite8k e
schema estrito; autor/instante não são entradas. Revisão/intenção obsoleta409;
replay conserva registro. Nenhum papel ou validação externa é concedido.
[Contrato e provas](../audits/D/D-B/PROFESSIONAL_CREDENTIALS.md).

## Preparações de programação e plantões BAL

GET/POST /api/balances/preparations consultam e alteram apenas o preenchimento
próprio. Escopo:careRecipientId,purpose,targetResourceId;kind BAL e
targetDocumentId NULL. Save conserva values,referenceHash e versão nativa
ou NULL;discard e acknowledge não registram decisão operacional.

Configure usa o paciente como alvo;assign usa ciclo;request_deferral/defer
usam atribuição;approve_deferral/reject_deferral usam pedido real. GET
/api/balances/preparations/reference devolve referência autorizada tipada e
hash do banco,incluindo o alvo exato fora da página operacional. GET
/api/balances/preparations/list usa cursor before/beforeId pareado,limit
padrão20,máximo50,e não expõe conteúdo de outro titular.

POST /api/balances/preparations/commit sela draftCommit,comando nativo,
referência,versão e chave. Nova decisão exige autoridade atual;consulta,
descarte,reconhecimento e replay já vinculado exigem leitura viva. Uma chave
nativa anterior não pode consumir um preenchimento novo. Resposta200 inválida
não confirma sucesso. Resultado preservado descreve o ato original,não a
situação atual,presença ou contagem física. As rotas mantêm Origin,correlação,
erros seguros e no-store. O caminho nativo /api/balances permanece compatível.

## Preparação privada da movimentação familiar

GET/POST /api/stock/preparations usa careRecipientId,purpose family_movement,
targetResourceId igual ao paciente,kind STOCK e targetDocumentId NULL. Um
slot pessoal ativo conserva operação,material,unidade,saldo consultado,
quantidade,motivo,referência histórica e hash,admitindo campos incompletos.
CAS,journal,descarte e reconhecimento seguem o núcleo de rascunhos,com rota
própria;POST /api/drafts rejeita preparações por recurso.

GET /api/stock/preparations/reference recebe productId e referenceId opcional.
Devolve catálogo,saldo confirmado,origem autorizada e hash calculado no banco.
O fingerprint físico detecta histórico novo mesmo com saldo numericamente igual.
POST /api/stock/preparations/commit vincula draftCommit,referenceHash,comando
completo e chave. O banco valida referências e campos,executa o comando nativo
family_stock_movement e consome o rascunho atomicamente. Chave nativa anterior
não cria vínculo privado retroativo. Nova execução exige escrita atual;
recuperação própria exige escopo vivo de leitura ou gestão e conserva a
intenção original,inclusive com paciente inativo. Nova escrita exige paciente
ativo no banco. Consulta não concede autoridade de confirmação.

As respostas são no-store,com Origin/sessão/correlação e erros seguros. O recibo
pessoal informa o movimento original,sem prometer saldo atual. Resposta200
incompatível não confirma sucesso. O caminho nativo /api/stock/movements
permanece compatível. Não há emissão documental ou replay offline.

Sem leitura do saldo familiar,a referência devolve canReadBalance false e
balance NULL,e oculta detalhes da origem. Contexto,replay e recibo pessoal
retiram valores históricos protegidos. Ter gestão sem leitura continua
permitindo o comando nativo autorizado. A variante de divulgação é revalidada
sem alterar o pacote/chave original. A API não exige paciente ativo para
consultar,descartar,reconhecer ou recuperar resultado pessoal já vinculado.

## Preenchimentos privados de consumo

GET/POST /api/consumption/preparations usa careRecipientId,purpose e
targetResourceId. Tipo CONSUMPTION,alvo paciente nos relatos family/team
e UUID do relato nos propósitos supplement/accept/reject;documentId NULL.
Save aceita edição incompleta,CAS e chave própria;discard/acknowledge não
publicam nem desfazem fatos. A rota genérica de rascunhos recusa esse tipo.

POST /api/consumption/preparations/reference é consulta sem mutação,com até100
identidades fora da URL. Devolve referência/hash autorizados do banco e exige
paciente ativo como a leitura nativa. Referência preservada mantém a grafia
numérica e campos históricos;normalização semântica só vale para o comando.
POST /api/consumption/preparations/commit confirma draftCommit,referenceHash,
comando e chave exatos na transação nativa. Decoders validam inclusive200.
Origin,Auth,contexto explícito,erros seguros e no-store permanecem obrigatórios.

Consulta pessoal,descarte,reconhecimento e replay já vinculado admitem paciente
inativo sob leitura viva;isso não permite nova consulta operacional ou ato.
Envelope local só é removido por confirmação tipada do pacote exato,em leitura
autoritativa ou recuperação manual. Nenhum POST offline/automático. As rotas
nativas de consumo continuam disponíveis e inalteradas.

## Preenchimentos privados da revisão do Flow

GET/POST /api/whatsapp/flows/preparations usa careRecipientId,purpose
flow_review e targetResourceId igual à sugestão real;kind FLOW,documentId NULL.
Save permite campos incompletos,CAS e intenção própria. Descarte privado não
recusa a sugestão;reconhecimento não desfaz o ato confirmado. A rota documental
genérica rejeita este recurso.

POST /reference consulta a sugestão própria e catálogo autorizado,com hash do
banco,sem registrar revisão. POST /commit sela a revisão privada,referência,
comando e chave;chama review_flow_submission e consome o privado atomicamente.
A chave nativa do relato é o UUID da sugestão;a chave privada da confirmação
fica distinta no recibo. GET /list usa before/beforeId pareados,limit padrão20
e intervalo1–50,
retornando somente preparações próprias ativas/resultados não reconhecidos.
Todos os caminhos mantêm Auth,contexto,Origin quando POST e no-store.

Leitura própria e recuperação já vinculada continuam com paciente inativo ou
perda de escrita,sob vínculo vivo. Referência atual e nova revisão exigem
consumption.report/paciente ativo;registro também exige leitura da equipe.
Recusa não concede catálogo a quem perdeu essa leitura.200 inválido não
confirma sucesso;envelope divergente não é apagado. Consulta/online não
reapresentam o POST. A API nativa /submissions permanece compatível.

## Consulta da confirmação da agenda

GET /api/schedules/confirmation exige careRecipientId/idempotencyKey únicos,
Auth e contexto explícito. Responde found=false ou confirmação do próprio
diário nativo,com comando/versão/resultado reduzido. No-store obrigatório.
Sem POST,replay ou mudança do motor. A leitura pessoal admite paciente inativo
e perda de escrita sob vínculo vivo;não concede consulta operacional nem novo
ato. Cliente confere conta,paciente,chave,comando,versão e alvo antes da limpeza.
Ausência não prova rejeição;reenvio da mesma chave é sempre escolha explícita.

## Preenchimento privado de Andamentos

GET /api/documents/progress-preparations exige careRecipientId,purpose e
targetResourceId únicos,Auth,contexto e leitura atual da ficha real. POST no
mesmo caminho salva edição incompleta,descarta ou reconhece o resultado por
revisão/chave. POST /commit sela a revisão privada e chama a publicação nativa
na mesma transação. O recurso publicado é o andamento;seu alvo é a ficha.
Salvar não publica texto nem altera protocolo,versão,estoque ou PDF.

POST /recovery consulta somente a tentativa própria após aguardar sua trava.
Confirma o pacote exato,localiza publicação nativa ou distingue estado incerto
de impossibilidade comprovada por revisão avançada/chave incompatível. Ausência
de diário não comprova falha. A consulta não publica. Nova edição após tentativa
não aplicada exige escolha explícita e preserva o texto separado do resultado
de outra sessão. Recuperação mantém Origin,Auth,escopo e private,no-store.

Leitura,descarte e reconhecimento próprios admitem perda de escrita/paciente
inativo sob vínculo vivo e leitura atual da ficha. Nova publicação conserva a
capacidade ativa nativa. Rótulos de fichas referenciadas são reavaliados conforme
a autorização atual. Texto usa o limite UTF-16 do banco e dos controles HTML.

Na publicação de Andamentos, publication opcional contém relevance
(normal/milestone/attention) e até oito mentions distintas. Essas opções
integram a intenção oficial, o commit e a recuperação; não são campos do
rascunho salvo. `GET /api/documents/[id]/progress/people` pagina pessoas ativas
do mesmo paciente (search/page, vinte por página), exigindo leitura da ficha
e document.progress.create. Nomes e papéis são conferidos e preservados pelo
banco; menção não registra ciência ou autoria.

## Novos tipos e programações com preparação privada

GET /api/schedules/preparations exige somente careRecipientId e purpose únicos,
Auth e contexto vigente. Os propósitos são shift_type_create e
schedule_series_create;ambos sem alvo documental ou recurso preexistente.
POST salva conteúdo incompleto por CAS/chave,descarta ou reconhece o resultado.
POST /commit confere a intenção nativa derivada dos campos salvos e consome
a preparação atomicamente com o novo tipo/série. Versão escolhida do tipo é
conferida nos quatro regimes. Criação respeita active=false.

POST /recovery consulta a tentativa própria sob a trava original. Ausência
continua desconhecida;revisão privada avançada,chave incompatível ou versão
monotônica do tipo avançada podem comprovar não aplicação. Resultado conhecido
tem precedência sobre mudanças posteriores. Consulta não envia programação.
Leitura,descarte e reconhecimento próprios admitem perda de escrita/paciente
inativo sob vínculo vivo;novos atos conservam autorização nativa. Origin e
private,no-store permanecem. Alterações/decisões existentes também admitem
a preparação D3.54 abaixo;
a API nativa continua compatível.

## Custo da leitura de contexto

GET /api/context conserva o contrato completo de my_workspace. A migration196
reduz verificações repetidas por paciente sem limitar o diretório,alterar
campos ou delegar autorização ao cliente. Capacidades usam as mesmas guardas
nativas para candidatos da sessão e da autoridade interna transacional. Não
há cache de autoridade entre requisições;revogação/sessão expirada continuam
recusadas. Nova programação privada mantém revisão após recusa conhecida e
exige voltar ao preenchimento antes de preparar outra confirmação.

## Preparações de alterações e decisões da agenda

/api/schedules/resource-preparations tem GET de contexto próprio e POST de
save/discard/acknowledge. O escopo inclui paciente, finalidade e alvo real.
/reference lê apenas a referência operacional desse alvo e os profissionais
legitimamente disponíveis; /list pagina todos os estados privados próprios,
incluindo resultados reconhecidos e descartes, com cursor de instante/ID.
O cliente não fornece owner nem snapshots de autoridade.

POST /commit recebe draftCommit, comando, versão do alvo, sourceVersion
quando houver origem de proposta, referenceHash e chave idempotente. Devolve
{data:{draft,receipt,replayed}}; o recibo é validado contra o pacote exato.
A aprovação cuja origem ficou obsoleta só pode registrar o resultado nativo
obsolete; não pode aprovar uma alteração diferente da revisão apresentada.

POST /recovery recebe packet e opcional resolutionKey distinta. Consulta sob
a trava da chave original; ausência no diário permanece unknown. O avanço
monotônico de origem não prova não aplicação da aprovação, que ainda poderia
encerrar como obsoleta. A resolução explícita retira a revisão privada de
circulação e conserva os campos. Resultado e chave de resolução são
idempotentes, inclusive se sua resposta se perder. Origin e private,no-store
permanecem em todas essas rotas; a API genérica de documentos não as aceita.

## Recibo de criação/revisão de ficha

POST /api/documents e /api/documents/:id/revise conservam data/persistence e
acrescentam confirmation após o RPC nativo:actorId,idempotencyKey,
targetDocumentId,expectedVersion e submissionKey. Criação usa os três últimos
campos nulos. É recibo da requisição,não assinatura/hash documental nem nova
permissão. Revise compartilha reviseSupplySchema,com mesmos defaults e campos.
ScheduledCount exige esse recibo,persistence confirmado,ficha/paciente/tipo,
identidade da criação e valores/notas antes de limpar sua tentativa.
Clientes anteriores continuam compatíveis;suas provas específicas não foram
substituídas pela validação do consumidor BAL.

## Conferências anteriores no rascunho BAL

O conteúdo privado BAL aceita previousObservations como campo opcional com
até dez cópias de quantidades brutas, notas, materiais, datas e contexto de
origem. Cada cópia pertence ao alvo do rascunho e o conteúdo completo segue
o limite de 200000 bytes. O campo circula na revisão privada e os comandos
operacionais continuam recebendo os campos explícitos da nova contagem.
[Continuidade de observações](../audits/D/D-B/BAL_OBSERVATION_CONTINUITY.md).

## Preenchimentos administrativos privados

GET /api/admin/preparations exige patientId, mode e purpose. targetId
identifica o vínculo existente quando aplicável. selection e option
consultam a referência atual. key consulta exclusivamente um comprovante
próprio no mesmo âmbito. Parâmetros duplicados e campos adicionais são
recusados. A resposta usa private,no-store.

POST nessa rota aceita save, discard e acknowledge com revisão privada,
chave e campos próprios. A confirmação usa POST /api/admin com action e
administrativePreparation, cuja action interna deve ser commit. Os
comandos administrativos anteriores continuam válidos. O banco confirma
a alteração nativa ou a proposta global e o consumo privado atomicamente.

O comprovante contém titular, paciente, contexto, finalidade, alvo,
chave, revisão, estado e identidade do resultado. Uma transição deliberada
do próprio vínculo admite recuperação da tentativa original na mesma
sessão autenticada, mesmo se ela retirou o acesso administrativo. Essa
exceção não autoriza nova alteração nem consulta em outra sessão.

GET /api/admin?section=profiles&profilePage=1&query=nome oferece a seleção
global em páginas de 30 contas, com total e ordenação por nome e ID.
Exige administração global ativa. A consulta sem profilePage preserva
o contrato anterior. [Implementação](../audits/D/D-B/ADMINISTRATIVE_PREPARATIONS.md).

## Consulta técnica de tentativas

GET /api/operations/notifications exige sessão e modo global vigentes.
source aceita notices ou web_push; page é inteiro de 1 a 100000. A página
tem 20 registros. Parâmetros desconhecidos são recusados. A RPC autenticada
operations_notification_attempts revalida a autoridade global no banco.
Anon e service_role não recebem execute dessa consulta.

O envelope identifica environment=shared_database, fonte, página, total e
instante. Cada registro tem referência técnica, canal, estado, criação,
última tentativa informada, contador registrado e indicadores de presença de
referência do provedor e erro. Não contém paciente, pessoa, destino, conteúdo,
endpoint, credencial, lease ou texto livre do provedor.

Web Push acrescenta as tentativas persistidas, com identidade, ordem, início,
conclusão, resultado e presença de erro. A fila legada informa
historyCoverage=last_result_only e não fabrica tentativas anteriores.
Referência ou instante ausente não comprova ausência de envio. O cliente
confere fonte, página, cobertura e formato antes de apresentar o resultado.
Falha de consulta não equivale a lista vazia ou entrega confirmada.

A consulta não altera fila, inscrição, incidente, ciência ou estoque. Não há
POST nessa entrada nem concessão implícita de poderes familiares ao suporte.
As ações autorizadas da fila do paciente e os comandos de incidentes mantêm
suas entradas e confirmações próprias.

## Âmbito das leituras de estoque e contagem

GET /api/stock/balances acrescenta careRecipientId e custody aos campos
existentes. custody aceita vazio, FAMILY, CARE_TEAM ou TRANSIT. A seleção
inválida recebe 400. GET /api/stock/movements acrescenta careRecipientId
e filters com productId, location, from e to, usando null para seleção
ausente. page, pageSize e total conservam seus contratos anteriores.

GET /api/balances acrescenta careRecipientId. reference=true continua
chamando balance_count_reference com sua autorização nativa bal.read.
As revisões de contagem conferem paciente, revisão e quantidades antes de
adotar o resultado. A contagem agendada compara ainda o estado atual da
atribuição e do catálogo. [Consumidores](../audits/D/D-B/STOCK_READ_VALIDATION.md).
