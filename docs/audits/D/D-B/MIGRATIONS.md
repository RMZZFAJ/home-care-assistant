# Reconciliação e aplicações remotas D-B

Projeto único autorizado: `qwfrqychokvhdzakibid`. Sem reset, seed ou remoção
de dados remotos. As 84 migrations históricas permanecem protegidas.

## Estado atual — D5.3

**Local145/remoto145, zero pendências.** Migration20261107213013 corrige seleção
e progresso de lembretes legados, com checkpoints, diagnóstico e lacunas privadas.
Entrada pública de serviço e seus grants são preservados. Somente dois corpos
de funções mudam intencionalmente;386 identidades e229 identidades públicas,
autoridades e grants anteriores permanecem. Nenhum produtor foi desativado.

O consumidor de backup novo gerou6681a390-179c-4172-83db-22338589ad5e:
78 arquivos/10.304.691 bytes,139 tabelas/FKs,32 objetos e31 PDFs, zero emissão
assinada ready na fonte. Manifesto SHA
ce349754ef70a5ab33505b63f7496aa7e915b54d4ddbc731102dccb484b00c36.
Cópia autenticada, restaurada em isolamento e evoluída com145 antes da aplicação.
Probe4,574s não é RTO operacional. Crons/pg_net ficaram ausentes na cópia.

Dry-run oficial mostrou apenas145, sem seed/roles. Após aplicação linked/
skip-vault,145 SQLs e139 projeções originais coincidiram; nenhum drift de dados,
cron ou Vault. Nove Auth, sete perfis e32 objetos preservados. Catálogo vivo
coincide com o local, exceto a qualificação NaN local já conhecida, com predicado
idêntico. Locks/transações longas/índices inválidos zero.
[Preflight](D5_3_REMOTE_PREFLIGHT.json), [resultado](D5_3_REMOTE_MIGRATIONS.json)
e [advisors](D5_3_REMOTE_ADVISORS.json). Publicação/CI são gates separados.

## Fechamento anterior — D5.2

**Local144/remoto144, zero pendências.** A migration20261107195440 acrescenta
quatro tabelas privadas Push, cinco RPCs pessoais Auth e três de worker/serviço.
Não reescreve aplicações anteriores nem ativa transporte. O preflight inicial
recusou alterações posteriores à captura em Auth/sessões e notificações/revisão.
A captura completa foi renovada, preservando a primeira e sua contraprova.

Backup final b065691e-d9af-43ea-88f8-7d6c8111c0a3,77 arquivos/10.094.070 bytes,
manifesto SHA d55dec16160c02c94a810ecbe5e492eaf255f49926f32952bc515905fcb7b33c:
autenticado e restaurado em banco isolado no container local existente.
Foram conferidos135 tabelas/FKs,32 objetos e31 PDFs, zero emissão assinada ready
na fonte; upgrade144 passou na cópia sem cron/pg_net. Não é prova D6 operacional.

Dry-run oficial mostrou somente144, sem seeds/roles. Aplicação linked/skip-vault
passou após compatibilidade:372 definições anteriores,221 públicas, e seus grants
permanecem idênticos. Pós-validação comparou144 SQLs e135 projeções originais,
sem alteração inesperada; cron/Vault idênticos, locks/transações longas/índices
inválidos zero. A qualificação conhecida da constraint NaN local permanece.
Novas tabelas têm RLS e nenhum grant direto; as oito RPCs têm papéis e
search_path conferidos. Não há inscrição ou entrega Push remota criada.
[Preflight](D5_2_REMOTE_PREFLIGHT.json), [resultado](D5_2_REMOTE_MIGRATIONS.json)
e [advisors](D5_2_REMOTE_ADVISORS.json). PR Draft, produção NO-GO.

## Aplicação inicial — D-A

**APLICAÇÃO INICIAL E PÓS-VERIFICAÇÃO CONCLUÍDAS.** Baseline aa9f168:
121 arquivos locais e 113 versões remotas, sem versão desconhecida no
`migration list --linked`. Oito pendências confirmadas, na ordem:

