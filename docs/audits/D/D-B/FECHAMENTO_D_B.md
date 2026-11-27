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

**Documentos.** DOC-A está implementado no escopo aprovado de aparência e
geração. DOC-B tem os complementos de BAL, COM, DEV, cancelamento e vínculos.
DOC-C.2–5 e o escopo técnico de DOC-D estão integrados. DOC-C.1 continua
adiado. A amostra em aparelho, a impressão, a leitura do PDF com tecnologia
assistiva e a conferência humana fazem parte da homologação. A assinatura
técnica e a TSA interna aprovadas têm evidências próprias. A confiança de
terceiro e a assinatura pessoal ficam em seus respectivos escopos.
[Especificação documental][pdf] e [política de custódia][signing].

## Revisão da PR 8

Foram conferidas 45 discussões em linha, oito submissões de revisão e quatro
publicações gerais de acompanhamento. Das 45 discussões, 20 já estavam
resolvidas, 11 receberam resposta por tratarem de controles do laboratório
L3 e 14 receberam resposta com a correção já presente no candidato. Essas
25 discussões foram encerradas individualmente no GitHub. As publicações
gerais registram execução ou disponibilidade dos serviços.
[Resposta consolidada na PR][review-response].

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
  descritas acima. O commit seguinte reúne as correções dos testes e
  precisa ter o próprio resultado de CI conferido.

- **Qualidade do código.** O SonarCloud aprovou o gate de `e783f6c5`, com
  0,9% de duplicação no código novo. A consulta encontrou três apontamentos
  abertos. Os dois `S6853` motivaram a associação explícita do nome e do
  texto de ajuda das opções de apresentação e ciência. O `S7773` foi
  atendido no auxiliar de TOTP usado em testes. Uma amostra isolada
  reproduziu o `S6853` no padrão anterior e passou com o novo padrão. Os
  três testes de perfil, ciência e MFA passaram em Chromium sem retentativa.
  A análise de `ff786c9d` passou e a consulta do código novo retornou zero
  apontamentos em aberto.
  O gate e a lista de apontamentos devem ser renovados para o SHA final.
  A revisão abrangente da duplicação continua adiada. [SonarCloud][sonar] e
  [triagem Sonar][quality].

- **Banco local e remoto.** 385 migrations no repositório, desenvolvimento local
  nesse baseline e as mesmas 385 versões registradas no Supabase compartilhado
  de testes, até `20261124232228`. As 23 de L4 foram aplicadas. Nenhuma
  pendência de versão foi identificada. A correção desta revisão usa o contrato
  vigente. Reconciliar novamente caso entre migration depois desse
  levantamento. [Registro dos ambientes][execution].

- **Preview autenticado.** O Preview de `e783f6c5` ficou em estado Ready. A
  conta sintética entrou, escolheu o vínculo e consultou runtime, perfil,
  catálogo, histórico e contingência. A lista de referências trouxe 22 REQ com
  versões positivas. A consulta sem sessão recebeu 401. Repetir no Preview do
  SHA final. O dossiê consultado estava vazio e não houve escrita de negócio
  nessa verificação remota. O deploy de `ff786c9d` também ficou pronto.
  [Deploy consultado com sessão][preview] e [deploy de ff786c9d][preview-ff].

- **Saúde e desempenho.** O Advisor de saúde não apresentou lint na consulta. O
  alerta histórico de autorização Realtime indicou p90 de cerca de seis
  segundos em 24 h, sem causa isolada. Consultar o indicador recente e
  reproduzir tráfego representativo de acesso e revogação antes de aceitar a
  prontidão operacional. [Monitoramento][monitoring].

- **Matriz e plano de integração.** A etapa 19 permanece em execução.
  Reconciliar `D-B-AC-028` a `D-B-AC-030`, as evidências de DOC-A/B/C/D e as
  reservas aceitas. Confirmar a decisão de merge e conferir o SHA da `master`,
  o deploy publicado, a consulta autenticada e a compatibilidade do banco.

O código de produção ainda era o da `master` em `fab595c7`, com o schema
de teste já adiantado. Nesse intervalo, o vínculo de referência da contingência
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
[preview-17739c93]: https://vercel.com/rmzzfajs-projects/home-care-assistant/14LQs6y27cgmRTjPELN9qonP4VZF
[db-ci]: https://github.com/RMZZFAJ/home-care-assistant/actions/runs/45899139085/job/140180331562
[sonar]: https://sonarcloud.io/dashboard?id=RMZZFAJ_home-care-assistant&pullRequest=8
[preview]: https://vercel.com/rmzzfajs-projects/home-care-assistant/8QdxGRvYgFCEjkUK4hH3bjSjSUhb
[preview-ff]: https://vercel.com/rmzzfajs-projects/home-care-assistant/32pcDuFD1igPCHMooHzM3BMreS22
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
