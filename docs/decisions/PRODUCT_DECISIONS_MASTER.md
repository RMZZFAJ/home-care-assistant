# PRODUCT DECISIONS MASTER — HOME CARE ASSISTANT

Registro inicial das decisões expressas do responsável | Entrada canônica da
Fase C

**Situação:** fonte inicial para C2; o Codex está autorizado a revisar,
dividir, mover e renomear este arquivo, inclusive para
`docs/decisions/PRODUCT_DECISIONS_MASTER.md`, preservando integralmente as
decisões expressas e a proveniência. **Não confundir decisão aprovada com
funcionalidade já implementada.**
**Referência temporal:** decisões comunicadas em 30/10/2026, depois do
encerramento da B8.
**Produto:** Home Care Assistant; aplicação de gestão operacional de home
care, sem pressupor prescrição ou decisão clínica.
**Estado das auditorias:** A e B1–B8 concluídas, ainda NO-GO para operação.
**Diretriz principal:** especificar integralmente em C; implementar somente
após autorização da D.

## Semântica de status

<!-- c-table:start -->

- **Status:** `OWNER_APPROVED`

  **Significado:** O responsável decidiu a regra/finalidade. Detalhes técnicos
  não podem contradizê-la.

- **Status:** `OWNER_DIRECTION_NEEDS_DETAIL`

  **Significado:** Direção aprovada; contrato e exceções ainda necessitam
  especificação ou decisão pontual.

- **Status:** `TECHNICAL_IMPLEMENTATION_DELEGATED`

  **Significado:** O responsável delegou o desenho técnico, não autorização
  para executar nem escolher política humana não respondida.

- **Status:** `OWNER_DEFERRED`

  **Significado:** A funcionalidade/decisão foi postergada; não é requisito do
  primeiro lançamento.

- **Status:** `EXISTING_TO_PRESERVE`

  **Significado:** O comportamento/capacidade existe e deve ser aproveitado,
  não recriado.

- **Status:** `PENDING_OWNER`

  **Significado:** Uma escolha ainda não foi aprovada. A Fase C deverá propor
  alternativas e plano condicional.

- **Status:** `RECOMMENDATION_NOT_APPROVED`

  **Significado:** Proposta do assistente ou da auditoria que não pode ser
  considerada escolha feita pelo responsável.

<!-- c-table:end -->

### Princípios transversais aprovados ou herdados dos contratos do produto

- Paciente, papel de plataforma, papel por paciente, vínculo profissional,
  escala e identidade de um ato têm significados diferentes.
- REQ **não tem quantidade solicitada obrigatória**; necessidade e estoque
  observado não são a mesma coisa.
- Registrar relato não é confirmar consumo; ciência não é recebimento; escala
  não é presença.
- ENT só recebe confirmação física pela pessoa que efetivamente recebeu,
  **indelegável**; não simular assinatura após desligamento.
- A gestão de estoque deve preservar custódia, trânsito, movimentos oficiais,
  quantidade e proveniência, sem duplicação.
- Dados históricos, versões e autores são preservados mesmo depois de
  alterações cadastrais ou revogações.
- Documentação de ciência tácita não pode afirmar acesso ou leitura de
  conteúdo não visualizado.
- Dados e documentos reais devem ser separados de fixtures/snapshots das
  auditorias.

---

## BLOCO A — 27 RESPOSTAS DO RESPONSÁVEL

## DEC-001 — Escopo de primeira utilização

**Status:** `OWNER_APPROVED` para objetivos e prioridades;
`OWNER_DIRECTION_NEEDS_DETAIL` para perfis/canais e homologação.

**Decisão:** disponibilizar o sistema como plataforma operacional abrangente.
Prioridades inegociáveis de funcionamento perfeito: requisições (REQ),
entregas (ENT), balanços (BAL), estoque, aquisições (COM) no processo que
sustenta esses fluxos, cadastro e identificação dos profissionais, acesso e
permissões do profissional/família/administração da família, PDFs completos,
interface consistente e linguagem humana. Formulários com orientações,
exemplos, listas úteis, estados elegantes de loading, vazio, erro, falha,
retorno incerto e sucesso. Histórico e recuperação.

