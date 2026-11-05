# Guias, primeira residência e continuidade

Este é conteúdo-base TO_BE de DEC-026/O01/O19, a completar com screenshots e
procedimentos comprovados **depois de D**. Não é manual de uma interface
futura já homologada. AS_IS tem caminhos operacionais e alternativa
física/foto; restore integral, entendimento humano e aparelho real continuam
pendentes.

## Telas e campos de apoio

<!-- c-table:start -->

- **Tela:** GUI-01

  **Rota e situação:** Guia documental por público, novo conteúdo

  **Objetivo e ações:** Ajudar equipe, família e supervisão a cumprir tarefa;
  links às rotas atuais.

- **Tela:** GUI-02

  **Rota e situação:** Roteiro da primeira residência, novo processo

  **Objetivo e ações:** Wizard de preparação por etapas, com criação exclusiva
  ao administrador global; configuração não é homologação.

- **Tela:** GUI-03

  **Rota e situação:** Contingência física e conciliação, processo a homologar

  **Objetivo e ações:** Registrar fato fora do app e retornar com autoria,
  data e sem duplicação.

- **Tela:** GUI-04

  **Rota e situação:** Incidente/continuidade, runbook planejado

  **Objetivo e ações:** Identificar responsável, preservar referência e
  recuperar no ambiente autorizado.

<!-- c-table:end -->

<!-- c-table:start -->

- **Campo:** Fato físico e tipo

  **Tipo/origem por tela e estado:** GUI-03 Fato físico: EDITABLE (TEXTAREA);
  Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura; GUI-03 Tipo de processo: EDITABLE
  (RADIO_OR_SELECT); Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** GUI-03 Fato físico: Sim em
  contingência; GUI-03 Tipo de processo: Sim em contingência

  **Validação/unidade:** GUI-03 Fato físico: REQ/COM/ENT/BAL/consumo não
  intercambiáveis; Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura; GUI-03 Tipo de processo:
  REQ/COM/ENT/BAL/consumo não intercambiáveis; Somente no subestado de
  preparação autorizado indicado na ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** GUI-03 Fato físico: Descreva o fato físico conhecido, por
  exemplo entrega de duas unidades. Diga o que permanece desconhecido sem
  presumir confirmação alheia.; GUI-03 Tipo de processo: “Recebimento parcial
  de entrega.”

- **Campo:** Paciente e referência conhecida

  **Tipo/origem por tela e estado:** GUI-03 Paciente: READ_ONLY
  (PATIENT_DESCRIPTION); Paciente do contexto autorizado; trocar contexto é
  ação própria fora do dossiê; GUI-03 Referência conhecida: EDITABLE
  (TEXT_INPUT); Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** GUI-03 Paciente: Valor emitido,
  proposto ou calculado da fonte identificada; ausência explicitamente
  informada, sem valor inventado; GUI-03 Referência conhecida: Sim quando
  conhecida

  **Validação/unidade:** GUI-03 Paciente: Revalidar acesso, referência e
  estado na leitura/ação. Não solicitar ao usuário correção deste valor nesta
  tela. Paciente do contexto autorizado; trocar contexto é ação própria fora
  do dossiê; GUI-03 Referência conhecida: Desconhecido declarado; não criar
  UUID fictício; Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** GUI-03 Paciente: Confira a residência desta tarefa.
  Trocar contexto é uma ação separada e exige acesso autorizado.; GUI-03
  Referência conhecida: Protocolo do papel/documento relacionado.

