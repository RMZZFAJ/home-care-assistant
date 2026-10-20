# Banco de dados

`profiles` vincula o usuário do Auth a função e status. `care_recipients` é o centro do contexto multipaciente e `care_recipient_memberships` associa usuários a pacientes com permissões explícitas. `products` continua sendo um catálogo único. `requisitions`, `requisition_items` e `requisition_observations` registram a necessidade operacional sem quantidade de reposição. `stock_movements` deriva saldos por paciente e custódia (`FAMILY`/`CARE_TEAM`); `stock_inventories` registra contagens que só viram movimentos após aprovação; `requisition_notifications` acompanha destinatários e tentativas.

A migração em `supabase/migrations` cria enums, chaves estrangeiras, checks, índices, unicidade do protocolo e chave de idempotência. As migrações de hardening validam o catálogo, restringem as funções de submissão, tratam concorrência de idempotência e mantêm a persistência atômica. `products.aliases` guarda nomes alternativos sem duplicar produtos, e `find_product_by_alias(text)` resolve buscas autenticadas sem diferenciar acentos ou maiúsculas. RLS está habilitada em todas as tabelas expostas. A pessoa assistida do seed é fictícia.

As migrações incrementais `20261020000800` a `20261020001900` removem a coluna de quantidade de reposição, adicionam hash canônico/idempotência e protocolos a partir de 12, preservam protocolos históricos e aceitam o novo formato sequencial, escopo multipaciente, custódia, inventário, notificações, histórico de status, transições autorizadas, administração server-side, importação dos protocolos físicos 1 a 11 e execução segura da RPC de submissão. A migração `20261020001500` bloqueia saldo insuficiente, exceto para administrador global; isso não transforma uma requisição em baixa automática.

Importações usam `requisition_import_batches` e `historical_requisition_imports`. O hash da carga impede repetição silenciosa; cada linha precisa de paciente ativo, protocolo físico entre 1 e 11, pelo menos um produto ativo e estoque inteiro não negativo. Linhas inválidas entram no relatório como rejeitadas e não produzem notificações.

Aplicação local:

```bash
supabase start
supabase db reset
```

O reset aplica as migrações e o seed; ele é destrutivo no banco local. Em ambientes compartilhados, use `supabase db push` e aplique o seed somente após revisar o destino. Não execute `db reset` ou migrações destrutivas em banco remoto.
