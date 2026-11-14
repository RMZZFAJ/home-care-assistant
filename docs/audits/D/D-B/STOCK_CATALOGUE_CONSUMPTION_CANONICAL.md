# Estoque, catálogo e consumo — fechamento local de 06.4

D3.83 conclui as 12 composições EST/CAT/CON previstas no ponto06.4, no
escopo local. A etapa06 conserva06.5–06.6 e a conferência conjunta.
[Resultados dirigidos](STOCK_CATALOGUE_CONSUMPTION_CANONICAL_VALIDATION.json).

## Composições e preservação

EST-01 reaproveita a qualificação canônica anterior de StockOverview: fonte,
auxiliares e contratos de saldos/filtros não mudaram. O CSS novo está restrito
a TableFrame, trânsito e relatos; não é reaproveitamento de aparência Fluent
histórica nem aprovação nova da fase inteira.

EST-02 conserva movimentação familiar, preparação privada e correção por
referência exata. EST-03 apresenta movimentos em tabela/cartões, com instante,
percurso, quantidade oficial, causa, identificação e ações nativas. Nomes e
unidades são identificados como cadastro atual; a origem autorizada preserva
os fatos documentais. A RPC de histórico não fornece nomes históricos; a UI
não os inventa. Permissão de estoque não concede leitura de outra ficha.
Trânsito separa expedido, aceito, conciliado e aguardando conferência, usando
nome/unidade preservados na ficha de origem; não transforma pendência em saldo.

CAT-01–CAT-05 conservam catálogo, unidades e precisão, apresentações,
situações/sucessores e identificação de embalagem. TableFrame compartilha
superfície, foco visível e rolagem local. Nomes alternativos e precisão ficam
visíveis. Códigos continuam textuais com zeros à esquerda; a conversão usa
valor exato. Revisões e comparações usam DefinitionGrid. Nenhuma decisão de
sucessor, inativação, adoção ou autorização foi substituída pela aparência.

CON-01–CON-04 conservam lista, relato, complemento e decisão. ConsumptionRecord
mantém texto integral, nome original, instante, versão, custódia e situação.
MaterialReview apresenta os materiais declarados e a grade separa as autorias.
Relatar e complementar não debitam estoque; conferência e rejeição mantêm
seus efeitos nativos e suas autorizações.

O registro móvel de relato usa a variante de conteúdo longo: ícone e texto em
duas colunas, com situação/ação abaixo do conteúdo. Segue a disposição das
ações móveis dos arquivos do modelo, mantendo paleta, espaçamentos e
componentes. Evita comprimir todo o texto em uma coluna estreita. Nada foi
truncado ou ocultado. A disposição corrigida foi inspecionada novamente.

## Qualificação e contraprovas

Foram qualificados54 cenários distintos:42 aprovações iniciais inalteradas,
oito da segunda rodada e quatro finais. Os52 casos iniciais cobrem os três
perfis; dois consumidores antigos adicionais conferem edição/inativação e
foco por teclado do editor. Contagens não somam repetições como novos casos.
Tipos e lint dos arquivos afetados passaram.

As novas composições comparam superfície, tabela/cartão e registro/ícone com
o HTML isolado em320/390/768/1024/1440px. A variante longa móvel também exige
largura útil de texto, ações abaixo e ausência de sobreposição. Axe completo,
cores forçadas e movimento reduzido; capturas320 de catálogo, movimento e
relato inspecionadas. O teste de teclado conserva Escape, continuar,
descartar, foco e bloqueio durante envio, aguardando habilitação antes de
focar. Capturas usam rolagem real e hit-tests; sem ocultar a navegação.

Preservadas as asserções nativas de Auth/RLS, precisão, sucessores de outra
unidade, histórico com mais de100 movimentos, páginas/filtros, consulta
incompleta, perda de acesso, conflito, resposta perdida e efeito único.
O scanner percorre imagem EAN sintética real, alternativa manual e câmera
negada controlada. Isso não comprova câmera física nem fornecedor.

A primeira rodada teve45 aprovações e sete falhas: timeout do Auth local
antes da UI, três seletores de célula antiga e três alvos pequenos no link de
origem. A segunda teve oito aprovações e uma falha no teste que tentou focar
um botão ainda desabilitado na consulta inicial. A inspeção revelou o relato
estreito, corrigido e requalificado nos três perfis na rodada final.
Artefatos e relatórios anteriores permanecem no diretório ignorado.
Nenhuma regra, asserção operacional ou limite de espera foi reduzido.

## Banco e limites

Sem SQL novo. Remoto207 reconciliado; dry-run final vazio, sem sincronização
do Vault, reset, alteração de Auth ou fixtures remotas. Instalação limpa e
evolução legada continuam na CI do próprio SHA, sem reset local redundante.

Os105 estados originais permanecem57PASS/48PARTIAL e os18 estados UI não foram
promovidos. Etapa06 estimada95%, visual global80%; estimativas não aprovam
individualmente as66 composições ou171 relações. DOC-A/B/C/D têm blocos
próprios, incluindo a nova regra de parecer BAL sem efeito de estoque.

Conferência conjunta, AT, zoom nativo400%, aparelho físico e provedores mantêm
seus gates. Sonar: OWNER_DEFERRED_SONAR_CONFIGURATION, sem aprovação do Quality
Gate. A CI deve validar o SHA publicado. PR7 Draft, sem merge ou produção.
Próximo:06.5, arquivos, rascunhos e seções documentais.
