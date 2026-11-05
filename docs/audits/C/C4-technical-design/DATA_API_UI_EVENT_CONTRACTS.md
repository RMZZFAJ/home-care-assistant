# Contratos de alteração por fronteira

O resultado específico de cada causa está na matriz de impacto; esta tabela
define as fronteiras concretas que cada linha consome. Arquivos citados são
AS_IS a confirmar no candidato D. Métodos/ações novas são propostas, não APIs
disponíveis hoje. Nenhum código, teste funcional ou migration foi criado em C.

## Envelope e transação comuns

Comando autenticado leva contexto explícito, intenção estável, conteúdo
normalizado e expectedVersion quando altera fato existente. Identidade
efetiva, paciente do alvo e capacidade vêm do servidor/RPC, nunca de
metadata/nome. Requisição aceita retorna outcome tipado: `committed`,
`recovered`, `rejected`, `conflict` ou `uncertain`, com resourceId/version
seguros e resultado por etapa quando houver múltiplos commits. `recovered` só
corresponde à mesma intenção. HTTP200 genérico sem decisão aplicada não
representa confirmação oposta.

Ordem proposta: autenticar/limitar entrada → resolver alvo/contexto → adquirir
locks em ordem consistente → revalidar autoridade vigente conforme P15 →
recuperar intenção já confirmada → validar versão/estado de nova intenção →
validar valores originais → escrever fatos/eventos/ledger/outbox na mesma
transação pertinente → commit → produzir artefato externo recuperável.
Recuperar não exige elegibilidade de nova operação já encerrada, mas ainda
exige acesso ao resultado. Preservar ordem correta do BAL atual como
referência.

Quantidade de entrada é decimal exato validado antes de coerção, finito e
limitado à unidade. Compatibilidade de number/string não pode aceitar perda
silenciosa; novo cliente prefere string decimal e servidor valida ambos ou
versiona recusa explícita. Boolean decisório exige true/false; NULL é
inválido. Versão inválida ou antiga não é preenchida silenciosamente pelo
servidor.

## Mapa concreto de consumidores

<!-- c-table:start -->

- **Domínio C3:** REQ

  **UI/rota atual:** RequisitionWizard/Detail, /fichas/req

  **API e contrato de dados planejado:** /api/requisitions e science: modo
  observado tipado, leitura/ciência independentes, referência de remanescente

  **RPC/estado/evento a preservar ou ampliar:** create/submission e lifecycle
  vigentes; snapshots com modo; evento autoral; scheduler filtra terminais
  antes de limitar.

- **Domínio C3:** COM

  **UI/rota atual:** SupplyWizard/SupplyDetail

  **API e contrato de dados planejado:** /api/documents/:id: ação de dispensa
  remanescente e resultado por parcela; P14

  **RPC/estado/evento a preservar ou ampliar:** supply command atual;
  purchase_receipts ID ligado ao evento/snapshot; dispensa não escreve ledger.

- **Domínio C3:** ENT

  **UI/rota atual:** DeliveryInbox/SupplyDetail

  **API e contrato de dados planejado:** Comandos novos withdraw/reject
  cancellation, exceção administrativa tipada; identidade do efetivo recebedor

  **RPC/estado/evento a preservar ou ampliar:** create_supply_document/command
  vigentes; cancellation request versionada, trânsito e aceite pessoal;
  consent_cancel SQL corrigido incrementalmente.

- **Domínio C3:** BAL

  **UI/rota atual:** BalanceConsole/SupplyWizard

  **API e contrato de dados planejado:** /api/balances e documents:
  targetVersion e designação de novo reconto

  **RPC/estado/evento a preservar ou ampliar:**
  bal_assignments/cycles/deferrals; revisão por versão/contador real; guard
  legado alinhado ao agendado.

- **Domínio C3:** Escalas

  **UI/rota atual:** ScheduleConsole

  **API e contrato de dados planejado:** /api/schedules: prévia multi-dia e
  leitura longa paginada, decisão com versão/contexto

  **RPC/estado/evento a preservar ou ampliar:** schedule_command; ended_on
  revalidado na aprovação; shift events com before/after e efeito BAL.

- **Domínio C3:** Estoque

  **UI/rota atual:** StockConsole

  **API e contrato de dados planejado:** /api/stock/movements: referência
  obrigatória em compensação e valor original exato

  **RPC/estado/evento a preservar ou ampliar:** record_stock_movement e guard
  de saldo; sem DML direto ou alteração de evento antigo.

