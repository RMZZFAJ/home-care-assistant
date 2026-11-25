# Execução dos lotes L1 a L4

**Atualizado em 24/11/2026.** L4 em execução na branch
`feat/phase-d-continuation`, avançada a partir de `master` em `fab595c7`.
A [PR #7](https://github.com/RMZZFAJ/home-care-assistant/pull/7) reúne
o histórico de L1 e L2.
Este registro acompanha o que entrou no produto, a comparação com cada
laboratório e as pendências por lote. As evidências das entregas e a fila
transversal ficam no [acompanhamento D-B](../../../../TEMP_D_B_ATUALIZACAO.md)
e nas [matrizes de execução](ACCEPTANCE_EXECUTION.csv) e
[aceite visual](UI_MODEL_ACCEPTANCE.csv).

| Lote | Situação | Referências vigentes |
| --- | --- | --- |
| L1 | Implementado e revisado, com evidência de cenários específicos | [Ordem E01–E03](../../../../HCA_L1_LOTE_CODEX_E01_E03.md), [laboratório v3](../../../../hca-laboratorio-01-v3-final.html) e [comentários v3](../../../../hca-l01-v3-comentarios.json) |
| L2 | Escopo aprovado implementado, com verificação local dirigida e CI final pendente | [Comando mestre](../../../../HCA_L2_COMANDO_MESTRE_CODEX_V7.md) e [laboratório v7 aprovado](../../../../hca-laboratorio-02-v7.html) |
| L3 | Implementação verificada no candidato em rascunho | [Comando mestre v4](../../../../HCA_L3_COMANDO_MESTRE_CODEX_V4.md) e [laboratório v4 aprovado](../../../../hca-laboratorio-03-v4-aprovado.html) |
| L4 | Em execução | [Comando mestre v2](../../../../HCA_L4_COMANDO_MESTRE_CODEX_V2.md) e [laboratório v2 aprovado](../../../../hca-laboratorio-04-v2-aprovado.html) |

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

**Criado ou completado para o produto real.** Ciência familiar com fatos
pessoais, históricos e dispensados. Em L2, a ciência da REQ foi movida de
Materiais para Visão geral. Identificação técnica do
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

O candidato segue para avaliação da implementação pela PR 7. Os registros
abaixo ligam as superfícies móveis de E04–E06 aos atos oficiais, às negativas
de permissão, aos efeitos separados de estoque e suficiência, aos PDFs e
às comunicações. Também registram as mudanças autorizadas sobre L1 e as
[reservas de produto](#decisões-e-dúvidas-de-l2). A CI, o Sonar e a prévia
do SHA final ainda precisam de resultado próprio. O roteiro permanece
disponível para a conferência visual do responsável no celular.

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

**Referências dos estados compartilhados.** Os cenários abaixo têm cobertura
dirigida nas mesmas telas e operações da aplicação.

- **E04-15.** A preparação de uma nova REQ mostra o atendimento anterior e o
  atual da ficha de origem. Adotar a versão atual conserva a seleção, o zero
  informado e o motivo próprio. [Teste de continuidade da REQ](../../../../tests/e2e/remaining-need.spec.ts).
- **E05-08.** Na mesma compra, a família marca quais itens estão em mãos e
  conserva a previsão para os demais. Recuperar a resposta confirma a parcela
  pendente sem repetir o ato. [Teste da compra mista](../../../../tests/e2e/com-action-private-drafts.spec.ts).
- **E05-10.** O registro pelo administrador mostra o efeito previsto no saldo
  familiar. Confirmar a entrada aplica o recebimento autorizado no mesmo ato,
  incluindo a confirmação da quantidade excedente quando ela existe.
  [Teste da chegada](../../../../tests/e2e/purchase-receipts.spec.ts).
- **E06-04.** A ENT importa itens de duas REQs selecionadas. A avaliação da
  necessidade continua associada ao material. O caminho da COM importa somente
  a parcela aprovada e mantém o vínculo consultável.
  [Teste da ENT vinculada](../../../../tests/e2e/workflows.spec.ts) e
  [teste da origem COM](../../../../tests/e2e/supply-operational-sources.spec.ts).
- **E06-05.** A confirmação incerta preserva a referência da tentativa.
  A recuperação verifica a expedição registrada com a mesma identidade e
  confere que não houve segunda saída de estoque.
  [Recuperação da ENT](../../../../tests/e2e/supply-private-drafts.spec.ts) e
  [da transferência](../../../../tests/e2e/transfer-declaration-private-drafts.spec.ts).
- **E06-07.** O diálogo de confirmação mostra a falta e o excedente nas
  linhas alteradas. A conferência conserva quantidades, suficiência e efeitos
  físicos separados, inclusive após perda da resposta.
  [Teste do recebimento com diferença](../../../../tests/e2e/counted-material-receipt.spec.ts).
- **E06-17.** Perder capacidade de escrita mantém o preenchimento disponível
  para consulta autorizada. Revogar o acesso à residência retira seus dados
  da tela, inclusive se uma leitura anterior chegar atrasada.
  [Consulta privada](../../../../tests/e2e/supply-private-drafts.spec.ts) e
  [teste da revogação](../../../../tests/e2e/document-access.spec.ts).

**Identificação e efeito da emissão na revisão dos assistentes.** A REQ e
a COM usam o título Revise antes de emitir. A ENT e a DEV usam Revise antes
de expedir. Os quatro assistentes apresentam a introdução e a mesma grade
de paciente, autoria, tipo e destino prevista na v7. ENT e DEV mantêm o
recebedor real, e ENT mantém o percurso e a referência da escala. A revisão
da REQ explica quando o estoque informado altera o saldo da equipe e
quando esse saldo será preservado. As opções de edição continuam junto aos
materiais, aos extras e às observações.

Oito casos dirigidos passaram de primeira em Android e iOS emulados.
REQ, COM e ENT passaram nas comparações de seleção e revisão, com nomes
longos e auditoria de acessibilidade. O caso DEV retomou um extra pendente,
conferiu a revisão e expediu após identificar o material. As capturas e o
relatório estão em `output/playwright/l2-review-v7-233c9dfa/`. Este ajuste
usa os contratos e as migrations existentes.

**Verificação da CI de `558d49b7`.** Windows, Ubuntu, banco com 832 casos,
SonarCloud e a prévia de desenvolvimento passaram. Os seis grupos de
navegador terminaram com 1.668 aprovações de primeira, sete falhas
persistentes distribuídas em três casos e duas aprovações na segunda
tentativa. [Execução 44926343700][l2-ci-44926343700].

- Na ENT, o teste agora consulta o rótulo Recebedor físico na revisão e
  preserva a verificação de que o profissional da escala não pode receber
  em nome da pessoa escolhida.
- Na REQ, os controles da revisão ficam lado a lado no desktop e têm
  espaço de rolagem acima do rodapé. A auditoria de acessibilidade
  preserva a verificação em quatro larguras.
- O teste do histórico pessoal aceita o aviso de acesso negado quando a
  revogação remove o painel, verifica que os registros saíram da tela e
  mantém a prova de recusa pela API.
- Os dois testes que passaram na segunda tentativa agora respeitam o
  estado de abertura dos preenchimentos privados e esperam o resultado
  da expedição antes de sair da ENT.

Os cinco casos dirigidos passaram de primeira em Chromium, Android e iOS
emulados. Os relatórios locais estão em
`output/playwright/l2-ci-44926343700-*` e
`output/playwright/l2-ci-44926343700/ios2-fixes/`. A CI e o SonarCloud
precisam validar o novo conjunto no SHA publicado. Nenhuma migration
foi acrescentada.

[l2-ci-44926343700]: https://github.com/RMZZFAJ/home-care-assistant/actions/runs/44926343700

**Verificação de `140b4297` em 21/11.** Os seis grupos passaram. Os
logs registraram 1.675 aprovações de primeira e duas na segunda tentativa,
sem falhas persistentes. A revisão da REQ a 1440 px passou de primeira nos
três grupos que executaram o caso. A seleção de recebedor, o histórico da
agenda, a retomada privada e a ENT parcial também passaram de primeira
nos grupos correspondentes. [CI 44936427732][l2-ci-44936427732].

Nos 17 arquivos de regressão diretamente ligados ao lote, os logs registram
76 aprovações por navegador, 228 no total em Chromium, Android e iOS emulados.
Os casos exercitam emissão, recebimento, suficiência, arquivamento, PDFs,
revogação e retomada. A conferência visual usa as comparações dirigidas do lote.

- No Chromium-1, o item do catálogo foi gravado, mas o editor para consultar
  o comprovante não apareceu na primeira tentativa após recarregar. Cinco
  execuções locais com o teste original e oito com rastreamento passaram de
  primeira. Nas oito, a atualização inicial antecedeu o clique no botão
  habilitado e o editor abriu em seguida. A causa da ocorrência na CI segue
  em aberto. Relatório em `output/playwright/l2-catalogue-reload-diagnostics/`.
- No Android-1, o registro da compra mista preservou a chegada pendente e
  a previsão da loja. Depois da recarga, o toque adicional selecionou
  Arquivos gerados. O teste local passou a confirmar que a aba Materiais
  permanece selecionada ao recarregar. Quatro execuções locais completaram
  o percurso, duas no Android e duas no iOS. A primeira rodada também
  teve um timeout na preparação do banco, antes da navegação.
- As capturas anteriores da revisão de ENT eram gravadas após a última
  largura auditada, 1440 px, inclusive com nomes de projeto móvel. O teste
  agora mede 390 px e anexa a identificação e os materiais ao relatório.
  Android e iOS emulados passaram de primeira. As novas imagens e a
  referência do laboratório estão em
  `output/playwright/l2-ent-review-mobile-140b4297/`.

Os dois ajustes de teste estão locais. As provas de estoque, autorias e
acessibilidade foram preservadas. Não foi necessária migration.

**Falha de arquivamento da v7.** O commit local `8b6af7a4` aplica a composição
de E04-12 no fluxo real. O modal apresenta o resultado incerto e oferece duas
recuperações com a chave e os dados da solicitação original. Os detalhes
para suporte abrem sob demanda e podem ser
copiados. Se a referência for recusada na primeira solicitação, a revisão
é atualizada antes de nova confirmação. A validação dos campos permanece
junto à revisão.

Dez casos de arquivamento, confirmação e reversão passaram de primeira no
Android e no iOS emulados. A confirmação recuperada após perda da resposta
preservou o PDF assinado. Uma resposta 503 controlada comprovou o
limite de duas recuperações, com saldo e condição da ficha preservados.
Build, tipos e lint dirigido passaram. As capturas a 390 px e o relatório
estão em `output/playwright/l2-archive-failure-mobile/`. O commit usa os
contratos e migrations do candidato e aguarda a própria CI após publicação.

**Retomada do arquivamento após recarga.** O commit local `1a1395a9`
conserva a identificação técnica na sessão. Ao voltar à ficha, a ação
Conferir tentativa de arquivamento recupera o ato aplicado ou retoma a
preparação do PDF. Quando o banco comprova que o ato ficou sem aplicação,
encerra a chave e o envio tardio recebe `409`. A primeira rodada de
navegador identificou o mapeamento incorreto dessa recusa como `503`.
A segunda rodada confirmou a classificação e a preservação do estoque.

Passaram 12 casos em Android e iOS emulados, dois de integração com Auth
real, 23 de contrato/API e o build. Os casos incluem perda de resposta,
recarga antes do PDF, arquivamento automático, confirmação e reversão.
O relatório está em `output/playwright/l2-archive-reconcile-verified/`.
A migration `20261121202419` está aplicada na stack local e no
[desenvolvimento autorizado](#migrations-por-ambiente).

**Falhas de conclusão e reabertura.** O commit local `c63cb408` usa o
mesmo modal de resultado do arquivamento, com diagnóstico copiável e
até duas recuperações. Uma incerteza consulta a chave original. Quando
o servidor comprova a ausência do ato, a tentativa explícita usa nova
chave e a observação ainda aberta. As decisões usam a reconciliação e o
esquema existentes.

Na primeira rodada, 12 casos passaram e dois detectaram que voltar do
aviso de descarte recolhia a pendência expandida. A revisão passou a ficar
montada durante o aviso. Na repetição dirigida, os seis casos de Android
e iOS emulados passaram de primeira. A prova inclui perda de resposta na
reabertura, preservação do PDF anterior, descarte da observação e rejeição
dos envios tardios na conclusão. Build, tipos e lint dirigido passaram.
Relatório e capturas a 390 px em `output/playwright/l2-follow-up-failure-verified/`.

**Revisão e falhas de cancelamento.** Em REQ e COM, a justificativa fica na
própria revisão, conforme E04-14 e E05-13. Na REQ, o ajuste de estoque exige
escolha explícita quando aplicável. ENT e DEV usam o mesmo diálogo de falha
ao cancelar antes do recebimento e nas decisões posteriores ao recebimento.
O texto continua disponível enquanto o formulário está aberto. A saída
descarta os campos e mantém a chave técnica quando existe incerteza sobre
o ato. O fluxo confere a chave original antes de oferecer um novo envio.
Os testes cobrem recusa de envio tardio, perda de resposta, limite de
recuperações e efeito único no estoque. Build, tipos e lint dirigido passaram.
Passaram 21 das 22 execuções iniciais em Android e iOS emulados. A compra
mista falhou no login da massa de teste com timeout do Auth, antes de abrir
a tela. O caso passou na execução isolada, em novo build e sem retry do
runner. Relatórios em `output/playwright/l2-cancellation-final/` e
`output/playwright/l2-cancellation-com-recheck/`.

[l2-ci-44936427732]: https://github.com/RMZZFAJ/home-care-assistant/actions/runs/44936427732

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

**E06-18, consulta da avaliação registrada na conciliação.** Em Materiais,
o material cuja avaliação vigente foi gravada no ato de conciliar tem a
ação Consultar avaliação registrada. O diálogo do v7 usa o recebimento e
a autoria preservados, com acesso ao material e às fichas vinculadas.
A associação vem da versão do evento oficial de conciliação. Uma nova
avaliação segue disponível conforme a permissão e o estado da ficha.
Os testes em Android e iOS emulados recarregaram a ENT antes da consulta,
conferiram o retorno de foco e verificaram a mesma versão e avaliações
antes e depois. A avaliação independente também passou nos dois navegadores.
Capturas em `output/playwright/l2-req-need-parity/`. Sem nova migration.

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
A REQ também recuperou o mesmo exemplar assinado após a perda da resposta.
O teste dirigido em Android e iOS emulados passou nas duas execuções, na
primeira tentativa, e confirmou um único PDF persistido e a ficha na versão 1.

### Revisão dos wizards após o retorno do responsável

**E04-03, outra REQ durante o preenchimento.** Se a emissão encontrar uma
necessidade já solicitada, a Revisão permanece aberta e consulta as pendências
atuais. O diálogo abre por material, oferece consulta à ficha pelo código e
pede justificativa para manter o item. O nome da pessoa que emitiu consta na
ficha consultada. Retirar elimina apenas o item escolhido e seus vínculos.
As outras linhas e observações continuam na Revisão. O usuário confirma
novamente a emissão depois de decidir. A regressão dirigida usou dois autores
com Auth real, confirmou a rejeição, preservou a primeira REQ e verificou a
segunda emissão com a justificativa e somente as duas linhas mantidas.
Passou em Chromium, Android e iOS emulados, na primeira tentativa.

**E05-03, consulta das REQs por material.** O cartão da COM reúne as REQs
vinculadas à linha no menu do material. Cada referência abre a ficha e
mostra a contagem registrada e sua data. Com mais de uma contagem, o
horário da observação determina os destaques Mais recente e Contagem
anterior. O saldo familiar atual fica abaixo, sujeito à permissão de
leitura do estoque familiar, e a quantidade a adquirir continua editável.
O painel de material também preserva e ordena as contagens separadas.
Três integrações com Auth real cobriram zero, isolamento entre pacientes,
permissões independentes e o formato mantido para a consulta anterior.
O cartão segue a faixa compacta do v7 com link, data e valor. A variante
com duas contagens acrescenta autoria e os destaques na mesma faixa.
A busca de materiais continua disponível no controle compartilhado com REQ.
Quatro execuções passaram em Android de 360 px e iOS de 412 px emulados,
sem repetição. A conferência incluiu retorno do foco, atualização do saldo
e preservação da quantidade editada. Capturas e relatório em
`output/playwright/l2-com-linked-counts/`. Para `37ac93a9`, Windows,
Ubuntu, Sonar e o job de banco passaram. O log do banco registra 831
integrações aprovadas. O preview foi publicado e os testes de navegador
entraram em execução. [CI de `37ac93a9`](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/44897709633).

**E06-02, recebedor da ENT.** O seletor segue a lista do v7, com o plantão
atual primeiro e o próximo em etiqueta de outra cor. A escala publicada
é consultada para as pessoas habilitadas do paciente. O plantão futuro
fica como informação e a sugestão continua reservada ao plantão atual
inequívoco. Escolher outra pessoa continua exigindo justificativa e o
recebimento permanece uma ação da pessoa designada. O controle compartilhado
continua disponível na DEV com as pessoas habilitadas da família.
Quatro execuções em Android de 360 px e iOS de 412 px emulados passaram
sem repetição. Elas cobriram a escolha manual, o bloqueio do aceite por
outra pessoa e a atualização da escala durante o preenchimento. O caso
novo de integração com Auth real distinguiu plantões mais distantes,
cancelados, de outro paciente e de pessoas que perderam a permissão.
As 11 regressões do mesmo arquivo também passaram. Capturas e relatório
em `output/playwright/l2-recipient-shift/`.

**E05-05, retomada do rascunho da COM.** O diálogo compartilhado usa o
título e as ações do v7. Fechar sai do assistente e guarda o rascunho como
estava. Continuar reabre a etapa salva, e Descartar e começar
remove somente aquele preenchimento privado. A lista usa os nomes e
quantidades do rascunho. Os códigos curtos de demonstração não têm campo
equivalente no catálogo atual. A persistência usa o mesmo contrato e
este ajuste dispensa migration.
Capturas da COM em Android de 360 px e iOS de 412 px emulados em
`output/playwright/l2-purchase-draft/`. As duas execuções da COM
confirmaram a quantidade preservada ao fechar e reabrir, a volta à etapa
salva e o descarte sem novos atos oficiais. Os cinco assistentes foram
validados nos dois navegadores emulados. O BAL no iOS excedeu o tempo
da asserção enquanto consultava o plantão na primeira rodada e passou
isoladamente. A DEV também passou após incluir a saída pelo diálogo e
a reabertura com as duas observações preservadas.

**E04-02, itens, estoque atual e urgência.** A linha selecionada organiza a
urgência acima da REQ aberta e da justificativa de reiteração. O campo
de estoque vem em seguida, com a opção Não sei informar. O saldo da família,
que a aplicação já consultava, continua em leitura abaixo do estoque da
equipe. A revisão conserva o fundo de urgência e exibe a justificativa.
A comparação móvel usou o laboratório a 390 px. Android e iOS emulados
voltaram da revisão para o item, recuperaram a justificativa e emitiram com
urgência e estoque desconhecido preservados. Os dois casos passaram na
repetição dirigida da altura final do campo. Capturas em
`output/playwright/l2-req-need-parity/`. Sem nova migration.

**E06-11, decisão de cancelamento da ENT recebida.** O diálogo usa a
composição do v7 para mostrar quem recebeu, a quantidade devolvida e
o consumo confirmado por material com acesso ao relato. O resultado da
recusa mostra a autoria, o instante e a justificativa da decisão. Quando
há várias referências de consumo, o produto mantém a lista consultável
com cada origem. Os atalhos para referências e histórico usam os atos
reais da ficha. O ajuste dispensa migration.
Quatro execuções em Android de 360 px e iOS de 412 px emulados passaram
na primeira tentativa com build de produção. Cobriram consentimento,
retorno físico, consumo preservado, recuperação sem duplicar a decisão,
recusa e retirada do pedido. Duas integrações com Auth real confirmaram
a preservação dos atos na reabertura da ENT, DEV e COM.
Capturas do v7 e do produto em `output/playwright/l2-delivery-cancel/`.
A validação da CI deste incremento segue pendente.

**Continuidade do BAL existente.** Ao adotar a nova referência, o
salvamento automático guarda as contagens anteriores com data e notas.
A nova conferência começa com as quantidades vazias. O fluxo cobriu
10 regressões em Chromium na primeira tentativa, incluindo retomada em
outro aparelho, resposta perdida, cópias locais protegidas e reconto.
Após unificar a gravação da cópia local dos assistentes, três desses
casos passaram novamente. Também passaram a retomada da COM na etapa
Materiais após uma atualização da PWA e a recuperação automática do
mesmo PDF de ENT após perder a resposta da assinatura.

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

Na reconciliação de 21/11/2026, a stack local `home-care-assistant` e o
Supabase de desenvolvimento `qwfrqychokvhdzakibid` têm **320 versões**,
com 242 anteriores a L1, 18 de L1 e 60 de L2. O plano de aplicação está
vazio e as 84 migrations históricas continuam protegidas.
Os SQL de cada versão ficam em [supabase/migrations](../../../../supabase/migrations/).
Produção fica fora desta consulta.

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
`20261120231639`, `20261121014430`, `20261121063729`, `20261121075902`,
`20261121103655`, `20261121111215`, `20261121140535`, `20261121202419`.

`20261121140535` usa a autorização de leitura da REQ na consulta de vínculos
quando o paciente está inativo. A integração local com Auth confirmou a
leitura e a recusa após remover `req.read`. No desenvolvimento, o ensaio
com rollback confirmou execução restrita a `authenticated`. O backup
cifrado `6bc87c6f-7fe2-4f5d-95bd-8e1671f114e5` foi verificado antes da
aplicação. O histórico após a aplicação coincide com os arquivos locais.

`20261121111215` acrescenta a leitura dos próximos plantões da equipe na
ENT sem alterar o formato da consulta anterior ou o identificador da
referência da expedição. O backup cifrado
`ba1a61b9-ffab-4745-ae6d-0d9421ca268e` foi verificado. O ensaio confirmou
os grants e executou rollback. Após a aplicação, o desenvolvimento confirmou
318 versões e execução da nova consulta restrita a `authenticated`.

`20261121103655` acrescenta a consulta das contagens para REQs vinculadas
à COM. O formato da consulta anterior continua disponível durante a
atualização do aplicativo. O backup cifrado
`53acaf5c-0d73-41ab-8b92-be2b5a6c401b` foi verificado. O ensaio vinculado
validou os grants e executou rollback. Após a aplicação, a consulta
confirmou 317 versões, fila vazia e execução da nova RPC restrita a
`authenticated`.

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

### L2 — Reconciliação do arquivamento no desenvolvimento

`20261121202419` acrescenta a reconciliação autenticada da tentativa de
arquivo, confirmação e reversão. O banco recupera o ato aplicado ou a
preparação apta. Quando comprova a ausência do ato, encerra a chave sob
bloqueio e recusa seu envio tardio. A preparação vigente e os PDFs
consolidados anteriores conservam seus identificadores.

A aplicação foi precedida pelo ensaio vinculado com rollback e pela
verificação do backup integral cifrado `3dbe809f-6554-41f7-8577-e1d58738e5fa`.
O pós-check confirmou as 320 versões, execução da operação por
`authenticated`, RLS na tabela privada e ausência de leitura e gravação
diretas pelos papéis de aplicação. O plano de aplicação posterior ficou
vazio. Consulte o [registro da aplicação](MIGRATIONS.md#retomada-do-arquivamento--320-versões).

### L3 e L4

| Migration de L3 | Local | Remoto |
| --- | --- | --- |
| `20261122180206_l3_document_attachment_attempts` | Aplicada | Aplicada |
| `20261122181454_l3_family_stock_operations` | Aplicada | Aplicada |
| `20261122183711_l3_stock_operation_history` | Aplicada | Aplicada |
| `20261122184410_l3_stock_document_act_links` | Aplicada | Aplicada |
| `20261122184629_l3_stock_custody_overview` | Aplicada | Aplicada |
| `20261122185603_l3_team_consumption` | Aplicada | Aplicada |
| `20261122191150_l3_team_consumption_review` | Aplicada | Aplicada |
| `20261122191908_l3_consumption_shortage_notices` | Aplicada | Aplicada |
| `20261122193611_l3_consumption_progress_subjects` | Aplicada | Aplicada |
| `20261122195318_l3_versioned_consumption_reads` | Aplicada | Aplicada |
| `20261122201849_l3_balance_count_admissions` | Aplicada | Aplicada |
| `20261122212641_l3_stock_review_repairs` | Aplicada | Aplicada |
| `20261122215240_l3_pdf_archive_revision_filters` | Aplicada | Aplicada |
| `20261122215605_l3_bind_balance_draft_admission` | Aplicada | Aplicada |
| `20261122222145_l3_material_link_filters` | Aplicada | Aplicada |
| `20261122223500_l3_material_history_decisions` | Aplicada | Aplicada |
| `20261122225705_l3_preserve_first_balance_admission` | Aplicada | Aplicada |
| `20261122232848_l3_residence_schedule_hours` | Aplicada | Aplicada |
| `20261123000513_l3_schedule_balance_impact` | Aplicada | Aplicada |
| `20261123001403_l3_reconcile_residence_shift_windows` | Aplicada | Aplicada |
| `20261123003438_l3_balance_count_materials` | Aplicada | Aplicada |
| `20261123011538_l3_balance_extra_reviews` | Aplicada | Aplicada |
| `20261123014442_l3_unscheduled_balance_count` | Aplicada | Aplicada |
| `20261123021122_l3_balance_count_permission` | Aplicada | Aplicada |
| `20261123022923_l3_balance_programming_observation` | Aplicada | Aplicada |
| `20261123025445_l3_balance_extra_recount_links` | Aplicada | Aplicada |
| `20261123035313_l3_shift_type_cycles` | Aplicada | Aplicada |
| `20261123043302_l3_consumption_material_effects` | Aplicada | Aplicada |
| `20261123045130_l3_flow_direct_consumption` | Aplicada | Aplicada |
| `20261123051802_l3_require_residence_for_new_schedule` | Aplicada | Aplicada |
| `20261123054301_l3_resolve_schedule_creation_attempt` | Aplicada | Aplicada |
| `20261123060806_l3_fix_bilateral_delivery_reminders` | Aplicada | Aplicada |
| `20261123070728_l3_material_stock_context` | Aplicada | Aplicada |
| `20261123102624_l3_stock_operation_detail` | Aplicada | Aplicada |
| `20261123110027_l3_consumption_list_materials` | Aplicada | Aplicada |
| `20261123120522_l3_reviewed_consumption_correction` | Aplicada | Aplicada |
| `20261123123142_l3_shortage_material_without_quantity` | Aplicada | Aplicada |
| `20261123130151_l3_schedule_balance_review_contract` | Aplicada | Aplicada |
| `20261123131427_l3_document_attachment_display_facts` | Aplicada | Aplicada |
| `20261123142332_l3_family_stock_receipt_scope` | Aplicada | Aplicada |
| `20261123150554_l3_stock_transit_transfer_facts` | Aplicada | Aplicada |
| `20261123165105_l3_balance_history_count_author` | Aplicada | Aplicada |

O replay de instalação limpa e evolução da CI passou para `acf440ef`
com 330 versões. A aplicação das duas migrations subsequentes foi precedida
pelo backup cifrado verificado `cbc6795c-3189-4834-a475-7c1f0b09d031`.
A migration de filtros do acervo foi aplicada após o backup verificado
`a59372d1-ce5a-4021-a05e-cfa9444fa2a6`. Naquele ponto, local e remoto
tinham 333 versões.
A fila vinculada ficou vazia. O RPC de filtro exige usuário autenticado
e a função privada de consulta fica indisponível ao papel de aplicação.

L4 aguarda definição.

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

### Verificação do candidato de L2 em 21/11

O commit `9297ed38` mantém o código de produto de `18819b44`. As duas
mudanças são no teste local de backup e na automação da expedição da ENT.
O teste de backup usa um limite de 20 segundos para o caso que sela,
verifica e extrai arquivos reais. A validação Windows anterior interrompeu
esse caso ao atingir cinco segundos, com os outros 1.122 testes aprovados.
No Windows local passaram sete testes dos dois arquivos de backup e os
cinco casos do arquivo alterado na repetição dirigida.
[Job Windows anterior](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/44904833625/job/136848146714).

No build local de `18819b44`, Android e iOS emulados passaram pela DEV
autônoma, pela resolução das pendências da COM e pela navegação de Mais
até os Andamentos privados de L1. A jornada REQ → COM → ENT parcial → BAL
passou no Android. A primeira tentativa no iOS ficou na revisão da ENT.
A conferência local encontrou a REQ e a COM já registradas e nenhuma ENT.
Na repetição dirigida, o teste aguardou o rascunho salvo e usou toque nativo.
Passaram a jornada até o BAL e o caso com avaliação parcial na ENT.
Relatórios em `output/playwright/l2-candidate-18819b44/`.

As oito integrações dirigidas de `9297ed38` usaram Auth real no banco
local. Uma contagem posterior de REQ ou BAL preservou o saldo e impediu a
reversão antiga, inclusive quando a contagem posterior não gerou movimento.
Na ENT e na DEV, o excedente declarado ficou em apuração. O crédito se
limitou ao recebimento reconhecido dentro do expedido. O extra sem
identificação foi retomado no rascunho e bloqueou a expedição. A COM mista permitiu
comprar e receber a linha identificada, preservando a pendência do extra.
Esses resultados verificam os limites vigentes enquanto as decisões de
P1, P2 e dos extras em ENT/DEV seguem abertas.
Log em `output/playwright/l2-candidate-9297ed38/reserved-stock-integration.log`.

As 318 versões até `20261121111215` coincidem no repositório, na stack
local e no desenvolvimento. O contrato retornado pelo banco de
desenvolvimento coincide com `protocol: 1` e `schema: 2` da aplicação.
O SHA-256 do laboratório confere com o comando mestre. A instalação limpa,
a evolução legada e as validações de Windows e Ubuntu passaram na CI
desse SHA. O Windows aprovou os 1.123 testes unitários, incluindo os cinco
de backup. No Ubuntu, 1.122 passaram e um caso específico de Windows foi
ignorado em `trusted-executable.test.ts`. SonarCloud passou.
A Vercel confirmou o preview no mesmo commit. A consulta com
autenticação da Vercel obteve o HTML da aplicação em `/login` e
`/recuperar-senha`. As jornadas com Auth do aplicativo foram exercitadas
localmente. As 832 integrações da CI passaram, sem casos ignorados.
Chromium, Android emulado e iOS emulado passaram pela preparação e pelo
teste de partida do navegador nos seis grupos. Todos chegaram ao comando
E2E. A execução terminou com falha. Android 1 registrou 278 aprovações e
duas falhas persistentes. Chromium 2, Android 2 e iOS 2 registraram 265
aprovações e 14 falhas persistentes cada. iOS 1 registrou 277 aprovações e
três falhas persistentes. Chromium 1 atingiu o limite do job após registrar
duas falhas persistentes e uma aprovação na repetição. Esse caso de COM
falhou na seleção da aba Materiais na primeira tentativa.
[Job Android 1](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/44906482026/job/136858828652).
[CI de `9297ed38`](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/44906482026).

A DEV ainda era testada com uma tarefa de concordância da contraparte, e
o teste de cabeçalho esperava o espaçamento de L1 antes do menu de três
pontos autorizado em L2. Após as correções, esses dois casos passaram
localmente nos três projetos de navegador, sem repetição. A rodada inicial
dos 14 casos do Chromium 2 aprovou dez. A rodada final aprovou 16 casos
dirigidos sem retry em Chromium, Android e iOS emulados. Ela incluiu os
quatro retestes, a COM que passou na repetição da CI, a recuperação na
agenda e as auditorias móveis de REQ e ENT. O primeiro arranque dessa
rodada parou antes dos casos na consulta local ao Supabase. A repetição
usou a mesma instância, sem reset. Build, tipos, lint dirigido e guard de
84 migrations históricas passaram.

A COM passou a identificar falta encerrada sem contabilizá-la como entrada
ou pendência e a usar o rótulo Doado quando é esse o fato. A consulta
explícita do último preenchimento em ENT/DEV mostra o resultado já
registrado ao autor que perdeu a capacidade de expedir, sem repetir o ato.
O início de novo preenchimento continua direto. O histórico de REQ viabiliza
ler vínculos autorizados de pacientes inativos. As capturas e logs dirigidos
estão em `output/playwright/l2-ci-44906482026-*`.

Em `d10a4ed7`, Windows, Ubuntu, SonarCloud, instalação limpa e evolução
legada passaram. A Vercel confirmou a prévia do mesmo SHA e entregou o HTML
da aplicação em `/login` e `/recuperar-senha`. As 832 integrações de banco
passaram, sem casos ignorados. Os seis grupos de Chromium, Android emulado
e iOS emulado passaram no teste de partida e iniciaram a suíte E2E.
O Chromium-1 concluiu com 279 casos aprovados e um caso de COM recuperado
na segunda tentativa. O clique focou Materiais, mas manteve Visão geral
selecionada e a URL intacta. A causa permanece em investigação. O Android
emulado concluiu com 280 e 279 casos, sem repetições nos dois grupos.
O iOS-2 encerrou com 279 aprovações sem repetição. O iOS-1 aprovou 279
casos de primeira e recuperou a ciência do cancelamento de COM na segunda
tentativa. A primeira leitura de geometria foi feita durante a atualização.
O teste agora aguarda foco, área de 24 × 24 px e centro clicável na mesma
amostra. O controle continua exigindo o foco real do navegador. REQ e COM
passaram de primeira no iOS emulado na rodada local dirigida, com as cinco
larguras e o PDF assinado. Evidência em
`output/playwright/l2-ci-44915193954-cancellation/`.
O Chromium-2 foi interrompido aos 40 minutos, depois do caso 267. As duas
tentativas de auditar a revisão de nova REQ a 768 px mediram o botão de
ajuda encoberto pelo cabeçalho fixo, após a troca de largura com a página
rolada. A auditoria agora inicia no topo em cada largura, com as regras de
acessibilidade e teclado preservadas. Os grupos Chromium têm 55 minutos.
Os nove casos locais dirigidos passaram sem repetição no Chromium, Android
e iOS emulados. A rodada cobriu a revisão a 320, 390, 768 e 1440 px,
emissão vinculada com recuperação e preservação do PDF, os três atos de
COM e a navegação por abas. Relatório e evidências locais em
`output/playwright/l2-ci-44915193954-directed/`.
[CI de `d10a4ed7`](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/44915193954).
[Preview da branch](https://home-care-assistant-git-feat-phase-d-i-3d8824-rmzzfajs-projects.vercel.app).

Na execução cancelada de `37ac93a9`, o Chromium e o WebKit encontraram
duas ocorrências do texto de estoque desconhecido para uma única linha da
REQ histórica. A nova asserção consulta a lista Materiais requisitados da
aba ativa e mantém a comparação do histórico e dos dados no banco. A
auditoria do PDF recomeça no topo a cada redimensionamento, com verificação
de teclado e de área clicável do menu da ficha em 768 px. A primeira
tentativa de edição no catálogo falhou no iOS e a repetição passou. O
teste agora aguarda o fechamento da criação e a consulta da lista antes
de tocar em Editar. [Execução cancelada](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/44897709633).

Os seis casos dirigidos passaram em Chromium e iOS emulado, sem retry,
com build de produção. Quatro larguras e três origens documentais por
navegador passaram na verificação de teclado, axe e largura da página.
As asserções de assinatura, conteúdo congelado e exemplar preservado
também passaram. Os testes locais estão em
`output/playwright/l2-ci-pdf-catalogue/`. Este ajuste não exige migration.

A execução de `ebb69a60` passou em Windows e Ubuntu, instalação limpa,
evolução legada e 832 integrações. Os seis grupos iniciaram o comando
E2E. SonarCloud e preview estavam aprovados para esse SHA.
[Execução publicada](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/44901016690).

A [CI de `b74013c4`](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/44886723003)
concluiu com falha. Passaram as validações Windows e Ubuntu, a instalação
limpa, a evolução legada e 830 testes de integração. Chromium 1, Android 1,
Android 2 e iOS 1 terminaram com 16, 16, 23 e 17 falhas persistentes.
Chromium 2 e iOS 2 atingiram os limites de 40 e 70 minutos. Os logs parciais
registram 15 e 21 testes que falharam também na repetição e dois casos que
passaram na repetição, um de encerramento da escala e outro de recuperação
de expedição da DEV com material inativo.

A validação local de correções dirigidas passou em 12 testes sem repetição.
Ela cobriu a largura de 320 px na DEV, a descrição acessível dos materiais em
REQ, COM, ENT e BAL, a categoria inicial quando só há itens de higiene,
a observação ao voltar da diferença no recebimento, a ciência na Visão geral
e a emissão concorrente de REQ. Os demais casos da CI seguem em correção.

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

## L3 — Estoque, plantões e verificação

A v4 governa 35 cenários de E07, E08 e E09. A ordem e o laboratório foram
preservados na raiz, seguindo o mesmo arranjo de L1 e L2.

- **E07 — Estoque e consumo.** Em execução. A movimentação familiar
  multimaterial, o histórico geral por ato e os cartões de saldo por
  custódia têm implementação local. O banco local já registra
  consumo direto, correção, cancelamento e reiteração de avisos. As ações
  e o wizard já chamam a API do novo contrato no checkout local.
  Os Andamentos de consumo e falta usam as abas e a publicação compartilhadas
  das fichas. O painel compartilhado usa o histórico por operação e
  consulta as fichas relacionadas com filtros no servidor. A aba Materiais
  dos registros de consumo e falta abre esse mesmo painel com o contexto
  do registro. A continuidade E07-12 abre o assistente de consumo direto
  a partir das sugestões recebidas pelo WhatsApp. A homologação do provedor
  e a conferência visual final da frente continuam abertas.
  Em E07-04, a expansão lista os materiais, abre a operação inteira e
  conserva a origem de cada movimento.
- **E08 — Plantões e balanços.** Em execução. A admissão da contagem
  iniciada no plantão já preserva a retomada. A área reúne Plantões,
  Balanços e Histórico com as permissões de cada leitura. A ficha tem
  abas próprias para Revisões e Contagens. Nova programação exige
  horários da residência. A agenda guia a configuração e mantém a data
  consultada na volta. Alterações de plantão que
  atingem uma contagem designada exigem encaminhamento explícito e registram
  a decisão na mesma transação. A administração dos tipos e dos horários
  fica em Configurações → Plantões, junto à programação dos balanços.
  Os tipos novos definem a duração e o descanso do ciclo.
  Resta a conferência visual do conjunto. A contagem
  por plantão usa as cinco etapas. Extras têm
  parecer individual e vínculo a recontos comprovados. A programação
  registra observação opcional e o pedido de autorização para contar
  fica no acompanhamento do BAL.
- **E09 — Arquivos e verificação.** Em execução. A consulta pública exibe
  registro, correspondência, assinatura e carimbo separadamente. Os detalhes
  autorizados abrem em painel e revalidam o acesso. O resultado público
  omite identificadores internos. A indisponibilidade da política de confiança
  preserva a consulta do registro e a comparação de bytes já concluídas.
  A retentativa da anexação permanece no modal. Gerados e Anexos foram
  reunidos em Arquivos. Os filtros do acervo e o seletor de conteúdo
  usam a revisão atual da ficha e as permissões documentais.

### Movimentação familiar e histórico geral

- Entrada, retirada e correção usam revisão e uma transação única. A
  correção mantém o vínculo ao lançamento original. A revisão compara
  as referências por material. Só uma tentativa já submetida pode ser
  recuperada, pela chave original.
- O histórico pagina por ato e permite consultar o efeito granular na
  custódia autorizada. A expedição e o recebimento da mesma ENT são atos
  diferentes. Os novos atos usam uma associação explícita por comando.
  Lançamentos antigos sem vínculo conclusivo continuam individuais.
- Cinco integrações com Auth e banco locais passaram. Elas cobrem
  gravação e retentativa multimaterial, reversão integral por saldo
  insuficiente, concorrência, filtros e paginação, restrição por custódia
  e separação de expedição e recebimento da mesma ficha. Confirmaram também
  os instantes próprios de cada custódia, a chegada COM pendente de
  validação e o saldo que só aumenta após a validação.
- Nove casos Chromium passaram no recorte inicial, incluindo criação de
  um ato multimaterial, saldos na consulta granular, recuperação de
  consulta, acesso restrito, paginação e validação defensiva de payload.
- **Ver detalhes da operação** usa o painel compartilhado no histórico
  geral e no de cada material. A consulta usa a chave exata do ato e reúne
  todos os efeitos visíveis ao vínculo atual. Do painel, cada linha abre
  a origem granular e, quando autorizada, a operação oferece acesso à ficha.
- A migration `20261123102624_l3_stock_operation_detail.sql` centraliza a
  projeção no banco e mantém a assinatura pública do histórico. Passaram
  13 testes de integração com Auth real. A consulta recusou outro paciente
  e ocultou lançamentos da família e saldos de trânsito conforme o vínculo.
- Seis regressões de origem passaram em Chromium, Android e iOS emulados.
  Os três casos do painel passaram após corrigir um seletor do teste.
  A comparação em 360 px verificou o painel da operação, o erro recuperável,
  os dois materiais abertos a partir de um só e o retorno de foco em cada
  nível de consulta.
- A reconciliação local e remota confirmou a migration e os grants.
  O backup integral foi descartado após detectar mudanças simultâneas nas
  tabelas de monitoramento. A comparação confirmou a definição remota
  anterior e o backup cifrado do esquema afetado foi verificado com o ID
  `72125aec-2a02-4ee4-899a-2a87f93e1b2b` antes da aplicação da migration.

### Contrato de consumo da equipe

- A migration local diferencia consumo direto, aviso de falta e os
  relatos legados. Cada baixa, correção ou compensação tem seu próprio
  ato e pode ser consultada por chave. O aviso é reiterável e não gera
  movimentação de estoque.
- Três testes de integração com Auth real passaram. Verificaram a baixa
  imediata, a correção pela diferença, a compensação única, o histórico
  granular, a leitura da família, o encaminhamento interno ao familiar
  autorizado, saldo insuficiente e concorrência de duas correções da mesma
  versão. A revisão antiga foi recusada preservando o rascunho, e a revisão
  atualizada encerrou exatamente o rascunho confirmado.
- O wizard de cinco etapas usa o slot privado do consumo da equipe para
  o último preenchimento e guarda a tentativa oficial separadamente.
  Correção, cancelamento e aviso de falta usam operações curtas, com
  consulta por chave em caso de resposta incerta. As métricas de um período
  fechado preservam os lançamentos e ajustes conhecidos até seu término.
- Os Andamentos combinam atos oficiais e comentários manuais. A publicação
  usa as mesmas regras de autoria, audiência familiar, menção individual,
  rascunho, concorrência e recuperação das fichas. A referência aponta para
  o registro pelo identificador integral e abre a aba do andamento quando
  há um comentário específico.
- Passaram 24 testes de integração dirigidos, incluindo os contratos de
  Andamentos anteriores. A nova jornada cobre referências entre falta,
  consumo e REQ, perda de acesso, visibilidade familiar com menção e
  recuperação do envio sem alteração do estoque.
- O build de produção local concluiu. Após corrigir o seletor do campo
  obrigatório de Andamentos, a jornada passou em Chromium, Android e iOS
  emulados em uma rodada diagnóstica sem repetição.

O Preview e produção consultam o mesmo Supabase. O `master` publicado
valida a lista de consumo contra três estados. A leitura de L3 usa RPCs
com os novos estados e referências, e a versão publicada recebe os tipos
que conhece. Passaram 15 integrações dirigidas de consumo e Andamentos,
incluindo a leitura dos dois contratos sob Auth e revogação de acesso.
Em Chromium, passaram os dois casos de paginação/filtros e a jornada
de publicação, correção e cancelamento no candidato com leitura versionada.

A [PR 8](https://github.com/RMZZFAJ/home-care-assistant/pull/8) continua
em rascunho. O Preview de `acf440ef` passou em login, seleção de
paciente, fichas, estoque da equipe, histórico agrupado, lista de consumo
e configuração de Web Push. A política da branch inclui os certificados
públicos do emissor de produção. A consulta pública reconheceu um PDF
já emitido no banco compartilhado.

O Preview registrou o aviso de gaze de Helena e recuperou o mesmo recibo
pela chave original. A ficha exibiu o estado comunicado e o fato automático
em Andamentos. O aviso gerou zero movimentos. A lista em produção respondeu
normalmente e preservou seu recorte de estados.

A primeira captura de resguardo foi colocada em quarentena por mudanças
em três tabelas de telemetria. O cron do ciclo operacional falhava por
ausência dos cursores de REQ, BAL e lembretes legados. Os três registros
técnicos foram repostos com os defaults das migrations originais e o
cron voltou a concluir. Na nova tentativa houve atividade de usuários
durante a captura dividida. Antes das migrations foi conferido um dump
de snapshot único do PostgreSQL, com 42 objetos de Storage, no arquivo
cifrado `392cbbee-f419-4ac9-9a83-6f093954b64d`. A verificação leu o arquivo
integralmente. A restauração em outro banco permanece por ensaiar.

O SonarCloud e o job de banco passaram em `acf440ef`. O recorte do Sonar exclui
somente os dois HTMLs de referência aprovados de L2 e L3. Ambos permanecem
nas comparações de navegador. O CodeRabbit publicou a primeira revisão
automática na PR em rascunho.

### Lista de Consumo e faltas

- E07-07 segue a v4 com Todos, Consumos e Faltas, busca, painel de
  filtros e cartões inteiros clicáveis. Os cartões mostram referência, custódia,
  situação, materiais vigentes, texto registrado, autoria e horário.
  Avisar falta e Registrar consumo ficam depois dos registros, conforme a
  capacidade de escrever no estoque da equipe.
- A busca consulta texto, referência e materiais no banco antes da paginação.
  A referência curta é a mesma de Andamentos.
  A projeção usa os nomes preservados e as quantidades da versão vigente.
  Para uma linha sem nome preservado, usa o catálogo do paciente.
  A consulta mantém as restrições de paciente e custódia.
- O menu oferece a consulta por referência e reúne os dois antigos acessos
  ao preenchimento de relatos em Relatos anteriores. O Preview e o
  aplicativo publicado ainda compartilham o banco. As decisões e os
  relatos do contrato anterior continuam disponíveis, incluindo os atos
  iniciados nesse fluxo. O encerramento da abertura de novos relatos pelo
  contrato anterior precisa ser coordenado com a atualização de produção.
- Passaram seis integrações com Auth real. A busca por um nome ausente da
  observação encontrou a quantidade corrigida e deixou de retornar o
  registro quando o vínculo perdeu a leitura da custódia.
- A migration `20261123110027_l3_consumption_list_materials.sql` foi
  reconciliada nos dois ambientes. Antes da aplicação remota, a definição
  anterior e seus grants foram conferidos e guardados no resguardo cifrado
  verificado `cbada789-f004-41ff-ad4d-4a8cac83c736`. A nova leitura pública
  continua reservada ao papel autenticado e a função auxiliar é privada.
- Na rodada inicial, passaram 22 de 24 casos de Chromium, Android e iOS
  emulados. No iOS, o cenário de 102 relatos esgotou o tempo de teste e
  um clique na categoria do assistente esgotou o tempo de interação.
  A paginação passou a conferir os cursores e a ordem usando as respostas
  da própria navegação. Na rodada dirigida com o build final, passaram
  os quatro casos de iOS, incluindo os anteriores, a referência curta,
  o retorno de foco e a largura de 320 px.

### Início de contagem no plantão

- O profissional designado confirma **Iniciar contagem** dentro da janela.
  O servidor registra a pessoa, o paciente, a versão da atribuição e, em caso de
  reconto, a ficha e sua versão. A mesma autorização permite retomar e concluir
  depois do horário. Perda de acesso ou mudança de versão exigem nova conferência.
- O descarte confirmado encerra a autorização associada ao rascunho. Ao expirar,
  a programação distingue a contagem iniciada de uma atribuição que ficou sem
  contagem. A emissão persiste o horário real e recupera o mesmo resultado
  por chave.
- Passaram três integrações dirigidas com Auth real, incluindo nova contagem,
  reconto depois do horário, descarte e tentativa com versão incorreta.
  O fluxo de retomada após a janela passou em Chromium, Android e iOS
  emulados no build de produção local.

### Área de Plantões e balanços

- `/escalas` abre Plantões e `/balancos` abre Balanços. A aba Histórico
  usa a consulta de fichas filtrada para BAL e as consultas de atribuições
  e alterações autorizadas. Links existentes da agenda continuam resolvendo
  filtros e páginas. O menu principal apresenta uma única entrada.
- O caso dirigido percorreu 202 mudanças da agenda, manteve os filtros por
  URL e conferiu acessibilidade a 320 px. A verificação de vínculo continua
  sendo feita pela API e pelo RLS. A área informa perda de acesso quando
  um vínculo deixa de permitir a agenda consultada. A revogação real e a
  publicação com recusa de sobreposição passaram na rodada dirigida final
  em Chromium.
- O teste unitário de leitura do BAL passou após incluir a versão real da
  atribuição em seu cenário válido. A versão ausente é recusada.

### Primeira revisão automatizada de L3

- Os 11 comentários inline sobre estados ou controles da simulação foram
  registrados como referência para validar a implementação real. A fonte
  aprovada do laboratório permaneceu preservada.
- O produto usa a emissão encontrada pelos bytes mesmo quando o código
  digitado não está no registro. O painel fechado durante a confirmação
  de acesso não reabre após a resposta. A consulta por arquivo com código
  desconhecido passou no Chromium.
- Corrigidos o vínculo do lembrete ao emitir aviso, a origem dos movimentos do
  consumo direto, os rótulos exclusivos dos relatos legados e a busca de
  trânsito por identidade de catálogo. A visualização do saldo familiar
  continua exibindo as quantidades agregadas de compra sob autorização de
  estoque. A abertura da COM continua regida pela autorização da ficha.
- Os testes dirigidos cobriram as métricas antes e depois de correções, o
  lembrete escolhido, a preservação de um rascunho posterior após repetição
  da emissão e o reenvio de quantidade numericamente equivalente sem nova
  movimentação. A forma originalmente aceita de comandos anteriores continua
  válida para recuperar recibos cujo hash tenha sido calculado antes da
  normalização.

### Verificação pública

- A comparação da tela inicial com E09-06 usou capturas do laboratório e do
  produto em 360 e 412 px. A marca, o cabeçalho, a ajuda, a hierarquia do
  formulário e as opções Código/PDF seguem a v4. O navegador do produto
  permite rolar a página inteira.
- O laboratório não define a representação da perda de acesso durante um
  painel aberto. O produto retira os detalhes enquanto revalida e mantém
  o resultado público disponível ao voltar.
- A verificação local dirigida passou com três jornadas Chromium no
  candidato final deste recorte, incluindo QR, consulta por código, PDF de
  outra emissão, login e revogação real. A rodada anterior passou os três
  casos em Android e os três em iOS emulados, com uma falha intermitente em
  Chromium corrigida antes da última rodada. Passaram 12 testes do
  verificador e do contrato de dados.
- O resultado por código de E09-06 usa linhas explicativas em uma coluna.
  O resultado de E09-07 distingue divergência, falta de exemplar para
  comparação e correspondência com outra emissão. O painel apresenta a
  integridade da assinatura, o carimbo, a cobertura dos bytes e a confiança
  como evidências próprias. A próxima ação acompanha o resultado.
- Quando a política fica indisponível ou a análise atinge o limite, a interface
  permite conferir novamente o mesmo arquivo enquanto a consulta está aberta.
  A primeira comparação de bytes fica visível no resultado recebido.
  A entrada para os detalhes autorizados conserva o código e o destino
  interno validado. O serviço e a autorização usam os contratos vigentes.
- A comparação visual de E09-06 usou a v4 e o produto em 360 px.
  Passaram 23 testes do verificador e da apresentação e nove casos de
  navegador em Chromium, Android e iOS emulados. A rodada final confirmou
  no servidor o SHA-256 do PDF reenviado e usou revogação real de vínculo.
  A primeira rodada não capturou o corpo do PDF pelo Playwright e atingiu
  o limite compartilhado de uploads. O teste agora aguarda o limite
  disponível e compara o hash devolvido pela API.

### Anexos da ficha

- Ao fechar o modal, a próxima abertura começa com uma seleção vazia. O
  acervo mostra os arquivos confirmados. O modal oferece liberação de vagas
  antigas quando o servidor confirma que os respectivos envios não começaram.
  Uma seleção anterior exige escolher o arquivo novamente. A liberação
  após recarga foi verificada com a API real no Chromium.
- A resposta perdida pode ser recuperada no mesmo modal. Ao recarregar
  a ficha, uma consulta técnica confirma o arquivo já armazenado, quando
  o hash e a autorização conferem.
- Duas sessões da mesma pessoa submetendo o mesmo original à mesma
  ficha usam uma única reserva. Uma nova seleção pode usar outro nome
  e outra chave, preservando os bytes e a identidade do anexo anterior.
- Passaram 11 testes de integração com Auth e Storage reais, três testes
  unitários de anexação e nove casos Chromium em duas rodadas dirigidas.
  A primeira rodada teve um erro de leitura do corpo multipart no teste
  de nova seleção. A repetição verificou a chave oficial da reserva.

A consulta pública de E09 usa o esquema existente. A anexação usa a primeira
migration de L3, registrada na seção de migrations por ambiente. Ela guarda
o vínculo entre tentativas da mesma pessoa e os bytes já submetidos à mesma
ficha. A seleção incompleta fica no modal, com recuperação técnica separada.

#### Consulta do anexo confirmado

O cartão usa o autor associado ao envio e o instante em que o banco
confirmou o anexo. O painel reutiliza o componente compartilhado e mostra
identidade, estado, conversão e dados técnicos. O seletor mostra o protocolo
da ficha, quando disponível. Dez anexos confirmados ocupam toda a capacidade.

Visualizar e Baixar consultam a ficha autorizada no momento do clique e
liberam um link temporário para o mesmo objeto validado. O download usa a
extensão do arquivo disponível e conserva espaços e acentos do nome.
O conteúdo emitido e o vínculo do anexo permanecem preservados.

Passaram 11 integrações com Auth e Storage reais e nove casos dirigidos
em Chromium, Android e iOS emulados. A rodada final repetiu a recuperação
nos três navegadores, comparou os hashes de visualização e download,
recusou a troca de ficha e a perda real de autorização e conferiu o retorno
de foco. O painel foi inspecionado em 360 e 412 px.

A migration de metadados foi aplicada localmente e no remoto vinculado
após verificar o backup cifrado `899081fc-3ba1-4ecf-a69e-063b32265c1c`.
A definição e as permissões da consulta coincidiram nos dois ambientes.

### Acervo na ficha

- Em REQ, COM, ENT, DEV e BAL, Arquivos reúne Gerados e Anexos. Links
  existentes para anexos abrem a seção correspondente. O acervo usa a
  mesma ficha e preserva as ações de geração, consulta e download.
- A falha de leitura usa o diálogo compartilhado. Fechar o diálogo mantém
  o aviso e o controle de nova consulta. Os oito casos dirigidos de abas,
  permissão, falha e recuperação passaram em Chromium e Android emulado.
- Atuais e Anteriores consultam as versões registradas no banco sem
  alterar os arquivos. A paginação recusa a continuação quando a versão
  da ficha muda. A validação de banco conferiu essa recusa, os resultados
  por revisão e a manutenção da consulta anterior por versão exata.
- O seletor apresenta Ficha, Ficha ampliada e, quando autorizada,
  Auditoria. Os casos dirigidos de acervo e auditoria passaram em
  Chromium e Android emulado. O caso de doação passou nos dois projetos
  após a correção de contraste do modo selecionado, preservando o conteúdo
  essencial e o período dos complementos.

O [Preview de `ee733107`](https://home-care-assistant-5mkeusb0t-rmzzfajs-projects.vercel.app)
respondeu à verificação de conexão e reconheceu pelo código um PDF de
Helena já emitido. As variáveis de Supabase, assinatura de PDF e Web Push
estavam no escopo de Preview. A política de confiança da branch inclui
os certificados públicos necessários para consultar PDFs de produção no
banco compartilhado. A PR segue em rascunho. SonarCloud e as validações
Ubuntu e Windows passaram nesse commit.

### Revisões e contagens na ficha de BAL

Revisões e Contagens passaram a ser abas independentes da mesma ficha.
Revisões reúne decisões por grupo, diferenças por material e o ato de
aplicar a contagem ao estoque. Contagens mostra autoria, hora, referência,
contexto do plantão, reconto e links para as versões preservadas. Os atalhos
de acompanhamento levam à aba correspondente e a URL preserva a escolha.
A identificação e os registros preservados continuam acessíveis em Mais.
Passaram 28 casos de navegador, 14 em Chromium e 14 em Android emulado,
sem retentativas. Os casos incluem uso a 320 px, revogação, atraso,
retomada, revisão independente e aplicação única no estoque.

### Segunda revisão automatizada de L3

O CodeRabbit publicou sete apontamentos em `ee733107`. O retorno de
uma ficha aberta no histórico de Plantões mantém a origem e a busca.
A leitura da agenda pode ser revogada sem ocultar a recuperação das
tentativas próprias. Uma revisão concorrente de rascunho de consumo
rejeita a tentativa antiga e abre a comparação com a revisão do servidor.
O acervo atualiza o filtro se a revisão da ficha mudar. Uma consulta
por versão exata valida a própria versão.

A recuperação da referência de uma contagem permanece disponível
quando a atribuição muda enquanto há edição. A nova migration
vincula a admissão à primeira versão documental do rascunho na mesma
transação. A integração comprovou que criação, revisão e emissão do
mesmo BAL após o fim do plantão preservam a autorização original.
Passaram 14 integrações dirigidas com Auth real. No remoto, a
migration foi aplicada após validar o resguardo
`314c56c4-2ded-47fa-9d2f-3c5abf6411ba`. A fila ficou vazia
com 334 migrations aplicadas.

Chromium e Android emulado confirmaram o retorno à agenda filtrada,
a atualização do acervo, a recuperação da confirmação após
revogação de leitura e a comparação do rascunho de consumo antes de
registrar o valor da revisão escolhida. O primeiro ensaio de consumo
esperava o código da API dentro de `error`. A asserção foi corrigida
para o campo `code`, e o caso passou nos dois projetos.

### Painel compartilhado de material

O painel aberto da ficha começa na aba identificada pelo seu código.
Ela mostra os dados do material naquela ficha. Estoque, Histórico e
Fichas também podem ser consultados ao abrir o painel do estoque ou
durante um preenchimento. A busca aplica número e tipo no banco sob
as permissões do paciente. O retorno preserva o filtro e o item de
origem. A ficha relacionada abre em Materiais com destaque para o item.

O Histórico usa o agrupamento do estoque geral, com atos expansíveis
e consulta de saldo anterior, efeito, saldo posterior e origem. As
decisões da ficha têm paginação própria. As duas integrações dirigidas
confirmaram o recorte por material, a revogação do acesso e a separação
entre os movimentos de uma ENT e a decisão de recebimento. A fila de
migrations ficou vazia após a aplicação no remoto, que passou a 336.
O resguardo anterior à aplicação foi
`206469ab-732d-46cf-89ed-c830cd7606cd`.
Os oito casos finais em Chromium e Android emulado passaram
sem retentativas. Exercitaram a busca, o destaque do material, a
volta ao filtro e ao preenchimento, a abertura do ato de estoque,
os saldos e a recuperação de foco.

### Identificação de arquivos e revisão seguinte

O acervo oferece uma única entrada para gerar PDF. O seletor inicia com
Ficha ampliada, como no laboratório. Também oferece Ficha e, quando
autorizado, Relatório de auditoria. Fechar o seletor não inicia emissão.
A recuperação mantém a seleção original e abre diretamente a mesma
tentativa. Os três pontos do exemplar abrem sua identificação, com
revisão, origem, período, complementos, assinatura e código consultáveis.
Visualizar, baixar e compartilhar reutilizam o mesmo arquivo armazenado.

Os cinco comentários do CodeRabbit em `89f37b5d` foram conferidos.
O acervo mantém a última revisão confirmada ao voltar para Todos.
A ficha identifica a linha de origem mesmo se a consulta de saldo falhar.
O Histórico aguarda as movimentações antes de restaurar posição e foco.
Os atalhos sobre conciliação abrem Revisões, onde consta o ato de aplicação.
A migration `20261122225705_l3_preserve_first_balance_admission.sql`
vincula a admissão válida à primeira contagem criada dentro do plantão,
mesmo quando o cliente omite sua chave. Após o fim da janela, a chave
continua obrigatória. Cinco integrações dirigidas com Auth real passaram.
A migration está aplicada localmente e no Supabase remoto, com 337 versões
e fila vazia. A primeira captura foi rejeitada ao detectar alterações nas
tabelas de monitoramento. A nova captura foi verificada sob o resguardo
`60bffb5a-dcc4-4c50-b56a-4b1e3776d54b` antes da aplicação.

As regressões de L1 agora usam os controles atuais de consulta pública.
A leitura de um código mantém a comparação de bytes como ação separada.
Os testes verificam o arquivo assinado e o SHA-256 no painel técnico.
A auditoria em alto contraste detectou texto claro sobre o fundo forçado
do navegador. O cabeçalho passou a usar as cores do sistema nesse modo.
A auditoria do acervo usa um administrador de um único paciente para
exercitar a permissão de anexar e evitar que os vínculos acumulados de
outros testes afetem o tempo de análise do navegador.
Passaram oito casos do seletor, acervo e painel de material, quatro
regressões de L1 e quatro casos finais de anexação, versão preservada,
validação pública e alto contraste. Os recortes passaram em Chromium e
Android emulado, com retentativas desativadas.

### Cadastro de plantões com horários da residência

Em Configurações, o administrador local registra fuso, início diurno e
início noturno. O cadastro usa a duração do tipo, o período escolhido e a
versão dos horários que o usuário conferiu. Horário especial permite
informar início e término, inclusive no dia seguinte. As ocorrências já
gravadas conservam os intervalos. O plantão isolado exibe somente a data
do plantão. A série interna dá suporte às chaves atuais da agenda.

A repetição pode ficar sem data final. O banco registra até 56 dias e
estende a janela antes de restarem 28 dias. Se houver sobreposição,
a extensão é revertida e a agenda indica revisão. A próxima tentativa
usa a mesma cadência e os horários preservados. Em uma extensão semanal,
uma ocorrência civil impossível é registrada na auditoria com data e fuso.
As ocorrências válidas vizinhas são gravadas. O encerramento impede a
geração posterior. As regras
atuais de publicação, proposta e recuperação continuam no mesmo contrato.
Residências ainda sem regras registradas usam o cadastro anterior durante
a transição.

A migration `20261122232848_l3_residence_schedule_hours.sql` está aplicada
nos bancos local e remoto. A primeira captura remota encontrou falha de
autenticação no dump de esquema. A nova captura foi validada em
`2964fb31-e0d2-451b-a544-8ea8267d2f33` e a fila remota ficou vazia.
O acesso fictício de administração cadastrou os horários de Helena Duarte
Nogueira com base nos plantões já preservados. A leitura autenticada
confirmou 07h, 19h e America/Sao_Paulo, na versão 1. O remoto passou a
338 migrations aplicadas.

Passaram três integrações dirigidas com Auth real. Elas cobrem o recorte
por paciente, a versão concorrente, a retentativa, o plantão noturno,
24 horas, as datas civis, a extensão, a sobreposição e o encerramento.
As integrações existentes de preparação e datas escolhidas também
passaram no recorte local. O teste Realtime que encerrou a CI de
`042617dc` agora aguarda o identificador da própria sonda nas duas
sessões antes de registrar a requisição. O teste dirigido passou.
Seis casos em Chromium, Android e iOS emulados passaram sem retentativas.
Eles exercitaram configurações, fechamento do cadastro sem edição,
plantão especial, recorrência aberta, conflito e navegação da agenda.

### Alteração de plantão com balanço designado

A alteração, o cancelamento, a aprovação de pedido e o encerramento de
programação consultam a atribuição vigente e a admissão de contagem.
O formulário mostra a ficha quando já existe, identifica a pessoa e o
prazo, e pede motivo e decisão a quem tem autorização familiar. É possível
manter a contagem quando a cobertura preserva o responsável e todo o
intervalo da atribuição, designar um plantão elegível no mesmo prazo ou
aprovar o adiamento dentro da autoridade existente.

O banco confere as versões da atribuição e dos plantões, rejeita destinos
que também serão cancelados e grava agenda, encaminhamento e histórico de
forma atômica. Quando é possível manter a atribuição, preserva a admissão e
atualiza somente a referência à versão do plantão. Se houver troca, preserva
a ficha e a autoria e encerra a admissão anterior. A nova atribuição pode
retomar o documento pelos caminhos já autorizados.

Os ajustes da revisão automatizada também tratam conflito de edição dos
horários da residência, horários especiais incompletos e programação
semanal sem ocorrências. Em um ciclo fixo o intervalo especial precisa
conservar as horas de trabalho da escala. A extensão conserva o trabalho
e o descanso em horas decorridas.

As duas migrations foram aplicadas nos bancos local e remoto após o backup
cifrado verificado `8e2ccf21-c9f3-4891-a343-6b30451fb774`. A simulação
vinculada posterior mostrou a fila vazia. Passaram 38 regressões distintas
de integração com Auth real. Os casos cobrem decisão familiar, destino
obsoleto, retentativa, preservação da autoria, admissão iniciada entre a
revisão e a confirmação, recorrência vazia e data civil inexistente. O
conflito de versão dos horários e o cancelamento com adiamento foram
exercitados em Chromium, Android emulado e iOS emulado.

### Assistente de contagem física do BAL

A contagem por plantão tem confirmação de paciente, autoria e plantão,
materiais por categoria, itens extras, observações e revisão. As quantidades
de referência, física e diferença são exibidas separadamente. O rascunho
conserva a etapa, categoria, quantidades e extras entre sessões. A reconsulta
de referência mantém as observações anteriores acessíveis e pede uma nova
conferência física. A admissão registrada continua autorizando a conclusão
da mesma contagem após o fim do plantão.

A recontagem mantém a versão anterior congelada e começa pelos materiais
daquela contagem.
Pode incluir outros materiais do catálogo na categoria correspondente. Um
extra que entrou no catálogo passa para Materiais. O banco verifica os itens
da contagem anterior e rejeita confirmação divergente do rascunho. Os extras
fora do catálogo ficam na ficha e no exemplar gerado da contagem para
identificação posterior. A conciliação de estoque usa as identidades já
catalogadas.

A migration foi aplicada localmente e no Supabase remoto depois do backup
cifrado verificado `be60068e-10af-4d85-8286-287ed417befb`. A consulta vinculada
confirmou 341 migrations e fila vazia. A residência fictícia compartilhada
tem vínculos com endereços reais e estava sem plantão ativo. Os cenários
novos com emissão e recontagem usaram pacientes e contas fictícias locais.

A CI de `b94aef86` encontrou um teste com texto antigo sobre a decisão do
BAL e três casos de troca de profissional sem encaminhamento familiar.
Os testes foram atualizados para verificar o novo aviso e registrar uma
decisão autorizada antes da troca. Os recortes locais correspondentes
passaram.

Os cenários dirigidos em Chromium, Android e iOS emulados verificaram
retomada após recarregar, referência alterada, emissão após o plantão,
extra fora do catálogo, recontagem e recuperação após perda de resposta.
A tela de materiais foi verificada em 360 e 412 px. A composição
independente do PDF confirmou nome, unidade e quantidade do extra, com os
saldos do catálogo em seu quadro original.

O Preview de `566a6917` respondeu com o protocolo e o esquema esperados e
retornou a referência de estoque para uma sessão fictícia autenticada, com
29 materiais. Os testes adicionais em Chromium confirmaram a retomada da
revisão sem emissão e a recontagem em outra janela com o tipo de plantão
visível na confirmação e na revisão. A recontagem preservou a contagem
anterior, sua autoria e seus pareceres.

### Revisão por material e item extra do BAL

O formulário reúne a quantidade contada, o progresso da conferência e as
três escolhas do laboratório V4. Os materiais aparecem por categoria, e
os extras ficam em seu próprio grupo. A consulta completa da referência
continua disponível no painel. Cada diferença exige encaminhamento e
permite comentário. A opção “Não conferi” fica sem resultado individual.

A revisão só aceita itens da versão examinada, com autoria, grupo revisor
e idempotência do ato. O registro preserva nome, unidade e quantidade dos
extras daquela contagem. O exemplar usa esse registro para identificar os
extras revisados, inclusive após a saída do item da lista atual. A
aplicação ao estoque continua sendo um ato próprio, e o encaminhamento de
uma diferença permanece no histórico. A continuidade após a revisão está
registrada na seção sobre o vínculo de extras às recontagens.

A migration `20261123011538_l3_balance_extra_reviews.sql` está no ambiente
local e no Supabase remoto. O backup cifrado crítico
`45838270-91ca-4ea7-8ac2-57e3eb13b7b6` foi verificado antes da aplicação.
A consulta posterior confirmou 342 migrations, fila vazia e ausência de
execução direta do validador por `authenticated`. Os testes de escrita
usaram identidades fictícias locais.

Chromium, Android e iOS emulados passaram pelo registro da revisão e pela
recuperação da aplicação. Os estados “Confere” e “Diferença” passaram pela
verificação de acessibilidade em 320 px. A composição e a extração do PDF
confirmaram a identificação de um extra da versão histórica, com seu
resultado e comentário.

### Assistente do BAL avulso

O BAL avulso usa as cinco etapas do laboratório. Compartilha com o BAL
por plantão os campos de contagem e de extras, a apresentação de referência
e diferença, a leitura de código de barras e a consulta do material. A
confirmação identifica paciente, autor, estoque e modalidade da contagem.
O rascunho conserva etapa, categoria, referências por item e quantidades.
A adoção de uma referência atual mantém as observações anteriores no
histórico privado e solicita nova conferência física.

Na recontagem avulsa autorizada, entram os materiais ativos da contagem
anterior e os extras preservados. Um extra identificado no catálogo passa
para a categoria correspondente. Materiais novos podem ser escolhidos
individualmente. A contagem avulsa inicial continua a abranger o catálogo
ativo, e os balanços sujeitos ao regime por plantão mantêm as regras de
atribuição e admissão do servidor.

A migration `20261123014442_l3_unscheduled_balance_count.sql` está aplicada
localmente e no Supabase remoto. O backup crítico cifrado
`241d062b-050d-480d-a356-5974222a6333` foi verificado antes da aplicação,
após nova captura por alteração de telemetria durante a primeira tentativa.
A consulta posterior confirmou 343 migrations, fila vazia e aceitação de
etapas novas e antigas no contrato do avulso. A validação das etapas do
regime por plantão permanece vinculada ao modo agendado.

Os testes de integração com Auth real confirmaram a recontagem seletiva,
a preservação da contagem anterior e a rejeição de omissões. Chromium,
Android e iOS emulados confirmaram a retomada de um salvamento com
resposta perdida, o rascunho de extra decimal, a emissão e o acesso aos
botões da revisão em larguras de 320 a 1440 px.

### Pedido de autorização para contar o BAL

Quem está habilitado a contar pode pedir autorização quando outro
profissional é responsável. O painel registra a justificativa e mostra o
pedido à administração do paciente. A decisão usa o mesmo fluxo de
confirmação e recuperação das demais decisões curtas do BAL. O histórico
conserva a autoria, as datas, a justificativa e a observação da decisão.

A aprovação vincula o solicitante a um plantão real publicado que cobre o
prazo original. A seleção confirma a versão desse plantão. Um pedido
pendente mantém a atribuição vigente. A recusa registra a decisão sem
transferir a contagem. Uma contagem já admitida impede a aprovação de
troca. O pedido e a decisão não registram movimentos de estoque.

Três testes de integração com Auth real verificaram escopo, negativa para
outros papéis, alteração de plantão, idempotência e concorrência entre
aprovar e iniciar a contagem. Chromium, Android e iOS emulados confirmaram
a solicitação, a recuperação após resposta perdida, a decisão pela
administração e a entrada do profissional autorizado no assistente.

A migration `20261123021122_l3_balance_count_permission.sql` foi aplicada
localmente e no Supabase remoto. O backup crítico cifrado
`877df471-bae1-45ff-90b0-b2dfca3826ba` foi verificado antes da aplicação.
A conferência remota confirmou 344 migrations, fila vazia, RLS ativa e
acesso aos pedidos pelo fluxo autorizado do BAL. Os testes de escrita
usaram uma residência fictícia no ambiente local.

### Observação na programação do BAL

O painel usa o interruptor “Balanços programados” e o campo “Observação
(opcional)” do laboratório V4. A observação pode ser salva, revisada e
removida na programação. A conferência mostra o que será gravado e a
situação do regime. Foram mantidos o fuso, a data de vigência e a
possibilidade de designar um profissional, que são controles operacionais
do sistema.

A programação preserva a autoria, a versão e a observação no histórico
e no comprovante da decisão. Pausar um regime ativo continua exigindo
motivo e preserva as obrigações existentes. O fluxo não gera rascunhos
de decisão nem movimentações de estoque. A observação não substitui o
motivo da pausa, do adiamento, da atribuição ou da decisão sobre um pedido.

A migration `20261123022923_l3_balance_programming_observation.sql` está
aplicada localmente e no Supabase remoto. O backup crítico cifrado
`286c2a74-9590-465b-a930-ad2b68a4d515` foi verificado antes da aplicação.
A conferência remota confirmou 345 migrations, fila vazia, coluna
opcional, RLS ativa e ausência de execução da operação por `anon`.

Os testes com Auth real verificaram a identificação de quem confirmou,
a recuperação da mesma tentativa, a remoção explícita da observação e
a rejeição de uma pausa sem motivo. Os testes de ativação sem observação
e de pausa com resposta perdida passaram em Chromium, Android e iOS
emulados. Nos mesmos três projetos, o teste combinado confirmou a saída
familiar de 5 para 4 unidades, a observação na programação de sexta à
noite e a preservação do saldo ao programar. A conferência do BAL foi
avaliada em larguras de 320 a 1440 px. Os seletores antigos da
movimentação foram atualizados para os controles e o diálogo atuais.

### Vínculo de extras às recontagens

Uma diferença sobre item extra mostra os atos posteriores na revisão
original. A versão da recontagem preserva a identidade do extra que
permanece fora do catálogo, com sua quantidade e autoria. Quando há uma
correspondência única entre o extra que saiu da lista e os materiais
catalogados contados, a versão registra a identidade do catálogo. Essa
ligação resiste à alteração posterior do nome. Havendo mais de uma
correspondência contada, o sistema preserva o parecer original e deixa o
vínculo em aberto.

O extra que ainda está fora do catálogo não participa da aplicação ao
estoque. A versão que o conta como material catalogado só apresenta saldo
de aplicação quando há ato correspondente e permissão de leitura do saldo
da equipe. A ficha e as novas emissões de PDF mostram autoria, quantidade,
versão e situação da aplicação de cada ato vinculado.

A migration `20261123025445_l3_balance_extra_recount_links.sql` está
aplicada no ambiente local e no Supabase remoto. O backup crítico cifrado
`c8a83d5e-8b3d-4408-bd22-8b1cbacf3081` foi verificado antes da aplicação.
A conferência remota retornou 346 migrations, fila vazia e funções
internas sem execução direta pelos papéis da interface.

Oito integrações com Auth real cobriram extras preservados e
incorporados, renomeação, dois candidatos ambíguos, reutilização do
identificador, corte por versão, replay e leitura restrita do saldo.
Dois cenários passaram em Chromium, Android e iOS emulados. A ficha
mostrou os links de cada versão, e a extração do PDF confirmou o extra
recontado e a ausência de movimentação para o item ainda sem catálogo.
O teste de acessibilidade separou a verificação do link focado da
auditoria da composição iniciada no topo em cada largura.

Na CI do commit `27cbe270`, o teste de navegação privada ainda recusava
a etapa de contagem no BAL avulso. A expectativa passou a aceitar a
etapa compartilhada e a verificar que as etapas de recebimento e as
específicas de outro modo são recusadas sem avançar a revisão privada.
Os quatro testes de integração desse arquivo passaram localmente.

### Tipos de plantão na configuração

A agenda mantém as ações sobre ocorrências e séries. O menu **Ações da
agenda** abre **Tipos de plantão · configurações** e o retorno preserva
o paciente e o dia de referência. A aba **Plantões** em Configurações
reúne os tipos e a edição dos horários da residência. O acompanhamento
de BAL também abre essa área quando ainda precisa de um tipo disponível.

Os formulários de criação e edição foram reaproveitados. Os
preenchimentos privados de tipos e seus resultados ficam nessa área,
inclusive para consulta ou descarte quando a capacidade de alterar tipos
é retirada. A agenda mantém os preenchimentos de ações operacionais.
Esse acesso a registros anteriores preserva uma função do sistema que
o laboratório não exemplifica.

Passaram seis cenários em Chromium, Android e iOS emulados. Eles
cobriram criação e edição, recuperação entre sessões, revogação de
permissão, consulta incompleta, horários da residência e encerramento
de série. O cenário de criação foi repetido nos três projetos com
um nome longo e auditoria da lista de tipos em 320 px.

O cadastro de tipos usa horas inteiras de trabalho e descanso. Ao criar
uma programação por ciclo, a revisão mostra o ciclo da versão escolhida.
O banco confere a versão do tipo e dos horários da residência antes de
gerar as ocorrências. A edição do tipo afeta novas programações, e os
intervalos publicados continuam ligados aos atos originais.

Uma residência sem horários configurados recebe orientação no cadastro
de tipos. Tipos anteriores podem adotar o novo ciclo na edição. A
migration `20261123035313_l3_shift_type_cycles.sql` mantém o horário
original associado a tipos anteriores e conserva o hash da referência
de edição quando ainda não há ciclo no tipo.

Passaram 41 testes de integração com Auth real. Eles incluem a recusa
de um ciclo divergente, a preparação de um ciclo personalizado, a adoção
de um ciclo em um tipo anterior, o replay e a preservação dos intervalos
publicados.

O backup crítico cifrado `9aaa4f74-d9ad-418f-aeaf-147295a2f94c` foi
verificado antes da aplicação remota. A simulação confirmou que a
única migration pendente era a de ciclos de plantões.
Local e remoto registram 347 migrations, com a fila vinculada vazia.
O RPC de agendamento continua restrito ao papel autenticado e o
validador interno fica indisponível diretamente a esse papel.

Passaram 35 testes unitários de preparação e edição de escala. Os seis
cenários dirigidos em Chromium, Android e iOS emulados confirmaram
a criação do tipo, o horário excepcional, o ciclo sem data final,
a recusa de sobreposição e o retorno à agenda. A confirmação do
agendamento compara o conteúdo do recibo independentemente da ordem
em que seus campos são serializados.

### Contexto de material nas fichas de consumo e falta

A aba Materiais abre a consulta compartilhada com **Nesta ficha** como
primeira aba. A quantidade vem da versão atual do registro. Um material
retirado numa correção permanece consultável em **Materiais de versões
anteriores**. O painel mostra os atos vinculados, com saldo anterior,
efeito e saldo posterior da custódia. Correção e compensação aparecem
com suas próprias versões. Aviso de falta tem o contexto do aviso e os
saldos ausentes aparecem como indisponíveis.

Estoque, Histórico e Fichas usam as consultas compartilhadas. A ficha
vinculada abre em Materiais dentro da consulta. O retorno conserva a aba,
a ficha relacionada e o foco. A migration
`20261123043302_l3_consumption_material_effects.sql` acrescenta os saldos
já gravados e a identidade do ato à leitura autorizada.

Passaram 16 testes de integração de consumo direto e de revisão de relatos.
O teste de baixa, correção e cancelamento conferiu os saldos de cada ato
e a compensação única.
Em Chromium, Android e iOS emulados, passaram a consulta do material,
a visita à entrega vinculada e o retorno com foco restaurado. As
regressões de revisões legadas e de retorno do painel nas fichas também
passaram nos três projetos.

Antes da aplicação remota, o backup crítico cifrado
`3904d57a-48c1-41e9-bf41-26aed7e7497b` foi verificado. Local e remoto
registram 348 versões, com fila vinculada vazia. A leitura da ficha
continua condicionada à autenticação e à permissão da custódia.

### Consumo a partir de sugestão do WhatsApp

Em Consumo e faltas, **Mais opções de consumo → Sugestões do WhatsApp**
abre o painel de consulta, revisão e recuperação. A lista principal fica
dedicada aos registros emitidos. O painel mantém os preenchimentos e
resultados pessoais disponíveis sob as permissões existentes.

**Continuar consumo** abre o assistente compartilhado em Materiais. A
mensagem original é consultada pelo vínculo autorizado. Os materiais
reconhecidos entram selecionados. O formato atual do provedor envia
identidades de materiais, e a equipe informa as quantidades usadas
antes de revisar. O rascunho conserva o vínculo com a sugestão e as
quantidades já preenchidas.

A emissão usa a referência de estoque e a revisão do rascunho. A
baixa, a confirmação da sugestão, o vínculo com a ficha e a auditoria
são transacionais. Uma sugestão encerrada em outra sessão impede nova
emissão, e a resposta incerta usa a chave da tentativa original. A
ficha indica a origem WhatsApp. O descarte existente preserva a
mensagem sem movimentar estoque. Vínculos que só podem declarar
continuam usando a revisão legada com as capacidades existentes.

O assistente reutiliza o canal existente. Os testes usam sugestões
registradas no ambiente local. A homologação do recebimento externo
depende da configuração do provedor.

As verificações dirigidas cobriram 14 integrações com Auth real,
23 testes unitários e nove cenários em Chromium, Android e iOS
emulados. O cenário de consumo confirmou as quantidades em branco,
a retomada, a recuperação da resposta perdida e o débito único.

A migration foi aplicada após o backup crítico cifrado verificado
`f7384b0f-8bc1-4df5-b46f-da00588f374d`. Local e remoto registram
349 versões, com fila vinculada vazia. O RPC transacional segue restrito
ao papel autenticado, com autorização por paciente e dono da sugestão.

### Reiteração e cancelamento de consumo

**Avisar novamente** abre a mensagem para a família com os materiais
preservados no aviso original. O novo aviso mantém seu vínculo com o
anterior e conserva os saldos. **Cancelar consumo** abre o diálogo com
os materiais e as quantidades que voltarão ao estoque da equipe. O
motivo e a versão continuam vinculados ao ato. Uma resposta incerta
é consultada com a mesma chave antes de oferecer nova transmissão.

A rodada com Chromium, Android e iOS emulados passou em 17 de 18
casos. O fechamento do painel de sugestões após uma revisão falhou no
Android. O painel passou a ter altura estável no celular e a devolver
o foco ao botão Atualizar sugestões quando a ação anterior desaparece.
Os seis casos dirigidos de Android e iOS passaram com o ajuste.
As verificações confirmaram que uma nova falta preserva os materiais
e o saldo, e que a compensação do cancelamento ocorre uma única vez
mesmo quando a resposta original se perde.

### Correção assistida do consumo

**Corrigir consumo** usa as cinco etapas da v4 e compartilha a seleção
de materiais com a emissão. A revisão apresenta quantidade registrada,
quantidade corrigida, saldo atual, diferença e saldo projetado. A leitura
inclui os materiais retirados, para que a devolução ao saldo apareça na
conferência. A edição em aberto fica no assistente, com aviso antes de
descartar. A tentativa confirmada pode ser recuperada pela chave original.

O banco vincula a revisão à ficha, à versão e às referências de estoque,
incluindo os materiais retirados. O comando revalida esses dados sob o
bloqueio do estoque e aplica somente a diferença. Quando a ficha muda,
o assistente compara as versões e oferece a reaplicação explícita apenas
das edições feitas pelo usuário. A confirmação passa por nova revisão.

Seis integrações com Auth real passaram. O banco recusou uma correção
sem revisão, detectou a alteração do estoque mesmo depois de o saldo
voltar ao valor anterior e admitiu somente uma das duas correções
concorrentes. O recibo da tentativa vencedora foi recuperado pela
mesma chave e a retirada de um material devolveu a quantidade correspondente.

Os 15 casos de navegador passaram em Chromium, Android e iOS emulados,
incluindo a comparação com outra sessão, a revisão antes da devolução
e as regressões de emissão, rascunho e aviso de falta. A migration foi
aplicada no local e no remoto após o backup cifrado verificado
`105605ce-6dc7-49d1-903b-a9fc104dd36f`. A conferência comparou as duas
definições e os grants, incluindo a restrição de acesso ao comando interno.

### Material do aviso sem quantidade

Em E07-08 e E07-11, a seleção do material e a mensagem bastam para
enviar um aviso conforme a v4. A quantidade permanece opcional. A ficha
identifica explicitamente sua ausência e a reiteração mantém o material.
O seletor permite incluir mais de um material. Os avisos com quantidade
e os avisos só com mensagem continuam disponíveis.

Seis integrações com Auth real verificaram o conjunto de consumo e falta.
O aviso com material sem quantidade manteve o saldo, a comunicação à
família e o recibo da tentativa original. O banco recusou duplicatas,
materiais fora do catálogo, unidade divergente, zero e fração incompatível.
Seis casos dirigidos em Chromium, Android e iOS emulados cobriram o envio
sem quantidade e a reiteração de avisos com e sem quantidade.

A migration preserva os registros anteriores. Foi aplicada localmente e
no remoto vinculado após verificar o backup cifrado da função substituída
`c9148dec-8d7f-4ad9-a356-37af611336a2`. As definições locais e remotas
coincidem e as funções internas seguem com execução restrita.

### Residências sem horários e início da programação

A agenda continua consultável e orienta a administração a definir o
fuso e os inícios diurno e noturno. Profissionais sem esse acesso
recebem orientação para falar com a administração. A configuração
mantém o paciente e a data na volta. O cadastro usa o período da
residência. Preenchimentos com referência anterior pedem adoção
explícita e conservam os demais campos.

A migration `20261123051802_l3_require_residence_for_new_schedule.sql`
exige a referência da residência nas novas programações pela API de
L3. Os endpoints usam o mesmo contrato de autorização e recibo. O
banco compartilhado mantém o caminho da versão publicada até o corte
da produção. Os 43 testes de integração dirigidos cobriram a recusa sem
efeitos, os recibos já gravados, o isolamento entre pacientes, os
horários e as ações de agenda.

Cinco cenários passaram em Chromium, Android e iOS emulados. Eles
cobriram configuração, retorno à data original, acesso profissional,
adoção de referência e recuperação. O caso das 12 datas passou nos
três perfis após atualizar a expectativa da prévia noturna. A recusa
por sobreposição e os horários gravados foram conferidos.

Local e remoto registram 350 migrations, com a fila vinculada vazia.
O backup crítico cifrado `dc78aeb9-76a7-4a5b-9085-4eb76b784e46`
foi verificado antes da aplicação. As duas novas funções executam com
as permissões do papel chamador e o acesso é restrito ao papel autenticado.

### Recuperação de uma programação sem confirmação

O painel consulta a tentativa na origem. Se o resultado ainda estiver
desconhecido, o usuário pode encerrar a tentativa e conservar o
preenchimento. O banco serializa a decisão com a publicação original.
Se o registro já foi gravado, o painel recupera o recibo. Se a decisão
chegar primeiro, somente a revisão privada avança e um pacote atrasado
da revisão anterior fica impedido de publicar.

O encerramento pode ser recuperado com a mesma chave após recarregar.
A retomada confere identidade, revisão e conteúdo do rascunho. Uma
edição concorrente ainda exige comparação. Um rascunho de programação
anterior à configuração adota explicitamente os horários atuais
antes de uma nova revisão.

A migration `20261123054301_l3_resolve_schedule_creation_attempt.sql`
está aplicada localmente e no remoto, com 351 versões e fila vazia.
O backup cifrado `1222b230-63e8-44ed-b827-638b47a3ac09` foi verificado.
O RPC exige uma conta autenticada e confere escopo e autoria no banco.
Os 21 testes de integração dirigidos
cobriram também autoria, isolamento, integridade da intenção,
idempotência e concorrência com o comando original.

Os nove casos em Chromium, Android e iOS emulados incluíram perda da
resposta do encerramento, recarga, reuso da chave e gravação posterior
uma única vez com os horários atuais. O teste conferiu no banco que
uma entrega tardia do comando original foi recusada.

### Regressão móvel de emissão e verificação pública

Quatro casos em Android e iOS emulados conferiram a recuperação da
emissão de PDF, a preservação dos bytes na consulta e a emissão nova
por ação explícita. Também cobriram chegada via QR sem conta e a
distinção entre o arquivo apresentado e o código de outra emissão.

### Lembretes de entregas bilaterais

Durante a captura, o monitor registrou duas entregas pendentes de
recebimento cujo lembrete automático falhou com SQLSTATE `42501`.
Os dois destinatários tinham vínculo ativo. O caso local revelou que
o registro do evento chamava a consulta interativa da transferência
e exigia a permissão `ent.read` de um usuário. A captura interna agora
usa os mesmos fatos da transferência no evento. A consulta
interativa mantém a exigência de permissão e calcula suas próprias
ações autorizadas.

Em duas execuções do agendador no caso bilateral, o teste registrou
um único lembrete com autoria de sistema e conservou o estoque.
Passaram os 17 testes de transferência e expedição, além da repetição
dirigida do caso que passou a conferir o lembrete bilateral.
As duas entregas remotas ainda aguardam a reexecução normal da rotina.

A migration foi aplicada após o backup cifrado verificado
`17e256d7-1c6e-4c60-bb8d-9cafd70d3d8a`. Local e remoto registram
352 versões, com a fila vinculada vazia.

### Estoques e trânsito em telas estreitas

- E07-01 segue a composição do laboratório com cabeçalho compacto,
  custódias em linha, busca, filtro em painel e total ao lado da ação de
  trânsito. A busca mantém os materiais em primeiro plano. O filtro de
  saldo continua considerando o saldo confirmado da custódia.
- Compras, chegadas e movimentações familiares ficam acessíveis pelo
  menu do estoque e pelos controles autorizados na página. O histórico
  paginado e o atalho de consumo continuam disponíveis conforme as
  permissões do vínculo. O aviso de leitura anterior permanece visível
  quando uma atualização falha.
- E07-03 agrupa o trânsito por material e conserva os fatos por ficha.
  A ficha completa abre em Materiais com destaque do item. A volta ao
  painel conserva a consulta de trânsito e devolve o foco ao acionador.
  O link existente com `custody=TRANSIT` abre o mesmo painel.
- O contraste das legendas no card de saldo crítico foi ajustado após
  as auditorias do navegador identificarem uma relação de 4,3:1.
- Nas capturas locais de 360 e 412 px, o primeiro material aparece na
  área visível, com o cabeçalho e as ações na mesma linha. A largura
  útil fica contida na tela. Fechar a consulta devolve o foco ao item.
  As capturas são de navegador emulado com dados fictícios.

### Saldos e compromissos no painel compartilhado

- E07-02 usa a mesma composição de saldo por custódia ao abrir o
  material pelo estoque, pela ficha ou pelo wizard. A aba contextual
  continua na primeira posição quando há uma ficha de origem.
- A área A receber separa trânsito, divergências, compra a realizar,
  compra a receber e chegada a validar. Cada quantidade usa o produto
  selecionado. Os atalhos levam à aba Fichas com o tipo correspondente
  já selecionado. A consulta está sujeita à permissão de cada ficha.
- O histórico de estoque informado na REQ permanece disponível. O
  acesso pelo estoque também conserva o consumo registrado no período.
- A migration `20261123070728_l3_material_stock_context.sql` reutiliza
  a projeção da tela de estoque e restringe a leitura ao material da
  consulta. Nove testes de integração com Auth real passaram, incluindo
  tentativa com linha de outra ficha, paciente alheio, retirada de
  permissões e chegada pendente sem efeito no saldo disponível.
- A permissão contextual de mostrar o saldo familiar na REQ continua
  independente. Somente a leitura do estoque familiar libera os dados
  de mínimo, movimentação e compromissos dessa custódia.
- A migration está aplicada no ambiente local e no remoto. A fila
  vinculada ficou vazia com 353 versões. O acesso direto à projeção
  privada segue restrito. O backup cifrado
  `99cd2b11-2505-47e3-b057-39905521d553` foi verificado antes da aplicação.

### Acordeões de fichas vinculadas

- A aba Fichas usa os filtros no servidor, busca por código e cartões
  recolhidos com tipo, protocolo e situação. Expandir um cartão
  consulta os fatos do material na ficha com o vínculo ativo.
- Ver ficha abre em Materiais e destaca o produto da consulta.
  Voltar restaura filtro, busca, acordeões expandidos, foco e rolagem.
  A entrada pelo wizard mantém a quantidade preenchida. As consultas
  da aba Histórico preservam seus atalhos anteriores.
- Para uma REQ com confirmação de ciência exigida, o acordeão
  mostra a orientação. A confirmação continua na abertura da ficha.
  Quantidade ou identidade indisponível é apresentada explicitamente.
- O incremento reutiliza as consultas autorizadas de fichas e seus
  contratos de banco. A forma compacta conserva grupos operacionais,
  como requisições em acompanhamento e fichas arquivadas.
- A rodada de regressão passou nos 18 casos executados em Chromium,
  Android e iOS emulados. Cobriu a nova tentativa após falha, a
  exigência de ciência e o retorno pelo botão e pelo histórico.

### Calendário diário em Plantões e balanços

- A entrada em Plantões abre o dia selecionado. A faixa semanal
  permite escolher uma data ou avançar e recuar um dia. Os marcadores
  vêm dos plantões retornados para o vínculo e os filtros ativos.
- O cartão compacto apresenta horários, profissional e tipo. Para
  plantões que atravessam a meia-noite, a ocorrência aparece em cada
  dia em que está em andamento. O intervalo integral, o fuso e as
  observações ficam nos detalhes do profissional.
- O menu diário abre um modal com profissional, intervalo e ações
  autorizadas. Trocar profissional, alterar horário e cancelar uma
  ocorrência abrem formulários próprios. Encerrar próximos plantões
  informa a data de corte e confere se ela preserva plantões iniciados
  ao revisar e ao confirmar pelo modal.
- O pedido de alteração segue para decisão autorizada. Troca,
  horário e cancelamento usam a mesma referência, versão, confirmação
  e recuperação da agenda, incluindo a decisão sobre balanço vinculado.
  A edição conjunta e a retomada dos campos privados continuam
  disponíveis pelo editor compartilhado.
- Enquanto o servidor responde à confirmação pelo modal de ações,
  a interface mostra o carregamento sobreposto. A recuperação aparece
  quando o resultado continua sem confirmação.
- Seis casos dirigidos em Chromium, Android e iOS emulados verificaram
  a troca com horário preservado, a alteração de horário com o mesmo
  profissional, o pedido restrito, o corte da série, o cancelamento
  com balanço e a espera da confirmação. A rodada final conferiu o
  modal em 360 e 412 px e o retorno de foco ao botão de origem.
- A interface mantém os modos Semana e Mês, os filtros de profissional
  e situação e as rotas de referência. A lista de propostas e a
  recuperação de operações anteriores continuam na área da agenda.
- O atalho **Balanço neste plantão** abre um painel de consulta quando
  a atribuição ativa corresponde ao plantão, à sua versão, ao
  profissional e ao intervalo publicado. O painel mostra responsável,
  período, prazo e disponibilidade. Iniciar ou retomar abre o wizard
  existente, que confere a atribuição escolhida.
- A agenda consulta uma projeção restrita do acompanhamento de
  balanço. Ela exige leitura de balanços e de plantões, respeita a
  visibilidade da própria escala e usa o vínculo ativo. Após
  reatribuição, o atalho acompanha o plantão de destino. A consulta
  reaproveita a função de banco existente e dispensa migração.
- A confirmação da escala compara a decisão de balanço no formato
  validado. A ordem das chaves retornadas pelo banco já não provoca
  recuperação indevida após um cancelamento confirmado.
- Foram verificados com Auth real o acesso do responsável, a recusa
  de uma versão divergente, a omissão para outro profissional com
  leitura própria e o bloqueio após retirada da leitura de balanços.
  A transferência confirmou a operação e moveu o atalho. A verificação
  em 320 px conferiu o painel abaixo do cabeçalho e as ações na base.
- A rodada encontrou e corrigiu um atributo de acessibilidade inválido
  no contêiner de movimentos aberto a partir do alerta de estoque.
  Este incremento dispensa migração.
- A regressão dirigida passou em 21 casos no Chromium, Android e iOS
  emulados. Cobriu leitura incompleta, restrição por profissional,
  horários noturnos, edição, divergência de período, cancelamento
  com balanço e navegação pelo alerta de estoque.

### Conferência de alteração de plantão com balanço

A decisão escolhida continua no preenchimento quando uma data fica
temporariamente incompleta. A confirmação exige a referência autorizada
do balanço e um destino que ainda esteja dentro do prazo. Se a leitura
perde autorização, o formulário retira os fatos do balanço, preserva a
edição própria e bloqueia a confirmação. Durante a conferência da revisão
salva, os campos de destino ficam bloqueados. A recuperação mostra o
plantão de destino quando a consulta atual confirma a mesma referência.

O horário especial de uma recorrência semanal ou por datas é conferido
na primeira ocorrência selecionada. A data inicial do período pode
pertencer a um dia sem plantão. O servidor continua verificando os demais
intervalos materializados.

Trinta e sete testes de contrato passaram. A programação de horários e a
jornada de cancelamento com adiamento passaram em Chromium, Android e iOS
emulados. O cancelamento cobriu perda real e
restituição da leitura do BAL, pausa durante a verificação da revisão,
tentativa sem resposta, reenvio explícito e confirmação da atribuição no
banco. Um timeout anterior ocorreu ao pausar uma leitura de fundo antes
da revisão. A última rodada vinculou a pausa ao salvamento confirmado.
A mudança usa os contratos e as migrations vigentes.

### Limite de designação do BAL e recuperação dos horários

E08-02 e E08-03 passaram a usar o início original da obrigação para oferecer
o plantão editado como destino do BAL. A referência fornece esse início às
pessoas habilitadas a decidir. A confirmação continua validando o intervalo
e a atribuição no banco. O rascunho mantém a justificativa tal como digitada.
A revisão, a confirmação e o evento usam a mesma remoção de espaços e
quebras de linha nas extremidades.

A configuração de horários da residência recupera o recibo pela chave da
tentativa. Se houve conflito de versão e o banco comprovou a recusa, a
edição mantém os horários digitados e oferece a adoção da versão atual.

Passaram 38 testes de contrato, 33 integrações com Auth real e seis casos
dirigidos em Chromium, Android e iOS emulados. A integração conferiu o
limite do destino e a justificativa no rascunho, recibo e evento. O navegador
recuperou a tentativa recusada e a confirmação cuja resposta foi perdida.

A migration foi aplicada localmente e no remoto vinculado após o backup
cifrado verificado `d5f19cb9-a53a-46c7-af44-485fc64d39d8`. As definições e
permissões verificadas nos dois ambientes coincidem. A mudança dispensa
dados de exemplo adicionais.

### Balanços previstos e programação semanal

- A aba Balanços abre com **Previstos**, conforme E08-05. O cartão mostra
  o responsável, o intervalo, a disponibilidade e a ação autorizada.
  O título abre os detalhes com o prazo. Autorização e adiamento
  pendentes continuam ligados aos respectivos pedidos.
- A lista usa a atribuição atual e a elegibilidade retornadas pelo banco.
  A programação semanal mostra dia e tipo de plantão quando configurados.
  Uma data e um responsável novos só aparecem quando há atribuição oficial.
  Contagens emitidas em revisão ganham acesso direto à ficha em
  **Em acompanhamento**.
- A engrenagem abre a programação em **Configurações → Plantões**.
  A observação opcional, a pausa motivada, a revisão e a conferência de
  resultado usam o fluxo transacional existente. A contagem avulsa, os
  recontos, as decisões pendentes e o histórico conservam seus controles.
  Este incremento dispensa migração.
- Dezessete casos dirigidos passaram em Chromium, Android e iOS emulados.
  A conferência em 360 px comparou o cartão de outro responsável com a v4
  e verificou o prazo no painel, o retorno de foco e a autorização real.
  A configuração e a designação após ambiguidade passaram com um worker
  nos dois projetos móveis. A primeira rodada com dois workers perdeu
  a sessão da conta de teste compartilhada em dois casos de configuração.

### Pedido e decisão de adiamento

- O pedido identifica o responsável e o prazo vigente. Na falta de plantão
  elegível, a revisão fica indisponível e a agenda aparece para quem pode
  consultá-la. A revisão mostra o prazo solicitado. A decisão conserva a
  justificativa original e os prazos da versão examinada.
- Nove casos dirigidos passaram em Chromium, Android e iOS emulados. A
  verificação cobriu ausência de destino, aprovação com efeito no prazo e
  mudança concorrente do plantão de destino. Este incremento dispensa migração.

### Rastreabilidade dos 35 cenários da v4

As referências apontam para verificações reproduzíveis e para os resultados
dirigidos registrados neste lote. A comparação visual do conjunto deve
considerar as superfícies e estados de cada família. CI, Sonar e Preview
validam o commit em que forem executados. A integração controlada de
WhatsApp ainda requer homologação do provedor.

- **E07-01** — Busca, mínimo, saldo por custódia e restrição da equipe.
  `stock-canonical-layout.spec.ts`.
- **E07-02** — Painel compartilhado e volta à origem com contexto preservado.
  `document-material-panel.spec.ts` e seção Painel compartilhado de material.
- **E07-03** — Projeções de trânsito e distinção entre movimento e saldo
  disponível. `stock-catalogue-consumption-canonical.spec.ts` e seção Estoques e
  trânsito em telas estreitas. Entrega e devolução exercitadas no mesmo material.
- **E07-04** — Agrupamento por ato e origem individual do movimento.
  `stock-history-completeness.spec.ts`, `stock-origins.spec.ts`.
- **E07-05** — Movimentação familiar multimaterial com uma confirmação.
  `family-stock-operation.test.mjs` e seção Movimentação familiar e histórico
  geral.
- **E07-06** — Referência alterada, nova revisão e recuperação pela chave
  original. `stock-history-completeness.spec.ts`, `family-stock-operation.test.mjs`.
  Preenchimentos anteriores em `stock-private-preparation.spec.ts`.
- **E07-07** — Busca e filtros de Consumo e faltas, restauração e paginação.
  [Consulta e filtros de relatos](#consulta-e-filtros-de-relatos),
  `team-consumption.spec.ts`, `consumption-list-completeness.spec.ts`.
- **E07-08** — Seleção de materiais, extras do consumo e aviso sem quantidade.
  `team-consumption.spec.ts` e seção Material do aviso sem quantidade.
- **E07-09** — Andamentos, correção por diferença e conflito entre duas sessões.
  `team-consumption.spec.ts`, `team-consumption.test.mjs`.
- **E07-10** — Baixa direta da equipe e recuperação sem duplicação.
  `team-consumption.spec.ts`, `team-consumption.test.mjs`. A emissão usa
  as etapas de conferência, gravação e confirmação da v4. A consulta
  de resultado usa o modo simples.
- **E07-11** — Reiteração do aviso e compensação única do consumo cancelado.
  `team-consumption.spec.ts`, `team-consumption.test.mjs`.
- **E07-12** — Sugestão do WhatsApp e confirmação de consumo vinculada.
  `team-consumption.spec.ts`, `flow-preparations.test.mjs` e
  `team-consumption.test.mjs`. O caso de navegador cobre material sugerido
  sem quantidade, retomada do rascunho e confirmação recuperada com uma
  única baixa. O transporte do provedor continua fora dessa evidência.
  O contrato aceita uma mensagem por sessão e preserva seu conteúdo. Uma
  nova mensagem é outra sugestão. Resolução concorrente da sugestão
  original encerra sua disponibilidade sem baixar estoque pela segunda vez.
- **E07-13** — Falha de consulta, escopo da equipe e retirada de dados sem
  autorização. `stock-read-validation.spec.ts`,
  `consumption-list-completeness.spec.ts`. A leitura já preserva o último
  saldo válido em falhas transitórias e remove os dados em caso de recusa.
  A consulta de saldos usa o carregamento simples e o diálogo sobreposto
  da v4. Ao fechar uma falha transitória, a faixa permite atualizar a
  referência sem perder o último saldo autorizado.
- **E08-01** — Navegação integrada, agenda por dia, balanços previstos e
  histórico de contagens com filtro e retorno preservados.
  `schedule-residence-hours.spec.ts` e seção Calendário diário em Plantões e
  balanços. Histórico em `operational-history-completeness.spec.ts`.
- **E08-02** — Residência, horário noturno, exceção e recorrência sem fim
  informado. `schedule-residence-hours.spec.ts`,
  `schedule-residence-hours.test.mjs`.
- **E08-03** — Alteração com impacto no BAL, conflito e recuperação.
  `schedule-residence-hours.spec.ts`, `balance-shifts.test.mjs`.
- **E08-04** — Pedido de alteração e decisão versionada.
  `schedule-decisions.spec.ts`, `schedule-resource-preparations.test.mjs`.
- **E08-05** — Contagem por elegibilidade e pedido de autorização.
  `bal-count-permissions.spec.ts`, `bal-count-permissions.test.mjs`.
- **E08-06** — Programação semanal, observação e pausa.
  `balance-workspace-private-drafts.spec.ts` e seção Balanços previstos e
  programação semanal.
- **E08-07** — Designação do responsável e concorrência de referência.
  `balance-shifts.test.mjs` e seção Balanços previstos e programação semanal.
- **E08-08** — Pedido de adiamento, prazo vigente e ausência de destino
  elegível. `balance-shifts.spec.ts`.
- **E08-09** — Aprovação, recusa, destino alterado e manutenção do prazo
  original. `bal-deferral-decisions.spec.ts`, `bal-deferral-decisions.test.mjs`.
- **E08-10** — Contagem com extras, retomada e conclusão após o plantão.
  `balance-shifts.spec.ts`, `bal-count-admission.test.mjs`.
- **E08-11** — Revisão da contagem, emissão e regimes de aplicação.
  `bal-review-application.spec.ts`, `balance-follow-up.spec.ts`.
- **E08-12** — Revisão independente com papéis e impedimento de autorrevisão.
  `bal-review.spec.ts`, `bal-review.test.mjs`.
- **E08-13** — Aplicação, versão concorrente e recuperação da mesma decisão.
  [Carregamento e recibo da aplicação](#aplicação-da-contagem-ao-estoque),
  `bal-review-application.spec.ts`, `bal-review-application.test.mjs`.
- **E08-14** — Recontagem, sucessão de extras e contagens anteriores.
  `bal-recount-succession.spec.ts`, `bal-recount-succession.test.mjs`.
- **E09-01** — Arquivos gerados, anexos, histórico e autorização.
  `pdf-issuance.spec.ts`, `attachment-attempts.spec.ts` e seção Acervo na ficha.
- **E09-02** — Modos do PDF, período, complementos e acesso de auditoria.
  `pdf-modes.spec.ts`, `pdf-issuance-contract.test.ts`.
- **E09-03** — Geração explícita e recuperação sem trocar os bytes do exemplar.
  [Emissão e recuperação de PDF](#emissão-e-recuperação-de-pdf),
  `pdf-issuance.spec.ts`, `pdf-issuance-recovery.test.ts`.
- **E09-04** — Seleção, tamanho, formato, autoria e consulta do anexo
  confirmado. [Resultado do envio](#resultado-do-envio-de-anexo),
  `attachment-attempts.spec.ts`, `attachment-attempts.test.mjs`.
- **E09-05** — Confirmação perdida, reabertura vazia e liberação de reserva.
  `attachment-attempts.spec.ts`, `attachment-attempts.test.mjs`.
- **E09-06** — Entrada por código e QR, ausência e falha de serviço.
  `public-verification.spec.ts` e seção Verificação pública.
- **E09-07** — Arquivo divergente ou de outra emissão e evidências separadas.
  `public-verification.spec.ts`, `public-pdf-verification.test.mjs`.
- **E09-08** — Login contextual, autorização para detalhes e revogação real.
  `public-verification.spec.ts`, `public-verification-contract.test.ts`.

### Regressões de navegador em c5c409bc

- Chromium e Android falharam nos mesmos 26 casos, inclusive na retentativa.
  Os relatórios permitiram distinguir seletores anteriores ao L3 de
  regressões da interface. A execução ficou registrada no
  [GitHub Actions](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45176335374).
- A retomada do BAL abre uma categoria que contém material e mantém a
  conferência anterior exatamente como foi gravada. A revisão de uma
  compensação familiar mostra o movimento original e posiciona o foco
  para conferência por teclado. Os dois casos passaram em Android emulado.
- Os casos dirigidos também confirmaram as capacidades dos cinco perfis,
  a seleção de custódia na Administração, as abas e os atalhos das fichas,
  a consulta em trânsito e a conferência pública do PDF por código e hash.
  A chave interna do exemplar permanece restrita à consulta autorizada.
- O caso de aviso de falta acessado pelo lembrete passou em Android
  emulado com a origem preservada, um único envio e recuperação pelo
  recibo original, sem baixa de estoque. A REQ continuou exibindo seus
  dados autorizados depois de negar a consulta da ENT vinculada.
- A execução anterior de iOS recuperou na retentativa a abertura do filtro
  de relatos. Também encontrou uma falha de sobreposição na revisão da ENT
  e esgotou o tempo do primeiro shard. A causa da sobreposição segue em
  apuração.
- A lista remota de migrations coincide com o checkout. As duas novas
  versões do conjunto, `20261123130151` e `20261123131427`, já constam
  no Supabase vinculado. Os ajustes de navegador dispensam migração.

### Conferência do estoque familiar e recuperação do recibo

- Em E07-05 e E07-06, a revisão mostra Disponível e Após registrar
  lado a lado para cada material, com a quantidade do movimento e o
  motivo informado. Se o banco devolver uma referência atualizada,
  a revisão preserva os valores anteriores e exige **Usar saldo atualizado**
  antes de habilitar a confirmação. A adoção da referência deixa a decisão
  na revisão e não cria movimentação.
- A entrada avulsa mantém apenas a tentativa de envio quando falta a
  confirmação. O autor pode conferir o mesmo recibo com acesso de leitura
  ao estoque familiar, inclusive após perder a escrita. A consulta verifica
  paciente, autoria e chave exata. Para movimentar ou repetir o envio,
  o vínculo mantém as exigências de escrita e cadastro ativo. O painel
  geral mantém a consulta de Chegadas condicionada ao cadastro ativo.
- A migration `20261123142332_l3_family_stock_receipt_scope.sql` está
  aplicada nos dois ambientes. A captura completa não foi confirmada.
  O resguardo cifrado `079c9bff-98e7-4102-ad8f-3cce923b96d3` preserva
  a definição anterior da função, a autoria técnica e os grants. O ensaio
  remoto em transação reverteu a mudança antes da aplicação. A conferência
  posterior registrou 360 versões e nenhuma migration em fila.
- Passaram três integrações dirigidas com Auth real. No Android emulado,
  passaram oito casos da movimentação, dos preenchimentos antigos e da
  recontagem de BAL. O iOS emulado confirmou a revisão em 360 e 412 px,
  a recuperação de uma única operação com dois materiais e a leitura
  paginada de 102 relatos. Esses ensaios usaram o banco local.
- A atualização de vínculo indexa os cadastros anteriores pelo identificador,
  conservando a comparação dos dados recebidos do servidor. A recontagem
  de BAL, a revisão completa de ENT e a atualização em segundo plano da
  ficha passaram em iOS emulado. A recontagem reproduzia a demora na
  transição de vínculo com mais de 11 mil cadastros na stack local.

### Entregas e devoluções em trânsito

- O painel de E07-03 separa Família → Equipe e Equipe → Família. A consulta
  a partir da quantidade a receber abre apenas a direção daquele material.
  O cabeçalho do painel, a linha de percurso e os cartões seguem a v4.
  O código abre a ficha completa em Materiais, com destaque para o item e
  retorno ao botão de origem.
- Expedido e Recebido usam as quantidades da ficha. A data vem do ato de
  expedição quando disponível. Pendência física, diferença declarada e
  quantidade conciliada aparecem quando registradas. A consulta mantém
  os saldos e os atos de recebimento e satisfação existentes.
- A migration `20261123150554_l3_stock_transit_transfer_facts.sql` está
  aplicada nos dois ambientes. Preserva os campos anteriores da projeção
  e acrescenta o tipo documental, o instante de expedição e a quantidade
  declarada. O resguardo cifrado `47e8f90b-a7f6-4083-b2af-12ee426dd3c8`
  preserva a função anterior e suas permissões. O ensaio remoto foi
  revertido antes da aplicação. Local, remoto e checkout têm 361 versões.
- Passaram 27 testes de validação das projeções e quatro integrações com
  autenticação real, incluindo consulta de outro paciente, revogação e
  recebimento parcial. Os seis casos de navegador em Android e iOS
  emulados confirmaram as duas ENT e a DEV do mesmo material, o retorno
  à origem e a recuperação após falha de leitura. As capturas mostram
  os estados em 360 e 412 px.

### Regressões de navegador em 13262f65

- O banco e as validações em Ubuntu e Windows passaram. Chromium-1 e
  Android-1 passaram com 294 casos cada, sem retentativas. A execução
  está no [GitHub Actions](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45200021561).
- Chromium-2, Android-2 e iOS-2 repetiram a falha do teste que buscava o texto
  antigo do saldo. A asserção agora vincula separadamente Disponível,
  Saída e Após registrar às quantidades conferidas. Na retomada do tipo
  de plantão após perder a escrita, Chromium falhou nas duas tentativas
  e Android passou na segunda. O teste agora espera a leitura autorizada
  da revisão 3 e mantém os controles de escrita indisponíveis. Os seis
  casos desses dois fluxos passaram em Chromium, Android e iOS emulados.
- Android-2 perdeu o foco ao voltar após o conflito de programação. O
  registro mostrou o botão de revisão desabilitado durante a consulta
  de horários. O foco agora aguarda a habilitação e respeita a mudança
  deliberada para outro controle. O teste mantém a consulta pendente
  durante a volta para reproduzir a condição. Passou em Android e iOS
  emulados com as doze datas preservadas.
- iOS-1 passou com uma retentativa na captura da revisão de ENT. A
  medição passa a aguardar a posição após a rolagem, mantendo a exigência
  de que o conteúdo esteja livre da navegação fixa. O ensaio de captura
  passou em Android e iOS emulados.
- iOS-2 seguia executando casos quando alcançou o limite de 70 minutos.
  A CI passa a distribuir o mesmo conjunto de testes do iOS em três
  grupos, com relatórios separados e o mesmo limite por grupo. A coleta
  confirmou 197, 200 e 187 casos, cobrindo os 584 sem duplicação.

### CI publicada em 00e94be0

- Ubuntu, Windows e o banco passaram. Os três grupos de iOS terminaram
  dentro do limite, com 197, 200 e 187 casos na contagem total.
- Dos 1.752 casos de navegador, 1.748 passaram na primeira tentativa,
  dois passaram na retentativa e dois falharam também na retentativa.
  Chromium-2 e Android-2 falharam no mesmo caso de retomada de tipo de
  plantão após revogação de escrita. A resposta de leitura HTTP 200
  confirmou a revisão 3. A captura mostra a interface ainda consultando.
- O caso de tipo de plantão do iOS-3 passou na retentativa após encontrar
  dois controles de preenchimentos privados na primeira tentativa.
  No Chromium-1, um teste de COM passou na retentativa após o diálogo de
  erro fechar durante o clique em **Tentar novamente**.
  [Execução e artefatos](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45219839814).

### Preview publicado em 4fbdeb23

- Os commits de histórico de balanços e acervo foram publicados no
  [PR #8 em Draft](https://github.com/RMZZFAJ/home-care-assistant/pull/8).
  O [Preview desse SHA](https://home-care-assistant-kpoczkoqx-rmzzfajs-projects.vercel.app)
  ficou pronto. `/login`, `/verificar` e `/api/runtime` responderam HTTP 200.
  O runtime confirmou protocolo 1 e esquema 2. Uma consulta por código
  inexistente em `/api/verification` confirmou a resposta pública de ausência.
- Supabase, assinatura PDF e Web Push têm variáveis no escopo Preview.
  A política de confiança PDF tem uma configuração própria para a branch.
  O verificador carregou essa política e classificou um PDF sintético como
  não assinado. Emissão de PDF e entrega de notificações externas ficaram
  fora da conferência do Preview.
- A análise do SonarCloud aprovou esse SHA. O CodeRabbit pulou a revisão
  automática por contar 239 arquivos para o limite de 100 da instalação.
  [SonarCloud](https://github.com/RMZZFAJ/home-care-assistant/pull/8#issuecomment-7109843855)
  e [CodeRabbit](https://github.com/RMZZFAJ/home-care-assistant/pull/8#issuecomment-7084927300).

### Leitura privada de plantão e atualização da chegada de COM

- A reprodução local da falha de plantões mostrou duas ou três cópias do
  mesmo painel após recarregar com a escrita revogada. A agenda e a
  programação do balanço eram irmãs com a mesma chave React. Cada seção
  agora tem uma chave própria por usuário e paciente. O teste confere que
  há um único painel antes e depois de retomar a revisão autenticada em
  modo de consulta, com a escrita revogada no banco.
- Uma leitura de COM disparada em segundo plano mantém o erro da atualização
  solicitada e a versão anterior enquanto **Tentar novamente** está disponível.
  O teste força uma resposta bem-sucedida antes do clique e confere os dois
  valores, o retorno do foco e a ausência de baixas extras. Após esgotar as
  tentativas, uma leitura bem-sucedida volta a liberar a consulta normal.
- Os dois testes dirigidos passaram em Chromium, Android e iOS emulados.
  A retomada da edição de um tipo de plantão por outra sessão também passou
  nos três navegadores com o seletor compartilhado. O build de produção,
  TypeScript e as verificações dos arquivos tocados passaram. O preparo da
  COM sofreu timeout no banco local antes de abrir o navegador. A atualização
  das estatísticas de planejamento das tabelas locais permitiu repetir o
  teste com sucesso preservando os dados. Não há migration neste ajuste.

### Histórico de balanços

- Na aba **Histórico**, os cartões de E08-01 mostram código, data de
  registro, autoria da contagem vigente e situação. **Em revisão** e
  **Aplicado** correspondem ao estado da ficha. O diálogo compartilhado
  consulta situação e período, com código ou protocolo para busca específica.
  As atribuições, os atrasos, os eventos auditáveis e o histórico da agenda
  continuam acessíveis abaixo da lista de BAL.
- A consulta reutiliza a paginação autorizada de `/api/documents?type=BAL`.
  A data do filtro é a criação da ficha. A migration
  `20261123165105_l3_balance_history_count_author.sql` acrescenta o nome
  preservado do autor da contagem, sem expor o identificador do ato.
  A ausência de nome histórico é explícita. A consulta geral e a ciência
  familiar de REQ conservam o contrato anterior.
- A integração com Auth real confirmou a autoria preservada, a separação dos
  filtros de revisão e aplicação, a recusa entre pacientes e a retirada da
  ficha após revogar `bal.read`. A regressão de ciência de L1 passou.
  O resguardo cifrado `2069c8b3-8d89-4e21-9716-aa9d873da416` preserva a
  definição e os grants anteriores. A prévia remota selecionou somente esta
  migration. O ensaio confirmou os grants e foi revertido antes da aplicação.
  O remoto conservou a consulta restrita ao papel autenticado. As 362 versões
  conferem com o banco local e com a cadeia do checkout.
- O teste dirigido passou em Chromium, Android e iOS emulados. Exercitou
  o diálogo por teclado, a separação dos registros pelo filtro **Aplicado**,
  o período sem resultado, a limpeza e o retorno da ficha com o filtro
  ativo. Foram comparados os cartões do produto e da v4 em 360 e 412 px.
  O ensaio usa uma conta fictícia com vínculo único para chegar ao histórico
  após o login. O ensaio final em WebKit confirmou também o destino de
  retorno com a página preservada quando o histórico abre por link da agenda.

### Cartões e identificação dos arquivos da ficha

- Gerados e Anexos compartilham a composição de E09-01 e E09-04. Os cartões
  apresentam o formato, o título e o menu no topo, seguidos pela autoria,
  pela data e pelas ações. O mesmo acervo distingue **Atual**, **Conteúdo
  anterior**, **Consolidado** e as emissões ainda em preparação ou a confirmar.
  O rótulo de consolidado depende do identificador registrado no arquivamento.
- Visualizar e baixar apontam para a emissão da linha. O menu abre a
  identificação do exemplar, com a mesma visualização, compartilhamento,
  dados da emissão e código de verificação. O cartão de recuperação do PDF
  inicial continua disponível para o processo correspondente.
- O diálogo Gerar PDF de E09-02 mantém as ações no rodapé e rola o conteúdo
  internamente. Os dois campos do período se empilham na largura estreita.
  Os contratos de modalidade, autorização, emissão e recuperação continuam
  cobertos por 11 testes de unidade e API. Esta mudança dispensa migração.
- Chromium, Android e iOS emulados passaram na comparação dos cartões em
  360 e 412 px. O teste confirmou o mesmo hash na visualização, no download
  e no arquivo passado à folha de compartilhamento simulada, além da
  preservação do número de emissões. Arquivamento de ENT e seleção de período
  da doação também passaram nos três navegadores.

### Falha de consulta em Arquivos

- Gerados e Anexos usam o mesmo diálogo da consulta de acervo. Na aba
  Anexos, a recusa esconde a lista e abre **Acesso indisponível**. Uma falha
  de consulta abre a recuperação na aba ativa e mantém o aviso ao fechar.
  Voltar restaura o foco para o botão de atualização.
- O diálogo segue o resultado de falha da v4 e oferece duas tentativas
  na mesma abertura. Em erro persistente, mostra o diagnóstico copiável
  com código, referência e tentativas. Um novo acionamento no acervo é
  uma consulta independente. As ações de envio e o banco continuam com
  as versões já aplicadas.
- Os seis casos dirigidos passaram em Chromium, Android e iOS emulados
  com o diagnóstico e as retentativas. O teste confirmou ausência de
  comandos de escrita, preservação do anexo e escolha vazia na reabertura.
  A rodada anterior confirmou a recuperação de upload e a revogação real.
  As comparações em 360 e 412 px ficaram em `output/playwright/l3/`.

### Falha de consulta no estoque

- E07-13 usa o carregamento simples para a leitura inicial e a atualização
  solicitada. O diálogo de falha compartilha o padrão de Arquivos e permite
  consultar novamente, voltar ao estoque ou copiar o diagnóstico após duas
  retentativas. Voltar devolve o foco para **Atualizar saldos**.
- Uma falha de transporte ou resposta inválida mantém a última leitura
  válida da mesma custódia. A faixa compacta oferece uma nova consulta.
  Uma recusa retira os saldos e a data da consulta anterior. O histórico
  mantém seu próprio estado de leitura. Não há migration neste ajuste.
- Os quinze casos dirigidos passaram em Chromium, Android e iOS emulados,
  incluindo os dois consumidores de Arquivos. A espera controlada comprovou
  o carregamento simples. Falha, duas retentativas, diagnóstico e recusa
  preservaram o estoque oficial sem escritas. As capturas do laboratório e
  do produto em 360 e 412 px estão em `output/playwright/l3/`.

### Emissão e recuperação do consumo

- E07-10 usa o carregamento dinâmico compartilhado. A conferência prepara
  as quantidades e o rascunho, a atualização acompanha a transação oficial
  e a conclusão acompanha a leitura autorizada do relato após o recibo.
- A confirmação mostra a referência curta do relato e a data do recibo.
  Essa referência segue a mesma composição da ficha. Se a leitura adicional
  falhar, o recibo oficial ainda comprova a baixa e o resultado pode ser
  concluído para abrir a ficha. A consulta de resultado incerto recupera
  a mesma chave no modo simples. O diálogo mantém o retorno ao assistente
  e o suporte ao esgotar as retentativas.
- Nove casos em Chromium, Android e iOS emulados confirmaram a gravação,
  as fases da emissão e a baixa única. O ensaio segurou o POST antes da
  gravação e a leitura do relato após o recibo, com consultas reais em
  ambos os pontos. Também confirmou o identificador da emissão recuperada
  e o resultado preservado quando a leitura do código devolve 503.
  A primeira rodada revelou que a API de detalhe entrega o identificador
  completo sem o campo de código curto. A apresentação passou a usar a
  mesma função da ficha. As capturas em 360 e 412 px estão em
  `output/playwright/l3/`. O ajuste dispensa migration.

### Aplicação da contagem ao estoque

- A ficha distingue os estados **Em revisão**, **Pronto para aplicar** e
  **Aplicado**. A referência alterada, a diferença sem aplicação e a
  recontagem aguardada mantêm seus próprios avisos. A faixa compacta
  durante a rolagem usa o mesmo estado do cabeçalho. Quinze testes
  unitários passaram e a transição de pronto para aplicado passou em
  Chromium e iOS emulados com o recibo real.
- E08-13 mostra os saldos de referência e os valores previstos para o
  estoque da equipe antes da confirmação. O primeiro ajuste aparece no
  diálogo. Os demais ficam na expansão da mesma conferência. A versão da
  contagem, o grupo responsável e o controle de referência permanecem no ato.
- O carregamento dinâmico acompanha a conferência, a transação do ajuste e
  a consulta do mesmo recibo. Durante a gravação aparece somente o
  carregamento sobre a ficha. O resultado confirmado identifica a ficha,
  a contagem e a autoria. A recuperação consulta a chave preservada em modo
  simples e mantém as opções de nova consulta e diagnóstico de suporte.
- A confirmação por POST validada pode comprovar o ato se a consulta
  adicional tiver falha de transporte ou indisponibilidade. A recusa dessa
  consulta ou a divergência entre os resultados preserva a tentativa.
  O ajuste usa os contratos existentes e dispensa migration.
- Se o estoque ou a versão mudar durante a confirmação, a recusa da
  transação encerra aquela tentativa. A mensagem informa que ela não
  registrou ajuste e leva à ficha atual. A verificação com uma entrega
  durante a confirmação preservou o estoque da entrega, exibiu a referência
  alterada e retirou a opção de aplicar a contagem antiga. A última rodada
  de seis casos em Chromium e iOS emulados incluiu essa recusa, a aplicação
  normal e a recuperação de resposta perdida em ambos.
- No iOS emulado, a gravação retida mostrou somente o carregamento sobre a
  ficha e o estoque preservado até o POST. A perda da resposta recuperou
  o ato com o direito de leitura após revogar a aprovação familiar. A
  conclusão normal aguardou o mesmo recibo. Ambos os casos verificaram
  um único ajuste. As capturas do produto e do laboratório em 360 e 412 px
  estão em `output/playwright/l3/`.
- A primeira verificação local do reconto parou na preparação da escala,
  com timeout do banco antes de abrir a ficha. O reconto completo e a
  consulta do regime opcional passaram na rodada dirigida seguinte no iOS
  emulado. O retorno da aba Contagens para Visão geral foi acionado pelo
  teclado nessa consulta e conferiu a seleção da aba antes de atualizar.

### CI de e349a92d

- A [execução 45242608953](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45242608953)
  passou em Windows, Ubuntu e banco. Os dois grupos Chromium, os dois Mobile
  e iOS-2 e iOS-3 passaram sem retentativas. No [iOS-1](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45242608953/job/137951344714),
  a nova avaliação da REQ falhou nas duas execuções: o campo de justificativa
  ficou vazio ao reabrir o diálogo e o botão seguiu desabilitado. A recuperação
  do PDF da ENT passou na retentativa. A primeira execução contou duas consultas
  em vez de uma.
- O teste da REQ passou a aguardar o foco inicial do diálogo e a conferir
  a justificativa antes de confirmar. O da ENT verifica a resposta autorizada
  do mesmo pedido de PDF, um único POST de geração e um único exemplar
  persistido. Esses critérios independem do número de leituras do navegador.
  Os dois testes corrigidos passaram localmente no iOS emulado.

### Preview de eaabb177

- Cinco commits foram publicados em `feat/phase-d-continuation` no
  [PR 8 em rascunho](https://github.com/RMZZFAJ/home-care-assistant/pull/8).
  O [deploy do commit](https://vercel.com/rmzzfajs-projects/home-care-assistant/6m1EwEXP9bMHkHGvyYFjBPsSRUFg)
  respondeu com HTTP 200 em `/login`, `/verificar` e `/api/runtime`.
  O último confirmou protocolo 1 e esquema 2. O envio de um PDF sintético
  sem assinatura devolveu análise de arquivo sem assinatura.
- O escopo Preview contém a configuração do Supabase, assinatura e
  confiança de PDF e Web Push. As 362 migrations locais correspondem às
  362 versões registradas no remoto. O commit não adiciona migrations.
  O SonarCloud passou e o CodeRabbit pulou a revisão automática pelo
  limite de arquivos. A [CI do commit](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45260446990)
  concluiu com sucesso. Os sete grupos de navegador aprovaram 1.758 casos,
  incluindo duas aprovações em retentativa. Os casos de primeira tentativa
  foram a abertura de **Avisos e aplicativo** no iOS-3 e a revisão de
  proposta obsoleta da escala no Chromium-2. O iOS-1 aprovou 198 casos
  sem retentativa, inclusive os dois casos corrigidos no commit.

### Resultado do envio de anexo

- E09-04 e E09-05 usam **Anexo disponível** quando o servidor confirma
  o envio ou a recuperação da mesma tentativa. **Concluir** volta aos
  anexos e restaura o foco para a próxima ação. A nova abertura começa
  com seleção vazia. A falha ou a incerteza segue na janela do envio,
  com o arquivo preservado até o usuário fechar ou confirmar o resultado.
- Nove casos dirigidos passaram em Chromium, Android e iOS emulados.
  Eles verificaram a gravação, o recibo recuperado sem novo upload, o
  arquivo e sua autoria no acervo, a recusa de acesso e a navegação sem
  nova emissão. As capturas do resultado em 360 e 412 px estão em
  `output/playwright/l3/`. O ajuste dispensa migration.

### Consulta e filtros de relatos

- Consumo e faltas usa o carregamento simples ao abrir, buscar ou atualizar
  a lista. A atualização em segundo plano continua sem sobreposição enquanto
  a pessoa consulta um relato ou preenche um formulário. A falha da consulta
  abre o diálogo compartilhado com retorno, nova consulta e diagnóstico
  copiável depois de duas tentativas.
- O modal **Filtrar registros** segue a v4. Os campos de data do produto
  permanecem disponíveis e as ações ficam no rodapé. A paginação e a busca
  continuam no servidor. Uma nova consulta invalida respostas atrasadas;
  uma recusa remove os relatos da consulta recusada.
- Nos três navegadores, os casos dirigidos conferiram as 102 identidades
  paginadas, a recuperação com a lista vazia ou preenchida, a autorização
  real de custódia e o retorno de foco e filtros. A transparência da consulta
  em segundo plano também permitiu ignorar uma paginação atrasada após
  mudar a busca. A comparação em 360 e 412 px está em `output/playwright/l3/`.

### Preview de 59ab89f2

- Os quatro commits de anexo, balanço e consumo foram publicados no
  [PR 8 em rascunho](https://github.com/RMZZFAJ/home-care-assistant/pull/8).
  O [Preview do commit](https://vercel.com/rmzzfajs-projects/home-care-assistant/6yegd2v6JZEp97wCN4Sey6DiibS9)
  respondeu com HTTP 200 em `/login`, `/verificar` e `/api/runtime`. A
  compatibilidade com o Supabase retornou protocolo 1 e esquema 2.
  A verificação pública analisou um PDF de demonstração e confirmou
  a ausência de assinatura e de registro oficial para a amostra.
- A Vercel listou as variáveis de Supabase, PDF e Web Push no escopo Preview,
  com política de confiança de PDF específica desta branch. A conferência
  usou metadados das variáveis. O incremento dispensa migrations.
- O SonarCloud passou. O CodeRabbit pulou a revisão automática pelo limite
  de 100 arquivos, com 362 arquivos alterados no PR na conferência.
  A [CI deste commit](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45274012944)
  passou nas validações de Ubuntu e Windows, na instalação limpa e no
  job de banco com 876 testes de integração. Os sete grupos de navegador
  aprovaram os 1.761 casos na primeira tentativa.

### Emissão e recuperação de PDF

- **Preparando o PDF** acompanha a emissão até a validação da resposta.
  A recuperação da mesma solicitação usa **Consultando a solicitação** e
  **Confirmando o exemplar registrado**. A espera do cliente cobre o limite
  de execução do endpoint de emissão.
- **Emissão ainda não confirmada** oferece a consulta da referência
  preservada. Depois de duas falhas de recuperação, **Não foi possível
  concluir a emissão** orienta a copiar o diagnóstico para suporte. Voltar
  mantém a ação de recuperar a mesma emissão no acervo, inclusive após
  recarregar a página.
- **Exemplar disponível** e **Exemplar recuperado** aparecem quando o
  retorno valida solicitante, ficha, modalidade, revisão e registro do
  exemplar. O diálogo mostra a ficha, a modalidade e a revisão e retorna o
  foco aos arquivos. A emissão inicial continua com o fluxo próprio.
- A jornada dirigida verifica a confirmação perdida depois da gravação,
  as duas falhas de consulta, a restauração após recarregar, os bytes do
  mesmo exemplar e a chave distinta de uma emissão nova. Seis testes
  unitários de recuperação passaram. O incremento dispensa migrations.
- As comparações em 360 e 412 px estão em `output/playwright/l3/`. O painel
  de confirmação reúne os metadados no cartão da v4. Os rótulos do cartão
  usam contraste suficiente para leitura no fundo tonalizado.
- A rodada em Chromium, Android e iOS emulados também verificou as cinco
  fichas em modo ampliado, o período explícito da doação, a perda de acesso
  ao PDF de auditoria e o conteúdo recusado antes da assinatura. O teste de
  PDF lento confirmou que o prazo de acompanhamento de avisos termina sem
  interromper a emissão.

### Retentativas de PWA e revisão de escala

- O teste do PWA estabiliza a faixa de abas antes de usar toque no iOS.
  O Chromium ativa a revisão da escala pelo botão com o formulário pronto.
  Em ambos os casos a confirmação continua exigida em tela.
- Os casos dirigidos passaram nos três navegadores. A verificação de PWA
  manteve o fallback público, a ausência de cache privado e a volta à ficha.
  A revisão confirmou a proposta retomada em outra sessão e conferiu o
  efeito no banco depois da decisão explícita.
- O cenário de abas do Perfil excedeu o tempo local na análise de
  acessibilidade e na troca de foco entre contextos em WebKit. A verificação
  passou nos três navegadores com uma conta de vínculo único e com a página
  de referência encerrada antes da interação e da análise do produto. Os
  cinco tamanhos, a navegação por teclado e os controles de ausência de
  gravação foram conferidos.

### Entrada na agenda pelo adiamento do BAL

- A [CI de aed71937](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45286989830)
  aprovou 876 integrações e seis grupos de navegador. O iOS-1 falhou nas
  duas tentativas ao abrir **Ver agenda** a partir do adiamento. O navegador
  já marcava dia 24 em UTC enquanto o plantão do balanço ainda estava no
  dia 23 no fuso da programação do paciente.
- O link da agenda leva o dia da atribuição no fuso do balanço, preservando
  o paciente e o contexto de calendário. O teste verifica o dia no link e
  na agenda, a atribuição, os adiamentos e a ausência de gravação.
- Nesse mesmo grupo, a compra mista e a abertura do filtro de consumo
  passaram na retentativa. O relay de teste repete a mesma requisição com
  chave de idempotência se a conexão for reiniciada. O toque no filtro
  aguarda o fim da sobreposição de consulta e a posição do botão.
- As verificações dirigidas passaram em Chromium, Android e iOS emulados.
  A repetição da agenda no WebKit confirmou a URL, a data exibida e a
  ausência de alterações na atribuição e nos adiamentos. Este incremento
  dispensa migrations.

## L4

O comando mestre v2 e o laboratório v2 são as referências aprovadas
de E10–E12. O HTML foi preservado na raiz, com SHA-256
`6db3ae8c3c4f01914d4c80c1227cbe38c72bd2353e380ee87312b412a9efbdb9`,
e excluído da análise do SonarCloud pelo nome exato, como em L2 e L3.
Os 180 estados dos 27 cenários renderizaram nas larguras de 360 e
412 px ao percorrer o laboratório offline. O aceite no produto requer
comparações das superfícies com os dados e contratos reais.

### Publicação e ambientes no início de L4

- A branch `feat/phase-d-continuation` inicia L4 em `1ba95e4c`, no
  [PR #8 em rascunho](https://github.com/RMZZFAJ/home-care-assistant/pull/8).
  A [CI desse commit](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45300111307)
  e o SonarCloud passaram. O CodeRabbit encerrou a revisão automática ao
  identificar 261 arquivos para um limite de 100.
- O [Preview desse commit](https://vercel.com/rmzzfajs-projects/home-care-assistant/8jqcV7wupPNyoXWugwGrkSo2cixJ)
  ficou pronto. A Vercel confirmou as variáveis de aplicação, Supabase,
  assinatura de PDF, worker e Web Push no escopo de Preview, incluindo a
  política de confiança de PDF da branch. O login e o endpoint
  `/api/runtime` responderam HTTP 200. O contrato retornou `ready`,
  protocolo 1 e esquema 2. A conferência de configuração e conectividade
  dispensou alteração de variáveis ou redeploy.
- Os bundles públicos de Preview e Produção apontam para o mesmo projeto
  Supabase. A produção está em `fab595c7` e o Supabase remoto registrava
  362 migrations. Antes de aplicar mudanças de contrato, conferir os dois
  consumidores. Na conferência inicial, L4 ainda aguardava sua primeira
  migration.
- O commit `b95c3872` publicou as referências de L4 no PR em rascunho.
  O [Preview](https://home-care-assistant-kq38wexfx-rmzzfajs-projects.vercel.app)
  respondeu HTTP 200 no login, na verificação pública e em `/api/runtime`,
  com contrato `ready`, protocolo 1 e esquema 2. O SonarCloud aprovou
  esse commit. O CodeRabbit pulou a revisão com 265 arquivos para o
  limite de 100. A [CI do commit](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45320276465)
  estava em execução na conferência do Preview.

### E10-04 — Matriz de perfis e consulta individual

- A matriz usa todas as definições do banco, com busca, agrupamento e as
  cinco colunas. O cabeçalho e a coluna de nomes ficam fixos na área de
  rolagem da tabela. A visão individual usa lista compacta por área.
- Cada linha pessoal mostra o resultado efetivo e a origem para o vínculo
  real. A API exige paciente e pessoa explícitos, valida o resultado por
  escopo e protege a resposta contra cache. A RPC usa o cálculo atual das
  capacidades, com administração local ou global ativa e vínculo vigente.
- As configurações admitidas pelo contrato atual abrem edição e revisão
  antes do envio. O comando guarda a versão examinada. A consulta de
  alterações leva à lista de propostas de governança filtrada por capacidade.
- A revisão individual informa quando o acesso ultrapassa a função e
  pede confirmação antes do envio. Concessão, restrição e herança de
  `access.manage` mostram o alcance crítico. A alteração vale para a pessoa
  no contexto da residência e a configuração coletiva mantém sua elegibilidade.
- O mesmo cálculo sustenta a matriz, a autorização da sessão, a API e a
  leitura das fichas por RLS. A retirada revoga a capacidade. A alteração
  e seu registro de auditoria são transacionais, com autor, alvo, capacidade
  e antes/depois efetivos. Administração preserva a sessão exigida, a
  decisão local independente e a proteção contra autoelevação.
- A conferência explícita de chegadas COM, o acesso a chegadas sem vínculo,
  o acompanhamento administrativo das fichas e as verificações de
  regularização ENT passaram a respeitar as capacidades individuais.
  A confirmação de outra pessoa e a atribuição física preservam suas regras.

| Migration | Supabase local | Supabase remoto |
| --- | --- | --- |
| `20261124083708_l4_person_permission_snapshot` | Aplicada | Pendente |
| `20261124091649_l4_personal_permission_exceptions` | Aplicada | Pendente |
| `20261124092143` — consumidores operacionais | Aplicada | Pendente |
| `20261124093850` — balanço e consumo | Aplicada | Pendente |

Os nove casos de integração de governança passaram no Supabase local. O
caso novo comparou todas as capacidades da pessoa às usadas pelo banco e
conferiu origem, versão, papel, escopo, revogação e concessões de execução.
O Supabase local registrou 367 migrations e o remoto registrou 362. O Advisor
local não listou alertas ligados à leitura individual.

A primeira rodada dirigida passou em seis testes de navegador. O caso de
E10-04 comparou produto e laboratório em 360 e 412 px nos três navegadores.
O fechamento da revisão preservou a política. A confirmação enviou a versão
consultada e a leitura individual refletiu a configuração salva. As capturas
revelaram sobreposição no ícone de pesquisa e diferença na ordem das áreas.
Os dois ajustes passaram em Chromium, Android e iOS. As 48 definições
atuais também foram conferidas contra os rótulos da v2, com nova execução
dirigida no Chromium após completar os nove rótulos ausentes.

A rodada de exceções validou concessão e retirada, acesso entre residências,
autoelevação, concorrência e aprovação local distinta da proposta global.
Com Auth real, a pessoa delegada conferiu uma chegada COM e outra revisou
uma regularização ENT sem substituir o recebedor original. A leitura do
estoque familiar passou por RLS. A escrita usou a operação oficial e voltou
a ser negada após herdar a regra da função. O teste Android emulado passou
sem retentativa e verificou a marcação explícita e o histórico exibido.
O build, o lint dos arquivos alterados e o contrato das 84 migrations
históricas passaram. O Advisor local apontou somente a extensão
`unaccent` no esquema público, já existente antes desta rodada.

Em Balanço, a concessão individual permite emitir contagem facultativa.
O regime programado exige plantão válido, prazo, versão e atribuição da
própria pessoa. O revisor delegado pode decidir o adiamento de outra pessoa;
o autor do pedido segue sujeito à revisão independente. Programação,
projeções e controles de decisão usam as capacidades vigentes.

Em Consumo, a leitura coletiva de estoque familiar preserva somente a
visibilidade. Para relatar nessa custódia fora das funções de família e
administração, a pessoa precisa da confirmação individual em
`consumption.report` e de leitura vigente do estoque familiar. A interface
segue o alcance devolvido pelo banco. O histórico distingue o efeito nessa
custódia da capacidade geral, que pode manter relatos na equipe. A baixa
de consumo de L3 e a correção exigem as capacidades próprias, leitura da
equipe e referência autorizada. Um relato de falta preserva o ledger.

Os oito casos dirigidos com Auth real passaram, incluindo contagem
facultativa, tentativa fora da atribuição, adiamento por outra pessoa,
perda de permissão, relato familiar, registro e correção de consumo da
equipe e vínculo da sugestão do WhatsApp à própria baixa de L3.
Após explicitar o efeito na custódia no histórico, três casos de integração
passaram novamente, incluindo a recusa de autoelevação. Os três testes no
Android emulado passaram sem retentativa. Eles conferiram a entrada da
contagem facultativa, a opção de custódia na criação de um relato e a
confirmação de uma concessão antiga com o efeito exibido no histórico.

### E11-01 — Identificação e foto da conta

- **Minha conta** mostra a identificação profissional declarada, os vínculos e
  as ações de foto e apresentação. A consulta depende da identidade autenticada
  e funciona sem selecionar um paciente. Os dados profissionais continuam
  disponíveis à conferência familiar versionada.
- **Editar identificação** usa um diálogo de preenchimento com validação no
  campo e resultado compartilhado. Se a resposta chegar incompleta, a consulta
  compara os valores atuais da conta com o envio. O preenchimento fica nesta
  aba até a pessoa cancelar. A confirmação e o retorno de rede preservam o
  bloqueio de acesso quando a sessão é revogada.
- **Minha foto** valida a imagem, oferece a prévia local e exige confirmação
  para enviar. A mesma tentativa pode ser consultada até duas vezes e tem
  detalhes copiáveis se a falha persistir. Uma seleção antiga encontra a foto
  vigente e mostra o conflito. A associação confirmada continua sendo sucesso
  quando a limpeza de arquivos anteriores fica pendente.
- A apresentação do início e os contatos abrem pela seção
  **Acesso e apresentação**.

O laboratório v2 foi conferido em 360 e 412 px. As capturas do produto e a
auditoria em 320 px identificaram um e-mail longo que ultrapassava o cartão.
O texto passou a quebrar dentro da largura do cartão. Os cinco testes unitários
do contrato de foto passaram. As verificações dirigidas em Android e iOS
cobriram a confirmação de um salvamento cuja resposta foi perdida, o conflito
por edição concorrente, o bloqueio após revogação real e a preservação da
edição durante a recuperação de uma falha de leitura. Esta etapa usa as APIs
e o esquema existentes.

### E11-02 — Contatos e métodos de acesso

**Contatos de acesso** abre o mesmo painel em Minha conta e Segurança.
O endereço confirmado aparece ao lado da solicitação pendente que o Auth
devolve. O telefone só ganha o estado confirmado depois da verificação e
da associação do número à conta. A consulta de disponibilidade do SMS não
envia código. A tentativa de vincular Google passa pelo provedor configurado
e retorna à entrada da aplicação para respeitar a verificação adicional.

Em sessão antiga, o diálogo confirma a senha da conta elegível. A sessão
nova mantém o contexto validado no banco. Quando há fator verificado ou a
conta depende de provedor externo, a interface encaminha para a entrada
completa. Senha e código ficam nos controles temporários da aba durante o
preenchimento. Uma resposta perdida de contato pode ser conferida até duas
vezes pelo estado do Auth. A recuperação do telefone confere a confirmação
do número no Auth e conclui a associação quando ela ainda estiver pendente.

O laboratório foi comparado em 360 e 412 px. A integração usa o Auth
existente. Quatro casos em Android e iOS emulados passaram sem retentativa.
Eles verificaram senha incorreta e correta em sessão antiga, preservação do
vínculo, resposta perdida recuperada sem reenvio, os dois links de e-mail
capturados no serviço local e os estados reais de Google e SMS desligados.
O primeiro link preservou o endereço atual e o segundo ativou o novo.
Cadastro, aceite e recuperação de senha também passaram nos dois projetos.
SMS e OAuth habilitados precisam de teste com os provedores configurados.
Esta etapa não tem migration.

### E11-03 — Senha, autenticador e sessões da conta

**Segurança** organiza Acesso, Proteção adicional e Sessões. A senha é
editada em diálogo com a senha atual, o campo compartilhado de L1 e a
repetição da nova senha. A confirmação da senha atual não troca a sessão
da pessoa. Com MFA ativo, o servidor exige AAL2 e aplica a mudança na
sessão original.

O painel de autenticação diferencia cadastro preparado, código rejeitado,
fator ativo e sessão que ainda precisa de confirmação. O QR pertence ao
cadastro em curso. Um cadastro interrompido pode ser descartado. A remoção
exige código atual e confirmação explícita do método selecionado.

O painel de sessões identifica a sessão atual e separa as demais. A
confirmação usa o encerramento real do Auth. Quando a resposta é perdida,
até duas consultas conferem as sessões daquela solicitação. As credenciais
já emitidas preservam o prazo do serviço. Esta etapa não tem migration.

As capturas em 360 e 412 px foram comparadas com a v2. A interface conserva
a identificação técnica do navegador em um detalhe expansível do painel.
Oito casos em Android e iOS emulados passaram sem retentativas na rodada
final, cobrindo também a navegação do Perfil e a recuperação de leitura.
Com Auth real, a troca de senha manteve o ID da sessão, seu AAL2 e o vínculo.
Uma sessão AAL1 teve a troca de senha e a revogação de outros acessos
recusadas. Uma resposta perdida ao verificar o código deixou o fator
intacto até nova confirmação. A recuperação de encerramento conferiu o
resultado sem reenviar. O código inválido conservou o fator não verificado.

### E11-04 — Autorização dos avisos ao consultar e abrir

A central, o sino e a visão geral consultam somente avisos do destinatário
no vínculo selecionado. A política do Supabase confere a leitura da ficha,
requisição antiga, estoque de origem, relato, escala ou balanço do aviso.
O recorte é aplicado antes da paginação, do total e da contagem do sino.

O painel abre após consultar o aviso por ID. O botão de destino consulta a
autorização outra vez. Se o acesso mudou, o painel retira o conteúdo e
oferece voltar à lista atualizada. Consultar o painel é uma leitura. O sino
marca como vista ao abrir o destino por escolha da pessoa. Ciência, aceite,
estoque e conclusão de tarefas seguem seus próprios atos.

| Migration | Local | Remoto |
| --- | --- | --- |
| `20261124095525_l4_inbox_destination_authority` | Aplicada | Pendente |

O banco local tem 371 versões. O Supabase compartilhado tem 362 versões e
ainda aguarda a transição de contrato de E12-06. O Preview publicado em
`a08742dc` respondeu ao login e a `/api/runtime` com HTTP 200. A consulta
técnica sem sessão respondeu 401. O Sonar aprovou esse commit. O CodeRabbit
informou que pulou a PR com 274 arquivos para um limite de 100.

A integração com Auth real passou para estoque, consumo, escala e balanço.
Sete cenários móveis passaram. Os casos de abertura explícita e revogação
depois da listagem também passaram no Chromium móvel e no WebKit de iPhone
após o ajuste que limpa a contagem antiga do sino. As execuções dirigidas
usaram zero retentativas. O Advisor local retornou o aviso já registrado
sobre a extensão `unaccent` no esquema público.

### E11-04 — Central com busca, filtros e ações da ficha

A central segue a ordem do laboratório v2 com resumo, busca, filtros de
estado, tipo de ficha em diálogo, hora da consulta e lista de avisos. A busca
combina referência, autoria e descrição do evento. O filtro “Com ação” usa
ciência de REQ, conferência de ENT/DEV, aprovação de COM e revisão de BAL
enquanto a pessoa ainda puder praticar o ato na ficha. Abrir ou marcar um aviso
como visto mantém essas pendências independentes.

COM e a devolução sob ENT entram no seletor porque são destinos reais do
produto. Avisos de estoque, escala e outros eventos continuam em “Todos”.
O diálogo de falha distingue uma consulta anterior da falha atual e oferece
nova consulta. Os três totais e a página vêm do recorte autorizado no banco.
A comparação em 360 e 412 px manteve “Avisos” e a identificação do paciente
no topo. O sino compartilhado continua no cabeçalho do sistema. A consulta
de atrasos e recuperação foi posicionada depois da lista. O espaçamento da
lupa foi conferido no campo real.

| Migration | Local | Remoto |
| --- | --- | --- |
| `20261124101715_l4_inbox_search_and_tasks` | Aplicada | Pendente |

O banco local tem 372 versões. A integração com Auth real confirmou busca,
filtro, ciência independente de visto e revisão de balanço por outra pessoa.
Os seis cenários finais de avisos, ocorrências e recuperação passaram em
Chromium móvel e WebKit no perfil iPhone. Um timeout de login apareceu em
rodada anterior e o cenário passou nas reexecuções dirigidas sem retry.
As capturas de 360 e 412 px estão em `output/playwright/l4-inbox/`.

### E11-05 — Preferências pessoais, consentimento e resultado

Os canais ficam em Avisos e aplicativo, em painel próprio, e usam a versão
atual da conta. Salvar a identidade pessoal preserva os canais. Preferências
existentes mantêm efeito no envio segundo a política e o contato verificado.

O painel de ciência oferece manual, diálogo e tácita. A confirmação de
diálogo ou tácita pede consentimento expresso. Regras, elegibilidade e
registros anteriores continuam sob os contratos das requisições. Um conflito
fecha a edição anterior e consulta a versão atual. Uma gravação incerta
oferece duas consultas do mesmo identificador e depois os dados de suporte.
O cliente consulta o comprovante do titular com GET em vez de reenviar o POST.

A apresentação do início usa a escolha do aparelho. No modo simples, avisos,
escala e movimentações complementares começam recolhidos. Tarefas e alertas
de estoque conservam a exposição já definida para o perfil.

| Migration | Local | Remoto |
| --- | --- | --- |
| `20261124105211_l4_personal_notice_preferences` | Aplicada | Pendente |

A integração com Auth real cobriu oito casos. Canais concorrentes foram
serializados pela versão, o comprovante ficou restrito ao titular e ciência
tácita continuou vinculada à emissão e ao consentimento anterior.
O banco local registrou 373 migrations. A migration deste incremento aguarda
a atualização do banco remoto junto aos demais contratos pendentes.

Quatro testes dirigidos de canais e ciência passaram sem retentativas em
Android e iOS emulados. Conferiram a abertura da versão atual após conflito,
a recuperação sem novo POST e a mudança de apresentação do início. As
capturas de canais em 360 e 412 px ficam em `output/playwright/l4-preferences/`.
O painel segue os interruptores e o rodapé da v2 e usa o cabeçalho e o
indicador de foco compartilhados da aplicação.

A apresentação final do sino e os estados de aparelhos continuam em execução.

### E11 — Teste pessoal de avisos (§10.2)

- O teste só inicia por ação explícita em aparelho elegível. A espera mostra
  o limite de 30 segundos. Se o resultado continuar incerto, o diálogo
  oferece até duas consultas da mesma chave e depois detalhes para suporte.
- A aba guarda somente a referência e o número de consultas. O GET fica
  restrito à sessão responsável, inclusive quando o envio está indisponível.
  Ele deixa a tentativa e os registros de operação intactos. A saída da
  conta limpa a referência local com o restante do estado privado da aba.
- O banco conserva o resultado tardio e observa o intervalo informado pelo
  serviço. A expiração só atinge a inscrição usada pela tentativa, quando
  o consentimento permanece vigente. O aceite descreve a resposta do
  serviço e orienta conferir se o aviso apareceu no aparelho.
- A espera e o resultado usam o diálogo compartilhado. O acesso ainda fica
  na seção Avisos neste aparelho. O painel completo de aparelhos e a
  apresentação das demais condições de Push seguem em §10.1.

| Migration | Local | Remoto |
| --- | --- | --- |
| `20261124112554_l4_push_test_receipt` | Aplicada | Pendente |

O Supabase local registrou 374 migrations. Passaram 20 testes unitários de
Push e 11 testes de integração com Auth real. A integração comprovou a
leitura sem reserva, o isolamento por conta e sessão, a resposta tardia
após 31 segundos, a limitação do provedor após o minuto local e a
preservação de um consentimento renovado. O Advisor manteve apenas o aviso
anterior para a extensão `unaccent`.

A rodada final passou nos quatro cenários dirigidos em Android e iOS
emulados, sem retentativas. Verificou o prazo, as duas consultas, a recarga
da aba e um intervalo de 95 segundos. A regressão de consentimento também
passou nos dois navegadores e a leitura por HTTP funcionou com envio
desabilitado. A simulação do teste no navegador mantém o transporte externo
desligado. As capturas e a comparação de 360 e 412 px ficam em
`output/playwright/l4-push-test/`. O prazo usa a estrutura de erro da v2
com o ícone compartilhado de resultado incerto. A espera ainda está em
diálogo. Na v2, ela aparece dentro do painel deste aparelho.

### E11-06 e E11-07 — Ativação, aparelhos e teste pessoal

- **Avisos do aplicativo** abre o painel do aparelho. A situação distingue
  suporte, permissão nativa, vínculo da inscrição com a sessão, serviço
  indisponível e pausa. A confirmação da ativação pede consentimento antes
  de abrir a permissão do navegador. A negativa oferece instruções e uma
  consulta da permissão.
- A aba **Dispositivos** abre o detalhe de cada inscrição. O painel usa
  o nome e a data registrados pelo sistema. Os exemplos de navegador no
  laboratório ilustram metadados que o contrato de aparelhos não coleta.
- O aparelho atual permite editar o nome e testar a inscrição elegível.
  A barra de espera fica no painel do aparelho, como em E11-07. O aviso
  de prazo e os resultados usam os diálogos compartilhados. **Salvar nome**
  grava a alteração e abre o resultado. Pausa, retomada e revogação têm
  confirmação explícita.
- As operações mantêm comprovante restrito à conta e à sessão de origem.
  Uma resposta perdida pode ser consultada duas vezes pelo mesmo
  identificador. A versão da inscrição protege a ação confirmada em outra
  sessão. A alteração do nome mantém a inscrição, sua fila e o consentimento.

| Migration | Local | Remoto |
| --- | --- | --- |
| `20261124115540_l4_push_device_commands` | Aplicada | Pendente |

O Supabase local registrou 375 migrations. Passaram 12 testes de integração
com Auth real, incluindo isolamento do comprovante, concorrência e
renomeação sem novo consentimento. O Advisor conservou o aviso anterior
para a extensão `unaccent`.

Dez verificações dirigidas de perfil, espera do teste, permissão bloqueada,
preparação e gestão de aparelhos passaram nos dois navegadores emulados.
A gravação direta do nome e o ciclo de pausa, retomada e revogação passaram
na reexecução nos dois navegadores, sem retentativas.
O caso de pausa descartou a resposta HTTP depois da gravação, recuperou
o comprovante por GET e verificou um único evento. A validação de preparação
em 320 px mantém a auditoria na página e confere foco e área acessível
do botão de atualização na própria região. Os testes foram feitos com
transporte controlado. As capturas de bloqueio, pausa e teste em 360 e
412 px ficam em `output/playwright/l4-device-panels/`.

### E11-08 e E11-09 — Instalação, conexão e atualização da aba

- **Aplicativo** abre o painel com instalação opcional, preparação pública e
  verificação de versão. O aviso nativo do navegador depende de confirmação.
  Quando o navegador não oferece a instalação, o painel orienta pelo menu e
  mantém o acesso pela web. Aceitar um pedido não atesta que a instalação
  terminou. Preparação, instalação e inscrição de Push têm resultados próprios.
  O painel também reúne o endereço estável do Preview e a revisão para suporte.
- **Conexão e atualização** mostra conexão, versão e estado do envio em curso.
  A atualização pronta aparece nessa área. A confirmação ativa a versão
  compatível e recarrega somente a aba que pediu a atualização. Uma falha mantém
  a aba aberta e apresenta o resultado no diálogo compartilhado.
- A conferência de envio aguarda até 30 segundos pelas requisições já iniciadas
  na aba. Se o resultado não for confirmado, o fluxo volta à operação original
  para consulta. O acompanhamento não grava formulários ou chaves de tentativas.
  A recarga continua bloqueada enquanto houver envio ativo. Os rascunhos já
  aprovados mantêm seus contratos próprios.
- Ao reconectar, a aba confere a versão e aguarda a leitura atual de sessão e
  acessos. Uma tentativa de registrar acesso à ficha com resposta incerta só é
  repetida por solicitação explícita. Sem conexão, a orientação pública pode
  continuar disponível e ações privadas não entram em fila.

A comparação usou o laboratório v2 em 360 e 412 px e as capturas do painel
de instalação e conexão no Android e no iOS emulados. A rodada passou em 15 casos
sem retentativas em Chromium, Android e iOS emulados. Ela confirmou instalação
manual, tentativa nativa por gesto, recuperação da preparação, retorno da rede,
falha de atualização, proteção do envio e isolamento entre abas. Oito casos
complementares passaram em Android e iOS, incluindo revogação da sessão e
ausência de cache privado. As capturas mostraram cartões cortados em telas
baixas. O conteúdo passou a rolar preservando a altura dos cartões e o rodapé.
Os quatro testes de instalação e recuperação passaram após esse ajuste em
Android e iOS, com checagem do alvo de toque. Os 22 testes unitários de
transporte e bloqueio passaram. A etapa usa o esquema existente. A instalação
em aparelho físico e a validação no Preview com as migrations de L4 permanecem
pendentes.

### E12-01 — Guias e ajuda na tarefa

- Os assuntos são apresentados por função e abrem o painel de orientação
  da v2. Os destinos levam aos fluxos reais no vínculo consultado. O
  atalho da família abre o histórico filtrado em compra e doação.
- A conferência de uma ENT da equipe abre a orientação sobre a própria
  tarefa. Fechar o painel devolve o foco e preserva os campos preenchidos.
  A consulta contextual deixa o progresso pessoal e a ficha intactos.
- O guia explica estoque atual, atualização na emissão da REQ e baixa por
  consumo da equipe. O aviso de falta preserva o saldo. A conferência de
  quantidades recebidas e a avaliação familiar conservam registros próprios.
- A apresentação inicial continua opcional. A oferta na Visão geral abre
  o diálogo da v2 mediante ação da pessoa. Os assuntos adicionais e a
  configuração por paciente seguem disponíveis no guia e no perfil.
- O progresso pessoal e a configuração usam os contratos vigentes, com
  modal após confirmação, reconsulta da mesma tentativa e limite de duas
  novas tentativas. Falhas de leitura retiram as opções dependentes da
  resposta. O incremento dispensa migrations.
- As capturas em `output/playwright/l4/` comparam a lista e o painel em
  360 e 412 px. A lista mantém os controles de orientação acima da
  navegação móvel. O painel sobe pela base da tela no celular e mantém
  as duas ações no rodapé. O cabeçalho e a navegação são os da aplicação.
- Os testes com Auth local verificaram os seis perfis, a recusa de
  resposta de outro perfil, o progresso persistido, a recuperação da
  apresentação e a configuração pelo administrador local. A rodada em
  três navegadores aprovou 14 de 15 casos. No iOS emulado, o acionamento
  da ajuda da ENT após editar a justificativa excedeu o tempo enquanto
  o campo estava focado. O acesso passou para a faixa acima da região
  rolável. Os três testes dirigidos da ENT passaram após esse ajuste
  em Chromium, Android e iOS emulados.
- O commit `49c0763b` publicou os guias na branch do PR em rascunho.
  O [Preview da Vercel](https://home-care-assistant-f8abwrmth-rmzzfajs-projects.vercel.app)
  respondeu HTTP 200 em `/login`, `/guias`, `/verificar` e `/api/runtime`.
  O ambiente tem as variáveis de Supabase, aplicação, assinatura de PDF,
  worker e Web Push. O runtime retornou `ready`, com protocolo 1 e
  esquema 2. O SonarCloud aprovou o commit. O CodeRabbit pulou a revisão
  com 273 arquivos para o limite de 100.
- A regressão de preparação local voltou a localizar o link pelo rótulo
  aprovado. O caminho dos Guias à adoção do material e à movimentação
  familiar passou no Chromium. O ajuste de teste foi publicado em `a08742dc`.
  O [Preview desse commit](https://home-care-assistant-a4aip4max-rmzzfajs-projects.vercel.app)
  respondeu nas mesmas rotas e o SonarCloud passou. O CodeRabbit pulou a
  revisão com 274 arquivos para o limite de 100.

### E12-02 — Preparação local e retorno à tarefa

- A preparação apresenta a data da leitura e seis áreas em cartões da v2.
  Cada painel mostra apenas os dados devolvidos para o vínculo vigente.
  Os destinos existentes preservam o paciente, e o retorno reabre a área
  do painel. Convites, catálogo, custódias, escalas, balanços e comunicação
  mantêm os próprios controles e contratos.
- A atualização consulta os registros com a camada de carregamento padrão.
  Uma falha temporária mantém a consulta anterior e identifica sua data.
  Uma recusa retira os dados da consulta. O diálogo oferece até duas novas
  tentativas e os detalhes para suporte. Consultar a preparação não registra
  presença, recebimento, ciência ou conferência física.
- A comparação em 360 e 412 px registra os cartões e o rodapé da v2 junto
  ao cabeçalho e à navegação compartilhados. A primeira rodada encontrou
  cobertura parcial de botões em 320 e 360 px. No celular, a lista agora
  rola em uma área que termina acima do rodapé e da navegação.
- O incremento usa a API de consulta existente e dispensa migration.
  Os nove testes finais passaram em Chromium, Android e iOS emulados.
  A verificação incluiu as larguras de 320 a 1440 px, o retorno do catálogo
  ao painel de origem, a movimentação familiar, a recusa global e a
  recuperação da consulta sem gravar nem exibir dados de outro paciente.

### E12-03 — Criação de residência

- O formulário reúne identificação, administração e continuidade em
  cartões da v2. A revisão confere a conta inicial antes de oferecer a
  confirmação. A busca de responsáveis consulta as páginas do nome
  pesquisado e só oferece opções quando a leitura está completa.
- A confirmação grava a residência, o vínculo administrativo explícito,
  a configuração do guia, a preparação vinculada e o comprovante em uma
  transação. A conta global criadora e a equipe planejada mantêm seus
  próprios fluxos de acesso. A página de resultado encaminha a preparação
  para os vínculos locais autorizados.
- A preparação privada por etapas saiu da interface e da API do candidato.
  Os registros vinculados e os comprovantes da implantação anterior
  continuam disponíveis a seus consumidores autorizados. A
  [API de residência](../../../current/API.md#preparação-de-residência-e-guias)
  descreve os comandos da revisão e da confirmação.
- Após a perda da resposta, a aba conserva apenas a chave da tentativa
  e o contador de recuperação. O servidor consulta pelo autor e pela
  chave. Quando o formulário já foi fechado, a resolução pode encerrar
  uma chave sem cadastro sob o bloqueio da confirmação. Uma chegada
  tardia desse mesmo comando é recusada.
- As capturas da referência e da aplicação em 360 e 412 px registram os
  cartões com cabeçalhos separados e as ações fixadas na base. O cabeçalho
  e a navegação seguem o espaço global da aplicação. Os testes também
  conferem o estado inicial dos interruptores.

| Migration | Supabase local | Supabase remoto |
| --- | --- | --- |
| `20261124042309_l4_create_residence_from_review` | Aplicada | Pendente |

O histórico remoto consultado nesta etapa contém 362 versões até
`20261123165105`. A integração local da criação confirmou a identidade
revisada, a recusa de outra conta, a reconsulta do mesmo comprovante,
a confirmação concorrente com um único cadastro e o encerramento seguro
de uma tentativa ausente. Os nove casos de preparação e guia passaram,
incluindo os contratos usados pela implantação anterior.
Na rodada final de navegador, os nove casos passaram em Chromium, Android
e iOS emulados. A cobertura incluiu a perda da resposta após a gravação,
a retomada da mesma tentativa depois de recarregar a aba, a busca parcial
indisponível e a saída voluntária sem gravar o formulário.

### E12-04 — Consulta do dossiê de contingência

- A página organiza processo, busca e estado da declaração em cartões
  e linhas da v2. A busca literal usa paciente e processo autorizados
  antes da paginação. A lista recebe resumos e consulta o dossiê ao abrir.
  O laboratório exibe um código `CTG` de exemplo. No produto, a lista
  mostra a referência declarada ou a descrição. O identificador persistido
  permanece consultável no dossiê e na busca.
- As abas **Fatos**, **Materiais** e **Histórico** preservam a declaração,
  os dados físicos desconhecidos, os anexos e a autoria dos atos digitais.
  O histórico lê a confirmação persistida de cada evidência disponível.
  O diálogo de consulta oferece nova tentativa e detalhes de suporte.
- As ações de complementar e conferir verificam o vínculo, a permissão e
  a independência do revisor. O vínculo digital continua apontando ao
  registro existente. A consulta não executa nenhum ato físico ou digital.

| Migration | Supabase local | Supabase remoto |
| --- | --- | --- |
| `20261124052541_l4_contingency_dossier_search` | Aplicada | Pendente |

O Supabase local registrou 364 versões. O remoto registrou 362 versões,
com as migrations de criação de residência e de contingência pendentes.
Os 11 testes de integração
passaram, incluindo busca além da primeira página, recusa de outro
paciente e processo, e horário confirmado de anexo do Storage. Os quatro
testes unitários passaram. A rodada de 15 casos em Chromium, Android e
iOS emulados passou. Os nove casos dirigidos também passaram após ajustar
a ordem dos fatos e o rodapé do painel. As capturas comparam a lista em
360 e 412 px e o dossiê aberto em 412 px. O teste de preparação local
passou no Chromium com o rodapé compartilhado.

O `chromium-1` da [CI de `a08742dc`](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45330314424/job/138238031341)
falhou nas duas tentativas ao localizar o rótulo anterior de contingência
em Guias. A regressão usa o rótulo aprovado nesta etapa e passou nos três
navegadores emulados.

### E12-05 — Declaração e complemento

- O painel da v2 organiza autoria e paciente, escolha de processo, relato,
  referência física, materiais e comunicações. A revisão lê os fatos e
  mantém as ações no rodapé em largura de celular. A sessão autenticada
  fornece o autor. As pessoas e o horário do fato são informações separadas.
- O seletor consulta o catálogo do paciente. O produto mantém a opção
  **Material não identificado** com referência histórica, que não aparece
  no laboratório. A escolha preserva a possibilidade de declarar um objeto
  físico sem correspondência no catálogo. A consulta também mantém as
  referências inativas disponíveis para declarar fatos históricos.
- Unidade ou precisão alterada abre uma comparação com a referência atual.
  Após adotá-la, a pessoa informa novamente apenas as quantidades conhecidas
  que estavam nas referências alteradas. Zero permanece zero. Quantidade
  desconhecida permanece nula. A decisão de conciliação continua no fluxo
  independente.
- Uma alteração concorrente no dossiê durante o complemento exige ler os
  fatos acrescentados antes de confirmar na revisão atual. A confirmação
  mostra o resultado oficial e oferece acesso ao dossiê. Os fatos originais
  e seus autores permanecem no histórico.
- O fechamento descarta campos transitórios. Em resultado incerto a aba
  guarda somente a referência oficial da tentativa e o contador. Até duas
  consultas conferem a mesma referência. Se ela estiver ausente, o banco
  pode encerrá-la para impedir envio tardio. Ao esgotar as consultas, a
  interface oferece a cópia de detalhes para suporte.
- Declaração e complemento usam o RPC existente e não acrescentam migration.
  Os testes verificam que estoque, fichas emitidas e ciência de L1–L3
  permanecem com os mesmos registros durante esses atos.

Os sete casos da suíte de contingências passaram no Chromium sem retentativas.
A primeira rodada teve um timeout no carregamento pós-login. A segunda preservou
a mesma espera e passou. Após os ajustes de foco, de carregamento e da cobertura
do complemento concorrente, passaram os 12 casos dirigidos em Chromium,
Android e iOS emulados, também sem retentativas. Os quatro testes unitários,
o build, o lint dirigido e a verificação das migrations históricas passaram.

As capturas em 390 px comparam o preenchimento, a revisão e a unidade alterada
com os três estados da v2. O aplicativo conserva o cabeçalho global e os diálogos
compartilhados. O teste de revisão verifica o foco por teclado no rodapé.

O Preview da PR #8 continua em `a08742dc`, com estado `READY` e as variáveis
de Supabase, PDF, Push e notificações cadastradas. A publicação dos commits
locais depende das duas migrations pendentes no Supabase compartilhado com
produção. Esta etapa não modificou o banco remoto.

### E12-06 — Conferência independente e vínculo

- O painel de conferência segue a v2 com a declaração, a autoria, a revisão
  e abas para vincular um registro ou pedir esclarecimento. A busca e a
  consulta mostram referências reais do mesmo paciente e processo. A
  confirmação exibe a referência e a justificativa na revisão escolhida.
- O cadastro do ato ausente abre seu fluxo em outra aba para manter a
  conferência disponível aqui. O dossiê continua acessível pelo endereço
  original. A navegação oferece somente fluxos permitidos ao vínculo atual.
- Uma revisão mais recente do dossiê exige consultar os atos acrescentados.
  A justificativa fica no painel e a referência precisa ser escolhida após
  adotar a nova revisão. Se mudar a revisão da ficha ou do relato digital,
  o seletor mostra a versão anteriormente conferida e as referências atuais.
- A associação bloqueia anexos ainda em quarentena. Os dados de envio ficam
  sujeitos ao acesso vigente. A interface mostra a pendência sem divulgar
  arquivo, autor do envio ou chave de outra pessoa. A independência é
  verificada para a declaração original e para todos os complementos.
- O comprovante abre o resultado confirmado e permite voltar ao dossiê
  com histórico atualizado. Após perda de resposta, a recuperação consulta a
  mesma chave até duas vezes. A aba preserva somente metadados da tentativa
  oficial. O pedido de esclarecimento não associa uma referência digital.
- A conferência preserva os atos de estoque, recebimento, ciência e assinatura
  de L1–L3. A associação acrescenta um evento ao dossiê e aplica a proteção a
  novos complementos e decisões após o vínculo.

| Migration | Supabase local | Supabase remoto |
| --- | --- | --- |
| `20261124063932_l4_contingency_review_reference` | Aplicada | Pendente |

Foram confirmadas 365 versões locais e 362 remotas. A nova migration exige
a versão da referência em novos vínculos, inclusive por RPC direta.
Preserva o comprovante de operações antigas pela mesma chave. O novo
contrato precisa ser publicado junto com a aplicação que informa a versão
da referência. O Preview em `a08742dc` e a produção em `fab595c7` usam
o mesmo banco. A API da produção ainda envia vínculos sem `targetVersion`.
Aplicar esta migration isoladamente impediria novos vínculos nessa versão.

Os 11 testes de integração passaram com Auth real, incluindo recusas de
versão ausente ou divergente, referência de outro paciente, decisão pelo
próprio autor, evidência pendente e concorrência entre duas pessoas. A
consulta de permissões confirmou execução somente pelo papel autenticado
nas duas RPCs alteradas, com verificação de escopo no banco. A instalação
limpa e a evolução a partir da base antiga pela suíte de CI aguardam
publicação do candidato.

Os cenários de atualização do dossiê, mudança da revisão do registro,
resultado incerto, ausência de referência e independência passaram em
Chromium, Android e iOS emulados. O teste ponta a ponta com anexo passou
em Chromium e Android. No iOS esse teste passou duas vezes seguidas sem
retentativas após voltar à largura original do aparelho ao fim da auditoria
de cinco larguras. O clique anterior em **Materiais** havia atingido o
limite do Playwright após o redimensionamento. Em uma rodada inicial,
uma consulta pós-anexo também recebeu 503 em `/api/context` depois de o
envio receber 201. O 503 não reapareceu na verificação seguinte.

As capturas em 390 px comparam o painel com o laboratório v2. O aplicativo
mantém o cabeçalho global, as abas e diálogos compartilhados. O build,
quatro testes unitários, ESLint dirigido, Markdown e a verificação das
migrations históricas passaram.

### E12-07 — Central técnica e decisões

- A Central técnica segue a v2 com o seletor de ambiente, os cartões de
  observações, a lista de incidentes, as três abas e a atualização no rodapé.
  Os componentes técnicos existentes além dos seis ilustrados continuam
  disponíveis na sequência dos cartões. **Administração técnica** reúne
  políticas, criação de residência e a consulta às contas globais.
- A investigação abre um painel com situação, severidade, contagens,
  correlação e acesso ao histórico paginado. O encerramento pede
  confirmação explícita. O encerramento direto era uma ação disponível e
  fica em um bloco próprio quando o incidente ainda está aberto.
- Uma atualização concorrente exige comparar a versão e adotar a situação
  vigente. A consulta por ID funciona mesmo quando o incidente deixa a
  primeira página ou foi encerrado em outra sessão. Na política, a adoção
  conserva campos editados e atualiza os demais para os valores vigentes.
- A recuperação usa a mesma chave pelo autor e pelo ambiente. A aba guarda
  somente metadados da tentativa oficial, por até duas consultas de
  recuperação. O banco devolve o comprovante existente ou encerra a chave
  sem executar a decisão. Os painéis compartilham carregamento, confirmação,
  resultado e detalhes para suporte com as demais superfícies.
- Observações, histórico e decisões exigem administração global ativa.
  A consulta técnica mantém as referências minimizadas. Acompanhamento,
  encerramento e política acrescentam atos técnicos, preservando os registros
  de estoque, ciência, documentos e entregas de L1–L3.

| Migration | Supabase local | Supabase remoto |
| --- | --- | --- |
| `20261124071109_l4_technical_operation_recovery` | Aplicada | Pendente |

A migration acrescenta consulta exata de incidente e recuperação de decisão
técnica. Os comandos e comprovantes já existentes continuam legíveis
e sujeitos à autorização global. Os 12 testes de integração passaram,
incluindo decisão concorrente, chave encerrada sem registro, recuperação
do comprovante e escopo global com Auth real. A instalação limpa fica
sujeita à CI do candidato.

Os cinco testes unitários e as 12 verificações dirigidas de navegador
passaram sem retentativa em Chromium, Android e iOS emulados. A verificação
de 320 px passou após corrigir a largura mínima das abas. O comprovante
foi recuperado após recarregar a aba e o histórico registrou um único ato.
A comparação da política mostrou valores conferidos, vigentes e propostos.
As capturas em 390 px comparam a estrutura da Central com o laboratório v2.
A abertura das severidades e a conferência da política passaram em três
execuções dirigidas adicionais, sem retentativa. As duas novas RPCs só
concedem execução ao papel autenticado e verificam o escopo global.
O Advisor local não apontou alertas para essas funções.

Ao fechar a Central técnica, o Supabase local registrou 366 migrations e o
compartilhado registrou 362. O Preview
publicado em `a08742dc` está `READY`, com variáveis de Supabase, PDF, Push
e avisos cadastradas. A consulta a `/login` retornou 200 e a Central técnica
exigiu autenticação (401). A produção em `fab595c7` usa o mesmo banco.
Os quatro contratos locais ainda aguardam a transição descrita em E12-06.
O Sonar aprovou o commit publicado. O CodeRabbit pulou a análise por tamanho
da PR, apesar da configuração de revisão automática para drafts.

A conferência identificou a origem de produção em `NEXT_PUBLIC_APP_URL` no
escopo geral de Preview. A emissão automática usa essa variável para os
links de verificação. A configuração específica de `feat/phase-d-continuation`
agora usa o endereço estável do próprio Preview. O novo deploy do mesmo
`a08742dc` está `READY`. O login e a verificação pública retornaram 200;
a consulta técnica sem sessão retornou 401. Assim como a produção, o Preview
consulta o banco compartilhado, cujo contrato retornou protocolo 1 e esquema
2. A conferência não emitiu PDF nem disparou notificações. A produção continua
em `fab595c7`. [Novo deploy de Preview](https://vercel.com/rmzzfajs-projects/home-care-assistant/4b9dWGHYbP8cao7UA2RknY63oizQ)

### E12-08 — Continuidade e tentativas de envio

- **Continuidade** usa o recorte confirmado do ambiente para exibir a última
  cópia e o último ensaio. O painel dos registros mostra os identificadores,
  o manifesto, a correlação e as métricas que a fonte realmente informou.
  A correspondência exige a mesma referência, manifesto, quantidade, bytes
  e ordem temporal. O inventário permanece na custódia do operador.
- O roteiro preserva responsáveis, isolamento, quarentena e reconciliação.
  A política abre separadamente e informa retenção, cópia prévia e metas de
  recuperação ainda sujeitas a comprovação operacional.
- **Eventos e envios** abre detalhes de eventos e tentativas sem reprocessar
  filas. Em outro ambiente, a consulta de envios oferece trocar para o banco
  compartilhado. Web Push mostra as tentativas preservadas e a fila legada
  indica a lacuna. O provedor, o destino e o texto de erro ficam restritos.
  A referência que pode ser copiada é o identificador técnico do registro.
- A consulta usa os contratos existentes de observações e tentativas. Não
  houve nova migration para esta etapa. Os detalhes de eventos e as duas
  fontes permanecem limitados à administração global. As consultas não
  executam restauração ou reenvio e não registram ciência ou recebimento.
- Falha ao consultar as tentativas usa o diálogo compartilhado, com nova
  consulta e detalhes para suporte. A lista anterior, quando disponível,
  conserva o horário e bloqueia detalhes enquanto aguarda resposta válida.

Os dois fluxos passaram em Chromium, Android e iOS emulados, sem
retentativas. Chromium concluiu os dois testes antes de o runner travar
na troca de projeto. A execução separada de Android e iOS passou com quatro
testes. Os casos checam rolagem pelo teclado, retorno do foco, escopo,
consulta de histórico e ausência de comandos sobre estoque, ciência e fila.
Os 18 testes unitários de continuidade e monitoramento passaram. As
capturas de 360 e 412 px permitiram reduzir a duplicação no cabeçalho
da Central e ajustar o rodapé ao contexto global. O acesso à Administração
continua pelo menu **Outras áreas**. A visão técnica e a continuidade
passaram no Chromium após esse ajuste, sem retentativa.

### Pendências para o aceite de L4

A mensagem de encaminhamento pede que os anexos de L4 sejam ignorados pelo
Git. A seção 2 do comando mestre pede o versionamento no arranjo de L1–L3.
Os dois anexos foram versionados em `b95c3872`, e a CI lê o HTML para as
comparações de E10–E12. O SHA-256 local do HTML confere com o comando
mestre. A decisão do responsável sobre o versionamento está pendente.

E10-04 tem exercícios dirigidos com Auth real em conferência de chegadas
COM, regularização ENT, estoque familiar, administração de acesso, balanço
e consumo. O aceite integrado continua sujeito à CI do candidato e à
validação no Preview. As migrations locais aguardam a transição do banco
compartilhado com a produção.

Em 25/11, o Chromium passou nos três casos de contingência com Auth real.
As capturas em 360 e 412 px incluem o dossiê aberto, o preenchimento, a
revisão da declaração, a unidade alterada, a conferência com referência
selecionada, a confirmação do vínculo e o resultado recuperado. O teste
registrou um único vínculo na revisão atual e preservou os atos físicos.
A comparação identificou dois ajustes de densidade. O editor começa
abaixo do painel da v2 e encobre a lista de materiais na primeira tela
de 360 px. As abas de conferência ocupam metades da largura, enquanto a
referência as alinha pelo texto. O cabeçalho da aplicação, a revisão do
registro digital e a justificativa na confirmação seguem os contratos
do produto.

O editor e o dossiê passaram a usar a mesma altura no celular. As abas
do dossiê e da conferência acompanham a largura dos rótulos. As novas
capturas mostram Materiais declarados na primeira tela de 360 px, a
justificativa acima do rodapé e o comprovante oficial recuperado. O
dossiê conserva a autoria e a revisão. Cinco casos passaram sem retentativa
em Chromium e WebKit no relatório `output/playwright/l4-contingency-density-report`.
O comprovante recuperado inclui horário e efeito operacional do registro
real. O laboratório ilustra o retorno após a confirmação inicial.

As seções E10-01 a E10-10 registram a execução e a validação dirigidas
da administração e do catálogo. A confirmação do lote depende da
verificação integrada do candidato, incluindo a CI e o banco do Preview.

### Pendências da CI publicada em `a08742dc`

- No `chromium-1`, o teste da aprovação, compra e chegada da COM passou
  na repetição. O artefato da primeira tentativa mostra **Materiais** com
  foco, **Visão geral** selecionada e URL sem `documentTab`. Cinco
  execuções locais sem retentativa passaram. A causa da intermitência
  permanece em aberto. [Job Chromium 1](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45330314424/job/138238031341)
- O `ios-1` registrou o mesmo seletor antigo de contingência do
  `chromium-1` nas duas tentativas. O teste do checkout atual passou
  em ambos os navegadores. [Job iOS 1](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45330314424/job/138238031343)
- No `mobile-2`, os casos de PWA e Web Push falharam nas duas tentativas.
  Os alertas de sessão e consentimento já estavam na página. Os artefatos
  mostram diálogos de Guia sobrepostos, iniciados pela aba oculta de
  Ajuda. A consulta e os diálogos passaram a depender da aba ativa. Os dois
  casos e o teste de navegação do Perfil passaram no Android emulado sem
  retentativa. O teste do Perfil confere que a Ajuda consulta o Guia ao
  abrir e preserva o preenchimento das outras abas.
- Também no `mobile-2`, o teste de chegada da COM passou na repetição.
  A primeira tentativa perdeu a aba **Materiais** durante a seleção.
  [Job Mobile 2](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45330314424/job/138238031133)

### Publicação em draft de `e7be6b72`

A PR 8 permaneceu em draft em `feat/phase-d-continuation`. O push reuniu 16
commits, com 13 migrations de L4 que ainda constam apenas no banco local. O
SonarCloud aprovou o SHA e o CodeRabbit pulou a revisão
incremental por não conseguir retomar o último ponto revisado. Na rodada
anterior, o CodeRabbit havia informado um limite de 100 arquivos para os
274 que entraram no escopo da revisão.

A CI desse SHA falhou no job de banco e não iniciou os navegadores. Dois
testes de diretório comparavam a projeção antiga, anterior à autorização
de consumo familiar por vínculo. O teste de arquivamento tentava retirar a
própria restrição. Os testes locais passaram a conferir a ausência da
autorização de consumo fora do contexto ativo e a recusa de autoelevação.
Outra pessoa autorizada restaura a permissão no caso de arquivamento. Os
três testes passaram localmente com Auth real.

O Preview ficou `READY` no SHA publicado. A Vercel confirmou o domínio da
branch e as variáveis de Supabase, assinatura de PDF, Web Push e notificações
no escopo correto. `/login`, `/api/runtime`, o manifesto, o service worker e
a página offline responderam HTTP 200. A consulta de notificações sem sessão
retornou HTTP 401. A checagem não emitiu PDFs nem disparou avisos.

O Preview e a produção em `fab595c7` ainda consultam o mesmo Supabase, com
362 migrations. A consulta ao banco confirmou a ausência da função da nova
caixa de avisos. A checagem básica do runtime confere apenas o protocolo e a
versão do esquema, por isso ainda retorna `ready`. Para validar os fluxos
novos de ponta a ponta no Preview, ele precisa de um banco com as migrations
do candidato. Aplicar a migration de contingência no banco compartilhado
impediria o vínculo de referências pela versão atual de produção.

[PR 8](https://github.com/RMZZFAJ/home-care-assistant/pull/8) ·
[Preview de e7be6b72][preview-e7be6b72] · [CI de e7be6b72][ci-e7be6b72]

[preview-e7be6b72]: https://home-care-assistant-gxfff9eet-rmzzfajs-projects.vercel.app
[ci-e7be6b72]: https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45396260206

### Publicação em draft de `d4a53e44`

Os três commits publicados incluem a instalação e atualização da aba, a
identificação e a foto da conta e os ajustes aos testes de diretório e
arquivamento. O Preview ficou `READY`. Login, runtime, manifesto,
service worker e página offline responderam HTTP 200. A central de avisos
recusou a consulta sem sessão. A validação dos fluxos autenticados de L4 no
Preview segue dependente do esquema pendente no Supabase.

SonarCloud e as checagens em Linux e Windows passaram. CodeRabbit voltou
a pular a revisão incremental. A integração de banco registrou 893
sucessos e duas falhas antes dos navegadores. A criação de residência
retornou timeout `57014` no lugar da negativa de autorização esperada.
O teste de retirada da permissão de encerrar uma COM não conseguiu
observar a espera no bloqueio de estoque. As duas regressões passaram
isoladamente na stack local, com as mesmas asserções de autorização e
rollback. A execução completa na CI continua pendente de investigação.

[Preview de d4a53e44][preview-d4a53e44] · [CI de d4a53e44][ci-d4a53e44]

[preview-d4a53e44]: https://home-care-assistant-1b1tmx7gp-rmzzfajs-projects.vercel.app
[ci-d4a53e44]: https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45413280504

### E10-01 — Administração da residência

A visão de Administração segue as seções e ações do laboratório v2.
Identificação abre em diálogo e a revisão antecede a gravação. O cartão
mostra o cadastro confirmado e as ações usam totais reais de vínculos,
convites válidos e propostas pendentes. O contexto global identifica a
atuação administrativa. A edição global cria uma proposta para decisão
local independente. Um vínculo sem gestão recebe a tela de acesso
indisponível. A revogação confirmada continua usando a proteção compartilhada
do workspace, que retira os dados da sessão.

A rota anterior `section=patient` abre a mesma identificação em diálogo.
Preparar nova residência leva ao fluxo único de E12-03 e retorna à
administração de origem ao encerrar. Guias conserva seu próprio retorno.
O cadastro de desenvolvimento, a auditoria, a importação histórica, a fila e
a Central técnica são extensões da referência nesta visão. As ações ficam
nos respectivos contextos autorizados. A opção
de desenvolvimento fica recolhida na identificação global. Destinatários e
alertas de estoque ficam acessíveis pelas regras da residência.

O cabeçalho, o seletor e a navegação inferior seguem o workspace real dos
lotes anteriores. Na tela de acesso indisponível, **Ver acesso disponível**
abre o diálogo **Acessos disponíveis** e oferece retorno à Visão geral
autorizada. O teste conferiu a abertura, o retorno de foco e a recusa da
consulta administrativa para o vínculo de leitura.

Na validação local anterior, o painel global manteve o contexto anterior
durante uma troca de perfil no WebKit, com 11.903 cadastros na base. O código
montava toda a lista na Visão geral e também no seletor do cabeçalho.

A Visão geral e o diálogo do cabeçalho usam agora a mesma busca por nome,
com 20 resultados por página. Cadastros ativos e inativos continuam
encontráveis. Abrir uma residência pelo cabeçalho da Visão geral conduz
à Administração em contexto global. Nos vínculos locais, a seleção
continua passando pela validação do contexto. O incremento limita
a montagem da interface e conserva a consulta de autoridade existente.

A regressão acrescentou 12.000 entradas sintéticas à resposta autenticada
em cada navegador e selecionou uma residência real da base local.
Conferiu paginação, pesquisa sem acentos, resultado vazio, retorno de foco
e acesso à mesma residência na API. As capturas do diálogo novo ficam
em 360 e 412 px no relatório `output/playwright/l4-global-directory-report`.
Quatro execuções com build de produção passaram em Chromium e WebKit
de iPhone, incluindo a proposta global com revisão independente e a
recusa de acesso administrativo pelo perfil de leitura.

O Chrome local também interrompeu duas rodadas de recuperação de convite
no fim do login, antes de abrir o formulário. Um rastreamento mostrou
runtime indisponível. Outro mostrou o login confirmado, uma consulta ao
diretório pendente e consultas de sincronização disparadas ainda no login.
Uma leitura direta confirmou 12.437 cadastros e cerca de 3 MB no retorno
do diretório global.

A entrada passou a solicitar a indicação de vínculo único e, quando há
um destino recente, apenas o vínculo correspondente. A resposta ainda
inclui a confirmação do contexto e da autorização da ficha. O diretório
completo continua disponível no workspace. A sincronização inicia depois da leitura
autorizada, com atualização restrita aos detalhes de PDF quando houver
uma conta autenticada na verificação pública. O runner aguarda o contrato
de runtime do Supabase local. A recuperação do convite passou em Chromium
e Android emulados com as novas verificações da sequência de entrada.

O reteste mostrou que a conta global local também tinha milhares de
vínculos efetivos. O WebKit travava ao abrir o menu com todos eles. Quando
a conta global tem mais de 20 vínculos, o menu de perfil abre o diálogo
de busca paginada, com Administração global em ação própria. A troca
continua exigindo a resposta do servidor e a confirmação do contexto na
tela. Volumes menores conservam o seletor existente.

Chromium e WebKit de iPhone passaram com 12.000 entradas acrescentadas à
resposta autenticada. A busca identificou um cadastro real, o seletor
limitou a página a 20 resultados e o fechamento devolveu o foco ao menu.
Também passaram a troca de perfil global no iPhone, a entrada com vínculo
único e a recuperação de convite no Chromium. A leitura dos avisos no
Android chegou à auditoria de 1440 px antes de exceder o limite do teste.

A edição local usa o registro oficial de governança. A consulta de recuperação
usa apenas a chave da tentativa confirmada. Sob a mesma trava da gravação,
o banco retorna o resultado ou encerra a tentativa ausente. Um envio tardio
com a chave encerrada não reaplica a edição. Um conflito de versão ou
identificação exige abrir e revisar a referência atual.

As capturas do aplicativo e do laboratório ficam em
`output/playwright/l4-residencia`, nas larguras de 360 e 412 px. Os cenários
dirigidos de consulta, edição e autorização passaram em Chromium/Android e
WebKit/iPhone emulados, com Auth local real. Foram conferidos recuperação
após perda da resposta, bloqueio de envio tardio, conflito de identificação,
proposta com aprovação independente e recusa de leitura administrativa
pelo perfil de leitura. A edição preservou vínculos e movimentos de estoque.
Os testes de criação, reemissão e revogação de convite, destinatários e
limites de estoque passaram pelos novos caminhos nos dois navegadores.
Build de produção local, ESLint dirigido, Markdown e guarda das migrations
históricas passaram.

| Migration | Supabase local | Supabase remoto |
| --- | --- | --- |
| `20261124153444_l4_residence_administration.sql` | Aplicada | Pendente |

O Supabase local contém 376 migrations. A última conferência do banco
compartilhado pelo Preview e pela produção encontrou 362. A migration deste
checkpoint depende de publicação e validação do ambiente candidato. O banco
compartilhado permanece sujeito à incompatibilidade de contingências já
registrada acima.

### E10-02 — Convites da residência e retorno de acesso

Pessoas e Convites compartilham o cabeçalho e as abas com totais reais no
contexto local. A administração global conserva a consulta de pessoas e o
fluxo de proposta. Convites mostra função, situação e validade, com criação
em diálogo, detalhes em painel e confirmação separada para reemitir ou
revogar. A lista usa e-mail como identificação quando o destinatário ainda
não tem uma identidade confirmada. O resultado permite copiar o link para
encaminhamento manual.

A chamada de administração registra uma chave por tentativa. A recuperação
consulta a chave original e fecha uma tentativa ainda ausente. O segredo
do link é apresentado ao confirmar a primeira geração. Uma resposta
perdida pode ser recuperada como operação registrada, com reemissão
explícita para obter outro link. O histórico distingue recusa de revogação,
inclusive após reemissão. As opções usam a situação e a validade revisadas.

Cadastro, consulta, aceite e recusa passaram a conferir a capacidade
efetiva de administração da pessoa que emitiu o convite. A retirada da
exceção invalida seus convites pendentes e preserva os vínculos aceitos.
O teste também confirmou que a reemissão invalida o link anterior e que
contas inadequadas e links terminais recebem apenas o estado autorizado.

**Ver acesso disponível** abre o diálogo de orientação previsto no
laboratório e oferece retorno ao seletor real. O diálogo mantém o contexto
restrito fora de seu conteúdo. O painel de pessoa, a jornada visual de
aceite e a retirada das preparações persistentes de vínculo continuam
como frentes abertas de E10-02.

Dois testes dirigidos com Auth local passaram, incluindo concessão e retirada
da exceção, recusa seguida de reemissão e revogação pelo desligamento.
Os três cenários de navegador passaram em Android e iPhone emulados. A
criação, a reemissão e a revogação passaram novamente após o ajuste visual.
As capturas de 360 e 412 px em `output/playwright/l4-residencia` confirmam
o padrão de abas e cartão. O cabeçalho e a navegação seguem o workspace do
produto. O build local e as verificações dirigidas passaram.

| Migration | Supabase local | Supabase remoto |
| --- | --- | --- |
| `20261124161308` | Aplicada | Pendente |

O Supabase local contém 377 migrations nesta conferência.

#### Publicação de residência e convites

Os commits `1d57da08` e `75ab9d5f` foram publicados na branch
`feat/phase-d-continuation`, na PR 8 em draft. O Preview de `75ab9d5f`
ficou `READY`. O login, o runtime, o manifesto, o service worker e a
página offline responderam HTTP 200. As rotas de administração da residência
e dos convites devolveram HTTP 401 a chamadas sem sessão.

A Vercel confirmou o endereço da branch e as variáveis de Supabase, PDF,
Web Push e notificações no escopo de Preview. O Preview e a produção usam
o mesmo Supabase, com 362 migrations. O banco ainda não tem as funções de
administração da residência e dos convites. A verificação autenticada desses
fluxos no Preview depende de um banco separado com as migrations do candidato.
Na conferência, produção seguia em `fab595c7`.

O SonarCloud aprovou o Quality Gate de `75ab9d5f`. O CodeRabbit pulou a
revisão após falhar ao retomar o histórico incremental. A CI do SHA seguia
em execução.

[PR 8][pr-residence-preview] · [Preview de 75ab9d5f][preview-75ab9d5f] ·
[CI de 75ab9d5f][ci-75ab9d5f]

[pr-residence-preview]: https://github.com/RMZZFAJ/home-care-assistant/pull/8
[preview-75ab9d5f]: https://home-care-assistant-7fq8z834g-rmzzfajs-projects.vercel.app
[ci-75ab9d5f]: https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45440037521

#### Painel de pessoas, edição e desligamento

Pessoas vinculadas usa as linhas compactas, os avatares e o painel lateral
do E10-02. A ficha da pessoa mostra residência, função e situação. **Ver
permissões** abre a consulta da pessoa na matriz real. A edição compara a
função atual e a proposta, preserva a identidade e os sinalizadores de
estoque existentes. A conferência de credencial continua disponível no
contexto local autorizado e retorna o foco à ação que a abriu.

A revisão de desligamento consulta as pendências reais. A autorização para
revogar depende do vínculo e da referência revisada. Uma falha na leitura
de pendências ainda permite a revogação urgente. A decisão tem confirmação
separada. Autoria, recebimentos, estoque e acompanhamento de tarefas
permanecem nos respectivos processos, inclusive após o desligamento.

A edição fica em memória até a confirmação. O comando antigo recusa
novos rascunhos de vínculo. A operação oficial recebe uma chave, compara a
referência sob a trava da governança, aplica a alteração local ou registra
proposta global para decisão local independente. A consulta de recuperação
usa apenas a chave e o escopo. Ela confirma o resultado registrado ou encerra
a tentativa ausente, impedindo aplicação tardia. A sessão original pode
recuperar a alteração que retirou sua própria autoridade. A recuperação tem
até duas consultas e usa o diálogo compartilhado.

O laboratório usa conta por e-mail no formulário ilustrativo. O produto
preserva a seleção de contas já vinculadas no contexto local e a busca
paginada no contexto global. Uma pessoa sem vínculo local entra por convite.
Busca de participantes, propostas com dupla aprovação e acompanhamento de
pendências da pessoa desligada preservam funções existentes. O fluxo visual
do destinatário do convite e a composição completa da credencial profissional
seguem como trabalho aberto.

| Migration | Supabase local | Supabase remoto |
| --- | --- | --- |
| `20261124164759` | Aplicada | Pendente |

O Supabase local contém 378 migrations nesta conferência. A migration entrou
de forma incremental, sem reset. A validação usou Auth real e dados fictícios
do ambiente local.

Os testes de navegador cobriram edição, revogação urgente com consulta de
pendências indisponível, isolamento entre residências, resposta perdida na
autorrevogação, conferência familiar, recuperação da proposta e comparação
com o laboratório em Chromium, Android e iPhone emulados. As rodadas
dirigidas corrigiram o código HTTP de conflito e a densidade em telas
estreitas. A comparação final confirmou o cartão e as linhas do E10-02,
incluindo capturas a 360 e 412 px, descarte ao fechar a edição e acesso à
matriz já na pessoa selecionada. O build, o TypeScript, o lint dirigido e o
guard das 84 migrations históricas passaram.

#### Jornada de quem recebe o convite

O E10-02 apresenta a residência e quem convidou em um cartão de identificação,
seguido da conta, da função e da validade. A recusa exige confirmação em
diálogo. Conta errada, link inválido, expirado ou revogado recebem o estado
correspondente com conteúdo protegido. Trocar a conta preserva o link nesta
aba e consulta o convite novamente depois do login.

O aceite e a recusa usam os modais compartilhados. A resposta da gravação
é conferida por uma nova leitura do mesmo convite. A recuperação mantém
a mesma decisão, permite consulta sem reenvio e tem limite de duas tentativas
mesmo após recarregar. O diagnóstico informa operação, código, instante e
número de tentativas. A prévia e as respostas atrasadas são vinculadas à conta
e ao link que iniciaram a consulta.

Após o aceite, Selecionar residência verifica novamente a validade do vínculo
e confirma a seleção real no servidor para a conta convidada. O painel de
confirmação apresenta a função vigente. O fluxo preserva cadastro por e-mail,
confirmação, as opções de provedor já configuradas e a consulta às permissões
específicas de estoque. Essas funções existentes aparecem em áreas recolhíveis
porque o laboratório usa uma conta previamente cadastrada e um vínculo simples.

| Migration | Supabase local | Supabase remoto |
| --- | --- | --- |
| `20261124173052` | Aplicada | Pendente |

O Supabase local tem 379 migrations nesta conferência. A aplicação foi
incremental, sem reset. Auth real local confirmou a proteção do destino e a
revogação da autoridade para convites pendentes. Uma conta recém-confirmada
pode consultar o próprio convite antes do primeiro vínculo. A recusa registra
a identidade para a auditoria e conserva zero vínculos. A confirmação por e-mail
da suíte usa a caixa local de testes. A validação de entrega por um provedor
externo permanece pendente.

Passaram três casos dirigidos de integração com Auth real. Chromium,
Android e iPhone emulados passaram na consulta da conta correta, proteção de
convite expirado, seleção da residência confirmada, recuperação de recusa e
aceite, isolamento de respostas atrasadas e limite de recuperação após reload.
A prévia foi comparada com o cartão do laboratório em 360 e 412 px. A rodada
final do cadastro completo passou nos três navegadores, incluindo e-mail
confirmado localmente, primeiro aceite e recuperação de senha. Build, tipos,
lint e guard das 84 migrations históricas passaram.

### E10-03 — Declaração e conferência da credencial profissional

A partir do vínculo da pessoa, a tela apresenta a declaração atual,
a conferência da família e o acesso ao histórico, conforme L4 v2.
O histórico mantém autoria, horário, dados da versão conferida e observação.
Na edição, a confirmação é vinculada à versão exibida. Se a declaração muda
durante a conferência, a gravação é bloqueada e o modal compara os valores
anteriores e atuais. Usar a declaração atual exige nova confirmação.

O laboratório apresenta a credencial como cenário de página. No sistema,
a consulta abre sobre o painel da pessoa e devolve o foco ao vínculo.
A composição mantém as seções e ações do laboratório e inclui leitura sem
competência para conferir, erros de consulta e paginação do histórico real.
O modal apresenta as versões e os dados atuais em formato compacto. Os
valores completos de ambas as versões ficam acessíveis em **Comparar todos
os dados**.

Quando a resposta da gravação se perde, a aba conserva somente a referência
da tentativa e a contagem de recuperação. A consulta da mesma chave confirma
o registro oficial ou encerra a tentativa sob o lock já usado na gravação.
Se a consulta encerrar a tentativa antes de a gravação chegar, o servidor
recusa o envio atrasado. Duas consultas são oferecidas, inclusive após
recarregar a aba. A declaração e a conferência mantêm seus efeitos limitados
ao histórico de credenciais.

| Migration | Supabase local | Supabase remoto |
| --- | --- | --- |
| `20261124180056` | Aplicada | Pendente |

O Supabase local tem 380 migrations, aplicadas incrementalmente. O remoto
vinculado tem 362. O Preview publicado em `75ab9d5f` tem 15 migrations do
candidato pendentes no banco que compartilha com produção. A Vercel confirmou
as variáveis de Preview e a aplicação respondeu no login, runtime, manifesto,
service worker e página offline. Credencial sem sessão recebeu HTTP 401.

Na PR 8, o SonarCloud passou para `75ab9d5f`. A revisão automática do
CodeRabbit está habilitada para rascunhos. O bot pulou essa execução por
não conseguir retomar a revisão incremental. Na CI desse SHA, cinco shards
de navegador falharam, um foi cancelado e um passou. Os logs confirmam
falhas repetidas em autenticação de continuação, avisos, tarefas e outras
jornadas. As verificações dirigidas deste incremento são locais.

Passaram sete testes unitários e seis integrações com Auth real. A
integração confirmou leitura da mesma chave após gravação, ausência confirmada
com bloqueio de envio atrasado, corrida entre gravação e consulta, revogação
e isolamento de escopo. Nos testes de navegador, Chromium, Android e
iPhone emulados passaram na perda de resposta após commit, na paginação
do histórico e no conflito provocado por alteração real do titular.

O cenário de Pessoas passou nos três navegadores, com comparação em sete
larguras, busca e retorno de foco ao fechar a credencial. Após um timeout
com mais de 11 mil opções acumuladas no seletor do usuário compartilhado,
o teste passou a usar uma conta fictícia com o vínculo do cenário.
Build de produção, tipos, lint e guard das 84 migrations passaram.
O modal final foi comparado com o cenário de conflito do laboratório em
360 e 412 px. A comparação e o fundo do modal passaram nos três navegadores.

### E10-05 — Propostas de alteração e decisão independente

A área Pessoas e propostas abre com as seções de decisão, aceite e histórico.
O formulário Função no paciente vem depois da lista, na mesma aba. Cada
registro abre o painel de conferência com residência, autor, decisor quando
disponível, situação e comparação entre valores vigentes e propostos.

Situação, tipo e busca por referência ou conteúdo ficam no diálogo Filtrar
propostas. Os filtros em uso aparecem junto ao título e à contagem. A ação
de atualização fica ao lado de Filtros. Aplicar ou limpar os filtros
volta à primeira página e mantém a âncora Propostas. Cancelar descarta a
edição do diálogo. A consulta ordena por data e identificador.
A navegação entre páginas aparece quando há mais de uma página ou quando a
página consultada é posterior à primeira. Esses controles complementam a
lista do laboratório, que usa uma proposta por cenário.

A aprovação ou rejeição exige confirmação no diálogo e autenticação local
de um administrador distinto do autor. A aprovação exige a mesma referência
consultada, que inclui a proposta, a versão e os dados vigentes. Uma proposta
superada oferece consulta à configuração atual e acesso à área de origem
para preparar outra alteração. O registro anterior continua no histórico.

A tentativa oficial guarda a decisão e a referência no banco. Após perda
da resposta, a aba conserva a chave e a contagem de consultas, com até duas
tentativas de recuperação. A consulta confirma o registro ou encerra a chave
sem decisão e bloqueia um envio atrasado com a mesma chave. O caso de vínculo
registra a aprovação local e mantém o aceite do destinatário pendente. A
reemissão abre o convite correspondente no fluxo de convites da residência,
com confirmação de que o link anterior deixará de valer.

| Migration | Supabase local | Supabase remoto |
| --- | --- | --- |
| `20261124184414` | Aplicada | Pendente |

O projeto local tem 381 migrations. O remoto vinculado tem 362, com 19
pendentes em relação ao checkout antes da publicação deste incremento.

Passaram 50 unitários de leitura e apresentação, três integrações com Auth
real e 12 execuções dirigidas em Chromium, Android e iPhone emulados. Os
casos de navegador cobriram filtro, paginação até a proposta mais antiga,
leituras inválidas, resultado perdido com recarga, proposta superada e
reemissão do convite ainda sem aceite. O cenário de leitura percorreu 101
pendências e 101 decisões preservadas. A comparação visual com L4 v2 foi
inspecionada em 360 e 412 px. O painel real usa o drawer compartilhado e
mostra as versões e a referência do registro, além dos campos da amostra.

Quatro cenários existentes passaram no Chromium. Eles cobrem remoção de
vínculo, aprovação na administração global, edição de avisos e comparação de
cinco tipos de proposta sem acesso cruzado entre residências. O último
detectou a necessidade de foco por teclado na área rolável a 320 px. Após o
ajuste, esse cenário e a recuperação de proposta após perda da resposta
passaram novamente.

A verificação posterior reproduziu uma lacuna quando a aprovação revogou o
vínculo da própria pessoa e a resposta se perdeu. A tela retirou os dados
administrativos, mas o caminho de consulta da decisão desapareceu.

O diálogo de confirmação avisa quando aprovar pode retirar a própria
permissão de administrar. Nessa situação, a aba guarda somente a referência
da tentativa e a contagem de consultas. A página de acesso encerrado oferece
o atalho para Minha conta. Ali, a pessoa pode consultar a mesma decisão em
um diálogo compartilhado. A recuperação utiliza a autorização da sessão
original prevista no contrato. Propostas comuns continuam no próprio painel.

Seis execuções em Chromium e WebKit de iPhone passaram sem retentativa.
O teste da própria revogação confirmou o bloqueio da listagem e da consulta
por outra sessão da mesma conta. Na sessão de origem, a consulta da chave
original retornou a decisão aplicada, conservou a revogação e não reenviou
a aprovação. Depois de concluir e atualizar a página, a oferta de nova
consulta desapareceu. Também passaram o build de produção, TypeScript e o
ESLint dirigido. O ajuste usa o contrato existente e dispensa migration.

Os cenários anteriores de desligamento direto e de resposta tardia de
ficha passaram em quatro execuções nos mesmos navegadores, sem reexecutar
casos. Na primeira rodada, as contas compartilhadas não concluíram a
seleção do vínculo em iPhone. Em Chromium, houve um `ECONNRESET` antes
de capturar a leitura autorizada. O reteste usou contas isoladas e uma
única nova conexão permitida na leitura GET de teste. Preservou as
verificações de autorização, conteúdo reservado e retorno do foco.

As primeiras capturas de 360 e 412 px usavam tipos diferentes de proposta.
A comparação seguinte usou, dos dois lados, a mudança de restrito para
permitido na contagem do estoque da equipe para Joana Castro. No build
anterior à correção, o painel cobriu os 104 px do cabeçalho real. Em 412 px,
as três ações apareciam na mesma linha. A mudança de permissão ocupava
vários cartões de campos separados.

O painel passou a usar a moldura compartilhada de edição abaixo do
cabeçalho e a composição de comparação com valor vigente e proposta.
Em 360 e 412 px, Voltar e Rejeitar ficam acima de Aprovar proposta.
A fonte dos valores é a configuração vigente e a proposta real.
Função conferida, situação, versões e referência continuam disponíveis em
Detalhes da proposta. O cabeçalho real tem duas linhas porque inclui
o seletor de paciente. O laboratório mostra uma linha nessa cena.

A rodada de regressão passou em dez execuções de Chromium e WebKit de
iPhone. Cobriu proposta superada, perda da resposta, revogação do próprio
vínculo, reemissão do convite e leitura de regras de aviso. As capturas
mostraram que, após rolar a página, o fundo ainda desfocava o cabeçalho.
Também mostraram a quebra da comparação em 360 px. O ajuste final fixou
o fundo abaixo do cabeçalho e manteve os dois valores na mesma linha.

A comparação final passou em Chromium, Android e iPhone emulados, sem
retentativa. Em 360 e 412 px, o teste mediu a posição do fundo, a linha
dos valores e os dois níveis de ação do rodapé. Conferiu a abertura dos
detalhes pelo teclado, o retorno do foco e a exceção pessoal efetiva após
a decisão. As capturas estão em `output/playwright/l4-proposal-parity-final-report/`.
Passaram 34 testes unitários da apresentação, build de produção,
TypeScript e lint dirigido. O ajuste dispensa migration.

A lista foi comparada em 360 e 412 px com a mesma concessão de contagem.
O link direto posiciona o título e o filtro abaixo da barra de abas fixa.
O teste conferiu que o botão recebe o clique e que a primeira proposta
termina antes de 300 px a partir do início da seção. O sistema inclui
a faixa horizontal de abas e a edição de função abaixo da lista.

Passaram três execuções visuais sem retentativa em Chromium, Android e
iPhone emulados. As seis execuções dirigidas anteriores em Chromium e
WebKit de iPhone percorreram o histórico de 202 propostas, verificaram o
retorno por Voltar, a busca, os filtros de situação e tipo, o foco e o
descarte ao cancelar. A interface apresentou o resultado da consulta mais
recente mesmo com uma resposta anterior atrasada. As leituras preservaram
propostas, configuração,
vínculos, permissões e estoque. As capturas finais estão em
`output/playwright/l4-proposal-list-viewport-report/`. Build de produção,
TypeScript e lint dirigido passaram. A alteração dispensa migration.

Na revisão seguinte, a faixa passou a revelar toda a aba ativa ao abrir
um link direto, redimensionar a janela ou trocar de aba. Quando os nomes
não cabem juntos, a faixa oferece rolagem manual para os outros destinos.
Em 320 px, a verificação deslocou a faixa manualmente, conferiu a posição
vertical e alternou pelo teclado entre Permissões e Pessoas e propostas.
As três execuções em Chromium, Android e iPhone emulados passaram sem
retentativa e confirmaram a aba ativa íntegra em 360 e 412 px. O build,
TypeScript e lint dirigido passaram. As capturas ficam em
`output/playwright/l4-proposal-active-tab-report/`.

### E10-06 — Regras, avisos e limites de estoque

A área **Regras e avisos** reúne as abas **Regras**, **Avisos** e
**Estoque**. Os endereços anteriores de destinatários e alertas levam à
aba correspondente. O painel de regras mantém separadas a revisão do
balanço, a ciência da requisição, as mensagens e o arquivamento.

Avisos reúne destinatários e regras por evento. A consulta de destinos
mostra se o canal externo aguarda verificação. A edição da regra permite
trocar a função, conferir a disponibilidade por evento, escolher os canais
e ajustar comportamento, arquivo, intervalo e silêncio externo antes de
salvar. A busca e o filtro por função complementam os exemplos do
laboratório. E-mail e WhatsApp aparecem como indisponíveis quando o
evento ou a configuração do ambiente não oferece o canal.
A pessoa e o canal identificam o registro conforme o banco. O painel de
edição conserva essa identificação. A ação **Adicionar** permite cadastrar
outro par de pessoa e canal.

Estoque distingue os limites da Equipe e da Família pela identidade e
unidade do material. A regra acompanha apenas a custódia selecionada.
Inclui a criação para outros materiais do catálogo, ausente no exemplo
com dois limites preenchidos do laboratório.

Destinatários e limites são confirmados diretamente no diálogo. Sair
descarta os campos sem criar rascunho. Após uma resposta perdida, a aba
preserva somente a chave e a contagem de consultas da operação oficial.
O banco confirma o registro ou encerra a chave para bloquear um envio
atrasado. Uma atuação global produz proposta a ser decidida por outro
administrador local. Regras por evento e políticas conservam o contrato
versionado de configuração e usam os modais de resultado de L4. Se a
resposta se perder, a consulta retoma a referência da operação na mesma aba,
inclusive depois de recarregá-la. A aba guarda a chave e a contagem de
consultas. Após duas consultas sem confirmação, o diálogo oferece os detalhes
para copiar. Um conflito de versão solicita a consulta da configuração vigente.

| Migration | Supabase local | Supabase remoto |
| --- | --- | --- |
| `20261124195346` | Aplicada | Pendente |
| `20261124205347` | Aplicada | Pendente |

Dez integrações com Auth real passaram, incluindo preservação dos
movimentos de estoque, rejeição de referência antiga, reenvio idempotente,
fechamento de tentativa sem efeito, decisão local independente e omissão
de dados quando o vínculo ou a residência não autoriza a consulta.
Os dois cenários dirigidos de limites e destinatários passaram em
Chromium, Android e iPhone emulados, sem repetição na rodada válida.
Os testes de destinatários conferiram foco e acessibilidade e capturaram
o produto e o cenário de destino pendente do laboratório a 360 e 412 px.
As capturas foram comparadas nessas larguras. Os editores usam o painel
compartilhado com o cabeçalho do aplicativo visível, título de contexto,
campos na ordem do cenário e rodapé com a ação de gravação.

Passaram as regressões de política da residência, leitura de avisos após
falha, destinatários e limites pelos seletores administrativos, nome curto,
recuperação de proposta, horários de silêncio e matriz de canais. As
alterações visuais finais foram verificadas em build de produção.

A atualização versionada passou em quatro integrações dirigidas com Auth
local. Elas cobrem a política gravada uma vez sob concorrência, a recuperação
do resultado exato após outra alteração, a chave fechada sem efeito e a
proposta de aviso recuperável após decisão local independente.

Quatro cenários dirigidos em Chromium passaram com build de produção.
Incluem retorno de foco, validação de nome curto, versão concorrente,
matriz de canais e aprovação local de proposta. A recuperação passou também
em Android e iPhone emulados. O teste recarrega a aba, consulta duas vezes
a chave original e verifica a oferta de copiar detalhes quando o resultado
segue incerto. Quando o banco confirma a ausência, os campos continuam na
edição aberta para nova confirmação deliberada. A leitura posterior a um
resultado confirmado pode falhar sem invalidar a alteração já registrada.

A [CI publicada de f503dc01][ci-f503dc01] concluiu as duas validações de
código e 901 de 902 integrações. Os navegadores foram pulados por causa da
integração de criação de residência sob troca de contexto. O teste obteve
`57014` por espera excedida antes da recusa esperada, `42501`.
A fixture mantinha o autor da troca entre as identidades bloqueadas pela
criação, o que impedia a gravação da auditoria da troca. A separação do
autor e do responsável na fixture permitiu observar a troca real. O teste
dirigido passou com a recusa esperada e o rollback verificado.

[ci-f503dc01]: https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45473773430

O commit `2b7f8ad7` foi publicado na [PR 8 em rascunho][pr-residence-preview].
O [deploy de Preview][preview-2b7f8ad7] ficou Ready. O endereço configurado
confere com a branch. Supabase, assinatura e confiança de PDF, Web Push e
worker constam no ambiente. A verificação registrou HTTP 200 no login,
runtime, manifesto, service worker e página offline. A consulta de regras
da residência sem sessão retornou HTTP 401.

Preview e produção apontam para o mesmo Supabase, com 362 das 382 migrations
do commit. As 20 pendências impedem validar no Preview as jornadas que
dependem do novo esquema. A consulta não aplicou migrations nem disparou
avisos. O SonarCloud passou e o CodeRabbit pulou a análise incremental.
Na [CI do commit][ci-2b7f8ad7], Linux, Windows e banco passaram. Os sete
grupos de navegador estavam em execução na conferência seguinte.
Em uma conferência posterior, `mobile-1` e `ios-2` já tinham falhado.
Os logs dos dois grupos repetem falhas nas comparações de permissão, na
reemissão de convite e na saída da continuação de acesso. `ios-2` também
registrou overflow de 3 px na preparação local a 320 px e falhas em dois
destinos de aviso. A CI ainda estava em execução nessa leitura.
Na leitura seguinte, `chromium-1` e `chromium-2` também já haviam falhado.
O resultado final incluiu falha em `ios-3`, cancelamento em `mobile-2` e
sucesso em `ios-1`. `chromium-1`, `chromium-2` e `ios-3` registraram um
caso instável cada. A suíte repetiu falhas de navegação de avisos e
arquivamento em mais de um navegador. A validação de tipos, o banco e o
Preview desse SHA haviam passado.

[preview-2b7f8ad7]: https://vercel.com/rmzzfajs-projects/home-care-assistant/GG35HJrDTyAEwQ5wWxsK2reXYoHD
[ci-2b7f8ad7]: https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45486440078

### E10-07 — Catálogo por tipo e confirmação de material

O catálogo apresenta a busca pelo nome e pelos nomes alternativos, os
tipos em abas e a situação do cadastro na própria linha. O painel do material
reúne unidade, precisão, identidade, descrição e ações. A seleção de
situação e a paginação foram mantidas para consultar itens inativos e listas
maiores do que o exemplo do laboratório.

O cadastro, a edição e a adoção partem da referência vigente. A comparação
de possível duplicata abre em modal e permite consultar o item encontrado.
A identificação parecida pode seguir para revisão. Uma colisão exata de
nome ou alias exige identificação distinta, conforme a validação do
catálogo. A mesma identidade conserva a unidade registrada em operações
anteriores. Situação permanece uma ação própria, com motivo.

O formulário guarda seus campos enquanto está aberto. A confirmação
registra o resultado com a chave da tentativa, sem criar uma preparação.
A consulta recupera o resultado original ou encerra uma tentativa sem
efeito. O catálogo mostra a proposta quando a atuação é global. A decisão
local conserva os estoques e registra somente o cadastro correspondente.

| Migration | Supabase local | Supabase remoto |
| --- | --- | --- |
| `20261124212833` | Aplicada | Pendente |

Três integrações com Auth real verificaram gravação única junto a uma
preparação anterior, isolamento da consulta, fechamento de tentativa sem
efeito, edição concorrente e adoção depois de decisão independente.

Passaram os casos dirigidos de Chromium para cadastro, edição, inativação,
adoção na preparação local, recuperação de resposta perdida, foco por
teclado, isolamento de leitura, busca em mais de mil itens e consulta a
recibos anteriores. O cenário E10-07 confrontou a edição concorrente com a
referência real, preservou o preenchimento até nova confirmação e conferiu
estoque e ausência de nova preparação. As capturas da lista e do modal de
duplicata foram comparadas com o cenário de referência a 360 e 412 px.
O campo de busca passou na verificação de espaçamento nessas larguras.

Os commits `e6a407ad` e `8bec6567` foram publicados na PR 8 em rascunho.
O [Preview de 8bec6567][preview-8bec6567] ficou `READY`. O endereço de
aplicação configurado corresponde ao alias da branch. Estão presentes as
variáveis de Supabase, serviço, assinatura e confiança de PDF, Web Push e
worker. Login, runtime, verificação pública, manifesto, service worker e
página offline retornaram HTTP 200. O runtime retornou `ready`.

Preview e produção continuam ligados ao mesmo Supabase. A simulação de
aplicação listou 22 migrations pendentes, incluindo `20261124205347` e
`20261124212833`. O teste público de runtime usa o contrato base e não
valida as jornadas administrativas que dependem dessas migrations. A
migration `20261124063932` exige `targetVersion` ao vincular uma
contingência a um registro existente. A API de produção em `fab595c7`
envia o motivo e o ID do registro, sem essa versão. Aplicar a fila no
banco compartilhado faria o banco recusar essa ação em produção.
A verificação preservou a configuração e o esquema publicados.

O SonarCloud aprovou o Quality Gate do SHA. A revisão automática do
[CodeRabbit][coderabbit-8bec6567] foi pulada porque o serviço não conseguiu
retomar o ponto incremental. A [CI do SHA][ci-8bec6567] estava em execução.
Na leitura seguinte, Linux, Windows, banco e `ios-1` haviam passado.
`chromium-1`, `chromium-2`, `mobile-1`, `ios-2` e `ios-3` haviam falhado.
O log de `chromium-1` voltou a registrar problemas nas comparações de
permissão, na reemissão de convite e na saída da continuação de acesso.
A execução encerrou em falha, com `mobile-2` cancelado. Ela corresponde
ao SHA publicado, anterior a E10-08–E10-10.

[preview-8bec6567]: https://vercel.com/rmzzfajs-projects/home-care-assistant/8VJEV1yXGr9KtEiNDnXQyGHgTh
[coderabbit-8bec6567]: https://github.com/RMZZFAJ/home-care-assistant/pull/8#issuecomment-7084927300
[ci-8bec6567]: https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45500124941

### E10-08 — Situação e sucessor

O painel aberto a partir do cadastro reúne a situação, os saldos por
custódia, o sucessor e o histórico autorizado. Segue a composição do
cenário E10-08 em um painel contextual, com retorno ao material. As telas
de sucessor e de histórico mostram a identidade e os atos reais, incluindo
autor, motivo e instante. A indicação informa as próximas escolhas e a
transferência física continua no fluxo de estoque.

A decisão exige motivo, consulta da referência e confirmação separada.
Saldos, unidades, custódias e fichas conservam suas identidades. Se a
referência mudar, a comparação mostra os saldos usados na decisão e os
atuais, preserva o motivo e exige nova revisão. A retomada de uma
resposta perdida usa somente a chave da operação. A consulta da própria
tentativa exige que a pessoa ainda possa ler a residência e continua
disponível quando perde a permissão de alterar o catálogo.

Passaram 17 integrações dirigidas de identidade e catálogo com Auth local
e quatro cenários em Chromium no build de produção. A verificação
preservou o PDF byte a byte, comparou a referência concorrente, recuperou
a decisão após resposta perdida e confirmou a recusa de nova ação depois
da revogação. O painel foi comparado com o laboratório a 360 e 412 px.

Esta etapa usa a rota e a migration `20261124212833` de E10-07.

### E10-09 — Unidades, apresentações e leitura de código

A tela segue a organização do laboratório em unidades disponíveis,
apresentações dos materiais e consulta de embalagem. Busca, filtros e
paginação atendem aos cadastros reais. O detalhe da unidade informa código,
dimensão, precisão e âmbito. A configuração de precisão apresenta a
restrição da unidade já usada no histórico. A configuração global cria
unidades gerais; a configuração de materiais e apresentações usa o vínculo
local autorizado.

Unidade, precisão e apresentação usam a confirmação revisada e o
resultado da própria tentativa. O preenchimento fica na edição aberta.
O fechamento descarta os campos; a consulta de um resultado incerto
retém a chave da tentativa. A edição de uma versão concorrente conserva
os campos até o usuário conferir a referência atual e revisar de novo.

A apresentação mantém o código textual, a equivalência positiva, o
interruptor de disponibilidade e as versões oficiais em painel próprio.
A consulta da embalagem reutiliza o leitor que atende os wizards.
Câmera, imagem e digitação consultam as apresentações ativas da residência.
O resultado encontrado permite abrir a apresentação; a ausência apresenta
a alternativa de conferir o número ou usar a unidade base. A consulta
preserva documentos, movimentos e quantidades.

Passaram 12 integrações com Auth local e sete cenários dirigidos em
Chromium, entre a rodada inicial e os retestes. A validação cobriu
criação e recuperação sem duplicidade, edição concorrente, foco de
retorno, código duplicado, acesso em leitura, preservação do fator em
ficha emitida e leitura por imagem e digitação com zeros à esquerda.
A câmera negada foi simulada. O teste de layout percorreu cinco
larguras e cores forçadas, com comparação visual a 360 e 412 px.
O reteste final mediu a separação da lupa e do texto nos dois campos de
busca a 360 e 412 px.

E10-09 reutiliza o contrato de `20261124212833`, sem nova migration.

### E10-10 — Histórico oficial e conferência da edição

O histórico abre pelo material ou pela ação de histórico no catálogo,
que permite escolher o material. Os eventos têm agrupamento por dia,
autoria, instante, comparação e referência copiável no detalhe. Erro de
consulta permite dois retestes naquele acesso e cópia dos detalhes. A
reconsulta bem-sucedida confirma a atualização no diálogo compartilhado.

O banco projeta somente fatos oficiais do mesmo paciente e material. A
migration passa a registrar o antes e o depois dos campos de cadastro.
O histórico reutiliza a autoria e as versões nativas de situação e
embalagem. Cadastros anteriores que não tinham essa trilha permanecem
consultáveis pelo cadastro atual e pelos atos oficiais que já existem.

A central de comprovantes saiu da navegação comum e a rota da tela foi
retirada. A leitura técnica permanece restrita ao titular e escopo
originais. Na apresentação, resposta perdida consulta a mesma chave.
Quando o servidor confirma a ausência, a edição aberta mantém os campos
e permite uma nova confirmação. Uma consulta confirmada recupera a
versão original, inclusive depois de uma atualização posterior.

| Migration | Supabase local | Supabase remoto |
| --- | --- | --- |
| `20261124232228` | Aplicada, 385 versões | Pendente |

A simulação de publicação listou 23 migrations pendentes no remoto
compartilhado. O destino continua sujeito à verificação conjunta de
Preview e produção registrada em E10-07.

Passaram 19 integrações de histórico, situação e apresentações com Auth
local e 17 testes unitários de autenticação e retorno. Seis cenários
dirigidos passaram no Chromium entre a rodada e os retestes. Eles
conferiram a comparação de versões, a cópia da referência, o limite de
retentativas, a recusa de leitura fora do escopo e os dois resultados da
consulta de uma edição. As capturas de 360 e 412 px foram comparadas com o
laboratório. O botão de atualização ficou visível ao abrir o painel.

### Revisão de E10 — Histórico de permissões e jornadas administrativas

A [PR 8][pr-l4-history] em rascunho recebeu os commits `4e7494ca`,
`6bb334dc` e `cf840b8b`. O [Preview deste SHA][preview-cf840b8b] ficou
`READY`. As variáveis de aplicação, Supabase, PDF, Web Push e worker
estavam cadastradas no destino. O endereço do deploy e o alias da branch
retornaram `ready` no runtime. Login, verificação pública e recursos do
PWA também responderam com o conteúdo esperado. O
[SonarCloud][sonar-cf840b8b] aprovou o Quality Gate. A revisão automática
estava habilitada para rascunhos. O [CodeRabbit][rabbit-cf840b8b] pulou a
revisão incremental.
A [CI de cf840b8b][ci-cf840b8b] concluiu as validações de Linux e Windows
e o job de banco. Os sete jobs de navegador estavam em execução na
conferência.

A simulação de migrations confirmou 23 versões pendentes no banco
compartilhado. A migration `20261124063932` continua exigindo uma
versão do registro que a aplicação de produção em `fab595c7` ainda
não envia. Os testes de runtime comprovam a configuração base do Preview.
As jornadas dependentes das migrations aguardam um destino compatível.

A [CI anterior][ci-8bec6567] confirmou falhas repetidas nos navegadores
após a concessão de exceções. A abertura de Histórico de permissões
levava às propostas. A referência aprovada abre um painel na matriz e
compara os valores gravados. O painel agora consulta as autorizações
aplicadas na residência, com paginação, autoria, instante e antes/depois.
Relatos da família aparecem com comparação própria quando o ato registrou
esses valores. Registros sem comparação conservam os dados do ato e
informam a indisponibilidade. A consulta usa a API e a RPC existentes.
O ajuste usa o esquema existente.

Os testes de catálogo e reemissão passaram a usar os controles vigentes
de descarte e a proposta aguardando aceite. A checagem de reemissão
continua comparando as duas URLs, recusando o token anterior e verificando
que continua havendo um único convite sem vínculo criado.
Passaram nove execuções dirigidas, três por projeto Chromium, mobile e iOS,
sem repetição automática. A reemissão passou nos mesmos três projetos em
rodada separada. A jornada administrativa usou uma conta e uma residência
fictícias isoladas para evitar o acúmulo de vínculos de outras execuções.

O reteste final em Chromium passou no build de produção local. As
capturas de produto e laboratório a 360 e 412 px confirmaram o painel
abaixo do cabeçalho, o comparativo em linha e o botão Voltar no rodapé.
O sistema mantém no cabeçalho o seletor de paciente aprovado em L1.
O teste também verificou ausência de rolagem horizontal, a posição do
fundo do painel após rolar a matriz, o retorno de foco e a recuperação
de erro na consulta. O axe executou nas duas larguras sem violações.

[pr-l4-history]: https://github.com/RMZZFAJ/home-care-assistant/pull/8
[preview-cf840b8b]: https://vercel.com/rmzzfajs-projects/home-care-assistant/H1jMwoMGzcNH97sy2QD4hRCjMNup
[sonar-cf840b8b]: https://github.com/RMZZFAJ/home-care-assistant/runs/138866692873
[rabbit-cf840b8b]: https://github.com/RMZZFAJ/home-care-assistant/runs/138866169285
[ci-cf840b8b]: https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45513184461

### Revisão de E11-04 — Painel de aviso e retorno à central

A central, o sino e a visão geral usam o mesmo painel de aviso com
identificação do paciente, data, situação de leitura e destino específico.
O painel mantém o cabeçalho da aplicação visível e os botões no rodapé.
A área Na ficha apresenta a tarefa que ainda consta no contrato de
avisos. O painel usa os valores vindos da consulta autorizada.

Ao fechar na central, o foco retorna à linha. Se o aviso for retirado
porque perdeu acesso, o foco vai para a busca. A abertura do destino
consulta novamente a permissão. O painel da central separa a leitura
da marcação como vista. A abertura explícita pelo sino conserva a
marcação existente sem registrar ciência ou concluir a ação da ficha.

Os testes de compra, plantão e sino passaram a abrir o painel antes
da navegação. A referência visual da central foi atualizada para E11-04
do laboratório v2. A regressão de plantão confirma o paciente, a
referência e o fuso de origem, além de reapurar o balanço e o alerta de
estoque sem alterar fatos operacionais. O ajuste usa o esquema existente.

As capturas do painel a 360 e 412 px mostram identificação, estado de
leitura, autoria, tarefa e rodapé na mesma sequência do laboratório.
O painel exibe o evento e o instante registrados pelo sistema. O cabeçalho
mantém o seletor de paciente de L1. O axe passou nas duas larguras na
central e no painel, e a área rolável ficou dentro da largura do aparelho.

O build de produção local e 41 testes unitários de navegação e consulta
de avisos passaram. Sete cenários em Chromium passaram sem retentativa
entre as rodadas. A compra verificou a segunda leitura de autorização,
o retorno para a mesma busca e a ausência de escrita de visto na central.
O sino preservou a exclusão de silenciosas antes da paginação. As
auditorias da central e da tela Mais foram separadas em dois casos,
mantendo as larguras, verificações de acessibilidade e destinos.
Os avisos de compra e de plantão passaram também nos perfis mobile e
WebKit de iPhone, com quatro execuções sem retentativa.
As três verificações de central, Mais e sino passaram em Chromium e
WebKit após isolar as contas fictícias dos vínculos acumulados em
rodadas locais. A parte do sino manteve dois pacientes, com ausência
confirmada do aviso no outro vínculo e retorno ao aviso original.

O [iOS-3 publicado][ci-cf840b8b-ios3] terminou com 197 aprovados, quatro
falhas e dois casos aprovados apenas na segunda tentativa. A execução é
do commit anterior a estes ajustes. Ela ainda aponta as regressões de
senha e OTP e do cartão de arquivamento. Os dois casos que passaram após
repetição cobrem recuperação de confirmação da agenda e a comunicação
entre duas sessões durante ciência e compartilhamento.
No caso de arquivamento, a recusa ocorreu ao restaurar a própria
permissão depois de revogá-la. A proteção de L4 recusa essa forma de
autoelevação. A reprodução com um administrador distinto segue pendente.

[ci-cf840b8b-ios3]: https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45513184461/job/138881089378

### Revisão da CI publicada e correções de recuperação

A [CI de cf840b8b][ci-cf840b8b] terminou com as validações em Windows
e Ubuntu e o job de banco aprovados. As seguintes contagens vêm do
resumo do Playwright. O limite de tempo interrompeu o segundo job
mobile antes do resumo final.

| Job | Aprovados na primeira | Aprovados na segunda | Falhas nas duas |
| --- | ---: | ---: | ---: |
| Chromium 1 | 301 | 0 | 6 |
| Chromium 2 | 301 | 0 | 6 |
| Mobile 1 | 302 | 0 | 5 |
| Mobile 2 | Incompleto | Incompleto | Incompleto |
| iOS 1 | 204 | 1 | 0 |
| iOS 2 | 198 | 0 | 8 |
| iOS 3 | 197 | 2 | 4 |

Os três casos intermitentes foram a área de clique do botão de ciência
do cancelamento de COM, a recuperação da confirmação da agenda após
recarregar e a preservação da justificativa de uma REQ concorrente.
A aprovação na segunda tentativa deixa a primeira falha registrada.
O limite dos dois jobs mobile passou de 55 para 70 minutos. A seleção
de testes, as divisões por navegador e o limite de Chromium continuam
sendo os da matriz verificada.

No arquivamento, outro administrador local retira a exceção.
O teste confirma a recusa da autoelevação, a contagem no painel, o
resultado nas duas rotas e a mesma emissão na repetição da chave.
O teste de senha checa a abertura do diálogo obrigatório após login
de uma identidade isolada com fator real, bem como os campos de senha
e OTP. O teste de continuação usa a rota vigente, altera o destino
na mesma aba e libera a resposta antiga antes da leitura autorizada
do novo destino.

A consulta de configuração em segundo plano preserva o aviso de que
a regra foi registrada quando só a leitura posterior falha. Uma
perda de autorização ainda retira os dados. A preparação da residência
alinha a orientação à esquerda e a atualização à direita, na linha
seguinte nas larguras de celular da referência. O exercício visual
foi separado da jornada de criação, adoção e estoque, que conserva
a comprovação de que a atualização é somente leitura.

O build de produção, o TypeScript e o ESLint dos arquivos conferidos
passaram. O OTP, a continuação, o arquivamento e o erro de consulta
após o registro passaram em Chromium e WebKit de iPhone sem retentativa.
As quatro execuções de preparação passaram nos mesmos navegadores e
conferiram acessibilidade, rolagem e ausência de estouro horizontal.
As capturas de 360 e 412 px confirmam a posição dos dois controles.
O cabeçalho compartilhado e os campos adicionais de cadastro fazem
a seção Áreas da preparação começar abaixo do recorte inicial no
produto. No laboratório, o título da seção já aparece nesse recorte.
Estes ajustes não exigem migration. O resultado da CI e do Preview
do SHA já publicado continua sendo o de `cf840b8b`.

### E12-02 — Áreas visíveis na primeira tela

Uma verificação antes da alteração reproduziu, no build de `e48a1445`,
o título da lista cortado pelo limite da área rolável. O cartão inicial
seguiu a sequência do laboratório, com orientação, paciente e instante
da consulta. A situação do cadastro e o fuso de referência passaram
para Conferência física e continuidade, com os mesmos valores da API.

As capturas em 360 e 412 px mostram o título Áreas da preparação
acima do rodapé, com a rolagem na posição inicial. O teste mede o
título inteiro dentro da área rolável e a posição dos dois botões.
O cabeçalho e a navegação continuam sendo os componentes compartilhados.

Os quatro cenários da preparação passaram em Chromium e WebKit de
iPhone, oito execuções sem retentativa. Incluíram a jornada de adoção e
estoque, a atualização somente de leitura, a recuperação de consulta,
a recusa de acesso global e a comparação responsiva de 320 a 1440 px.
O build de produção, TypeScript e os lints dirigidos passaram. O
incremento não exige migration e ainda aguarda CI no SHA candidato.

### Requisição — Foco ao voltar da ficha relacionada

O artefato de iOS da CI publicada mostrou a justificativa vazia depois
de outra sessão registrar ciência da REQ. O ensaio dirigido demonstrou
uma falha de foco ao sair da ficha relacionada. O botão de origem já
tinha recebido foco, mas um segundo retorno, agendado para o quadro
seguinte, tirava o foco da justificativa depois de ela ser selecionada.

O painel usa a restauração de foco do diálogo compartilhado, com o
botão de origem como alvo. O teste de E04-03 pausa o relógio no
fechamento, verifica o retorno ao botão, foca a justificativa e avança
dois quadros. A verificação reproduziu a falha no build anterior e
passou com a correção. Consultar e fechar a ficha preserva o estado
do preenchimento e a revisão independente dos materiais solicitados.

O teste com duas sessões usa contas isoladas com Auth local real.
Ele verifica que a justificativa habilita a ação antes da ciência da
família e permanece preenchida depois da atualização. A escolha da
preferência de ciência ainda percorre a interface, agora pelo teclado.
O mesmo preparo de dados serve à regressão da matriz móvel e da proposta
global aprovada por um administrador local distinto.

Os três cenários passaram em Chromium e WebKit de iPhone, em seis
execuções sem retentativa. Duas verificações adicionais em Chromium
confirmaram o retorno de compras e entregas vinculadas e a preservação
da quantidade em edição na COM. O build de produção, TypeScript e os
lints dirigidos também passaram. O ajuste dispensa migration e a CI
remota do candidato ainda depende da sua publicação.

### Agenda — Confirmação durante uma falha de acesso

Na CI publicada, a primeira execução do cenário de recuperação da
agenda terminou com o painel pendente. A segunda passou. Com uma
conta isolada e a verificação da resposta do GET pela chave da
tentativa, o caso completo passou três vezes em WebKit local.

O ensaio com atraso controlado encontrou uma corrida no mesmo fluxo.
O banco respondeu à consulta no ensaio, e a entrega do resultado
ao navegador ficou retida. Uma falha 503 na consulta de
contexto fechou a tela. Ao voltar, a tela recuperou a referência local.
Na versão anterior, a resposta do painel já encerrado apagava essa
referência sem apresentar o resultado à tela reaberta.

A leitura só altera a referência enquanto o painel que iniciou a
consulta pertence ao contexto atual. A nova tela preserva a mesma
chave e pode consultar o registro sem repetir o comando de alteração.
O teste confirma a referência intacta após a resposta antiga, a
consulta seguinte bem-sucedida e um único ato gravado.

Passaram oito execuções locais em Chromium e WebKit de iPhone,
sem retentativa. Elas cobriram a recuperação da própria confirmação
sem leitura da agenda, a recusa de recibo divergente, a resposta
atrasada e o reenvio somente após ação explícita. Passaram também dez
testes do contrato, build, TypeScript e lints dirigidos.
O incremento dispensa migration.

### Ciência do cancelamento — Ação visível durante a consulta

O artefato de iOS-1 de `cf840b8b` mostrou o botão de confirmação da
COM focado sob a navegação inferior. A verificação dirigida reproduziu
no WebKit de iPhone, a 320 px, o deslocamento do botão enquanto uma
consulta de ciência estava em andamento.

A tela reposiciona o botão quando ele está focado e encoberto pela
navegação. Durante a consulta, nenhuma confirmação é enviada. Quando
a pessoa rola para outra parte da ficha, a atualização em segundo
plano preserva a posição de leitura.

Seis execuções em Chromium e WebKit de iPhone passaram sem retentativa
com contas isoladas e Auth local. Os cenários de REQ e COM verificaram
a recusa de escrita, a recuperação após perda da resposta, a ausência
de confirmação duplicada, os registros anteriores e o PDF emitido.
Também passaram seis testes unitários, o build de produção, TypeScript
e os lints dirigidos. Houve uma ocorrência local de `DATABASE_UNAVAILABLE`
no painel durante a rodada, sem interrupção das jornadas. O ajuste
dispensa migration.

### Publicação de L4 e verificação do Preview

A [PR 8][pr-l4-history] continua em rascunho. O push de 11 commits levou
a branch de `cf840b8b` a `9f6b247e`, sem incluir novas migrations.
O [Preview de 9f6b247e][preview-9f6b247e] ficou `READY` nesse SHA.
A configuração efetiva usa o alias da branch e o Supabase vinculado.
As variáveis de aplicação, Supabase, serviço, assinatura e confiança de PDF,
Web Push e worker estavam cadastradas. Web Push estava habilitado, com
Google e envio pela Meta desativados. A conferência dispensou alteração
de configuração.

Login, verificação pública, manifesto, service worker e página offline
retornaram HTTP 200 com o conteúdo esperado no deploy. A chave pública
do Preview consultou com HTTP 200 o contrato base do banco, protocolo 1
e esquema 2. A verificação cobriu o acesso às rotas públicas e o contrato
base. O Preview e a produção usam o mesmo projeto Supabase, com 362 das
385 migrations da branch. As jornadas que dependem das 23 versões
restantes exigem um esquema compatível. O banco remoto foi apenas consultado.

O [SonarCloud][sonar-pr8-preview] aprovou o Quality Gate de `9f6b247e`.
O [CodeRabbit][rabbit-pr8-preview] pulou a revisão incremental mesmo com
as revisões automáticas habilitadas para rascunhos. O bot indicou a
revisão completa sob pedido. As validações de Linux, Windows e banco
da [CI][ci-9f6b247e] estavam em execução na conferência.

Na conferência seguinte, passaram Linux, Windows, replay das migrations
e as 911 integrações do job de banco. Os sete jobs de navegador foram
iniciados. Três passaram, dois falharam e dois foram cancelados. No iOS,
a comparação de concessão e o título das áreas da preparação falharam
nas duas tentativas. No Android, o diálogo de erro da central de avisos
já estava aberto quando o teste tentou acionar o botão atrás dele.
No iOS houve uma repetição bem-sucedida de apresentações. No Android,
verificação pública e escala também passaram na repetição.

A [CI de 77fdce48][ci-77fdce48] terminou com Linux, Windows e banco
aprovados. Cinco dos sete segmentos de navegador passaram. O Android 2
falhou duas vezes porque o diálogo de erro da central de avisos já bloqueava
o botão de atualização. O iOS 2 repetiu a falha da comparação da concessão
e a do título das áreas da preparação. Dois testes passaram na segunda
tentativa no iOS. Foram o descarte de edição do catálogo e a reabertura do
painel de Push depois de recarregar a aba original numa sessão trocada.
O SonarCloud aprovou o SHA. O CodeRabbit pulou a revisão e o
[Preview de 77fdce48][preview-77fdce48] ficou pronto.

No ajuste local, as comparações da concessão e da preparação passaram no
WebKit. A Central técnica abriu com o perfil global de grande volume e
capturou as duas larguras antes de exceder o orçamento na auditoria de
acessibilidade. Para a nova rodada, o botão de atualização recebeu a
largura compacta e o alinhamento à direita da v2. Os testes de avisos e
Central mantiveram as mesmas verificações com tempo total ampliado. O
teste de Push traz a aba original ao primeiro plano antes de recarregar.

Os sete retestes passaram sem retentativa no relatório
`output/playwright/l4-final-regressions-report`. O Android concluiu as
quatro larguras e a leitura autorizada da central de avisos. O WebKit
confirmou o descarte no catálogo, a reabertura do Push após troca de
sessão e a Central técnica com comparação em 360 e 412 px, auditoria
responsiva e ausência de gravações. O botão de atualização fica alinhado
à direita. A Central mantém o acesso a Outras áreas e usa a navegação
global do produto, sem atalhos operacionais de paciente no rodapé.
Também passaram 39 testes unitários de autenticação, destino recente,
contingência e monitoramento e o verificador das 84 migrations históricas.

Na revisão local do candidato, TypeScript e Markdown passaram. A suíte
unitária completa aprovou 1.129 casos e registrou 22 limites de tempo
excedidos durante execução concorrente com as verificações estáticas. Os
11 arquivos afetados foram repetidos com um worker e concluíram os 69
casos dentro dos limites originais. A conferência do ESLint apontou
artefatos gerados de `.generated` e `supabase/.temp`. A configuração
passou a excluir esses dois diretórios, que já eram ignorados pelo Git.
O comando completo de lint passou depois desse ajuste.

A conferência do ambiente mostrou 362 migrations no Supabase remoto e
produção em `fab595c7`. O projeto ativo ainda não possui branch de banco
para Preview. O teste completo precisa de um destino autorizado com as
23 migrations da branch, incluindo a verificação da versão de referência
de contingência.

A reconferência por versão confirmou as 362 migrations remotas na árvore
Git e encontrou somente as 23 migrations de L4 no local. O Preview
consultado na mesma rodada continuava `READY` em `77fdce48`.

Na [CI de 893474d8][ci-893474d8], passaram as validações de Linux, Windows,
banco e o segmento Android 2. Seis segmentos de navegador reprovaram.
Sete cenários distintos continuaram falhando após a segunda tentativa.
Quatro outros passaram somente na segunda tentativa. SonarCloud e Vercel
aprovaram esse SHA. CodeRabbit pulou a revisão.

- A entrada com resposta antiga retida, o seletor global de paciente único e
  a recuperação do login passaram a exercitar a consulta de entrada e os
  controles da interface atual.
- A troca de perfil preserva o foco de quem já navegou entre as opções. O
  teste do PDF da REQ e o de revogação de vínculo aguardam a confirmação
  da troca pela API e a mudança do contexto exibido.
- Andamentos e fichas vinculadas mantêm a consulta aberta durante a
  atualização da mesma lista. Uma negativa do servidor retira o resultado.
- Em telas estreitas, o rodapé da declaração reserva mais espaço para a
  ação principal. A auditoria do relato confirmado começa no topo da página
  de 320 px. O botão de filtros recupera o foco após a consulta, quando a
  sobreposição já foi encerrada. O teste verifica o alvo do toque. A
  validação da lista aguarda a consulta antes de retirar a interceptação.

Os retestes locais aprovaram 15 combinações de cenário e navegador em
Chromium, Android e iOS, após os ajustes, com retentativas desabilitadas.
Os relatórios estão em `output/playwright/l4-ci-893-repairs-report` e
`output/playwright/l4-ci-893-final-report`. A segunda rodada aprovou os
quatro casos que ainda falharam na primeira, repetiu a confirmação de
consumo em 320 px e verificou o submenu e a navegação pelos filtros.
O build de produção, o lint dos fontes afetados e a proteção das 84
migrations históricas passaram. As correções dispensam migration e
dependem da CI da PR para validação do novo commit.

[preview-9f6b247e]: https://vercel.com/rmzzfajs-projects/home-care-assistant/E8HKkexPmqtPL6jXUY5RTg2jgVjv
[sonar-pr8-preview]: https://sonarcloud.io/dashboard?id=RMZZFAJ_home-care-assistant&pullRequest=8
[rabbit-pr8-preview]: https://github.com/RMZZFAJ/home-care-assistant/pull/8#issuecomment-7084927300
[ci-9f6b247e]: https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45548755726
[ci-77fdce48]: https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45556810328
[preview-77fdce48]: https://home-care-assistant-kxfvghku7-rmzzfajs-projects.vercel.app
[ci-893474d8]: https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45683741967
