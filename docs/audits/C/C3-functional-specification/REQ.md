# REQ — necessidade, observação e ciência

AS_IS: wizard em /fichas/req, detalhe /historico/:id e visualizador
/documentos/:id; src/lib/validation/requisition.ts exige currentStock
numérico; B1-FORM-001 mostra zero automático, B1-UX-005 limita rascunho à aba.
Atendimento vem de ENT aceita vinculada, não de compra ou quantidade pedida. O
TO_BE preserva isso e aplica DEC-002/003/012/030 e O11/O16.

## Telas e campos

<!-- c-table:start -->

- **Tela:** REQ-01

  **Rota e situação:** /fichas/req, atual a alterar

  **Objetivo e ações:** Selecionar materiais, extras e urgência; salvar
  rascunho, avançar, voltar.

- **Tela:** REQ-02

  **Rota e situação:** Revisão do wizard, atual a alterar

  **Objetivo e ações:** Conferir paciente, observações e ciência aplicável;
  Emitir requisição.

- **Tela:** REQ-03

  **Rota e situação:** /historico/:id, atual a alterar

  **Objetivo e ações:** Ver linhas, atendimento, ciência, acesso, anexos e
  versões; declarar necessidade remanescente.

- **Tela:** REQ-04

  **Rota e situação:** Diálogo de ciência, novo contrato

  **Objetivo e ações:** Modalidade manual/condicionada; continuar/cancelar com
  consequência explícita.

- **Tela:** REQ-05

  **Rota e situação:** Lista recorrente, novo painel do wizard

  **Objetivo e ações:** Salvar/usar seleção de materiais do paciente, sem
  copiar contagem antiga.

<!-- c-table:end -->

<!-- c-table:start -->

- **Campo:** Paciente

  **Tipo/origem por tela e estado:** REQ-01 Paciente: READ_ONLY (TEXT_VALUE);
  Consulta do valor de origem; mudanças só no processo legitimamente
  responsável; REQ-02 Paciente: READ_ONLY (TEXT_VALUE); Consulta do valor de
  origem; mudanças só no processo legitimamente responsável; REQ-03 Paciente:
  READ_ONLY (TEXT_VALUE); Consulta do valor de origem; mudanças só no processo
  legitimamente responsável

  **Obrigatoriedade/default na preparação:** REQ-01 Paciente: Valor emitido,
  proposto ou calculado da fonte identificada; ausência explicitamente
  informada, sem valor inventado; REQ-02 Paciente: Valor emitido, proposto ou
  calculado da fonte identificada; ausência explicitamente informada, sem
  valor inventado; REQ-03 Paciente: Valor emitido, proposto ou calculado da
  fonte identificada; ausência explicitamente informada, sem valor inventado

  **Validação/unidade:** REQ-01 Paciente: Revalidar acesso, referência e
  estado na leitura/ação. Não solicitar ao usuário correção deste valor nesta
  tela. Consulta do valor de origem; mudanças só no processo legitimamente
  responsável; REQ-02 Paciente: Revalidar acesso, referência e estado na
  leitura/ação. Não solicitar ao usuário correção deste valor nesta tela.
  Consulta do valor de origem; mudanças só no processo legitimamente
  responsável; REQ-03 Paciente: Revalidar acesso, referência e estado na
  leitura/ação. Não solicitar ao usuário correção deste valor nesta tela.
  Consulta do valor de origem; mudanças só no processo legitimamente
  responsável

  **Ajuda/exemplo:** REQ-01 Paciente: Confira a residência desta tarefa.
  Trocar contexto é uma ação separada e exige acesso autorizado.; REQ-02
  Paciente: Confira a residência desta tarefa. Trocar contexto é uma ação
  separada e exige acesso autorizado.; REQ-03 Paciente: Confira a residência
  desta tarefa. Trocar contexto é uma ação separada e exige acesso autorizado.

