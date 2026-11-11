# Sistema visual canônico

O [Modelo Integral](CANONICAL_MODEL.md) é a regra vigente desde 09/11/2026.
Fluent UI foi descartado como aparência. O
[HTML original](../../Home_Care_Assistant_Modelo_Integral.html) governa todo o
sistema, sem misturar estilos ou reduzir funcionalidades.

Os PDFs têm [referência documental própria](../documents/03_ESPECIFICACAO_DOCUMENTAL_APROVADA.md),
autorizada em 11/11/2026. A composição impressa não substitui este sistema visual
da aplicação; autoria, estados e ícones conservam o significado compartilhado.

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

MaterialChoice reproduz productoption: seleção, nome e unidade permanecem
juntos. Quantidades, apresentações e referências complementares ficam visíveis
sem comprimir o nome. DocumentMaterialsTable compartilha a tabela/cartão de
materiais e sua busca local, com indicação do filtro e limpeza pelo teclado.
Cada consumidor preserva suas colunas: PurchaseMaterials mantém proposto,
aprovado, adquirido, validado e os quatro saldos da expectativa separados.
Consulta indisponível recebe texto explícito, sem presumir quantidade zero.
MaterialReview apresenta nome e detalhes completos em leitura, separando
observação, instante, urgência e motivo. Quantidades continuam com sua unidade;
o resumo não cria outro editor nem transforma observação em pedido de compra.
DeliveryMaterials conserva expedição, aceite pessoal, conciliação e pendência
separados, com unidade. Antes da expedição bilateral apresenta só declarado.
Recebimento, cancelamento e apuração usam DefinitionGrid para seus fatos em
leitura; consumo confirmado não ganha input nem novo débito na apresentação.

BalanceMaterials compartilha a tabela/cartão e a busca reversível de materiais.
Contagem física, referência e diferença têm colunas próprias, com unidade e
precisão exatas. Referência ausente não vira zero nem diferença calculada.
Programação do BAL, responsabilidade, contagem consultada e adiamentos usam
DefinitionGrid; destino congelado e situação atual permanecem distintos.
Campos físicos começam vazios; a observação inicial não expõe o saldo teórico.

ScheduleShift mantém pessoa, tipo, intervalo completo, fuso, situação, notas e
ação nativa. O celular usa o registro do modelo; o calendário conserva os sete
dias e o período completo, com rolagem horizontal local acessível por teclado.
As superfícies e os ícones compartilham a paleta canônica. Antes/depois e
revisões de programação usam DefinitionGrid sem transformar fatos em inputs.

DeliveryTaskRow reproduz o registro e ícone das entregas do modelo, com nomes
históricos, percurso, situação e ação nativa. Fatos ausentes recebem texto
explícito; declaração, concordância e conferência pessoal continuam distintas.
As três visões preservam filtros e páginas na URL. Tarefa desatualizada fica
suspensa, preservando foco; consulta da ficha permanece disponível sob sua
autorização própria. Abas inativas usam o token muted acessível da paleta:
o tom literal do HTML falhou AA. As novas superfícies respeitam cores forçadas.

TableFrame compartilha a superfície de tabela/cartões, com rolagem local e
foco visível por teclado. Catálogo preserva aliases e precisão; apresentações
preservam código textual, fator, situação e versão. Cadastros e comparações
usam DefinitionGrid; nenhuma conversão é inferida apenas pela aparência.

O histórico de movimentos identifica nomes/unidades do cadastro atual e abre
a origem preservada sob sua autorização própria. Consulta, compensação,
referências e atalhos permanecem separados. Trânsito conserva expedido,
aceito, conciliado e pendente em leitura; esses valores não viram saldo.

ConsumptionRecord reproduz o registro e ícone do modelo. Texto completo,
autoria histórica, instante, custódia e situação permanecem visíveis. Materiais
de relato e complemento usam MaterialReview; metadados e decisões usam a grade
compartilhada. Relatar, complementar, confirmar e debitar continuam atos próprios.
O texto integral exige a variante móvel de conteúdo longo: ícone e conteúdo
ficam em duas colunas; situação e ação vêm abaixo do texto, como as ações dos
registros de arquivos do modelo. Conserva espaçamentos, paleta e componentes,
sem comprimir o relato numa coluna estreita ou ocultar trechos.

FileRecord compartilha a composição de arquivos do modelo entre anexos,
exemplares assinados e arquivos legados. Nome, fatos e ações permanecem
integrais; no celular as ações vêm abaixo do conteúdo. O abandono de uma
reserva usa Dialog compacto com retorno ao acionador ou à atualização da seção.
Não transforma arquivo pronto em reserva descartável.

O histórico documental usa eventos cronológicos e DefinitionGrid para fatos
e diferenças, com chaves estáveis da fonte quando rótulos se repetem. A
consulta pública separa código, exemplar, integridade, assinatura, confiança
e tempo, sem receber aparência de detalhe privado. A comparação privada
empilha as duas edições em telas estreitas e conserva cada texto completo.
As regras de retomada simples do complemento documental têm escopo próprio.

## Aceite

Comparar produto e modelo em cinco viewports; testar teclado, retorno de foco,
contraste, disabled, zoom, mobile e movimento reduzido. Preservar todas as
funções, recursos, dados, operações e contraprovas. Só aprovar com aparência
coerente em todos os consumidores, paridade funcional e CI do SHA publicado.
Consultar o [registro de execução](../audits/D/D-B/UI_MODEL_ACCEPTANCE.csv).
