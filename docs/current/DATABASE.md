# Banco de dados

Contrato AS_IS da base funcional `37cb7f85e96e551d6419871f94dd950712e2565b`.
B3 registra exceções em precisão, NULL/NaN, revisão BAL legado, sessão
direta e revogação em espera. O guard e os contratos corretos devem ser
preservados.

Catálogo: configure_catalogue_unit valida fator finito, positivo, até 1 bilhão
e compatível com a precisão antes da coerção numeric(18,6). Código permanece
texto. Unidade/apresentação incompleta, colisão com outro produto e precisão
incompatível são recusadas atomicamente. Configuração e identidade do produto
adquirem stock→catalogue e revalidam catalog.manage após esperas e escritas.
A configuração registra auditoria com o ator real. Grants/RLS continuam estreitos.
presentation_finite_factor protege escritas novas; é validada integralmente
somente se não houver fator legado inválido. Valores legados não são corrigidos
ou apagados automaticamente; exigem revisão explícita antes de novo uso.

Apresentações possuem versão e autoria de atualização. product_presentation_versions
preserva definições observadas; capturedExisting identifica a captura legada,
sem inventar a autoria/data de uma edição anterior. product_presentation_commands
conserva intenção e resultado por ator/chave. Auth lê versões no próprio paciente
e somente seus comandos; nenhuma dessas tabelas oferece DML direto a clientes.
catalogue_presentation_command usa referência de versão, recuperação própria
com leitura viva e revalida autoridade após espera e efeitos tardios. Conflitos
aplicativos usam PT409, separados de falha transacional de serialização.

Linhas COM/ENT guardam presentation_conversions em coluna preenchida pelo
banco, com código, nome, versão, embalagens, fator, unidade e total calculado.
O valor é confrontado com quantity antes da escrita, incorporado ao snapshot
e preservado após mudança do cadastro. Linhas anteriores conservam ausência
de proveniência validada; não se infere fator a partir de metadata antiga.
Unidade usada em apresentação também fica protegida antes do primeiro ledger.
Estado e limites: [PROJECT_STATUS](PROJECT_STATUS.md). Planejamento futuro
em [C](../audits/C/README.md); decisões aprovadas não equivalem a
implementação.

## Preservação e migrations

Migrations aplicadas são imutáveis. O guard verifica os hashes normalizados
das 84 migrations do baseline entre Windows e Linux; toda evolução usa novos
arquivos. A quantidade vigente é derivada de
scripts/historical-migrations.json.
Instalação limpa e evolução legada são testadas na stack local, preservando
protocolos, snapshots, FKs e estoques cuja origem não pode ser atribuída.

O remoto nunca recebe reset, fixtures ou suíte mutável. Atualizações remotas
exigem autorização, identidade e destino conferidos, reconciliação,
pré-validação e backup externo verificável. Resultados e contagens atuais
ficam no [estado por SHA](PROJECT_STATUS.md), separados destas regras
permanentes.

## Catálogo e medidas

products conserva identidades históricas. care_recipient_products é o catálogo
canônico por paciente: nome, aliases, categoria, unidade, precisão e estado.
Novos pacientes começam vazios e adotam modelos explicitamente. Alterações
locais não reinterpretam outros pacientes ou saldos antigos.

measurement_units permite unidades globais ou locais. product_presentations
associa GTIN/EAN/UPC à quantidade na unidade base. Unidades com história são
protegidas contra reinterpretação; material antigo é inativado.

## Documentos e auditoria

operational_documents unifica somente REQ, COM, ENT e BAL. Cada documento tem
UUID técnico, número sequencial independente por paciente/tipo, código
legível,
protocolo, versão e hash canônico. Rascunhos não consomem sequência de
emissão.

document_lines guarda quantidades numeric(18,6), snapshots e estados de
conferência. REQ conserva requisitions e requisition_items, sem quantidade
solicitada. document_request_links associa explicitamente linhas de COM/ENT
às linhas REQ; somente ENT aceita efetivamente atende a requisição.

requisition_item_resolutions identifica item extra no catálogo sem alterar
a linha original. A decisão e seu motivo integram uma nova versão auditável.

requisition_items distingue stock_observation (observed, unknown, unfilled ou
legacy_unclassified) de current_stock. Unknown/unfilled exigem NULL; observed
exige quantidade válida na precisão da unidade. Zero legado não é reclassificado.
stock_observation_at e stock_observation_time_source distinguem declaração do
rascunho pelo dispositivo, recebimento na emissão e instante legado desconhecido.
Nenhuma data histórica é preenchida por inferência. A intenção canônica compara
instantes normalizados; recuperação legada preserva JSON/hash originais.

