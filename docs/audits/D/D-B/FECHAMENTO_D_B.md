# Pendências para encerrar D-B e iniciar D-C

Posição de 27/11/2026. A [PR 8][pr8] está aberta para revisão em
`feat/phase-d-continuation`. L1 e L2 chegaram à `master` pela [PR 7][pr7].
L3 e L4 fazem parte da PR 8.

A decisão de integrar a PR, a aceitação visual dos lotes e a liberação para
uso com uma residência real são três marcos. A integração ainda depende do
candidato final e das decisões sobre o que entra nesse fechamento. O piloto e
a liberação operacional continuam pendentes.

## O que precisa de decisão

- **DB-01.** **L2, reversão REQ.** Uma contagem oficial mais recente impede
  reverter o ajuste antigo. O saldo posterior fica preservado.

  Manter a proteção atual ou permitir cancelar a REQ antiga com explicação de
  que a contagem posterior prevalece. Se aprovada a segunda opção, definir o
  texto e provar que os movimentos posteriores também são preservados.

- **DB-02.** **L2, excedente de ENT e DEV.** A divergência física é registrada.
  O crédito inicial limita-se às unidades cobertas pela expedição. As unidades
  acima dela ficam em apuração.

  Definir quem comprova a origem, quem confirma eventual débito e crédito
  adicional e como encerrar casos recusados ou inconclusivos. A regra vale nas
  duas direções e tem efeito em estoque.

- **DB-03.** **L2, extra ainda sem identificação em ENT e DEV.** O
  preenchimento é preservado e a expedição aguarda a identificação.

  Manter a espera ou expedir a parcela identificada, com o extra pendente
  vinculado à mesma operação. Uma mudança exige definir reenvio, recebimento e
  cancelamento da parcela pendente. A liberação da parcela identificada da COM
  já foi aprovada.

- **DB-04.** **L4, arquivos da referência.** O encaminhamento pede para ignorar
  os anexos no Git. A seção 2 do comando mestre pede o versionamento no arranjo
  de L1–L3. A CI usa o HTML aprovado.

  Ratificar a presença dos anexos versionados ou indicar o local versionado ou
  o insumo reproduzível que os substituirá. Até a decisão, o histórico e as
  comparações continuam disponíveis.

- **DB-05.** **L1 a L4, aceite visual.** Há comparações dirigidas e adaptações
  documentadas. Alguns cenários existem somente no produto.

  Aceitar as diferenças descritas no [registro dos lotes](LOTES_EXECUCAO.md) ou
  indicar os casos a ajustar antes do merge. O último recorte de L4 está
  descrito abaixo.

- **DB-06.** **DOC-C.1 e expansão de rascunhos.** O responsável adiou as
  modalidades e superfícies ainda fora do escopo.

  Registrar o adiamento no aceite de D-B. Uma retomada precisa de escopo e
  prioridade próprios.

As perguntas DB-01 a DB-03 correspondem às
[decisões vigentes de L2][l2-decisions] e ao [fechamento da PR 7][previous].
O comportamento atual deve permanecer até a resposta. Se uma mudança for
exigida para o merge, ela entra no candidato e passa pelas verificações
correspondentes. O responsável também pode aceitar o comportamento atual
e levar a mudança para a próxima etapa.

## Execução e lacunas por lote

- **L1, E01–E03.** Entrada e recuperação de
  senha, troca de contexto, visão geral, fichas em abas, Materiais, Andamentos,
  histórico, anexos e ações da ficha. Operações comuns usam sobreposição
  simples. Operações longas usam sobreposição com etapas. A Revisão BAL
  conserva autoria e independência. REQ com quantidade recebida menor exige
  nova avaliação familiar antes de concluir. [V3 e alterações aprovadas][l1].

  A comparação deve usar o HTML mais os comentários posteriores. Convém validar
  em aparelho o acesso com um vínculo, a troca entre residências, os dois
  carregamentos, o menu Mais e o retorno pelo histórico. Filas privadas e
  operações oficiais recuperáveis têm controles próprios. A conferência deve
  verificar que fechar uma decisão curta descarta suas alterações e que fechar
  Andamentos conserva somente o último preenchimento.

- **L2, E04–E06.** Preenchimentos de REQ, ENT, COM e DEV em
  etapas, materiais em lista compacta, menu por item, autosave e diálogo de
  retomada. Estoque atual na equipe, COM com aquisição definida no ato
  correspondente e ENT/DEV em direções próprias. A leitura de código foi ligada
  à conversão cadastrada, com validação de quantidade e recuperação.
  [Comando e v7][l2].

  Decisões DB-01 a DB-03. Conferir a consistência móvel entre listas, extras,
  controles de quantidade, edição a partir da revisão e recuperação. A soma de
  leituras de COM/ENT e a substituição validada na DEV complementam o exemplo
  da v7. A rodada anterior registrou falhas de toque na aba Materiais de
  COM/ENT em iOS e retentativas em DEV e PDF.

- **L3, E07–E09.** Estoque por custódia, histórico e consumo
  do plantão, faltas, agenda e BAL, acervo de fichas e conferência do PDF. O
  produto liga operações a fatos oficiais, testa as negativas de acesso e
  conserva recibos e versões. [Comando e v4][l3].

  O laboratório usa dados simulados para arquivo, saldo, agendas e recibos. A
  PR documenta as diferenças sem alterar o HTML aprovado. O ajuste de
  recuperação da agenda já está no candidato publicado. O SHA final precisa
  passar pela CI. Conferir calendário, mudança de horário, BAL e download em
  aparelho, mantendo o contexto na ida e na volta.

