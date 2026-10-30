# B6.3 — Eventos, snapshots, hashes e imutabilidade

## Contrato vigente

private.record_document_event bloqueia o cabeçalho, reúne identidade, atores,
payload, workflow, linhas ordenadas, aprovações, resoluções de itens, vínculos,
anexos ready, versão, ação, comando e previousHash. Calcula SHA-256 de
jsonb::text. Antes do INSERT terminar, science_snapshot acrescenta ator,
autoridade, resumo histórico e, para REQ, ciência e atendimento. O trigger
recalcula content_hash e sincroniza o cabeçalho. O digest anterior ao trigger
não é o digest final a comparar.

A serialização canônica é a representação jsonb do PostgreSQL vigente. Não é
JSON.stringify do navegador, JCS independente de plataforma ou digest dos bytes
do PDF. Tipos JSON, nulos, números e strings fazem parte da mensagem. Linhas
preservam UUID e snapshots de produto/unidade; a ordenação SQL evita confundir
posição visual com identidade. Arrays de aprovações/vínculos não possuem todos
ORDER BY: comparar o corpo armazenado é confiável dentro do contrato; regenerar
um corpo por novas consultas não oferece identidade de bytes por inferência. Não
foi demonstrado hash incorreto por essa ordenação.

## Prova de leitura nova e provas reaproveitadas

B63-R01 (`evidence/b63-integrity-results.json`) examinou agregados de todos os
745 eventos locais de 210 documentos em transação READ ONLY: zero diferenças
entre body::text e SHA-256, previousHash e hash anterior, versão/UUID do corpo e
evento, cabeçalho e evento atual, ou gaps de versão entre eventos adjacentes.
Nenhum corpo ou nome preexistente foi exportado. 567 eventos de ator não nulo
têm actor_name; 178 têm ator nulo, 177 autoridade system. O registro restante
não autoriza concluir rotina automática indevida: legado/contexto ausente
precisa ser distinguido de evento corrente com autoridade system.

B36-03/04 preservaram hash v1 após atendimento, arquivo, reabertura e
cancelamento, com verificador aceitando o histórico e recusando hash errado.
Constraints/imutabilidade/grants/RLS estão nas provas B3, cujas 232 rotinas
foram comparadas sem drift. Não se reexecutaram ataques mutáveis ou migrations.
B62-S01 acrescentou rename de identidades fictícias com hash antigo intacto.

## Garantias e limites

O encadeamento liga versões do mesmo documento e detecta diferença ao comparar
contra referência confiável. Não é âncora externa, assinatura de pessoa, carimbo
de tempo de terceiro, prova de presença ou barreira contra quem controla banco,
código e backups. O verificador público consulta o hash persistido; não
recalcula o corpo naquela consulta. Um hash correto de representação incompleta
não restaura campos omitidos do PDF.

Versão documental não equivale à versão de contagem BAL, versão de escala,
revisão do ledger ou revisão do renderizador. Aprovações antigas de BAL
continuam preservadas com count_version e não validam nova contagem. Reconto não
deve apagar as versões anteriores. Eventos de tentativa sem commit não
necessariamente consomem uma versão documental; gaps de sequences PostgreSQL
após rollback não demonstram perda de eventos por si.

## Capacidade histórica

B3-015 já demonstrou custo quadrático de resumos: mil eventos acumularam 500.500
entradas e aproximadamente 71 MB de corpos textuais; compressão reduziu
armazenamento e nenhum hash antigo se perdeu. Não repetir volume. Esse desenho
também amplia PDFs que imprimem a história inteira da versão; B6.6 inspeciona
uma amostra proporcional de múltiplas páginas. Não recomendar apagar eventos nem
copiar recursivamente corpos para resolver apresentação.