**Escala inicial:** vínculo de profissional em dia/horário, com seleção
eficiente de muitos dias em um mês, períodos superiores a 30 dias e
**recorrências**; início e fim padrão do plantão configuráveis, inclusive
turnos que atravessam meia-noite; alterações pontuais, substituição e
identidade preservadas.

**Canais:** WhatsApp/Meta/Flows postergados até resolução da aprovação
externa. **Novo requisito prioritário**: aplicativo instalável como PWA, com
**Web Push** no celular. Notificações internas continuam fonte persistente de
pendências. Push não comprova ciência, leitura ou recebimento físico.

**Pessoas:** profissional, familiar e administrador da família devem funcionar
integralmente; capacidades próprias de supervisão e somente-leitura podem ser
ativadas depois. Isso não impede produzir guias para supervisão.

**Obrigação da C:** explicitar quais recursos existentes são mantidos, quais
serão corrigidos, quais são novos e quais ficam com ativação posterior. Não
declarar pronto o que depende de D/homologação.

## DEC-002 — Registro de acesso e modalidades de ciência

**Status:** `OWNER_APPROVED` para três modalidades e trilha de acesso;
`OWNER_DIRECTION_NEEDS_DETAIL` para modalidades por tipo/limites.

**Decisão:** sempre que qualquer usuário efetivamente acessar/abrir uma ficha,
registrar quem e quando; distinguir acesso de ciência. Para obrigação de
ciência, oferecer:

1. **Manual:** ação expressa de ciência.
2. **Automática condicionada a diálogo:** na primeira abertura elegível,
   antes de mostrar a ficha, dialog informa que continuar registrará ciência;
   continuar equivale ao ato de confirmar ciência, cancelar não registra. Não
   rotular como leitura integral de conteúdo ainda não visto.
3. **Tácita sem interação:** usuário pode optar por ciência presumida na
   emissão da ficha, possivelmente com preferência por tipo; registrar evento
   com origem `tacit_preference`, sem afirmar acesso/leitura.

Preservar ator, documento, versão, origem, instante, preferência que
justificou e modificações prospectivas. **Pendência de desenho:** quais atos
exigem confirmação expressa não substituível por ciência tácita, e se a
família define mínimos por classe. A escolha individual não deve permitir
falsificar entrega/aceite.

## DEC-003 — Estoque não observado na REQ

**Status:** `OWNER_APPROVED`.

**Decisão:** campo de estoque observado começa **sem valor**, nunca preenchido
automaticamente com zero. Usuário pode digitar zero explicitamente ou
selecionar checkbox `Não sei informar`. Não informado, não observado e zero
observado não devem colapsar no backend/PDF/histórico. Não inventar contagem a
partir do saldo calculado.

## DEC-004 — Conclusão de aquisição com quantidade menor (COM)

**Status:** `OWNER_APPROVED` para finalidade; `OWNER_DIRECTION_NEEDS_DETAIL`
para ponto exato de fechamento.

**Decisão:** quantidade prevista/pedida da COM não obriga receber/adquirir
integralmente. Mostrar quantidade esperada versus adquirida/recebida/validada,
apresentar diferença e solicitar confirmação do responsável para **concluir
com quantidade inferior**. Não apagar quantidades anteriores, histórico nem
alterar saldo sem recebimento validado. Enquanto o restante ainda for
esperado, estado parcial pode existir; a confirmação final encerra a obrigação
futura. Não introduzir quantidade solicitada obrigatória na REQ.

**Nota:** “entregar menos” na linguagem humana da decisão refere-se ao
cumprimento inferior da aquisição; C deve nomear corretamente as etapas de COM
vs ENT.