document_events contém snapshots confirmados, atores, vínculos, anexos,
aprovações, hash anterior e SHA-256. Eventos são imutáveis para clientes.
Hash não é assinatura assimétrica nem garantia contra administradores do
banco.
Protocolos e fatos históricos anteriores permanecem preservados.

purchase_receipts separa recebimento informado e validação da entrada
familiar. submission_key liga cada nova chegada ao evento/intenção; nomes de
quem informou/decidiu são snapshots novos, sem preencher o passado por consulta
ao diretório atual. Eventos COM novos preservam a parcela causal e a lista
das declarações/decisões pertinentes; JSON/hash anteriores não são regravados.

document_lines.waived_quantity guarda expectativa não adquirida dispensada,
separada de approved/purchased/accepted_quantity. workflow_data conserva
purchaseExpectationClosure com motivo, ator, instante e resumo da versão
revisada. A RPC usa lock de estoque/documento, versão, capacidade própria e
intenção idempotente. A restrição impede adquirir quantidade já dispensada.
O cálculo não dispensa físico nem altera saldo; pendência de parcela sobrevive
ao encerramento da expectativa. Progresso por linha distingue aquisição,
validação pendente, chegada ainda não válida, dispensa e restante a adquirir.

com.close_expectation é capacidade crítica com padrão admin, delegável
explicitamente no paciente. Aprovação e crédito imediatos também verificam
as capacidades efetivas; deny de com.approve/com.validate não é contornado
pelo papel admin. Draft não constitui aprovação oficial, e sua submissão
recalcula autoridade/quantidades aprovadas. Crédito exige sessão/contexto/
capacidade vigentes e conserva autoria da decisão. Clientes não editam as
quantidades declaradas ao validar/rejeitar uma parcela.

bal_approvals identifica grupo, ator e versão de contagem. Reconto conserva
aprovações antigas e captura nova referência; elas não aprovam o novo balanço.

## Escalas e obrigações semanais

shift_types, shift_series e scheduled_shifts preservam a programação real em
intervalos UTC; exclusão GiST impede sobreposição do mesmo profissional entre
pacientes. shift_change_requests e shift_events conservam propostas e
decisões.
Séries limitadas a 366 dias são materializadas e validadas integralmente.

bal_regimes habilita processamento por paciente, sem ativação automática pela
migration. bal_obligations preserva cada semana, prazo original, prazo
efetivo,
atraso e regularização real. bal_cycles acumula obrigações sem simular
contagens
anteriores. bal_assignments vincula profissional, janela e versão de plantão;
bal_deferrals conserva proposta e decisão familiar. bal_cycle_events registra
a cronologia. Comandos idempotentes privados e locks transacionais evitam
atribuições/contagens concorrentes. O worker operacional existente processa
apenas regimes habilitados, com limites e deduplicação.

A recuperação idempotente de criar, revisar e enviar BAL adquire o lock do
estoque antes de consultar o resultado anterior e antes de exigir
elegibilidade
para uma nova contagem. A autoridade é revalidada após a espera pelo lock.
private.bal_scheduler_progress mantém o cursor de lotes de até 100 pacientes,
com rotação ao fim dos UUIDs. Cursor e processamento confirmam juntos;
uma falha desfaz ambos. A tabela possui RLS e nenhum acesso direto para anon,
authenticated ou service_role, inclusive leitura.

Essas tabelas possuem RLS e leitura por capacidade; cliente e service_role não
possuem DML direto. Comandos públicos autorizados são a única entrada do
usuário.
Helpers, funções anteriores renomeadas e tabelas de controle ficam revogados.
Contagem captura a revisão do ledger; uma alteração posterior exige nova
conferência, preservando autor original e a identidade de quem contou.

## Estoque e transações

stock_movements é o ledger oficial. FAMILY, CARE_TEAM e TRANSIT representam
custódias separadas. Expedição ENT debita a origem e credita trânsito; aceite
credita imediatamente o destino. Conciliações retiram do trânsito apenas
quantidades formalmente resolvidas. Não há edição direta de saldo.

Operações familiares avulsas e compensações exigem motivo, ator e
idempotência.
Nenhuma operação pública pode produzir saldo negativo ou apagar a história.
Locks transacionais serializam movimentos concorrentes e aceites repetidos.

