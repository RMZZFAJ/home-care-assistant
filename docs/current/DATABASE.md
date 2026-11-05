# Banco de dados

Contrato AS_IS da base funcional `37cb7f85e96e551d6419871f94dd950712e2565b`.
B3 registra exceções em precisão, NULL/NaN, revisão BAL legado, sessão
direta e revogação em espera. O guard e os contratos corretos devem ser
preservados.
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