- **L4, E10–E12.** Administração da residência, convites,
  credenciais, permissões, propostas, regras e catálogo. Central de avisos,
  preferências, instalação e atualização. Guias, criação de residência, dossiê
  e conferência independente, Central técnica e continuidade.
  [Comando e v2][l4].

  Decisões DB-04 e DB-05. O Preview confirmou leitura autenticada. O dossiê
  remoto estava vazio nessa sessão. Declaração, conferência, vínculo e
  recuperação foram exercitados localmente com Auth real. A homologação com
  pessoas, dispositivos e provedores permanece aberta.

**Painel de avisos de L4.** A comparação a 360 e 412 px mostrou que o
laboratório dava destaque à tarefa, enquanto o painel publicado trazia o
título do evento. O ajuste local mostra “Sua ciência está pendente” quando
há tarefa de REQ e explica a emissão com dados autorizados do paciente e
da autoria. Entrega, compra ou doação e balanço também recebem títulos
próprios quando têm tarefa pendente. O painel usa o evento registrado nos
avisos sem tarefa. O cabeçalho compartilhado, a exibição da data completa
e a cor azul do marcador de leitura ainda diferem da simulação.
Três casos em Chromium passaram sem retentativa, cobrindo busca, filtros,
paginação, marcação como visto, foco, acessibilidade a 360 e 412 px e
revogação. As capturas ficaram em
`output/playwright/d-b-pr8-e11-notice-detail/`. Os cinco casos da
comparação anterior de avisos, matriz, preferências, dossiê e Central
técnica também passaram sem retentativa.

As jornadas de aviso e recuperação de agenda também passaram em quatro
casos no perfil Android e quatro no perfil iOS/WebKit, sem retentativas.
Os testes verificaram buscas e tarefas, revogação após listar o aviso,
resposta perdida após publicar a programação e encerramento recuperável
de uma tentativa. Relatório em `output/playwright/d-b-pr8-local-mobile/`.

**Documentos.** A [especificação aprovada][pdf] e a
[política de custódia][signing] governam estes pontos.

- **DOC-A.** A Ficha usa a composição V16. As verificações cobrem o
  conteúdo congelado, a autoria, o recorte autorizado e a emissão no
  navegador. [Formato](../../../../tests/integration/approved-pdf-format.test.mjs)
  e [emissão de REQ](../../../../tests/e2e/approved-requisition-pdf.spec.ts).