current_stock_balances usa security_invoker e capacidades por custódia.
stock_history mascara antes/depois familiares para leitores da equipe.
stock_overview separa confirmado, previsão, mínimo e divergência.
stock_transit lista ENT abertas sem revelar o saldo geral familiar.
Métricas de consumo usam débitos confirmados, nunca observação da REQ.

BAL trata exclusivamente estoque da equipe. A referência usa revisão do
ledger; mudança desde a contagem impede aprovação até reconto. Política
opcional aplica diretamente; política obrigatória exige os grupos e as
identidades distintas configuradas no paciente.

BAL resolve o contador efetivo pelo último evento oficial de emissão,
submissão ou reconto, inclusive no legado. balance_reviews conserva parecer,
revisor/nome, grupo, evento e versão da contagem, observações/linhas revisadas
e referência de estoque. É imutável, possui RLS por bal.read e oferece somente
SELECT ao cliente autenticado. Aprovações legadas permanecem preservadas;
nomes consultados no cadastro atual não são tratados como snapshots antigos.

O próprio contador não revisa seu ato. Reconto altera a elegibilidade por
count_version, sem apagar pareceres anteriores. Comando usa locks stock→document,
recupera a própria chave com leitura viva e revalida autoridade após esperas
e efeitos tardios. Comentário tem até 2.000 unidades UTF-16, igual ao formulário
e à API. A conciliação recusa referência NULL por comparação IS DISTINCT FROM
e registra appliedRevision/appliedBy. Parecer facultativo posterior, inclusive
sobre referência histórica, nunca reaplica estoque nem valida o saldo atual.

decide_deferral trata aprovação e recusa separadamente. Aprovar exige a
atribuição vigente e exatamente a versão/destino congelados do plantão ainda
elegível. Recusar pode encerrar pedido pendente cujo alvo ou atribuição foi
superado, sem editar atribuições, prazos ou ledger. approve NULL não é decisão.
bal_deferrals.decision_snapshot preserva ator/nome, motivo próprio, proposta,
referências observadas e efeito. O comando usa lock bal→pedido→atribuição,
recupera a própria intenção com leitura viva e revalida decisor e destinatário
da atribuição após esperas. RLS/grants anteriores permanecem; helpers privados
não recebem EXECUTE de clientes. balance_workspace fornece decisionContext,
distinguindo destino proposto e situação atual, sem substituir a proposta.

Em ciclo contado com reconto pendente, substituição elegível no mesmo plantão
transfere somente a responsabilidade do reconto, preservando a janela e a
contagem anterior. Atribuição invalidada ou vencida sem substituto deixa uma
pendência de nova designação. bal_recount_context e bal_recount_recovery
projetam essa situação sem escrever ou escolher profissional automaticamente.
assign_balance_recount usa locks stock→bal→documento/ciclo→plantão, versões
documental/do destino, referência vinculada ao ator e recuperação da própria
chave antes de exigir nova autorização de escrita. Revalida decisor e contador
após efeitos tardios; helpers privados não são executáveis por clientes.
Somente o profissional designado registra a nova contagem. created_by, eventos,
pareceres e datas de satisfação das obrigações anteriores permanecem íntegros.
O evento recount_recorded distingue o novo ato físico de outra regularização
das semanas antigas. Conciliação já aplicada permanece íntegra durante a nova
designação. Ao confirmar reconto, a versão usa o ledger atual e a reviewPolicy
preservada; facultativa aplica somente a nova diferença e exigida aguarda novos
pareceres. Metadados do efeito anterior continuam no evento imutável, enquanto
a versão nova registra seu próprio efeito. Contagem revalida bal.read/bal.count,
vínculo e fim da janela depois dos efeitos tardios.

bal_cycles.origin distingue scheduled de legacy_recount. Um legado pode ganhar
ciclo técnico de reconto sem regime ou obrigação semanal. counted_at anterior
usa somente o instante oficial conhecido, permitindo desconhecimento no ciclo
legado em vez de fabricar data histórica. A confirmação nova tem autoria/janela
reais e weeks vazio. process_bal_recounts trata sucessão e indisponibilidade
mesmo com regime desligado/inexistente; o worker nativo inclui esses pacientes
na mesma rotação de até 100, sem criar um segundo agendador. Helpers privados
permanecem sem EXECUTE dos clientes. Não se altera snapshot ou movimento antigo.
Na recuperação, identidades BAL elegíveis do próprio paciente são materializadas
antes de chamar a projeção que rejeita outros tipos. Isso preserva a fronteira
da função independentemente da ordem dos joins; a rota de BAL continua recusando
REQ diretamente. Fonte incompatível não é convertida em contagem.

