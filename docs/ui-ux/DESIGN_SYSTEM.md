# Sistema visual canônico

O [Modelo Integral](CANONICAL_MODEL.md) é a regra vigente desde 09/11/2026.
Fluent UI foi descartado como aparência. O
[HTML original](../../Home_Care_Assistant_Modelo_Integral.html) governa todo o
sistema, sem misturar estilos ou reduzir funcionalidades.

Tokens e componentes devem reproduzir o modelo. A primeira migração introduz
canonical-ui.css, ícones próprios do HTML, badges e etapas nativos, overlays
Base UI sem tema e drawers compartilhados. Ainda há consumidores Fluent a
migrar: trabalho pendente, não alternativa visual aprovada. Remover provider,
Griffel, imports, estilos e dependência Fluent ao terminar a migração integral,
com regressões dos consumidores. Não criar ponte que apenas reproduza sua API.

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

## Aceite

Comparar produto e modelo em cinco viewports; testar teclado, retorno de foco,
contraste, disabled, zoom, mobile e movimento reduzido. Preservar todas as
funções, recursos, dados, operações e contraprovas. Só aprovar com aparência
coerente em todos os consumidores, paridade funcional e CI do SHA publicado.
Consultar o [registro de execução](../audits/D/D-B/UI_MODEL_ACCEPTANCE.csv).
