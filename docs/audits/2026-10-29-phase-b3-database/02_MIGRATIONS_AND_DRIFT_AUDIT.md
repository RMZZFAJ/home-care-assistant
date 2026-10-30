# Migrations, evolução e drift

## Cadeia e contrato vigente

84 arquivos ordenados, 84 versões instaladas, sem versão ausente no catálogo
local. [Matriz](02_MIGRATION_HISTORY_MATRIX.csv) registra bytes/hash,
alterações,
dependências e marcadores por arquivo. O analisador leu a cadeia completa e
separou 1.136 statements respeitando strings, comentários e dollar quotes:
334 definições e 32 renomeações de função. DDL separado foi revisto junto ao
catálogo final; funções vigentes são aprofundadas nos subgrupos correspondentes.

01–19 formam a origem REQ/estoque; 008 remove quantidade solicitada e 012/021
preservam protocolos antigos. 020 cria catálogo local, migra snapshots e
amarra FKs compostas; 021 reconstrói intenção/hash sem renumerar protocolos,
captura referências de inventário e permite desconhecidos históricos.
022–031 acrescentam convites/outbox/revogação/custódia e retry incerto.
033 fecha DML service_role; 034 corrige defaults globais, pois revogação por
schema não remove EXECUTE PUBLIC herdado globalmente.

036–052 introduzem documentos/decimais/trânsito, anexos, revisões, evidências,
resolução de extras e contexto autoritativo; não removem a história anterior.
bal_approvals passou de PK por grupo a PK por versão/grupo, preservando versões
de reconto. View de saldo foi recriada como security_invoker. 053–067 fazem
contexto por sessão, governança, ciência/lifecycle, Realtime, cron, render e
challenges por propósito. Correções posteriores preservam ciência desconhecida,
recuperação de convite e serialização do arquivo. 068–084 acrescentam agenda
real, BAL por plantão, snapshots de prazo, autoridade efetiva, conflitos sem
retry indevido, lock antes da recuperação e rotação do scheduler BAL.

## Comparação com o instalado

208/228 corpos de função da aplicação coincidem byte a byte após normalizar
CRLF e retirar whitespace externo com a última definição/renomeação direta.
As outras 20 funções recebem transformações dinâmicas posteriores por
pg_get_functiondef/replace/regexp_replace. Não são automaticamente drift.
[Resultado bruto](evidence/migration-function-drift.json) conserva essas
diferenças e [statements](evidence/migration-statements.json) preservam origem.

O caso geral 20261025093655 troca SQLSTATE 40001 por P0001 em conflitos
deliberados; 25105017 também troca o handler do adaptador de política.
24223046 acrescenta referência do ledger e remove contexto BAL enviado pelo
cliente; 25092446 acrescenta opções autorizadas; 25094057 restringe revisão
familiar e contador; 25101209 atualiza prazo efetivo, snapshots e identidade
distinta; 25102217 emite disponibilidade; 25194512 coloca lock e revalidação
antes da recuperação. 24221737 adapta helpers legados e eventos/lembranças.
As definições instaladas completas estão preservadas para conferir esses ramos.

Essa comparação não equivale a reconstrução integral independente. Não foi
executado replay limpo/legado B3: o runner oficial reseta a stack operacional,
e esta autorização proíbe substituí-la. Não há destino descartável preparado
com Auth/Storage/extensões autorizado como substituto da suíte. As provas A
de replay aprovado são históricas, separadas da prova B3 atual.

## Preservação, segurança e evolução

A ponte digest 02050 detecta schema da extensão e possui comentário específico;
032 remove somente essa ponte, sem excluir extensão. Sua existência histórica
não é endpoint vigente. Family foi adicionado ao enum em migration separada
antes de uso posterior. Mudanças bigint → numeric ampliam domínio sem perda
de inteiros; não demonstram por si só correção de arredondamentos.

Renomear função conserva ACL; por isso cada helper anterior precisa de REVOKE.
As revogações observadas são conferidas no catálogo B3.3, em vez de presumidas
pela presença da instrução. Funções de trigger não precisam de EXECUTE do
cliente para disparar. Default global de postgres fecha PUBLIC para novas
funções; outros owners e extensões precisam de avaliação própria.

As migrations não são scripts genéricos reexecutáveis: nomes/constraints/renames
esperam o estado anterior e o ledger de versões evita repetição. Alguns
patches dinâmicos verificam âncoras e abortam se divergirem; outros replace não
verificam quantidade de substituições. É um risco de evolução sustentado,
não falha de instalação demonstrada. Replays futuros devem comparar corpos,
ACLs, constraints e cenários, sem modificar migrations históricas.

Há BEGIN/COMMIT explícitos em correções V4 e DDL dependente de extensões
pgcrypto/unaccent/btree_gist/pg_cron/pg_net/Vault. Instalar em PostgreSQL puro
não comprovaria equivalência Supabase. Não foram encontrados CREATE INDEX
CONCURRENTLY ou VACUUM na cadeia; locks de backfill e recriação de índices
exigem janela/volume medidos antes de nova aplicação remota. O cron só pode
ser tratado como confiável após B3.9 e confirmação no destino real.

Não há evidência atual de perda histórica ou schema remoto igual ao local.
O achado de manutenção será calibrado na consolidação; uma dificuldade de
auditar replace não é vulnerabilidade. Nenhuma migration foi editada/aplicada.