- **Campo:** Materiais

  **Tipo/origem por tela e estado:** REQ-01 Materiais: EDITABLE
  (SEARCHABLE_COMBOBOX); Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura; REQ-02 Materiais:
  READ_ONLY (TEXT_VALUE); Estado de consulta/revisão da tarefa; não herdar
  edição do formulário de origem

  **Obrigatoriedade/default na preparação:** REQ-01 Materiais: Ao menos um
  material ou extra; vazio; REQ-02 Materiais: Valor emitido, proposto ou
  calculado da fonte identificada; ausência explicitamente informada, sem
  valor inventado

  **Validação/unidade:** REQ-01 Materiais: IDs únicos, até 1000 linhas
  herdadas; alias busca; Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura; REQ-02 Materiais:
  Revalidar acesso, referência e estado na leitura/ação. Não solicitar ao
  usuário correção deste valor nesta tela. Estado de consulta/revisão da
  tarefa; não herdar edição do formulário de origem

  **Ajuda/exemplo:** REQ-01 Materiais: “Escolha os materiais de que precisa.”;
  REQ-02 Materiais: Informação do registro indicado, somente para consulta
  nesta etapa. Ausência de dado histórico permanece explicitamente
  identificada.

- **Campo:** Estoque observado

  **Tipo/origem por tela e estado:** REQ-01 Estoque observado: EDITABLE
  (DECIMAL_TEXT_INPUT); Somente no subestado de preparação autorizado indicado
  na ficha; resumo/decisão posterior é leitura; REQ-02 Estoque observado:
  READ_ONLY (TEXT_VALUE); Estado de consulta/revisão da tarefa; não herdar
  edição do formulário de origem

  **Obrigatoriedade/default na preparação:** REQ-01 Estoque observado: Não,
  vazio; REQ-02 Estoque observado: Valor emitido, proposto ou calculado da
  fonte identificada; ausência explicitamente informada, sem valor inventado

  **Validação/unidade:** REQ-01 Estoque observado: 0–100000, precisão da
  unidade até seis casas; valor original exato; Somente no subestado de
  preparação autorizado indicado na ficha; resumo/decisão posterior é leitura;
  REQ-02 Estoque observado: Revalidar acesso, referência e estado na
  leitura/ação. Não solicitar ao usuário correção deste valor nesta tela.
  Estado de consulta/revisão da tarefa; não herdar edição do formulário de
  origem

  **Ajuda/exemplo:** REQ-01 Estoque observado: “Quanto você contou agora? Ex.:
  0 ou 1,5.”; REQ-02 Estoque observado: Quantidade registrada para a etapa
  indicada. Não é uma nova declaração de quantidade e não movimenta material
  ao ser consultada.

- **Campo:** Não sei informar

  **Tipo/origem por tela e estado:** REQ-01 Não sei informar: EDITABLE
  (CHECKBOX_OR_SWITCH); Somente no subestado de preparação autorizado indicado
  na ficha; resumo/decisão posterior é leitura; REQ-02 Não sei informar:
  READ_ONLY (TEXT_VALUE); Estado de consulta/revisão da tarefa; não herdar
  edição do formulário de origem

  **Obrigatoriedade/default na preparação:** REQ-01 Não sei informar: Não,
  desmarcado; REQ-02 Não sei informar: Valor emitido, proposto ou calculado da
  fonte identificada; ausência explicitamente informada, sem valor inventado

  **Validação/unidade:** REQ-01 Não sei informar: Exclusivo com valor
  observado; não altera ledger; Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura; REQ-02 Não sei
  informar: Revalidar acesso, referência e estado na leitura/ação. Não
  solicitar ao usuário correção deste valor nesta tela. Estado de
  consulta/revisão da tarefa; não herdar edição do formulário de origem

  **Ajuda/exemplo:** REQ-01 Não sei informar: “Use quando não puder contar.”;
  REQ-02 Não sei informar: Informação do registro indicado, somente para
  consulta nesta etapa. Ausência de dado histórico permanece explicitamente
  identificada.

