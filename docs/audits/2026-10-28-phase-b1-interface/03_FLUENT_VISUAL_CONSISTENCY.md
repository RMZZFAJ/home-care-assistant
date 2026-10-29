# B1.2 — Consistência visual e sistema Fluent

Produto `37cb7f85e96e551d6419871f94dd950712e2565b`; execução local atual.
Esta avaliação usa a cascata computada e capturas atuais. A coexistência de
Fluent, controles nativos, utilitários e classes antigas não constitui defeito.

## Método e alcance

Foram examinadas 25 combinações página/largura: painel e identificação REQ em
320, 390, 768, 1440 e 1920; COM, estoque familiar, unidades, perfil, escalas e
histórico em 390/1440; permissões em 320/390/1440. Um drawer de catálogo foi
examinado em 320. [Medições](evidence/b12-visual.json) e
[drawer](evidence/b12-drawer.json) registram retângulos, fonte, cor, fundo,
borda, raio, padding, opacidade, foco e contêineres com overflow.

As seis folhas `b12-*-sheet-*.png` foram abertas. Seus mapas delimitam a região
vista. As capturas originais de painel e REQ em 1440 também foram abertas para
legibilidade. PDFs REQ/COM/ENT tiveram seis páginas abertas individualmente.
O restante dos estados visuais está indicado na cobertura; não se atribui
inspeção de todo o documento a uma fotografia do primeiro viewport.

A primeira tentativa de abrir o drawer usou seção e nome de botão incorretos.
Foi falha do reprodutor, preservada no JSON; a prova suplementar usa
`/admin?section=catalog` e `Novo item`. O produto não foi alterado.

## Fundação e resultado final

`layout.tsx` importa globals, design-system e tokens nessa ordem. O provider
usa `webLightTheme` e altera a cor disabled para `#616161`. Os estilos legados
verdes continuam no código, mas o resultado medido do botão Avançar e da etapa
ativa é azul `rgb(15,108,189)`. O texto principal medido é `rgb(36,40,46)`.
O foco de Nova unidade resulta em contorno azul sólido de 2 px. Não se deve
diagnosticar a cor final lendo somente a primeira declaração de `:root`.

Em 390, o seletor de paciente mede 44 px de altura e fonte 16 px; em 1440,
36 px e 13 px. Avançar mede 44 px no móvel; etapas medem 44/36 px, conforme
largura. Inputs Fluent internos medem 42 px em 390 e no drawer 320, dentro de
seu controle composto. Avaliar área acionável completa, label e espaçamento,
em vez de chamar toda caixa interna menor que 44 px de falha WCAG.

As 25 páginas tiveram `documentWidth === viewportWidth`. Permissões mantém
rolagem interna da matriz; REQ estreita mantém rolagem das etapas. Isso evita
estouro global, mas transfere esforço de localização para o usuário. Não
comprova reflow de cada linha, texto longo ou conteúdo ampliado.

## Comparações e decisões proporcionais

| Antes observado | Alvo recomendado | Fundamento e exceção |
| --- | --- | --- |
| Matriz tem nome fixo e várias funções fora do viewport 320/390 | Filtro por função/pessoa e editor focalizado com antes/depois | Preservar visão comparativa desktop; não substituir todas as células por cards |
| Cartões de perfil fechados ocupam grande parte do primeiro viewport | Abrir seção por intenção e oferecer link direto a preferências | Accordion já organiza bem; não expandir todos os formulários por padrão |
| Identificação REQ ocupa uma página simples antes de haver seleção | Comparar cabeçalho compacto e ajuda essencial com usuários | Identidade e regra de REQ sem quantidade solicitada são informação necessária |
| Título h1 REQ 20 px e h2 Identificação 20 px | Reduzir peso do título de etapa ou reforçar nível da tarefa | É refinamento de hierarquia, não ausência de heading semântico |
| Botões finais quebram em duas linhas no móvel | Manter primária destacada e próxima ao formulário; medir alcance | Não fixar mais uma barra sem testar colisão com navegação inferior |
| Disabled aplica opacidade .45 também ao valor herdado de permissão | Manter rótulo e estado efetivo legíveis, bloqueando só a ação | Texto disabled tem exceção de contraste; dificuldade de consulta continua plausível |
| Estoque alterna tabela desktop e cards mobile | Preservar mesma ordem, unidade e situação nos dois formatos | Variante móvel é apropriada; não impor tabela larga a todas as tarefas |
| Confirmações usam resumos com diferentes níveis de detalhe | Padrão compartilhado objeto → antes/depois → efeito → motivo | O conteúdo do resumo depende do comando; não basta trocar o componente |
| PDF tem seção de rastreabilidade em página própria, com espaço livre | Preservar separação e testar impressão; reduzir branco só se útil | Não classificar espaço em branco como defeito sem necessidade de impressão |
| Labels e ajuda de campos são heterogêneos | Label acima, ajuda essencial abaixo, erro associado ao campo | Campos simples não precisam ganhar tooltip ou texto redundante |
| Seleção de material e sucesso usam tratamentos visuais diferentes | Tokens próprios para seleção, atenção e resultado | Não recolorir todos os estados para azul e perder a distinção de negócio |

O [catálogo de padrões](03_COMPONENT_PATTERNS.csv) identifica consumidores,
variantes, provas, alvo e exceções. Os diagnósticos por tela preservam as
diferenças entre operação e gestão.

## Contraste, toque, foco e densidade

`axe-core` foi executado apenas com a regra `color-contrast` em REQ, estoque,
permissões e histórico no último viewport dessas séries: zero violações
detectadas; respectivamente 2, 1, 1 e 1 grupos de nós inconclusivos. Este
resultado não é conformidade global nem prova de estados hover/disabled/erro.
Itens inconclusivos e labels dinâmicos continuam na validação manual proposta.

A referência AA de área de alvo é 24 × 24 CSS px com exceções de espaçamento,
equivalência e conteúdo inline. A meta de conforto de 44 px é recomendação
operacional para uso móvel. Os dois critérios não são intercambiáveis.
[W3C — Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

A inspeção não encontrou popover cortado nas provas de menu desta execução.
Não foram homologados teclado virtual, VoiceOver/TalkBack/NVDA, alto contraste
do sistema, modo escuro ou hardware. A configuração só oferece tema claro;
não há evidência suficiente para tornar modo escuro uma prioridade de B1.

## Segunda passada e contraditório

A pessoa com pouca prática precisa identificar a tarefa, a pessoa atendida e
o resultado. Mais cards, ícones e confirmações não asseguram essa clareza.
Os maiores riscos encontrados são semânticos: um resumo sem objeto pode ter
aparência impecável e ainda impedir decisão informada. Antes de redesenhar,
priorizar os resumos e os estados de consulta incerta.

Recusadas nesta auditoria: reescrita integral em Fluent; transformar todo
checkbox em switch; substituir toda tabela por cards; fixar todas as ações;
eliminar confirmações críticas; tratar fontes pequenas isoladamente como
violação sem medir contraste/zoom/contexto. São propostas com custo e risco
sem benefício demonstrado. A dívida de CSS existe, mas a prioridade depende
de um consumidor com variação observada.

As recomendações seguem a organização de
[Field](https://fluent2.microsoft.design/components/web/react/core/field/usage),
[Drawer](https://fluent2.microsoft.design/components/web/react/core/drawer/usage)
e [Dialog](https://fluent2.microsoft.design/components/web/react/core/dialog/usage).
Essas fontes orientam composição e contexto; não impõem copiar a marca
Microsoft nem converter o produto inteiro a um único controle.
