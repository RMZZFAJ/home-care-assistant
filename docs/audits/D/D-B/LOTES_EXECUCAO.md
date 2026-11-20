# Execução dos lotes L1 a L4

**Atualizado em 19/11/2026.** Branch `feat/phase-d-implementation`,
[PR #7 em rascunho](https://github.com/RMZZFAJ/home-care-assistant/pull/7).
Este registro acompanha o que entrou no produto, a comparação com cada
laboratório e as pendências por lote. As evidências das entregas e a fila
transversal ficam no [acompanhamento D-B](../../../../TEMP_D_B_ATUALIZACAO.md)
e nas [matrizes de execução](ACCEPTANCE_EXECUTION.csv) e
[aceite visual](UI_MODEL_ACCEPTANCE.csv).

| Lote | Situação | Referências vigentes |
| --- | --- | --- |
| L1 | Implementado e revisado, com evidência de cenários específicos | [Ordem E01–E03](../../../../HCA_L1_LOTE_CODEX_E01_E03.md), [laboratório v3](../../../../hca-laboratorio-01-v3-final.html) e [comentários v3](../../../../hca-l01-v3-comentarios.json) |
| L2 | Em execução na mesma branch | [Comando mestre](../../../../HCA_L2_COMANDO_MESTRE_CODEX_V7.md) e [laboratório v7 aprovado](../../../../hca-laboratorio-02-v7.html) |
| L3 | Futuro | Ordem e laboratório a registrar quando o lote for definido |
| L4 | Futuro | Ordem e laboratório a registrar quando o lote for definido |

Em cada incremento, registre o commit, os cenários conferidos, o que foi
criado para o produto real, as diferenças ainda visíveis, os contratos e as
migrations, o resultado das verificações e as escolhas que dependem do
responsável. Uma comparação só confirma igualdade nos elementos e estados
efetivamente comparados. Registre controles, navegação ou composição isolados
quando a evidência cobre somente esse recorte. Registre as dúvidas inéditas
aqui e quando forem encaminhadas pelo Codex, mantendo a confirmação do dono
junto da decisão que substituiu a anterior.

## L1 — Acesso, início e fichas

- **E01 — Acesso e contexto.** Cartão de entrada, mostrar senha, recuperação em
  tela própria com e-mail reaproveitado, seleção de vínculo, entrada direta para
  um paciente e uma função e troca de paciente com carregamento sobreposto.
  A troca preserva o destino e evita expor telas intermediárias.
- **E02 — Início e histórico.** Cartões de atenção, atalhos, requisições,
  entregas, semana e avisos. Histórico com busca contínua, filtros recolhíveis,
  contagem e paginação. A revisão conferiu navegação e estados de erro.
- **E03 — Ficha e verificação.** Cabeçalho, abas, materiais e atendimento
  reunidos, urgência na linha, controles compactos de arquivos, menu Mais
  e verificação por código ou arquivo. Carregamento simples e processamento
  por etapas acompanham os estados reais.
- **Andamentos e rascunhos.** Família publica em privado. A menção individual
  habilita a leitura conforme a regra de acesso. `@` e `#` oferecem sugestões.
  Fichas longas e Andamentos guardam o último preenchimento, com Continuar ou
  Descartar. Andamentos também guardam o último ao fechar voluntariamente.
  Cancelar, arquivar e decisões curtas têm confirmação de saída e recuperação
  de ato incerto no próprio fluxo.

A [refação L1](L1_IMPLEMENTATION.md#refação-visual-de-14112026) descreve a
composição portada do HTML e os complementos. As correções de navegação,
foco, carregamento e privacidade têm [verificações dirigidas](L1_FOLLOWUP_20261114.md)
e [resultados de CI](L1_CI_STABILIZATION.md). A comparação atesta os padrões
especificados e os estados exercitados. A paridade visual integral e a
homologação humana, assistiva e em aparelhos físicos continuam abertas.

**Criado ou completado para o produto real.** Ciência familiar em Materiais,
com fatos pessoais, históricos e dispensados. Identificação técnica do
exemplar e modalidades Ficha, Expandido e Auditoria. Comunicações com
tentativas, canais e recuperação. Cartões do próximo plantão, estoque crítico,
acervo e orientação inicial. Verificação técnica contextual, operação
concorrente, retenção da tentativa oficial e recuperação de anexos no cartão.
Calendário semanal e período de Andamentos já constavam do v3 e passaram a
usar dados reais.

**Decisões e conflitos resolvidos.** R1 usa **Revisão** no BAL e mantém autoria,
observações por item e a avaliação por outra pessoa habilitada. R2 preserva as
fichas complementares e seus vínculos. R3 exige nova avaliação da família quando
ela marcou atendimento completo e o recebedor confirmou menos. A REQ continua
sem quantidade solicitada. A [revisão de rascunhos](L1_DRAFT_POLICY.md)
substitui a persistência indiscriminada que existia na D-B. Na divergência
entre `@todos` do protótipo e a definição posterior de privacidade da família,
prevalece a publicação familiar privada e o acesso individual por menção.

**Pendências.** Conferência do responsável nas composições atuais, incluindo
as mudanças de L2 que atravessam L1. Validação humana, assistiva, física e de
provedores pelas respectivas evidências. Nenhuma dúvida inédita de L1 foi
identificada nesta atualização.

## L2 — Requisição, compra, entrega e devolução

O HTML v7 incorpora as revisões aprovadas. O arquivo intermediário de
[decisões e pendências](../../../../HCA_L2_DECISOES_VIGENTES_E_PENDENCIAS.md)
é fonte de consulta. Os três originais estão versionados na raiz, seguindo L1,
no commit `a3267249`, com preservação dos bytes em novos checkouts. Os 56
cenários e 175 variantes foram abertos no laboratório. A evidência do produto
é dirigida por superfície em celular emulado, com capturas comparativas a
390 px em fluxos selecionados.

O HTML aprovado conserva uma linha original com espaço final. Seu SHA-256
confere com o comando mestre.

- **REQ e formulários E04–E06.** Cinco etapas da v7, categorias em Materiais,
  listas da casa, consulta, urgência e retomada na categoria exata. Contagem
  de equipe e emissão transacionais. Cancelamento compara o estoque antes e
  depois. Listas, etapas, foco e REQ exercitados em Android e iOS emulados.
  COM, ENT e DEV usam observações numeradas na revisão e na ficha emitida.
  O extra fora do catálogo da REQ pode começar em Materiais e reaparece uma
  vez em Itens extras. A edição usa o modal de E04-05, com tipo, unidade,
  estoque, urgência e detalhes. A emissão preserva a pendência de cadastro
  e os dados informados na ficha, no comprovante e no PDF assinado. O item
  fica sem produto associado e sem lançamento de estoque. O registro da
  identidade na emissão é um complemento necessário ao produto real.
  A composição móvel mantém o título, as sugestões sob o nome, os seletores
  e o rodapé de ações de E04-05. O formulário usa a informação de estoque do
  produto para distinguir observado, desconhecido e não informado, incluindo
  a revisão de rascunhos legados. As sugestões mostram nomes e unidades
  reais do paciente. A referência do laboratório mostra códigos de exemplo.
  Quando o nome informado é idêntico ao nome ou alias ativo, o contrato
  vigente exige escolher o material correspondente ou informar um nome
  que diferencie o novo item.
  A escolha explícita de uma sugestão reaparece em Itens extras com o
  rótulo Material do catálogo. O mesmo produto fica disponível para editar,
  remover e retomar com a unidade oficial. A revisão mostra a linha somente
  em Itens extras. A ficha e o PDF preservam a classificação e os detalhes,
  com os controles vigentes de reiteração e estoque. O laboratório usa
  registros fictícios para essas etapas.
  P1 continua pendente.
- **Vínculos e COM E05.** Vínculos por ficha ou material, importação seletiva,
  planejamento e chegada, compras mistas, falta e excesso, correção pelo autor,
  revisão individual ou em lote, chegada avulsa e cobertura do planejamento.
  Itens extras da COM podem ser inseridos em Materiais ou Itens extras.
  Os materiais fora do catálogo exigem nome, tipo, unidade e quantidade.
  O rascunho, a revisão, a ficha e o PDF conservam a pendência e os detalhes.
  A família habilitada pode escolher um produto compatível em Materiais.
  A identificação conserva a linha original proposta no histórico, cria
  uma única linha de planejamento e não registra compra, chegada ou estoque.
  A compra e a chegada dos itens identificados podem seguir enquanto outro
  extra aguarda cadastro. A ficha conserva a pendência até a identificação.
  Testes dirigidos conferiram emissão, recebimento e crédito único. Pendem
  revisão visual agrupada e CI do candidato que reúne os incrementos.
- **ENT e DEV E06.** Expedição direta, conferência pessoal, falta e excedente
  em apuração, conciliação, suficiência, troca do recebedor e regularização
  com revisão independente após revogação. Recebimento físico e avaliação
  familiar distintos, com testes em celular e Auth real. O item extra sem
  cadastro começa em Materiais, reaparece em Itens extras e fica uma vez na
  revisão. Rascunho, edição e remoção mantêm a identidade dessa linha. A
  escolha explícita de um produto cadastrado devolve o item à regra de
  disponibilidade e precisão da custódia de origem. Pendem P2, o efeito dos
  extras ainda não identificados na expedição e a validação no preview.
- **Fichas, atualização e acesso E04–E06.** Lista compacta de Materiais, painéis,
  preservação da edição em consulta, aba Andamentos, menu e botão flutuante,
  próximo passo, comparação de mudanças e retirada da ficha quando cai o acesso.
  A abertura distingue erro de consulta, referência indisponível e catálogo
  vazio. Pende a revisão móvel final dos grupos de estados afetados.
- **Emissão e ciclo E04–E06.** Sobreposição de confirmação, reconciliação da
  emissão, avisos no PDF inicial assinado, revisão de pendências, conclusão,
  cancelamento, reabertura, arquivo por decisão ou prazo e PDF consolidado
  verificado. Pende conferir o candidato publicado com o banco atualizado e
  os efeitos de comunicação pelos gates do ambiente.

**Trechos de composição conferidos.** A barra de cinco etapas, as categorias
dentro de Materiais, o bloco expandido e o diálogo Organizar listas em E04-04,
o comparativo de cancelamento E04-14, o aviso de catálogo E04-16, e os modais
de troca de recebedor, regularização e revisão independente E06-09,
E06-13 e E06-14 foram reproduzidos e comparados nas dimensões descritas no
acompanhamento. A organização compacta de Materiais e dos painéis e a aba
Andamentos foram exercitadas nos percursos correspondentes. As comparações
registradas sustentam a equivalência desses elementos e a interação testada.
A v7 completa, incluindo variantes restantes, ainda requer revisão final.

O painel de Materiais do cenário E04-11 usa as abas Estoque, Histórico e
Fichas. A aba Fichas reúne requisições em acompanhamento, histórico
arquivado e aquisição e movimentação. A prévia mostra identificação,
autoria, data, situação e os fatos do material preservados na ficha.
É possível abrir a ficha completa e retornar à mesma consulta. O escopo
por paciente e ficha é conferido na leitura antes de apresentar os dados.
As capturas da referência e do produto em 390 px foram comparadas em
Android e iOS emulados. Seis casos de navegador passaram na rodada final,
incluindo retorno à posição exata do formulário, foco, busca e valores
digitados, falha de consulta e recusa de acesso a outro paciente.

O sistema acrescenta o grupo Outras requisições quando existe uma
requisição encerrada ou cancelada sem arquivamento formal. A prévia mantém
a ação Atualizar consulta para recuperar uma falha de leitura. A unidade
vem do registro real. Códigos de catálogo exibidos apenas no exemplo da
v7 ficam fora da consulta quando a referência real só fornece a unidade.

A etapa de Observações da REQ usa o mesmo editor de COM, ENT e DEV. O editor
reproduz o estado vazio, o campo numerado, Adicionar observação e Remover.
A revisão retorna ao preenchimento pela ação Editar. A REQ conserva textos
colados acima de 1.000 caracteres para a pessoa corrigir antes de emitir.
O laboratório limita a digitação pelo próprio campo.

O cenário E04-01 foi aberto em 390 px. O produto foi exercitado no Android e
iOS emulados. Quatro casos passaram sem retry, incluindo foco ao adicionar,
remover e editar, bloqueio do texto longo, autosave durante a revisão, emissão
real, PDF e retomada do extra da COM.

O cartão de preenchimento reúne as cinco etapas, o conteúdo e o rodapé.
REQ, COM, ENT e DEV usam o mesmo rodapé para navegação e estado do último
rascunho. A indicação distingue a gravação em curso da confirmação do
conteúdo e da etapa pelo servidor. Retomada, conflito e recuperação continuam com
os diálogos próprios. O erro de Observações da REQ permanece junto do campo
focado. O produto conserva a ação explícita Salvar rascunho em REQ, COM e
ENT no rodapé.

O cabeçalho das novas fichas REQ, COM, ENT e DEV segue a v7 com caminho
Fichas, identificação do paciente, título, descrição e ajuda sobre a ficha.
Os textos das ações seguem a etapa e o tipo de ficha. Em REQ, COM e ENT,
Sair por agora volta à origem ou à central de fichas. Se houve edição,
a opção Salvar e fechar usa a confirmação do último rascunho antes de
navegar. A devolução usa o mesmo cabeçalho e mantém seu fluxo de abertura
e o controle de rascunho da expedição.

O menu autenticado e a escolha inicial da operação na central de entregas
e devoluções são complementos do sistema real ao recorte da v7.

Na rodada local de `90576c00`, o build passou e a DEV completou a expedição
no Android emulado. A abertura da REQ e a emissão da COM no Android
receberam `DATABASE_UNAVAILABLE`. No iOS, a COM ficou na abertura e a
DEV ficou no acesso ao vínculo. A REQ conferiu o caminho de navegação,
o cabeçalho e a ajuda no iOS e identificou a falta de retorno de foco ao
fechar a ajuda. A correção vincula o foco aos botões que abrem a ajuda e
a confirmação de saída.

A referência foi capturada em 360 e 412 px nos estados E04-01, E05-01,
E06-01 e E06-16. A primeira rodada dos percursos integrados passou em COM
e DEV no Android. A REQ em iOS passou pelos controles de edição, posicionamento
em 360 e 412 px e aviso único. A emissão sofreu `statement timeout` no
PostgreSQL. O Android aguardava a Visão geral antes de abrir a ficha. A COM
em iOS chegou à emissão e a DEV em iOS parou na preparação da fixture, com
timeouts locais. O caso da REQ passou a entrar pelo link direto autorizado
para testar o assistente com a sessão e o vínculo reais. Na repetição, o
Android abriu a rota e ficou na consulta do catálogo. O iOS voltou a passar
pelas verificações de interface e chegou à emissão. As duas larguras do
produto foram comparadas no navegador. As capturas estão em
`output/playwright/l2-req-observations/`.

**Complementos para fatos e funções existentes no sistema.** Minhas listas
pessoais ficam acessíveis na REQ com a visibilidade original, ao lado das
listas compartilhadas da residência. A abertura vazia conserva o contexto
autorizado e leva à área real de catálogo quando o vínculo tem permissão. As
fichas preservam PDFs assinados, exemplares anteriores, avisos auditáveis,
anexos e demais abas. O produto incorpora autoria, disponibilidade real,
versão concorrente, recuperação idempotente e permissões de leitura e escrita
nos mesmos cartões, diálogos e estados da v7. Essas integrações complementam
o PDF demonstrativo e os estados simulados pelo HTML.

Na escolha manual de recebedor em ENT e DEV, a confirmação contém um campo
para justificar a escolha. Esse controle real do repositório estava acoplado
à observação única da expedição. Agora a justificativa fica com a designação,
as observações ficam na emissão e a pessoa recebedora escreve sua própria
nota na conferência. O vínculo documental opcional também fica na Confirmação,
onde pode ser revisto se os materiais selecionados divergirem da origem.
Rascunhos antigos conservam o texto anterior.

Na COM, a mudança de quantidade em uma chegada já registrada usa a faixa
e a comparação de E05-15. O diálogo mostra o material e o valor anterior
riscado. Consultar compra retorna à ficha aberta. Quando há chegadas
alteradas que o vínculo pode conferir, Revisar chegada abre a conferência
existente, consulta a fila atual e mostra só as parcelas alteradas. A decisão
continua explícita e a aprovação usa a versão devolvida pela consulta.
Com edição em curso, o diálogo informa a preservação do preenchimento.
Sem chegadas elegíveis, Atualizar agora mantém a consulta da ficha disponível.
A comparação também mostra a mudança real de situação quando a correção
volta para aprovação. A v7 demonstra apenas a quantidade. A referência e
as capturas do produto em Android e iOS emulados estão em
`output/playwright/l2-arrival-update/`. Os dois casos passaram com Auth real
e sem retry. A conferência excluiu outra chegada pendente da mesma COM,
restaurou o foco e preservou as duas chegadas sem lançamento de estoque.

A variante Falha ao atualizar abre o diálogo compartilhado quando falha
uma atualização solicitada na COM. O diagnóstico recolhido usa a referência
de suporte da consulta. Duas tentativas de leitura continuam disponíveis
enquanto a consulta falha. Ao esgotá-las, o diálogo oferece copiar o
diagnóstico e voltar à ficha. Durante a falha, a cópia anterior permanece
disponível para consulta e a geração de novos PDFs fica bloqueada. Se a
recuperação encontrar mudanças, a comparação abre antes de substituir a
cópia. O fluxo usa leituras e mantém os controles de aprovação da chegada.
O texto informa que a consulta falhou mesmo quando o serviço devolve um
erro com a conexão ativa. O carregamento acompanha a única consulta real,
sem simular etapas. Android e iOS emulados passaram sem retry com Auth real,
uma falha HTTP simulada, recuperação pela API e nova falha persistente.
Os testes conferiram o limite de duas tentativas, o retorno de foco, a
permanência do comparativo após uma leitura em segundo plano e a ausência
de movimentos de estoque. As capturas da v7 e do produto estão em
`output/playwright/l2-arrival-failure/`.

**Divergências e dependências.** A v7 reúne etapas que o repositório já
expunha em entradas usuais e pelo assistente de transferências. Os fluxos
foram aproximados visualmente com preservação da etapa salva em rascunhos
antigos. O PDF inicial usa o pipeline real de emissão, assinatura e controle
de acesso. O SHA de referência anterior `075b4b66` tem um leitor anterior à
combinação de declaração pendente e expedição disponível que o banco de
desenvolvimento passou a expor. A aplicação no preview acompanha esse banco
quando roda com o leitor compatível. Há registro da ausência de transferências na
conferência histórica de aplicação inicial, sem inferência sobre dados atuais.

### Revisão dos assistentes solicitada em 20/11

Na REQ, Minhas listas pessoais fica dentro de Usar listas frequentes,
na Confirmação. Listas da casa e listas pessoais mantêm suas permissões e
seus próprios registros. Quem pode somente consultar mantém a entrada
autorizada para suas listas. O detalhamento de material abre pelo menu
de três pontos ao lado do nome. A lista usa seleção com aparência de
interruptor. A opção Não sei informar fica junto à contagem. O seletor
completo permanece nos rascunhos legados que exigem reclassificação.

O menu fica no cabeçalho compacto do material na REQ, COM, ENT e DEV.
COM e ENT usam as opções de vínculo por material já disponíveis.
A identificação usa os nomes e as unidades reais do paciente.
A emissão mantém as etapas do carregamento durante a navegação, a
identificação autorizada da ficha e a confirmação efetiva.

No Chromium com emulação Android e no WebKit com emulação iOS, a REQ
concluiu a emissão e exibiu o PDF assinado, mesmo com a consulta da ficha
temporariamente retida no teste. A sequência de carregamento permaneceu
visível durante essa espera. Em ambos, a consulta pelo menu de material
preservou o foco, o filtro e o valor em edição quando o painel fechou.
A inspeção das capturas confirmou o interruptor horizontal com 32 × 19 px.
A revisão visual completa de COM, ENT, DEV e dos seus diálogos segue aberta.

A captura inicial de uma DEV com divergência a 320 px mostrou o botão
flutuante sobre parte de Gerar PDF. A ficha agora reserva uma faixa lateral
na barra de ações em telas estreitas. O botão **+** mantém o canto inferior
direito, acima da navegação real, e o menu abre para cima como no E04-08.
A faixa lateral e o recuo inferior acomodam a navegação do aplicativo,
que o cenário isolado do laboratório não inclui.

O teste de devolução com recebimento parcial passou no Android e no iOS
emulados. A 320 × 520 px, Gerar PDF aceitou o teste de clique mesmo alinhado
verticalmente ao **+**. Conciliar divergência ficou fora da área do botão,
o menu abriu inteiro acima dele e Escape devolveu o foco. A primeira rodada
do iOS parou por timeout do banco local durante a expedição. A repetição
passou após atualizar as estatísticas locais, com retry automático desligado.
Capturas em `output/playwright/fab-v7-evidence/`. Sem migration neste ajuste.

Na etapa de materiais da COM e da ENT, a linha mostra a quantidade na
unidade de estoque. O menu de três pontos abre **Editar embalagens**.
Esse diálogo acomoda a escolha manual de apresentações cadastradas e a
comparação de versões, funções do produto que complementam os exemplos
de conversão da v7. Voltar ao material mantém o preenchimento e devolve
o foco ao menu da linha. O erro de quantidade indica a linha e leva ao
controle que abre o editor. A volta de Extras ou Revisão a Materiais
reabre a última categoria do preenchimento atual. Um novo preenchimento
começa em Medicamentos.

Na COM, Chromium com Android emulado e WebKit com iOS emulado preservaram
20 unidades pelo fator de origem. No caso de revisão, voltar manteve
Higiene e as 24 unidades só entraram após **Adotar fator atual**. O teste
de perda da resposta preservou a conversão emitida e o crédito único.
As capturas da linha e do diálogo a 320 px estão em
`output/playwright/l2-presentation-evidence/`.

O percurso de ENT com duas REQs passou nos dois navegadores emulados,
sem retry automático na rodada final. O teste aguardou Entrega expedida
na ficha antes de consultar o trânsito e confirmou o recebimento pelo
perfil designado. Uma rodada anterior do iOS tinha navegado para o
estoque enquanto a emissão ainda abria a ficha. Após a retomada do
Docker, houve timeout na preparação local, anterior à expedição. A
rodada final passou após atualização das estatísticas da mesma base.

A leitura da COM e da ENT ainda ocupa o corpo da etapa com câmera,
foto e entrada manual. A v7 reúne esses controles no diálogo Ler código.

Na CI de `b7d5ca1f`, validações Linux e Windows e o job de banco passaram.
Os cinco jobs de navegador concluídos somaram 52 falhas após a repetição.
Um caso de recebimento pessoal no iOS passou na segunda tentativa. O
Chromium 2 foi cancelado após cerca de 40 minutos. A comparação do fator
obsoleto também falhou nessa CI ao voltar para a categoria incorreta. O
teste dirigido deste incremento cobre essa correção. Os demais casos de
abertura, fichas, rascunhos e fluxos do segundo shard seguem em triagem.
[Execução da CI](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/44691631298).

Na Confirmação da COM e da ENT, Fichas vinculadas abre o seletor de
origens e permite escolher se a ficha também traz materiais. Cada material
continua com seu vínculo próprio no menu de três pontos. A avaliação
familiar de suficiência e a justificativa para múltiplas REQs aparecem
quando há vínculos que exigem essas informações. O seletor também reconhece
os vínculos por linha dos rascunhos anteriores.
A preparação da ENT mostra **Atende integralmente à necessidade** no
material ligado a uma REQ, como no cenário E04-10 da v7. Desmarcado indica
atendimento parcial. A justificativa de várias REQs para a mesma
necessidade fica no material correspondente e aparece na revisão. A
revisão mostra o atendimento previsto separadamente da quantidade a
expedir. Alterar o conjunto de necessidades vinculadas recoloca a
avaliação do material em parcial. O ato de recebimento continua pessoal.

No Android e iOS emulados, passaram quatro casos dirigidos sem retry
automático. A caixa marcada gravou o atendimento integral para duas
REQs. O teste conferiu o foco na justificativa exigida e o recebimento.
A caixa desmarcada gravou atendimento parcial mesmo com a quantidade
física inteiramente recebida. A primeira rodada sofreu timeouts no banco
local. A rodada final usou perfis fictícios com um único paciente e
acesso direto às fichas, após atualizar as estatísticas da base local.

Na DEV, a Confirmação tem o mesmo seletor de fichas. O menu de três pontos
oferece Detalhes do material e Vincular a uma ficha. Cada vínculo pode ser
geral ou indicar os materiais específicos da entrega. Ao partir de uma ENT
com recebimento registrado, os materiais disponíveis entram no preenchimento
para revisão. Ao partir de uma DEV avulsa, a importação é uma escolha no
seletor. A DEV independente continua disponível.

Na lista, o interruptor inclui o item, o menu fica ao lado e o resumo
exibe a origem específica e o saldo da equipe. A quantidade sugerida
considera o menor valor entre o recebido na ENT e o saldo atual da equipe,
na precisão do catálogo. O estoque da equipe é agregado por material. A
referência à ENT documenta o recebimento e a quantidade sugerida é editável.

O botão Ler código abre a conferência da apresentação na etapa Materiais.
A consulta usa o catálogo autorizado do paciente. O diálogo mostra o
material, a embalagem e o fator cadastrados. Permite corrigir o fator da
leitura ou ajustar a quantidade final da operação. Ao aplicar, o
preenchimento guarda a quantidade na unidade-base. A alteração da ficha
preserva o cadastro do catálogo. A câmera, a foto e o código digitado usam
o leitor disponível no sistema. A escolha manual na lista continua
disponível quando o código não é reconhecido.

Quatro casos passaram sem retry em Android e iOS emulados. A DEV avulsa
retomou o rascunho sem ENT. Na DEV vinculada, a entrada pela ENT já abriu
a Confirmação. O caso digitou um código desconhecido e depois um cadastrado,
conferiu a recusa de uma quantidade superior ao saldo, corrigiu o fator e
aplicou a quantidade final escolhida. A expedição manteve o vínculo e o
recebimento pessoal. A leitura por câmera física e foto ficou fora desses
testes.

Depois da comparação a 390 px, os campos de embalagem e fator passaram
a dividir a mesma linha no modal. A repetição dirigida em Android e iOS
confirmou que o controle de quantidade final fica inteiro na região
visível, com captura dos dois navegadores.

O banco registra os vínculos no rascunho e na emissão. O teste com Auth
real conferiu vínculo por material, isolamento por paciente, rejeição de
uma linha que não pertence à entrega, preservação da ENT anterior e uma
única saída da custódia na repetição da mesma tentativa. O campo legado de
origem permanece legível nos registros e rascunhos existentes.

O cenário E06-16 foi aberto a 390 px no laboratório. Em Chromium com
emulação Android e WebKit com emulação iOS, a jornada partiu da ENT,
conferiu a importação, ajustou a quantidade, retornou do seletor ao menu
do material e recuperou a expedição incerta. O recebedor confirmou três
das cinco unidades. Os dois testes passaram sem retry, conferiram o
saldo e obtiveram o PDF de acompanhamento.

A CI `44683936418` encontrou dois erros unitários na leitura de rascunhos
legados da declaração. O commit `4695ad13` omite campos opcionais
ausentes. Os dez casos unitários de declaração passaram após a correção.

O rodapé dos assistentes L2 mostra o estado da gravação automática e as
ações de navegação. A confirmação de saída e os controles excepcionais de
retomada, comparação e recuperação continuam disponíveis. Após a escolha
de manter a própria edição numa comparação, o rascunho é salvo sobre a
revisão consultada. A atualização do catálogo mantém aberto o painel de
listas pessoais da REQ e bloqueia o avanço até concluir a consulta.

Nos testes locais com Auth real no Android emulado, listas pessoais
reabriram em outra sessão sem copiar contagem, urgência ou justificativa.
REQ e COM mantiveram as duas edições na comparação e salvaram a edição
escolhida. Uma resposta inválida e uma revogação durante a recuperação
mantiveram a chave original. A COM manteve o vínculo geral ao desfazer
a importação e conservou a quantidade editada no vínculo por material.
A ENT originada na COM recuperou somente a quantidade aprovada. A ENT
vinculada a duas REQs exigiu a justificativa e completou a expedição e o
aceite com os fluxos de leitura do código de barras preservados.

A COM é emitida como planejamento. A família pode registrar uma compra
realizada na ficha ou informar a doação recebida em Chegadas e associá-la ao
planejamento. A mesma COM pode receber os dois atos. O histórico e o tipo
dos documentos anteriores foram preservados.

O diálogo de retomada dos assistentes mostra paciente, horário salvo, etapa
e materiais em leitura, com as ações de descartar e continuar no rodapé.
Mantém a nomenclatura aprovada na L1. O teste de banco com Auth real
confirmou uma compra e uma doação na mesma COM, um único crédito da doação
e preservação do evento original.

Em E05-16, a COM apresenta Envio sem confirmação quando falta a
resposta da emissão. Uma consulta que falha tem o seu próprio diálogo
e mantém a mesma tentativa para a próxima verificação. O estado inicial
informa que o preenchimento foi guardado antes do envio. Voltar à revisão
acompanha a tela que está aberta no fluxo de emissão real. O diagnóstico
usa código e correlação, com o limite de duas consultas pelo diálogo.
No iOS emulado, a mesma chave recuperou a ficha, a conversão original
apareceu no painel do material e o PDF foi gerado. A primeira rodada no
Android também confirmou a recuperação e o crédito único. A última
rodada no Android parou na emissão inicial. O PostgreSQL local registrou
um timeout da instrução antes da simulação da perda de resposta.

### Decisões e dúvidas de L2

- **P1 — Reversão de contagem de REQ superada por nova contagem oficial.**
  Sem decisão registrada. A reversão comum preserva
  movimentos posteriores. Outra contagem absoluta bloqueia a reversão até
  definir como registrar a precedência da contagem mais recente. A proposta
  registrada preserva a contagem oficial posterior e marca a antiga como
  superada. A escolha foi apresentada ao responsável em 20/11.
- **P2 — Fechamento do excedente recebido em ENT/DEV.** Sem decisão
  registrada. O sistema reconhece inicialmente o expedido e
  guarda o excedente em apuração. Faltam o responsável por confirmar a origem,
  os efeitos da regularização e o desfecho quando a origem não confirmar.
  A proposta registrada vincula o débito e o crédito à mesma entrega após
  confirmação da origem e disponibilidade pertinente. A escolha sobre o
  encerramento após recusa da origem foi apresentada em 20/11.

- **Extras sem identificação em ENT e DEV.** A v7 permite preencher a
  quantidade de um extra pendente. Hoje a expedição oficial exige um produto
  do catálogo do paciente com saldo disponível. A decisão encaminhada no
  Codex é se a ficha deve expedir os materiais disponíveis e registrar o
  extra como pendência, ou esperar pela identificação para expedir tudo.
  Recomendação encaminhada: expedir os materiais disponíveis e mostrar a
  pendência separadamente. A escolha está em aberto. Enquanto isso o sistema
  aceita salvar e revisar a ficha inteira e mantém a expedição aguardando
  identificação. O banco confirma essa mesma regra no rascunho revisado.

- **COM mista com extra ainda sem identificação.** Em 19/11, o responsável
  aprovou a compra dos itens já identificados com o extra pendente na mesma
  ficha. O laboratório mostra a pendência de catálogo. A continuidade da
  compra dos itens conhecidos foi definida na execução. Uma COM emitida por
  administrador conserva a aprovação inicial das linhas identificadas.

Na aplicação, o extra pede a quantidade real. O laboratório apresenta uma
unidade como exemplo inicial. A resolução na COM exige a mesma unidade,
precisão suficiente e um produto ainda ausente
da ficha. Uma conversão de unidades ou união com uma linha já existente
continua sem regra de produto nesta entrega.

## Migrations por ambiente

Consulta de 20/11/2026 à stack local `home-care-assistant` e ao Supabase de
desenvolvimento vinculado `qwfrqychokvhdzakibid`. São **311 versões em cada banco**,
com 242 versões anteriores a L1, 18 de L1 e 51 de L2.
Os SQL de cada versão ficam em [supabase/migrations](../../../../supabase/migrations/).
As versões em arquivo, na stack local e no desenvolvimento coincidem. A
fila de aplicação vinculada está vazia. Produção fica fora desta consulta.

### L1 — Aplicadas no local e no desenvolvimento

`20261113190159`, `20261113191247`, `20261113192121`, `20261113193131`,
`20261113194716`, `20261113201100`, `20261113202500`, `20261113204000`,
`20261113210500`, `20261113212000`, `20261113213500`, `20261113222055`,
`20261113231000`, `20261114053000`, `20261114053800`, `20261114073734`,
`20261114173049`, `20261114194500`.

### L2 — Aplicadas no local e no desenvolvimento

`20261119023722`, `20261119024558`, `20261119025234`, `20261119030844`,
`20261119032323`, `20261119033747`, `20261119034942`, `20261119041907`,
`20261119044938`, `20261119050841`, `20261119054620`, `20261119060719`,
`20261119063513`, `20261119072627`, `20261119081806`, `20261119082121`,
`20261119083628`, `20261119085036`, `20261119085400`, `20261119090742`,
`20261119091837`, `20261119093029`, `20261119095551`, `20261119095552`,
`20261119100441`, `20261119102453`, `20261119103125`, `20261119104320`,
`20261119105026`, `20261119110234`, `20261119111617`, `20261119113059`,
`20261119121610`, `20261119125023`, `20261119130945`, `20261119135903`,
`20261119141610`, `20261119154356`, `20261119175654`, `20261119184524`,
`20261119203458`, `20261119204118`, `20261119212000`, `20261119213000`,
`20261119220003`, `20261119221703`, `20261119224330`, `20261119231733`,
`20261119233039`, `20261120043839`, `20261120052605`.

`20261119212000` e `20261119213000` tratam as observações numeradas e a
justificativa da designação manual na transferência. `20261119220003`
preserva a identificação proposta de um extra da REQ. `20261119221703`
preserva a escolha explícita de um item do catálogo da REQ.
`20261119224330` registra os extras da COM, a identificação posterior e
a conferência com o rascunho. O ensaio com rollback e o backup cifrado
`826b077b-e88a-4f40-b7c9-7decc4380308` foram verificados. O SQL confere com
o histórico vinculado. Entre as 201 tabelas de dados comparadas, seis tiveram
mudança estável no intervalo, explicada por um lembrete agendado de ENT
às 20h02, com evento, auditoria e aviso interno. Linhas de materiais e
estoque permaneceram iguais. A fila vinculada está vazia. O preview ainda
aguarda a publicação do código.

`20261119231733` guarda o extra de ENT e DEV no rascunho e protege a expedição.
`20261119233039` libera os itens identificados da COM mista. As duas versões
foram aplicadas após ensaio com rollback e backup cifrado verificado
`91150014-8e4a-438d-b452-b3a83d28a475`. O SQL das duas versões confere com o
histórico vinculado. A comparação de 201 tabelas registrou variações de
horário e estado operacional. O único conteúdo estável alterado foi o
histórico de migrations.

`20261120043839` permite emitir a COM como planejamento. O backup cifrado
`512679d1-ea96-4cbf-86e8-39d598ff5d6b` foi verificado antes do ensaio com
rollback. O ensaio conferiu o planejamento, as modalidades antigas, a
recusa de payload misto e a ausência de grants públicos. A fila apontou
somente essa migration. Após a aplicação, o histórico remoto registrou a
versão 310 e a fila voltou a ficar vazia.

`20261120052605` preserva as origens gerais e por material da DEV no
rascunho e na expedição. Ensaio vinculado com rollback confirmou os grants
existentes do seletor e a negação a anônimos. O backup cifrado
`523122f6-617f-4dd7-9326-8974ac6e4eda` foi verificado antes de aplicar
a única versão pendente.

### L3 e L4

Nenhuma migration atribuída.

## Triagem dos avisos de 19/11/2026

Os 17 avisos da aba Problemas foram avaliados na fonte. Os avisos de
componentes repetidos nas capturas do Sonar correspondem ao mesmo conjunto.

- **S4036 — `supabase-project.mjs`.** O executável era escolhido pelo `PATH`
  herdado. O wrapper usa o resolvedor de executáveis confiáveis do projeto e
  fornece diretórios fixos ao processo. A consulta vinculada depois da mudança
  confirmou as 302 versões pelo perfil fixado.
- **S6845 — propostas, matrizes de avisos e permissões, estoque e `TableFrame`.**
  As cinco regiões usam o observador de rolagem das fichas e da agenda.
  Conservam nome, estrutura de tabela e rolagem nativa por teclado. A região
  sem overflow sai da sequência de Tab.
- **S9383 — matriz de avisos.** O campo de intervalo aguarda o salvamento no
  `blur`. A rotina confirma a leitura oficial e apresenta erros.
- **S9011 — contatos.** Os três botões de formulário declaram `type="submit"`.
- **S6853 — chegada, correção, origem, listas da casa e REQ.** Rótulos explícitos
  apontam para controles com IDs únicos. Os checkboxes conservam os nomes
  acessíveis fornecidos pelos textos dinâmicos e a área clicável.
- **S2871 — assistente de fichas.** A chave da consulta de origens usa um
  comparador explícito para UUIDs. A ordem é usada somente na consulta.

A regra de acessibilidade exige que o teclado alcance conteúdo com rolagem.
O [W3C documenta a regra](https://www.w3.org/WAI/standards-guidelines/act/rules/0ssw9k/).

Os 14 alertas de segurança visíveis em 11 arquivos também foram conferidos
na fonte. A avaliação estática considera a origem dos dados e os controles
que antecedem a leitura, escrita ou execução. O print não mostra a revisão
analisada ou os fluxos detalhados do Sonar.

- **`meta-templates.mjs`.** Bloqueio incondicional antes de qualquer uso do
  caminho, gravação ou chamada ao provedor. O confinamento da saída exige
  revisão antes de qualquer reativação em D7.
- **`make-sheets.cjs`.** Prefixo limitado a letras minúsculas, números e hífen.
  A captura passa por caminho canônico, limite de diretório e arquivo regular.
- **`b58-switch-capture.mjs`.** O operador indica o CLI local. O código exige
  caminho canônico para `playwright-cli.js` e usa argumentos fixos sem shell.
- **`finalize_documentary_files.py`.** Os alvos de leitura, normalização e hash
  passam por resolução canônica e limite a `docs` ou ao README da raiz.
- **`validate_part2.py`.** Executa o interpretador e o arquivo de validação
  fixados. Os argumentos vêm depois do arquivo e são processados sem shell.
- **`ui_finalize.py` (quatro alertas).** Os destinos de escrita são caminhos
  literais do pacote A. O JSON e o CSV alimentam o texto ou as células.
- **`b58-capture.mjs`.** Usa a mesma validação canônica de CLI e a mesma chamada
  sem shell. O operador local escolhe a instalação.
- **`normalize-artifacts.py`.** A varredura parte do diretório fixo. O arquivo
  derivado recebe um sufixo fixo. O conteúdo lido alimenta a normalização.
- **`inspect-pdf.py`.** A lista fixa de casos PV restringe o identificador
  antes de abrir o PDF ou formar nomes de imagens e texto.
- **`run-database-probe.mjs`.** Ferramenta histórica de operador que recebe
  um arquivo SQL para a stack local guardada. A seleção livre do arquivo faz
  parte da operação manual. Eventual automação com entrada de terceiros
  exigiria confinamento do arquivo antes da leitura.
- **`format-audit-markdown.py`.** A varredura parte de um diretório fixo da
  auditoria e a escrita volta ao arquivo enumerado.

Esses fluxos não justificaram editar os utilitários históricos nesta rodada.
A conclusão considera os controles do checkout atual e as entradas suportadas.
O painel remoto ainda precisa analisar o candidato publicado. A classificação
remota dos alertas depende de vincular as ocorrências exibidas ao SHA analisado.

O commit `454eca8d` passou em ESLint, TypeScript e build de produção. Passaram
17 testes dos utilitários de Supabase e 12 casos dirigidos de navegador em
Android e iOS emulados, sem repetição. Os casos incluíram navegação com rolagem
por setas, matrizes, recuperação de leitura, listas, origem de materiais,
correção de chegada e quantidade identificada pelo nome acessível completo.
O manifesto confirmou as 84 migrations protegidas.

## Estado de publicação e próximos lotes

A [CI 44477574161](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/44477574161)
concluiu com sucesso para `075b4b66` e os 15 checks exibidos na PR estão
aprovados para esse SHA. O workflow foi executado uma vez e os logs dos seis
jobs de navegador não contêm marcador de retry, flaky ou falha do Playwright.
A implementação posterior e a triagem de 19/11 exigem a comprovação dos
checks do próprio SHA, inclusive Sonar e preview compatível.

A [CI 44645167326](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/44645167326)
passou nas validações Windows e Ubuntu, na instalação limpa e na evolução
legada. A regressão SQL parou na lista de permissões de `service_role`, que
ainda não enumerava seis RPCs de L2 para emissão inicial, avisos e arquivo.
O commit `97c7991a` corrige o teste com as assinaturas exatas e verifica a
negativa para `anon` e `authenticated`. A regressão isolada passou no banco
local. Na [nova CI](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/44646528431),
Windows, Ubuntu e a etapa de migrations também passaram. A etapa de
integração foi cancelada pelo GitHub quando a PR recebeu `a89e6053`.
A [CI desse commit](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/44648500971)
passou nas validações Windows, Ubuntu e migrations e iniciou as integrações.
O [preview](https://vercel.com/rmzzfajs-projects/home-care-assistant/8ZfhxW9MkQGkpELnRQ5EE1s8QkMr)
ficou pronto com o mesmo SHA. A reconciliação confirmou as mesmas 309 versões
no repositório, na stack local e no Supabase de desenvolvimento.

Os logs da execução interrompida registraram duas expectativas antigas.
A lista conserva a transferência pendente e os nomes originais, oferece
expedição ao autor habilitado e retira a tarefa de concordância da
contraparte. A REQ exige a revisão consolidada para um novo arquivamento.
Cinco integrações dirigidas passaram com Auth real após atualizar essas
regressões no commit `2da302ee`.

A execução de `a89e6053` também registrou três expectativas de arquivamento
novo pelo rascunho legado. A regressão agora exige a recusa dos dois pedidos
concorrentes e a preservação do rascunho, do diário de operações e dos
materiais emitidos. Seis integrações dirigidas passaram com Auth real,
incluindo a recuperação idempotente de cancelamento e de identificação.

A [CI de `caa58c87`](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/44652072739)
passou nos dois sistemas operacionais, na instalação limpa, na evolução
legada e nos 825 testes de integração. Os seis jobs de navegador chegaram ao
comando E2E. Esse resultado pertence ao candidato anterior às mudanças do
cartão e rodapé.

Os logs e artefatos desse candidato confirmaram duas falhas repetidas de
expectativa nos navegadores. Na importação histórica, a contagem agora usa
a lista visível Materiais requisitados e confere o estoque desconhecido em
cada um dos dois itens. Na recuperação de PDF, o teste reconhece o PDF
inicial e conta só os exemplares manuais. A recuperação pela mesma chave,
as assinaturas, a leitura dos bytes e a emissão explícita continuam sendo
verificadas. O build, os tipos e o lint dirigido passaram. A repetição
local ficou no login da administração e na seleção de contexto da fixture
de PDF, antes das asserções corrigidas. A verificação E2E segue na CI.

O [preview de `f3fe0f08`](https://vercel.com/rmzzfajs-projects/home-care-assistant/HGzAn29N7g9sog74TBkioz9yXQHP)
ficou pronto com o cartão e o rodapé de L2. O SonarCloud desse candidato
continuou com os quatro apontamentos do HTML de referência.

O [preview fixo da branch](https://home-care-assistant-git-feat-phase-d-i-3d8824-rmzzfajs-projects.vercel.app)
acompanha os commits enviados para a PR 7. A Vercel confirmou essa associação
em `80e0f5cc`. Ele é o endereço de desenvolvimento para conferir os envios de L2.

Na stack local preservada, a rodada SQL sem replay parou na regressão de
agendamento da REQ, que passou no replay da CI. Dois casos locais de PDF
inicial também terminaram com `statement timeout` ao preparar as fichas.
O teste de permissões direcionado e a emissão de REQ passaram localmente.
Na rodada de acessibilidade, a abertura do início no Android e a emissão de
COM no iOS atingiram timeout. Uma sonda local de leitura mediu 8,4 s em
`private.purchase_arrival_coverage_facts` para um identificador sem ficha,
com cerca de 36 alocações na tabela. O tempo de `select 1` na mesma sessão
foi de 0,1 ms. A causa e a extensão da lentidão seguem em investigação.

O SonarCloud da PR registrou oito apontamentos e notas C de confiabilidade
e segurança no código novo. Quatro S6853 apontaram rótulos cujos textos
estavam aninhados no JSX do produto. Seleção de materiais da REQ, listas da
casa, materiais da lista e importação de fichas de origem agora referenciam
explicitamente o texto visível pelo `aria-labelledby` dos checkboxes.
A área clicável continua sendo o rótulo nativo.
[Implementação da regra de rótulos](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/src/util/mayHaveAccessibleLabel.js).
[Análise do SonarCloud](https://sonarcloud.io/dashboard?id=RMZZFAJ_home-care-assistant&pullRequest=7).

A organização e o uso das listas em REQ, COM e ENT passaram no iOS nas
duas rodadas. O caso de importação da COM chegou à emissão no iOS na
primeira rodada. Permanece sem uma rodada completa por timeouts locais.
No Android, as falhas ocorreram antes dos controles modificados. O build,
o lint dos componentes e o Markdown passaram.

Os outros quatro apontamentos atingem o HTML aprovado, preservado pelo
SHA-256 do comando mestre. A política `unsafe-inline` pertence ao laboratório
autocontido, que fica na raiz fora de `public/` e das rotas e entregáveis do
aplicativo. O fluxo de produção usa sua própria política. A inspeção estática
deu confiança alta à classificação sem ação no produto. A declaração CSS
duplicada, o seletor de arquivo oculto e a expressão usada para ajustar texto
de demonstração também ficam no HTML de referência. Os quatro apontamentos
continuam visíveis no SonarCloud.
No commit `614402f6`, a análise confirmou quatro apontamentos abertos,
todos no HTML aprovado. O preview desse commit ficou pronto.
[Preview de desenvolvimento](https://vercel.com/rmzzfajs-projects/home-care-assistant/9E78g3V6VMvLj4zZQcmeaySYqLVQ).

L3 e L4 ainda não começaram. Quando tiverem ordem e referência aprovadas,
registrar o escopo de cada lote, suas comparações comprovadas, criações fora
do laboratório, conflitos, perguntas e inventário de banco nesta mesma página.
