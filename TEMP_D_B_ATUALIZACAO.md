# D-B — acompanhamento por funcionalidades e etapas

Atualizado em 12 de novembro de 2026, com suporte, acompanhamento de avisos e
recuperação conferidos localmente no lote 6. O fechamento da CI continua aberto.
Inclui a refatoração visual da aplicação e o complemento aprovado
de fichas e PDFs. A fase permanece em execução, sem
liberação para produção.

## 1. Definições e leitura do acompanhamento

- **Critérios:** são 105, sendo 75 originais e 30 complementos da Ordem Mestre.
  Há 96 com implementação e verificações técnicas concluídas e nove parciais.
  Destes 96, 94 têm conclusão local e dois registram reconciliação remota D-A/D-B.
  Os três critérios reabertos pelo acréscimo do S24 fecharam novamente no
  escopo técnico. Os nove parciais conservam parcelas humanas, adiadas ou de CI;
  seus estados não equivalem a nove funcionalidades sem implementação.
- **Etapas 01–20:** identificadores preservados para localizar os requisitos.
  A execução restante está agrupada em seis capacidades na seção 6; as etapas
  não são vinte filas independentes. Um critério pode atravessar vários lotes.
- **Complemento documental:** DOC-A, DOC-B, DOC-C e DOC-D acrescentam quatro
  resultados. Seus percentuais medem somente esse acréscimo, preservando o
  escopo e os resultados anteriores.
- **Concluído localmente /100%:** o escopo indicado foi implementado e
  conferido internamente. A revisão conjunta final e as atividades humanas,
  físicas ou externas ainda se aplicam.
- **Em execução /percentual parcial:** estimativa arredondada de quanto foi
  executado naquele escopo. Não mede prazo, custo ou probabilidade de conclusão.
  Os percentuais não devem ser somados nem ter sua média usada como avanço geral
  da fase. Pontos de uma etapa parcial não recebem conclusão individual sem um
  fechamento registrado.
- **A iniciar /0%:** somente a tarefa ou o novo escopo indicado ainda não tem
  conclusão. Isso não significa que a preparação de todo o recurso esteja em 0%.
- **Responsáveis:** Codex implementa, corrige, testa e documenta. Você decide
  configurações, participação e liberação sob sua responsabilidade.
  Participantes/equipe fazem avaliações de uso; fornecedores participam das
  provas que dependem de seus serviços. Onde um item concluído não repete
  responsável, a implementação e a conferência local são de Codex.
- **Abreviações:** REQ é requisição; COM é compra/doação; ENT é entrega; BAL é
  balanço de estoque. Devolução de materiais tem sentido próprio, equipe para
  família, e não exige uma entrega de origem.

O Modelo Integral continua sendo a aparência da aplicação. Fluent foi
descartado. Os PDFs têm sua própria aparência aprovada; essa referência não muda
o Modelo Integral da aplicação.

**Como acompanhar:** a seção 2 mostra o ponto atual; a seção 3 reúne os
recursos por função, com critérios, entregas e pendências; a seção 4 separa sua
participação e as atividades externas; a seção 5 registra os marcos já
encerrados; a seção 6 é a única ordem de execução do restante.

Os números 01 a 20 e os nomes DOC-A a DOC-D são identificadores estáveis das
etapas e dos acréscimos. Eles permitem comparar uma atualização com a seguinte.
A única ordem atual está na seção 6. DOC-D acompanha os dois primeiros lotes
e DOC-B já entregue é reutilizado, sem quatro silos sequenciais.

Os 105 critérios aparecem uma vez, nos grupos funcionais. O detalhamento de
cada etapa, concluída ou pendente, também fica apenas no grupo da função
correspondente: estado, pontos de entrega e condição de fechamento. O histórico
resume os marcos; a sequência final indica somente a ordem atual e onde
acompanhar cada etapa. Esses níveis medem escopos diferentes.

Este arquivo é a fonte principal do andamento. README e índice orientam a
navegação; contratos explicam o implementado; matriz detalha critérios;
checkpoint conserva evidências históricas. Não é obrigatório repetir o mesmo
relato em todos esses arquivos. O complemento executivo prevalece nos conflitos
de método e rascunhos, preservando as demais decisões.

Cada lote deve atualizar o ponto correspondente, registrando o que fechou e o
que falta. Acréscimos de escopo devem ser identificados; não entram
silenciosamente no primeiro item nem alteram uma conclusão anterior.

## 2. Posição atual

| Acompanhamento | Estado registrado |
| --- | --- |
| Critérios da D-B | 96 verificados tecnicamente; 9 parciais; total de 105 |
| Etapas 01 a 13 | Escopos anteriores e acréscimo S24 conferidos localmente |
| Aparência | 66 composições; acréscimo S24 conferido localmente |
| Operação diária — etapa 06 | 46 composições; conferência conjunta concluída |
| Outras áreas visuais | Três composições e quatro relações restantes fechadas |
| Complemento documental | DOC-A/B/C/D concluídos no escopo local executável |
| Próxima entrega | Critérios finais e validação do candidato publicado |
| Incremento atual | Ícone do aviso Android e análise de Realtime/duplicação |
| Resultado local | 66 composições; 164 relações conferidas |
| Banco | Local e remoto em 242; sem atualizações pendentes |
| CI de 0dbd2ba | Linux/Windows/banco/Chromium passaram; iOS cortado |
| Preview de 0dbd2ba | Concluído na Vercel; produção preservada |
| CI de 4d5e908 | Linux/Windows/banco/iOS-1 passaram; browser em correção |
| CI de 8fc04b8 | Uma falha em iOS-2; demais grupos passaram |
| Preview de 8fc04b8 | Pronto na Vercel, no endereço estável abaixo |
| CI de 7e27795 | Dois casos Chromium falharam; ambos iOS/Mobile passaram |
| Preview de 7e27795 | Pronto; atualização e teste recebidos no S24 |

**Correções do fechamento:** os campos de filtro do estoque conservam a edição
mesmo com atualização em segundo plano. A PWA mantém a aparência aprovada,
confere a origem das mensagens e evita reaproveitar HTML pela rede. Cinco
percursos finais passaram, incluindo estoque/iOS, painel técnico/iOS, Preview
protegido, atualização entre abas e PDF privado/offline. As duas migrations
novas já estão no remoto; onze avisos de consultas de identidade desapareceram.
O Sonar confirmou 27 correções e 13 falsos positivos após conferência de contexto.
Os nove alertas restantes foram aceitos para ferramentas manuais de
desenvolvimento e para a demonstração HTML, com os limites registrados.
Isso preserva riscos conhecidos; não equivale a corrigir esses nove em código.
O Quality Gate continua reprovado pela duplicação de 3,2%. A CI de 8fc04b8
terminou: cinco grupos de navegador passaram, dois com retry; iOS-2 teve uma
falha em uma asserção específica do instrumento. O fallback offline real
funcionou, mas o teste exigia uma interceptação disponível apenas no Chromium.
A correção local mantém cache privado, API, conteúdo e reconexão como controles.

**Acréscimo solicitado no reteste do S24 — concluído localmente, 100%:** botão
de atualização com confirmação, resultado visível e preservação das outras
abas; confirmação clara da inscrição e teste pessoal de Push. A implementação,
os testes pequenos, a autorização real e a conferência integrada de navegador
passaram, incluindo compatibilidade com a orientação offline antiga. As duas
atualizações estão reconciliadas no remoto. A CI do novo commit continua aberta;
o resultado físico informado por você está abaixo. Responsável técnico: Codex.
Os demais ensaios de aparelho seguem com você e participantes, com meu apoio.

**Reteste físico informado por você após a publicação de7e27795:** o S24
atualizou e recebeu o aviso de teste. Esses dois resultados estão confirmados
pelo seu relato. A CI ainda está em andamento; outros aparelhos, cenários de
background e homologação operacional continuam separados.

**Acréscimo posterior — ícone e análise técnica:** o quadrado branco do aviso
Android foi corrigido localmente com o símbolo HC transparente para a barra,
preservando o logo colorido no aviso. Testes dirigidos passaram; publicação
aguarda a CI atual terminar e a aparência física será conferida depois.
Realtime verdadeiro já está configurado. A lentidão de autorização informada
por você está em investigação, sob minha responsabilidade, sem causa isolada
nem correção declarada. A duplicação do Sonar foi explicada; mudanças nessa
configuração aguardam sua decisão. Nenhuma dessas consultas alterou o remoto.

**Correções encontradas pela CI:** dois casos de Chromium falharam. O primeiro
precisava iniciar a conferência visual em posição estável após redimensionar.
O segundo revelou o botão de atualização encoberto pelo menu lateral no
desktop. Ambos foram corrigidos localmente; a recuperação da foto e seis
percursos de atualização/falha nos três navegadores passaram. Os grupos Mobile
e ambos iOS da CI anterior passaram, sem cancelamento. A execução terminou;
o novo commit pode ser publicado e precisará de sua própria CI.
Cada grupo iOS precisou de uma repetição. Os dois pontos do teste foram
corrigidos e os três casos afetados passaram na conferência dirigida do WebKit.

**Resultado utilizável do lote 6:** Administração global → Monitoramento e
suporte reúne visão técnica, continuidade, residências/contas e eventos/política.
As tentativas de avisos são reais, paginadas e sem dados privados dos pacientes.
A conciliação continua exigindo decisão explícita; consultar não reenvia avisos.
Falhas de consulta e confirmações incertas têm recuperação própria, com retorno
de foco mesmo quando o botão da ação deixa de existir.

