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
real, PDF e retomada do extra da COM. As capturas da REQ também mostram os
ajustes restantes de cabeçalho, rodapé, posição do status do rascunho e aviso
duplicado na validação. Esses pontos seguem na revisão visual do assistente.

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

**Divergências e dependências.** A v7 reúne etapas que o repositório já
expunha em entradas usuais e pelo assistente de transferências. Os fluxos
foram aproximados visualmente com preservação da etapa salva em rascunhos
antigos. O PDF inicial usa o pipeline real de emissão, assinatura e controle
de acesso. O SHA de referência anterior `075b4b66` tem um leitor anterior à
combinação de declaração pendente e expedição disponível que o banco de
desenvolvimento passou a expor. A aplicação no preview acompanha esse banco
quando roda com o leitor compatível. Há registro da ausência de transferências na
conferência histórica de aplicação inicial, sem inferência sobre dados atuais.

### Decisões e dúvidas de L2

- **P1 — Reversão de contagem de REQ superada por nova contagem oficial.**
  Sem decisão registrada. A reversão comum preserva
  movimentos posteriores. Outra contagem absoluta bloqueia a reversão até
  definir como registrar a precedência da contagem mais recente. A proposta
  registrada preserva a contagem oficial posterior e marca a antiga como
  superada.
- **P2 — Fechamento do excedente recebido em ENT/DEV.** Sem decisão
  registrada. O sistema reconhece inicialmente o expedido e
  guarda o excedente em apuração. Faltam o responsável por confirmar a origem,
  os efeitos da regularização e o desfecho quando a origem não confirmar.
  A proposta registrada vincula o débito e o crédito à mesma entrega após
  confirmação da origem e disponibilidade pertinente.

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

Consulta de 19/11/2026 à stack local `home-care-assistant` e ao Supabase de
desenvolvimento vinculado `qwfrqychokvhdzakibid`. São **309 versões em cada banco**,
com 242 versões anteriores a L1, 18 de L1 e 49 de L2.
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
`20261119233039`.

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
integração ainda estava executando na consulta de 19/11.

L3 e L4 ainda não começaram. Quando tiverem ordem e referência aprovadas,
registrar o escopo de cada lote, suas comparações comprovadas, criações fora
do laboratório, conflitos, perguntas e inventário de banco nesta mesma página.