1. `20261106040155_phase_d2_optional_recount.sql`.
2. `20261106073728_phase_d2_bilateral_transfers.sql`.
3. `20261106075328_phase_d2_preserve_bal_draft_recount.sql`.
4. `20261106161707_phase_d2_catalogue_successors.sql`.
5. `20261106181435_phase_d2_requisition_remaining_need.sql`.
6. `20261106185554_phase_d2_private_req_bal_drafts.sql`.
7. `20261106203000_phase_d2_private_bal_reference.sql`.
8. `20261106211500_phase_d2_selected_shift_dates.sql`.

Controles agregados anteriores: 8 usuários Auth, 6 perfis, 3 pacientes,
12 documentos operacionais, 8 REQs, 145 eventos documentais, 8 movimentos,
29 objetos Storage. Esses números não representam conteúdo ou aprovação.
Jobs `hca-notification-worker` e `hca-operational-lifecycle` estavam ativos.
Não foram alterados. Backup precisa incluir bytes Storage, Auth, schema,
histórico, documentos e custódias, fora do Git, com hashes e verificação de
recuperabilidade. Arquivo criado isoladamente não satisfaz o preflight.

Compatibilidade será confrontada com Vercel production SHA 8ec979a e preview
do candidato. Preflight, decisão de aplicação e pós-validação terão registros
separados, inclusive eventuais impedimentos e correções incrementais.

### Decisão de preflight inicial

Backup final `e3c45e45-b4b7-45fd-b58d-666bca46f992`: 47 arquivos,
6.233.858 bytes, AES-256-GCM, manifesto cifrado e autenticação por objeto.
SHA-256 do manifesto:
`964a7be1124fdb93479e16dc98631000d51237b3720be4753ff3122cd8f80fce`.
Destino no computador do operador, independente do Supabase, fora do Git;
chave separada com ACL Windows limitada ao operador. Não há agendamento de
backup diário ativo nem comprovação de recuperação após perda desse computador.

Restauração real em banco temporário restrito no container local já existente,
sem outra stack, sem cron, sem pg_net e sem importar roles no cluster. O banco
temporário foi removido ao fim; postgres operacional local não foi substituído.
122 tabelas restauradas; contagens/digests estáveis conferidos, FKs verificadas,
29 objetos Storage e hashes dos 28 PDFs registrados confrontados. As duas
diferenças temporais de snapshots são exclusivamente cursor BAL e heartbeat
do scheduler, cujas linhas do dump foram restauradas. Nenhum dado de negócio,
Auth ou arquivo divergiu na consulta imediatamente anterior à aplicação.

O procedimento incluiu metadados gerenciados Auth/Storage e sete escopos de
default privileges omitidos pelo dump selecionado. A tentativa inicial com
postgres não restaurava ownership de supabase_admin; o probe usa o administrador
local somente no banco isolado, com proprietário postgres e DDL de migrations
sob SET LOCAL ROLE postgres. Um coletor JSON multilinha foi corrigido para
jsonb; falhas/diagnósticos anteriores permanecem no destino privado.

As oito migrations foram aplicadas nessa cópia restaurada. Catálogo resultante
coincide com o candidato local em relações, colunas lógicas, índices, funções,
RLS/policies, triggers, table/function grants e defaults. Duas qualificações:

- pg_dump/reparse acrescenta alias interno `AS text` ao segundo ramo UNION da
  view de candidatos; a view remota original coincide integralmente com a local,
  e as oito migrations não a substituem.
- presentation_finite_factor está validada no remoto, sem apresentação inválida;
  o local preserva fixture NaN legada e a mesma regra NOT VALID conforme o desenho
  condicional da migration D-A. Não há redução de regra nem saneamento silencioso.

Histórico: 113/113 SQLs correspondem aos tokens dos arquivos atuais. Comparação
preserva literais, identificadores e corpos de funções; diferenças de separação
de statements/whitespace não são tratadas como drift. Guard confirmou os 84
hashes históricos. Nenhuma versão remota desconhecida.

Vercel production 8ec979a mantém as assinaturas RPC anteriores. A inspeção dos
consumidores e das oito evoluções confirma adições e caminhos opt-in: submit REQ
mantém assinatura/recuperação legada, referência BAL nova é opcional, recorrências
anteriores continuam válidas, ENT preserva o motor anterior e campos adicionados
têm defaults compatíveis. Nenhum exemplar, evento ou registro histórico é
reescrito. Isso não é homologação operacional remota ou promoção da aplicação.
CI aa9f168 já aprovou clean/upgrade/Auth e consumidores do candidato D-A.