- **Campo:** Urgente

  **Tipo/origem por tela e estado:** REQ-01 Urgente: EDITABLE
  (CHECKBOX_OR_SWITCH); Somente no subestado de preparação autorizado indicado
  na ficha; resumo/decisão posterior é leitura; REQ-02 Urgente: READ_ONLY
  (TEXT_VALUE); Estado de consulta/revisão da tarefa; não herdar edição do
  formulário de origem

  **Obrigatoriedade/default na preparação:** REQ-01 Urgente: Sim como boolean,
  false; REQ-02 Urgente: Valor emitido, proposto ou calculado da fonte
  identificada; ausência explicitamente informada, sem valor inventado

  **Validação/unidade:** REQ-01 Urgente: Não inferir por saldo mínimo; Somente
  no subestado de preparação autorizado indicado na ficha; resumo/decisão
  posterior é leitura; REQ-02 Urgente: Revalidar acesso, referência e estado
  na leitura/ação. Não solicitar ao usuário correção deste valor nesta tela.
  Estado de consulta/revisão da tarefa; não herdar edição do formulário de
  origem

  **Ajuda/exemplo:** REQ-01 Urgente: “Precisa de atenção mais rápida.”; REQ-02
  Urgente: Informação do registro indicado, somente para consulta nesta etapa.
  Ausência de dado histórico permanece explicitamente identificada.

- **Campo:** Justificativa de repetição

  **Tipo/origem por tela e estado:** REQ-01 Justificativa de repetição:
  EDITABLE (TEXTAREA); Somente no subestado de preparação autorizado indicado
  na ficha; resumo/decisão posterior é leitura; REQ-02 Justificativa de
  repetição: READ_ONLY (TEXT_VALUE); Estado de consulta/revisão da tarefa; não
  herdar edição do formulário de origem

  **Obrigatoriedade/default na preparação:** REQ-01 Justificativa de
  repetição: Condicional se necessidade anterior pendente; vazio; REQ-02
  Justificativa de repetição: Valor emitido, proposto ou calculado da fonte
  identificada; ausência explicitamente informada, sem valor inventado

  **Validação/unidade:** REQ-01 Justificativa de repetição: 3–1000 caracteres,
  preserva vínculo anterior; Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura; REQ-02 Justificativa
  de repetição: Revalidar acesso, referência e estado na leitura/ação. Não
  solicitar ao usuário correção deste valor nesta tela. Estado de
  consulta/revisão da tarefa; não herdar edição do formulário de origem

  **Ajuda/exemplo:** REQ-01 Justificativa de repetição: “Ainda precisamos do
  material após atendimento parcial.”; REQ-02 Justificativa de repetição:
  Informação do registro indicado, somente para consulta nesta etapa. Ausência
  de dado histórico permanece explicitamente identificada.

- **Campo:** Item extra

  **Tipo/origem por tela e estado:** REQ-01 Item extra: EDITABLE (TEXT_INPUT);
  Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura; REQ-02 Item extra: READ_ONLY
  (TEXT_VALUE); Estado de consulta/revisão da tarefa; não herdar edição do
  formulário de origem

  **Obrigatoriedade/default na preparação:** REQ-01 Item extra: Nome se extra
  adicionado; vazio; REQ-02 Item extra: Valor emitido, proposto ou calculado
  da fonte identificada; ausência explicitamente informada, sem valor
  inventado

  **Validação/unidade:** REQ-01 Item extra: 1–200 caracteres, até 20 extras,
  identidade própria; Somente no subestado de preparação autorizado indicado
  na ficha; resumo/decisão posterior é leitura; REQ-02 Item extra: Revalidar
  acesso, referência e estado na leitura/ação. Não solicitar ao usuário
  correção deste valor nesta tela. Estado de consulta/revisão da tarefa; não
  herdar edição do formulário de origem

  **Ajuda/exemplo:** REQ-01 Item extra: “Material não encontrado no
  catálogo.”; REQ-02 Item extra: Informação do registro indicado, somente para
  consulta nesta etapa. Ausência de dado histórico permanece explicitamente
  identificada.

