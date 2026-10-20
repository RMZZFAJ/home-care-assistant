# Banco de dados

`profiles` vincula o usuário do Auth a função e status. `care_recipients` separa a pessoa assistida do usuário. `products` é o catálogo. `requisitions`, `requisition_items` e `requisition_observations` registram o fluxo. `stock_movements` e `audit_events` suportam módulos futuros.

A migração em `supabase/migrations` cria enums, chaves estrangeiras, checks, índices, unicidade do protocolo e chave de idempotência. As migrações de hardening validam o catálogo, restringem as funções de submissão, tratam concorrência de idempotência e mantêm a persistência atômica. `products.aliases` guarda nomes alternativos sem duplicar produtos, e `find_product_by_alias(text)` resolve buscas autenticadas sem diferenciar acentos ou maiúsculas. RLS está habilitada em todas as tabelas expostas. A pessoa assistida do seed é fictícia.

Aplicação local:

```bash
supabase start
supabase db reset
```

O reset aplica as migrações e o seed; ele é destrutivo no banco local. Em ambientes compartilhados, use `supabase db push` e aplique o seed somente após revisar o destino.
