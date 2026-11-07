# Reconciliação e aplicações remotas D-B

Projeto único autorizado: `qwfrqychokvhdzakibid`. Sem reset, seed ou remoção
de dados remotos. As 84 migrations históricas permanecem protegidas.

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

**NÃO INICIADA.** Exige implementação e testes locais, revisão de ACL/RLS/RPC,
novo preflight remoto, compatibilidade, backup pré-alteração e pós-validação.
Migrations aplicadas não substituem prova dos consumidores reais.

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
