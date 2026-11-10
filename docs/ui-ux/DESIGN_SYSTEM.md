# Sistema visual canônico

O [Modelo Integral](CANONICAL_MODEL.md) é a regra vigente desde 09/11/2026.
Fluent UI foi descartado como aparência. O
[HTML original](../../Home_Care_Assistant_Modelo_Integral.html) governa todo o
sistema, sem misturar estilos ou reduzir funcionalidades.

Tokens e componentes devem reproduzir o modelo. canonical-ui.css concentra a
paleta, os componentes compartilhados e o shell. Ícones próprios do HTML,
badges e etapas nativos acompanham overlays Base UI sem tema. Fluent, seu
provider, Griffel e a dependência foram retirados. Não reintroduzir a biblioteca
ou criar ponte que reproduza sua API. A remoção técnica não aprova por si só a
paridade visual de todas as telas, estados e recursos.

Controles nativos compartilham ActionButton/ActionLink, FormField, TextInput,
SelectField, TextAreaField, CheckboxField, Pill, LoadingIndicator e DataTable.
Usam props/eventos HTML:capturar valor/checked antes de updater adiado,sem
callback Fluent de dois argumentos. FormField associa label,ajuda e erro ao
ID do controle;outputs não recebem validação de input. FeedbackBanner e
ProgressMeter representam fatos sem confundir persistência,ciência ou entrega.
Seletores compostos usam SearchSelect, com IDs e consulta separados. Só a edição
real do texto invalida a seleção; a limpeza interna da busca ao fechar o popup
não altera o valor escolhido. Menus, popovers e tooltips usam comportamento
Base UI e aparência própria. [Provas e gates](../audits/D/D-B/UI_MODEL_ACCEPTANCE.csv).

O shell usa o breakpoint de 850px do modelo. No celular, uma linha de contexto
de 51px mantém o seletor real de paciente abaixo do cabeçalho de 59px. Esse
recurso operacional, ausente da demonstração, não pode ser ocultado para copiar
sua composição. Todas as rotas e permissões continuam disponíveis; grupos da
navegação começam abertos e podem ser recolhidos.

## Componentes e comportamento

Usar componentes reutilizáveis para botões, campos, badges, banners, cards,
listas/tabelas móveis, modais, drawers, menus, navegação, abas, cabeçalhos de
ficha, progresso e Andamentos. Recursos ausentes do HTML seguem a mesma
linguagem. Comportamento acessível pode usar biblioteca sem aparência;
não substituir a direção aprovada por tema pronto.

Estados conservam texto e cor semântica. Quantidades e estoque usam contratos
exatos. Dados indisponíveis não viram zero, vazio ou aprovação. Leitura e
escrita incerta têm recuperação própria, foco visível e autorização real.
Revisões são leitura; validação aponta campos editáveis legítimos.

DocumentHeader compartilha identificação, grade de dados e progresso separado
da cronologia. O cabeçalho completo é h1; a consulta embutida mantém h2.
DocumentActionSlot posiciona os controles reais de PDF e Andamento na barra,
conservando estado, autorização e intenção no consumidor original. Atualização
preserva foco; leitura recusada retira os dados e oferece retomada legítima.

A consulta de saldos usa DataTable com uma única estrutura semântica para
cada linha. hca-mobile-records transforma a linha em cartão no breakpoint
canônico de850px,com cabeçalhos acessíveis e rótulos visuais. Números conservam
unidade e precisão; mínimo ausente,zero,igualdade e valor abaixo são distintos.
Projeções não viram disponível. Filtros reiniciam a paginação do conjunto de
saldos sem apagar outros editores ou consultas da página.
Nomes extensos não comprimem as colunas: custódia acompanha o material;
trânsito e projeção têm rótulos completos na coluna Previsões. Rolagem de
tabela é local e acessível por teclado; valores permanecem íntegros.
Breadcrumbs interativos conservam alvo mínimo de24px. Títulos longos de
diálogo quebram sem expulsar seu controle de fechamento.

DefinitionGrid reproduz a composição kv do Modelo Integral:duas colunas,
rótulo de11px,texto de13px,intervalo14px (13px no celular),sem corte de valores.
Notas e referências extensas podem ocupar a linha inteira. O resumo privado
de estoque compartilha essa composição na oferta,revisão e consulta do resultado.

## Aceite

Comparar produto e modelo em cinco viewports; testar teclado, retorno de foco,
contraste, disabled, zoom, mobile e movimento reduzido. Preservar todas as
funções, recursos, dados, operações e contraprovas. Só aprovar com aparência
coerente em todos os consumidores, paridade funcional e CI do SHA publicado.
Consultar o [registro de execução](../audits/D/D-B/UI_MODEL_ACCEPTANCE.csv).