- **Campo:** Observação do extra

  **Tipo/origem por tela e estado:** REQ-01 Observação e urgência do item
  extra: EDITABLE (EXTRA_ITEM_CONTEXT_GROUP); Somente no subestado de
  preparação autorizado indicado na ficha; resumo/decisão posterior é leitura;
  REQ-02 Observação e urgência do item extra: READ_ONLY (TEXT_VALUE); Estado
  de consulta/revisão da tarefa; não herdar edição do formulário de origem

  **Obrigatoriedade/default na preparação:** REQ-01 Observação e urgência do
  item extra: Conforme linha extra; REQ-02 Observação e urgência do item
  extra: Valor emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado

  **Validação/unidade:** REQ-01 Observação e urgência do item extra: Reusar os
  três modos de observação e a urgência por extra; nome preservado; não cria
  produto ou quantidade solicitada; Somente no subestado de preparação
  autorizado indicado na ficha; resumo/decisão posterior é leitura; REQ-02
  Observação e urgência do item extra: Revalidar acesso, referência e estado
  na leitura/ação. Não solicitar ao usuário correção deste valor nesta tela.
  Estado de consulta/revisão da tarefa; não herdar edição do formulário de
  origem

  **Ajuda/exemplo:** REQ-01 Observação e urgência do item extra: No item não
  encontrado, informe só o que observou agora; Não sei informar continua sendo
  uma escolha própria.; REQ-02 Observação e urgência do item extra: Informação
  do registro indicado, somente para consulta nesta etapa. Ausência de dado
  histórico permanece explicitamente identificada.

- **Campo:** Observações gerais

  **Tipo/origem por tela e estado:** REQ-01 Observações gerais: EDITABLE
  (TEXTAREA); Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura; REQ-02 Observações gerais: READ_ONLY
  (TEXT_VALUE); Estado de consulta/revisão da tarefa; não herdar edição do
  formulário de origem

  **Obrigatoriedade/default na preparação:** REQ-01 Observações gerais: Não,
  lista vazia; REQ-02 Observações gerais: Valor emitido, proposto ou calculado
  da fonte identificada; ausência explicitamente informada, sem valor
  inventado

  **Validação/unidade:** REQ-01 Observações gerais: Até 50 entradas de 1–1000
  caracteres; Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura; REQ-02 Observações gerais: Revalidar
  acesso, referência e estado na leitura/ação. Não solicitar ao usuário
  correção deste valor nesta tela. Estado de consulta/revisão da tarefa; não
  herdar edição do formulário de origem

  **Ajuda/exemplo:** REQ-01 Observações gerais: “Embalagem encontrada aberta”,
  sem dado clínico desnecessário.; REQ-02 Observações gerais: Informação do
  registro indicado, somente para consulta nesta etapa. Ausência de dado
  histórico permanece explicitamente identificada.

- **Campo:** Nome da seleção recorrente

  **Tipo/origem por tela e estado:** REQ-05 Nome da seleção recorrente:
  EDITABLE (TEXT_INPUT); Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** REQ-05 Nome da seleção
  recorrente: Se salvar seleção; vazio

  **Validação/unidade:** REQ-05 Nome da seleção recorrente: Proposta: 2–80
  caracteres; escopo paciente/usuário; Somente no subestado de preparação
  autorizado indicado na ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** REQ-05 Nome da seleção recorrente: “Materiais habituais
  do turno.”

