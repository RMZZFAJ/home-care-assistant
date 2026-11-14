# Modelo Integral — seletores compostos, menus e shell

Base 47be435. Lote incremental D3.28, sem conclusão da D-B ou aprovação da
aparência integral. [Fontes e limites](UI_MODEL_STAGE_3.json),
[regressões e observações](UI_MODEL_COMPOSED_BROWSER.json).

## Implementação

SearchSelect compartilha seleção explícita por ID, consulta controlada, opções
ricas, múltipla seleção, labels, ajuda, erros e required. Os consumidores mantêm
seus filtros de elegibilidade, aliases, códigos, materiais inativos com saldo,
limites e escolhas já adicionadas. Digitar não seleciona automaticamente.
O popup e o teclado usam Base UI 1.9.0, sem aparência pronta.

Menus administrativos, decisões de permissão, perfil/contextos, saída, sino de
notificações e tooltips passam a componentes compartilhados. Mantidos filtros
de autorização, confirmação crítica, intenção congelada, consulta posterior,
vistos distintos de leitura, limpeza da sessão e retorno de foco. Foto de perfil
usa imagem privada sem otimizador e iniciais quando indisponível.

Fluent foi retirado dos fontes, CSS e dependências; provider e registro Griffel
eliminados. Tokens antigos de paleta e regras de cabeçalho/navegação/controles
foram substituídos por declarações canônicas. SSR usa os stylesheets reais do
App Router, sem depender de JavaScript para mostrar os estilos.

Cabeçalho escuro, marca, contexto, sidebar, itens, tipografia, campos, badges e
cards compartilham os valores do modelo. Breakpoint de navegação em 850px,
sidebar de 226/195px. No celular, a linha de contexto real acrescenta 51px ao
cabeçalho de 59px; o seletor de paciente permanece disponível. Grupos da
navegação começam abertos, conservando recolhimento, rotas e permissões.

## Validação e contraprovas

Regressões dirigidas abrangem preparação com conflito e recuperação,
apresentações, conversões emitidas, escolha e regularização de recebedor,
transferência, consumo, reconto BAL, lista frequente, governança, SSR, menus,
foco, responsividade e acessibilidade. Os resultados por caso, engine e fonte
estão no registro JSON. 36 cenários distintos aprovados: 10 na rodada inicial,
20 na principal e seis na repetição dirigida. A alteração posterior do produto
foi a correção de input-clear, exercida pelos consumidores na rodada principal;
normalização de espaços não mudou tokens. Tipos validados no build do runner e
lint dirigido sem erros. Chromium e WebKit/iOS são ambientes controlados;
não constituem prova física Android/Chrome, assistiva ou homologação humana.

A comparação automatizada com o HTML original cobre cabeçalho/navegação e o
modal compartilhado em 320/390/768/1024/1440px. Capturas complementam valores
computados, Axe, ausência de overflow e operações reais. Não aprovam todas as
telas nem substituem revisão humana. Rede da referência HTML bloqueada.

Contraprova funcional: ao fechar o popup, Base UI emite input-clear para limpar
sua busca interna. Tratar esse evento como digitação apagava o fuso escolhido.
Somente input-change agora altera a consulta do consumidor. A prova completa
de preparação mantém conflitos, criação inativa, ausência de vínculo implícito
e recuperação sem duplicar o cadastro.

Contraprovas de testes: consumo buscava uma classe privada do drawer antigo;
o destino passa a ser o diálogo com nome acessível. A identificação de modal
considera o diálogo visível e o confinamento real do foco, preservando as
barreiras de inert/aria-hidden, sentinelas e movimento para outro controle.
Nenhuma regra Axe ou asserção de estoque/autoria/autorização foi reduzida.

## Limites e sequência

105 critérios D-B e suas primeiras 30 colunas preservados. O registro UI
adicional distingue retirada técnica do Fluent e paridade visual incompleta.
Continuam necessárias as composições de listas/cartões, todas as telas e
estados, fichas REQ/COM/ENT/BAL em abas e Andamentos persistidos com contratos
de banco/API, autoria, referências autorizadas e recuperação.

Sem alteração de API, RPC, schema, assinatura ou worker. PDFs seguem a prioridade
técnica anterior, com aparência adiada. Local/remoto: 164 migrations, última
20261109024515, versões iguais e nenhuma pendente; sem reset ou fixture remota.
Não houve backup redundante para este lote sem SQL.

CI do novo SHA é gate próprio. Sonar adiado pelo responsável; D-C/D6, restauração,
provedores, dispositivos e gates humanos continuam separados. PR7 permanece
Draft; produção NO-GO, sem merge, promoção ou ativação externa. Meta ativa.
