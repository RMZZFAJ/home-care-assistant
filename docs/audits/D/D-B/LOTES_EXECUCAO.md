# Execução dos lotes L1 a L4

**Atualizado em 20/11/2026.** Branch `feat/phase-d-implementation`,
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

### Conferência no celular

Use um paciente de homologação e entre com o papel de cada ato. A prévia
acompanha a PR 7.
[Preview da branch](https://home-care-assistant-git-feat-phase-d-i-3d8824-rmzzfajs-projects.vercel.app).

- **Fichas → Nova requisição** (`/fichas/req`). Em Materiais, passe pelas
  categorias e compare um estoque conhecido com outro desconhecido. A edição
  pela revisão volta ao item. O vínculo de um material fica em seus três
  pontos. Após a emissão, abra a ficha e depois inicie uma nova REQ.
- **Fichas → Nova compra** (`/fichas/com`) e **Estoque** (`/estoque`). Vincule
  uma REQ, autorize o planejamento e registre parte da compra como em mãos.
  Confira o saldo disponível para ENT. Em uma chegada posterior, combine
  leitura do código e quantidade manual e confira a entrada de estoque após
  a aprovação aplicável.
- **Fichas → Nova entrega** (`/fichas/ent`) e **Nova devolução**
  (`/fichas/devolucao`). Confira a custódia de origem e o recebedor. A pessoa
  designada confirma o recebimento. Compare a quantidade expedida, a
  efetivamente recebida e o saldo em trânsito quando houver diferença. Na ENT,
  confira a avaliação familiar separadamente.
- **Ficha emitida → Materiais**. Selecione um item e abra Estoque, Histórico e
  Fichas vinculadas. Ao voltar de uma ficha relacionada, a seleção, o filtro e
  a posição são restaurados. Na REQ, Ciência familiar está em Visão geral.
- **Ficha concluída ou cancelada → Mais**. Use a revisão de arquivamento em
  ficha fictícia, baixe o PDF consolidado e confira a confirmação ou a reversão
  administrativa. Na reversão, o exemplar já emitido permanece disponível e os
  Andamentos voltam a aceitar registros autorizados.

### Jornadas e verificações

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
  A escolha de uma sugestão abre a categoria do produto em Materiais. O
  produto pode ser editado, removido e retomado com a unidade oficial. A
  revisão o mostra na sua categoria, e os detalhes digitados seguem em
  Observações. A ficha e o PDF preservam a identificação, a contagem e os
  controles de reiteração. Fichas emitidas e rascunhos legados que registraram
  a classificação anterior conservam os dados originais.
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
  Em E05-02, a origem pode ser consultada sem fechar o preenchimento. A
  escolha de cobrir outra compra exige um planejamento disponível e uma
  quantidade válida antes do envio. Se a consulta falhar, a escolha continua
  marcada, com ação de consultar novamente. Quem optar por registrar somente
  a chegada pode desligar a cobertura. A comparação de uma nova versão
  preserva a escolha em edição. O resumo mostra a quantidade que entra uma
  única vez, no registro direto ou após aprovação. O seletor de compras
  anteriores atende residências com mais de um planejamento elegível para
  o mesmo material. Este ajuste usa os contratos e as migrations vigentes.
  Seis testes em Android e iOS emulados passaram sem repetição. Conferiram
  a consulta da origem, o bloqueio durante carregamento e falha, a rejeição
  de quantidade superior à pendência, a recuperação da resposta perdida e
  um crédito por chegada. A COM associada conservou a origem no PDF assinado.
  As capturas do laboratório e do produto estão em
  `output/playwright/l2-coverage-continuity/`.

**Revisão de uma chegada avulsa pelo cartão.** Em E05-18, Revisar chegada
abre a conferência de um único CHE no Estoque. O mesmo acesso fica nos
detalhes da chegada. A consulta independe da paginação da fila e revalida
paciente, autoria, versão e autoridade antes de apresentar os dados. A
aprovação, a recusa, o pedido de correção e a recuperação de resposta
reutilizam o mecanismo de conferência em lote. Ao voltar, os detalhes ou
o cartão de origem continuam disponíveis. A ação geral de conferir
várias chegadas permanece no cabeçalho do Estoque.
Quatro testes passaram sem repetição em Android e iOS emulados. A
conferência individual recuperou a decisão após perda de resposta,
retornou ao detalhe aprovado e preservou a outra chegada pendente.
A integração verificou a abertura depois dos 30 primeiros registros,
a restrição de paciente e autoria e a leitura condicionada do saldo.
Capturas em `output/playwright/l2-arrival-card/`.

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

**Autorização do planejamento da COM.** Em E05-06, o diálogo apresenta
a identificação da ficha, a quantidade solicitada e um interruptor por
material. A quantidade autorizada aparece junto da unidade. O menu de
três pontos abre os detalhes, e o vínculo consultável mostra a origem do
material quando ela existe. O motivo do ajuste aparece ao alterar a
quantidade. O resultado apresenta os materiais autorizados e seus valores.

A recusa total continua disponível quando todos os materiais são
desmarcados. A justificativa de recusa complementa a v7, pois o banco
exige um motivo para toda alteração da quantidade solicitada, inclusive
quando fica zero. Os motivos integram o ato oficial já existente. A
autorização usa a mesma capacidade, a versão vigente e a confirmação com
a mesma chave quando a resposta se perde. Nenhuma migration neste ajuste.

O teste dirigido abriu os detalhes e a REQ vinculada, manteve a quantidade
ao desmarcar e selecionar novamente e exigiu as justificativas antes de
enviar. No Android e no iOS emulados, a resposta perdida recuperou uma
única autorização. A parcela recusada ficou com autorização zero e a
autorização preservou as quantidades compradas, recebidas e o livro de
estoque. A aquisição e a chegada ocorreram em atos separados.
As capturas de 360 e 412 px foram comparadas com E05-06. O cenário usa
dois vínculos de exemplo. Na aplicação, cada linha mostra apenas a origem
autorizada que existe no registro. Os seis casos de navegador passaram
sem repetição, incluindo o vínculo da REQ no rascunho e o percurso
REQ, COM, aprovação de chegada, estoque, ENT parcial e BAL.

**Compra física e previsão da loja.** O resultado de E05-20 foi conferido
em 390 px, com um item em mãos e outro aguardando a loja. O produto conserva
essas linhas e acrescenta a consulta recolhida de Estoque familiar para a
parcela creditada. Ela usa o saldo histórico capturado no ato e identifica
quanto havia antes, quanto entrou e quanto ficou depois. O saldo anterior é
a diferença entre o saldo capturado e o crédito confirmado daquela parcela.
A consulta exige acesso ao estoque familiar. O item com previsão informa
que o estoque ficou como estava. A chegada pendente continua distinguida da
entrada confirmada. Sem migrations novas.

No Chromium móvel e WebKit iOS emulados, quatro casos passaram sem
repetição com build de produção. O cenário de entrada aprovada conferiu
30 unidades antes, crédito de 3 e saldo de 33. A parcela de 4 unidades
permaneceu aguardando a loja. A revogação de leitura ocultou o saldo com
o modal aberto. A chegada pendente continuou sem saldo de entrada.

**Aprovação na revisão e entrega com a COM ainda aberta.** Em E05-07,
a revisão mostra a aprovação automática quando o papel na residência
é de administração e a capacidade de aprovar está vigente. A explicação
trata apenas dos materiais identificados. Para quem depende de outra
autorização, a revisão explica a aprovação do planejamento.

Em E05-19, o cartão acima das abas lista os materiais disponíveis para
entregar. Ele consulta a mesma referência que o assistente de ENT.
Cada quantidade considera a entrada aprovada na COM e o saldo atual da
família. O cartão exige permissão vigente de criar ENT e ler o estoque
familiar. Da lista é possível abrir a preparação vinculada à COM. Para
vários materiais elegíveis, uma ação abre a entrega com todos eles.
A ficha mantém a consulta e o vínculo geral de origem por suas ações
existentes. Sem migrations novas.

Os quatro casos dirigidos passaram em Chromium móvel e WebKit iOS
emulados. Com Auth real, a revisão mudou após revogar e restaurar a
aprovação. A COM foi emitida com autorização das duas unidades
identificadas no teste. A entrega importou quatro unidades do material
aprovado após uma saída do estoque familiar. A parcela pendente ficou de
fora e a perda de leitura do estoque retirou o cartão. O último reteste
passou após a recuperação do Auth local, que havia atingido timeout antes
de abrir a ficha.

**Estados de chegada por material na COM.** No recorte E05-14, a lista
e o painel usam a decisão registrada para distinguir chegada aguardando
aprovação, correção solicitada, reenvio e recusa. O motivo fica junto à
linha. Quando há várias parcelas, uma correção em aberto tem prioridade
no cartão. A coluna Chegou / entrou conserva o valor informado em
correção e a entrada aprovada em campos distintos. A recusa retira a
parcela do total atual, com seu motivo e valor preservados no histórico.

A referência foi aberta a 390 px. Chromium móvel e WebKit iOS emulados
confirmaram correção, reenvio e recusa, com os valores 4 / 0, 5 / 0 e
0 / 0 e sem mudança no livro de estoque. A regressão de navegação manteve
a volta ao ponto exato no painel e o foco do vínculo. O conjunto unitário
passou oito casos. Essa mudança de interface usa as migrations existentes.

**Compra e entrega relacionadas à REQ.** Em E04-09, o cartão acima das
abas lista COM e ENT efetivamente vinculadas. A consulta inclui a origem
registrada na ficha e o vínculo por item das entregas anteriores. Uma
compra com o mesmo material só aparece se houver vínculo registrado. Cada
linha mostra a situação da ficha e abre o painel de consulta. É possível
abrir a ficha completa e voltar ao painel da REQ. O cartão usa as
permissões de leitura de cada ficha e exclui rascunhos. A aquisição,
o recebimento e a avaliação de suficiência continuam com seus registros
próprios. As abas e ações já disponíveis na REQ foram preservadas.

O E04-09 e a retomada do painel de materiais passaram em Chromium
móvel e WebKit iOS emulados. O reteste de Chromium passou após
confirmar o Auth local com uma identidade fictícia. A integração com
Auth real confirmou que uma COM vinculada aparece, enquanto rascunhos
e fichas sem permissão de leitura ficam fora da consulta. O ensaio no
desenvolvimento conferiu os grants e executou rollback.

**Resolver pendências durante a revisão de conclusão.** Em E04-12, a
linha bloqueada abre a avaliação familiar da entrega vinculada. Em
E05-12, a linha abre a conferência das chegadas elegíveis daquela COM.
Ao fechar o diálogo ou confirmar a decisão, a revisão de conclusão
reaparece com a observação em edição e consulta novamente sua referência.
O comando definitivo continua usando a versão e o hash da referência
vigente. Quando a pessoa só pode consultar, permanece o acesso ao material
e a orientação da pendência. Se a última avaliação registra a conclusão
automática da REQ, a revisão informa o estado oficial e conserva a
observação em leitura enquanto estiver aberta. Nenhuma migration neste ajuste.

Na ENT e na DEV, a composição de E05-12 foi aplicada às pendências de
recebimento pessoal e de conciliação do saldo em trânsito. Quem pode registrar
o ato abre o mesmo diálogo da ficha pelo atalho da pendência. A operação
registra o próprio resultado, e o retorno reabre a revisão com a observação
preservada e consulta os bloqueios atuais. A conciliação usa os materiais e
as quantidades reais, na composição de E06-08.

Os quatro casos dirigidos passaram em Android e iOS emulados. Conferiram
o fechamento sem movimento, a resposta perdida do recebimento, duas
versões oficiais para os dois atos pessoais e a preservação da observação.
Nas mesmas plataformas, a regressão da ENT confirmou que o administrador
sem designação só consulta, e a da COM confirmou a revisão de chegada.
Build, TypeScript e lint dos arquivos alterados passaram. O recorte é de
interface e testes. As referências de 390 px estão em
`output/playwright/l2-ent-dev-follow-up/`.

Na COM, o padrão de E05-12 também abre a autorização, o registro da compra,
o encerramento da expectativa não adquirida e o registro da chegada
quando a pendência admite o ato e a pessoa tem acesso. O encerramento usa
o formulário e a confirmação existentes em diálogo. Ao voltar de qualquer
dessas operações, a revisão relê os bloqueios e conserva a observação e a
aba de origem. Autorizar, adquirir, encerrar expectativa e confirmar a
entrada continuam sendo atos próprios com os comandos vigentes.

O laboratório demonstra o atalho de conferência da chegada. Os quatro
atalhos complementares usam o mesmo padrão para os demais bloqueios reais.
No iOS emulado, o primeiro ensaio revelou perda do motivo ao preencher a
dispensa. O formulário passou a manter o texto ao alternar entre edição
e confirmação. Os 12 casos do reteste passaram em Android e iOS emulados,
sem repetição automática. A autorização, a compra e o encerramento da
expectativa preservaram o estoque. A chegada confirmada registrou uma
única entrada e a conclusão preservou a observação. As capturas estão em
`output/playwright/l2-com-closure/`. As mudanças usam as migrations existentes.

**Mudança de versão durante a conferência da ENT e da DEV.** A conferência
de E06-06 incorpora o comparativo anterior e atual de E04-07 para a mudança
concorrente. A referência pode vir da atualização ao vivo ou da consulta
após o conflito. Ao adotar a versão mais recente, a mesma pessoa designada
mantém a observação, os blocos abertos e os valores dos materiais cuja
identidade e unidade continuam válidas. A confirmação passa a exigir uma
nova revisão. Se a ficha já foi conferida ou a pessoa designada mudou,
o atalho retorna à versão atual da ficha e à revisão de conclusão quando
essa era a origem.

O reteste passou oito casos em Android e iOS emulados, sem repetição
automática. A ENT com troca concorrente exigiu a nova versão e uma nova
confirmação da mesma pessoa designada, com um único movimento de entrada.
Quando outro recebedor foi designado, a revisão de conclusão retomou a
observação e o estoque foi preservado. Os casos com DEV conferiram o
recebimento e a conciliação no mesmo diálogo compartilhado. As capturas
estão em `output/playwright/l2-receipt-reference/`. A mudança usa as
migrations existentes.

**Avaliação familiar a partir de REQ e ENT.** A REQ indica a avaliação
pendente junto ao item e no próximo passo sugerido quando já há
recebimento registrado. A ação no painel do material abre o diálogo da
ENT vinculada. Quando há mais de uma entrega ou linha elegível, o produto
permite escolher a referência antes de avaliar.

A composição de E04-13, E04-17, E04-18 e E06-15 usa motivo da equipe,
recebimento menor ou edição de avaliação conforme os fatos da entrega.
O bloco **Avaliação e fichas de origem** preserva a avaliação anterior,
a quantidade confirmada, a autoria disponível e os vínculos autorizados.
O diálogo pede motivo ao registrar, como na v7. A decisão confirmada
mostra o resultado e retorna ao material de origem. A avaliação continua
registrada por material da ENT. Nenhuma migration neste ajuste.

O teste com Auth real registrou integral → parcial pela REQ e parcial →
integral pela ENT. As duas avaliações permaneceram no histórico, o aviso
chegou à equipe na ficha e o livro de estoque preservou as movimentações.
As capturas em 360 e 412 px foram comparadas com o motivo e os vínculos
abertos em E04-17. A atualização do painel substituía o botão durante o
retorno no iOS. O reteste em Android e iOS confirmou o foco no controle
do mesmo material após a atualização. A recuperação de resposta perdida
e a rejeição da referência antiga também passaram nos dois navegadores.

**Conciliação de vários materiais em E06-08.** O diálogo conserva a lista
quando a decisão de um item deixa outro em apuração. Mostra a diferença
conciliada e a avaliação familiar já registrada. Abre o próximo material
com foco no título e mantém os campos em edição dos outros materiais na
sessão aberta. Fechar com campos preenchidos pede confirmação para
descartá-los. As decisões confirmadas permanecem na ficha.

A comparação em 360 e 412 px usa o estado de cinco materiais da v7.
O laboratório apresenta uma lista com um editor aberto por vez. O
produto inclui o resultado da quantidade e do destino registrados e
indica quando permanece saldo em apuração. A mesma interface é usada
na devolução, com os destinos físicos correspondentes e sem avaliação
de suficiência de REQ. Nenhuma migration nesse ajuste.

A regressão de cinco linhas confirmou foco, preservação do preenchimento
da próxima linha, recuperação de uma única decisão após perda da resposta
e o saldo dos dois primeiros materiais com Auth real. O descarte conservou
a decisão já registrada. O PDF assinado manteve o destino apurado, a
justificativa e a avaliação familiar. O caso de falta e excedente na mesma
ENT também conferiu a observação do recebedor em Materiais e no PDF.
Esses dois casos e o pedido de reavaliação da equipe passaram em Android
e iOS emulados. O reteste do pedido usou uma conta familiar com vínculo
isolado e o mesmo viewport da pessoa da equipe. O limite anterior de
30 segundos havia interrompido essa jornada ao alternar de sessão no iOS.

**Conferência conjunta de chegadas.** A comparação com E05-11 a 360 e 412 px
cobre o título, os cartões compactos, o indicador de falta ou chegada
completa, o estoque expansível e o rodapé. O corpo permite rolagem por
teclado e o estoque abre pelo controle nativo com ícone de seta. A
projeção esclarece o impacto daquela chegada. O sistema acrescenta o
protocolo CHE e a origem da chegada avulsa, a data completa e os grupos
acessíveis por compra. As telas de Início, Estoque e COM usam a mesma
conferência, com escopo de uma compra na ficha.

No Android e iOS emulados, o Estoque reuniu duas COMs e uma doação avulsa.
O teste conferiu uma chegada parcial e uma completa, desmarcou uma compra
e abriu pendência na doação. Após simular a perda da resposta, recuperou
as duas decisões e conferiu um único movimento de estoque. O Início
mostrou a compra ainda pendente. Também passaram os quatro casos de
conferência individual e chegada avulsa nos dois navegadores. O incremento
usa as migrations já instaladas.

**Revisão de cancelamento e prazo de arquivamento.** A COM usa o diálogo
de E05-13. A revisão lista as quantidades compradas, as chegadas aprovadas
e o efeito sobre o estoque por material, inclusive em fichas com várias
linhas e unidades. A v7 usa um material no exemplo. O cancelamento encerra o
planejamento quando as chegadas estão resolvidas, preservando as aquisições,
as parcelas, os vínculos e os créditos existentes. Material comprado que
ainda aguarda chegada, aprovação ou correção mantém a confirmação bloqueada.
A regra anterior impedia também o cancelamento com todas as chegadas
resolvidas. O banco continua verificando autorização e versão na transação.

ENT e DEV antes do recebimento compartilham a estrutura do diálogo de
E06-10. A confirmação continua dependendo do retorno físico à origem.
REQ, COM e entregas aplicáveis mostram na revisão o prazo lido da política
da residência, também usado na revisão de conclusão. A comparação do
laboratório usou a composição de E04-12, E04-14, E05-12, E05-13 e E06-10.
O produto preserva os dados reais inclusive quando o prazo configurado é
de 11 dias. O teste de conclusão e arquivo verificou a preservação do PDF
assinado após reverter o arquivamento.

O candidato local `21a62a69` passou seis casos de arquivamento da ENT em
Android e iOS emulados, sem repetição automática. A interface abriu as duas
revisões, concluiu a ficha e emitiu o PDF consolidado no arquivamento.
Os casos com Auth real verificaram o perfil PAdES-B-T, o reenvio pela mesma
chave, as restrições de emissão e de Andamentos durante o arquivo e os atos
de confirmação e reversão. O estoque e os bytes do PDF foram preservados.
As capturas locais estão em `output/playwright/l2-archive-current/`.

Na comparação com o arquivamento manual de E05-13 a 390 px, o seletor de
motivo da aplicação fica abaixo dos três itens da revisão. No reteste em
Android e iOS, **Outro motivo** exigiu justificativa. A mesma justificativa
apareceu na confirmação administrativa, e a reversão preservou o exemplar
e o estoque. A primeira rodada atingiu o limite de espera do teste durante
a assinatura e ao abrir o menu. A rodada final usou um administrador de
teste com vínculo isolado, aguardou a ficha e deu à assinatura a janela
da rota. Os dois casos passaram sem repetição automática.

As 29 integrações dirigidas usaram Auth real. A verificação conferiu
recusa sem autoridade, manutenção de pedidos com chegadas abertas,
repetição concorrente da mesma chave, preservação do estoque e da
dispensa anterior e uma única ocorrência nova no histórico. Os percursos
móveis em Android e iOS emulados conferiram o rodapé a 360 e 412 px,
o cancelamento sem rascunho, a recuperação da resposta perdida e o
retorno ao menu de origem com a aba Andamentos preservada.

**Saldo alterado no cancelamento após recebimento.** Em E06-12, a comparação
mostra, por material, o retorno mínimo para conciliar e o consumo confirmado
disponível. O valor anterior aparece riscado quando há diferença e os
rótulos Antes e Agora são lidos por tecnologia assistiva. A quantidade
fisicamente devolvida e a justificativa continuam na revisão ao adotar a
referência. Uma nova conferência física é exigida antes de consentir.
Quando a referência anterior estava indisponível ao perfil, a comparação
mostra os valores atuais autorizados. A referência foi conferida a 390 px.
Sem migrations novas.
Com Auth real, os dois casos dirigidos passaram em Android e iOS emulados.
Uma nova unidade consumida mudou o retorno mínimo de uma unidade para zero
na mesma versão da ficha. A adoção preservou os campos e exigiu outra
conferência antes de efetivar a decisão. No iOS, o primeiro ensaio atingiu
30 segundos no fim da jornada. O caso passou em 54,5 segundos no reteste,
com o limite total de 90 segundos e os limites individuais preservados.

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

**Privacidade das chegadas avulsas no Histórico.** A consulta do material
aplica a mesma regra da ficha CHE. Quem informou e quem tem autoridade
para conferir podem ver a chegada pendente. Para os demais familiares,
uma chegada aprovada aparece quando existe permissão de ler o estoque
familiar. A regra vale para a referência, os eventos e a contagem de
registros. As movimentações continuam seguindo a regra de custódia.

A integração com Auth real verificou autor, administração, outro
familiar e revogação da leitura do estoque. Passaram os quatro casos
dirigidos do contexto de materiais, incluindo a consulta pelo catálogo.
O Chromium móvel também confirmou a consulta da chegada pelo autor e o
retorno ao histórico após instalar a migration.

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
focado. O rodapé normal exibe o estado da gravação automática. A ação de
salvar e fechar pertence ao diálogo de saída. Resultados incertos usam os
controles específicos de recuperação.

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

**Ler código** reúne câmera, foto e entrada manual no diálogo da COM e da
ENT. A conferência segue E05-04, com material, unidade do catálogo,
apresentação, fator e quantidade a incluir. O seletor oferece apresentações
cadastradas do mesmo material e a opção de informar outra. Confirmar soma
a quantidade ao preenchimento. Sair conserva o que já estava na ficha.
Quando a conversão usa o cadastro, a ficha guarda a versão da apresentação.
Fator ou total ajustado para aquela leitura entra como quantidade manual
na unidade padrão. Se a apresentação já selecionada tiver outra versão,
o diálogo encaminha à comparação em Editar embalagens. Código indisponível
permite tentar outro ou voltar à lista.

Os quatro casos dirigidos passaram em Android e iOS emulados. Na COM,
a leitura de uma versão nova ficou bloqueada até a adoção explícita da
referência. Na ENT, câmera negada, código desconhecido e saída sem aplicar
preservaram o preenchimento. A digitação e a foto de um EAN fictício
levaram a cinco unidades expedidas, duas com a conversão cadastrada e três
pela correção manual. O perfil designado confirmou o recebimento.
Nos dois navegadores, a rolagem interna mostrou o total inteiro antes de
confirmar e manteve as ações do diálogo acessíveis. Capturas de E05-04 e
da entrega em `output/playwright/l2-supply-barcode/`.

Na CI de `b7d5ca1f`, validações Linux e Windows e o job de banco passaram.
Os cinco jobs de navegador concluídos somaram 52 falhas após a repetição.
Um caso de recebimento pessoal no iOS passou na segunda tentativa. O
Chromium 2 foi cancelado após cerca de 40 minutos. A comparação do fator
obsoleto também falhou nessa CI ao voltar para a categoria incorreta. O
teste dirigido deste incremento cobre essa correção. Os demais casos de
abertura, fichas, rascunhos e fluxos do segundo shard seguem em triagem.
[Execução da CI](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/44691631298).

Na REQ e na COM, o log da CI mostrou o menu flutuante interceptando a
abertura de Arquivos gerados e de Conferir chegadas. A verificação da
ação ausente agora espera o menu abrir, confere a ausência da ação e
aguarda o fechamento do menu e da sobreposição antes do próximo controle.
A reprodução local no iOS emulado encontrou a mesma falha na REQ.
Os três percursos dirigidos passaram em Chromium, Android e iOS emulados.
O primeiro Chromium da COM excedeu o limite do PostgreSQL local ao criar
a ficha de teste. O reteste dirigido passou sem retry automático.

Na abertura da COM, o catálogo vazio ou só com materiais inativos volta a
ter o estado de E04-16. Quem administra pode ir direto ao cadastro ou à
gestão. **Planejar com item extra** preserva a opção já existente de emitir
um planejamento com cadastro pendente. A ação leva a Itens extras e só
passa a guardar rascunho quando há preenchimento. Rascunhos existentes
continuam disponíveis para retomada na abertura.

Android e iOS emulados reproduziram o estado vazio, o atalho de cadastro,
a edição e a retomada do extra, seguidas da emissão sem entrada de estoque.
No mesmo teste, quem pode requisitar recebeu a orientação para pedir
cadastro ou revisão dos inativos. Os casos dirigidos de indisponibilidade e
recusa de acesso na REQ e recuperação da referência na DEV também passaram.

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

O teste de pré-vínculo da ENT passou a verificar a avaliação ao lado do
material, conforme E04-10. Só a necessidade em aberto vem selecionada.
O teste conferiu a avaliação integral gravada no rascunho e a caixa
desmarcada após descartá-lo, sem emitir outra entrega. Passou em
Chromium, Android emulado e iOS emulado sem retry automático.

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

**Falha parcial depois de registrar a ficha.** O resultado conserva a
confirmação da emissão e informa se a pendência está na consulta, nos avisos
ou no PDF inicial. A recuperação começa pela consulta da solicitação
existente. Após perder a resposta de uma etapa auxiliar, a interface consulta
o mesmo identificador antes de avançar. O download aparece após confirmar o
exemplar. O diagnóstico recolhido informa operação, código, referência quando
disponível e contagem de tentativas. Depois de duas recuperações explícitas,
o botão de copiar fica junto às ações de compartilhar e acompanhar a ficha.
Essa composição combina o resultado e o suporte de E04-07 a 390 px para a
falha parcial da seção 12.3 do mestre. Sem migrations novas.
Quatro verificações passaram em Android e iOS emulados, sem repetição.
Com falha persistente nos avisos, a COM continuou consultável e o diagnóstico
ficou disponível após duas recuperações. Na perda das duas respostas, uma
consulta confirmou cada etapa e recuperou o mesmo PDF assinado. A verificação
conferiu o identificador do exemplar, a versão da ficha e uma única COM.

### Revisão dos wizards após o retorno do responsável

A comparação em celular usou E04-01, E05-01, E06-01 e E06-16. A identidade
da confirmação, a lista contínua, os controles na linha do material, o menu
de três pontos e o estado do rascunho no rodapé seguem essa composição. A
REQ separa a urgência da inclusão, destaca a linha urgente e agrupa a
revisão por tipo. A avaliação da necessidade em ENT permanece junto do
material. A consulta de detalhes fica no menu também durante a revisão.

A REQ abre listas frequentes por um único controle na confirmação. As
listas pessoais ficam nesse contexto como recurso adicional do produto.
COM e ENT mantêm um seletor de origem geral na confirmação. O menu do
material pode abrir o vínculo daquela linha sem importar os demais itens.
A COM usa o planejamento neutro. Compra ou doação é registrada quando a
família adquire ou recebe os materiais.

O BAL compartilha o estado da gravação automática no rodapé. Na abertura
da ficha emitida, os estados intermediários de sessão e rota usam o mesmo
carregamento da emissão. O diálogo de reiteração da REQ passa a usar o
rodapé padrão com as ações de confirmar e voltar.

Em Android emulado, a REQ manteve o indicador por etapas durante a leitura
retida da ficha. O PDF terminou de assinar cerca de 34 segundos após a
reserva, depois do prazo geral de 30 segundos da chamada no navegador. A
geração inicial agora aguarda o prazo próprio do endpoint. As demais
consultas continuam usando o prazo padrão.

O reteste da REQ passou em Android e iOS emulados, incluindo a emissão, o
carregamento durante a abertura e o download do PDF assinado. O caso do BAL
confirmou a gravação automática pelo rodapé e a revisão no iOS. No Android,
o PostgreSQL interrompeu a preparação do BAL. A COM confirmou o vínculo
geral e o vínculo por material no primeiro Android e no iOS do reteste.
O reteste Android chegou à emissão e recebeu indisponibilidade do banco.

Complementos do produto nesta revisão incluem busca para catálogos reais,
descrições de saldo e vínculo, alternativas do catálogo e recuperação do
rascunho em falha ou conflito. O bloco de identidade usa paciente, autor e
vínculo autenticados. A referência de consulta da DEV permanece associada
ao saldo e às pessoas verificados no servidor.

Permanecem em revisão visual as variantes de modais de operação. A rodada
seguinte tratou a escolha de recebedor e a retomada dos assistentes. Nenhuma
migration nesses ajustes.

### Materiais sugeridos e recebedores nos assistentes

Em E05-01, E06-01 e E06-16, aceitar uma sugestão do catálogo leva à
categoria do material em Materiais. Uma quantidade digitada é preservada
quando a unidade corresponde. Extras continua reservado aos cadastros
pendentes do preenchimento atual. A retomada continua exibindo os itens
extras de catálogo preservados por versões anteriores. Os controles de
quantidade com unidade e o botão Item extra são compartilhados.

A DEV passou a apresentar o recebedor no mesmo cartão da ENT e a aplicar
a escolha somente após confirmação no diálogo. A comparação de escala da
ENT aparece quando os dados que orientam a escolha mudam. O produto
conserva as consultas e a comparação de referências reais. Esses recursos
e a busca compartilhada por nome complementam os exemplos móveis da v7.

Na emissão e na abertura da ficha, os avisos do rascunho ficam fora da
tela de operação. A retomada de preenchimento ativo e a recuperação de
tentativa incerta continuam acessíveis em seus respectivos fluxos.
Ao sair da última categoria, o assistente revisa também os materiais das
categorias anteriores e volta à lista que tiver uma correção pendente.
No Android e no iOS emulados, os testes verificaram a nova REQ após a
emissão, a Ciência familiar em Visão geral, a atualização transacional
do saldo da equipe, o vínculo de um item pelo menu e a emissão de uma
única linha ao aproveitar materiais do catálogo em COM e DEV.
A ENT preservou a pessoa selecionada e sua justificativa ao adotar a nova
escala, devolveu o foco ao seletor e bloqueou a expedição com referência
desatualizada nos dois navegadores emulados.
Nenhuma migration neste ajuste.

### Decisões e dúvidas de L2

**Leitura de código nas chegadas.** A COM de E05-09 e a chegada avulsa
de E05-17 usam a conferência compartilhada. A apresentação, a quantidade
de embalagens e o fator aparecem assim que o código é reconhecido. O
seletor inclui os formatos do laboratório e a apresentação cadastrada
reconhecida. A escolha de outra embalagem com conteúdo variável exige
informar o fator. A quantidade final usa a unidade oficial do material.

Ao confirmar uma leitura, o sistema mostra a soma com a quantidade já
digitada e atualiza o preenchimento. Essa continuidade complementa o
exemplo da v7, que preenche uma leitura de cada vez. Os atos de aprovação,
o controle de excesso e os lançamentos de estoque continuam no registro
da chegada. A COM só oferece os materiais que aguardam chegada. O diálogo
permite tentar novamente quando a consulta do código falha e retorna o
foco à ação de leitura. Nenhuma migration acompanha o ajuste.

Em Android e iOS emulados, a COM recuperou a consulta do código após falha
simulada, somou seis unidades a duas já digitadas e exigiu confirmação
para o excedente. O primeiro Android parou na consulta de contexto do
login. O reteste usou um administrador de teste vinculado apenas ao
paciente do cenário. A captura final no iOS confirma os campos em linhas
como na referência móvel de 390 px. O mesmo build passou a leitura e
expedição da ENT com conversão do catálogo e ajuste manual.

A doação avulsa converteu quatro pares em oito unidades, recuperou a
resposta perdida e creditou o estoque uma vez após aprovação. No iOS,
uma execução mostrou o resultado aprovado sem retornar à consulta ao
clicar. O reteste trouxe a página revisora para frente, aguardou a saída
do diálogo anterior e confirmou o retorno aos detalhes. Os retestes
passaram em Android e iOS sem repetição automática. Capturas em
`output/playwright/l2-arrival-barcode/`.

**Leitura de código na DEV.** O botão em Materiais de E06-16 abre o
mesmo diálogo de identificação e conversão da COM e da ENT. O resultado
exibe material, unidade e apresentação. Corrigir expande os campos de
quantidade e permite escolher Caixa, Pacote, Par ou Unidade. Um código
desconhecido oferece nova leitura ou retorno à seleção manual.

A DEV mostra o saldo disponível da equipe. Quando o material já está
preenchido, a confirmação substitui a quantidade após validar esse saldo.
O total fica no preenchimento e só movimenta estoque na expedição. COM e
ENT conservam o cálculo acumulado e a versão da apresentação cadastrada.
Nenhuma migration acompanha o ajuste.

O v7 foi conferido a 390 px. Em Android e iOS emulados, a DEV reconheceu
a apresentação de um material inativo ainda com saldo, bloqueou 12 unidades
quando havia 10, aplicou a correção para 5 e devolveu o foco à ação de leitura.
A expedição foi recuperada após perda de resposta com um único lançamento.
O destinatário recebeu 3 unidades e 2 permaneceram em trânsito. A primeira
rodada parou no seletor de apresentação. A segunda encontrou a indicação
de material inativo na revisão com inicial maiúscula. As duas verificações
foram corrigidas e o reteste final passou sem repetição automática.
COM e ENT também passaram em Android e iOS emulados. Capturas locais em
`output/playwright/l2-dev-barcode/`.

**Correção da leitura de código na COM e na ENT.** Em E05-04 e E06-03,
o diálogo compartilhado mostra o nome da apresentação e a quantidade por
embalagem no mesmo resumo. Corrigir inclui Caixa, Pacote, Par e Unidade
ao lado das apresentações reais do catálogo. Par e Unidade iniciam com
dois e um, respectivamente. Caixa, Pacote e Outra apresentação exigem
informar o conteúdo quando são escolhidos como conversão manual.
Os ajustes manuais entram na unidade oficial do material. A apresentação
cadastrada usada com o fator original conserva identificação e versão.
Nenhuma migration acompanha esta alteração.

Em Android e iOS emulados, a correção passou de Par e Unidade para uma
embalagem com fator informado, e a confirmação deixou a quantidade em
trânsito até o aceite pessoal. O registro oficial preservou a conversão
proveniente do catálogo e a soma do ajuste manual. O teste também cobriu
câmera negada, código indisponível, leitura de EAN por foto e retorno sem
incluir. A referência das duas fichas foi aberta a 390 px e comparada com
o diálogo da ENT no iOS emulado. Capturas locais em
`output/playwright/l2-barcode-conversion/`.

Na COM, o iOS confirmou o bloqueio do fator obsoleto, a adoção do fator
atual e o registro de 24 unidades. A primeira execução parou na geração
do PDF ao atingir 15 segundos. O caso passou com a espera de até 65
segundos já usada pelos demais testes de emissão. Lint, tipos e build
de produção passaram.

**Revisão seguinte pedida pelo responsável.** A reabertura de um assistente
reconhece automaticamente um resultado confirmado. A retomada de um
preenchimento ativo usa o mesmo diálogo com paciente, data, etapa e
materiais. Uma tentativa ainda incerta conserva sua recuperação própria.

Os assistentes de REQ, COM, ENT e DEV compartilham busca, contagem e ações
de materiais. Continuar percorre as categorias com materiais antes de
abrir Extras. As categorias vazias seguem consultáveis pelas abas. Os
formulários de cada ficha conservam os seus contratos de estoque, expedição,
contagem e aprovação. A composição comum evita manter quatro versões da
mesma busca, barra de ações e retomada.

Na REQ, Estoque atual começa com a referência consultada da equipe. A
emissão usa a contagem informada. A orientação da linha distingue zero
de saldo desconhecido e o rodapé apresenta a gravação do rascunho. Ao
escolher uma correspondência do catálogo em Extras, a ficha abre sua
categoria em Materiais. Contagem e urgência digitadas são preservadas e os
detalhes livres entram em Observações. Ciência familiar e o atalho de
acompanhamento agora apontam para Visão geral.

Novas ENT seguem Família → Equipe. A confirmação apresenta o recebedor
e a indicação de plantão conforme a escala consultada. A escolha e a
comparação de referências ficam no diálogo, com confirmação antes de aplicar.
Devoluções novas usam o assistente DEV. Um preenchimento histórico de
devolução recuperado pela rota antiga conserva sua identidade.

No iOS emulado, a REQ passou da emissão assinada ao início de outra
requisição sem o aviso de resultado anterior. A ENT mostrou a pessoa em
plantão e permitiu designar outro recebedor com justificativa. O ator da
escala permaneceu impedido de aceitar a entrega no lugar dele. Na REQ de
teste do catálogo, a escolha de Gaze percorreu duas categorias, reapareceu
no rascunho na etapa salva e registrou três pacotes tanto na ficha quanto
no saldo da equipe. A consulta local encontrou o PDF assinado disponível
após a janela de 15 segundos do teste. Os prazos da verificação foram
ajustados nas operações que incluem abertura e assinatura da ficha. O
reteste da escolha no catálogo passou até o download do PDF assinado.

O diálogo compartilhado de retomada segue a composição de E04-06. Exibe
paciente, autor, data, etapa, lista compacta com ícone e quantidade e ações
lado a lado a 360 e 412 px. No BAL, a lista inclui as contagens zero. O
rascunho mantém os nomes e as unidades que foram salvos. Seu resumo usa
essas informações, enquanto o laboratório também apresenta códigos de exemplo.
Na REQ, a resposta perdida durante a liberação do rascunho já emitido foi
recuperada com a mesma chave. O teste verificou a abertura de um novo
preenchimento sem diálogo do resultado anterior e uma única emissão oficial.
No BAL, o descarte privado preservou uma tentativa de contagem separada.

**Edição a partir da revisão e retomada no mesmo dispositivo.** Os
assistentes de REQ, COM, ENT e DEV usam a mesma composição para o
catálogo na revisão. Cada linha abre a categoria correspondente e
leva o foco à quantidade ou ao controle disponível daquele material.
Itens extras e Observações têm suas próprias ações de edição.
A DEV usa os mesmos grupos, com a identificação e o estado dos
materiais de devolução.

Novas REQ, COM e ENT usam o rascunho privado do servidor para retomar
o preenchimento. Quando o servidor ainda não tem rascunho, uma cópia
local antiga com conteúdo utilizável pode ser retomada ou descartada
no mesmo diálogo. O histórico da etapa só aparece quando foi gravado.
O pacote da tentativa oficial permanece independente para a conferência
de um resultado incerto.

Na rodada final, dez casos passaram sem repetição em Android e iOS
emulados. A comparação em 320 e 390 px usou E04-01, E05-01 e E06-01
para conferir a composição dos cartões de revisão e a seleção da ENT.
Os testes conferiram foco no material, acessibilidade nas cinco
larguras e recuperação da mesma REQ e do mesmo PDF já assinado.
Rodadas dirigidas anteriores verificaram a retomada das cópias locais,
a revisão da DEV, o saldo decimal exato da REQ e a nova REQ após
emissão, com carregamento por etapas até o resultado.

**Composição da aba Materiais.** REQ, COM, ENT, DEV e BAL usam o mesmo
cabeçalho, filtro, lista compacta e painel do material. Cada ficha mostra
as medidas do seu processo. Na linha compacta do BAL ficam a contagem
física e o estoque familiar atual. No painel do material ficam também a
referência histórica e a diferença. A comparação de toda a contagem fica
em **Comparar contagem e referência**, dentro de **Contagem e revisão**.

**Ordem da aba Materiais.** A lista compacta abre a aba de REQ, COM, ENT e
DEV com materiais identificados. Em REQ, o resumo de atendimento e situação
da ficha fica abaixo. Nas fichas de movimentação, as fichas de origem e as
ações de avaliação continuam disponíveis abaixo da lista. Na COM, a
identificação de extras permanece acessível e fica em primeiro plano quando
é o único conteúdo. São complementos operacionais do produto. O filtro
retém a busca e devolve o foco ao seletor. Limpar busca devolve o foco ao
campo de pesquisa. Sem alteração de API, estoque ou migrations.
Os 34 casos dirigidos passaram em Android e iOS emulados, sem repetição.
A comparação da lista com o v7 cobriu 320, 360 e 412 px. A rodada também
confirmou a emissão e abertura de uma nova REQ sem aviso anterior, a
Ciência familiar em Visão geral, o saldo editado da equipe, a retomada
de rascunhos, a seleção de recebedor e a DEV autônoma.

**Rascunhos de Andamentos.** A categoria ou a etapa alterada já caracteriza
um preenchimento. O salvamento automático e a saída voluntária preservam
essas escolhas mesmo antes do texto. Ao reabrir um preenchimento ou
descartar o rascunho, a audiência, as menções e o destaque voltam ao padrão do papel
vigente. O pacote de publicação já enviado mantém a audiência escolhida
para a conferência da mesma tentativa. O v7 foi conferido em 390 px. A
retomada dos quatro campos vem da política L1. Sem migrations novas.
Os quatro casos finais passaram sem repetição em Android e iOS emulados.
Com Auth real, quem publicou consultou o novo andamento privado e o
profissional mencionado no rascunho descartado ficou sem acesso. A rodada
também confirmou a recuperação do salvamento e da publicação após perda de
resposta. A automação agora aguarda o fechamento da confirmação de saída e
a mensagem de publicação antes de consultar o banco.

**Escolha do recebedor nos assistentes.** A ENT e a DEV usam os mesmos
cartões de seleção de E06-01 e E06-16, com confirmação no rodapé. Na ENT,
a escala é consultada ao abrir o diálogo e o plantão inclui o horário
quando consta da referência. Uma mudança de escala abre a comparação no
próprio diálogo e preserva a escolha e a justificativa em edição. A busca
complementa a referência nas listas com mais de oito pessoas. A DEV mostra
os papéis da família e explica quando o recebedor anterior ficou
indisponível. O seletor de inclusão dos quatro assistentes fica entre a
identificação do material e o menu de ações. O diálogo de retomada
identifica o tipo da ficha, inclusive DEV, e apresenta os materiais salvos.
As categorias exibidas vêm do catálogo do paciente.

A busca em Materiais conserva o filtro e cabe ao lado dele no celular.
O status de rascunho fica no rodapé durante o preenchimento. Durante o
carregamento por etapas da emissão ou expedição, a tela mostra apenas o
estado da operação. A tentativa oficial mantém a recuperação própria.

**Entrada da DEV e confirmação dos assistentes.** A rota Nova devolução
abre a confirmação diretamente para quem pode expedir pela equipe.
Sair volta à ficha de origem quando o fluxo partiu dela, ou à central.
O campo compartilhado de quantidade segue a borda, a altura e a tipografia
do controle v7, com a unidade na mesma superfície. O texto da unidade
usa contraste de 5,22:1 no fundo branco, acima do mínimo de 4,5:1.
A contagem de seleção, a leitura de código quando aplicável e Item extra
compartilham a barra compacta. Os tipos do catálogo real e a busca
permanecem acessíveis em todos os assistentes deste lote.
Avançar em Materiais percorre as listas com itens. Voltar de Extras retorna
à última dessas listas. A orientação da REQ distingue saldo zero de saldo
desconhecido.

Ao emitir REQ, COM ou ENT, o carregamento dinâmico começa na gravação
final, antes da emissão, e o rodapé deixa de exibir o estado do rascunho.
Se duas abas reconhecerem a mesma emissão, a segunda relê o preenchimento
atual ao receber o conflito de versão. Ela abre a nova ficha quando o
slot está vazio e oferece a retomada quando já existe um rascunho ativo.
A recuperação de uma emissão com resultado incerto conserva sua chave.
Sem migrations novas.

Os ensaios de REQ retiveram a resposta da gravação final para verificar
o carregamento desde o primeiro passo e a ausência do status do rascunho
no rodapé. Também cobriram o reconhecimento concorrente em duas abas,
a perda da resposta de reconhecimento, a contagem decimal e a Ciência
familiar em Visão geral. Em COM, o retorno de Extras preservou a quantidade
na última lista. A DEV abriu diretamente, retomou a preparação e concluiu
o recebimento pessoal. A ENT manteve a edição durante a troca de escala
e só expediu após adoção da referência atual.

A comparação de seleção e revisão da ENT executa as verificações de
acessibilidade em cinco larguras. O limite desse caso foi de 180 para
240 segundos após o WebKit chegar à última verificação de teclado e
atingir o tempo total. As larguras e as verificações foram preservadas.
O caso completo passou nos dois navegadores emulados. No total, 22 casos
dirigidos dos assistentes passaram nos resultados finais, além dos quatro
casos do saldo no resultado da compra mista.

**Avaliação familiar na revisão de conclusão.** Cada material pendente da
ENT pode abrir o diálogo existente de E06-15 diretamente da revisão, para
quem tem autorização de avaliar a necessidade. A observação da conclusão
permanece em edição. Ao voltar, a ficha consulta novamente as pendências.
A avaliação da necessidade é posterior ao recebimento e conserva o saldo
físico. Uma resposta incerta usa a confirmação da mesma tentativa. As duas
mudanças de interface usam as migrations existentes.

A primeira rodada passou 30 casos em Android e iOS emulados sem
repetição. Ela conferiu o percurso entre categorias, os vínculos por
material, a escolha do catálogo a partir de Extras, a retomada, a emissão
de REQ com ajuste de estoque e a abertura de outra REQ. Incluiu Ciência
familiar em Visão geral, a troca de recebedor, a DEV autônoma e o retorno
à conclusão após avaliar cada material de uma ENT. As capturas locais
estão em `output/playwright/l2-wizard-consistency/`.

O reteste confirmou a busca reversível e a ausência do status de
rascunho durante o carregamento por etapas da emissão. No teste de catálogo, a
auditoria da COM no iOS ultrapassou o prazo com milhares de vínculos de
pacientes acumulados na conta de teste compartilhada. O ensaio passou a
usar identidades isoladas, com os mesmos papéis, mantendo as verificações
de teclado, acessibilidade, categorias, revisão e ausência de gravação.
Os seis casos de catálogo passaram em Android e iOS emulados, sem retries.
A revisão e a aplicação do balanço têm seus controles próprios na aba.
REQ apresenta sob o nome do material os códigos de entregas já relacionados
à linha. A busca para catálogos maiores que o exemplo E04-11 e as demais
abas continuam acessíveis.

A unidade aparece uma vez na identificação sob o nome do material,
como em E04-11. As quantidades nas duas colunas preservam as casas
decimais e o espaço para rótulos longos. O leitor de tela recebe a unidade
junto dos valores. Os painéis de detalhe exibem as quantidades com unidade.
Na REQ, o painel mostra a contagem original e seu horário quando informado,
além das contagens das demais requisições relacionadas.

Na rodada final em iOS emulado, cinco casos compararam as linhas emitidas
com E04-11 em 360 e 412 px. REQ, COM, ENT e BAL também foram exercitados em
320 px. Os testes conferiram fundo, espaçamento, tipografia e duas colunas.
A REQ foi comparada no estado urgente. O BAL preservou a contagem zero, a
referência e a diferença no painel, a busca e o retorno de foco. A tabela
expandida manteve a rolagem por teclado. A DEV foi comparada após retomar
o extra, resolver sua identificação e expedir. A consulta preservou o
livro de estoque. O build, a checagem de tipos e o lint passaram.

Após ajustar as unidades, sete casos passaram no iOS emulado com build de
produção e sem repetição. Incluíram os cinco tipos emitidos, os valores
zero e sete, saldo desconhecido, campo vazio e a data da observação da REQ
após recuperar uma resposta perdida. A declaração DEV ainda sem expedição
exibiu sua quantidade declarada sob o rótulo correspondente.

**Vínculo por material em REQ e BAL.** O menu usa o seletor dos demais
assistentes, com os mesmos filtros de tipo. O complemento implementado usa
como referência as fichas emitidas e visíveis do mesmo paciente que
contêm o mesmo material. A escolha acompanha a revisão do rascunho
e é registrada com autor, instante e versão na transação da emissão.
As origens de COM, ENT e DEV preservam a seção 7 do comando mestre.
Vínculos documentais da REQ e do BAL deixam estoque, atendimento,
aprovação e exemplares assinados sob seus contratos existentes. A aba
Materiais apresenta os vínculos da linha e permite consultar a ficha.

A integração local confirmou a retomada do rascunho, a emissão de REQ e
BAL, a repetição com a mesma chave, a rejeição de outro material sem
efeito na emissão e a ocultação da referência após revogar a leitura
da ficha relacionada. A migration `20261120214300` foi instalada no banco
local sem reset.

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

Consulta de 21/11/2026 à stack local `home-care-assistant` e ao Supabase de
desenvolvimento vinculado `qwfrqychokvhdzakibid`. Os bancos compartilham
**316 versões**, com 242 versões anteriores a L1, 18 de L1 e 56 de L2.
Os SQL de cada versão ficam em [supabase/migrations](../../../../supabase/migrations/).
A fila de aplicação vinculada está vazia. Produção fica fora desta consulta.

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
`20261119233039`, `20261120043839`, `20261120052605`, `20261120214300`,
`20261120231639`, `20261121014430`, `20261121063729`, `20261121075902`.

`20261121075902` compartilha a regra de leitura de chegada avulsa entre a
lista, a ficha e o Histórico do material. A instalação local ocorreu pelo
preparo da stack. O ensaio vinculado conferiu a função privada e executou
rollback. O backup cifrado `9b5e810f-4fdb-4ed6-9e02-a04ab01d5b2a` foi
verificado antes da aplicação no desenvolvimento. Depois, a consulta
confirmou a versão, a regra compartilhada no Histórico e os grants.

`20261121063729` acrescenta a consulta de COM e ENT relacionadas à REQ.
O histórico da stack local foi conferido com o SQL do repositório.
No desenvolvimento, o backup cifrado
`a7d8ede0-d7ea-4f94-a1e7-eca1a2b89784` foi verificado antes da aplicação.
A captura usou o pooler de sessão para os dumps e conferiu o Storage.
A consulta posterior confirmou a versão e os grants.

`20261121014430` permite consultar a conferência de um CHE pelo cartão.
O backup cifrado verificado foi `f954d1bb-9de2-4640-91cd-faf04dc312a6`.
O ensaio confirmou os grants e executou rollback. A aplicação vinculada
acrescentou somente esta versão. A consulta confirmou 314 migrations e
fila vazia no desenvolvimento, com execução pública da RPC restrita ao
papel autenticado.

`20261120231639` permite cancelar uma COM cujas chegadas estão resolvidas.
Os bloqueios ficam na transação existente. O ensaio remoto executou o SQL
e verificou os grants com rollback. O backup cifrado verificado foi
`61f6bad5-6d07-4010-baf3-f154674765fc`. A aplicação vinculada acrescentou
somente esta versão. O desenvolvimento confirmou 313 migrations, fila
vazia e função interna sem acesso direto pelo papel autenticado.

`20261120214300` guarda os vínculos documentais por material da REQ e do
BAL. A única versão pendente foi aplicada após confirmar o prefixo de 311
versões, verificar o backup cifrado
`f99cd5cb-63a3-4398-b4e4-c4fbbd16b46a` e ensaiar SQL e grants com rollback.
Naquela conferência os históricos local e remoto tinham 312 versões. A fila vinculada
ficou vazia. A leitura direta da tabela está bloqueada e o seletor exige
uma sessão autorizada.

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

A [CI de `b74013c4`](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/44886723003)
passou nas validações Windows e Ubuntu, na instalação limpa, na evolução
legada e em 830 testes de integração. Os seis grupos de navegador estavam
executando os E2E na consulta de 21/11. O ajuste das chegadas `21a62a69`
ficou local durante essa execução para evitar o cancelamento do workflow.

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
foi de 0,1 ms. A causa dessa medição ficou indeterminada.

Na nova sonda de leitura de 21/11, a stack local tinha 47 alocações e
10.764 fichas. A primeira execução de `EXPLAIN ANALYZE` para um
identificador sem ficha levou 11,7 ms. A consulta repetida e os casos
com compra coberta, compra de origem e chegada avulsa levaram de 5,4 a
6,8 ms. A consulta ausente retornou uma lista vazia e os casos com vínculo
retornaram de um a dois registros. A medição anterior de 8,4 s não se
repetiu. A sonda foi somente leitura.

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

Em `0333ed78`, os três apontamentos que falharam o gate de confiabilidade
e segurança ainda estavam no HTML aprovado. A configuração versionada da
análise automática restringe a exclusão ao caminho exato desse artefato.
O HTML continua íntegro e executado nas comparações visuais de navegador.
As regras, a análise do produto e o escopo dos testes permanecem vigentes.
O efeito no gate exige uma nova análise da PR.
[Escopo da análise automática](https://docs.sonarsource.com/sonarqube-cloud/appendices/troubleshooting).

L3 e L4 ainda não começaram. Quando tiverem ordem e referência aprovadas,
registrar o escopo de cada lote, suas comparações comprovadas, criações fora
do laboratório, conflitos, perguntas e inventário de banco nesta mesma página.