## Identidade, capacidades e integrações

Supabase Auth é a autoridade de identidade. profiles guarda dados pessoais e
escopo global; care_recipient_memberships define função e estado locais.
capability_definitions e capability_overrides determinam capacidades efetivas.
access_change_requests versiona propostas críticas e segunda aprovação.

private.authority_sessions associa contexto explícito à sessão Auth vigente.
Autoridade global não substitui vínculo operacional. O administrador local
aplica mudanças imediatamente; propostas globais conservam versão e exigem
aprovação de outra identidade local. Locks e guards preservam o último
administrador ativo sob revogações concorrentes. O selo privado transacional
autoriza somente o vínculo inicial explícito ou aceite de convite válido.

requisition_lifecycle conserva política, prazo, conclusão, exceção de ciência
pendente e arquivamento. requisition_science_events registra ator, modalidade,
material, autoridade e evidência imutável. A unicidade causal permite preservar
ato expresso e expedições distintas da mesma pessoa; retry não duplica o fato.
SCI-005 usa o ator do evento oficial de expedição, não o criador do rascunho,
e integra a mesma transação física. Desativação por flags legadas é recusada.
ANY é distinto de dispensa da obrigação e de ciência pessoal; ausência de
representante habilitado não equivale a Família ciente.

requisitions.material_identity sela o conteúdo original com SHA-256. Origem e
instante distinguem emissão atual, importação histórica e projeção legada de
dados preservados; não se inventa instante físico antigo. Header, intenção,
linhas e observações emitidos são protegidos; resolução de extra acrescenta
vínculo separado. Atendimento/eventos alteram versão técnica, preservando
material e ciência. Hashes e PDFs anteriores permanecem intactos.

source_requisition_id, source_requisition_version e remaining_need_reason
identificam uma nova REQ remanescente. FK composta garante o mesmo paciente;
campos são nulos no legado e entram na proteção material existente. A intenção
e o primeiro snapshot capturam a referência antes da emissão, sem inserir
quantidade solicitada. submit_remaining_requisition usa o mesmo núcleo privado
da RPC anterior, cuja assinatura foi preservada. Chave própria e paciente são
serializados; a origem é bloqueada e sua versão revalidada. Um evento causal
req.remaining_need_declared avança somente a versão técnica da origem, com
chave própria gerada pelo banco; uma segunda confirmação concorrente da mesma
referência recebe conflito. Não reabre estado terminal, repete ciência, muda
material original ou gera movimento físico. Retry confirmado retorna antes de
criar outro documento/evento e continua exigindo leitura da sessão viva.

requisition_science_preferences conserva escolhas próprias append-only por
tipo/versão/chave, consentimento e texto versionado. RLS exige proprietário e
Auth vigente; clientes não escrevem diretamente. A RPC bloqueia o perfil,
revalida sessão após espera e recusa versão obsoleta/conteúdo conflitante.
Sem escolha, manual é a projeção padrão. Tácita exige opt-in/elegibilidade
anteriores à emissão e conserva autoria de sistema; novas permissões ou
escolhas não criam ciência retroativa. Flags antigas não viram consentimento.

Compatibilidade ALL passa a ANY por evento técnico do sistema; eventos pessoais
e snapshots anteriores permanecem intactos. Importações não inventam ciência
ou data e novos vínculos operacionais a REQ histórica são recusados.

requisition_openings conserva exibições informadas pelo aplicativo em tabela
append-only separada. Identidade/nome/horário de registro são do servidor;
material, versão de referência e chave da abertura permitem recuperar uma
resposta perdida sem duplicação. RPC revalida Auth/contexto/req.read após
lock por pessoa/chave; RLS usa a mesma autoridade de leitura e clientes não
escrevem diretamente. Não há backfill de GET, ciência ou download. O índice
documento/instante/ID sustenta paginação estável. Registrar/consultar abertura
não altera versão, ciência, snapshot, ledger ou avisos e não comprova atenção.

my_workspace retorna pacientes e capacidades em uma chamada autorizada.
Browser metadata, IDs e seleção local não concedem acesso. RLS, grants
explícitos/defaults, schema private e SECURITY DEFINER são revisados juntos.