## DEC-005 — Desacordo de cancelamento ENT

**Status:** `OWNER_APPROVED`.

Solicitante pode **retirar formalmente** o pedido de cancelamento; outra parte
pode **discordar/recusar**, segundo responsabilidade; tudo fica registrado.
Resolver com regras de concorrência, versão, justificativa, quantidades
físicas, recebimentos prévios e consumo efetivo. Sem estorno unilateral ou
falso aceite.

## DEC-006 — Desligamento, revogação e sucessão

**Status:** `OWNER_APPROVED` para princípios; `OWNER_DIRECTION_NEEDS_DETAIL`
para os formulários de exceção.

Revogar acesso **nunca pode ser bloqueado** pela existência de pendências.
Antes de revogar, mostrar inventário e oferecer solicitar ao profissional que
regularize pendências passadas ainda possíveis. Revogação retira futuras
autorizações; redesignar tarefas FUTURAS (BAL, novas conferências quando
cabível) a pessoas autorizadas. Preservar autoria e vínculo histórico do
desligado. Pendência PASSADA irrecuperável pode ter **encerramento
administrativo excepcional e motivado**, sem simular recebimento físico,
assinatura ou participação de quem saiu. Se acesso for revogado imediatamente,
a pessoa não poderá concluir normalmente pelo app depois: oferecer
prévia/solicitação pré-revogação e mecanismos de conciliação pós-revogação.

## DEC-007 — Produto inativo, saldo e transferência bilateral

**Status:** `OWNER_APPROVED` para os dois tópicos;
`OWNER_DIRECTION_NEEDS_DETAIL` para alinhamento ENT/transferência.

**Inativação:** estoque familiar pode manter saldo positivo inativo,
recuperável na mesma custódia quando reativado. Estoque da equipe: permitir
escolher transferir saldo para família por processo legítimo OU inativar com
saldo positivo na equipe; reativação retorna a disponibilidade sob a custódia
conservada. Sem apagar saldo ou efetuar baixa fictícia.

**Transferência simples:** família e equipe podem iniciar comunicação de
movimento em ambos os sentidos, informando item, quantidade, origem, destino e
observação. A **contraparte** deve confirmar a veracidade da movimentação (se
família inicia, profissional designado confirma; se profissional inicia,
familiar autorizado confirma). Com rastreio e movimento transacional. Evitar
movimentação direta que contorne trânsito, autoridade ou ledger.

**Conflito semântico que C deve resolver:** confirmação bilateral de uma
transferência não equivale necessariamente ao aceite físico de ENT. Caso o
fluxo seja modelado como ENT, o aceite de recebimento permanece exclusivo da
pessoa que recebeu. Apresentar contrato consistente sem transformar
contrassinatura da outra parte em recebimento por terceiro.

## DEC-008 — Complementação de relato textual de consumo

**Status:** `OWNER_APPROVED` após resposta posterior, independentemente do
WhatsApp.

Permitir complementar posteriormente relato sem produto/quantidade suficiente,
vinculado ao original, versionado e auditável, antes de aplicar débito de
estoque. WhatsApp pode ser postergado; este processo é necessário no
aplicativo.

## DEC-009 — Pedidos obsoletos de BAL e escala

**Status:** `OWNER_APPROVED`.

Impedir aprovação de proposta que não corresponde mais a escala, pessoa,
período ou versão atual. Encerrar como obsoleta com motivo ou exigir nova
proposta, preservando histórico e responsabilidade. Não deixar pendência
impossível de decidir.

## DEC-010 — Reconto por outra pessoa

**Status:** `OWNER_APPROVED` após exemplo de Juliana e Sheila.

Uma profissional substituta (ex.: Sheila) pode assumir NOVO reconto por
designação formal, sem herdar autoria de primeira contagem realizada por outra
(ex.: Juliana). Identificar quem contou o quê em qual versão, responsável pela
redesignação e momento.