- **Campo:** Motivo de necessidade remanescente

  **Tipo/origem por tela e estado:** REQ-03 Motivo de necessidade
  remanescente: EDITABLE_SUBFORM (TEXTAREA); Somente ao preparar NOVA REQ
  remanescente vinculada; conteúdo emitido permanece imutável

  **Obrigatoriedade/default na preparação:** REQ-03 Motivo de necessidade
  remanescente: Sim ao abrir nova necessidade vinculada

  **Validação/unidade:** REQ-03 Motivo de necessidade remanescente: 3–1000;
  sem quantidade solicitada; Somente ao preparar NOVA REQ remanescente
  vinculada; conteúdo emitido permanece imutável

  **Ajuda/exemplo:** REQ-03 Motivo de necessidade remanescente: “O material
  entregue não encerrou a necessidade.”

- **Campo:** Modalidade de ciência

  **Tipo/origem por tela e estado:** REQ-04 Modalidade de ciência: READ_ONLY
  (POLICY_DESCRIPTION); Modalidade/política aplicada ao diálogo; alteração de
  preferência em ID-02/NOT-02

  **Obrigatoriedade/default na preparação:** REQ-04 Modalidade de ciência:
  Valor emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado

  **Validação/unidade:** REQ-04 Modalidade de ciência: Revalidar acesso,
  referência e estado na leitura/ação. Não solicitar ao usuário correção deste
  valor nesta tela. Modalidade/política aplicada ao diálogo; alteração de
  preferência em ID-02/NOT-02

  **Ajuda/exemplo:** REQ-04 Modalidade de ciência: Informação do registro
  indicado, somente para consulta nesta etapa. Ausência de dado histórico
  permanece explicitamente identificada.

- **Campo:** Versão e intenção

  **Tipo/origem por tela e estado:** REQ-01 Versão e intenção: INTERNAL
  (NO_USER_CONTROL); Dado de comando/transporte; nunca input ou identificador
  técnico exigido ao usuário; REQ-02 Versão e intenção: INTERNAL
  (NO_USER_CONTROL); Dado de comando/transporte; nunca input ou identificador
  técnico exigido ao usuário; REQ-03 Versão e intenção: INTERNAL
  (NO_USER_CONTROL); Dado de comando/transporte; nunca input ou identificador
  técnico exigido ao usuário; REQ-04 Versão e intenção: INTERNAL
  (NO_USER_CONTROL); Dado de comando/transporte; nunca input ou identificador
  técnico exigido ao usuário

  **Obrigatoriedade/default na preparação:** REQ-01 Versão e intenção: Não
  renderizar controle; REQ-02 Versão e intenção: Não renderizar controle;
  REQ-03 Versão e intenção: Não renderizar controle; REQ-04 Versão e intenção:
  Não renderizar controle

  **Validação/unidade:** REQ-01 Versão e intenção: Somente contrato interno,
  com validação no servidor; não expor segredo/UUID como decisão do usuário;
  REQ-02 Versão e intenção: Somente contrato interno, com validação no
  servidor; não expor segredo/UUID como decisão do usuário; REQ-03 Versão e
  intenção: Somente contrato interno, com validação no servidor; não expor
  segredo/UUID como decisão do usuário; REQ-04 Versão e intenção: Somente
  contrato interno, com validação no servidor; não expor segredo/UUID como
  decisão do usuário

  **Ajuda/exemplo:** REQ-01 Versão e intenção: Não pedir UUID ao usuário.;
  REQ-02 Versão e intenção: Não pedir UUID ao usuário.; REQ-03 Versão e
  intenção: Não pedir UUID ao usuário.; REQ-04 Versão e intenção: Não pedir
  UUID ao usuário.

- **Campo:** Minha ciência

  **Tipo/origem por tela e estado:** READ_ONLY_DESCRIPTION;context by
  CONTROL_SCREEN_CONTRACTS.csv

  **Obrigatoriedade/default na preparação:** Resultado pessoal da identidade
  autenticada para o conteúdo material emitido

  **Validação/unidade:** Pendente ou registrada com origem/instante próprios;
  Família ciente não é atribuído como ciência de todos

  **Ajuda/exemplo:** Outra pessoa pode ter satisfeito a obrigação familiar.
  Aqui aparece somente a sua ciência pessoal.

