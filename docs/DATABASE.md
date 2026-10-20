# Banco de dados

`profiles` vincula o usuário do Auth a função e status. `care_recipients` separa a pessoa assistida do usuário. `products` é o catálogo. `requisitions`, `requisition_items` e `requisition_observations` registram o fluxo. `stock_movements` e `audit_events` suportam módulos futuros.

A migração em `supabase/migrations` cria enums, chaves estrangeiras, checks, índices, unicidade do protocolo e chave de idempotência. A migração `20261019000200_catalog_and_submission_hardening.sql` valida o catálogo no banco, restringe a função de submissão, trata concorrência de idempotência e mantém a persistência atômica. RLS está habilitada em todas as tabelas expostas. A pessoa assistida do seed é fictícia.

Aplicação local:

```bash
supabase start
supabase db reset
```

O reset aplica as migrações e o seed; ele é destrutivo no banco local. Em ambientes compartilhados, use `supabase db push` e aplique o seed somente após revisar o destino.