- **DOC-B.** Os complementos preservam os fatos de BAL, COM, ENT e DEV,
  os atos de cancelamento, a ciência e os vínculos. Os casos incluem
  perda de leitura, concorrência de reserva e preservação do saldo aplicado.
  [Atos e verificações](PDF_LIFECYCLE.md#histórico--doc-b4)
  e [fidelidade](../../../../tests/integration/pdf-fidelity.test.mjs).
- **DOC-C.** A Ficha Ampliada e o relatório de auditoria usam V17. Os
  testes cobrem o período no fuso declarado, a autorização específica de
  cada complemento e a revogação de referências. A simplificação
  DOC-C.1 permanece adiada. [Complemento executivo](OWNER_EXECUTION_SUPPLEMENT.txt)
  e [modalidades](../../../../tests/integration/pdf-modes.test.mjs).
- **DOC-D.** A emissão, a recuperação, o acervo e a verificação dos bytes
  usam o pipeline de assinatura técnica e TSA interna. Os testes cobrem
  reserva única, recusa sem evidência de Storage e revogação antes de
  finalizar. Aparelho, impressão, tecnologia assistiva e conferência
  humana seguem na homologação. A confiança de terceiro, a assinatura
  pessoal e a guarda operacional têm escopos próprios.
  [Emissão](../../../../tests/integration/pdf-issuance.test.mjs)
  e [verificação pública](../../../../tests/integration/public-pdf-verification.test.mjs).

**Confirmação de vínculo em E12-06.** A comparação a 360 e 412 px mostrou
o painel de conferência legível atrás da confirmação. O diálogo usa a
sobreposição compartilhada também quando está sobre o painel. A revisão do
registro e a justificativa aparecem na confirmação. O teste passou de
primeira em Chromium, Android e iOS/WebKit, incluindo a recusa da referência
desatualizada e a recuperação do vínculo sem repetir o ato. Capturas em
`output/playwright/l4/` e relatório em
`output/playwright/l4-link-confirmation-final/`.

### Contratos de L1 a L3 exercitados no candidato

Os casos abaixo passaram no job de banco de `56432679`. Eles verificaram
efeitos e limites dos contratos usados por L4. A comparação visual e os
percursos de navegador têm evidências próprias no registro dos lotes.
[Integração de 56432679](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45970030787/job/140407945091).

| Área | Resultado verificado |
| --- | --- |
| REQ e ciência | Receber quantidade menor manteve a REQ aberta até nova avaliação da família. A reconciliação de acessos simultâneos preservou ciência e estoque. [REQ](../../../../tests/integration/l1-journeys.test.mjs) e [acessos](../../../../tests/integration/document-access-windows.test.mjs). |
| COM e ENT | A COM aceitou a delegação individual da família e recusou identidades sem autoridade local. A parcela pendente permaneceu disponível para validação e gerou um crédito. Na ENT, a revogação retirou a ação de revisão independente. [COM](../../../../tests/integration/purchase-expectation.test.mjs) e [ENT](../../../../tests/integration/delivery-regularization-boundaries.test.mjs). |
| BAL, consumo e agenda | O comentário na revisão de BAL preservou as notas da contagem. Registro e correção de consumo obedeceram às concessões individuais e compensaram o saldo uma vez. A configuração de horários respeitou a autoridade do paciente, as versões e o comprovante. [BAL](../../../../tests/integration/bal-review.test.mjs), [consumo](../../../../tests/integration/team-consumption.test.mjs) e [agenda](../../../../tests/integration/schedule-residence-hours.test.mjs). |
| Catálogo e avisos | A edição conservou saldo, unidade e identidade do material. O histórico aplicou o escopo do paciente. A permissão vigente sobre o destino governou as páginas, a contagem, o detalhe e a marcação como visto. [Edição](../../../../tests/integration/catalogue-preparations.test.mjs), [histórico](../../../../tests/integration/catalogue-material-history.test.mjs) e [avisos](../../../../tests/integration/inbox-notice-authority.test.mjs). |
| Residência e contingência | Confirmações concorrentes da criação resultaram em um cadastro e um comprovante. O vínculo de contingência preservou os fatos físicos, e dois revisores concorrentes deixaram uma única decisão oficial. [Residência](../../../../tests/integration/preparation-guides.test.mjs) e [contingência](../../../../tests/integration/contingency.test.mjs). |

## Revisão da PR 8

Foram conferidas 45 discussões em linha, oito submissões de revisão e quatro
publicações gerais de acompanhamento. Das 45 discussões, 20 já estavam
resolvidas, 11 receberam resposta por tratarem de controles do laboratório
L3 e 14 receberam resposta com a correção já presente no candidato. Essas
25 discussões foram encerradas individualmente no GitHub. As publicações
gerais registram execução ou disponibilidade dos serviços.
[Resposta consolidada na PR][review-response].

A discussão seguinte sobre a quantidade no resumo de rascunho foi
respondida e resolvida. O componente usa a função local de formatação,
que retorna “Quantidade pendente” para um valor ausente. A leitura de
relatos oficiais tem outro contrato. As 46 discussões em linha estão
resolvidas, conforme consulta do GitHub no commit `56432679`.
[Resposta sobre a quantidade][review-draft-quantity].

Entre os 20 encerramentos anteriores estão o filtro e a versão do
arquivamento, a volta ao histórico e o foco, a recuperação da admissão BAL,
o escopo do material, a proteção durante a troca de destino e a normalização
do e-mail no perfil. A normalização de contato foi publicada em
`4fc30699`. Entre os 14 confirmados nesta rodada estão a liberação de vagas
de anexos, a origem do consumo direto, o destinatário do lembrete, o corte
dos totais, a recuperação da agenda sem leitura comum, as admissões BAL,
a duração do ciclo, séries vazias, horários especiais, horário de verão,
referência BAL restrita e normalização da justificativa. Os motivos e as
fontes correspondentes estão nas [discussões da PR][pr8-files].

### Pontos registrados no corpo das revisões

O CodeRabbit registrou mais 19 apontamentos nos resumos, sem discussão
individual para resolver no GitHub.

- Sete pontos do laboratório na primeira revisão. Corte da prévia
  de agenda, chave de histórico filtrado, aviso da importação, foco da busca,
  nomes dos botões compactos, consulta com acervo simulado vazio e retorno ao
  botão Escopo. Pertencem à referência aprovada. O registro dos lotes conserva
  a distinção entre simulação e fluxo real. [Primeira revisão][rabbit-first].

- Dez pontos técnicos na primeira revisão. 1. Decisão de consumo
  só no fluxo legado. 2. Quantidades normalizadas antes do hash. 3. Índice do
  histórico com potencial de bloquear escritas durante a criação. 4. Agregado
  de compras preservado na permissão de estoque familiar, com autorização
  própria para a COM. 5. Trânsito vinculado pelo ID do material. 6. Resposta
  definitiva de erro libera o reenvio de consumo para edição. 7. Consulta do
  PDF respeita o fechamento da gaveta. 8. Conferência reconhece o arquivo mesmo
  quando o código consultado é desconhecido. 9. UUIDs de consumo normalizados.
  10. Teste de replay preserva rascunho posterior. Os itens 1–2 e 4–10 já
  constam no código e na cobertura correspondente. O índice do item 3 já foi
  aplicado. Considerar tempo de bloqueio e execução concorrente ou janela
  controlada para futuros índices em tabelas ativas.
  [Primeira revisão][rabbit-first].

- Na recuperação de agenda, a consulta inicial
  pode retornar resultado desconhecido. A opção de encerrar a tentativa confere
  o recibo sob bloqueio na mesma chave. Sem recibo, avança a revisão privada e
  comprova que a tentativa anterior ficou impedida de gravar. Com recibo,
  retorna o resultado aplicado. A regressão de recuperação preserva os campos e
  impede um envio tardio. O fluxo vigente cobre a recuperação sem criar uma
  nova programação. [Quarta revisão][rabbit-fourth].

- A confirmação anterior reunia o comando revisado com os campos do momento do
  envio. A correção em `ffd266bb` mantém os campos e o comando da mesma
  revisão. A confirmação inicial respeita a versão atual dos horários.
  Uma tentativa já enviada continua recuperável pelo pacote original.
  Build de produção e três casos de Chromium passaram localmente, sem
  retentativas, incluindo resposta perdida com revogação, encerramento
  recuperável e horários da residência. [Quinta revisão][rabbit-fifth].

O último CodeRabbit pulou a nova análise automática pelo volume da PR.
O Copilot informou indisponibilidade de cota. Esses estados estabelecem a
cobertura real das revisões disponíveis. [Linha do tempo da PR][pr8].

## Correções de CI após ff786c9d

- O cenário de histórico de material abriu o modal de PDF durante a
  seleção de Materiais no Android. O outro cenário que falhou ao selecionar
  a aba, no iOS, preservou o foco em Materiais, mas a aba ativa continuou
  em Visão geral. O teste continua usando toque nativo no celular. O ponto
  agora é relativo ao controle, com verificações de estabilidade e de
  destino no momento do toque. A correção também cobre as outras falhas
  de seleção de aba observadas em ENT, COM e BAL.
- A falha de retenção do nome da residência apareceu no primeiro teste
  em iOS da CI e passou na retentativa. A execução local inicial passou
  com a revisão anterior. O teste atualizado confere a disponibilidade
  do formulário, os dois valores antes da comparação, a volta ao primeiro
  plano e a preservação após Continuar. A causa original da perda do campo
  não se reproduziu localmente.
- A agenda conserva o foco ao voltar da edição durante a atualização da
  lista. O botão anuncia que está indisponível e bloqueia a abertura
  enquanto a leitura está pendente. A regressão controla a resposta real
  da consulta e verifica que Enter durante a espera fica sem efeito.
- O teste de consumo aguarda o destino do recibo antes de abrir outra
  rota na mesma página. O sino agora associa o botão ao painel enquanto
  está aberto, cobrindo o apontamento de acessibilidade observado no
  relatório de residência.

A verificação dirigida cobriu 33 casos em Chromium, Android e iOS/WebKit.
O único timeout local foi na comparação visual da agenda em WebKit. O
teste passou a usar um administrador vinculado apenas à residência do
cenário e passou a comparar, em bloco e no primeiro plano, as mesmas oito
propriedades de cada largura. A rodada dirigida de agenda passou nos
três perfis, incluindo iOS/WebKit em 55,9 s. As verificações mantiveram as
asserções e dispensaram retentativas automáticas. Os relatórios estão em
`output/playwright/pr8-ci-45907009621-verify/` e
`output/playwright/pr8-agenda-foreground-report/`.

## CI de 17739c93 e retentativas no iOS

A [CI de 17739c93][ci-17739c93] passou na primeira execução do GitHub.
Banco, Windows, Linux e os sete jobs de navegador passaram. Dos 1.860
casos de ponta a ponta, 1.856 passaram de primeira e quatro passaram na
retentativa do Playwright em iOS. Os três casos que falharam na rodada
anterior passaram na primeira tentativa.

- **Perfil e Push.** O diagnóstico local registrou o toque na aba correta,
  seguido de `mouseup` e `click` fora do botão. O teste do perfil estabiliza
  o foco antes do toque. O caso de recuperação do Push entra pelo endereço
  da aba com uma conta sintética vinculada à residência do cenário.
- **Catálogo.** O teste de inativação espera o fechamento da edição antes
  de abrir Situação e sucessor. A recuperação aguarda o catálogo carregar
  após a recarga e abre a tentativa preservada. O teste de conflito comprova
  o valor digitado antes da alteração concorrente.
- **Consumo.** A verificação dos cursores percorre os 102 registros por
  teclado. Durante essa leitura, o teste suspende a invalidação de fundo
  que no WebKit local reiniciou a lista na primeira página. Depois reativa
  os eventos e abre os filtros com toque nos perfis móveis.

Os 15 casos dirigidos foram validados em Chromium, Android e iOS/WebKit
em duas rodadas. Quatorze passaram na rodada inicial. A paginação teve
uma falha em iOS e passou nos três perfis após o último ajuste, na
primeira tentativa de cada execução. TypeScript, build de produção e lint
passaram. Relatórios em `output/playwright/pr8-retry-fixes-local/` e
`output/playwright/pr8-consumption-pagination-final/`.

O SonarCloud aprovou `17739c93`, com zero apontamentos no código novo.
As consultas autenticadas desse [Preview][preview-17739c93] confirmaram
catálogo, histórico de material, agenda, sino e contingências. O índice de
contingências estava vazio para a conta de homologação. A consulta trouxe
22 referências de REQ com versão. Sem sessão, o endpoint respondeu 401.

## CI de 01708749 e correções nos testes de catálogo e COM

Windows, Linux, instalação limpa, replay e 911 integrações passaram. A
execução de navegador teve 1.858 casos aprovados de primeira e dois na
retentativa do Playwright. A recuperação do catálogo, os filtros de consumo
e a recuperação do Push passaram na primeira tentativa em iOS. O GitHub
executou o workflow uma vez. [CI de 01708749](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45931684378).

- **Cadastro e inativação no iOS.** Na captura, o campo de nome estava vazio
  e a revisão ainda não estava aberta. O teste aguarda o foco, digita o nome
  e confere seu valor antes da revisão. A confirmação continua exigindo a
  resposta do servidor e a leitura do mesmo material após inativação.
- **Conversão da COM no Android.** O teste abre Materiais pelo endereço
  da seção. Confere a quantidade da emissão anterior, o recibo e a ausência
  de crédito duplicado. O toque nas abas continua coberto pelos testes de
  navegação das fichas.

Passaram seis execuções dirigidas do cadastro e três da conversão em
Chromium, Android e iOS/WebKit, sem retentativas. Relatórios em
`output/playwright/pr8-017-catalogue-ready/` e
`output/playwright/pr8-017-presentation-direct/`.

## CI de 392a815b e cabeçalho compacto das fichas

Windows, Linux, instalação limpa, reaplicação das migrations e 911 testes
de integração passaram. Em navegador, 1.859 casos passaram de primeira e
um passou na retentativa do Playwright. O GitHub executou o workflow uma
vez e o SonarCloud aprovou o commit.
[CI de 392a815b](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45940876680).

A captura do Android a 768 px mostrou a identificação compacta cobrindo o
botão Mais enquanto o cabeçalho principal seguia visível. A faixa agora
acompanha a posição do fim do cabeçalho em relação a sua área fixa. A
regressão confere a faixa durante a rolagem, seu recolhimento após
redimensionar e voltar ao topo, e a abertura do menu com ponteiro.
O cenário dirigido e a consulta de origens do estoque passaram de primeira
no Android. O teste completo de PDF atingiu o limite de 180 s nas auditorias
de acessibilidade locais. O caso dirigido usa a mesma ficha histórica em
sessão autenticada. Relatório em `output/playwright/pr8-392-sticky-focused/`.

## CI de 8b6bf68b e correções de catálogo, avisos e contingência

Windows, Linux, instalação limpa, reaplicação das migrations e os 911
testes de integração passaram. Dos 1.863 casos de navegador, 1.860 passaram
de primeira. Dois passaram na retentativa em iOS e um falhou nas duas
tentativas em Chromium. O SonarCloud aprovou o commit.
[CI de 8b6bf68b](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45949012097).

- **Contingência.** A captura mostrou o formulário aberto com o campo de
  arquivo vazio. O teste agora abre o seletor nativo, confirma o arquivo
  selecionado e espera o resultado do envio antes de conferir o dossiê e
  o vínculo.
- **Catálogo.** O formulário aparecia depois da consulta de referência,
  mas a saída da tela de espera solicitava foco de volta ao acionador.
  A devolução de foco acompanha a abertura inteira do editor, até seu
  fechamento efetivo.
- **Avisos.** O cenário de resposta inválida passou a controlar a ordem
  das consultas. A invalidação em segundo plano podia receber uma
  resposta simulada antes do clique e abrir o diálogo de erro. O caso
  mantém as respostas inválidas, a resposta atrasada e as contraprovas de
  preservação dos dados.

No Preview de `8b6bf68b`, os 48 códigos e indicadores de criticidade da
matriz coincidiram com a consulta individual da família feita pelo
administrador. A conta familiar recebeu 403 ao consultar outra pessoa.
As sessões fictícias foram encerradas após as leituras.

O teste de foco reproduziu a devolução prematura antes do ajuste. Os oito
casos dirigidos passaram de primeira em Chromium e iOS/WebKit após as
correções, com build de produção e lint dirigido aprovados. Relatório em
`output/playwright/pr8-8b6-failure-repairs/`.

## CI de 82842f71 e retentativas de navegador

Linux, Windows, instalação limpa, reaplicação das migrations e os 911
testes de integração passaram. Os sete jobs de navegador concluíram com
1.863 casos aprovados. Foram 1.859 na primeira execução e quatro na
retentativa do Playwright. O GitHub executou o workflow uma vez. O
resultado agregado e o gate do SonarCloud passaram.
[CI de 82842f71](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45959577729).

| Job | Primeira execução | Retentativa aprovada |
| --- | ---: | --- |
| Chromium 1 | 311 | 0 |
| Chromium 2 | 309 | 1, preferência pessoal P02 |
| Android 1 | 310 | 1, continuação recusada da lista de relatos |
| Android 2 | 309 | 1, aprovação de parcela em COM |
| iOS 1 | 209 | 0 |
| iOS 2 | 207 | 0 |
| iOS 3 | 204 | 1, reiteração de aviso de falta |

- **Perfil.** A retentativa ocorreu na seleção de **Avisos e aplicativo**.
  Com a consulta em segundo plano retida, o teste reproduziu um
  deslocamento vertical de aproximadamente 66 px. A atualização passa
  a ser anunciada ao leitor de tela sem deslocar as abas. A primeira
  consulta ainda mostra o aviso de carregamento.
- **Lista de relatos.** O teste recebeu o 403 simulado e a captura
  mostrou a lista preenchida. O código descarta o resultado de uma
  continuação quando uma nova atualização a substitui. O caso controla
  as invalidações concorrentes durante as respostas simuladas e continua
  exigindo a limpeza da lista, a revogação real de leitura e a
  preservação dos registros. O cenário de resposta atrasada segue
  verificando a troca de filtros.
- **COM.** No segundo acesso, a captura mostrou **Conferir chegadas**
  disponível na visão geral. O teste usa esse caminho para a conferência
  e mantém a escolha de **Materiais** no acesso da família. A validação
  da parcela, o estoque e o recibo anterior continuam cobertos.
- **Aviso de falta.** O diálogo não estava aberto na captura da
  primeira tentativa. O caso aguarda o foco inicial do cabeçalho do relato e
  usa o controle de toque que verifica o alvo fora da navegação fixa.
  Quantidade, vinculação ao relato e saldo continuam cobertos.

Os 15 testes dirigidos passaram de primeira em Chromium, Android e
iOS/WebKit, com build de produção e lint dos arquivos alterados. A
rodada local incluiu o ajuste visual de contingência que está em commit
separado. Relatório em `output/playwright/pr8-828-browser-fixes/`.
As correções foram publicadas em `56432679` na PR 8.
[CI de 56432679](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45970030787).

Linux, Windows e banco passaram nesse SHA. A integração registrou
911 testes aprovados, sem falhas, cancelamentos ou casos pulados.

O SonarCloud aprovou esse commit. A consulta da PR retornou zero
apontamentos novos abertos ou confirmados. A Vercel confirmou o Preview
desse SHA como Ready. O manifesto, o service worker e os quatro arquivos
públicos responderam com 200. A revisão do worker coincide com o cálculo
feito sobre 845 arquivos do commit publicado.
[Preview de 56432679](https://vercel.com/rmzzfajs-projects/home-care-assistant/3B5iRi9iNToyhfMwhwGcf38Qqz8R).

### Resultado dos navegadores em 56432679

O GitHub concluiu o workflow na primeira execução. Os sete jobs de
navegador e o agregado passaram. Dos 1.863 testes de navegador, 1.859
passaram de primeira e quatro passaram na retentativa do Playwright.
Perfil, lista de relatos, aprovação de parcela em COM e reiteração de
aviso de falta passaram já na primeira tentativa nos jobs em que haviam
falhado antes.

- **Chromium 1, agenda.** O seletor de ações permanecia fechado após
  Enter. O teste aguarda o foco e a disponibilidade do acionador e
  confirma a abertura antes de verificar as ações. A contraprova com
  leitura atrasada continua exigindo o bloqueio temporário.
- **Android 1, histórico.** A coleção final omitiu uma página com 20
  registros. O teste agora acumula os IDs da mesma leitura que verificou
  a ordem naquela página.
- **iOS 1, PDF de doação.** O botão flutuante da ficha cobriu o alvo da
  aba Arquivos. A navegação do teste reposiciona o alvo antes de enviar
  o toque. A emissão, a assinatura e o conteúdo do PDF continuam cobertos.
- **iOS 3, parcelas de COM.** Após recuperar a consulta, o filtro
  permaneceu em 101 após o clique. O teste aguarda o retorno de foco da
  atualização, usa o controle de toque e verifica que a busca ficou vazia
  antes de comparar a primeira página. A auditoria de acessibilidade a
  320 px parte do topo, com todas as regras ativas.

Os quatro cenários foram validados em Chromium, Android e iOS/WebKit. A
primeira rodada local aprovou 11 casos. Em Android, a auditoria de COM
mediu o campo de materiais parcialmente coberto pelo cabeçalho fixo
durante a rolagem. A rodada dirigida após o ajuste aprovou o caso de
parcelas nos três perfis, sem retentativas. Artefatos em
`output/playwright/pr8-564-browser-fixes/` e
`output/playwright/pr8-564-purchase-parcels-final/`.

### Avisos de instalação da CI

A instalação de `56432679` registrou 12 ocorrências reportadas pelo npm,
incluindo dependências afetadas indiretamente. O lockfile publicado
continha `minimatch@10.2.6` em ESLint e TypeScript ESLint e
`re2js@2.8.6` em Markdownlint. Ambas as cadeias entram como dependências
de desenvolvimento. [Aviso de minimatch](https://github.com/advisories/GHSA-g3hv-75wg-m249),
[aviso de re2js](https://github.com/advisories/GHSA-gg6h-894w-4m9c) e
[auditoria do npm](https://docs.npmjs.com/cli/audit/).

ESLint passou a `10.15.0`, TypeScript ESLint a `8.74.0` e
Markdownlint CLI2 a `0.24.2`. O lockfile passou a resolver
`minimatch@11.0.9` e `re2js@2.9.1`. A comparação manteve as entradas de
produção. A instalação limpa local com scripts de ciclo de vida
desabilitados reportou zero vulnerabilidades. ESLint, Markdown e o
verificador das 84 migrations históricas passaram.

Os quatro ajustes dos testes e a atualização das ferramentas foram
publicados em `effbd935`. A CI e o job agregado passaram na primeira
execução do workflow.
[CI de effbd935](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45983780325).

O registro npm retornou zero avisos para as versões do lockfile
publicado. As validações de Linux e Windows passaram na CI, ambas com
zero vulnerabilidades na instalação, 166 arquivos de testes aprovados e
as 84 migrations históricas preservadas. O job de banco passou na
instalação limpa, na reaplicação das migrations e nos 911 testes de
integração. Nos sete jobs de navegador, 1.862 testes passaram de
primeira e um de iOS passou na retentativa do Playwright. Agenda,
histórico, PDF de doação e parcelas de COM passaram de primeira nos
grupos em que haviam precisado de retentativa. O teste de anexo de
contingência também passou de primeira nos três perfis.

Na nova retentativa, o relatório de iOS 1 mostra a lista de relatos e
o texto de busca preenchido. Após voltar do detalhe, o primeiro toque
em **Filtrar relatos** não abriu o diálogo. A paginação dos 102 registros
já havia sido confirmada. A captura e o contexto estão no
[job de iOS 1](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45983780325/job/140466436183).

A falha não reapareceu em cinco execuções locais com o teste original em
WebKit. O ajuste aguarda a retirada do detalhe e o foco restaurado na
lista. A abertura por toque aguarda o foco no botão sem rolar a tela nessa
etapa. Continuam cobertos o toque, a paginação, a busca e os filtros.
O teste ajustado passou duas vezes em cada perfil (Chromium, Android e
iOS/WebKit), sem retentativas, com build de produção, tipos e lint.
Relatórios locais em `output/playwright/pr8-effbd-consumption-baseline.log`
e `output/playwright/pr8-effbd-consumption-fixed.log`.

O ajuste do teste de relatos foi publicado em `b0fd4fbd`. Ubuntu, Windows
e banco passaram nesse commit, com 166 arquivos de testes em cada sistema
e 911 integrações. Os sete grupos do Playwright aprovaram os 1.863
testes na primeira tentativa. O caso do filtro de relatos passou em
Chromium, Android e iOS. O job agregado também passou. O GitHub executou
o workflow uma vez. O SonarCloud e o check do Preview passaram. A
[CI de b0fd4fbd](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45996460517)
reúne a validação do candidato, incluindo os resultados de navegador.

A Vercel confirmou o Preview e
o SonarCloud aprovou o commit com zero apontamentos novos abertos ou
confirmados. O manifesto, o service worker e os quatro arquivos públicos
offline responderam com 200. A revisão do worker,
`ba732f0198b2cb5d07a3d565`, coincidiu com o cálculo feito sobre 845
arquivos da árvore publicada.
[Preview de effbd935](https://vercel.com/rmzzfajs-projects/home-care-assistant/3YvdXagPKeYRnJJEeYMLVu7kA2ip)
e [SonarCloud][sonar].

## Condições para o merge

- **Revisão e decisões.** As discussões publicadas foram triadas. A correção
  da agenda, o painel de avisos e a primeira versão deste quadro já foram
  publicados. Registrar quais decisões DB-01 a DB-06 precisam entrar no
  candidato e quais podem seguir para D-C ou escopo posterior. Conferir os
  novos apontamentos do SHA final.

- **CI do candidato.** Em `ff786c9d`, Windows, Linux e banco passaram.
  Dos 1.860 testes de navegador, 1.857 passaram de primeira, dois passaram
  em retentativa no iOS e um falhou nas duas tentativas no Android. O
  agregado falhou pelo resultado de Android. A CI de `e783f6c5` passou
  com seis retentativas. O banco desse SHA passou na preparação, no
  replay e em 911 testes de integração. As duas execuções usaram uma
  tentativa do workflow do GitHub. As repetições foram do Playwright.
  [CI de ff786c9d][ci-ff786c9d], [CI de e783f6c5][ci] e
  [job de banco][db-ci]. `17739c93` passou com as quatro retentativas
  descritas acima. `01708749` reúne as correções dos testes.
  [CI de 01708749][ci-017].
  `82842f71` e `56432679` passaram com quatro retentativas cada. Todos
  os casos corrigidos entre esses commits passaram na primeira tentativa
  de `56432679`. `effbd935` passou com uma retentativa em iOS 1. O
  histórico acima identifica os casos e os respectivos logs.
  O candidato publicado `b0fd4fbd` passou com 1.863 testes de navegador
  na primeira tentativa e sem nova execução do workflow.

- **Qualidade do código.** O SonarCloud aprovou o gate de `e783f6c5`, com
  0,9% de duplicação no código novo. A consulta encontrou três apontamentos
  abertos. Os dois `S6853` motivaram a associação explícita do nome e do
  texto de ajuda das opções de apresentação e ciência. O `S7773` foi
  atendido no auxiliar de TOTP usado em testes. Uma amostra isolada
  reproduziu o `S6853` no padrão anterior e passou com o novo padrão. Os
  três testes de perfil, ciência e MFA passaram em Chromium sem retentativa.
  A análise de `ff786c9d` passou e a consulta do código novo retornou zero
  apontamentos em aberto.
  O gate de `b0fd4fbd` passou com 0,9% de duplicação no código novo.
  A consulta da PR retornou zero apontamentos novos abertos ou confirmados.
  O gate e a lista de apontamentos devem ser renovados para o SHA final.
  A revisão abrangente da duplicação continua adiada. [SonarCloud][sonar] e
  [triagem Sonar][quality].

- **Banco local e remoto.** A comparação de `b0fd4fbd` com o histórico do
  Supabase compartilhado de testes confirmou as mesmas 385 versões, até
  `20261124232228`. As 23 de L4 estão aplicadas. O desenvolvimento local
  usa esse baseline. [Registro dos ambientes][execution].

- **Preview autenticado.** Em `b0fd4fbd`, a residência fictícia foi
  consultada por uma conta administradora e uma familiar. A matriz e a
  consulta individual retornaram os mesmos 48 códigos e indicadores de
  criticidade. A família recebeu 403 ao consultar outra pessoa. Uma
  consulta sem sessão recebeu 401. As duas contas consultaram perfil,
  preferências, central, sino e guias. A administradora também consultou
  catálogo, histórico e contingências. As 22 referências de REQ
  apresentaram versões positivas. As sessões foram encerradas. Essa
  rodada confirmou leituras. Revisão e vínculo foram exercitados no
  ambiente local.
  O runtime retornou `ready`, com protocolo 1 e esquema 2. O manifesto,
  o service worker e os quatro arquivos offline foram conferidos. O
  worker entregou a revisão `ba732f0198b2cb5d07a3d565`. Os arquivos que
  determinam essa revisão coincidem com os do candidato anterior.
  [Preview de b0fd4fbd](https://vercel.com/rmzzfajs-projects/home-care-assistant/9ixuhYV7GcjH1aR5tddrAAe9yjWZ).

  Os Previews anteriores também passaram pelas consultas dirigidas.
  [Preview de effbd935](https://vercel.com/rmzzfajs-projects/home-care-assistant/3YvdXagPKeYRnJJEeYMLVu7kA2ip)
  e [Preview de 56432679](https://vercel.com/rmzzfajs-projects/home-care-assistant/3B5iRi9iNToyhfMwhwGcf38Qqz8R).

  Em `82842f71`, a Vercel confirmou Ready. Os
  48 códigos e seus indicadores de criticidade coincidiram entre a matriz
  e a consulta individual. A conta familiar recebeu 403 ao consultar outra
  pessoa. As duas sessões fictícias foram encerradas. O manifesto e os
  quatro arquivos públicos do modo offline passaram pela conferência. A
  revisão do service worker foi recalculada a partir da árvore do commit
  publicado e coincidiu com a revisão entregue pela Vercel.
  [Preview de 82842f71](https://vercel.com/rmzzfajs-projects/home-care-assistant/DbN2FyPGfcYVoFTkNzxDNddWi68t).

  No Preview de `01708749`, a conta sintética consultou participantes,
  catálogo, histórico, agenda, preferências, sino, guias e contingências.
  A lista retornou 22 referências de REQ com versões positivas. A consulta
  sem sessão recebeu 401. Repetir a verificação no SHA escolhido para merge.
  [Preview de 01708749][preview-017].

- **Saúde e desempenho.** Em 27/11, o Advisor de saúde retornou zero avisos.
  Houve 12 eventos informativos do Realtime nos logs das últimas 24 h. Três
  inscrições no canal privado da conta sintética terminaram em 861, 133 e
  139 ms. O banco registrou média acumulada de 78,905 ms em 1.060 consultas
  de autorização desde 20/10. A amostra mede o tempo de inscrição do cliente.
  O p90 de seis segundos do alerta histórico continua sem série recente
  equivalente. A prontidão operacional ainda depende da medição representativa
  de acesso e revogação. [Monitoramento][monitoring].

- **Matriz e plano de integração.** A etapa 19 permanece em execução. As
  migrations, as leituras no Preview e a CI foram conferidas em `b0fd4fbd`.
  O fechamento depende da composição do candidato final e do encaminhamento
  das decisões abertas. Após a decisão de merge, conferir o SHA da
  `master`, a publicação, a consulta autenticada e a compatibilidade do
  banco.

Em 27/11, o domínio de produção ainda servia a `master` em `fab595c7`,
com o schema de teste já adiantado. Nesse intervalo, o vínculo da contingência
pode ser recusado porque o cliente anterior envia um contrato mais antigo.
Após o merge, conferir a versão publicada e exercitar o vínculo com dados
fictícios autorizados e a revisão vigente. Se o deploy falhar, avaliar a
compatibilidade do código restaurado com as 385 migrations antes de decidir
o caminho de recuperação.

## Passagem para D-C e homologação

- **DC-01. Piloto e responsáveis** Autorizar início, indicar residência,
  participantes, papéis e substitutos. Definir responsáveis por regularização,
  conferência independente e suporte. Planejar interrupção do piloto e
  contingência quando a execução normal estiver indisponível.

- **DC-02. Validação humana e física** Montar a lista de aparelhos, sistemas e
  navegadores. Exercitar as tarefas dos papéis, leitor de tela, teclado, toque,
  PWA e atualização. Conferir o PDF emitido, a impressão e a consulta pública.
  O S24 já teve evidência pontual de PWA e Push. Os demais cruzamentos exigem
  provas próprias.

- **DC-03. Provedores e transportes** Definir os provedores a ativar e
  autorizar contas, remetentes, destinatários e horários. Verificar Google
  OAuth, entrega de e-mail, WhatsApp e Web Push real nos recortes aplicáveis.
  Conferir sigilo, revogação, fallback e limites dos arquivos já recebidos.

- **DC-04. Backup e restauração operacional** Nomear responsáveis pelo destino
  independente e pela chave. A política aprovada prevê backup diário, cópia
  antes de alteração crítica e retenção de sete diárias e quatro semanais.
  Restaurar em quarentena, conferir banco, objetos, configurações e
  agendadores. Medir RPO de até 24 h e RTO de até oito horas no ensaio
  operacional.

- **DC-05. Custódia e assinatura** Designar custodiante e substituto, validar
  continuidade, rotação, expiração, revogação e recuperação da chave e da TSA.
  Definir o procedimento de conferência externa. ICP-Brasil segue como evolução
  futura.

- **DC-06. Operação e suporte** Responsáveis, tempos de atendimento,
  escalonamento, monitor externo quando autorizado, reconciliação de
  agendadores legados e recuperação de períodos perdidos. Definir volume e
  latência esperados e quem mede as jornadas.

- **DC-07. Liberação e D7** Registrar SHA, schema, configuração, pilotos,
  riscos aceitos, plano de recuperação e responsáveis antes do uso oficial.
  Autorizar provedores adiados e evolução D7 em seus próprios marcos.

O mapa de [etapas 19 e 20][stages] e a [matriz de execução][acceptance]
mantêm os IDs dos aceites. O [plano de piloto][pilot], a
[recuperação][recovery], o [backup][backup], a [custódia][signing] e os
[agendadores][scheduler] detalham as provas da etapa 20. O
[fechamento A–D da PR 7][previous] conserva a origem das decisões.

Para decidir o encerramento, registrar as respostas DB-01 a DB-06, conferir
o SHA final e aprovar o merge. A etapa seguinte começa com responsável,
escopo e critérios acordados para DC-01 a DC-07.

[pr8]: https://github.com/RMZZFAJ/home-care-assistant/pull/8
[pr7]: https://github.com/RMZZFAJ/home-care-assistant/pull/7
[pr8-files]: https://github.com/RMZZFAJ/home-care-assistant/pull/8/files
[review-response]: https://github.com/RMZZFAJ/home-care-assistant/pull/8#issuecomment-7204332892
[rabbit-first]: https://github.com/RMZZFAJ/home-care-assistant/pull/8#pullrequestreview-6014297364
[rabbit-fourth]: https://github.com/RMZZFAJ/home-care-assistant/pull/8#pullrequestreview-6015267320
[rabbit-fifth]: https://github.com/RMZZFAJ/home-care-assistant/pull/8#pullrequestreview-6015574742
[ci]: https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45899139085
[ci-ff786c9d]: https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45907009621
[ci-17739c93]: https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45918970734
[ci-017]: https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45931684378
[preview-17739c93]: https://vercel.com/rmzzfajs-projects/home-care-assistant/14LQs6y27cgmRTjPELN9qonP4VZF
[preview-017]: https://vercel.com/rmzzfajs-projects/home-care-assistant/BHZCJVtmmLULFxEDA7DSceS8XxRm
[review-draft-quantity]: https://github.com/RMZZFAJ/home-care-assistant/pull/8#discussion_r4715288320
[db-ci]: https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45899139085/job/140180331562
[sonar]: https://sonarcloud.io/dashboard?id=RMZZFAJ_home-care-assistant&pullRequest=8
[l1]: L1_IMPLEMENTATION.md
[l2]: ../../../../HCA_L2_COMANDO_MESTRE_CODEX_V7.md
[l2-decisions]: ../../../../HCA_L2_DECISOES_VIGENTES_E_PENDENCIAS.md#14-pendências-materiais-para-renato
[l3]: ../../../../HCA_L3_COMANDO_MESTRE_CODEX_V4.md
[l4]: ../../../../HCA_L4_COMANDO_MESTRE_CODEX_V2.md
[previous]: ../../FECHAMENTO_PR7.md
[pdf]: ../../../documents/03_ESPECIFICACAO_DOCUMENTAL_APROVADA.md
[execution]: LOTES_EXECUCAO.md
[stages]: EXECUTION_STAGES.csv
[acceptance]: ACCEPTANCE_EXECUTION.csv
[quality]: SONAR_TRIAGE.md
[monitoring]: OBSERVABILITY.md
[pilot]: PILOT_AND_CONTINGENCY.md
[recovery]: RECOVERY_RUNBOOK.md
[backup]: BACKUP_PIPELINE.md
[signing]: SIGNING_CUSTODY.md
[scheduler]: SCHEDULER_LEGACY.md
