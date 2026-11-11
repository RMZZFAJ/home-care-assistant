# BAL — parecer, aplicação e saldo documental

Complemento DOC-B em execução, vinculado às etapas07/09/10. Produção NO-GO.

## Implementação do lote

O parecer novo é identificado como opinião sem efeito de estoque. Resultados
individuais são opcionais e explícitos: material examinado, confirmado ou
diferença, encaminhamento e comentário próprios. Omissão não confirma o item.
Observações, contador e nomes da contagem permanecem preservados. Registros
antigos não recebem retrospectivamente a declaração de ausência de efeito.

A política obrigatória passa a exigir confirmação separada de aplicação.
A contagem facultativa mantém sua aplicação nativa, sem efeito repetido pelo
parecer posterior. A aplicação tem ator, instante, versão, chave e efeito
próprios. Exige revisões previstas, grupo autorizado, pessoa distinta de quem
contou e referência de estoque válida. Diferença apontada impede aplicação.
Parecer histórico continua possível; não autoriza aplicação sobre saldo novo.

A preparação privada conserva resultados e nomes legíveis dos materiais.
Sua confirmação vincula texto, resultado, encaminhamento, contagem e revisão
salvos. Rótulos não substituem a identidade congelada. A retomada requer
consulta e adoção explícita da referência antes de confirmar. A apresentação
simplificada de rascunhos continua no DOC-C, sem novo painel por este lote.

Uma intenção opaca e delimitada por pessoa/paciente/ficha é preservada antes
do envio da aplicação. Após resposta perdida, consulta GET recupera o ato
original; não há POST automático. Ausência confirmada permite reenvio explícito
da mesma chave e dados. Versão superada sem ato permite voltar à ficha atual.
Revogação de escrita não impede consultar o próprio resultado com leitura;
revogação de leitura mantém a referência sem expor o conteúdo.

## Saldo no exemplar

A aplicação registra saldos exatos em tabela privada, sem acrescentá-los aos
eventos e snapshots públicos. A nova revisão11 do BAL congela o fato pertinente
ao corte documental escolhido. Os demais tipos continuam na revisão10.
Nenhuma intenção ou arquivo anterior é refeito. O mesmo pedido nas entradas
antigas/novas recupera a identidade, revisão e fonte que já estavam congeladas.

Referência, Contado e Saldo após balanço são campos distintos. A aplicação
tem momento e autoria próprios. Sem aplicação: Não aplicado. Sem origem
comprovada: Não disponível no registro. Sem stock.team.read: Acesso restrito,
com quantidade nula, sem valor oculto no PDF. Após perda dessa leitura, o
exemplar anterior com valor privado não é entregue; pode ser solicitada outra
emissão mascarada. Concessão posterior não altera o exemplar já mascarado.

## Verificação e contraprovas

Qualificados36 cenários Auth distintos por união das rodadas dirigidas:32 de
parecer, preparação e aplicação; dois de emissão/corte/permissões; um consumidor
de reconto facultativo/obrigatório e um de fidelidade histórica. As primeiras
falhas e suas correções permanecem nos logs, sem contar o arquivo sem teste
selecionado como cenário adicional. Não houve reset local.

Qualificados35 testes unitários/contratos/PDF:28 de decisão, preparação e
acompanhamento; cinco de conteúdo BAL e quatro estados de aplicação; duas
seleções existentes de fidelidade, incluindo os bytes exatos V4/V5/V6 das
seis fontes controladas. Tipos e lint dos fontes afetados passaram.

Qualificados15 cenários de navegador em Chromium, mobile e iOS emulado:
12 passaram na primeira rodada; três novos passaram após cumprir a consulta e
adoção obrigatórias da referência restaurada. Foram18 execuções, com as três
falhas iniciais preservadas em output/phase-d-work/docb-browser-first. A rodada
final está em docb-browser-final. Cinco larguras e axe completo foram mantidos.
O fluxo confirma um único POST de aplicação, recarrega a página e recupera por
um único GET, inclusive após revogação da escrita. O estoque permanece idêntico
ao efeito original. O PDF é emitido pelo pipeline real com assinatura e TSA de
teste; suas quatro páginas Chromium e sete páginas controladas foram renderizadas
e inspecionadas. PyMuPDF instalado foi usado, pois Poppler não estava disponível.
A aparência desses exemplares ainda é a composição anterior, não o aceite DOC-A.

Logs dirigidos ficam em output/phase-d-work: docb-auth-consumers.log,
docb-auth-affected.log, docb-auth-late.log, docb-auth-pdf.log,
docb-final-consumers.log e docb-fidelity-final.log. A contraprova tardia usa
injeção transacional após o efeito, sem o ciclo artificial entre a barreira e
a invalidação do workspace. A espera de estoque com perda concorrente de
permissão continua provada separadamente. Uma tentativa adicional de aplicar
a fixture facultativa foi corretamente recusada; ela já tinha efeito nativo.
O consumidor foi restaurado e sua regressão histórica passou.

As verificações gerais, instalação limpa e evolução legada ficam na CI do SHA
publicado, conforme a regra de validação proporcional do repositório.

## Banco remoto

As migrations20261111183942,20261111192340,20261111193015,
20261111194511 e20261111201053 foram aplicadas uma vez ao alvo
qwfrqychokvhdzakibid, pelo CLI vinculado/skip-vault.
Preflight confirmou207 versões e os contratos das funções
alteradas; o dry-run isolou exatamente essas quatro pendências. Pós-validação
confirmou212 versões iguais às locais e dry-run vazio. A tabela privada mantém
RLS e acesso direto negado, inclusive service_role. As duas RPCs novas são
somente authenticated; auxiliares/trigger não têm execução pública. Todos os
cinco pontos conferidos mantêm SECURITY DEFINER e search_path vazio.

Advisors mantêm as cinco classes anteriores: a tabela privada fechada acrescenta
um INFO sem política(62→63); as duas RPCs acrescentam duas ocorrências de definer
authenticated(208→210). As outras contagens permanecem1/3/1. Essas classificações
não representam aprovação genérica dos alertas antigos. A revisão dos novos
grants e as negativas Auth estão acima. Não houve seed/Auth remoto, reset,
reconstrução, ativação externa ou novo backup redundante do banco descartável.
[Reconciliação e orientações](MIGRATIONS.md).

A checagem de performance posterior à primeira aplicação apontou ausência de
índice para a FK composta document_id/care_recipient_id. A migration adicional
20261111201053 acrescentou somente esse índice, após preparo local e dry-run
isolado. Não repete suítes funcionais cujo comportamento não mudou. Os índices
novos ainda sem uso são INFO esperado antes de tráfego representativo.

## Pendências finitas do complemento

Este lote não conclui DOC-B nem a fase: falta mostrar vínculo, momento e
resultado dos atos posteriores de correção de cada diferença, sem inferi-los
do simples encaminhamento. Seguem depois saldo COM, devolução cotidiana e
cancelamento/complemento, na ordem já consolidada. Aparência aprovada dos PDFs
é DOC-A; modalidades, Andamentos, acessos agrupados e retomada simples são
DOC-C. Integração completa e amostras finais são DOC-D. Provas locais com Auth
real e certificados internos de teste não são homologação humana, aparelho
físico, TSA independente ou ICP-Brasil.
