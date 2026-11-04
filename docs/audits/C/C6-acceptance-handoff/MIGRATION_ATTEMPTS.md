# Tentativas e correção do instrumento documental

Em 04/11/2026 o dry-run conferiu hashes, 32 destinos iniciais, 73 documentos
editoriais e 194 links. Não simulou que criar B1–B8 criaria o diretório B antes
do movimento do índice phase-b. O apply executou os movimentos e ajustes de
links, mas falhou ao montar o mapa final porque git mv tratou B existente como
contêiner e colocou o índice em B/phase-b.

Não houve reset ou reexecução dos movimentos. A recuperação conferiu os 18
arquivos do índice contra seus hashes originais e o README gerado contra o
hash editorial registrado, moveu os conteúdos ao destino planejado e preservou
o texto de links já ajustado. Só o duplicado transitório criado pelo próprio
instrumento foi substituído em memória; nenhuma fonte histórica foi removida.
O diretório intermediário foi removido apenas depois de vazio.

O instrumento passou a mover o índice antes dos pacotes B e ganhou modo de
finalização do apply interrompido, com guardas de identidade/hash e sem
replay.
Esta foi falha do instrumento de migração, não defeito do produto. Nenhum
teste
funcional, dado, migration ou serviço foi alterado em decorrência dela.

## Controles dos instrumentos e formato

O controle de preservação de células recusou o formatador quando a leitura
de linhas quebradas inseria espaços junto de links/código. O tokenizer passou
a conservar adjacência; a transformação conferiu todas as células antes de
escrever e manteve controle de idempotência. Os adaptadores dos índices foram
ajustados ao formato de registros rotulados; a contagem permaneceu 66/174.

As cópias brutas de entrada tinham espaços finais originais. Foram preservadas
em gzip com roundtrip byte a byte, sem reduzir lint/git diff --check. Canonical
Markdown recebeu apenas formatação, conservando células e palavras da fonte.

A validação também identificou que o snapshot amplo de 398 itens incluía os
quatro inputs documentais de raiz já no índice. O baseline não foi reescrito:
esses quatro foram classificados conforme o inventário/autorização e suas
fontes verificadas separadamente. Os 394 arquivos realmente não documentais
permaneceram idênticos. Não foi criada exceção para código ou migration.