- **Campo:** Data do fato

  **Tipo/origem por tela e estado:** GUI-03 Data do fato: EDITABLE
  (DATE_INPUT); Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura; GUI-03 Hora do fato: EDITABLE
  (TIME_INPUT); Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura; GUI-03 Fuso do fato: EDITABLE
  (SEARCHABLE_TIMEZONE); Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** GUI-03 Data do fato: Conhecida ou
  desconhecido explícito; GUI-03 Hora do fato: Conhecida ou desconhecido
  explícito; GUI-03 Fuso do fato: Conhecida ou desconhecido explícito

  **Validação/unidade:** GUI-03 Data do fato: Não substituir pela data de
  digitação; Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura; GUI-03 Hora do fato: Não substituir pela
  data de digitação; Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura; GUI-03 Fuso do fato: Não
  substituir pela data de digitação; Somente no subestado de preparação
  autorizado indicado na ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** GUI-03 Data do fato: Separar registro posterior de fato
  anterior.; GUI-03 Hora do fato: Separar registro posterior de fato
  anterior.; GUI-03 Fuso do fato: Separar registro posterior de fato anterior.

- **Campo:** Pessoa que realizou/recebeu

  **Tipo/origem por tela e estado:** GUI-03 Pessoa que realizou: EDITABLE
  (PERSON_REFERENCE_WITH_UNKNOWN); Somente no subestado de preparação
  autorizado indicado na ficha; resumo/decisão posterior é leitura; GUI-03
  Pessoa que recebeu: EDITABLE (PERSON_REFERENCE_WITH_UNKNOWN); Somente no
  subestado de preparação autorizado indicado na ficha; resumo/decisão
  posterior é leitura

  **Obrigatoriedade/default na preparação:** GUI-03 Pessoa que realizou:
  Conforme fato; GUI-03 Pessoa que recebeu: Conforme fato

  **Validação/unidade:** GUI-03 Pessoa que realizou: Pessoa real do fato
  quando conhecida; selecionar vínculo ou informar referência histórica, sem
  transferir autoria digital; Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura; GUI-03 Pessoa que
  recebeu: Recebedor efetivo quando conhecido; nome informado não equivale a
  aceite pessoal no app; Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** GUI-03 Pessoa que realizou: Assinatura física tem origem
  própria.; GUI-03 Pessoa que recebeu: Assinatura física tem origem própria.

- **Campo:** Material/unidade/quantidade/custódia

  **Tipo/origem por tela e estado:** GUI-03 Material: EDITABLE
  (SEARCHABLE_COMBOBOX); Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura; GUI-03 Unidade:
  READ_ONLY (UNIT_DESCRIPTION); Unidade do material selecionado; unidade
  desconhecida é fato a esclarecer, não conversão livre; GUI-03 Quantidade
  física: EDITABLE (DECIMAL_TEXT_INPUT); Somente no subestado de preparação
  autorizado indicado na ficha; resumo/decisão posterior é leitura; GUI-03
  Custódia: EDITABLE (CUSTODY_SELECT); Somente no subestado de preparação
  autorizado indicado na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** GUI-03 Material: Quando
  movimento/conferência; GUI-03 Unidade: Valor emitido, proposto ou calculado
  da fonte identificada; ausência explicitamente informada, sem valor
  inventado; GUI-03 Quantidade física: Quando movimento/conferência; GUI-03
  Custódia: Quando movimento/conferência

  **Validação/unidade:** GUI-03 Material: Distinguir zero, desconhecido,
  expedição e aceite; Somente no subestado de preparação autorizado indicado
  na ficha; resumo/decisão posterior é leitura; GUI-03 Unidade: Revalidar
  acesso, referência e estado na leitura/ação. Não solicitar ao usuário
  correção deste valor nesta tela. Unidade do material selecionado; unidade
  desconhecida é fato a esclarecer, não conversão livre; GUI-03 Quantidade
  física: Distinguir zero, desconhecido, expedição e aceite; Somente no
  subestado de preparação autorizado indicado na ficha; resumo/decisão
  posterior é leitura; GUI-03 Custódia: Custódia real permitida ao processo;
  origem/destino e trânsito não são texto livre; Somente no subestado de
  preparação autorizado indicado na ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** GUI-03 Material: Não somar previsão ao saldo real.;
  GUI-03 Unidade: Identificação do item registrado. A consulta não substitui o
  material ou reinterpreta sua unidade.; GUI-03 Quantidade física: Não somar
  previsão ao saldo real.; GUI-03 Custódia: Não somar previsão ao saldo real.