Consulta final: 113 migrations, zero transações longas, locks aguardando ou
índices inválidos. Dry-run oficial via perfil fixado lista exatamente as oito
migrations, seeds=[] e roles=[]. Aplicação autorizada pode prosseguir com
--linked --skip-vault, sem incluir seeds/roles/configuração do Auth.

### Aplicação e resultado observados

Executado o fluxo oficial com perfil fixado: `db push --linked --skip-vault --yes`.
Resultado: **121 migrations**, oito aplicadas uma vez, nenhuma versão desconhecida,
seed, reset ou atualização de Vault. [Registro sanitizado](INITIAL_REMOTE_MIGRATIONS.json)
contém os hashes dos oito arquivos e os resultados agregados, sem dados privados.
Histórico posterior: 121/121 SQLs conferidos contra os arquivos atuais.

Comparação posterior do catálogo remoto vivo: dez seções coincidem integralmente
com o candidato local; constraints coincidem sob a única qualificação prevista
presentation_finite_factor. A view remota original coincide integralmente; o alias
de reparse era específico do ensaio de recuperação. Preservação de todas as tabelas
anteriores comparada por digest, removendo somente as novas colunas com defaults
compatíveis da projeção: zero mudança inesperada. Continuam 8 usuários Auth,
6 perfis, 12 documentos, 145 eventos, 8 movimentos e 29 objetos.

Jobs remotos preservam seus estados ativos originais. Mudanças observadas fora
do histórico de migrations: somente cursor BAL e heartbeat. Advisor não ganhou
RPC anônima: continuam três entradas anônimas preexistentes. Dez RPCs novas são
authenticated, com leitura/sessão/contexto e capacidades próprias no corpo;
não concedem DML nas tabelas privadas. INFO de RLS sem policy aumenta em um
controle interno cujo acesso direto permanece revogado. Unaccent público e
proteção de senha vazada continuam avisos anteriores, sem configuração remota
alterada por consequência. Esses avisos não são aprovação geral de segurança.

## Aplicação final — D-B

**LOTE ANTECIPADO D5.1 APLICADO E PÓS-VALIDADO.** O responsável antecipou a
reconciliação para este fechamento em [complemento expresso](OWNER_AMENDMENTS.md).
Local143/remoto143;22 pendências D-B aplicadas uma vez. Não há migration
pendente nessa observação. Novos incrementos da missão exigem nova reconciliação.
Migrations aplicadas não substituem prova dos consumidores reais nem concluem D-B.

Novo preflight confrontou121 SQLs com os arquivos e o catálogo remoto com o
registro anterior: sem versão desconhecida ou drift estrutural. Vercel production
continua8ec979a;97 identidades de funções públicas referenciadas pelos fontes
publicados foram preservadas, sem perda de grants desses consumidores.
As evoluções mantêm assinaturas anteriores e acrescentam rascunhos, referências
e emissões opt-in. Nenhum documento, evento ou exemplar antigo foi reescrito.

Backup88477945-31c5-4239-a029-693aa520d5a7 tem78 arquivos e9.289.109 bytes,
AES-256-GCM, autenticação por objeto e manifesto cifrado com SHA-256
866f74c00d81d53c45cd3b28245b742b01ef44ca3dfa245b58cebe999f226eff.
Captura e custódia ficam fora do Git, com ACL do operador e chave separada.
Restauração real isolada conferiu129 tabelas/digests estáveis, FKs,32 objetos e
31 PDFs legados. Zero emissões assinadas ready existiam nessa fonte. Aplicou as
22 migrations na cópia, sem cron/pg_net ou importação de roles. O banco temporário
foi removido.8,639s é tempo do probe, sem atribuição de RTO operacional.

Catálogo da cópia coincide sob duas qualificações já discriminadas no preflight
anterior: alias AS text acrescentado pelo reparse da view e flag NOT VALID da
fixture NaN local. A view remota viva coincide exatamente com o candidato; a regra
presentation_finite_factor tem predicado idêntico e está validada no remoto.
Não se enfraqueceu constraint nem se alterou a fixture para obter equivalência.

