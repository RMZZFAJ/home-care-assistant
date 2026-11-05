# COM-02 — Acompanhar aquisição

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

COM emitida; aprovação, aquisição e validação de chegada são etapas distintas.

Finalidade: Acompanhar aquisição.

Leitor autorizado consulta; somente capacidade específica abre o comando
Aprovar ou Registrar aquisição. Não editar a previsão original em aprovação.

AS_IS/rota: /fichas/:id, atual a alterar.

## 4–14. Campos, modos de interação e validação

Origem, materiais, previsto, unidade e observações da emissão.
Aprovado/adquirido só editáveis no subformulário da etapa correspondente.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-014-01 — Origem

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Origem já emitida.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Descrição rotulada do registro específico, sem
input, identificador de transporte ou valor inventado. Autocomplete: NÃO
APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Origem já emitida.

**Ajuda/exemplo:** Informação do registro indicado, somente para consulta
nesta etapa. Ausência de dado histórico permanece explicitamente identificada.

**Mensagem e condição:** “Não foi possível carregar a informação “Origem”.
Atualize esta seção. O dado registrado não pode ser alterado aqui.” —
SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-015-01 — Material

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Material da linha emitida.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Nome completo e unidade da origem, com quebra de
linha sem corte. Autocomplete: NÃO APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Material da linha
emitida.

**Ajuda/exemplo:** Identificação do item registrado. A consulta não substitui
o material ou reinterpreta sua unidade.

**Mensagem e condição:** “Não foi possível carregar a informação “Material”.
Atualize esta seção. O dado registrado não pode ser alterado aqui.” —
SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-016-01 — Previsto

**Modo/componente:** READ_ONLY / QUANTITY_WITH_UNIT.

**Quando/ator:** Quantidade prevista original.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Quantidade decimal exata com unidade e precisão da
origem, sem input. Autocomplete: NÃO APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Quantidade prevista
original.

**Ajuda/exemplo:** Quantidade registrada para a etapa indicada. Não é uma nova
declaração de quantidade e não movimenta material ao ser consultada.

**Mensagem e condição:** “Não foi possível carregar a informação “Previsto”.
Atualize esta seção. O dado registrado não pode ser alterado aqui.” —
SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-017-01 — Apresentação

**Modo/componente:** READ_ONLY / EQUIVALENCE_DESCRIPTION.

**Quando/ator:** Apresentação/fator da emissão.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Descrição rotulada do registro específico, sem
input, identificador de transporte ou valor inventado. Autocomplete: NÃO
APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Apresentação/fator da
emissão.

**Ajuda/exemplo:** Informação do registro indicado, somente para consulta
nesta etapa. Ausência de dado histórico permanece explicitamente identificada.

**Mensagem e condição:** “Não foi possível carregar a informação
“Apresentação”. Atualize esta seção. O dado registrado não pode ser alterado
aqui.” — SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-018-01 — Aprovado

**Modo/componente:** EDITABLE_SUBFORM / DECIMAL_TEXT_INPUT.

**Quando/ator:** Somente ao preparar aprovação autorizada; depois em leitura.

**Obrigatoriedade/inicial:** Sim ao aprovar, proposta exibida.

**Máscara/apresentação:** Quantidade textual exata com unidade; vírgula/ponto,
inputmode decimal e precisão explícita antes da coerção. Autocomplete: off.

**Validação:** Não confundir com adquirido/validado; mudança explícita;
Somente ao preparar aprovação autorizada; depois em leitura.

**Ajuda/exemplo:** “Autorizar 8 unidades.”

**Mensagem e condição:** “Informe aprovado na unidade indicada e com a
precisão permitida. O campo precisa de correção antes de confirmar.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-019-01 — Adquirido

**Modo/componente:** EDITABLE_SUBFORM / DECIMAL_TEXT_INPUT.

**Quando/ator:** Somente Registrar aquisição; não é declaração de chegada.

**Obrigatoriedade/inicial:** Sim nessa etapa, vazio.

**Máscara/apresentação:** Quantidade textual exata com unidade; vírgula/ponto,
inputmode decimal e precisão explícita antes da coerção. Autocomplete: off.

**Validação:** Positivo, versão e limites por linha; Somente Registrar
aquisição; não é declaração de chegada.

**Ajuda/exemplo:** “Foram adquiridas 2 unidades.”

**Mensagem e condição:** “Informe adquirido na unidade indicada e com a
precisão permitida. O campo precisa de correção antes de confirmar.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-024-01 — Observações

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Observação da emissão; etapa nova tem nota própria
identificada.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Descrição rotulada do registro específico, sem
input, identificador de transporte ou valor inventado. Autocomplete: NÃO
APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Observação da emissão;
etapa nova tem nota própria identificada.

**Ajuda/exemplo:** Informação do registro indicado, somente para consulta
nesta etapa. Ausência de dado histórico permanece explicitamente identificada.

**Mensagem e condição:** “Não foi possível carregar a informação
“Observações”. Atualize esta seção. O dado registrado não pode ser alterado
aqui.” — SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

## 15–18. Hierarquia, ações, consequências e mensagens

Cabeçalho → tabela Previsto/Aprovado/Adquirido/Validado → pendência por etapa
→ comando contextual → resumo antes/depois.

Colunas com títulos estáveis para cada etapa e unidade em todas as linhas;
detalhe/ação da etapa selecionada ao lado ou abaixo.

Primária: **Registrar etapa da aquisição**. Secundárias: Aprovar quantidades;
Ver parcelas; Histórico.

Efeito: Aprovar e comprar são fatos distintos sem crédito automático.

Sucesso/resultado: “Etapa da aquisição registrada. Consulte as parcelas de
chegada para saber o que foi validado no estoque.”

Vazio/inelegível: “Não há etapa pendente que você possa registrar. Consulte o
estado e as parcelas desta aquisição.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Informação indisponível não recebe valor inventado; bloquear somente ação que
depende dela, preservando consultas e encaminhamentos autorizados.

Conflito conserva proposta sem alterar a quantidade prevista; reler a etapa
decidida. Uma aprovação confirmada não é reenviada como aquisição.

Leitura falha repete consulta da seção. Escrita incerta consulta a mesma
intenção antes de novo comando. Recusa comprovada, confirmado, conflito e
incerto têm resultados distintos; nenhuma mensagem presume que nada ocorreu.

Voltar conserva contexto/edição permitidos e devolve foco ao acionador. Depois
de resultado confirmado, abrir o alvo/resultado existente, sem repetir o ato.

## 21–24. Móvel, acessibilidade, referência e negócio

Cartões por material/parcela com pares rótulo/valor e ação da etapa; tabelas
largas só em região rotulada quando indispensáveis.

Cabeçalhos associam quantidade à etapa; decisão da parcela identifica autor e
instante; nenhum input de outra etapa recebe foco indevido.

Identidade aprovada: teal/papel claro, tipografia hierárquica, bordas suaves,
cards e barra de contexto. Prioridade da tarefa e regras de autorização
governam o layout; exemplos do protótipo não são controles obrigatórios.

Referência do protótipo: com. Sem captura real ou aceite humano de interface
futura nesta C.

RECONSTRUIR composição por etapas; inputs da criação não pertencem ao detalhe
emitido.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-015;C-AC-028;C-AC-035;C-AC-044;C-AC-058;C-AC-074;C-AC-077;C-AC-089;C-AC-109;C-NEW-AC-005;C-NEW-AC-022;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