- **Campo:** Ressalva/evidência

  **Tipo/origem por tela e estado:** GUI-03 Ressalva: EDITABLE (TEXTAREA);
  Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura; GUI-03 Evidência física: EDITABLE
  (FILE_PICKER); Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** GUI-03 Ressalva: Quando
  relevante; GUI-03 Evidência física: Quando relevante

  **Validação/unidade:** GUI-03 Ressalva: Preservar original/derivado e
  privacidade; Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura; GUI-03 Evidência física:
  Preservar original/derivado e privacidade; Somente no subestado de
  preparação autorizado indicado na ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** GUI-03 Ressalva: A foto não prova sozinha que o fato
  ocorreu.; GUI-03 Evidência física: A foto não prova sozinha que o fato
  ocorreu.

- **Campo:** Conciliador e decisão

  **Tipo/origem por tela e estado:** GUI-03 Conciliador: AUTO_FILLED
  (ACTOR_DESCRIPTION); Conciliador é a sessão autenticada; não escolher outra
  pessoa como autor digital; GUI-03 Decisão: EDITABLE (RADIO_OR_SELECT);
  Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** GUI-03 Conciliador: Valor
  emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado; GUI-03 Decisão: Ao retornar
  ao app

  **Validação/unidade:** GUI-03 Conciliador: Revalidar acesso, referência e
  estado na leitura/ação. Não solicitar ao usuário correção deste valor nesta
  tela. Conciliador é a sessão autenticada; não escolher outra pessoa como
  autor digital; GUI-03 Decisão: Dupla conferência conforme P05; chave do fato
  físico; Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura

  **Ajuda/exemplo:** GUI-03 Conciliador: Identifica quem realizou o ato e
  quando ele foi registrado. Não permite escolher outra pessoa como autora.;
  GUI-03 Decisão: Conciliador não se passa pelo recebedor.

- **Campo:** Incidente/correlação

  **Tipo/origem por tela e estado:** GUI-04 Incidente/correlação: READ_ONLY
  (TEXT_VALUE); Estado de consulta/revisão da tarefa; não herdar edição do
  formulário de origem

  **Obrigatoriedade/default na preparação:** GUI-04 Incidente/correlação:
  Valor emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado

  **Validação/unidade:** GUI-04 Incidente/correlação: Revalidar acesso,
  referência e estado na leitura/ação. Não solicitar ao usuário correção deste
  valor nesta tela. Estado de consulta/revisão da tarefa; não herdar edição do
  formulário de origem

  **Ajuda/exemplo:** GUI-04 Incidente/correlação: Informação do registro
  indicado, somente para consulta nesta etapa. Ausência de dado histórico
  permanece explicitamente identificada.

