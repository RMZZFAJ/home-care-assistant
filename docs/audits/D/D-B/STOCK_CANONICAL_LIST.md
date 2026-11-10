# D3.45 — consulta de saldos no modelo canônico

A lista de saldos usa uma única tabela semântica. No breakpoint de850px do
Modelo Integral, as mesmas linhas tornam-se cartões de duas colunas. Nomes,
unidades, mínimo, situação, trânsito, projeção, custódia e consulta permanecem
inteiros e disponíveis. Os cabeçalhos continuam na árvore acessível; não há
duas cópias dos controles por viewport. As antigas regras exclusivas de estoque
foram retiradas de tokens.css e substituídas na folha canônica.

No desktop, seis colunas conservam todos os dados: Material (nome, custódia,
unidade e inatividade), Saldo confirmado, Mínimo, Situação, Previsões (trânsito
e projeção, cada qual rotulada) e Consulta. Colunas dimensionadas evitam que um
nome extenso comprima unidades e botões; rolagem, quando necessária, fica no
contêiner da tabela, com acesso por teclado. Quantidade e unidade têm linhas
próprias. No celular, a mesma estrutura vira cartões sem ocultar os valores.

O filtro de situação usa somente o saldo confirmado e quantidades decimais
exatas. Mínimo ausente não significa zero nem regularidade. Igualdade recebe
“No mínimo”; valor menor recebe “Abaixo do mínimo”; saldo negativo é explícito.
“No mínimo ou abaixo” conserva a semântica inclusiva do limite operacional
existente. Trânsito e compras pendentes continuam separados do disponível.
Material inativo com saldo mantém identidade e custódia. Divergência aparece
também na tabela de desktop e permanece discriminada no detalhe.

Busca, custódia ou situação reiniciam somente a paginação dos saldos. Mudanças
nesses filtros não apagam o editor de movimento familiar ou os filtros do
histórico, que continuam no consumidor original. Há15 linhas por página,
contagem do conjunto filtrado e acesso aos itens posteriores à primeira página.
O detalhe mantém consumo extraordinário, divergência e todas as projeções;
fechar devolve foco ao acionador. Saldo não vira campo editável.

O texto de retomada das preparações por recurso deixou de recomendar revisão
de catálogo quando a operação não tem materiais. As demais preparações
conservam a orientação documental existente. Não houve mudança de API, banco,
Auth, autorização, comando, PDF, assinatura, PWA ou notificação.

## Prova e limites

A [validação](STOCK_CANONICAL_LIST_VALIDATION.json) separa os testes novos,
consumidores anteriores e rodadas com falha. Há oracle de ledger/documentos,
consulta Auth independente e tentativa de movimentação familiar recusada para
a equipe. A coleta não é execução e o sucesso anterior não aprova fonte alterada.

7 unitários,tipos e lint passam. São16 identidades browser qualificadas:
oito de estoque repetidas na composição final,sem flaky,mais oito consumidores
CI/PDF/foco das rodadas anteriores de produção. Reuso exclui todos os casos da
tabela alterada. Fontes globais/consumidores conservados,diferenças CRLF
discriminadas e alterações finais limitadas à composição de estoque,seu CSS
e captura de sucesso. Demais consumidores localizados continuam na CI completa;
não se afirma execução local de todos eles. Sem suíte mutável paralela.

Local/remoto177 com versões/digest iguais. Dry-run oficial vazio antes do
commit;sem SQL novo,mutação remota,reset ou backup redundante.

A conformidade completa de EST-01 continua pendente:composição geral de abas,
trânsito e histórico,estados extremos adicionais,zoom/contraste e gates humanos
exigem seus próprios percursos. Esse incremento não fecha as66 composições,
as171 relações ou todos os critérios de listas. A CI do SHA publicado precisa
validar o candidato completo; Sonar continua adiado,PR7 Draft,sem merge/produção.

## Causas corrigidas e contraprovas

A geometria inicialmente falhou em500px:691px de largura rolável. Os primeiros
probes de cabeçalho eram inconclusivos; suas variantes não alteraram a falha.
A medição de glifos identificou nomes extensos sem espaços nos parágrafos do
histórico, embora as caixas dos elementos coubessem. O recorte isolado com o
mesmo CSS reproduziu691px e a quebra herdada corrigiu500/320 nos dois motores.
Os percursos autenticados finais passaram nas cinco larguras dos dois motores.
Instrumentação de falha conserva somente medidas, tags, classes e comprimento
do texto, sem registrar conteúdo privado. Tentativas e falhas ficam separadas
na validação; nenhum probe isolado substitui a prova integrada.

O selo do detalhe usava texto secundário com contraste insuficiente sobre o
fundo tintado; agora usa a cor de texto canônica. A inspeção visual de capturas
aprovadas pelos testes revelou colunas comprimidas; a composição de seis
colunas foi implementada e os oito consumidores de estoque foram repetidos.
Capturas finais de tabela desktop e cartão inteiro320px conferidas.

A CI46a3d3c terminou FAIL:três projetos ainda procuravam o título BAL antigo;
o consumidor agora localiza o título e os campos reais, conservando os efeitos
e a leitura sem comandos. O breadcrumb Fichas tinha18px; o alvo agora tem no
mínimo24px. A auditoria após redimensionamento parte do topo, como a regressão
de estoque anterior, sem manter o alvo parcialmente sob o cabeçalho fixo.
Regras, expectativas de autorização, ledger e documentos não foram retiradas.
As quatro definições flaky dessa CI também receberam rechecks dirigidos;
sucesso local isolado não comprova eliminação de intermitência na CI.

A [observação histórica](CI_46A3D3C_OBSERVATION.json) conserva os nove jobs,
falhas, reexecuções e Preview READY. Banco, Windows, Ubuntu e ios-1 passaram;
mobiles, ios-2, Chromium e agregado falharam. Não há aprovação global desse SHA.

## Continuidade real dos formulários

A inspeção dos consumidores ativos conserva como implementação pendente os
preenchimentos privados de movimentação familiar,relato/complemento/decisão de
consumo e revisões de fluxo. Seus comandos e recuperações locais existentes
não comprovam rascunho entre sessões. A ausência de useCreationDraft foi
conferida junto do estado em memória e dos respectivos pontos de envio,sem
inferir perda de atos já persistidos. inventory-console.tsx não tem consumidor
ativo encontrado e não foi removido nem transformado em novo fluxo autorizado.
O quadro e a matriz explicitam essas pendências,sem concluir D-B-AC-001.

A decodificação defensiva de resposta200 de saldos também permanece um ponto
da revisão transversal de consultas: o hook aceita decoder, mas esse consumidor
não o fornece. Os casos deste lote provam503/vazio/última leitura e isolamento
de filtro; não aprovam payload200 malformado para estoque.