Consulta imediatamente anterior confirmou os129 conjuntos estáveis ainda iguais
ao backup, exceto cursor/heartbeat com contagem preservada. Sem locks aguardando,
transações longas ou índices inválidos. Dry-run oficial listou exatamente22
pendências, seeds=[] e roles=[]. Fluxo oficial db push --linked --skip-vault --yes
aplicou somente essas pendências. Não houve reset, fixtures, configuração Auth,
ativação de transporte ou atualização de Vault.

Pós-validação conferiu143/143 SQLs e dez seções integrais do catálogo vivo; somente
a qualificação da constraint local permanece. Projeções originais das129 tabelas
coincidem, excluindo apenas colunas novas e novas linhas do histórico de migrations.
Persistem9 usuários Auth,7 perfis e32 objetos. Cron e Vault têm digests preservados;
somente cursor BAL/heartbeat variaram. Marcador público retornou200 pelo REST
anônimo real: invoker, stable, sem EXECUTE service_role e sem grants diretos às
tabelas privadas. Advisor mantém três definer anônimos anteriores; os quatro
novos controles privados têm RLS e acesso direto revogado. Avisos históricos
de unaccent/senha vazada continuam sem alteração de configuração.

[Preflight e hashes](D5_REMOTE_PREFLIGHT.json),
[pós-validação](D5_REMOTE_MIGRATIONS.json) e [advisors](D5_REMOTE_ADVISORS.json)
separam execução, qualificações e limites. CI dos fontes atuais e teste do preview
são gates distintos. As seções abaixo preservam os estados históricos de cada lote.

### Incremento local D3.2

Local125 / remoto121. Quatro arquivos novos, ainda sem aplicação remota:

- 20261107013356_phase_d3_governance_recovery.sql: leitura autorizada e limitada,
  comparação e versão original da intenção.
- 20261107015914_phase_d3_governance_compatibility.sql: nomes do catálogo,
  herança e preservação da alteração deliberada do próprio vínculo.
- 20261107020304_phase_d3_governance_own_transition.sql: contexto da sessão
  permanece verificável quando a própria ação legítima revoga o vínculo;
  sessão/assurance/ator/linha resultante continuam necessários.
- 20261107021123_phase_d3_open_governance_requests.sql: consulta inicial inclui
  aprovação pendente e convite aguardando aceite, antes da paginação.

Todos criados pelo CLI e aplicados com test:db:prepare no projeto local existente,
sem reset. As revisões anteriores e suas contraprovas foram preservadas. RPCs
novas só têm EXECUTE authenticated; auxiliares e nomes antigos permanecem
revogados. Não se abriu DML/RLS para corrigir leitura. Provas dirigidas Auth,
HTTP e browser constam no checkpoint; clean/upgrade e integração global do SHA
publicado devem ser verificados na CI programada antes do preflight remoto final.

### Incremento local D3.3

Local126/remoto121. 20261107022731_phase_d3_complete_scoped_history.sql acrescenta
leitura paginada de auditoria com audit.read, índice do paciente/ordem e validação
explícita de NULL/limites na RPC documental existente. Nome antigo revogado;
nenhuma abertura de RLS/DML. test:db:prepare, três casos Auth e seis casos browser
dirigidos passaram, com contraprova anterior preservada. Instalação/evolução e
demais suítes programadas continuam gates da CI do SHA publicado. A migration
integra a aplicação remota final D-B; não foi aplicada isoladamente ao remoto.

### Compatibilidade local D3.4a

Local127/remoto121. 20261107031505_phase_d3_governance_read_compatibility.sql
restaura data.definitions e preserva as definições efetivas no topo da resposta.
Mesma autorização e EXECUTE authenticated; auxiliares continuam fechados.
test:db:prepare sem reset e seis casos Auth dirigidos passaram, incluindo duas
falhas da CI bd8747b. Instalação/evolução e suíte completa devem ser confirmadas
pela CI do SHA publicado. A aplicação remota permanece reservada ao lote final.

### Lote local D3.5 em execução