- **Campo:** Dono/substituto e prazo

  **Tipo/origem por tela e estado:** GUI-02 Titular: EDITABLE
  (SEARCHABLE_COMBOBOX); Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura; GUI-04 Titular:
  READ_ONLY (RESPONSIBLE_DESCRIPTION); Titular designado previamente; consulta
  do runbook não altera governança; GUI-02 Substituto: EDITABLE
  (SEARCHABLE_COMBOBOX); Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura; GUI-04 Substituto:
  READ_ONLY (RESPONSIBLE_DESCRIPTION); Substituto designado; sem nome fictício
  ou herança de sessão; GUI-02 Prazo de resposta: EDITABLE (TEXT_INPUT);
  Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura; GUI-04 Prazo de resposta: READ_ONLY
  (SERVICE_TARGET_DESCRIPTION); Prazo aprovado ou A definir; não digitar SLA
  durante incidente

  **Obrigatoriedade/default na preparação:** GUI-02 Titular: P05/P13, sem
  default fictício; GUI-04 Titular: Valor emitido, proposto ou calculado da
  fonte identificada; ausência explicitamente informada, sem valor inventado;
  GUI-02 Substituto: P05/P13, sem default fictício; GUI-04 Substituto: Valor
  emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado; GUI-02 Prazo de resposta:
  P05/P13, sem default fictício; GUI-04 Prazo de resposta: Valor emitido,
  proposto ou calculado da fonte identificada; ausência explicitamente
  informada, sem valor inventado

  **Validação/unidade:** GUI-02 Titular: Deve existir antes do uso real;
  Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura; GUI-04 Titular: Revalidar acesso,
  referência e estado na leitura/ação. Não solicitar ao usuário correção deste
  valor nesta tela. Titular designado previamente; consulta do runbook não
  altera governança; GUI-02 Substituto: Deve existir antes do uso real;
  Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura; GUI-04 Substituto: Revalidar acesso,
  referência e estado na leitura/ação. Não solicitar ao usuário correção deste
  valor nesta tela. Substituto designado; sem nome fictício ou herança de
  sessão; GUI-02 Prazo de resposta: Deve existir antes do uso real; Somente no
  subestado de preparação autorizado indicado na ficha; resumo/decisão
  posterior é leitura; GUI-04 Prazo de resposta: Revalidar acesso, referência
  e estado na leitura/ação. Não solicitar ao usuário correção deste valor
  nesta tela. Prazo aprovado ou A definir; não digitar SLA durante incidente

  **Ajuda/exemplo:** GUI-02 Titular: Não “monitorar depois” sem responsável.;
  GUI-04 Titular: Identifica a pessoa relacionada a este ato; não permite
  transferir sua autoria para quem consulta.; GUI-02 Substituto: Não
  “monitorar depois” sem responsável.; GUI-04 Substituto: Identifica a pessoa
  relacionada a este ato; não permite transferir sua autoria para quem
  consulta.; GUI-02 Prazo de resposta: Não “monitorar depois” sem
  responsável.; GUI-04 Prazo de resposta: Informação do registro indicado,
  somente para consulta nesta etapa. Ausência de dado histórico permanece
  explicitamente identificada.

<!-- c-table:end -->

## Roteiro da primeira residência

1. Responsável aprova ambiente P04, participantes/papéis P01/P11 e
   contingência P05. Não importar fixtures da auditoria como cadastro real.

2. Titulares criam/confirmam suas contas; administração inicial e convites
   seguem aceite pessoal. Conferir paciente/modo no cabeçalho e capacidades.

3. Configurar unidades/precisão e catálogo sob responsabilidade familiar;
   adotar modelos explicitamente, apresentações equivalentes e nomes usados.

4. Registrar abertura de estoque com origem, quantidade e motivo reais; não
   preencher balanços fictícios para simular histórico. Validar custódias.

5. Programar escala, recorrências, exceções e pessoas; explicar que escala não
   comprova presença. Configurar BAL e revisão com pessoas elegíveis.

6. Definir política de ciência, avisos, donos e alternativa sem push; instalar
   PWA nos aparelhos homologados e optar por avisos conscientemente.

7. Em ambiente de homologação autorizado, executar ciclo acompanhado
   REQ→COM→validação→ENT→aceite pessoal→BAL e consumo; praticar erro/retomada.

8. Conferir PDF/versionamento/impressão, acessibilidade e recuperação; testar
   contingência e restore no destino isolado. Só liberar após os gates D6.

## Guia da equipe

Entrar e selecionar paciente; verificar tarefa atual e próxima pessoa. Na REQ,
selecionar material, contar apenas o que observou ou indicar desconhecido; não
pedir quantidade como compra. Em ENT, conferir o que recebeu de fato,
registrar exceções e confirmar pessoalmente; se não recebeu, não aceitar por
colega. Relatar falta/consumo sem presumir débito. Complementar informação
quando solicitado. No BAL designado, contar na primeira etapa, revisar
diferença depois; reconto novo tem autoria própria. Se não conseguir cumprir,
solicitar fluxo legítimo de adiamento/designação, não editar agenda para
apagar prazo.

Em erro de leitura, consultar novamente; em envio incerto, recuperar a mesma
tentativa. Se acesso mudou, procurar administração local, sem compartilhar
conta. Sem rede, preservar registro físico e informações necessárias conforme
contingência; avisar responsável definido. Não tentar corrigir SQL ou reenviar
mensagem externa. Entender ciência versus leitura versus recebimento.