attachments e document_pdfs guardam referências, hashes e versões de objetos
privados no Storage. Upload sanitizado tem reserva idempotente e confirmação
de servidor. PDF é armazenado por versão imutável.

document_pdfs distingue hash do conteúdo canônico, hash dos bytes e revisão do
renderizador. O verificador público retorna somente integridade mínima, sem
nome, material, observação ou outro dado do paciente.

Outbox individual controla lease, tentativas e estados externos.
seen_at é independente de leitura do provedor. verified_phones deriva de
telefone confirmado no Auth. whatsapp_challenges associa identidade, telefone,
versão, prazo e uso único. flow_submissions e consumption_reports preservam
sugestões pendentes até revisão e confirmação autorizada.

consumption_reports conserva texto/linhas/autor/instante originais. Novos fatos
capturam reported_name e submitted_intent; campos históricos não são preenchidos
com nomes atuais. version aponta para a estrutura vigente. Complementos ficam
em consumption_report_revisions; decisões em consumption_report_decisions, com
versão exata, motivo quando rejeitada e snapshot. Ambos são append-only, com
SELECT por RLS do relato pai e sem escrita direta por clientes. Original tem
trigger de preservação. Mudança de versão/estado invalida o workspace existente.

RPCs usam lock por paciente e linha, revalidam sessão/contexto/capacidade após
espera e ao finalizar. Decisão autoriza por custódia, exige booleano não NULL
e credita nenhuma unidade: somente consumo confirmado debita pelo ledger
existente. Falta, complemento e rejeição não movimentam. Um relato tem uma
decisão final; replay igual recupera e oposição conflita. Estrutura sem material/
quantidade pede complemento. Inativo com saldo continua elegível na custódia;
unidade e precisão são verificadas antes de confirmar. Correção posterior não
edita relato/decisão/ledger originais e depende de compensação referenciada.

Recuperação de consumo pela chave original do mesmo ator verifica leitura viva
antes/depois do lock e compara a intenção imutável antes de exigir nova escrita.
Somente o percurso que criará fato exige consumption.report, gestão familiar ou
consumption.confirm conforme a custódia; verificações finais continuam presentes.
Complemento já conferido pode retornar o estado vigente sem reabrir o relato,
repetir movimento ou alterar autoria. Grants, RLS e assinaturas das RPCs permanecem.

delivery_consumption_allocations referencia, por linha/pedido de ENT, parcelas
de movimentos de consumo já confirmados. É append-only, com RLS de ent.read
no documento pai e SELECT autenticado; clientes não escrevem diretamente.
Funções privadas não têm execução pública. O contexto limita fontes por
paciente/produto/custódia e aceite efetivo; alocações impedem reutilização.
Eventos legados sem IDs de fonte conservam o corpo original e reservam suas
quantidades virtualmente dentro da janela histórica comprovada. Ausência de
prova bloqueia automatismo, sem backfill de nomes, identidades ou movimentos.

Pedido de cancelamento e decisões guardam atores/instantes/motivos próprios.
Comparações de identidade são NULL-safe. Consentimento exige referência/versão
vigentes, precisão e conciliação completa; somente a devolução real acrescenta
movimento. Recusa e retirada não movem estoque. Locks e verificações finais
de sessão/capacidade cobrem espera de paciente e FK tardia do movimento.
Snapshots incluem a conciliação antes do hash canônico; histórico, aceite e
débitos anteriores permanecem imutáveis. Transferência bilateral continua
incremento distinto.

delivery_regularizations preserva proposta/base/antes da ficha, proponente,
conferente independente e responsabilidade futura. Uma proposta pendente por
ENT; transição final guarda decisão própria e não permite reescrever o original.
delivery_regularization_findings é append-only e amarra procedimento, documento
e paciente por FK composta. Ambas possuem RLS ent.read, SELECT autenticado e
sem DML de clientes. Helpers privados têm search_path vazio e execução revogada.

Aprovação administrativa usa movimentos referenciados pelo procedimento e
performer real; soma apenas fatos conhecidos em reconciled_quantity. Desconhecido
fica em trânsito. Autoria/quantidades/instantes do aceite pessoal não mudam.
Locks por paciente/documento serializam decisões; sessão e autoridades reais,
elegibilidade do recebedor, unidade e responsável futuro são revalidados ao final.
Recuperação confirmada antecede a exigência de nova escrita, mantendo leitura
viva obrigatória. Caso obsoleto pode ser encerrado por autoridade familiar com
seu próprio motivo; nenhum suporte toma o lugar de recebedor ou família.