## DEC-011 — Falha e recuperação de anexos

**Status:** `OWNER_APPROVED`.

Consulta/retomada da mesma tentativa quando resultado incerto, abandono
formal/expiração segura de reservas não concluídas, preservação de uploads
ativos, objetos prontos e história. Não limpar reservas indiscriminadamente.

## DEC-012 — Rascunhos entre aparelhos e dias

**Status:** `OWNER_APPROVED`.

Rascunhos persistem no servidor entre aparelhos e vários dias, por
usuário/paciente/tipo/intenção; ao abrir formulário previamente iniciado,
informar dados e perguntar **continuar ou descartar rascunho e iniciar de
novo**. Abrange fichas, aprovações, divergências, confirmações e atividades
com múltiplas etapas, **sem permitir que decisão obsoleta seja aplicada a
estado alterado**. Detectar concorrência, revalidar permissões, versões e
estado antes da conclusão. Descartar rascunho nunca elimina documento/fato já
persistido.

## DEC-013 — Resumo de decisões importantes

**Status:** `OWNER_APPROVED`.

Antes de confirmar ações relevantes, exibir pessoa, objeto, situação atual,
alteração proposta, efeitos e próxima etapa. A apresentação precisa ser
específica do processo; não criar diálogo extra desnecessário para toda ação
trivial.

## DEC-014 — Listas e pendências

**Status:** `OWNER_APPROVED`.

Melhorar listas atuais individualmente; criar busca, filtros e paginação mais
abrangentes, com acesso direto a pendências antigas, responsabilidade e
estados. Não criar central unificada por padrão; avaliar só se adicionalmente
útil.

## DEC-015 — Histórico compreensível

**Status:** `OWNER_APPROVED`.

Preservar eventos e versões com autoria e integridade; apresentar alterações
em linguagem humana, como antes/depois, motivo, data correta, estado e
responsáveis; nunca inventar fato antigo ou usar nome atual sem preservar
proveniência.

## DEC-016 — Conteúdo dos PDFs

**Status:** `TECHNICAL_IMPLEMENTATION_DELEGATED` para composição inicial.

O responsável autoriza a proposta técnica de PDFs completos e corretos por
REQ/COM/ENT/BAL, ciente de futuro redesenho visual. Mínimos: identidade e
versão, estados e datas corretas, material, quantidade, origem/recebimento,
estoque observado quando existente, atores, ressalvas, conciliações, histórico
relevante, impressão legível, quebra de página segura, acessibilidade e
verificação de integridade. Conteúdo deve decorrer de snapshot/registro com
fonte, sem reconstruir por dados cadastrais atualizados. Registrar layout como
`PROPOSED_TECHNICAL_DEFAULT`, não presumir que redesign futuro foi aprovado.

## DEC-017 — Anexos original/derivado

**Status:** `OWNER_APPROVED` para princípio e política proporcional.

Proteger contra conteúdo ativo, mas não eliminar silenciosamente ressalvas e
anotações visualmente relevantes; considerar achados B6-008. Decidir por
classe quando preservar original seguro em custódia restrita, quando preservar
derivado fiel e quando recusar arquivo com perda relevante. Com retenção, hash
e cadeia de transformação. Não remover sanitização sem substituição segura.

## DEC-018 — Autenticidade de PDFs emitidos

**Status:** `OWNER_APPROVED` para resultado,
`TECHNICAL_IMPLEMENTATION_DELEGATED` para mecanismo.

Possibilitar verificar que PDF apresentado corresponde ao **original final
emitido pelo sistema** e identificar edição externa. Propor SHA-256 dos bytes
finais protegidos e verificador por upload/consulta de hash, versionado; QR
como atalho, **não como prova de que o exemplar foi preservado**. Considerar,
como opção posterior ou condicionada, assinatura criptográfica do próprio
sistema e gestão de chaves para verificação por terceiros. Não rotular como
assinatura pessoal, certificado ICP-Brasil ou prova de realidade física.

