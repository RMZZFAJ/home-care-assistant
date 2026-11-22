# Preparação do fechamento da PR 7

**Estado em 21/11/2026.** Preparação do encerramento técnico e da passagem de
trabalho. A [PR 7][pr7] está aberta em rascunho. A base é `master` em
`8ec979aa`, merge da PR 6. A entrega de L2 segue na branch
`feat/phase-d-implementation`. Os resultados de CI já concluídos neste
registro correspondem ao candidato `140b4297`. Produção permanece **NO-GO**.

A base remota observada é ancestral do candidato. A PR estava sem fios de
revisão abertos na consulta GraphQL. A API não registrava regras de branch
ativas para `master`. Os gates documentados continuam a orientar a decisão
de integração.

## Como consultar este registro

- [Achados A/B](PR7_ACHADOS.csv) liga 165 registros às 121 causas de C1 e ao
  critério de referência. O estado do critério é o que consta na matriz de
  execução. Essa ligação não comprova manifestações secundárias por si só.
- [Critérios C/D](PR7_CRITERIOS.csv) reúne os 187 casos de C9 e 30 complementos
  de D-B. Cada linha mantém fase, fonte de prova, limite e próximo passo.
- [Contratos atuais](../current/README.md) descreve o comportamento em uso.
  [Andamento D-B](../../TEMP_D_B_ATUALIZACAO.md) conserva os incrementos e
  [L1–L4](D/D-B/LOTES_EXECUCAO.md) registra paridade, complementos, decisões e
  migrations. Este fechamento aponta para essas fontes ao sintetizar o estado.
- Os volumes e os estados de acervo foram conferidos por ID. O registro de
  evidência anterior preserva o SHA, ambiente e limite declarados na origem.

## Escopo entregue e evidências por fase

- **A.** Diagnóstico de prontidão com 32 registros e dois P1 originais.
  A prova local de D1 cobre os dois P1. A operação real continua dependente
  de homologação. [Fase A](A/README.md).
- **B.** Aprofundamento B1–B8 com 133 registros, experimentos, matrizes e
  pareceres. Revalidar as manifestações cuja correção ainda precisa de
  evidência específica. [Fase B](B/README.md).
- **C.** C0–C10 foram integrados à base pela PR 6. O pacote reuniu 165
  registros em 121 causas e planejou 187 casos de aceitação.
  [Fechamento C10](C/C10-pr-handoff/README.md).
- **D-A.** D0–D2 com 81 critérios e evidências de guardas, operação, precisão,
  concorrência e autorização. Os requisitos de dispositivo, participante,
  fornecedor e operação estão por critério.
  [Aceites D-A](D/D-A/ACCEPTANCE_EXECUTION.csv).
- **D-B.** D3–D5 e complementos de fichas, PDFs, L1 e L2. A matriz contém
  105 critérios, com 90 aprovações locais, duas reconciliações remotas e 13
  registros parciais. Falta fechar a etapa 19 para o candidato efetivo.
  A etapa 14 conserva os adiamentos e a 20 reúne os gates externos.
  [Aceites D-B](D/D-B/ACCEPTANCE_EXECUTION.csv).
- **D-C/D6 e D7.** Preparações técnicas e runbooks estão disponíveis. Piloto,
  homologação e liberação dependem dos gates da etapa 20. WhatsApp, Meta e
  Flows seguem adiados.

### Dos diagnósticos à prova de execução

- **A.** `UX-001` tem regressões de revisão de agenda com Auth, RPC e navegador
  em `C-AC-009`. `DB-002` tem teste SQL e integração de alcance do agendador
  em `C-AC-049`. Essas provas tratam as causas originais no ambiente indicado.
  Permanecem o ensaio, a operação e a homologação da primeira liberação.
- **B1, interface.** As fichas em abas, os fluxos operacionais, os acessos e as
  composições do Modelo Integral foram implementados por incrementos.
  Continuam a avaliação visual do responsável e os testes humanos e assistivos.
- **B2, processos.** REQ, compra, chegada, ENT, DEV, BAL, consumo e agenda têm
  regras e contraprovas. Continuam as exceções de L2 e os procedimentos cuja
  confirmação depende de pessoas e papéis reais.
- **B3, banco.** Migrations, RPCs, estoques e RLS têm provas locais e
  reconciliações de desenvolvimento. Continuam a conferência do esquema na
  futura liberação e os papéis de custódia e recuperação operacional.
- **B4, backend.** Autorização, precisão e recuperação de resposta têm testes
  de contratos, API e Auth. As operações da etapa 19 dependem da CI do SHA e
  cada superfície conserva seus limites na matriz.