delivery_task_list conta/filtra tarefas autorizadas antes da paginação, incluindo
pedidos de cancelamento e tarefas administrativas designadas. stock_history
expõe reference_document_id de regularização somente com ent.read do paciente,
permitindo chegar ao dossiê sem abrir acesso ao conteúdo por uma referência.

membership_impact é uma RPC somente leitura para administração local ativa,
com alvo limitado a membership do mesmo paciente. Grupos usam ent.read, bal.read
e schedule.read.team efetivos, sem contornar leituras explicitamente negadas.
Contagens completas e recortes limitados vêm do mesmo read model; sem permissão
o total é desconhecido. BAL considera a responsabilidade mais recente do ciclo
aberto; proposta de adiamento não é tratada como transferência já aprovada.
Não executa scheduler, comando, auditoria ou alteração de estoque/membership.
Execução exclusiva a authenticated, com autorização no corpo e search_path vazio.

P06 deriva sugestão das scheduled_shifts publicadas vigentes e pessoas
vinculadas/ativas com ent.receive efetivo no destino. Múltiplas pessoas não
produzem sugestão arbitrária; flags não transformam papel incompatível em
recebedor elegível. A referência é calculada no banco, sem instante/nome ou
snapshot autoritativos enviados pelo cliente. Cada indicação captura a escolha
e o autor atuais no workflow antes do evento/hash, com histórico de preparações
e expedição distintos. Revalidação final recusa perda de elegibilidade após
espera no movimento. Dados/eventos antigos não recebem preenchimento retroativo.

Nova emissão COM valida origin purchase/donation no create e no submit. O
helper privado valida somente o corpo, sem acesso ou execução por clientes.
Origem ausente/inválida recusa transacionalmente emissão/protocolo/evento;
rascunho desconhecido permanece válido para preparação e exige escolha antes
de emitir. Não há UPDATE de origem em documento/evento histórico nem crédito
de estoque por definir a origem ou emitir a aquisição.

workspace_revisions e broadcasts privados invalidam leituras autorizadas, sem
enviar snapshots clínicos. Perfis usam profiles.id para alcançar a própria
pessoa, consumidores relacionados e administração global autorizada. Proponente
global sem vínculo recebe sua própria invalidação. Cada transação incrementa
uma vez a revisão por usuário afetado e emite a revisão final em trigger
deferred; rollback não envia broadcast nem deixa fila. Uma atualização sem
mudança não produz invalidação. O polling de revisão continua como recuperação
de mensagens perdidas, sem substituir a autorização das consultas.
pg_cron agenda ciclo documental e worker;
credencial
e URL do worker ficam no Vault, configuradas pela RPC de serviço dedicada.

## Transferência bilateral entre custódias

ent_transfers complementa a ENT com declarante, contraparte, recebedor original,
origem documental opcional e estados pending/agreed/declined/withdrawn/dispatched.
Declaração, decisão pessoal, encerramento e instante de expedição são preservados
por trigger; clientes não escrevem ou removem registros. SELECT exige ent.read e
documento ENT do mesmo paciente. private.transfer_commands guarda intenção e
resultado por ator/chave, sem acesso direto de clientes.

transfer_preparation só revela saldo da custódia autorizada. O hash inclui
pessoas, materiais, saldo disponível e origens documentais. Declaração revalida
essa referência depois das esperas, congela linhas e nomes e não reserva ou
move material. Não há quantidades predefinidas nem saldo oficial editável.

transfer_command serializa estoque, documento e transferência, exige versão
exata e revalida autoridade ao finalizar. Concordância/recusa não atribuem aceite
nem geram movimento. Dispatch reutiliza a cadeia ENT preservada, com Auth do
declarante efetivo: protocolo e movimento origem → trânsito ocorrem apenas nesse
ato. A contraparte continua distinta do recebedor, mesmo quando uma pessoa ocupa
os dois papéis. Só o aceite pessoal positivo credita o destino.

Material inativo com saldo positivo pode seguir destinação física, sem reativar
o catálogo ou zerar o saldo por inferência. Cancelamento posterior preserva a
conciliação ENT com consumo confirmado e retorno real. Encerramento de proposta
não expedida, inclusive por administrador, registra sua autoria e não substitui
concordância ou recebimento de pessoa indisponível.