Local130/remoto121. 20261107035508_phase_d3_residence_preparation_and_guides.sql
acrescenta preparação privada, journal/CAS, criação global e guias próprios,
sem ato clínico por progresso. 20261107040539_phase_d3_preparation_read_models.sql
acrescenta páginas estáveis, resumo limitado a metadados e validação de
responsáveis ativos. Aplicadas por test:db:prepare sem reset. Sete casos Auth
distintos passaram entre rodadas; interface/HTTP/CI ainda não concluídos.
Helpers/tabelas privados continuam fechados; RPCs somente authenticated com
autorização revogável. Nenhuma delas foi aplicada ao remoto.

20261107044658_phase_d3_guide_context_intent.sql vincula progresso ao escopo
consultado e verifica-o antes e depois do comando. A entrada antiga tornou-se
helper privado sem EXECUTE público, authenticated, anon ou service_role.
O recheck final Auth passou7/7, incluindo recusa de intenção antiga após troca
de paciente e preservação do progresso de destino. Total pendente D-B: nove
migrations; a reconciliação remota final ainda não foi iniciada.

### Lote local D3.6 em execução

Local131/remoto121. 20261107055526_phase_d3_supply_private_drafts.sql acrescenta
propósito aos slots privados, COM/ENT, conferência contextual pessoal e revisão/
submit atômicos. Entradas REQ/BAL preservadas. Aplicação por test:db:prepare na
stack existente, sem reset. Oito casos Auth passaram entre rodadas, inclusive
falha provocada na segunda etapa para COM/ENT/BAL e replay sem efeitos duplicados.
UI/HTTP/CI do candidato ainda pendentes. Dez migrations D-B aguardam o lote
remoto final; nenhuma destas mudanças foi aplicada ao remoto.

### Lote local D3.7

Local133/remoto121;12 migrations D-B pendentes do lote remoto final autorizado.
20261107070558_phase_d3_legacy_revision_recovery.sql acrescenta consulta
autorizada do comprovante mínimo da primeira etapa legada. Somente authenticated;
nenhuma escrita de revisão/submissão é usada para consultar esse comprovante.
20261107072253_phase_d3_legacy_submission_version.sql mantém a versão da intenção
original ao submeter, sem adotar edição posterior por replay. Preserva os grants
da RPC existente. Ambas aplicadas por test:db:prepare na stack local, sem reset.
Auth final17/17, incluindo grants, CAS, falha atômica nova, primeira etapa antiga,
segunda etapa antiga concluída e recusa de submissão de edição posterior.
Nenhuma migration histórica alterada; remoto sem alteração neste incremento.

### Lote local D3.9

Local136/remoto121;15 migrations D-B aguardam reconciliação remota final.
20261107082257_phase_d3_notice_reference_resolution.sql acrescenta leitura
autorizada do alvo individual e vínculo composto de relato com lembrete do
mesmo paciente. Resposta pessoal e relato vinculado são RPCs transacionais,
com replay próprio, revalidação de contexto e helpers privados fechados.
20261107084512_phase_d3_notice_reference_consistency.sql usa um único snapshot
para contagem/prévia, impede ausência contraditória e vincula comprovante à chave.
20261107090824_phase_d3_notice_reference_timezones.sql conserva o fuso do evento
e da atribuição para apresentação correta da janela do recurso.

As três foram aplicadas por test:db:prepare na stack local existente, sem reset.
Auth9/9 passou após a última aplicação, com negativas, espera observada,
rollback de relato/resposta/auditoria e replay após perda de escrita. Nenhuma
migration aplicada foi reescrita; as84 históricas continuam preservadas.
Nenhuma dessas migrations foi aplicada ao remoto nesta etapa.

### Lote local D4.2

Local137/remoto121;16 migrations D-B pendentes do lote remoto final.
20261107104648_phase_d4_pdf_issuance_lifecycle.sql acrescenta identidade de
emissão em tabela privada, intenção pessoal idempotente, snapshot canônico
congelado, claim de serviço com lease/token e finalização Auth. Caminho e
intenção são imutáveis; registro ready não pode ser alterado ou excluído.
Grants diretos e helpers privados continuam fechados. Leitura/histórico exigem
capacidade atual; consulta pública expõe somente metadados mínimos de ready.

DDL foi pré-validado em transação revertida e aplicado por test:db:prepare,
na stack existente, sem reset. Auth6/6 passou: contexto trocado durante espera
real, revogação de leitura, chave sem prova do worker, lease antigo, NULL/recibo
incompleto, ausência de Storage e101 registros com cursor estável. O teste
negativo de finalização não é prova criptográfica; o pipeline usa PDF real.
A migration aplicada permanece sem reescrita. Nenhuma mudança remota neste lote.

