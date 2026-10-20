# Banco de dados

`profiles` vincula o usuário do Auth a função e status. `care_recipients` separa a pessoa assistida do usuário. `products` é o catálogo. `requisitions`, `requisition_items` e `requisition_observations` registram o fluxo. `stock_movements` e `audit_events` suportam módulos futuros.

A migração em `supabase/migrations` cria enums, chaves estrangeiras, checks, índices, unicidade do protocolo e chave de idempotência. RLS está habilitada em todas as tabelas expostas. A pessoa assistida do seed é fictícia.