Snapshots incluem somente fatos da transferência; flags de ação do leitor não
entram no hash canônico. Nenhum papel/capacidade recebe novo grant padrão. O motor
anterior fica sem execução direta por clientes, e as tarefas pessoais são
selecionadas antes do limite da lista. A interface ENT anterior continua
disponível enquanto a equivalência integral e as intenções antigas não forem
reconciliadas para sua substituição.

## Identidades e sucessores do catálogo

Migration 20261106161707 acrescenta catalogue_successors e histórico imutável
catalogue_identity_events. FKs compostas mantêm origem/sucessor no catálogo do
mesmo paciente; não há merge de products, linhas ou movimentos. A RPC recusa
autorreferência, ciclos e sucessor inativo. Histórico conserva nomes/unidades,
situação, motivo e autoria do ato; não persiste os saldos privados consultados
por outro ator. Orientação tem SELECT por vínculo; eventos exigem catalog.manage.
Clientes e service_role não têm DML nas tabelas; comandos próprios ficam em
private.catalogue_identity_commands, sem acesso direto.

catalogue_identity_context projeta só saldos autorizados, com NULL nas custódias
restritas. Hash da referência inclui definições e saldos visíveis. O comando
serializa estoque/catálogo/chave, compara depois dos locks e revalida autoridade
ao finalizar, inclusive depois de espera de FK/perfil. Recuperação da própria
chave exige leitura viva, preserva o resultado e não repete evento. Alterar ou
remover orientação invalida consultas pelos mecanismos existentes; não
introduz notificação externa. Inativação e reativação não geram movimento.

family_stock_movement recusa nova entrada/retirada comum em material inativo.
A recuperação da chave confirmada e a compensação histórica com referência
continuam disponíveis; transferência física segue o processo ENT separado.
A fronteira final também revalida a autoridade após esperas de triggers/FKs.
As 84 migrations históricas permanecem intactas;117 compõem este incremento.

## Verificação

D-A corrigiu o lote REQ na migration 20261105070428: terminais/históricos
ficam fora da seleção antes dos limites, pacientes elegíveis recebem rotação
e candidatos inválidos são isolados transacionalmente. Diagnóstico privado
preserva documento, paciente, SQLSTATE, tentativas e estado de recuperação;
scheduler_health informa quantidades de falhas e pendências sem payload.
Cursor e efeitos confirmam/revertem juntos. As permissões da RPC externa
continuam exclusivas do serviço; clientes não leem/escrevem cursor ou
diagnósticos diretamente. Evidências e limites no
[checkpoint D-A](../audits/D/D-A/CHECKPOINT.md).

[TESTING.md](TESTING.md) descreve replay, SQL/RLS, integração HTTP
concorrente,
Auth real e E2E. Backups permanecem fora do Git. A matriz registra evidências
da revisão atual; resultados anteriores não substituem gates da evolução.

## Preenchimento privado mínimo de REQ/BAL

private.creation_drafts guarda conteúdo parcial v1 próprio, paciente, tipo,
alvo BAL quando existente, revisão e instante do servidor. Um slot ativo ou
consumido não reconhecido existe por titular/paciente/tipo/alvo. Save e descarte
não chamam emissão, protocolo, ledger, ciência ou remoção de arquivo. Descarte
explícito limpa apenas conteúdo ativo elegível; objetos oficiais e ready não
participam desse comando. Sem TTL ou cron de limpeza inventados.

private.creation_draft_commands conserva hash da intenção e resultado técnico
por chave própria; saves não copiam todo o preenchimento em histórico a cada
tecla. Mutex da chave e do slot, CAS e lock da linha protegem save/descarte e
confirmação. commit_creation_draft compõe os motores nativos REQ/BAL e registra
o ID real consumido na mesma transação. Rascunho documental BAL legado pode
ser alvo explícito: sua história é preservada; no controle nativo, ainda não
possuía protocolo antes da conclusão. A base nova também conserva campos
incompletos que não podem ser enviados como contagem oficial. A UI usa esse
objeto para salvar e retomar REQ/BAL. Na criação BAL, avançar a identificação
não gera mais draft documental. balance_count_reference retorna revisão e
quantidades da equipe no mesmo snapshot autorizado; balanceReferenceRevision
é revalidada após o mutex de estoque ao criar BAL sem regime. O conflito
explícito PT409 preserva a contagem e exige nova conferência. Aberturas antigas
já iniciadas e alvos documentais legados conservam seu caminho e história.