**Onde avaliar:** use o
[Preview estável da branch](https://home-care-assistant-git-feat-phase-d-i-3d8824-rmzzfajs-projects.vercel.app).
Esse endereço acompanha as atualizações; prefira-o para instalar a PWA.
A autenticação da Vercel continua obrigatória. Historicamente, no Preview de
f3f3fa8, o login respondeu corretamente e informou compatibilidade pronta.
O Preview de7e27795 está READY e recebeu seu reteste de atualização e Push no
S24. Isso não substitui as demais jornadas autenticadas e avaliações previstas.

**Já publicado em 8fc04b8:** as cores declaradas para o navegador,
a instalação e a página pública sem conexão agora seguem o Modelo Integral.
Foram conferidos os metadados, a página em celular, a atualização com duas abas
e o acesso protegido por cookie. O cache continua restrito aos quatro arquivos
públicos. A instalação física
continua sendo uma tarefa sua com apoio de Codex.

**Incremento de editor e revisão:** os avisos indicados do editor foram
tratados, preservando as provas históricas e a rolagem pelo teclado. O comentário
pertinente do CodeRabbit sobre o Windows foi corrigido; o histórico do SHA foi
esclarecido. O acesso ao banco de testes usa executáveis conhecidos, inclusive
na instalação da CI. Tipos, referências Markdown, testes dirigidos e uma
consulta real ao banco local passaram. A CI do próximo commit continua exigida.

Backup e recuperação fecharam no escopo de software: uma nova cópia cifrada foi
autenticada e restaurada isoladamente, com tabelas, arquivos e emissões prontas
conferidos. A agenda permanente e a telemetria dessa cópia continuam desligadas.
Destino externo, custódia operacional e metas de recuperação não foram aprovados.
Os detalhes estão no grupo 3.7; a única sequência restante está na seção 6.

**Resultado utilizável do lote 5:** Guias e ajuda apresenta navegação por
etapas para os seis papéis, preserva o paciente nos encaminhamentos e recusa
respostas de outro perfil. O progresso é reabrível e continua separado dos
atos operacionais. A preparação alcança o diretório completo de pessoas e
conserva os campos quando uma consulta falha. GUI-01 e o ponto 16.3 estão
concluídos tecnicamente no escopo local. A preparação local agora encaminha
pessoas autorizadas aos fluxos reais de catálogo, estoque, pessoas, agenda,
BAL e comunicação. Adoção de material e abertura familiar foram conferidas,
com quantidade, origem e motivo próprios. A consulta distingue zero de acesso
restrito e não atesta conferência física. A contingência agora preserva a
declaração, permite anexar o registro físico e exige outra pessoa competente
para vincular um fato já registrado, sem repetir estoque, ciência ou aceite.
A recuperação sobrevive à recarga pela referência da operação; o formulário
comum não recebe rascunho. A etapa 16 está concluída no escopo de software.

**Lote 4 já encerrado localmente:** aplicativo, avisos e lembretes.
As etapas 11/12/13 fecharam no escopo executável. A escolha de avisos não pode
passar para outra conta ou sessão após a espera da permissão. DOC-C.1 continua
adiado; CI própria, entrega externa, custódia operacional, avaliação humana e
aparelho físico conservam seus gates.

**Resultado do lote 1:** REQ, compra, doação, entrega, devolução autônoma e BAL
foram gerados e assinados pelos fluxos reais de teste, com a aparência aprovada.
Páginas, conteúdo longo, autoria, contexto legado, referências autorizadas e
quantidades foram conferidos. A Ficha cotidiana mantém sua
composição aprovada nas novas emissões; exemplares anteriores são preservados.

**Resultado do lote 2:** Ficha Ampliada preserva materiais, observações e
exceções essenciais; acrescenta seções e período escolhidos. Menções, destaques,
cronologia, comunicações, confirmações, vínculos e acessos estão integrados aos
arquivos. A auditoria exige competência própria e traz identificação nominativa
em todas as páginas. Foram geradas amostras reais assinadas de REQ, compra,
doação, entrega, devolução, BAL e auditoria, com dados fictícios de teste.

**Correção delimitada antes do lote 5:** concluída localmente. O registro de
acesso aguarda a aplicação estar compatível, e sua falha fica no histórico,
sem deslocar os controles. A lista de seleção não sobrepõe sua opção no
WebKit. Os testes de consulta distinguem acesso de alteração operacional; a
conferência de acessibilidade parte de uma posição de rolagem conhecida.
A preparação real dos certificados de teste tem limite próprio, sem mudar
assinatura ou timeout do aplicativo. Passaram 26 percursos móveis e 16 testes
de PDF, tipos e lint dirigido. A CI conjunta continua pendente.

**Relações dos lotes 5/6:** conferência concluída no recorte executável. Das 171,
164 têm comprovação local compatível;
cinco pertencem à apresentação de rascunhos adiada; duas foram removidas por
decisão aprovada. Não equivale a aprovar as 171 integralmente. A próxima entrega
é a validação conjunta do candidato publicado.
A recuperação oficial continua obrigatória. Os rascunhos permanecem intactos.
A atualização entre duas sessões passou no banco da CI
976d42c; o BAL em iOS integra a correção dirigida atual.

**Validações do lote 2:** 14 cenários com autenticação real, 16 testes de
conteúdo/contrato e oito percursos em Chromium/iOS, em rodadas compatíveis.
Incluem seleção, período, resposta perdida, bytes preservados e autorização.
O teste original entre duas sessões passou na reprodução local separada.
As migrations foram reconciliadas. CI própria, revisão humana, aparelho físico
e os demais gates mantêm seus requisitos. O adiamento anterior do Sonar foi
substituído pela revisão reaberta em12/11.

**Validação do ciclo das chaves:** quatro exercícios completos, os três
consumidores anteriores dos provedores e dezesseis casos de assinatura e
verificação pública passaram. Tipos e lint passaram. O ensaio inclui a
recuperação da autoridade e uma nova renovação, com chaves efêmeras protegidas.
A custódia usada pelo aplicativo não foi alterada; o gate operacional continua
separado. Seis situações de falha controlada da emissão e uma retomada
concorrente com contas reais de teste também passaram. A recuperação não troca
o exemplar já armazenado nem altera sua conferência histórica.

**Resultado do lote 4:** o aceite iniciado numa conta não vincula avisos à
conta seguinte. Nova sessão exige outra confirmação; o acesso encerrado não
vira conteúdo privado offline. As rotinas alcançam todos os elegíveis em lotes
finitos e retomam os períodos conforme a política aprovada. Foram qualificados
18 percursos de navegador, 15 unitários, sete cenários com Auth/serviço reais e
duas regressões SQL, em coortes compatíveis.

**Estado externo observado:** o envio Push do Preview já estava habilitado
desde 7/11; essa configuração preexistente não foi alterada neste lote. Isso
não equivale a comprovar entrega em aparelho ou homologar o serviço.

## 3. Funcionalidades e critérios

### 3.1 Formulários, rascunhos e recuperação

**Critérios deste grupo: 14 concluídos localmente; 1 parcial por adiamento.**

**Etapas relacionadas:** 01 abaixo; DOC-C no grupo 3.3; 14 no grupo 3.5.

**Já entregue no escopo anterior:** guardar e retomar preenchimentos privados,
comparar edições e recuperar a mesma confirmação. Isso inclui as fichas,
decisões REQ/COM/ENT/BAL, transferências, movimentação familiar, relatos e
decisões de consumo, revisões de fluxo, agenda e Andamentos.

A recuperação entre aparelhos tinha estimativa de 90% no escopo anterior. A
expansão ainda não implementada e a simplificação dos painéis, inclusive
DOC-C.1, estão **adiadas por decisão sua (OWNER-DEFERRED)** no complemento
executivo. Os mecanismos existentes são preservados; a pendência não virou
conclusão. Correções de defeitos, autorização, privacidade e recuperação de
confirmações oficiais incertas continuam sob responsabilidade de Codex.

#### 01 — Rascunhos das fichas e atos operacionais

**Estado: concluído localmente · 100%. Responsável: Codex.**

**Escopo encerrado:** REQ, COM, ENT, BAL, transferências, movimentação familiar,
consumo, revisões de fluxo, agenda e Andamentos.

**Pontos encerrados:**

- 01.1 Criação e revisão das fichas.
- 01.2 Decisões REQ/COM/ENT/BAL.
- 01.3 Transferências e movimentação familiar.
- 01.4 Relatos e decisões de consumo.
- 01.5 Revisões de fluxo.
- 01.6 Agenda e decisões de plantões.
- 01.7 Andamentos privados.

#### Critérios — Formulários, rascunhos e recuperação

- **Orientar corretamente cada falha de consulta ou confirmação** — Concluído
  localmente · 100%. Consulta e confirmação têm recuperação distinta.
- **Tratar alterações concorrentes sem reaplicar uma decisão sozinha** —
  Concluído localmente · 100%. A referência vigente exige revisão explícita.
- **Erros de preenchimento claros, no campo certo e sem apagar valores** —
  Concluído · 100%.
- **Guardar rascunho próprio de ficha sem emissão automática** — Concluído ·
  100%.
- **Recuperar a mesma solicitação após perda de resposta** — Concluído · 100%.
- **Distinguir rascunho salvo de emissão oficial em COM, ENT e BAL** —
  Concluído · 100%.
- **Resumo de rascunho legível e retorno ao formulário correto** — Concluído ·
  100%.
- **Reaproveitar materiais sem reaproveitar observações antigas** — Concluído ·
  100%.
- **Rascunhos documentais separados por criação, alvo e intenção** — Concluído
  · 100%.
- **Explicar se nada ocorreu ou se um resultado foi recuperado** — Concluído
  localmente · 100%. Resultado desconhecido não é anunciado como não registrado.
- **Campos corretos para quantidades, turnos, códigos, senhas e unidades** —
  Concluído · 100%.
- **Consulta repetir consulta; resultado confirmado não voltar a pendente** —
  Concluído localmente · 100%. A confirmação preservada não é desfeita por erro
  posterior de consulta.
- **Falha ao consultar pedir atualização, sem mandar editar fato histórico** —
  Concluído · 100%.
- **Recuperar todos os preenchimentos entre sessões e aparelhos** — Parcial
  por decisão sua; ≈90% era a estimativa do escopo anterior. Expansão em
  administração/perfil e simplificação
  adiadas por você (OWNER-DEFERRED), sem PASS. Defeitos e recuperação oficial
  continuam obrigatórios para Codex. As contagens preservam
  observações após mudanças de estoque, plantão ou ficha. As preparações
  privadas da agenda estão concluídas no escopo interno deste recurso. Revisões
  de fluxo, relatos e decisões de consumo, movimentação familiar, programação do
  balanço, atribuição, adiamentos, pareceres, reconto, decisões de requisição e
  Andamentos privados estão implementados. Responsável: Codex.
- **Preservar edição durante falha, conflito e perda de contexto** — Concluído
  localmente · 100% no escopo existente. A expansão de rascunhos continua adiada;
  as confirmações oficiais incertas mantêm sua recuperação obrigatória.

### 3.2 Estoque, catálogo, consumo e agenda

**Critérios deste grupo: 2 concluídos localmente; 0 parciais.**

**Etapas relacionadas:** 02; 03; 04.5; 14.

#### 02 — Catálogo e administração diária

**Estado: concluído localmente · 100%. Responsável: Codex.**

**Escopo encerrado:** Itens, adoção, unidades, precisão, apresentações,
sucessores, alertas, destinatários, vínculos e seus comprovantes.

**Pontos encerrados:**

- 02.1 Criar, editar e adotar materiais.
- 02.2 Unidades e precisão.
- 02.3 Apresentações.
- 02.4 Situação e sucessores.
- 02.5 Alertas de estoque.
- 02.6 Destinatários.
- 02.7 Vínculos e revogação.
- 02.8 Consulta dos comprovantes próprios.

#### Catálogo e administração diária — recursos concluídos localmente

Criar, editar e adotar itens permite salvar campos incompletos, retomar em outra
sessão, comparar edições, descartar o preenchimento privado e consultar
confirmação perdida. Uma proposta global continua dependendo de outro
administrador no paciente.

Unidades, precisão, apresentações e sucessores preservam zeros à esquerda, fator
das embalagens e motivo de mudança de situação. Comprovantes próprios continuam
consultáveis após perder permissão de gravar, se a leitura estiver autorizada. O
histórico em Mais opções funciona após fechar o editor e em outra sessão.
Consultar uma tentativa guardada não reenvia a operação.

Alertas, destinatários e vínculos guardam campos, comparam edições e recuperam
confirmações. Meu perfil permite consultar a tentativa guardada nesta aba. Se a
alteração encerrar o próprio vínculo, a consulta exige continuar na sessão em
que ela foi feita. A seleção global de contas tem busca e páginas.

#### 03 — Leitura confiável do estoque e revisão do BAL

**Estado: concluído localmente · 100%. Responsável: Codex.**

**Escopo encerrado:** Saldos, trânsito, histórico de movimentos e referência da
contagem BAL.

**Pontos encerrados:**

- 03.1 Saldos e trânsito válidos ou erro compreensível.
- 03.2 Histórico, página e filtro correspondentes.
- 03.3 Revisão BAL com valores e campos preservados.
- 03.4 Chave estável das colunas e aviso do editor corrigido.

#### Estoque e contagens — recursos concluídos localmente

Consultas incompletas ou de outro paciente, custódia, página ou filtro recebem
erro recuperável. A leitura anterior fica identificada. O BAL preserva a
contagem física quando a consulta falha e usa sua referência própria na revisão.
O envio da contagem agendada só é reconhecido quando corresponde à ficha e à
tentativa; falha, recarga ou resposta divergente preservam a referência, sem
descartar outra tentativa.

Após mudança de estoque, plantão ou ficha, os valores anteriores e suas datas
continuam consultáveis. Uma nova conferência começa com quantidades vazias. As
notas ficam disponíveis, inclusive em outro aparelho depois de salvar. A
abertura e a recuperação de fichas antigas também foram conferidas. A nova regra
do parecer BAL está no complemento documental abaixo.

#### Agenda — recursos concluídos localmente

Novos tipos e programações têm retomada em outro aparelho, comparação de edições
e recuperação de confirmação. Mudanças do tipo exigem escolha antes de
continuar; um tipo indisponível respeita essa situação.

Profissional, horários e observações são mantidos ao alternar entre alterar e
cancelar. Editar apenas o nome do tipo ou as observações também preserva os
horários. Essa continuidade local não substitui a retomada entre aparelhos.

Alterações de tipos, plantões e programações, cancelamentos, aprovações,
rejeições e encerramentos de propostas têm continuidade privada. Os campos
próprios permanecem após perda de resposta ou outra conclusão. A revisão
preserva mês, datas e foco em conflito e pode ser percorrida pelo teclado.

A tentativa enviada fica preservada neste aparelho após falha ou recarga. É
possível consultar o resultado antes de decidir reenviar a mesma tentativa, sem
criar outra programação. Falha inicial de acesso permite recuperação da
referência. As verificações desse recurso e a atualização do banco foram
concluídas; a revisão geral da fase continua pendente.

#### Consumo — resultado da etapa 04.5

**Estado: concluído localmente · 100%. Responsável: Codex.**

- **04.5 — Consumo — relato, complemento, decisão e origem do desconto.** Uma
  leitura antiga não apaga complemento nem reabre uma confirmação. Durante
  atualização ou falha, a leitura anterior fica identificada e novas operações
  aguardam consulta válida. Origem do desconto, falta/rejeição sem baixa,
  original preservado e recuperação após perda de resposta ou permissão foram
  conferidos.

#### Critérios — Estoque, catálogo, consumo e agenda

- **Distinguir aprovações antigas das atuais após recontagem** — Concluído ·
  100%.
- **Parcelas terem histórico próprio e não creditarem estoque duas vezes** —
  Concluído · 100%.

### 3.3 Fichas, Andamentos, PDFs e anexos

**Critérios deste grupo: 38 concluídos localmente; 3 parciais por avaliação
humana ou adiamento.**

**Etapas relacionadas:** 04; 07; DOC-A a DOC-D; 08 a 10.

As fichas, os arquivos e o complemento aprovado ficam reunidos neste grupo.
Cada etapa tem seu detalhamento apenas aqui. A seção 5 resume os marcos; a
seção 6 informa a ordem atual, sem repetir os pontos de trabalho.

#### Andamentos privados — concluídos no escopo anterior

O preenchimento pode ser salvo no servidor, retomado em outra sessão ou aparelho
e comparado com outra edição. O texto é mantido quando outra sessão conclui o
andamento, inclusive após perda da resposta de reconhecimento. Esse é o
escopo anterior da preparação privada; menções, referências e destaques têm
seu fechamento próprio em DOC-C abaixo.

#### 04 — Estados, próximas providências e vínculos das fichas

**Estado: concluído localmente · 100%. Responsável: Codex.**

**Escopo encerrado:** estados, próximas providências e vínculos das fichas. As
novas regras permanecem identificadas em DOC-A a DOC-D.

O ponto 04.5, sobre consumo, está no grupo 3.2.

**Pontos encerrados:**

- **04.1 — Requisição — estados, atendimento, cancelamento e vínculos.** A
  orientação abre a seção correta; vínculos, falhas de consulta e registros
  encerrados foram conferidos. O novo aviso e pedido de confirmação do
  cancelamento foram acrescentados depois. A ciência própria já está entregue
  em DOC-B.4; os demais pontos desse acréscimo continuam parciais.
- **04.2 — Compra e doação — aquisição, parcelas, chegada e encerramento.**
  Preparação e aprovação pendente não aparecem como conclusão. A orientação
  distingue aquisição, chegada, conferência e encerramento; parcelas rejeitadas
  continuam no histórico. Recuperação, doação, permissões e ausência de entrada
  duplicada foram conferidas. Os novos PDFs e regras do complemento continuam
  nos blocos DOC-A a DOC-D.
- **04.3 — Entrega — conferência, divergência, devolução e regularização.**
  Encerrar a conferência com uma diferença não aparece como recebimento
  integral. Cancelamento, divergência, regularização e material ainda
  desconhecido têm orientações distintas. Quantidades aceitas, autoria, vínculos
  e recuperação foram conferidos. A devolução autônoma e seus atos foram
  entregues depois em DOC-B.3; a nova aparência permanece em DOC-A.

- **04.4 — Transferências — origem, destino, aceite e encerramento.** A
  preparação bilateral identifica entrega e devolução, aceita vínculo de origem
  opcional e separa declaração, concordância, expedição e recebimento. Recusa e
  retirada não movimentam materiais. Recuperação, conflitos e autorias foram
  conferidos. O percurso cotidiano e os dados de devolução foram
  entregues depois em DOC-B.3; a aparência e a integração final permanecem em
  DOC-A/DOC-D.
- **04.6 — BAL — agendado, sem regime, revisão, reconto e contagens.** A
  orientação distingue revisão, mudança de referência, efeito registrado,
  reconto e falta de contador. Outra atribuição ativa não cria uma pendência
  nesta ficha. Recuperação, autoria, contagem anterior e ausência de desconto
  repetido foram conferidas. Esse escopo anterior não incluía a nova separação
  entre parecer e estoque, posteriormente concluída no BAL de DOC-B.

#### Fichas e Andamentos — critérios originais

- **Abrir vínculo documental exato ou explicar a restrição de acesso** —
  Concluído · 100%.
- **Histórico em consulta, com resultado de integridade calculado** —
  Concluído localmente · 100%. Fatos permanecem em leitura; os resultados de
  bytes, assinatura e confiança são calculados separadamente.
- **Todas as relações entre telas terem sentido e acesso correto** — Parcial
  somente pela apresentação dos rascunhos adiada por você, sem PASS integral.
  As 164 relações executáveis foram conferidas e duas foram removidas conforme
  aprovado. Cancelamento, variantes BAL e consultas em leitura são preservados.

#### 07 — Dados e histórico dos PDFs

**Estado: concluído localmente · 100%. Responsável: Codex.**

**Escopo encerrado:** Conteúdo técnico e histórico já qualificados de REQ, COM,
ENT e BAL, incluindo legado, parcelas, regularização, datas e autores.

**Pontos encerrados:**

- 07.1 Fatos, autoria e datas.
- 07.2 REQ nova e histórica.
- 07.3 Compra, doação e parcelas.
- 07.4 ENT e regularização.
- 07.5 BAL e reconto.
- 07.6 Conteúdo extenso, versões e exemplares preservados.

A geração anterior preserva fatos, autores, datas, conteúdo extenso e arquivos
antigos de REQ, COM, ENT e BAL. A nova aparência e as regras acrescidas
permanecem separadas nos resultados DOC-A a DOC-D.

#### Conteúdo, geração e histórico dos PDFs — critérios originais

- **Mostrar avarias, devoluções, faltas, parcelas e autores no PDF** —
  Concluído · 100%.
- **Distinguir compra, doação e tipos de balanço nos títulos** — Concluído ·
  100%.
- **Gerar PDF sem conflito com o tempo de espera dos avisos** — Concluído ·
  100%.
- **Comparar versões e abrir o PDF exato de cada versão** — Concluído · 100%.
- **PDF de requisição com dados e datas corretos, sem quantidade pedida** —
  Concluído · 100%.
- **Documentos antigos manterem origem e datas desconhecidas explícitas** —
  Concluído · 100%.
- **Distinguir data do rascunho, da emissão e do download** — Concluído · 100%.
- **Preservar nomes históricos após mudança ou revogação de acesso** —
  Concluído · 100%.
- **Representar corretamente documentos cancelados, parciais e antigos** —
  Concluído · 100%.
- **Documentos longos não perderem linhas, final do texto ou rodapé** —
  Concluído · 100%.
- **Histórico oferecer versão exata, motivo e diferenças disponíveis** —
  Concluído · 100%.
- **Leitura acessível do PDF e alternativa com a mesma versão** — Software e
  estrutura conferidos localmente; avaliação humana pendente, sem PASS integral.
  Falta: leitura assistida com participantes. Responsável: participantes, com
  apoio de Codex para corrigir defeitos encontrados.
- **Uma geração confirmada por tentativa, com recuperação segura** — Concluído
  localmente · 100%. Falhas de assinatura, envio e confirmação preservam a
  mesma intenção e impedem uma aprovação falsa.
- **Diferenças documentais fiéis ao histórico, exibidas para consulta** —
  Concluído · 100%.
- **Documentos completos, legíveis e acessíveis em todos os estados** — Conteúdo,
  estados previstos e aparência conferidos localmente; avaliação humana
  pendente, sem PASS integral. Falta: leitura assistida e impressão com
  participantes; estados futuros não recebem aprovação antecipada.
- **PDF de regularização com autores, motivos, efeitos e assinatura** —
  Concluído localmente · 100%. Conteúdo e assinatura conferidos; avaliação
  humana e comunicação operacional permanecem nos gates próprios.
- **Pedidos distintos gerarem emissões distintas, mantendo cópias antigas** —
  Concluído localmente · 100%. Concorrência, retomada e acervo foram conferidos.
- **Histórico de emissões com identidade e arquivo preservado** — Concluído ·
  100%.
- **Gerar PDF em uma ação e recuperar o mesmo pedido nas quatro fichas** —
  Concluído · 100%.
- **Preservar PDFs antigos sem assinatura criada retroativamente** — Concluído
  · 100%.
- **Recuperar falhas antes e depois de assinar ou guardar o PDF** — Concluído
  localmente · 100%. Inclui respostas perdidas após envio e confirmação e
  retomada exclusiva de processamento abandonado.
- **Verificar dados completos e recusar PDF vazio ou incompleto** — Concluído
  localmente · 100%. Conteúdo, páginas longas e recusas foram conferidos por
  fontes e verificadores independentes no corpus definido.

#### 09 — Emissão, recuperação e falhas documentais

Estado: concluído localmente · 100%. Responsável: Codex.

**Condição para fechar:** A mesma intenção recupera o mesmo exemplar; pedidos
distintos geram emissões distintas; as falhas previstas deixam resultado
recuperável e íntegro.

Pontos de verificação:

- 09.1 Gerar nas quatro fichas.
- 09.2 Mesma intenção e pedidos distintos.
- 09.3 Falha antes/depois da assinatura.
- 09.4 Falha depois de gravar o arquivo.
- 09.5 Concorrência e abandono.
- 09.6 Legado e retomada da emissão.

**Entregue:** falha do carimbo, interrupção após assinatura, respostas perdidas
no envio e na confirmação, arquivo adulterado e retomada exclusiva de tarefa
abandonada. A mesma emissão conserva o arquivo; versões antigas e pedidos
distintos mantêm seus comportamentos já conferidos. CI e prova operacional
permanecem nos gates próprios.

#### Assinatura e verificação — critérios originais

- **Separar identidade da emissão, assinatura e confiança do certificado** —
  Concluído localmente · 100%. Consulta, bytes, assinatura, tempo e confiança
  têm resultados próprios.
- **Assinar PDFs com certificado e carimbo de tempo internos** — Concluído ·
  100%.
- **Preparar evolução futura para certificado ICP-Brasil** — Concluído
  localmente · 100% na arquitetura prevista. Provedores, chaves, cadeia, tempo
  e política estão separados. A contratação e os novos adaptadores externos
  pertencem à evolução futura; a entrega atual usa certificado e TSA internos.
- **Guardar e renovar chaves e tratar comprometimento** — Concluído
  tecnicamente · 100% no software e no ensaio local. Rotação, renovação,
  incidente e recuperação foram exercitados. Custódia operacional, destino
  independente e responsáveis continuam para você nos gates da etapa 20.
- **Verificar por QR Code e código digitável, sem expor dados privados** —
  Concluído · 100%.
- **Verificar PDF enviado distinguindo integridade, assinatura e tempo** —
  Concluído · 100%.
- **Recusar adulteração, QR copiado e emissão trocada** — Concluído localmente
  · 100% nos casos previstos, preservando a distinção do acervo legado.
- **Explicar certificados conhecidos, desconhecidos e adulterados** — Concluído
  localmente · 100%. Validade histórica e confiança atual são distintas;
  incidentes não reescrevem a conferência registrada.

#### 08 — Assinatura, certificados e ciclo das chaves

Estado: concluído localmente · 100%. Responsável: Codex.

**Condição de fechamento atendida:** assinar e verificar com os provedores
internos e demonstrar troca/recuperação de chaves e preservação dos exemplares
anteriores.

Pontos de verificação:

- 08.1 Provedores de assinatura e tempo.
- 08.2 Renovação e troca de certificado.
- 08.3 Rotação de chaves.
- 08.4 Incidente e comprometimento.
- 08.5 Recuperação de custódia e exemplares antigos.

**Entregue:** renovação sob a mesma autoridade, rotação para outra, recusa da
versão antiga com chaves novas e tratamento de comprometimento da assinatura,
do carimbo e da raiz. A recuperação cifrada permite assinar e renovar com a
autoridade restaurada; exemplares anteriores continuam preservados.

**Limites:** o ensaio usou custódia efêmera protegida. Guarda operacional, chave
independente mantida pelo responsável e exercício real continuam na etapa 20.
As etapas 09/10 também fecharam localmente; a conferência conjunta segue em 19.

#### 10 — Verificação por QR, código e arquivo

Estado: concluído localmente · 100%. Responsável: Codex.

**Condição para fechar:** Originais, adulteração, QR copiado, outra emissão,
certificado/token desconhecido ou inválido e limites de arquivo têm resultados
corretos.

Pontos de verificação:

- 10.1 QR e código digitável.
- 10.2 Upload e limites.
- 10.3 Arquivo adulterado e QR copiado.
- 10.4 Outra emissão e cópia divergente.
- 10.5 Certificado, cadeia e carimbo de tempo.
- 10.6 Resultado público e leitura acessível.

**Entregue:** QR e código, upload real, distinção de outra emissão, bytes
adulterados ou acrescentados, legado, confiança e carimbo separados, limites
do serviço e resultados públicos mínimos. A revisão com participantes,
leitura assistiva e câmera física permanece externa.

#### Anexos e arquivos enviados — critérios originais

- **Recuperar envio de anexo sem duplicar nem trocar o arquivo** — Concluído ·
  100%.
- **Abandonar envio incompleto sem apagar anexos confirmados** — Concluído ·
  100%.
- **Revalidar o acesso ao baixar um arquivo** — Concluído · 100%.
- **Recuperar falha após envio sem acumular arquivos sem controle** — Concluído
  · 100%.
- **Preservar anotações visíveis ou recusar explicitamente a conversão** —
  Concluído · 100%.
- **Detectar arquivo alterado sem entregá-lo como íntegro** — Concluído · 100%.
- **Limites e recusas de envio coerentes antes e depois de enviar** — Concluído
  localmente · 100%. O limite de 4 MB é informado antes do envio e imposto na
  API; arquivos com conteúdo não preservável recebem recusa explícita.
- **Distinguir original de cópia e preservar ressalva ou recusar** — Concluído
  · 100%.

#### Complemento aprovado de fichas e PDFs

Acrescentado em 11/11/2026. Reutiliza o gerador, a assinatura e os documentos
existentes. A etapa 07 continua concluída somente em seu escopo anterior. Os
quatro resultados abaixo medem apenas o acréscimo. Seus conteúdos, pontos de
entrega e condições de fechamento estão reunidos aqui; a seção 6 informa a
ordem de execução.

##### DOC-B — Fatos, saldos e atos específicos

**Concluído localmente · 100% do acréscimo. Responsável: Codex.**

**DOC-B.1 — BAL: concluído localmente no fluxo atual.** Parecer por material e
aplicação ao estoque são atos separados. A aplicação tem confirmação, autoria e
momento próprios; uma resposta perdida pode ser recuperada sem repetir
movimentos. O PDF mostra o saldo daquela aplicação, com seu momento, ou Acesso
restrito. Movimentos posteriores não substituem esse saldo. Os atos posteriores
do mesmo material têm vínculo, autoria, momento, resultado e aplicação próprios
na tela e no PDF. A contagem anterior é preservada; encaminhamento não é
confundido com correção realizada. A nova aparência documental continua em
DOC-A.

**DOC-B.2 — COM: concluído localmente no fluxo atual.** A ficha e o PDF mostram
o saldo de cada material imediatamente após sua última entrada validada naquela
COM, com data, responsável e parcela próprios. Os totais adquirido e validado
permanecem separados da quantidade da última parcela. Movimentos posteriores
preservam esse saldo; dados antigos indisponíveis e Acesso restrito recebem
indicação própria. Respostas divergentes permitem consultar novamente, sem
movimentar estoque.

**DOC-B.3 — Devolução autônoma: concluído localmente no fluxo atual.** Há uma
entrada cotidiana própria para equipe → família, sem exigir uma entrega de
origem. Os dois sentidos mantêm seus nomes e a preparação bilateral continua
disponível. Declaração, concordância, expedição e recebimento são separados;
concordar não movimenta estoque. O recebimento credita somente o que foi aceito
e mantém a diferença pendente. A ficha e o PDF identificam a devolução, seus
responsáveis e a ausência de origem vinculada. Exemplares anteriores ficam
preservados.

**DOC-B.4 — Cancelamento e complemento: concluído localmente.**

- **Parte entregue:** ciência própria do cancelamento, implementada e conferida
  no fluxo local, separada das ciências anteriores e sem alterar estoque.
  Consulta, recuperação, autorização e uso nos três perfis de navegador
  passaram.
  O pedido interno continua disponível mesmo com avisos opcionais desligados.
- **Parte entregue:** novas fichas emitidas pelos formulários habituais podem
  ser vinculadas formalmente, com motivo, autor e data próprios. As duas fichas
  preservam materiais, ciências e estoque. Consulta, permissões, tipos distintos
  e recuperação da mesma tentativa foram conferidos nos três perfis de
  navegador.
- **Parte entregue:** os quatro tipos de ficha geram PDFs assinados com o ato
  de cancelamento, as ciências próprias e as referências dos complementos até a
  versão escolhida. Dados da outra ficha sem autorização não entram no arquivo.
  Recuperação, cópia anterior, mesmos bytes e leitura restrita foram conferidos.
  Os originais, as ciências anteriores e os saldos históricos permanecem
  preservados. A nova aparência continua em DOC-A.

DOC-B.4 fecha o bloco adicional DOC-B em 100% local. Esse percentual pertence
somente aos fatos e atos desse acréscimo; a fase D-B e os demais blocos
continuam
em execução, sem mudança dos estados dos critérios originais.

**Condição para fechar DOC-B:** os quatro pontos funcionam no uso cotidiano,
com seus fatos preservados na ficha e no PDF, respeitando as permissões. Não
basta a preparação isolada de uma parte do percurso.

##### DOC-A — Aparência dos documentos

**Concluído localmente · 100%. Responsável: Codex.** Os seis pontos foram
implementados e conferidos no lote 1, com arquivos reais assinados. Revisão
humana, impressão e CI do commit publicado continuam gates próprios.

REQ, entrega, devolução, compra/doação e BAL usam a composição aprovada, fonte
Source Sans 3, cores, bandeira lateral quando aplicável, autores, macroetapas,
tabelas, observações e avisos completos. Conteúdo longo continua em novas
páginas com cabeçalhos e rodapés legíveis. A referência dos PDFs não modifica o
Modelo Integral da aplicação.

Pontos de entrega:

- DOC-A.1 Composição documental compartilhada.
- DOC-A.2 Requisição.
- DOC-A.3 Compra, doação e parcelas.
- DOC-A.4 Entrega e devolução.
- DOC-A.5 BAL.
- DOC-A.6 Conteúdo longo e continuidade entre páginas.

**Condição para fechar:** os tipos de ficha usam a aparência aprovada com todo o
conteúdo preservado.

##### DOC-C — Modalidades, Andamentos e consulta

**Concluído localmente · 100% dos quatro pontos executáveis. Responsável:
Codex.** DOC-C.1 permanece adiado por decisão sua e não entra nesse cálculo.
A estimativa não mede a fase inteira nem substitui CI ou revisão humana.

Ficha integral e Ficha Ampliada usam a composição aprovada. A seleção acrescenta
Andamentos, comunicações, confirmações, vínculos e histórico de acesso; o
período não retira fatos obrigatórios da ficha. A auditoria é restrita, com
finalidade e limites próprios. Todos usam a assinatura e a recuperação atuais.

DOC-C.1 foi **adiado expressamente por você** no complemento executivo. Não
serão simplificados nem ampliados os rascunhos existentes nesta D-B. A
recuperação segura das confirmações oficiais continua obrigatória.

Pontos de entrega:

- DOC-C.1 Retomada simples de rascunhos comuns — OWNER-DEFERRED; sem PASS.
- DOC-C.2 Andamentos com menções, referências e destaques — concluído
  localmente · 100%. Tela e PDF usam origem, natureza e destaque coerentes,
  mantendo autoria e cronologia. Pessoas mencionadas não se tornam autoras ou
  signatárias. A mesma publicação pode ser recuperada sem duplicação; o rascunho
  mantém seus campos anteriores.
- DOC-C.3 Acessos repetidos agrupados em janelas de 20 minutos — concluído
  localmente · 100%. Novos acessos da mesma pessoa/versão compartilham um
  registro, com recuperação por chave; o passado permanece preservado. O
  histórico exige competência própria do paciente e continua paginado. Acesso
  observado não equivale a ciência, leitura integral ou recebimento.
- DOC-C.4 Ficha completa e Ficha Ampliada com período e complementos —
  concluído localmente · 100%. A escolha é fixada na emissão e preservada na
  recuperação. Sem registros no período, o arquivo informa isso e mantém a
  ficha integral. Uma fonte incompleta é recusada, sem publicar arquivo parcial.
- DOC-C.5 Auditoria restrita com marca nominativa — concluído localmente ·
  100%. Exige competência de auditoria do paciente, informa finalidade, fontes,
  período e limites e identifica o exemplar em todas as páginas. Perder a
  permissão bloqueia fonte, download e consulta desse exemplar no acervo.

**Condição para fechar:** as modalidades e os registros funcionam na ficha e nos
arquivos correspondentes, mantendo cronologia, autoria, acesso e recuperação
própria das confirmações incertas.

##### DOC-D — Geração integrada e exemplos reais

**Concluído localmente · 100% do acréscimo. Responsável: Codex.**
Ficha, Ficha Ampliada e auditoria usam o pipeline real de assinatura e guarda.
As amostras foram conferidas internamente; você ainda avalia aparência, uso e
impressão. Os critérios de 08/09/10 têm fechamento próprio no lote 3; os
gates operacionais e humanos continuam separados.

Integrar a nova composição ao gerador e à assinatura atuais. Preservar cópias
antigas, recuperação e novo download dos mesmos bytes; nova emissão tem
identidade própria. Conferir dados, permissões, links, QR e verificação conforme
o que mudou. Disponibilizar PDFs reais para avaliação visual.

Pontos de entrega:

- DOC-D.1 Integrar os novos conteúdos e a aparência à emissão e assinatura.
- DOC-D.2 Preservar exemplares anteriores e recuperar o mesmo arquivo.
- DOC-D.3 Conferir dados, permissões, links, QR e verificação afetados.
- DOC-D.4 Disponibilizar PDFs reais para avaliação.

**Condição para fechar:** o complemento está integrado ao gerador em uso, com
exemplos conferidos e limites da avaliação humana identificados.

As dependências de devolução, revisão BAL, Andamentos e acessos pertencem a
esse complemento. Rascunhos ficam congelados pela decisão posterior. Sua
avaliação das amostras e os testes com pessoas continuam separados das
implementações de Codex.

### 3.4 Navegação, listas e mensagens

**Critérios deste grupo: 11 concluídos localmente; 0 parciais.**

**Etapas relacionadas:** 05; 19.

Os dez grupos de listas foram conferidos, incluindo registros antigos e
históricos extensos. Estão detalhados abaixo, na etapa 05. A conferência
conjunta entre sessões permanece na etapa 19.

As verificações locais de agenda, Andamentos, foco do editor e recebimento
passaram. A seleção intermitente da aba de recebimento continua sujeita à
contraprova na validação automática da versão publicada, sob responsabilidade de
Codex.

#### 05 — Busca, filtros, listas e históricos completos

**Estado: concluído localmente · 100%. Responsável: Codex.**

**Escopo encerrado:** os dez grupos de consulta abaixo.

**Pontos encerrados:**

1. **05.1 — Estoques e movimentos.** Foram conferidos os materiais e o
   histórico com mais de 100 movimentos, páginas completas, ordem, filtros,
   falha, vazio e resposta antiga, sem alteração do estoque. Reaproveitadas as
   verificações anteriores válidas.
2. **05.2 — Fichas e requisições.** Conferidas mais de 100 requisições, todas
   as páginas e a pendência mais antiga. Resposta incompleta não aparece como
   lista vazia; falhas conservam a leitura anterior identificada. Filtros, foco,
   recarga e Voltar foram conferidos, sem registrar ciência ou movimentar
   estoque.
3. **05.3 — Compras e parcelas.** Conferidas 101 compras e 101 parcelas, com
   todas as páginas e busca da mais antiga. As parcelas têm busca e filtro por
   situação, sem mudar sua identificação ao filtrar. Falha de consulta conserva
   os campos e não repete crédito de estoque. São filtros simples, sem novo
   rascunho.
4. **05.4 — Entregas e transferências.** Todas as páginas permitem alcançar as
   tarefas pessoais e o histórico autorizado, incluindo devoluções. Uma consulta
   incompleta recebe erro recuperável; trocar filtros não mostra a seleção
   anterior como atual. Consultar não confirma recebimento nem altera estoque.
5. **05.5 — Consumo.** Todas as páginas permitem alcançar relatos antigos, com
   busca no texto original, filtros e retorno pelo navegador. Consulta com falha
   não inventa vazio. Uma página atrasada não entra em outra seleção; perda de
   acesso retira o conteúdo daquela custódia. Consultar não confirma nem
   desconta.
6. **05.6 — Agenda.** O mês completo e os filtros foram conferidos com mais de
   100 plantões. Um plantão iniciado antes do período continua visível quando
   ainda o alcança, sem duplicação. Falha identifica a consulta anterior e
   suspende alterações; perda de acesso retira os dados. O histórico completo de
   mudanças foi concluído no ponto 05.10.
7. **05.7 — Catálogo e contas.** O catálogo completo e as contas globais
   alcançam registros além do limite antigo de 1.000 linhas. Foram conferidos
   busca, todas as páginas dos resultados tardios e preservação dos registros.
   Uma falha não inventa vazio e a perda de acesso retira o conteúdo. A tabela
   estreita foi conferida na etapa 06; os outros ajustes do editor global
   continuam na etapa 14.
8. **05.8 — Notificações.** Foram conferidos 102 avisos, todas as páginas e o
   mais antigo. Página e filtro são mantidos ao recarregar e usar Voltar.
   Consulta com falha não inventa vazio; uma resposta atrasada não troca o
   filtro atual. Consultar não marca avisos nem registra ciência. Só a marcação
   escolhida altera o aviso correspondente.
9. **05.9 — Propostas antigas.** Todas as 101 pendências e 202 propostas do
   histórico ficaram alcançáveis, incluindo a mais antiga. Busca, foco, recarga
   e Voltar foram conferidos. Falha mantém apenas a consulta válida da mesma
   seleção, identificada e com decisões suspensas. Consultar não aprova nem
   altera configurações.
10. **05.10 — Auditoria e históricos.** O histórico da agenda permite alcançar
    todos os registros autorizados, incluindo os anteriores ao limite antigo de
    100. A visão pessoal fica restrita ao próprio profissional. Auditoria e
    agenda mantêm campos, filtros, recarga e Voltar. Falhas não inventam
    vazio; perda de acesso retira o conteúdo. Consultar não altera
    registros nem estoque.

#### Critérios — Navegação, listas e mensagens

- **Nomes, filtros e avisos compreensíveis em português** — Concluído · 100%.
- **Botões e atalhos abrirem a tarefa e o paciente corretos** — Concluído ·
  100%.
- **Páginas de acesso recusado e página inexistente compreensíveis** —
  Concluído · 100%.
- **Distinguir carregando, vazio, erro e resultado atualizado** — Concluído ·
  100%.
- **Trocar filtros sem misturar resultados antigos e novos** — Concluído ·
  100%.
- **Encontrar registros antigos com histórico e paginação** — Concluído · 100%.
- **Manter limites seguros nas consultas, inclusive parâmetros vazios** —
  Concluído · 100%.
- **Erros internos não virarem avisos enganosos de material ambíguo** —
  Concluído · 100%.
- **Atualizar consumo e filas entre sessões sem perder edição** — Concluído ·
  100%.
- **Busca e listas alcançarem todos os registros permitidos** — Concluído
  localmente · 100%. Os dez grupos de listas, auditoria e tentativas técnicas
  têm percurso completo qualificado; a CI conjunta continua na etapa 19.
- **Buscar, ordenar e filtrar listas grandes sem resultados trocados** —
  Concluído · 100%. Os dez grupos de listas foram conferidos, inclusive
  registros antigos e mais de 100 resultados. Responsável: Codex.

### 3.5 Administração, permissões, entrada e orientação

**Critérios deste grupo: 12 concluídos localmente; 0 parciais.**

**Etapas relacionadas:** 02; 14; 16.

A lentidão demonstrada na consulta de contexto foi corrigida: nos ensaios locais
com milhares de pacientes fictícios, a consulta passou a responder em menos de
um segundo, preservando lista completa e permissões. Esse problema foi
concluído; outras combinações de acesso e recuperação continuam pendentes.

#### Administração e permissões — critérios originais

- **Propostas de alteração compreensíveis, com comparação antes/depois** —
  Concluído · 100%.
- **Alterar ou revogar o vínculo da pessoa correta com revisão** — Concluído ·
  100%.
- **Manter, alterar ou retirar o nome curto de forma explícita** — Concluído ·
  100%.
- **Encontrar propostas antigas ainda pendentes** — Concluído · 100%.
- **Respeitar a criação de paciente inativo** — Concluído · 100%.
- **Distinguir informação profissional declarada, conferida e validada fora** —
  Concluído · 100%.
- **Separar criação global de paciente das tarefas locais** — Concluído · 100%.
- **Conferência profissional com autor e data, sem autovalidação externa** —
  Concluído · 100%.
- **Separar administração global, paciente e perfil pessoal** — Concluído ·
  100%.

#### 14 — Formulários restantes e recuperação oficial

**Expansão e simplificação de rascunhos: OWNER-DEFERRED por sua decisão.**
A estimativa anterior de 0% não significa aprovação ou cancelamento do
requisito.
Defeitos, privacidade, autorização e recuperação oficial continuam com Codex.

**Condição do escopo executável:** os fluxos existentes dos nove grupos abaixo
continuam íntegros e suas confirmações incertas são recuperáveis. Somente o
fechamento mínimo de uma conexão parcial é permitido; nenhum novo subsistema
de rascunho ou eliminação de dados existentes.

Pontos de verificação:

- 14.1 Convites.
- 14.2 Conferência profissional.
- 14.3 Contas globais.
- 14.4 Cadastro do paciente.
- 14.5 Configurações do paciente.
- 14.6 Regras de comunicação e permissões.
- 14.7 Campos comuns do perfil.
- 14.8 Preferência de ciência.
- 14.9 Políticas de suporte.

Os nove grupos identificam consumidores existentes a preservar. Não são uma
lista de locais onde acrescentar persistência. Os editores específicos já
concluídos são preservados, com sua apresentação e recuperação atuais.

#### Entrada e orientação — critérios originais

- **Distinguir preparação do paciente de liberação operacional** — Concluído
  localmente · 100%. Preparação, adoção, abertura familiar e contingência
  funcionam com autoridade própria. A conferência física e o piloto
  permanecem com você e equipe, sem aprovação presumida. Responsável: Codex
  no software; depois você e equipe no uso real.
- **Guia por papel, reabrível e sem conceder permissões** — Concluído localmente
  · 100%. Os seis papéis foram conferidos, incluindo pular, reabrir, navegar,
  guardar progresso e recuperar falhas. Responsável: Codex. Avaliação humana e
  tecnologia assistiva permanecem no bloco externo.
- **Primeiro paciente e orientação respeitarem a autoridade de cada papel** —
  Concluído localmente · 100%. Criação global, vínculo inicial local, guia
  reabrível e preparação local funcionam sem transferir autoridade ou simular
  fatos físicos. Avaliação humana e piloto continuam externos. Responsável:
  Codex.

#### 16 — Entrada, guias e primeira residência

Estado: concluído localmente · 100% do software. Responsável: Codex.

**Condição local atendida:** Os papéis percorrem os guias previstos, recebem
tarefas legítimas e conseguem preparar a residência com seus limites de
autoridade.

Pontos de verificação:

- 16.1 Criação global e administração local — concluído localmente.
- 16.2 Adoção e preparação de materiais — concluído localmente.
- 16.3 Guia reabrível por papel — concluído localmente.
- 16.4 Preparação física e contingência — software concluído localmente;
  conferência e exercício humanos na etapa 20.

**Limites do fechamento:** A declaração preserva conhecidos e desconhecidos;
complementos e decisões não apagam o original. Evidências usam o envio e a
recuperação existentes. A conciliação é independente e só vincula fato
digital autorizado; não fabrica movimento ou recebimento. A conferência
física, as designações reais e o exercício humano permanecem na etapa 20.
A aparência restante de GUI-02/04 está na etapa 15; CI e conferência conjunta
estão na etapa 19.

### 3.6 Aplicativo instalado, conexão, avisos e lembretes

**Critérios deste grupo: 9 concluídos localmente; 0 parciais técnicos.**

**Etapas relacionadas:** 11 a 13; 20.

#### 11 — Aplicativo, instalação, atualização e offline

Estado: escopo anterior e atualização explícita concluídos localmente · 100%.
Responsável: Codex. A pessoa pode atualizar esta aba sem fechar
as outras, após salvar e confirmar. Falha e sucesso têm avisos próprios.

**Condição para fechar:** Os cenários automatizáveis de instalação/atualização
preservam edição e privacidade e orientam a recuperação.

Pontos de verificação:

- 11.1 Instalação no Preview protegido.
- 11.2 Recuperação do aplicativo.
- 11.3 Atualização com edição aberta.
- 11.4 Troca de paciente e sessão revogada.
- 11.5 Sem conexão e retorno da conexão.

**Entregue:** instalação protegida por cookie, recuperação, atualização com
duas abas e edição preservada, mudança de contexto, sessão realmente encerrada
e retorno da conexão. O cache continua somente público e nenhuma operação é
repetida automaticamente. Reteste físico fica na etapa 20.

#### Instalação e uso sem conexão — critérios originais

- **Indicar conexão e atualização dos dados sem enviar ações antigas** —
  Concluído localmente · 100%. Perda de sessão, reconexão e troca de contexto
  preservam seus limites e não enviam edições automaticamente.
- **Instalar e atualizar sem perder edição confirmada** — Concluído localmente
  · 100% no software. Instalação e uso físico continuam para você na etapa 20.
- **Aplicativo instalado com atualização segura e privacidade** — Concluído
  localmente · 100% no software. No S24, você relatou atualização e recebimento
  do teste Push; os demais ensaios físicos permanecem na etapa 20.

#### 12 — Notificações internas e avisos Push

Estado: escopo anterior, confirmação visível e teste pessoal concluídos
localmente · 100%. Responsável: Codex. Inscrição, aceite do serviço
e exibição no aparelho permanecem resultados separados.

**Condição para fechar:** Os casos internos e de transporte controlado comprovam
autorização, deduplicação, recuperação e manutenção da pendência interna.

Pontos de verificação:

- 12.1 Ativar e revogar neste aparelho.
- 12.2 Preferências e troca de conta.
- 12.3 Conteúdo genérico do aviso.
- 12.4 Evento e tentativa únicos.
- 12.5 Destino correto do aviso.
- 12.6 Falha e recuperação da entrega controlada.

**Entregue:** inscrição, pausa, revogação, destinatário autorizado, aviso
genérico, deduplicação e recuperação com transporte controlado. Troca de conta
ou nova sessão exige outra escolha; uma confirmação antiga é recusada.
Provedores e aparelhos reais ficam na etapa 20.

#### 13 — Lembretes e retorno após parada

Estado: concluído localmente · 100%. Responsável: Codex.

**Condição para fechar:** Mais de 100 configurações são alcançadas em rodadas
finitas e o retorno após indisponibilidade identifica ou recupera a obrigação
uma vez.

Pontos de verificação:

- 13.1 Rotinas antigas reconciliadas.
- 13.2 Mais de 100 configurações alcançadas.
- 13.3 Retorno após período perdido.
- 13.4 Obrigação processada uma vez.

**Entregue:** produtores legados, REQ e BAL mantêm alcance finito, concorrência
e efeito único. Períodos perdidos são recuperados ou identificados como lacuna
quando a vigência anterior é desconhecida; não inventam ciência ou contagem.

#### Avisos e lembretes — critérios originais

- **Alcançar todos os pacientes, inclusive listas grandes** — Concluído
  localmente · 100%. Conferidos os lotes limitados e a rotação de todos os
  elegíveis, incluindo mais de 100 configurações.
- **Recuperar períodos em que o serviço de lembretes ficou indisponível** —
  Concluído localmente · 100%. Mantém o período original e distingue lacunas
  desconhecidas de obrigações efetivamente recuperadas.
- **Avisos por aparelho com conteúdo genérico e acesso autorizado** — Concluído
  localmente · 100% no software. Preview tem configuração própria; entrega real
  permanece para você e o serviço externo na etapa 20.
- **Ativar e revogar avisos por usuário e aparelho** — Concluído localmente ·
  100% no software. Confirmação fica vinculada à conta e à sessão que a iniciou.
  Testes físicos e serviço real continuam externos.
- **Não duplicar avisos e abrir o destino autorizado** — Concluído localmente ·
  100% no software. Recuperação e destino foram conferidos; observação e
  entrega operacionais permanecem na etapa 20.
- **Reconciliar lembretes antigos e atrasados sem perder obrigações** —
  Concluído localmente · 100%. Cobertura, atraso, retorno, falha isolada e
  ausência de efeitos duplicados foram conferidos.

### 3.7 Backup, recuperação, suporte e monitoramento

**Critérios deste grupo: 7 concluídos no escopo local executável.** Ativação,
custódia e comprovação operacional continuam separadas na etapa 20.

**Etapas relacionadas:** 17; 18; 20.

#### 18 — Backup e recuperação

Estado: concluído localmente · 100% do software. Responsável: Codex.

**Condição para fechar:** O software e seus ensaios demonstram captura coerente,
retenção, verificação e recuperação isolada com os limites operacionais
documentados.

Pontos de verificação:

- 18.1 Captura coerente de banco e arquivos.
- 18.2 Criptografia e verificação de integridade.
- 18.3 Retenção diária e semanal.
- 18.4 Cópia antes de alteração crítica.
- 18.5 Restauração isolada e recuperação de chaves.

**Entregue:** captura de banco e arquivos, cópia cifrada com chave separada,
retenção 7+4, cópia crítica e restauração isolada. O exercício mais recente
conferiu 183 conjuntos de tabelas, 34 arquivos, 33 PDFs e duas emissões assinadas
prontas; a cópia foi atualizada de 237 para 238 somente no banco isolado.
As diferenças de representação do catálogo foram delimitadas, sem ocultar o
resultado bruto. O banco do ensaio foi removido. Recuperação e renovação das
chaves documentais também passaram no lote 3.

**O que depende de você e da operação:** escolher destino externo independente,
titular/substituto e custódia, autorizar agenda e telemetria e realizar o ensaio
operacional com metas de prazo. Nada disso recebe aprovação pelo teste local.

#### Backup e recuperação — critérios originais

- **Copiar banco e arquivos de forma protegida e conferível** — Concluído
  tecnicamente · 100%. Destino externo e custódia operacional: você.
- **Retenção de sete cópias diárias e quatro semanais** — Concluído no software
  · 100%. Agenda permanente ainda desligada; autorização de ativação: você.
- **Recuperar cópia isolada e preparar teste operacional completo** — Concluído
  tecnicamente · 100%. Ensaio operacional, participantes e metas: você e equipe.

#### 17 — Monitoramento e suporte

Estado: concluído localmente · 100% do software. Responsável: Codex.

**Condição para fechar:** Falhas previstas geram observações/incidentes
persistentes com severidade, reconhecimento, tratamento e visão autorizada.

Pontos de verificação:

- 17.1 Falhas da aplicação e banco.
- 17.2 Tarefas automáticas e notificações.
- 17.3 Emissão, assinatura e integridade.
- 17.4 Backup e recuperação.
- 17.5 Reconhecer e tratar incidentes.
- 17.6 Impacto pessoal e detalhe mínimo de suporte.

**Entregue:** incidentes persistentes, severidades e limites, reconhecimento,
tratamento, histórico completo e orientação separada para equipe e suporte.
As três composições finais foram comparadas ao modelo em cinco larguras;
consulta, erro, autorização, decisão explícita e recuperação passaram no Chrome
móvel e no WebKit. A projeção global de tentativas não concede leitura de dados
operacionais nem permite reenvio. A observação externa e a operação assistida
com responsáveis reais permanecem na etapa 20; monitor interno não comprova
disponibilidade total do serviço.

#### Suporte e monitoramento — critérios originais

- **Separar detalhe técnico do suporte da orientação para a equipe** —
  Concluído localmente · 100%. Operação assistida: você e suporte.
- **Registrar, reconhecer, tratar e consultar incidentes** — Concluído
  localmente · 100%. Exercício com responsáveis reais: você e suporte.
- **Acompanhar banco, avisos, assinaturas, integridade, backups e recuperação**
  — Concluído no software interno · 100%. Serviço externo, ativação e
  comprovação operacional: você e fornecedor, quando autorizados.
- **Visão técnica global sem acesso indevido aos dados dos pacientes** —
  Concluído localmente · 100%. Exercício com responsáveis reais: suporte.

### 3.8 Banco, qualidade, piloto e encerramento

**Critérios deste grupo: 2 concluídos tecnicamente; 2 parciais.**

**Etapas relacionadas:** 19; 20.

#### Banco e sincronização do Preview — critérios originais

- **Aplicar atualizações pendentes da fase D-A no banco remoto** — Concluído ·
  100%.
- **Manter as atualizações D-B aplicadas no remoto** — Concluído tecnicamente ·
  100%. As duas atualizações do teste pessoal de Push foram reconciliadas;
  local/remoto em242, sem pendências. A CI do novo SHA continua na etapa 19.

#### Piloto, qualidade e encerramento — critérios originais

- **Contingência, piloto e responsáveis definidos antes da liberação** —
  Preparação técnica concluída; parcela operacional pendente, sem PASS integral.
  Você define residência, participantes, canais, titular e substituto e realiza
  o piloto com a equipe. Codex apoia e corrige defeitos constatados.
- **Concluir verificações automáticas e tratar qualidade do código** — A CI
  do candidato publicado precisa passar; acompanhamento e correções são de
  Codex. O Sonar confirmou 27 correções e 13 falsos positivos conferidos em
  contexto. Nove alertas de ferramentas manuais e da demonstração foram aceitos
  com limites explícitos. O Quality Gate segue reprovado pela duplicação de 3,2%.
  O resultado corrente é consultado nas
  [verificações da PR](https://github.com/RMZZFAJ/home-care-assistant/pull/7/checks).

#### 19 — Validação final, migrations e encerramento D-B

Estado: software reconciliado; validação automática do candidato em andamento.
Responsável: Codex.

**Condição para fechar:** As etapas executáveis estão fechadas, o candidato
final tem seus resultados verificados e o remoto corresponde à branch; os gates
restantes têm responsável definido.

Pontos de verificação:

- 19.1 Critérios e alterações finais reconciliados.
- 19.2 Instalação limpa, atualização e testes integrados.
- 19.3 CI do candidato final e estado real do Sonar.
- 19.4 Remoto, Preview, relatório e próximos gates.

**O que falta:** a CI confirmar instalação limpa, evolução e conjunto integrado
no candidato publicado, com correção de qualquer falha efetiva. O schema está
reconciliado e as responsabilidades externas estão separadas no grupo 4.
A revisão do Sonar foi reaberta em12/11 e integra este fechamento. O resultado
vivo da CI pertence às verificações da PR;
este arquivo não exige outro relato manual a cada mudança de um job.

### 3.9 Refatoração visual de todo o sistema

**Critérios deste grupo: 1 concluído localmente; 3 parciais de avaliação humana.**

**Etapas relacionadas:** 06; 15; 20.

**Aparência: 100% das 66 composições do escopo executável conferidas localmente.**
O novo diálogo de atualização e o cartão de teste do S24 também passaram na
conferência local própria. O acréscimo não recebeu conclusão pela aprovação
anterior. Avaliação humana e aparelho real continuam separados.
Isso não aprova a CI final, a avaliação humana ou a apresentação dos rascunhos
adiada por você. As 46 composições de operação e as vinte demais fecharam no
recorte local. Das 171 relações, 164 têm comprovação compatível, cinco conservam
a apresentação existente de rascunhos por decisão sua e duas foram removidas
conforme aprovado. Nenhuma relação adiada virou PASS.

O alvo é uma aparência única do Modelo Integral, incluindo recursos ausentes do
HTML de referência. A dependência Fluent foi removida e a base compartilhada e
as fichas em abas foram implementadas. A conferência local cobre as 66
composições, com as ressalvas acima. Os PDFs
têm sua referência própria e estão no grupo 3.3.

#### 06 — Aparência completa das áreas de operação

**Estado: concluído localmente · 100%. Responsável: Codex.**

**Escopo encerrado:** as 46 composições originais de operação diária e sua
conferência conjunta local.

**Pontos encerrados:**

- **06.1 — Requisição e compra.** As nove composições de requisição e compra:
  seleção, revisão, consulta, ciência, lista frequente, aquisição, parcelas e
  encerramento da expectativa, com funções e dados preservados.

- **06.2 — Entregas e transferências.** As sete composições foram conferidas:
  preparação, revisão, caixa de tarefas, materiais, recebimento pessoal,
  cancelamento, apuração e fatos da transferência, sem confundir declaração com
  entrega realizada.

- **06.3 — Balanços e agenda.** As nove composições foram conferidas, com
  contagem e referência separadas, pareceres com autoria própria, reconto,
  adiamento, horários e comparação das alterações. A separação adicional entre
  parecer e alteração de estoque foi concluída posteriormente no BAL de DOC-B.

- **06.4 — Estoque, catálogo e consumo.** As 12 composições mantêm saldos,
  quantidades em trânsito, histórico, correção familiar, origem autorizada,
  nomes alternativos, precisão, embalagens, sucessores, relatos, complementos e
  decisões. Os registros preservam os fatos antigos e identificam o cadastro
  atual.

- **06.5 — Arquivos, resumos e seções documentais.** As nove composições
  preservam versões, exemplares, anexos, consultas, recuperação e comparações. O
  novo diálogo de abandono tem retorno seguro; a reformulação adicional da
  retomada foi adiada no complemento executivo.

- **06.6 — Conferência conjunta local.** Incluiu larguras, textos longos,
  teclado, foco e formas de leitura. O grupo mantém suas 46 composições
  originais. Ampliação nativa, leitor de tela e aparelho real continuam nos
  testes finais com participantes; a fase ainda não está liberada.

#### 15 — Aparência das demais áreas e relações restantes

Estado: composições executáveis concluídas localmente · 100%. Responsável: Codex.

**Condição para fechar:** O conjunto das etapas 6 e 15 cobre as 66 composições e
171 relações, com funções preservadas e comparação individual com o Modelo
Integral.

Pontos de verificação:

- 15.1 Administração — ADM-01–06 conferidos localmente.
- 15.2 Identidade e acesso — ID-01–05 concluídos localmente no escopo visual.
- 15.3 Notificações — NOT-01–05 conferidos localmente.
- 15.4 Guias — GUI-01–04 concluídos localmente, incluindo continuidade/suporte.
- 15.5 Relações reconciliadas: 164 conferidas, cinco adiadas e duas removidas.

**O que falta:** fechamento conjunto e CI do candidato publicado, com Codex;
avaliação humana e física, com os participantes. A apresentação de rascunhos
permanece adiada. ADM-05, NOT-05 e GUI-04 fecharam no lote 6, preservando
permissões, histórico, política e comandos reais.

**Entrega das relações:** a conferência conserva os estados próprios de
conta global, senha, cancelamento e variantes BAL. COM e BAL já podem ser
consultadas por referências reais dos Andamentos, em leitura; erro ou resposta
de outro tipo retira o conteúdo até nova consulta, e outro paciente é recusado.
A consulta não registra alteração operacional ou de estoque. O avatar
compartilhado recebeu a forma e as cores exatas do modelo, também no cabeçalho.
Passaram três percursos no build de produção: consulta COM/BAL e comparação do
componente no Chrome móvel e no iOS. As provas anteriores compatíveis foram
reaproveitadas; não houve uma nova repetição de todas as 171 relações.

**Entrega de acesso e identidade:** Entrar, Recuperar e Aceitar convite usam
o mesmo padrão visual, com autenticação real. Pessoas, contas globais e escolha
de contexto conservam seus processos e permissões separados. O aceite só é
anunciado depois de conferir o vínculo registrado. Uma resposta incerta
preserva a conta, o convite e a decisão; a retomada não troca a escolha nem
atinge outro link. A navegação por teclado foi corrigida no iOS. A ciência de
cancelamento conserva foco durante a consulta, sem confirmar antecipadamente.
Passaram 25 percursos distintos em rodadas de produção compatíveis, incluindo
as sete reprovações da primeira rodada após as correções e a separação dos
testes longos. A consulta de contexto teve uma falha transitória e recuperou;
isso não atesta disponibilidade contínua. CI do novo commit ainda é necessária.

**Entrega da preparação global:** o formulário usa campos, etapas numeradas e
resumos de situação no padrão do modelo. Navegar mantém os valores sem salvar,
criar residência, movimentar estoque ou aprovar tarefa física. As preparações
salvas, comparações e retomadas anteriores foram preservadas. Passaram os dois
percursos visuais móveis nas cinco larguras e o percurso existente de criação
inativa, conflito, resposta perdida e recusa de acesso local. Os ajustes na
medição e na pintura do navegador não alteraram o aplicativo nem suas regras
de contraste. Não houve nova migration.

**Entrega administrativa:** cadastro e atalhos autorizados, regras agrupadas,
permissões e propostas usam a composição do modelo. A comparação conserva
configuração vigente, proposta, versão, autoria e decisão distintas. Navegar,
filtrar e comparar não aplica mudanças. Consultas malsucedidas de regras de
avisos têm nova tentativa na seção; recusa de acesso retira dados antes
exibidos. Confirmações incertas continuam usando sua recuperação própria.

**Entrega do perfil e aparelhos:** as abas Meu perfil, Segurança, Avisos e
aplicativo, Dispositivos e Ajuda conservam os campos ao navegar, voltar e
avançar. Foto, registro, contatos, senha, autenticador, sessões, ciência,
instalação, atualização e aparelhos continuam em seus processos próprios.
Preferências e inscrições não passam para outra conta ou sessão. Permissão
negada, leitura indisponível e confirmação perdida têm recuperação preservada.
Metadados restritos de paciente não são apresentados como paciente inativo.

**Entrega de tarefas, avisos e destinos:** a faixa de atenção abre uma tarefa
real do papel atual. A central conserva filtro, todas as páginas e marcação
explícita de aviso visto. Mais opções conserva as funções autorizadas em
cartões e oferece Ajuda e Verificação. A página não encontrada permite voltar
por teclado, inclusive no WebKit. Consultar ou marcar aviso visto não registra
ciência, recebimento nem movimenta estoque. As três composições foram comparadas
ao Modelo Integral nas cinco larguras, com teclado e acessibilidade.

#### Critérios originais da aparência

- **Aplicar integralmente o Modelo Integral em todos os recursos** — As 66
  composições executáveis estão implementadas e conferidas localmente.
  Avaliação humana de contraste, ampliação e uso permanece pendente, sem PASS
  integral. A apresentação de rascunhos é a exceção expressamente adiada.
- **Fechar, voltar, confirmar e descartar mantendo o foco correto** —
  Implementação e percursos de teclado/foco conferidos localmente. Falta:
  avaliação com pessoas e tecnologia assistiva. Responsável: participantes;
  Codex corrige os defeitos constatados. O critério permanece parcial.
- **Textos longos e ampliação sem cortar conteúdo ou botões** — Textos extensos,
  larguras e contraste forçado foram conferidos nos cenários definidos. Falta:
  ampliação nativa de 400% e leitura assistida com participantes. O critério
  permanece parcial; redimensionar a janela não foi apresentado como zoom real.
- **Concluir cada composição de tela preservando suas funções** — Concluído
  localmente · 100% das 66 composições. Confirmação da CI e avaliação humana
  continuam nos gates próprios.

#### Estado por área visual

O percentual abaixo mede a implementação e conferência local do escopo
executável. A avaliação humana, física e a CI final não recebem aprovação por
esse percentual. Os painéis existentes de rascunhos foram preservados conforme
sua decisão; sua reformulação e expansão não entram no escopo executável atual.

- **Regra visual única e retirada do Fluent — 100% local.** Modelo Integral,
  componentes próprios e retirada da biblioteca anterior concluídos.
- **Cores, tipografia, espaçamentos e ícones — 100% local.** Base compartilhada
  e consumidores conferidos, incluindo avatar, cabeçalho e suporte.
- **Botões, campos, seletores, menus e diálogos — 100% local.** Controles
  reutilizáveis, ajuda, estados, navegação, decisões e foco conferidos; as
  tarefas humanas permanecem separadas.
- **Cabeçalho, menu lateral, paciente e navegação móvel — 100% local.**
  Estrutura, contexto e larguras conferidos com as permissões próprias.
- **Formulários, apoio, avisos e recuperação — 100% local no escopo vigente.**
  Fichas, decisões, consumo, estoque familiar, agenda, BAL, catálogo,
  administração, perfil e Andamentos preservam campos e recuperação própria.
  Rascunhos conservam a abrangência e apresentação existentes por sua decisão.
- **Listas, tabelas, cartões, busca e filtros — 100% local.** Saldos, movimentos,
  catálogo, unidades, embalagens, relatos, agenda, fichas, arquivos, avisos,
  propostas e auditoria conferidos, incluindo listas extensas e leitura falha.
- **Fichas de requisição, compra, entrega e balanço em abas — 100% local.**
  Cabeçalho, ações, materiais, ciência, aquisição, expedição, recebimento,
  conciliação, contagem/revisão, versões, anexos e arquivos gerados preservados.
  Devolução autônoma e parecer BAL separado do estoque estão integrados.
- **Andamentos nas quatro fichas — 100% local.** Autoria, instante, origem,
  natureza, etapa, menções, destaques e recuperação conferidos.
- **Cronologia, fatos automáticos e referências — 100% local.** Ordem, versões,
  vínculos autorizados, restrições e acessos agrupados preservados. Acesso ou
  menção não substitui ciência ou recebimento.
- **Faixa de atenção, próxima providência e status — 100% local.** Orientações
  ligadas aos fatos e tarefas reais de cada papel, sem concluir atos pela leitura.
- **Administração, cadastros, perfil e guias — 100% local.** Acesso, recuperação,
  convites, pessoas, vínculos, contas, regras, propostas, contexto, preparação
  global/local, perfil em abas e guias por papel conferidos.
- **Estoque, consumo, transferências e variantes de balanço — 100% local.**
  Origem, saldos, trânsito, declarações, relatos, correções, revisão e decisão
  mantêm quantidades, autoria e fatos antigos separados do cadastro atual.
- **Central de avisos, aplicativo e suporte — 100% local.** Central pessoal,
  instalação/atualização, aparelhos, preferências, tentativas, incidentes,
  política, auditoria e roteiro de continuidade conferidos.
- **Preservação de funções e relações — concluída no escopo executável.**
  As 66 composições e 164 relações têm comprovação local compatível; cinco
  relações de apresentação de rascunhos estão adiadas e duas foram removidas
  por decisão aprovada. Não equivale a aprovar as 171 integralmente.
- **Teclado, foco, ampliação, contraste e celular — conferência local concluída;
  avaliação humana pendente.** Falta ampliação nativa, tecnologia assistiva e
  tarefas em aparelhos reais. Não há percentual de homologação humana inferido
  das capturas ou dos testes automatizados.

## 4. Sua participação e dependências externas

As tarefas abaixo não transferem para você implementações pendentes de Codex e
não interrompem atividades independentes da fase.

| Atividade | Estado | Responsável |
| --- | --- | --- |
| Aceite das tarefas no Preview | 0% final | Você e equipe |
| Reteste S24 | Atualização e teste Push recebidos | Você; relato físico |
| Acessibilidade com pessoas | 0% homologado | Participantes |
| Destino de backup e chaves | Decisão pendente | Você |
| Agenda de backup externo | 0% ativada | Você autoriza; Codex prepara |
| Revisão do Sonar | Retomada; duplicação ainda reprova o gate | Codex |
| Piloto, suporte e canais | Não definidos | Você e equipe |
| Provedores e aparelhos reais | Pendente | Codex, você, fornecedores |
| ICP-Brasil e serviços futuros | Futuros | Você e fornecedores |
| Ensaio de recuperação | 0% realizado | Codex, você, responsáveis |
| Liberação de piloto/produção | 0%; fora do escopo | Você e responsáveis |

Você organiza os participantes das avaliações. Codex prepara os testes, orienta
e corrige o que for identificado. O uso anterior no S24 revelou a falha; após
7e27795, você confirmou atualização e recebimento do teste no endereço estável.
Isso não aprova automaticamente outros aparelhos ou todos os cenários de avisos.

Codex prepara e configura o destino e a agenda de backup após sua escolha e
autorização. O ensaio operacional completo depende também dos responsáveis
reais. Contratação ICP-Brasil não bloqueia a assinatura interna da D-B.
Integrações externas ainda não autorizadas permanecem desligadas.

### 20 — Participação externa e gates D-C/D6

Estado: pendente externo · 0%. Responsável: Você; participantes; serviços
externos.

**Condição para fechar:** Cada atividade externa é homologada pelo responsável
correspondente quando autorizada; o fechamento técnico D-B registra as que
continuam pendentes.

Pontos de verificação:

- 20.1 Teste físico do aplicativo e avisos.
- 20.2 Uso com participantes e tecnologia assistiva.
- 20.3 Impressão e conferência humana.
- 20.4 Responsáveis e residência piloto.
- 20.5 Destino externo dos backups e custódia.
- 20.6 Ensaio operacional e decisão de liberação.

As atividades, os percentuais externos e os responsáveis estão na tabela acima.
Não há autorização de liberação operacional nesta missão.

## 5. Histórico consolidado das entregas

**12/11/2026 — contingência:** declaração imutável, complementos, evidência
física, conferência por outra pessoa e vínculo com registro existente
entregues. A resposta perdida é recuperável após recarga; a revisão
concorrente exige comparação explícita. Conhecidos e desconhecidos têm
tratamento próprio, sem alterar estoque ou aceite pessoal. A etapa 16 fechou
no software; os testes humanos continuam na etapa 20. A falha inicial do
navegador era do seletor de campo obrigatório; o diálogo estava nomeado
corretamente. O finalizador de anexos foi integrado ao novo pai e suas
regressões anteriores passaram. Banco local e remoto em 237, sem pendências.

**12/11/2026 — preparação local:** adoção e abertura de estoque familiar
percorridas nos fluxos reais, consulta de tarefas por vínculo e dados restritos
preservados. Dez percursos móveis distintos passaram em rodadas compatíveis,
mais cinco cenários com contas reais de teste e três testes de contrato.
O critério de primeira residência e autoridade local foi concluído; o critério
que também exige contingência permanece parcial. Banco local e remoto em 232.
A CI do novo commit e a conferência conjunta permanecem próprias.

Este é um registro de marcos, sem outra fila de execução. As etapas 01 a 07
estão em **100% do escopo local indicado**, sob responsabilidade de Codex.
Seus pontos completos estão nos grupos funcionais indicados abaixo. A revisão
conjunta final continua na etapa 19.

| Etapa | Entrega encerrada | Detalhamento funcional |
| --- | --- | --- |
| 01 | Rascunhos das fichas e atos operacionais | 3.1 |
| 02 | Catálogo e administração diária | 3.2 |
| 03 | Leitura confiável do estoque e revisão do BAL | 3.2 |
| 04 | Estados, próximas providências e vínculos | 3.3; consumo em 3.2 |
| 05 | Busca, filtros, listas e históricos completos | 3.4 |
| 06 | Aparência das 46 composições de operação | 3.9 |
| 07 | Dados e histórico dos PDFs no escopo anterior | 3.3 |

As datas individuais dos fechamentos anteriores não foram reconstruídas.
O fechamento de 06.6 consolidou a etapa 06 com 47 cenários distintos
qualificados. Foco, links e rolagem identificados nesse lote foram corrigidos.
A troca das classes de quebra de texto também está concluída.

**Acréscimo de 11/11/2026:** o complemento documental foi incorporado como
DOC-A, DOC-B, DOC-C e DOC-D. Preserva o que já havia sido entregue nas etapas
anteriores. Sua situação e todas as regras estão reunidas no grupo 3.3.

**Marcos seguintes do complemento, na ordem registrada:**

| Marco | Resultado | Estado |
| --- | --- | --- |
| DOC-B.1 — núcleo BAL | Parecer separado da aplicação | Concluído local |
| DOC-B.1 — vínculos | Atos posteriores na ficha e no PDF | Concluído local |
| DOC-B.2 — COM | Saldo por material na ficha e no PDF | Concluído local |
| DOC-B.3 — devolução | Percurso autônomo cotidiano | Concluído local |
| DOC-B.4 — parte entregue | Ciência própria do cancelamento | Concluído local |
| DOC-B.4 — parte entregue | Novas fichas vinculadas | Concluído local |
| DOC-B.4 — fechamento | PDFs com corte e acesso | Concluído local |
| DOC-B — fechamento | Quatro pontos do acréscimo | Concluído local |

A validação automática de um incremento anterior encontrou dois testes antigos
de reconto incompatíveis com a aplicação separada do parecer. Foram corrigidos
e passaram localmente; a confirmação do commit publicado continua sendo uma
verificação própria. Esse registro histórico não aprova o candidato atual.

DOC-B passou de ≈75% para ≈90% com os vínculos e chegou a 100% local com o
PDF estruturado, em 11/11/2026. Os 105 estados originais foram preservados.
O complemento executivo posterior adiou a expansão de rascunhos da etapa 14
e a retomada simples DOC-C.1. Esse adiamento não reabre etapas anteriores
nem dispensa os demais requisitos. A etapa 07 continua encerrada somente em seu
escopo anterior.

**Revisão deste acompanhamento em 11/11/2026:** o detalhamento das etapas
01 a 20 e de DOC-A a DOC-D ficou reunido nos respectivos grupos funcionais ou
externos. O
histórico conserva os marcos; a seção 6 conserva uma única fila, com a indicação
do grupo onde acompanhar cada entrega. Foram consolidadas as descrições
repetidas e alinhadas as referências históricas aos avanços posteriores. Os
105 critérios, seus estados, percentuais e responsabilidades foram preservados.

**Reconciliação pelo complemento executivo:** uma fonte principal de andamento,
seis lotes por capacidade e integração DOC-D em cada resultado documental.
DOC-C.1 e expansão de rascunhos foram adiadas por decisão do responsável;
segurança, recuperação oficial e os demais requisitos permanecem obrigatórios.
O fechamento PDF V15 e os 14 consumidores dirigidos passaram localmente;
publicação/CI/Preview continuam identificados pelo candidato correspondente.

**12 de novembro — lote 1 concluído localmente:** composição aprovada dos cinco
modelos operacionais, integrada à assinatura e à recuperação. O restante
documental segue no lote 2; a aplicação permanece em ≈85% de refatoração visual.

**12 de novembro — DOC-C.3 concluído localmente:** acessos agrupados, histórico
paginado e competência própria nas quatro fichas, com recuperação preservada.
O lote 2 continua; menções, destaques e modalidades documentais permanecem com
Codex, sem alterar os rascunhos.

**12 de novembro — incremento de DOC-C.2:** menções e destaques implementados
na publicação oficial e na cronologia da tela, com recuperação da tentativa.
O ponto permanece parcial até a integração com os PDFs do lote 2; nenhum
critério inteiro recebeu aprovação adicional.

**12 de novembro — lote 2 concluído localmente:** Ficha Ampliada, período,
complementos e auditoria restrita integrados ao gerador e à assinatura. Menções
e destaques chegam aos PDFs; seleção e bytes são recuperados sem nova emissão.
As amostras são fictícias e usam a infraestrutura interna de teste. CI própria,
avaliação humana e requisitos gerais de confiança/recuperação continuam nos
seus gates, sem promoção adicional dos 105 critérios.

**12 de novembro — ciclo das chaves fechado localmente:** renovação, rotação,
incidente e restauração cifrada com assinatura e renovação após recuperação.
A etapa 08 e o critério de custódia fecharam no escopo local; a guarda
operacional permanece externa.

**12 de novembro — lote 3 fechado localmente:** recuperação da emissão,
processamento abandonado, conferência dos bytes e confiança atual qualificados.
As etapas 08/09/10 fecharam no escopo executável; a sequência passa ao lote 4.

**12 de novembro — lote 4 fechado localmente:** aplicativo, recuperação,
consentimento por conta/sessão e lembretes com rotação e retorno qualificados.
Os testes físicos e de entrega permanecem externos; a sequência passa ao lote 5.

Em 12/11, o incremento do lote 5 concluiu GUI-01 nos seis papéis e corrigiu a
consulta de pessoas na preparação. Passaram nove testes pequenos e 22 percursos
de navegador em duas rodadas do mesmo candidato (dois e vinte), com tipos, lint
e inspeção da tela. A primeira rodada expôs consultas antes da confirmação e
revisão acionável durante atualização de pessoas; as causas foram corrigidas.
A inspeção também identificou e corrigiu estilos que não estavam aplicados.
No ciclo anterior, 976d42c teve cinco grupos de navegador reprovados e um
cancelado; dc44507 reprovou a preparação de certificados no Windows. A correção
061722f passou depois em Linux, Windows e banco; navegadores ainda estavam em
execução na última observação. Esses são estados por commit, sem aprovação
conjunta presumida.

**12 de novembro — correção da consulta automática da ficha:** a CI de
90c9b27 expôs um deslocamento transitório do resumo e uma seleção de aba
instável. A reprodução reteve uma reconsulta e confirmou que o aviso de
carregamento deslocava a ficha já aberta. O aviso inicial foi preservado;
atualizações seguintes usam o botão existente e anúncio acessível, sem
alterar a posição dos controles. Passaram oito percursos dirigidos em Chrome
móvel e WebKit, incluindo anexo recuperado, acesso, negativa de histórico e
troca de aba durante a reconsulta. Tipos e lint dirigido passaram. As três
linhas longas reprovadas na CI de 2d7daa6 foram formatadas, sem suprimir regras.
O conjunto ainda depende da CI do novo commit.

**12 de novembro — tarefas, avisos e destinos:** ADM-01, NOT-01 e ADM-06
concluídos localmente. Seis percursos em build de produção passaram em Chrome
móvel e WebKit; dez regressões anteriores de perfis, paginação e privacidade
foram reutilizadas de rodadas compatíveis. A leitura prematura dos links foi
corrigida no teste; o avanço por teclado na página 404 foi corrigido no produto
e reproduzido isoladamente no WebKit. A conferência visual também corrigiu
métricas antigas e a composição dos cartões. Restam 15 composições; banco
permanece em 237. Na CI de 90c9b27, Linux, Windows, banco, Chromium e móvel 2
passaram; móvel 1 reprovou e iOS foi cancelado. Em 2d7daa6, o Markdown reprovou
e a execução foi depois cancelada pelo novo push; o Preview havia concluído.
Em 11cb226, Linux e Windows passaram e o Preview concluiu; banco ainda estava
em execução na observação. A CI do incremento atual continua obrigatória.

**12 de novembro — perfil e aparelhos:** ID-02, NOT-02 e NOT-04 concluídos
localmente. Vinte e oito percursos distintos foram qualificados em rodadas
compatíveis de Chrome móvel e WebKit, com comparação ao HTML em cinco
larguras, teclado, foco e leitura. Os testes anteriores conservaram negativas,
recuperação de foto, credenciais, ciência, sessão, atualização e cache privado.
A leitura de estilos da referência no WebKit exigiu sua renderização antes
da comparação; o problema foi reproduzido isoladamente. A comparação exata
permaneceu. Não houve ampliação de rascunhos ou alteração de banco. Restam
12 composições; 54 das 66 têm fechamento local. Na CI de e43961f, Linux,
Windows, banco, Chromium 2 e os dois grupos móveis passaram. Chromium 1
reprovou e iOS foi cancelado; essa falha será tratada separadamente antes
do fechamento conjunto. Sonar continua adiado.

**12 de novembro — abertura das operações:** uma atualização automática entre
pressionar e soltar o botão podia impedir a abertura do formulário. A condição
foi reproduzida e corrigida, sem registrar uma operação ou mudar documento e
estoque ao abrir. Oito percursos passaram em uma rodada de produção, incluindo
Chromium, Chrome móvel e WebKit. As verificações de BAL, retomada de COM e
cancelamento de ENT continuam preservadas. A conferência de acessibilidade do
BAL parte do topo após mudar a largura, usando o procedimento existente. Os
quatro casos da CI anterior também passaram localmente antes da correção; isso
não determina a causa de todos os cliques perdidos naquela execução. O Preview
de 2fea104 concluiu; a CI da correção publicada continua obrigatória.

**12 de novembro — administração e regras:** ADM-02/03/04 e NOT-03 tiveram
fechamento visual local. Nove percursos distintos passaram em rodadas de
produção compatíveis, preservando listas grandes, leitura recusada, tipos
desconhecidos, versões e recuperação da mesma intenção. A navegação recebeu
conferência final em Chrome móvel e WebKit após retirar uma herança visual de
botão. Restam oito composições; 58 das 66 têm composição visual conferida.
As 171 relações continuam pendentes de conferência própria, sem aprovação por
esses resultados visuais. Não houve mudança de banco, canais ou rascunhos.
Em b528f1d, Linux, Windows e Preview passaram; banco ainda estava em execução
na observação. A CI do novo incremento continua obrigatória; Sonar está adiado.

**12 de novembro — identidade e acesso:** ID-01/03/04/05 fecharam no escopo
visual local, chegando a 62 de 66 composições. A decisão do convite agora exige
conferência do vínculo e conserva a mesma tentativa incerta. A seção 15 registra
as verificações e os limites; a CI própria continua necessária. Não houve nova
migration ou alteração de canal, produção ou rascunho comum.

**12 de novembro — preparação global:** GUI-02 teve fechamento visual local,
chegando a 63 de 66 composições. Formulário e resumos mantiveram criação,
responsáveis, recuperação e limites de autorização. O detalhamento e o restante
continuam na etapa 15; as atividades físicas permanecem separadas.

**12 de novembro — relações entre telas:** as 171 relações foram vinculadas
aos consumidores e verificações atuais, preservando as decisões e pendências.
COM/BAL têm consulta real de referências dos Andamentos qualificada, e o avatar
compartilhado coincide com o modelo. A sequência segue ao lote 6; os 105
critérios permanecem 72 verificados e 33 parciais até o fechamento técnico.
Na CI de c5641bf, Linux, Windows, banco e Preview passaram; os seis grupos de
navegador ainda estavam em execução na observação. Sonar permanece adiado.

**12 de novembro — suporte e continuidade:** as três composições técnicas
restantes e suas quatro relações fecharam localmente. Visão global de tentativas,
auditoria, política e incidentes preservam autorização e confirmação explícita.
Os fluxos de recuperação e foco passaram em Chrome móvel e WebKit, junto da
comparação visual e acessibilidade dirigidas. Backup crítico e restauração
isolada conferiram o conteúdo atual; local/remoto chegaram a 238. O grupo 3.7
ganhou sete conclusões técnicas, chegando a 79 critérios verificados e 26
parciais. O fechamento integrado desses parciais continua com Codex.

**CI iOS desse marco:** os dois grupos de 0dbd2ba foram cortados pelo limite
de 40 minutos. Não houve cancelamento por falha de outro grupo; Linux, Windows,
banco e os quatro grupos Chromium/móvel passaram. Perfil e estoque apresentaram
falhas nessa execução, mas ambos passaram na reprodução local WebKit. A causa
dessas falhas de caso ainda depende da nova CI. O limite específico de WebKit
passou a 70 minutos, com os mesmos casos e regras; erros serão publicados ao
terminar cada teste e seus arquivos serão preservados mesmo em cancelamento.
Isso corrige o corte e a perda de diagnóstico, sem declarar a CI já aprovada.

**12 de novembro — reconciliação final dos critérios:** os fechamentos de
formulários, listas, emissão, recuperação, verificação e anexos foram associados
aos critérios que ainda conservavam pendências anteriores. Foram preservadas
as provas e os IDs; não houve nova implementação ou repetição de suíte por essa
atualização. São 96 critérios verificados tecnicamente e nove parciais. Os nove
conservam avaliação humana/assistiva, piloto real, apresentação/expansão de
rascunhos adiada ou CI/Sonar. A validação da CI permanece com Codex; o adiamento
do Sonar não aprova a qualidade nem dispensa corrigir falhas efetivas da CI.

## 6. Sequência única do trabalho restante

Esta é a única fila vigente, reconciliada pelo complemento executivo. Cada lote
entrega uma capacidade utilizável e atravessa as camadas necessárias. Os IDs
01–20 e DOC-A/B/C/D continuam nos grupos acima e na matriz dos 105 critérios;
não foram renumerados ou aprovados em bloco. Os percentuais anteriores são
referências de escopo, não serão recalculados para cada pequena edição.

### Lote 1 — PDFs reais com a aparência aprovada

**Concluído localmente.** DOC-A.1–6 e a parcela operacional de DOC-D estão
entregues. CI própria e avaliação humana continuam separadas.

- **Resultado:** gerar REQ, COM, ENT, devolução e BAL na composição aprovada,
  com seus dados reais, assinatura, guarda, consulta e recuperação atuais.
- **Requisitos:** DOC-A.1–6 e DOC-D.1–4; conteúdo já entregue em 07/DOC-B;
  regressões diretamente afetadas de 09/10. Critérios detalhados no grupo 3.3.
- **Dependências:** compositor compartilhado, fontes e fatos já disponíveis.
  Modalidades DOC-C e rascunhos não bloqueiam este lote. Uma amostra real será
  gerada cedo para conferir a direção visual.
- **Limites:** preservar bytes, identidades, fontes e revisões anteriores;
  nenhum redesenho do aplicativo ou alteração de confiança criptográfica.
- **Validação e fechamento:** conteúdo e paginação representativos, inspeção
  dos PDFs reais e percurso integrado assinado. Fecha quando todos os cinco
  modelos usam a composição aprovada com os fatos e permissões preservados.

### Lote 2 — Modalidades e acompanhamento documental

**Concluído localmente.** DOC-C.2–5 e DOC-D estão integrados e conferidos.
DOC-C.1 permanece adiado por decisão sua. O próximo lote é o 3, sem reabrir os
rascunhos ou redefinir este fechamento como aprovação global da D-B.

- **Resultado:** Ficha, Ficha Ampliada e auditoria restrita nominativa, com
  seleção/período, Andamentos estruturados, referências, menções e acessos
  agrupados; geração e consulta reais nas modalidades autorizadas.
- **Requisitos:** DOC-C.2–5, DOC-D distribuído e relações documentais do grupo
  3.3. DOC-C.1 permanece OWNER-DEFERRED, sem PASS.
- **Dependências:** composição do lote 1 e autorização atual das fontes;
  cancelamento, complementos, BAL, COM e devolução já entregues são
  reutilizados.
- **Validação e fechamento:** domínio/API/Auth nos novos fatos e permissões;
  conteúdo e navegador representativos no candidato estável. Fecha quando as
  modalidades e o acompanhamento funcionam juntos sem substituir ciência,
  recebimento, autoria ou recuperar dados sem autorização.

### Lote 3 — Confiança, custódia e recuperação documental

**Concluído localmente.** As etapas 08/09/10 estão qualificadas, com recuperação
e resultados separados de identidade, bytes, assinatura, tempo e confiança.
Os gates operacionais, humanos, físicos e de CI continuam explícitos.

- **Resultado:** completar o ciclo das chaves, recuperação da emissão e
  conferência dos arquivos nas situações ainda pendentes.
- **Requisitos:** restante de 08/09/10, critérios do grupo 3.3.
- **Dependências e limites:** provedores internos e exemplares atuais;
  contratação ICP-Brasil e custódia operacional externa são gates separados.
- **Validação e fechamento:** regressões criptográficas, falhas e concorrência
  realmente pendentes; não repetir o que os lotes 1/2 já cobrirem de forma
  compatível. Fecha com recuperação e resultados corretos nos casos previstos.

### Lote 4 — Aplicativo, avisos e lembretes

**Concluído localmente, incluindo o acréscimo S24.** Atualização explícita e
teste pessoal de Push fecharam no software, conforme o grupo 3.6. Instalação física,
retorno efetivo do provedor e prova operacional permanecem na etapa 20.

- **Resultado:** instalação/atualização, uso protegido no Preview, notificações
  internas/Push e retorno dos lembretes após parada completos no software.
- **Requisitos:** 11/12/13, grupo 3.6.
- **Dependências e limites:** service worker pronto e inscrições autorizadas;
  envio externo e ensaios físicos dependem dos gates expressos, sem ativação
  nova.
- **Validação e fechamento:** offline sem cache privado/replay, recuperação,
  atualização e destinatários em cenários representativos. Separa conclusão do
  software dos testes físicos e de fornecedor ainda não realizados.

A correção delimitada das falhas de CI foi implementada e conferida localmente
antes do lote 5. A CI do novo commit continua na etapa 19; esse gate não cria
um novo lote de funções nem impede as implementações independentes.

### Lote 5 — Jornadas restantes e aparência do aplicativo

GUI-01/02, preparação local com adoção/abertura, contingência e identidade/acesso
estão entregues localmente. As três composições restantes de suporte,
NOT-05/ADM-05/GUI-04, acompanham a integração técnica
do lote 6. A conferência própria das 171 relações está encerrada no recorte
disponível: cinco de apresentação de rascunhos adiada e duas removidas
permanecem explicitadas. As demais 164
têm comprovação local compatível.

- **Resultado:** demais áreas visuais, relações, entrada, administração e guias
  completos no Modelo Integral, sem perda de funções.
- **Requisitos:** 15/16 e somente a parcela obrigatória de 14; grupos
3.4/3.5/3.9.
- **Dependências e limites:** funções e permissões já existentes; rascunhos
  congelados. Sem ERP, outro produto ou gestão integral de escalas.
- **Validação e fechamento:** componentes e jornadas afetados, teclado/foco,
  acessibilidade e larguras nos candidatos estáveis. Fecha as composições e
  relações restantes, com orientação operacional coerente.

### Lote 6 — Continuidade operacional e fechamento técnico

**Software de suporte e continuidade concluído localmente.** As etapas 17/18 e
as três composições visuais restantes fecharam. O lote permanece aberto somente
para a etapa 19, na sequência finita abaixo; a CI publicada ainda precisa passar.

- **Resultado:** monitoramento/suporte, backup/recuperação e candidato final
  coerentes com banco, Preview, contratos e configuração de uso.
- **Requisitos:** 17/18/19; grupos 3.7/3.8 e regressão integrada restante.
- **Dependências e limites:** software dos lotes anteriores e serviços internos;
  destino/rotina externos e liberação operacional continuam separados.
- **Validação e fechamento:** exercícios de falha/recuperação previstos, CI do
  SHA final e migrations prontas reconciliadas. Sem reset, merge ou produção.

**Ordem atual do restante, sob responsabilidade de Codex:**

1. Conferir a CI e o Preview do incremento com o ícone e as correções de
   layout/teste. A CI7e27795 terminou, incluindo ambos iOS, sem cancelamento.
   As migrations prontas estão reconciliadas. Prosseguir no diagnóstico da
   lentidão de autorização Realtime, sem mudanças de configuração especulativas.
2. Concluir a etapa 19 com a CI do SHA novo, estado real do Sonar, banco e
   Preview. Entregar o estado técnico e os próximos gates, sem merge/produção.

### Gates externos e adiamentos

A etapa 20 (grupo 4) conserva avaliação humana, aparelho físico e fornecedores.
A reformulação/expansão de rascunhos permanece adiada expressamente pelo
responsável. A revisão do Sonar foi retomada em12/11. Nenhum adiamento recebe
PASS. As responsabilidades de
implementação continuam com Codex; dependência externa não encobre código
faltante.

Concluído tecnicamente, validação pendente, avaliação humana, bloqueio externo e
OWNER-DEFERRED são estados distintos. A D-B executável fecha somente com os
requisitos vigentes implementados e integrados, ressalvados esses gates reais.