## DEC-019 — Dados enviados ao WhatsApp

**Status:** `OWNER_DEFERRED`.

Aguardar aprovação/tratativas da Meta. Preservar B5, pendências e minimização
de dados. Não colocar WhatsApp como gate do primeiro lançamento se estiver
explicitamente desabilitado. Não cancelar funcionalidades internas
relacionadas apenas por terem surgido na auditoria WhatsApp.

## DEC-020 — Categorias de notificações

**Status:** `OWNER_APPROVED`.

Categorias: informativas, auxiliares do cumprimento de obrigações e
essenciais. Política por processo, pessoa, prazo, minimização, deduplicação e
canal (in-app + push inicialmente; WhatsApp posterior). Push não pode ser
fonte única de verdade nem comprovante de ciência.

## DEC-021 — Tratamento de problemas técnicos

**Status:** `OWNER_APPROVED` para separação de papéis.

Profissionais não resolvem erros técnicos de plataforma. A equipe resolve
apenas tarefas operacionais autorizadas e recebe mensagens humanas de
recuperação. Família/administração da residência resolve pendências
administrativas e conciliações legítimas do paciente. Administração
global/suporte técnico diagnostica infraestrutura, integração, falhas internas
e logs, sem transferir chaves e detalhes SQL para equipe. Definir fluxo de
escalonamento e controle de acesso.

## DEC-022 — Revogação em andamento

**Status:** `OWNER_APPROVED` para regras de DEC-006;
`OWNER_DIRECTION_NEEDS_DETAIL` para sessão/link e operações iniciadas.

Impedir novas ações após revogação; preservar identidade, autoria e histórico;
tarefas futuras reatribuídas por autorização. Operações já iniciadas e URLs
temporárias precisam de regra definida de revalidação e limites realistas;
arquivo já baixado não pode ser apagado retroativamente. Nenhuma interpretação
pode autorizar terceiro a assinar recebimento físico por quem saiu.

## DEC-023 — Retenção de dados

**Status:** `OWNER_APPROVED` como diretriz, `PENDING_OWNER` quanto a
categorias e prazos concretos.

Preservar no mínimo pelo prazo legal pertinente e adotar postura conservadora
para não perder documentos e evidências. Definir base, categoria, finalidade,
prazos, controles de acesso, anonimização/exclusão quando cabível, backups e
incidentes. Não equiparar política conservadora a guardar tudo indefinidamente
sem fundamento; LGPD e outras obrigações legais permanecem sujeitas a análise
específica.

## DEC-024 — Monitoramento

**Status:** `OWNER_APPROVED` para estratégia proporcional.

Aproveitar capacidade técnica de logging/telemetria existente, não os
REGISTROS fictícios das auditorias. No ambiente real, começar com dados de
produção legítimos/operacionais, sem mistura de fixtures. Monitorar além de
HTTP 200: progresso de jobs, filas, atraso, pendência, falha de arquivo, push,
restore, erro e correlação. Definir responsáveis e SLOs proporcionais.

## DEC-025 — Backup, continuidade e restauração

**Status:** `TECHNICAL_IMPLEMENTATION_DELEGATED` para proposta inicial;
`PENDING_OWNER` quanto a RPO/RTO e estratégia de ambiente.

Projetar recuperação de PostgreSQL, Auth, Storage, documentos, hashes,
segredos/configurações e jobs, com quarentena de cron/notificações após
restore e reconciliação antes de retomar. Testar em ambiente isolado e
autorizado, sem substituir dados atuais. Perguntar ao responsável apenas pelos
valores/compromissos necessários no marco de decisão de implantação.

## DEC-026 — Guias completos

**Status:** `OWNER_APPROVED`.