A dependência D1 private.auth_session usa clock_timestamp e volatilidade real
para prazos not_after. now congelava o início da transação e permitia comando
cuja sessão expirou enquanto aguardava o lock. A mudança conserva os mesmos
joins/ACL e exige prazo vivo nas revalidações posteriores.

## Datas avulsas de uma programação

Migration121 acrescenta shift_series.specific_dates com datas civis tipadas.
Constraint distingue recurrence dates dos três modos anteriores, limita a
cardinalidade/período e recusa null. RPC confere unicidade, datas reais, modo,
campos incompatíveis e versão do tipo sob lock compartilhado. O loop
materializa somente os dias escolhidos e mantém os mesmos controles de
autoridade após o mutex do profissional, idempotência, RLS/grants, exceções e
corte. Séries antigas recebem array vazio; resultados históricos em cache
conservam sua forma original.

Reconto em janela distinta foi comprovado sem nova mudança de schema:
Juliana18 permanece contadora1 e Sheila17 torna-se contadora2. A referência
física20 só sofre ajuste3 após as duas revisões novas exigidas pela política
preservada. Parecer1 não aprova contagem2 e a satisfação/prazo anteriores
permanecem.

## Declarações e conferências profissionais D3.17

Migrations158–161: private.professional_declarations acompanha mudanças
materiais do perfil por trigger, revisão bigint e hash; backfill não inventa
instante histórico. private.professional_credential_reviews congela valor,
revisão, resultado, ator e instante por paciente. RLS/grants fecham leitura e
escrita direta. RPCs Auth guardadas revalidam depois de locks, rejeitam
autoconferência/global sem contexto, preservam replay e paginam por tupla.
Índice do sujeito cobre FK; metadata sem histórico acompanha exclusão do
perfil, enquanto conferências mantêm referências. Local/remoto161 reconciliado.
[Recibo](../audits/D/D-B/CREDENTIAL_REMOTE_MIGRATIONS.json).

## Preparações BAL por recurso

private.balance_preparations e private.balance_preparation_commands guardam
configure,assign,request_deferral,defer,approve_deferral e reject_deferral.
O slot ativo/consumido pertence a titular,paciente,propósito e recurso real:
paciente da programação,ciclo,atribuição ou pedido. Não se inventa documento
ou versão documental. Conteúdo parcial v1 tem values e referência/versão
nativa ou NULL,com CAS,mutex e journal próprios. Não há TTL novo.

commit_balance_preparation revalida intenção e referência,compõe os motores
balance_command/resolve_balance_assignment e consome a preparação na mesma
transação. Chave nativa anterior não pode criar vínculo privado retroativo.
O resultado congela recurso,ator,instante,comando,campos próprios e retorno
nativo;mudança tardia após journal reverte ato e consumo. A referência inclui
o alvo exato mesmo fora da página;lista própria obtém total/itens no mesmo
snapshot e pagina por criação/ID. Tabelas/helper privados ficam fechados a
clientes;somente os cinco RPCs públicos recebem EXECUTE authenticated.

## Preparação privada de estoque familiar

private.stock_movement_preparations e private.stock_movement_preparation_commands
guardam o preenchimento familiar,com dono,paciente,propósito,alvo real,CAS e
journal. O alvo é o paciente,tipo STOCK,sem documento artificial. Guardas de
leitura/escrita são revalidadas após locks;RLS e revogação de acesso direto
fecham ambas as tabelas. Nove funções têm search_path explícito;somente quatro
entrypoints públicos recebem EXECUTE authenticated.

O snapshot combina catálogo,saldo familiar,histórico físico e origem exata da
compensação. Confirmar vincula também nome,unidade e saldo preservados;somente
family_stock_movement produz o movimento. A mesma transação consome o privado
e congela o recibo pessoal. Replay próprio não executa o motor novamente;
descarte ou reconhecimento não apagam o ledger. As migrations178–181 não
alteram o comando nativo,Auth,documentos ou saldos existentes.

A referência interna usa private.stock_quantity,com autoridade independente
da view filtrada por leitura. O escopo aceita leitura ou gestão do estoque
familiar;escrita nova exige gestão e paciente ativo. Sem leitura,o retorno
mascara saldo e detalhes da origem,sem modificar a referência selada interna.
Recuperação própria já vinculada permanece possível com paciente inativo,
sem conceder novo ato. Helpers de apresentação também mascaram recibo/contexto.
