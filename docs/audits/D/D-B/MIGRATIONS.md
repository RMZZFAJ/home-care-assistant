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