Produzir documentação de uso ampla e humana, passo a passo, para equipe e
supervisão, com capturas atualizadas após D, exemplos fictícios, permissões,
rotinas REQ/COM/ENT/BAL, estoque, escalas, pendências, recuperação e
contingência. A C define estrutura e conteúdo-base; material final de
screenshots e procedimentos testados depois da implementação/homologação. Não
declarar UI futura como UI presente.

## DEC-027 — Oportunidades de funcionalidades

**Status:** conforme catálogo O01–O20, adiante.

O responsável aprovou expressamente O08, O09, O14, O15, O16 e O20; O10 deve
ser preservado sem duplicação. As respostas adicionais aprovaram O05 e O11;
O17 e O18 ficam para o futuro. Outras oportunidades foram cobertas por
decisões 1–26. C deverá verificar integração e priorização por causa, não
transformar sugestões em novos módulos desnecessários.

---

## BLOCO B — REGRAS ADICIONAIS EXPRESSAS POSTERIORMENTE

## DEC-028 — Destinatário da ENT e confirmação pessoal indelegável

**Status:** `OWNER_APPROVED`, alta prioridade.

A família **indica a pessoa que está recebendo** na criação da entrega. O
sistema sugere e preenche inicialmente o profissional escalado naquele
dia/horário, mas o campo é **editável pela família antes de emitir**. **Apenas
a pessoa que efetivamente recebeu poderá confirmar que recebeu. A confirmação
não pode ser delegada.** Não basta ser técnico escalado ou ter permissão
genérica. Uma troca legítima de destinatário antes de emissão deve ficar
registrada; após emissão/ato físico, uma mudança exige procedimento correto de
substituição/correção com preservação do documento e dos eventos, nunca
usurpação do aceite. Se não houver profissional adequado na escala, não
presumir identidade.

## DEC-029 — Reconto por substituta

**Status:** `OWNER_APPROVED`.

Exemplo expresso: **Sheila pode fazer novo reconto** anteriormente solicitado
quando a pessoa original não estiver disponível, com designação registrada e
autoria das contagens anteriores preservada. A confirmação de recebimento ENT
continua indelegável; são atos distintos.

## DEC-030 — O05, O11, O17 e O18

**Status:** O05/O11 `OWNER_APPROVED`; O17/O18 `OWNER_DEFERRED`.

- O05: complementar consumo textual no app, sem aguardar WhatsApp.
- O11: após atendimento parcial de REQ, permitir informar necessidade
  remanescente/novo documento vinculado e justificado, **sem introduzir
  quantidade solicitada na REQ nem duplicar crédito físico**.
- O17: lote/validade fica para evolução futura com OCR/código de barras.
- O18: visão consolidada de tarefas entre residências fica para evolução
  futura.

---

## BLOCO C — CATÁLOGO O01–O20

<!-- c-table:start -->

- **ID:** O01

  **Escopo:** Preparação guiada da primeira residência

  **Status de produto:** `OWNER_APPROVED` como guia/processo, UI extra depende
  de custo/necessidade.

- **ID:** O02

  **Escopo:** Encerrar COM com quantidade inferior

  **Status de produto:** `OWNER_APPROVED` conforme DEC-004.

- **ID:** O03

  **Escopo:** Retirada/discordância de cancelamento ENT

  **Status de produto:** `OWNER_APPROVED` conforme DEC-005.

- **ID:** O04

  **Escopo:** Pendências localizáveis e próximos responsáveis

  **Status de produto:** `OWNER_APPROVED` conforme DEC-014.

- **ID:** O05

  **Escopo:** Complementar relato textual de consumo

  **Status de produto:** `OWNER_APPROVED` conforme DEC-008/030.

- **ID:** O06

  **Escopo:** Prévia do efeito de troca sobre BAL

  **Status de produto:** `OWNER_APPROVED` como decisão informada de escala.

- **ID:** O07

  **Escopo:** Inventário e sucessão após desligamento

  **Status de produto:** `OWNER_APPROVED` conforme DEC-006.

