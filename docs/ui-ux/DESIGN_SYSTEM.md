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

## Aceite

Comparar produto e modelo em cinco viewports; testar teclado, retorno de foco,
contraste, disabled, zoom, mobile e movimento reduzido. Preservar todas as
funções, recursos, dados, operações e contraprovas. Só aprovar com aparência
coerente em todos os consumidores, paridade funcional e CI do SHA publicado.
Consultar o [registro de execução](../audits/D/D-B/UI_MODEL_ACCEPTANCE.csv).
