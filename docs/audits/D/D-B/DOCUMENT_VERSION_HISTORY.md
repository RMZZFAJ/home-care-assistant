# D4.7 — comparação de versões e autoria histórica

Lote validado localmente sobre df49881. C034/C-NEW-AC-017 passam localmente;
CFINAL018 permanece parcial. A execução preserva a prioridade técnica dos
PDFs; não redesenha seus arquivos. CI e Preview do novo SHA são gates próprios.

## Implementação

Uma consulta Auth por versão escolhe o evento exato e uma referência anterior.
O contrato operacional existente e o RLS do próprio cliente limitam a leitura;
o servidor revalida a autorização depois da consulta. Não usa service-role nem
adiciona grants, migrations ou escrita de negócio. Versão ausente/referência
invertida são recusadas, sem substituição pela atual.

Autoria vem exclusivamente do nome preservado no evento. Ausência permanece
desconhecida; evento sem autor pessoal é identificado como sistema. Nome de
perfil ou catálogo atual não recompõe o passado. Dados de autoridade e chaves
de transporte não são publicados pela projeção de leitura.

O corpo JSONB é consultado como texto pelo cast do PostgREST; Node24 conserva
o token de cada número ao decodificá-lo. Quantidades são formatadas por Decimal,
preservando casas significativas em vez de passar pelo arredondamento binário.
[Contrato do cast](https://docs.postgrest.org/en/stable/references/api/tables_views.html#casting-columns).

A comparação associa linhas pela identidade preservada, separa antes/depois,
motivo e ressalva, mostra fatos completos que já têm descrição e oferece o
arquivo da versão indicada. Campos adicionais ainda sem descrição são avisados
explicitamente; a leitura não se declara um resumo exaustivo nessa condição.
Fatos são texto/listas, sem textarea, aria-invalid ou pedido de correção de
conteúdo histórico. Falha oferece Atualizar somente para a seção.

Seleção e referência ficam no endereço. Abrir o acervo e voltar recupera essa
consulta. Controles permanecem montados durante a espera para preservar foco;
resultado de outra seleção não é mostrado como o atual. Consultar o histórico
não emite outro exemplar nem altera evento, ledger ou assinatura.

## Estado das validações

Dez casos unitários distintos aprovados em coortes, com25 resultados e nenhuma
falha funcional. Cobrem decimal extremo/zero/null/ausência, associação por linha,
nomes congelados, campo novo explicitamente parcial, revalidação depois da
consulta, ausência/reversão da versão e recusa de corpo incompatível. Tipos e
lint dos11 fontes passaram após remover dois imports sem consumidor e tipar
uma tupla no teste; as primeiras saídas de diagnóstico foram preservadas.
O guard final de propriedades próprias mantém papel desconhecido como texto,
inclusive __proto__, sem alterar os caminhos de papéis válidos no navegador.

Dezoito casos distintos de produção passaram em coortes:12 novos nos três
motores e seis consumidores existentes de sourceFacts. Foram42 resultados,
24 passes/18 falhas preservadas; não é uma rodada única18/18. Os hashes de13
fontes identificam cada coorte. Os seis consumidores PDF não consultam o novo
leitor; os três casos REQ/BAL preservam seus caminhos. A última passagem COM3/3
confere a apresentação compartilhada após os ajustes finais de leitura.

As primeiras falhas COM foram de fixture: aprovar exige administração local;
uma criação administrativa já aprovada também não aceita outra aprovação.
O cenário final usa criação familiar pendente, administrador distinto e motivo
para aprovação parcial. Um probe Auth real passou após duas recusas preservadas,
conferindo o cast, autor revogado e corpos/hashes exatos, sem relaxar permissões.

O botão desabilitado na espera perdia foco: o produto agora mantém o elemento
focável, com aria-disabled e guarda para não repetir a consulta em andamento.
Os demais ajustes corrigiram o teste novo:2 versus2.000000, seletor do campo,
dois contextos de quantidade aprovada e um campo inexistente em HCAIssuance.
Esse metadado conserva versão/hash; representação histórica é conferida pelo
Subject real. Diagnóstico Next dev3 resultados/2 passes/1 falha é separado,
sem aprovação de build de produção. Nenhuma regra ou asserção foi removida.

O caso adicional de leitura restrita passou3/3: familiar com criar/aprovar/
comprar desabilitados consulta a versão, mas o comando de compra é recusado
sem alterar evento. Uma tentativa de liberar COM para papel clínico por
override foi corretamente recusada na primeira fixture. As três recusas foram
preservadas, e o caso final comprova essa barreira também por RPC42501/RLS vazio.
Nenhuma autorização foi ampliada para acomodar o teste.

[Três vínculos versão/arquivo](DOCUMENT_VERSION_HISTORY_BINDINGS.json) conferem
metadado incorporado, hash canônico do evento e SHA-256 final. Download repetido
mantém bytes; consultar/voltar não emite outro exemplar. Quinze fontes do lote
de fidelidade continuam com hashes idênticos, excluindo explicitamente o
consumidor de interface alterado. Não é nova validação independente de assinatura.

Uma inspeção read-only de48 snapshots sintéticos distintos por tipo/ação
orientou os rótulos. Nenhum campo de negócio desse conjunto ficou sem descrição;
isso não corresponde a48 fluxos executados nem à exaustão de C105/C106. Campos
futuros continuam com aviso de leitura parcial. As capturas móveis foram
inspecionadas; estados e quantidades receberam nomes/formato de leitura, sem
alterar os valores. Campos da ação são distintos do estado acumulado da ficha.

Axe e largura320/390/768/1440 foram conferidos no caso COM nos três motores;
ENT confirma teclado, retry e seleção durante resposta atrasada. Não há aceite
AT ou de aparelho físico. Os dois cron locais permanecem ativos. Provas,
contraprovas e limites estão em
[DOCUMENT_VERSION_HISTORY_EVIDENCE.json](DOCUMENT_VERSION_HISTORY_EVIDENCE.json).

## Estado do incremento publicado anterior

df49881 tem Preview READY no endereço estável, no mesmo SHA. O probe autenticado
conferiu os quatro assets públicos por tipo/tamanho/SHA-256, runtime200/ready,
API privada401 sem sessão da aplicação e proteção302 sem acesso Vercel.
[Recibo](PDF_FIDELITY_PREVIEW_OBSERVATION.json). Não equivale a sessão física
S24/Chrome/PWA ou entrega Push externa. CI42473738962 concluiu8/8 SUCCESS para
df49881. [Recibo por SHA](CI_DF49881_OBSERVATION.json). Essa CI não valida o
histórico novo ainda não publicado.

D-B permanece ativa. Local152/remoto152; nenhum SQL novo neste lote. PR7 Draft,
sem merge/promoção ou integração externa; Sonar adiado pelo responsável.
Matriz40 PASS/51 PARTIAL/14 NOT_STARTED, com29 colunas canônicas preservadas.
Idioma/HTML histórico avançam C111/C-NEW-AC-018 somente a parcial; estrutura
marcada do PDF, demais estados e gates D-C/D6 continuam próprios.

## Reconciliação posterior de C108 — D4.9

O [lote temporal e de rastreabilidade](ENT_TEMPORAL.md) reconciliou C108 com a
implementação D4.7 já comprovada. As13 fontes registradas de histórico/testes,
os consumidores de download/acervo e o lockfile permanecem iguais aos de
8a17202, cuja CI concluiu8/8 SUCCESS. Antes/depois/motivo e o arquivo da versão
escolhida completam a lacuna anterior. Nenhum teste histórico foi reclassificado
como nova execução; as falhas e coortes continuam preservadas. C108 passa
localmente, com AT/aparelho/D-C/D6 e CI do próximo SHA separados.