### Lote local D4.3

Local139/remoto121;18 migrations D-B aguardam o lote remoto final autorizado.
20261107113421 acrescenta orçamento compartilhado de consulta/upload e leitura
mínima de legado por digest, sem dados do paciente. Fachada pública limitada no
HTTP passa a ser a única entrada; RPCs mínimas ficam exclusivas do servidor.
Tabela privada não recebe grants diretos. Contadores não armazenam IP bruto.

20261107115300 recalcula a janela depois do lock de admissão e indexa SHA dos
dois acervos legados. O incremento evita depender do instante anterior à espera,
sem reescrever a migration já aplicada. Ambas tiveram preflight em transação
revertida e aplicação por test:db:prepare, sem reset ou novo ambiente.

Auth de emissão6/6 compatível, orçamento/ACL3/3 após a última aplicação e SQL
service-role passaram. A allowlist exata do teste SQL inclui as quatro novas
funções aprovadas; serviço continua sem finalizar emissão pelo Auth. O orçamento
foi exercitado com concorrência real, limite pessoal/global e expiração, sem
limpar contadores para obter verde. CI do novo SHA deve comprovar instalação
limpa, evolução legada e integração geral. Nenhuma aplicação remota neste lote.

### Lote local D4.4

Local140/remoto121;19 migrations D-B pendentes. A migration20261107123000
acrescenta pdf_archive, RPC somente Auth, com leitura autorizada de originais,
representações legadas e intenções independentes. Não modifica artefatos,
metadados ou snapshots existentes. Grants de anon/serviço permanecem negados.
Preflight revertido e test:db:prepare passaram sem reset. Auth percorreu103
registros mistos, cursor estável, filtros e negativas; a interface e os downloads
foram exercitados nos três projetos. Instalação/evolução/integração completas
permanecem gate da CI do SHA publicado. Nenhuma aplicação remota neste lote.

### Lote local D4.5

Local141/remoto121;20 migrations D-B pendentes. A migration20261107150000
muda o padrão de novas intenções para V6 e congela proveniência factual em
sourceFacts, sem reescrever o evento/hash canônico ou intenções já existentes.
Trigger privado, SECURITY DEFINER com search_path vazio e EXECUTE revogado de
todos os papéis de aplicação. Nenhuma concessão direta de DML foi acrescentada.
Preflight revertido e test:db:prepare passaram, sem reset ou outra stack.
Auth real comprovou imutabilidade, origem conhecida/NULL, rename/revogação e
preservação do evento/efeitos. Banco local tem141 aplicações; crons originais
preservados e instrumentos de falha ausentes. CI do SHA publicado deve validar
instalação limpa, evolução legada e integração completa. Nenhuma aplicação remota
neste incremento. [Contrato e limites](PDF_SOURCE_FACTS.md).

### Fechamento OPS.3 — remoto147

As migrations146/147 foram aplicadas no remoto autorizado após captura crítica
fresca, autenticação e restauração/upgrade isolados. Local147/remoto147, sem
pendências. A compatibilidade preservou387 identidades anteriores e seus grants;
somente public.run_operational_schedule recebeu retorno aditivo e coletor em
subtransação. As tabelas novas são privadas, sem grants diretos, e não concedem
escopo clínico ao suporte. 147 corrige a recusa CAS para PT409 sem reescrever146.

O pós-check confrontou os143 conjuntos anteriores, incluindo as145 linhas
anteriores de histórico, e reconciliou separadamente todos os147 SQLs aplicados.
Somente os clocks/cursors nomeados tiveram projeção qualificada. Auth9/profiles7,
Storage33, cron e Vault preservados; locks, transações longas e índices inválidos
zero. Catálogo vivo equivalente, salvo a qualificação conhecida do flag de
validação NaN local, com predicado igual. Runtime anônimo200/protocolo1/schema1.
Sem reset, fixture/Auth remoto, promoção ou ativação de fornecedor externo.

[Preflight](OPS_3_REMOTE_PREFLIGHT.json), [pós-check](OPS_3_REMOTE_MIGRATIONS.json),
[advisors](OPS_3_REMOTE_ADVISORS.json) e [evidência](OPS_3_EVIDENCE.json).
CI do SHA publicado, os critérios restantes e gates D-C/D6 permanecem próprios.