- **ID:** O08

  **Escopo:** Apresentação/embalagem, equivalência e proveniência

  **Status de produto:** `OWNER_APPROVED` expressamente.

- **ID:** O09

  **Escopo:** Link para origem autorizada de movimentos de estoque

  **Status de produto:** `OWNER_APPROVED` expressamente.

- **ID:** O10

  **Escopo:** Reaproveitamento entre documentos

  **Status de produto:** `EXISTING_TO_PRESERVE`; oportunidade genérica nova
  foi refutada na B2.

- **ID:** O11

  **Escopo:** Necessidade remanescente após atendimento parcial

  **Status de produto:** `OWNER_APPROVED` conforme DEC-030.

- **ID:** O12

  **Escopo:** Inativação mantendo/destinando saldo

  **Status de produto:** `OWNER_APPROVED` conforme DEC-007.

- **ID:** O13

  **Escopo:** Retomada/abandono de anexos

  **Status de produto:** `OWNER_APPROVED` conforme DEC-011.

- **ID:** O14

  **Escopo:** História de versões traduzida para linguagem humana

  **Status de produto:** `OWNER_APPROVED` expressamente.

- **ID:** O15

  **Escopo:** Frescor/estado da consulta e recuperação

  **Status de produto:** `OWNER_APPROVED` expressamente.

- **ID:** O16

  **Escopo:** Seleções recorrentes de materiais por residência

  **Status de produto:** `OWNER_APPROVED` expressamente; jamais copiar estoque
  observado antigo como contagem atual.

- **ID:** O17

  **Escopo:** Lote/validade, OCR/código de barras

  **Status de produto:** `OWNER_DEFERRED` até evolução específica.

- **ID:** O18

  **Escopo:** Trabalho multipaciente consolidado

  **Status de produto:** `OWNER_DEFERRED` até evolução específica.

- **ID:** O19

  **Escopo:** Contingência manual e reconciliação

  **Status de produto:** `OWNER_APPROVED` quanto à finalidade;
  detalhes/autoridade continuam em C.

- **ID:** O20

  **Escopo:** Tratamento de duplicatas de catálogo

  **Status de produto:** `OWNER_APPROVED` expressamente; não apagar
  identidades históricas/movimentos.

<!-- c-table:end -->

---

## BLOCO D — DECISÕES AINDA ABERTAS (NÃO TRANSFORMAR EM APROVAÇÕES)

<!-- c-table:start -->

- **Código:** P01

  **Questão:** Identificação profissional: COREN, credenciais e verificação

  **Alternativas/recomendação inicial:** Identificação individual, função e
  registro profissional quando aplicável; distinguir informado de validado.
  Confirmar dados obrigatórios.

  **Marco de decisão:** Antes da implementação de cadastro/perfil
  profissional.

- **Código:** P02

  **Questão:** Quais ciências admitem modalidade tácita

  **Alternativas/recomendação inicial:** Opção individual por tipo com guardas
  para atos expressos; definir exceções.

  **Marco de decisão:** Antes da implementação da política de ciência.

- **Código:** P03

  **Questão:** RPO/RTO, frequência e destino de backup

  **Alternativas/recomendação inicial:** Perda mínima e restauração
  comprovável, com custos expostos.

  **Marco de decisão:** Antes da implantação real.

- **Código:** P04

  **Questão:** Ambiente de produção separado de teste

  **Alternativas/recomendação inicial:** Recomendado separar projetos/dados,
  sem executar migração até aprovação.

  **Marco de decisão:** Antes de configurar a operação real.

- **Código:** P05

  **Questão:** Quem autoriza contingência manual e reconciliação

  **Alternativas/recomendação inicial:** Família/admin local para fatos do
  paciente, suporte global para sistema; detalhar substitutos e procedimento.

  **Marco de decisão:** Antes do uso real.