- **Campo:** Ciência da família

  **Tipo/origem por tela e estado:** READ_ONLY_DESCRIPTION;context by
  CONTROL_SCREEN_CONTRACTS.csv

  **Obrigatoriedade/default na preparação:** Agregado calculado; ANY entre
  pessoas familiares autorizadas

  **Validação/unidade:** Uma ciência válida basta; nenhuma exigência de todos
  e nenhuma conclusão jurídica automática

  **Ajuda/exemplo:** Família ciente significa que uma pessoa habilitada já
  registrou ciência válida deste conteúdo.

<!-- c-table:end -->

Estoque TO_BE tem três valores semânticos: `observed` com quantidade
(inclusive zero), `unknown` por escolha expressa e `unfilled` quando deixado
vazio. Campo vazio não impede por si emitir segundo DEC-003; o PDF diz “Não
informado”. O desconhecido diz “Não sei informar”; nenhum deles é convertido
em 0. O saldo calculado pode ser mostrado em área autorizada separada, nunca
preenche contagem. Seleção recorrente traz só materiais, não urgência/estoque
anteriores.

## Jornada, transições e responsáveis

<!-- c-table:start -->

- **De → para:** Edição → rascunho durável

  **Ação/ator:** Autor salva/autosave confirmado

  **Efeito e próxima etapa:** Sem protocolo emitido ou saldo; recuperar em
  outro aparelho.

- **De → para:** Rascunho → emitida

  **Ação/ator:** Autor com capacidade revisa e emite

  **Efeito e próxima etapa:** Banco resolve snapshots/protocolo/hash; cria
  pendência e versão; família avalia.

- **De → para:** Ciência pendente → registrada

  **Ação/ator:** Ator elegível, modalidade escolhida

  **Efeito e próxima etapa:** Evento com ator, origem, versão e regra; não
  atende material.

- **De → para:** Emitida → parcialmente/totalmente atendida

  **Ação/ator:** Aceite positivo de ENT vinculada

  **Efeito e próxima etapa:** Nova versão de atendimento por linha, sem
  quantidade pedida ou crédito duplicado.

- **De → para:** Atendida → necessidade remanescente

  **Ação/ator:** Autor autorizado inicia nova REQ ligada

  **Efeito e próxima etapa:** Motivo e relação preservados; nenhum undo do
  fato físico.

- **De → para:** Atendida → arquivada

  **Ação/ator:** Política atual ou admin local em exceção motivada

  **Efeito e próxima etapa:** Ciência pendente exigida conserva exceção e
  arquivamento manual legítimo.

- **De → para:** Arquivada → atendimento revisto

  **Ação/ator:** Cancelamento/compensação legítima de ENT

  **Efeito e próxima etapa:** Evento de reabertura coerente; histórico e
  versão arquivada não somem.

<!-- c-table:end -->

Manual registra ato expresso. Modal condicionado informa **antes de abrir**:
“Continuar registra sua ciência; não declara leitura integral”. Cancelar não
registra ciência e retorna ao ponto anterior. Tácita registra na emissão com
origem `tacit_preference` e versão da preferência. Mudança posterior é
prospectiva. Acesso efetivo tem evento independente por abertura autorizada;
duplicação por retry técnico não fabrica várias aberturas, mas nova abertura
real é registrada. Prévia negada ou ciência tácita não cria acesso fictício.
P02 define atos excluídos.

## Erro, concorrência e recuperação

Emitir congela conteúdo/chave; resposta perdida consulta a mesma tentativa. Se
persistiu, abrir documento e informar registro salvo; se não confirmado,
manter uncertain. Não enviar novamente com chave nova. Campo inválido leva ao
campo exato; trocar paciente conserva rascunho no escopo original e exige
contexto atual antes de concluir. Mudança de catálogo/política/versão
apresenta diferença na retomada. Revogado não emite nem declara ciência nova.