- **Domínio C3:** Catálogo

  **UI/rota atual:** Admin/Unit/Presentation/Scanner

  **API e contrato de dados planejado:** admin/catalog/presentations:
  consulta, equivalência snapshot, alias/sucessor para seleção

  **RPC/estado/evento a preservar ou ampliar:**
  care_recipient_products/products preservados; fator finito; unidade usada
  imutável; alteração/inativação sem movimento automático.

- **Domínio C3:** Consumo

  **UI/rota atual:** ConsumptionConsole

  **API e contrato de dados planejado:** /api/consumption: complemento
  versionado, detalhe/página, decisão tipada

  **RPC/estado/evento a preservar ou ampliar:** consumption_reports +
  complemento autoral; confirmação única e contraposição conflitante;
  acceptNULL recusado.

- **Domínio C3:** Identidade/acesso

  **UI/rota atual:** Profile/Admin/Invitation

  **API e contrato de dados planejado:** /api/profile/admin/invitations:
  estado por etapa, prévia mínima e reemissão explícita

  **RPC/estado/evento a preservar ou ampliar:**
  profiles/memberships/authority_sessions; verificação de sessão nos caminhos
  diretos e Storage; autoria anterior não migra.

- **Domínio C3:** Anexos/rascunhos

  **UI/rota atual:** Attachments e todos os forms

  **API e contrato de dados planejado:** /api/attachments:
  consulta/abandono/finalize; /api/drafts proposto para edição durável

  **RPC/estado/evento a preservar ou ampliar:** Reserva/objeto/ready sem
  perda; draft isolado do documento oficial e do ledger.

- **Domínio C3:** Notificações

  **UI/rota atual:** Bell/Notifications/Policy/FlowReviews

  **API e contrato de dados planejado:** sync/readmodels: revisão em produtor
  e dependência de consumidor; subscriptions próprias em endpoint novo

  **RPC/estado/evento a preservar ou ampliar:** Interna/outbox persistentes;
  tentativa por geração; push não chama ciência/receive; Meta continua gated.

- **Domínio C3:** Documentos

  **UI/rota atual:** History/Viewer/DocumentActions

  **API e contrato de dados planejado:** /api/documents/:id/pdf e verificador:
  digest cache, versão/renderer e comparação de exemplar

  **RPC/estado/evento a preservar ou ampliar:** document_events,
  document_pdfs; registro final imutável, snapshots de origem e recibos
  completos.

- **Domínio C3:** Administração

  **UI/rota atual:** Admin/Policy/Dashboard

  **API e contrato de dados planejado:** paginação/keyset/detalhe nas listas
  de 50/100; presenter por kind; erros SQLSTATE corretos

  **RPC/estado/evento a preservar ou ampliar:** access_change_requests e
  audit; idempotência estável, duas identidades e contexto local preservados.

- **Domínio C3:** Continuidade

  **UI/rota atual:** Guias/runbooks e painéis técnicos

  **API e contrato de dados planejado:** Saúde por progresso, atestado de
  schema/config/candidato e incidentes correlacionados

  **RPC/estado/evento a preservar ou ampliar:** scheduler_health/jobs/audit
  existentes; restore em quarentena e reconciliação; nenhum fixture real.

<!-- c-table:end -->

Nomes exatos de RPC devem ser obtidos das últimas definições das migrations e
catálogo, não de funções fluent_pre/legacy retidas como histórico. Um wrapper
de compatibilidade não torna todas as versões antigas executáveis. A matriz de
C1 conserva source_anchors, e as fontes originais acrescentam technical_path,
object e files por ID para esse confronto em D.

## Projeções, listas e invalidação

Readmodel oferece ordem estável (instante+ID), cursor com limites validados,
filtros aplicados no servidor, detalhe por referência e semântica de total
conhecido/hasMore. NULL explícito de limite não remove teto. Deep link busca
alvo diretamente e autoriza antes de expor; não depende de estar nos 100
recentes. Não reunir consultas com escopos diferentes apenas para reduzir
viagens.