- **Código:** P06

  **Questão:** Escala versus elegibilidade para confirmar custódia

  **Alternativas/recomendação inicial:** **Resolvido parcialmente:** recebedor
  ENT é designado e aceita pessoalmente; escala é sugestão. Resta governança
  de casos sem escala e transferência bilateral.

  **Marco de decisão:** Durante C3-ENT/escala.

- **Código:** P07

  **Questão:** Confirmação de transferência bilateral versus aceite ENT

  **Alternativas/recomendação inicial:** Manter dois significados; confirmar
  quem relata, quem valida movimento e quem recebeu.

  **Marco de decisão:** Durante C3-estoque/ENT.

- **Código:** P08

  **Questão:** Retenção por classe

  **Alternativas/recomendação inicial:** Conservadora, justificada; prazos
  legais dependem de categoria e avaliação jurídica.

  **Marco de decisão:** Antes da política operacional.

- **Código:** P09

  **Questão:** Critério de aceite de assinatura/verificador PDF

  **Alternativas/recomendação inicial:** Verificador de bytes obrigatório;
  assinatura incorporada e cadeia de confiança a decidir por custo/uso.

  **Marco de decisão:** Antes da implementação da verificação documental.

- **Código:** P10

  **Questão:** Dispositivos/usuários para homologação

  **Alternativas/recomendação inicial:** Definir aparelhos reais, navegadores,
  leitores de tela relevantes e participantes.

  **Marco de decisão:** Antes dos gates finais da D.

- **Código:** P11

  **Questão:** Escopo exato da supervisão e leitura no primeiro uso

  **Alternativas/recomendação inicial:** Ativação posterior autorizada;
  verificar funções operacionais eventualmente indispensáveis à
  família/equipe.

  **Marco de decisão:** No corte de release C5.

- **Código:** P12

  **Questão:** Periodicidade e retenção de rascunhos

  **Alternativas/recomendação inicial:** Persistência entre aparelhos e dias
  já decidida; política de limite, abandono e conflitos deve preservar dados.

  **Marco de decisão:** Antes da implementação dos rascunhos.

<!-- c-table:end -->

**Regra:** a Fase C deverá produzir alternativas proporcionais e recomendações
condicionais para P01–P12; poderá concluir integralmente o planejamento mesmo
com `PENDING_OWNER` abertos, mas não afirmar que foram decididos. Itens já
decididos por contexto podem ser encerrados **somente com justificativa
explícita e fonte da decisão**.

---

## BLOCO E — CRITÉRIOS QUE PRECISAM SER PRESERVADOS NA D

1. Nenhum dos dois bloqueadores P1 antigos é resolvido apenas por texto ou
   reorganização: exigem implementação e regressão.
2. Fichas REQ/COM/ENT/BAL devem registrar processo normal e exceções sem
   inventar fatos ou duplicar movimentos.
3. Interface humana: termos corretos, textos de apoio, exemplos de
   preenchimento, botões no lugar apropriado, foco, teclado, navegação móvel,
   estados de carregamento e erros, recuperação de respostas incertas.
4. PDFs: conteúdo efetivo, geometria, ressalvas, datas, autoria, integridade
   de bytes, acessibilidade; testes B8-Q001 precisam reprovar PDF em branco.
5. Banco: saldo, precisão, referencial, revisão independente, revogação e
   histórico; assert B8-Q002 deve reprovar NULL indevido.
6. Web Push é novo: testar inscrição, expiração, revoke, retry, privacidade,
   canal desabilitado e limites de plataforma.
7. Backup/restore devem ser provados separadamente de `pg_dump` e incluir
   objetos/Auth/jobs.
8. Publicação só após gate do mesmo SHA e compatibilidade do schema.
9. Decisões do responsável não autorizam bypass por papel de administrador
   global nem confirmação de recebimento por terceiro.

**Assinatura deste registro:** diretrizes fornecidas pelo responsável na
conversa; transcrição estruturada e interpretação técnica inicial. A
elaboração documental é autorizada; **a execução funcional ainda não**.