### Fechamento do acompanhamento inicial — remoto148

20261108002700 foi aplicada após cópia fresca autenticada, restauração e upgrade
isolados, compatibilidade e preflight. Local148/remoto148 sem pendências.
Acrescenta somente a política0–10 do documento autorizado, sem payload de
configuração local nem caminho anon/serviço. Os398 contratos anteriores,
corpos e grants permanecem iguais. A API mantém data e acrescenta waitSeconds.

Histórico148/148,149 conjuntos anteriores, Auth9/profiles7, Storage33, cron e
Vault preservados. Locks/transações longas/índices inválidos zero; runtime
anônimo200/protocolo1/schema1. Catálogo vivo equivalente, salvo a qualificação
NaN local conhecida com predicado idêntico. Sem reset, fixture/Auth remoto,
fornecedor externo ou promoção. [Preflight](NOTICE_TRACKING_REMOTE_PREFLIGHT.json),
[pós-check](NOTICE_TRACKING_REMOTE_MIGRATIONS.json),
[advisors](NOTICE_TRACKING_REMOTE_ADVISORS.json) e
[provas locais](NOTICE_TRACKING_EVIDENCE.json). CI do novo SHA continua gate.

### Fechamento dos anexos — remoto150

149/150 foram aplicadas após cópia crítica fresca, restauração/upgrade
isolados, preflight e compatibilidade. Local150/remoto150, histórico integral
150/150 reconciliado, sem pendências; não houve reset, seed, mudança de Auth,
Vault, cron ou ativação de transporte externo.

Os399 contratos anteriores e grants foram preservados. reserve exclui abandono
formal da capacidade; finalize recusa terminal divergente e exige atestado para
tentativas rastreadas. A política evidence_upload conserva INSERT autenticado
e passa a bloquear abandono concorrente e upload fora do ciclo autorizado.
As duas tabelas privadas têm RLS sem grants diretos; atestado e recibo são
RPCs exclusivas do serviço. Nova origem não é atribuída retroativamente.

149 projeções de conjuntos anteriores, Auth9/profiles7,33 objetos, cron e Vault
foram confrontados. Catálogo coincide salvo a flag local conhecida da condição
finita, com predicado preservado. Advisors: INFO privado39→41 e funções Auth
149→153, sem novas funções anônimas; alertas anteriores não foram suprimidos.
[Preflight](ATTACHMENTS_REMOTE_PREFLIGHT.json),
[pós-check](ATTACHMENTS_REMOTE_MIGRATIONS.json),
[advisors](ATTACHMENTS_REMOTE_ADVISORS.json) e
[evidência](ATTACHMENTS_EVIDENCE.json). Probe5,392s não comprova D6/RPO/RTO.

### Formulários e remoção explícita — remoto151

151 foi aplicada pelo CLI vinculado, sem roles/seeds/Vault, após testes Auth e
consumidores, backup válido restaurado, upgrade isolado e pré-validação. Não
cria tabelas, políticas ou grants. Três corpos existentes passam a distinguir
omissão e JSON null para nome curto; assinatura, autoridade, CAS, replay e
propostas anteriores permanecem preservados.

Atividade após o backup foi documentada separadamente e não confundida com
perda causada pela migration. A pré-validação exigiu schema, histórico e
Storage exatos à cópia, sem linhas removidas e cópia verificada com menos de
uma hora. A pós-validação compara o snapshot imediatamente anterior ao DDL.
Histórico151/151,407 identidades/grants,151 projeções, Auth9/profiles7,33 objetos,
cron/Vault e marcador HTTP200/protocolo1/schema1 foram conferidos. Catálogo
coincide salvo a flag local conhecida; advisors sem aumento. Nenhum reset,
fixture/Auth remoto, transporte externo ou promoção.
[Preflight](FIELD_VALIDATION_REMOTE_PREFLIGHT.json),
[pós-check](FIELD_VALIDATION_REMOTE_MIGRATIONS.json),
[advisors](FIELD_VALIDATION_REMOTE_ADVISORS.json) e
[provas e qualificações](FIELD_VALIDATION_EVIDENCE.json).