- **B5, integrações.** Avisos internos, Push, retomada e agendamento têm provas
  técnicas delimitadas. Adiamentos de WhatsApp, Meta e Flows e homologação de
  provedores passam ao planejamento futuro.
- **B6, documentos.** Os exemplares assinados, a verificação e a recuperação
  têm provas locais. Permanecem leitura, impressão e tecnologia assistiva
  reais, além das decisões operacionais sobre confiança e custódia.
- **B7, operação.** Preparação da residência, contingência, monitoramento e
  recuperação têm software, ensaios técnicos e runbooks. Falta definir
  piloto, suporte, destino independente e exercitar o processo completo.
- **B8, qualidade.** Guardas, oráculos e diagnósticos foram tratados por
  incremento. Conferir CI e Sonar do candidato, intermitências, cobertura
  assistiva e métricas de desempenho ainda sem orçamento aprovado.

### Como ler os critérios ainda abertos

Dos 187 IDs de C9, 81 aparecem em D-A, 75 em D-B e 31 ainda não têm linha
correspondente nas duas matrizes. A distribuição dos 31 é um C6, sete D6,
17 D7 e seis D-LATER. A ausência de linha não decide o estado da funcionalidade.

- **C6, `C-AC-002`.** Os índices vigentes divergiam sobre início de D, SHA,
  migrations e data do diagnóstico. Este pacote atualiza as entradas principais
  e deixa os instantâneos datados disponíveis. A responsabilidade por manter
  a entrada de estado deve acompanhar o fechamento de cada candidato.
- **D6.** Os sete IDs tratam da prova histórica BAL, recuperação conjunta,
  vínculo do release ao SHA, compatibilidade de esquema/configuração,
  quarentena da restauração, primeira residência e verificação operacional.
- **D7.** Os 17 IDs permanecem rastreados por recurso e gate. Revalidar o
  contrato aplicável, o comportamento e o provedor quando houver autorização
  para retomar. Os adapters de teste não homologam o provedor.
- **D-LATER.** Seis IDs tratam de custo da visão geral, componentes antigos,
  crescimento dos snapshots, custo de autorização e alertas, política de
  cabeçalhos e acompanhamento de dependências de documentação. Revalidar
  cada ponto contra o código da futura base antes de propor correção.

## Entrega de produto pela PR 7

- **D0–D2.** Guardas de ambiente, testes de acesso e recuperação, progresso do
  agendador, revisão de agenda, catálogos, operação de insumos e estoques de
  custódia. Autor, versão, autorização e movimentos têm provas próprias.
- **D3–D5.** Operação por paciente e vínculo, fichas, administração, busca e
  agenda, formulários, recuperação oficial, PDFs aprovados e verificação,
  PWA, avisos, Push, agendamento, suporte, contingência e recuperação.
- **L1.** E01–E03 seguem o laboratório v3 e os comentários posteriores.
  Materiais reúne o acompanhamento, Mais dá acesso a ações e identificação
  técnica, e a ciência familiar da REQ fica em Visão geral. Fichas extensas
  e Andamentos têm retomada do último preenchimento. Decisões curtas descartam
  campos ao sair e mantêm recuperação separada quando o resultado oficial
  é incerto. As decisões R1 e R3 preservam a revisão BAL e pedem nova avaliação
  familiar quando o recebimento diverge da declaração de atendimento integral.
- **L2.** E04–E06 seguem o laboratório v7. Assistentes partilham etapas,
  rodapé, retomada e ações de material. Os fluxos separam estoque informado,
  aquisição, chegada aprovada, quantidade expedida, quantidade recebida e
  suficiência. Materiais, vínculos, PDFs e arquivamento usam os atos reais.
  A matriz de referência e o registro mencionam todos os 56 cenários da v7.
  As 175 variantes do laboratório abrangem estados dessas superfícies.
