# Revisão dos privilégios do worker

Consultas em modo somente leitura em 21/10/2026, antes e depois das correções.
Os inventários não contêm dados de pacientes ou credenciais.

## Evidência

- `service-grants.sql`: consulta das permissões efetivas e defaults.
- `SERVICE_GRANTS_LOCAL.json`: resultado do projeto local verificado.
- `SERVICE_GRANTS_REMOTE.json`: resultado do remoto vinculado e autenticado.
- `SERVICE_GRANTS_LOCAL_AFTER.json`: inventário depois das migrations 033/034.
- `SERVICE_GRANTS_REMOTE_AFTER.json`: inventário final do remoto atualizado.
- Antes da correção, quatro RPCs do worker/webhook tinham `EXECUTE` nos
  dois ambientes e executam como proprietário com `search_path` explícito.
- Antes da correção, o local tinha acesso amplo por defaults da stack;
  o remoto não tinha SELECT/INSERT/UPDATE/DELETE, mas permitia TRUNCATE.
- A role possui `BYPASSRLS` nos dois ambientes. RLS não substitui os grants.

## Consequência no código

`src/lib/notifications/worker.ts` usa as RPCs para claim, validação e conclusão.
Antes da correção, a conclusão disputada com webhook/revogação consultava
diretamente `requisition_notifications.state`. Essa consulta funcionava no local
e falhava por privilégio no remoto. Os demais objetos da aplicação coincidiam;
o default da plataforma não pode ser tratado como equivalência funcional.

## Correções incrementais

033 restringe os grants existentes e defaults de `service_role` no schema
público. Preserva as quatro RPCs necessárias e acrescenta uma consulta mínima
do estado para o worker, sem conceder leitura integral da outbox. O fallback
usa essa RPC. O administrador global também pode consultá-la, preservando o
processamento manual já existente; administradores locais não podem.

O teste revelou que `REVOKE` de defaults por schema não remove o default
global `PUBLIC EXECUTE`. 034 corrige o default global somente do criador
`postgres` e remove `PUBLIC` das funções existentes da aplicação. Preserva
os grants explícitos para anon/authenticated/service e membros de extensões.
As cinco funções atuais que ainda herdavam `PUBLIC` eram funções de trigger;
o teste não demonstrou execução direta dessas funções como uma operação de
negócio. A correção também fecha o acesso implícito de funções futuras.

Esse comportamento está documentado em
[ALTER DEFAULT PRIVILEGES do PostgreSQL 17](https://www.postgresql.org/docs/17/sql-alterdefaultprivileges.html).

`tests/database/service-role.sql` passou no local após as correções. Verifica
defaults com objetos de prova que são revertidos, nega DML/leitura/`TRUNCATE`
diretos, nega acesso do administrador local à RPC e permite a reconciliação
ao administrador global. As funções temporárias das suítes receberam grants
explícitos para as identidades de teste, sem relaxar as regras da aplicação.

`tests/integration/database.test.mjs` inclui um teste pelo cliente
`service_role` real: claim, validação, conclusão, webhook, reconciliação e
recusa de acesso direto. A execução completa passou seis testes HTTP/Auth.
O replay final passou instalação limpa e evolução 019→034, seis suítes SQL
e o caso de search_path da ponte de compatibilidade.

## Estado final local e remoto

As migrations 033/034 foram aplicadas nos dois ambientes, completando 35
arquivos, versão máxima 034. Os inventários finais confirmam zero privilégios
diretos do serviço em tabelas/sequences e zero EXECUTE de PUBLIC nas funções
da aplicação. As cinco RPCs necessárias permanecem autorizadas explicitamente.
As quatro default ACLs e os demais metadados públicos ficaram iguais, conforme
[DATABASE_COMPARISON.json](DATABASE_COMPARISON.json).

Não houve reset ou fixture remota. A integridade dos registros anteriores foi
conferida separadamente pelos IDs comprovados no backup externo; acréscimos
durante a inspeção não foram confundidos com alteração dos registros originais.

A administração Auth usada pelas fixtures locais passa pela API Auth;
suas inserções de dados públicos usam o proprietário no container verificado.
A aplicação usa o cliente privilegiado somente nos caminhos autenticados
por segredo do worker ou assinatura do webhook.