Produtor incrementa revisão para a identidade autorizada pertinente, inclusive
profiles.id e proponente global. Broadcast leva só revisão/identidade segura.
Consumidor observa chave paciente+query+revision, reconecta e relê; preserva
rascunho e ignora resposta de chave anterior. Corrigir trigger não basta para
FlowReviews/consumo/fila admin; cada consumidor tem teste de duas sessões.

## Eventos e história futura

Novo evento inclui identidade do fato, ator do ato e do registro, instante do
fato quando conhecido, instante de registro, versão, origem, decisão e
referência de causalidade. Ciência presume modalidade, não leitura. Acesso
efetivo nasce de abertura explícita em foreground com chave de abertura,
excluindo prefetch e GET técnico; registrar entrega/exibição observável com
semântica honesta. Não afirmar atenção humana ou tempo lido.

Snapshot de receipt inclui receiptId, linhas declaradas/validadas/rejeitadas e
origem. História apresenta nomes históricos, não diretório atual silencioso.
Nova projeção/renderização versionada conserva consumidor legado; não
retropreenche nome/data/aceite desconhecidos como fatos. Crescimento de resumo
de eventos é risco a medir; não reescrever 500500 resumos para otimizar a
fotografia atual.

## Código seguro de erro e envio externo

Classificar domínio por código/SQLSTATE, não regex genérica que transforme
42702 em nome de produto ambíguo. Envelope seguro mantém correlação, certeza e
próxima ação; nunca SQL/payload. Timeout antes de iniciar messages difere de
resposta perdida durante messages. Tentativa externa tem geração/referência
própria; callback antigo atualiza tentativa antiga sem encerrar lease nova. Só
conciliar com identidade suficiente; canal desligado não é sucesso de entrega.

## Precedência técnica C7–C10

As matrizes causais foram revisadas semanticamente, com domínios secundários
explícitos. P06/P11/P12/P14 e garantia de comando P15 já foram respondidos;
P02 e SCI-001–SCI-005 estão OWNER_APPROVED. Retenção, fornecedores e
parâmetros mantêm gates específicos, sem bloquear D0 geral ou D1 independente.
P09-B é obrigatório, com identidade própria por emissão; não ativar núcleo só
de hash como substituto. Toda evolução de schema usa migration incremental e
preserva os 84 hashes históricos.
[Adendo vigente](../C7-decision-closure/PRODUCT_DECISIONS_C7_ADDENDUM.md).

## Fechamento definitivo — tarefa, estado e política

P02 OWNER_APPROVED: três modalidades informativas elegíveis, ANY familiar e
SCI-005 invariável. Na expedição oficial, resolver ator da sessão/evento,
nunca created_by/escala/nome/metadata; revalidar autoridade após locks.
Configuração/preferência não suprime SCI-005 para expedidor familiar
habilitado. Se evidência obrigatória não persistir, expedição elegível não
conclui parcialmente. PDF/aviso podem processar depois com resultado honesto.
Expedidor ENT legítimo sem representação familiar não ganha ciência; manter
pendência familiar sem atribuir ato a terceiro.

Persistir REQ/material, ENT/versão de expedição, ator/autoridade, origem,
instante e causa estável. Deduplicar causa, não cada linha. Várias linhas da
mesma REQ em uma ENT têm uma causa por REQ; expedições distintas conservam
provas próprias e express anterior. Separar obrigação pessoal e evidência
causal se a unicidade antiga REQ/pessoa não representar ambas sem perda.

ANY agrega ciência válida de autorizado na origem. Sem habilitado é pendente;
legado desobrigado não é evento pessoal nem Família ciente. Revogação não
apaga evento legítimo e vínculo novo não retroage tácita. Versão técnica,
conteúdo material e emissão PDF são identidades distintas. Projeção material
exclui atendimento/ciência/vínculo posterior/renderer. Snapshot com lifecycle
não é hash exclusivamente material. REQ não recebe editor para justificar
versão; alteração material futura autorizada exige nova
ciência/agregado/aviso, preservando M1.

D evolui schema incrementalmente, preservando 84 migrations/eventos históricos
e sem inventar backfill. app_visible antigo não se torna diálogo;
whatsapp_read futuro é comunicação; all antigo recebe compatibilidade
prospectiva sem exigir todos. SCI-004 continua gate externo sem ativação.
Payload de decisão não recebe campos de leitura como parâmetros editáveis.
Testar caminhos diretos Auth/RPC/RLS, não apenas DOM.