## Guia da família e administração local

Consultar pendências antigas/filtros, não só sino. Aprovar COM com quantidade
prevista explícita; validar cada chegada; concluir inferior somente conforme
regra escolhida. Expedir com pessoa recebedora indicada e resumo de custódia;
conferir divergência/cancelamento com fatos reais. Corrigir estoque por
compensação referenciada, não edição de saldo. Revisar BAL de versão atual sem
autoaprovar contagem própria. Antes de trocar escala, ler antes/depois e
efeito na obrigação; antes de desligar alguém, ver inventário, sem atrasar
revogação urgente. Encerramento administrativo nunca afirma aceite alheio.

Gerir catálogo inativo sem perder saldo e resolver duplicata sem apagar ID.
Não promover profissional a administrador para contornar um fluxo defeituoso.
Suporte técnico recebe correlação; família decide somente atos locais
legítimos. Guardar evidências e papéis conforme P08, não em grupo público de
mensagens.

## Guia da supervisão

Mesmo com ativação adiada de capacidades próprias, o guia explica consulta
autorizada, revisão independente, proposta de adiamento e designação de novo
reconto. Supervisão não substitui familiar em decisão exclusiva nem assume
recebimento de outro profissional. Se a política exige grupo indisponível,
encaminhar configuração legítima antes do uso, sem ignorar a revisão.

## Contingência e retorno ao digital

Identificar indisponibilidade, responsável e canal de apoio. Usar ficha física
ou registro seguro com campos da tabela, sem inferir o que não foi observado.
Registrar expedição e recebimento separadamente e a pessoa efetiva. Quando
retornar, procurar documento/intenção já persistidos antes de criar novo.
Conciliar um fato físico com chave e referência estáveis; comparar ledger,
documento e papel. Duplicata é vinculada, não creditada de novo.

Se o recebedor ainda tem acesso, ele próprio confirma seu ato no fluxo
permitido, com data do fato e registro posterior claramente distintos. Se saiu
ou não pode confirmar, guardar declaração física com origem e conciliador
próprios; eventual encerramento administrativo não simula confirmação no
aplicativo. P05 define autoridade/dupla conferência e P08 a guarda; C não
presume sua escolha.

## Incidente e aceite dos guias

Suporte identifica evento/estado/versão/correlação, preserva evidência mínima,
avalia impacto e decide contenção autorizada. Restore tem quarentena e
reconciliação, nunca simples “voltar backup” sobre ambiente em uso.
Dono/substituto, RPO/RTO e gatilho de continuidade dependem P03/P05/P13. Não
medir sucesso só por 200.

Após D, cada guia recebe capturas do mesmo SHA e revisão por pessoa do
público. Aceite por tarefa: localizar pendência antiga, preencher sem ajuda
indevida, explicar efeito, recuperar resposta perdida e registrar contingência
sem duplicar. Screenshot/emulação não substituem participante, AT, aparelho e
impressão reais. Versão/data/origem do manual acompanham o artefato; rótulos
futuros não são apresentados como produto implementado.

## Atualização vinculante C7–C10

O01+ aprova wizard próprio de preparação/criação exclusivamente ao global;
família executa tarefas locais autorizadas. O01 aprova guia opcional no
primeiro login configurável pela administração e reabrível no perfil. P03
proteção intermediária aprovada, 1h/4h são hipóteses; P05 regularização com
PDF/aviso proporcional e P10 aparelhos reais.

Esta atualização substitui alternativas/recomendações anteriores conflitantes;
não anuncia implementação. Contrato detalhado no
[adendo C7](../C7-decision-closure/PRODUCT_DECISIONS_C7_ADDENDUM.md),
[blueprint C8](../C8-visual-blueprint/VISUAL_BLUEPRINT_BY_SCREEN.md) e
[casos C9](../C9-acceptance-refinement/ACCEPTANCE_CASES.csv).