P1 C-CAUSE-049 exige seleção automática com progresso entre pacientes e entre
documentos do mesmo paciente, terminais fora do lote elegível e dedup de cada
lembrete. Dado legado inválido deve gerar diagnóstico/continuidade segura, sem
limpar história ou inventar prazo. A ciência, o atendimento e o deadline não
podem depender do êxito de WhatsApp/push.

## Documento, privacidade e aceite

PDF inclui observação com modo e instante da emissão, urgência, estado por
linha, ciência com origem, vínculos e ressalvas. Nunca imprime “solicitado:
0”. A equipe continua sem acesso ao estoque familiar geral. Pendência interna
aponta para documento e responsável, sem provar leitura ou recebimento.

Aceites D: escolher material/apagar 7 conserva unfilled; digitar 0 conserva
observed=0; escolher desconhecido produz unknown; reabrir em outro aparelho
mantém distinções. Emitir sob resposta perdida cria uma REQ. ENT parcial
ligada a duas REQs credita só uma vez e permite nova necessidade motivada.
Ciência nas três modalidades tem texto/ator/origem corretos; nenhum usuário
sem capacidade a registra. Família/profissional explicam cada diferença por
teclado, AT e celular real. Matrizes C-AC-025/032/036/041/049 e CAPs
complementam.

## Atualização vinculante C7–C10

P02 está OWNER_APPROVED pela ordem definitiva. Abertura, ciência e leitura não
se confundem. P12 aprova um draft de criação por tipo e retomada privada;
observação antiga conserva instante. Blueprint REQ-01–05 e casos C9 detalham
controles e oráculos.

Esta atualização substitui alternativas/recomendações anteriores conflitantes;
não anuncia implementação. Contrato detalhado no
[adendo C7](../C7-decision-closure/PRODUCT_DECISIONS_C7_ADDENDUM.md),
[blueprint C8](../C8-visual-blueprint/VISUAL_BLUEPRINT_BY_SCREEN.md) e
[casos C9](../C9-acceptance-refinement/ACCEPTANCE_CASES.csv).

## Fechamento definitivo — tarefa, estado e política

P02 está **OWNER_APPROVED**. Fonte vinculante:
[política SCI-001–SCI-005](../C7-decision-closure/SCIENCE_OWNER_REVIEW.md).
Manual expressa, diálogo antes de abrir e tácita por preferência anterior
expressa são configuráveis somente para obrigação informativa elegível.
Cabeçalho exposto não registra ciência. WhatsApp read é comunicação;
confirmação identificada futura depende de homologação do canal postergado.

A administração familiar define quem pode declarar no paciente. Uma ciência
válida de qualquer habilitado satisfaz a obrigação (ANY); equipe vê “Família
ciente”, sem atribuir evento a todos. Minha ciência permanece pessoal. Sem
habilitado, mostrar pendência de designação. Não exigir todos, gerenciar
conversas familiares ou concluir responsabilidade civil pelo estado.

SCI-005 é obrigatória/permanente/não configurável na expedição oficial de ENT
vinculada por ator familiar habilitado. Nunca em save/draft; não depende de
scienceByDispatch ou created_by. Não autoriza quem não representa a família
nem confirma recebimento/consumo.
[Divergências AS_IS](../C7-decision-closure/SCIENCE_AS_IS_TO_BE_ANALYSIS.md)
serão tratadas na D.

REQ material emitida permanece imutável; não se identificou editor autorizado
vigente. Estado, atendimento, resolução auditada de extra, ciência e histórico
são fatos separados. Versão técnica/eventos/PDF do mesmo conteúdo não reinicia
ciência. Não criar editor para justificar versões. Se alteração material for
autorizada futuramente: identidade nova, ciência própria, agregado pendente e
aviso pertinente, sem reescrever o passado.
