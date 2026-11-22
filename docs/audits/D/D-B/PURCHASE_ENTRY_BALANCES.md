# DOC-B.2 — Saldo histórico por material da COM

Incremento do complemento aprovado em 11/11/2026. DOC-B.2 concluído localmente
no escopo descrito; a fase D-B e o restante do complemento continuam parciais.

## Comportamento implementado

Cada material conserva o saldo FAMILY imediatamente após sua última parcela
validada naquela COM, até a versão escolhida. O instante é o da validação da
parcela, que pode diferir entre os materiais. Não se usa saldo atual, estoque
da equipe, soma de entradas ou coincidência de quantidade/nome como substituto.
Adquirido, entrada validada acumulada e quantidade da última parcela permanecem
valores separados, com unidades. Parcelas preservam declaração, validação,
responsáveis, instantes, identificadores e rejeições próprias.

A captura ocorre na transição nativa pending→approved, depois dos créditos de
estoque e na mesma transação. Revalidação sem nova transição não captura outra
entrada. Perda tardia de autorização reverte parcela, movimentos, fato privado
e evento. As capturas são imutáveis, fechadas por RLS/grants e indexadas pelas
referências. Não há reconstrução retroativa de valores legados.

A leitura usa o primeiro evento aprovado de cada parcela; depois escolhe o
último desses atos para cada material. Uma repetição posterior de validação não
passa a ser uma nova entrada. A linha permanece vinculada à mesma COM, parcela,
material e versão. Estado sem entrada validada, saldo histórico indisponível e
acesso restrito são distintos; nenhum deles é substituído por zero.

## Ficha e emissão

PurchaseMaterials mantém todas as colunas anteriores e acrescenta o saldo,
a validação própria e a referência da parcela. Uma resposta bem-sucedida com
vínculo divergente recebe aviso e reconsulta; não fabrica saldo. A verificação
de consistência não concede autorização, que continua no banco e na API.

A reserva atual V13 escolhe revisão13 para COM,12 para BAL e10 para REQ/ENT.
Somente a nova emissão COM congela purchaseEntryBalances, fora do conteúdo
canônico. Hash, eventos, nomes e exemplares anteriores não são reescritos.
A composição técnica mostra valores por material e os atos da última entrada,
seguida da expectativa e de todas as parcelas. A aparência aprovada em DOC-A
continua pendente; este incremento não a declara concluída.

O oráculo independente confere células, valores, parcela, evento, versão,
responsáveis e instantes a partir da fonte congelada. Recusa origem estranha,
corte futuro, duplicação, linhas ausentes e estados contraditórios. Emissão sem
stock.family.read congela null/Acesso restrito. Perder a capacidade bloqueia o
exemplar antigo com valor, inclusive nas entradas antigas de recuperação.
Ganhar acesso depois não altera o mascaramento de um exemplar preservado.

## Verificações concluídas

- Três cenários Auth nativos: datas e parcelas distintas, estoque interveniente,
  rejeição/pendência, revalidação, concorrência da mesma chave, leitura restrita,
  revogação e rollback após perda tardia de autorização.
- Dois cenários Auth documentais: cortes anterior e posterior, fatos canônicos
  preservados, intenção antiga V10, todas as entradas antigas de recuperação,
  revogação e mascaramento imutável.
- Cinco testes de consistência/PDF e um contrato HTTP;25 regressões do gerador
  anterior. Incluem decimais, totais acumulados diferentes da última parcela,
  dados ausentes/restritos, fontes contraditórias e oráculo negativo. Controles
  V4/V5/V6 preservam bytes anteriores.
- Três casos de navegador qualificados em build de produção, nos perfis
  Chromium, Android e iOS. Cinco larguras, axe completo, teclado, parcelas,
  geração assinada, revogação, resposta200 divergente e reconsulta segura.
  Quatro páginas controladas e cinco nativas foram inspecionadas, além da
  apresentação móvel. Certificado/TSA são internos de teste.
- Contraprova SQL document-invariants alinhada ao parecer BAL sem estoque:
  opiniões próprias, referência histórica, aplicação obsoleta recusada por
  PT409, nova contagem e aplicação explícita. Sem reset.

## Rodadas e limites

A primeira preparação de fixture tentou mudar a precisão de uma unidade com
histórico; a guarda recusou. A fixture foi corrigida, preservando a proteção.
A primeira conferência de texto do novo PDF esperava capitalização diferente
do título real; somente a expectativa correspondente foi ajustada e repetida.
Os resultados finais dos casos afetados passaram.

A primeira rodada de navegador terminou no prazo de prontidão do servidor,
antes de executar casos. O diagnóstico de build estava em type-checking; os
processos encerraram. Essa rodada não conta como teste de uso aprovado.

A rodada seguinte encontrou seletor de alerta ambíguo com o anunciador de rota
do Next. O Chromium chegou à emissão/revogação; os demais casos foram
interrompidos para evitar repetir a mesma falha. Artefatos e exemplares foram
preservados. O seletor passou a usar a aba Materiais; os três casos completos
passaram na rodada final, sem retirar asserções ou aumentar limites.

As migrations216/217 foram aplicadas no remoto autorizado, com histórico igual
ao local, dry-run vazio, RLS/grants/auxiliares/índices conferidos e alertas novos
delimitados. Não houve reset, seed, alteração Auth ou ativação externa.
[Reconciliação](MIGRATIONS.md).

A CI precisa validar o SHA publicado,
incluindo instalação limpa, evolução legada e integração completa. Sonar está
adiado pelo responsável. Testes físicos, tecnologia assistiva, uso humano e
liberação operacional continuam gates próprios. Produção NO-GO.