- **Migrations.** A stack local e o desenvolvimento autorizado têm 320
  versões, incluindo `20261121202419`, da retomada do arquivamento. A
  aplicação foi precedida por backup integral cifrado e verificado. O plano
  posterior ficou vazio. As 84 migrations históricas seguem protegidas.
  [Registro da aplicação](D/D-B/MIGRATIONS.md#retomada-do-arquivamento--320-versões).

[Paridade, complementos, testes e migrations](D/D-B/LOTES_EXECUCAO.md) ·
[Matriz das 20 etapas](D/D-B/EXECUTION_STAGES.csv)

## Validação do candidato e limites

O Ubuntu, o Windows e o SonarCloud aprovaram `140b4297`. O banco passou na
instalação limpa, na evolução legada e nas 832 integrações, sem falhas ou
casos ignorados. A Vercel entregou a prévia desse SHA. A consulta autenticada
por CLI obteve HTML da aplicação e `/api/runtime` em estado `ready`, protocolo
1 e esquema 2. A sessão automatizada de navegador da prévia ficou na
autenticação da Vercel. Os seis grupos E2E passaram, com 1.675 aprovações
de primeira e duas na segunda tentativa. O [registro L1–L4](D/D-B/LOTES_EXECUCAO.md)
detalha as intermitências do catálogo e da COM e a validação local.
[CI 44936427732][ci140] · [Prévia do candidato][preview140] · [SonarCloud][sonar]

Os commits `8b6af7a4` e `1a1395a9` cobrem o estado de falha e a
retomada do arquivamento após recarga. A validação final passou em 12 casos
dirigidos no Android e iOS emulados. `c63cb408` estende o modal à conclusão
e à reabertura. No ajuste final, passaram três casos dirigidos por emulador.
A entrega inclui a revisão dos cancelamentos de REQ, COM, ENT e DEV e a
recuperação com a chave original em caso de resultado incerto. Dos 22 casos
móveis dirigidos, 21 passaram na rodada inicial. O caso restante passou
isoladamente depois de um timeout no login da massa de teste. A CI precisa
conferir o SHA final dessas correções. A aprovação visual do responsável
continua prevista para o candidato da PR.
[Registro L2](D/D-B/LOTES_EXECUCAO.md).

Na CI anterior, os seis grupos terminaram com três casos de falha persistente,
sete ocorrências entre os grupos e dois casos recuperados na segunda tentativa.
Após a revisão, 15 execuções dirigidas passaram de primeira em Chromium,
Android emulado e iOS emulado. Os logs antigos continuam úteis para identificar
a origem da falha. [CI 44926343700][ci558]

## Fila de continuidade

1. **Etapa 19 e revisão visual L1/L2.** Aguardar a CI do candidato final com
   a PR em rascunho. Conferir os resultados e a prévia desse SHA. Após a
   decisão de abrir para revisão, tratar os apontamentos automáticos antes
   de integrar. O roteiro em celular permanece disponível ao responsável.
2. **Decisões de L2.** Registrar as respostas explícitas às questões abaixo.
   Atualizar contratos, testes e migrations quando o comportamento mudar.
3. **L3 e L4.** Cada lote precisa de referência, ordem e autorização próprias.
   Preservar as jornadas aprovadas em L1/L2.
4. **DOC-C.1, formulários restantes e D-LATER.** Retomar o escopo aprovado.
   Manter a recuperação de atos oficiais e corrigir defeitos comprovados.
5. **D-C/D6 e etapa 20.** Identificar pessoas, residência, dispositivos,
   tecnologia assistiva, impressão, infraestrutura, ensaio e aprovação
   operacional.
6. **D7 e provedores adiados.** Autorizar o serviço e validar em ambiente,
   conta e destinatários aprovados.

### Decisões pontuais

- **L2 P1.** Definir a reversão de uma contagem REQ antiga após uma contagem
  oficial posterior. Hoje a reversão antiga fica bloqueada e preserva o
  saldo posterior. É uma reserva diferente dos P1 históricos da Fase A.
- **L2 P2.** Definir quem confirma origem e como o excedente de ENT/DEV será
  debitado e creditado, incluindo o desfecho em caso de recusa. Hoje o
  excedente fica em apuração e o crédito se limita ao reconhecido.
- **Extras não identificados de ENT/DEV.** Decidir se os materiais já
  identificados podem ser expedidos enquanto o extra fica pendente. O
  candidato guarda o rascunho e aguarda a identificação para expedir.
  A COM mista já pode prosseguir com a parcela identificada.
- **C7 e etapas 14/20.** O registro C7 mantém a decisão de origem. O
  [complemento executivo](D/D-B/OWNER_EXECUTION_SUPPLEMENT.txt) e a
  [ordem D-B](D/D-B/OWNER_EXECUTION_ORDER.txt) definem os recortes posteriores.

[Reservas de L2](D/D-B/LOTES_EXECUCAO.md#decisões-e-dúvidas-de-l2) ·
[Decisões e gates C7](C/C7-decision-closure/OPEN_DECISIONS.md)

#### Decisões anteriores e o que falta

- **P02.** Ciência familiar aprovada. Retomar apenas regressões ou escopo
  adicional autorizado.
- **P03.** Backup diário e extraordinário antes de operações críticas,
  retenção de sete cópias diárias e quatro semanais e criptografia aprovados.
  RPO de até 24 horas e RTO de até oito horas são metas a demonstrar.
  Falta ativar destino independente, nomear responsáveis e provar a
  recuperação operacional.
- **P05.** Regularização e PDF posterior têm implementação. Cabe ao piloto
  identificar responsáveis e substitutos e aprovar o procedimento excepcional
  com autorias distintas.
- **P07.** DEV autônoma e retorno com vínculo opcional têm implementação.
  A retirada de caminhos antigos depende de equivalência, segurança e aceite
  específicos.
- **P08.** A ordem D-B preserva PDFs, documentos oficiais, autoria e versões.
  O titular pode descartar seu rascunho. A eliminação futura de documentos
  oficiais e prazos ainda abertos exigem decisão específica.
- **P09.** Certificado do sistema e TSA interna foram aprovados para esta
  etapa. Nomeação de custodiante, procedimento de rotação e recuperação
  operacional e confiança externa têm gates próprios.
- **P10.** Falta homologar aparelhos, sistemas, navegadores, tecnologia
  assistiva, impressão e tarefas com os participantes.
- **P13.** Monitoramento interno implantado no escopo técnico. Faltam
  responsáveis, regras de escalonamento, tempos de atendimento e validação
  de monitor externo quando autorizado.
- **P15.** Revogação, rechecagem e recuperação têm contraprovas técnicas.
  Homologar a modalidade de transporte e seus limites, inclusive para
  arquivos que a pessoa já recebeu.
- **OPS-01.** Reconciliar mecanismos legados e escolher, por produtor e
  consumidor, quais manter ou aposentar e como cobrir períodos perdidos.
- **PERF-01.** Medir fluxos representativos, aprovar metas de volume e
  latência por superfície e registrar o responsável pela medição.

### Homologação e liberação

Para D-C/D6, preparar a lista de responsáveis e substitutos, residência e
participantes piloto, dispositivos/OS/navegadores, tecnologia assistiva,
impressão e acesso autorizado. Definir canais e escalonamento de suporte,
destino externo de backup e custódia. Aplicar a política aprovada e medir
RPO e RTO no ensaio isolado.
Executar ensaio de restauração operacional com quarentena, verificação de
banco/objetos/configuração e reconciliação de agendadores. Validar envio e
permissões usando os serviços autorizados. Formalizar a decisão de liberação
com SHA, esquema, configuração, rollback e responsabilidade. A confirmação
anterior de atualização e Push no S24 é evidência daquele cenário específico.
ICP-Brasil segue como evolução futura da assinatura.

## Preparação para integrar e retomar

### Vínculo entre master e produção

A Vercel está conectada ao GitHub, acompanha `master` como branch de
produção e tem atribuição automática de domínios ativa. A implantação de
produção observada aponta para a base `8ec979aa`. Um merge pode disparar
uma implantação de produção do candidato. A aprovação do código e o
isolamento dessa publicação precisam ser decididos antes da integração
enquanto produção estiver NO-GO.

Para integrar o código mantendo produção isolada, definir e autorizar o
mecanismo de suspensão da publicação automática de `master` e comprovar seu
efeito antes do merge. Se a publicação fizer parte da decisão futura, ela
exige homologação, compatibilidade de esquema, sequência de ativação e
rollback aprovados. [Implantação Git na Vercel][vercel-git].

### Sequência da passagem

1. Conferir a árvore e os commits destinados à PR. A organização documental
   e os dois ajustes de testes locais podem ser revisados separadamente.
   As opções de inicialização do Java em `.vscode/settings.json` ficam fora
   do pacote de auditoria. Os 13 relatórios de CI locais ficam preservados
   sob `output/playwright/ci-44897709633/`, com hashes conferidos antes e
   depois.
2. Confirmar SHA, CI, retries, Sonar, preview, base, ancestry, conflitos,
   comentários que exigem ação e migrations antes do pedido de integração.
   Distinguir requisitos de integração do código dos gates de liberação.
3. Quando Renato autorizar, confirmar a estratégia de merge que preserve a
   história revisada. Conferir o commit integrado e a base sincronizada
   antes de encerrar a branch. A nova branch deve partir da base conferida
   e usar esta fila e as matrizes existentes.
4. Manter a PR em rascunho até a decisão. O fechamento documental não
   altera dados remotos, configuração de produção ou o estado de liberação.

[pr7]: https://github.com/RMZZFAJ/home-care-assistant/pull/7
[ci140]: https://github.com/RMZZFAJ/home-care-assistant/actions/runs/44936427732
[ci558]: https://github.com/RMZZFAJ/home-care-assistant/actions/runs/44926343700
[preview140]: https://home-care-assistant-bs5ldi4z2-rmzzfajs-projects.vercel.app
[sonar]: https://sonarcloud.io/dashboard?id=RMZZFAJ_home-care-assistant&pullRequest=7
[vercel-git]: https://vercel.com/docs/git
