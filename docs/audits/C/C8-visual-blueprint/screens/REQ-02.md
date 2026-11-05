# REQ-02 — Revisar requisição

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Revisão do rascunho atual, antes de emitir; campos do conteúdo em leitura.

Finalidade: Revisar requisição.

Autor autenticado com capacidade de requisitar e contexto vigente. Emitir é
comando separado do save.

AS_IS/rota: Revisão do wizard, atual a alterar.

## 4–14. Campos, modos de interação e validação

Todo o conteúdo material e a regra informativa de ciência. Editar leva à etapa
de origem e exige nova revisão; não há inputs duplicados no resumo.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-001-01 — Paciente

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Consulta do valor de origem; mudanças só no processo
legitimamente responsável.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Nome da residência/paciente do contexto autorizado,
sem UUID digitável. Autocomplete: NÃO APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Consulta do valor de
origem; mudanças só no processo legitimamente responsável.

**Ajuda/exemplo:** Confira a residência desta tarefa. Trocar contexto é uma
ação separada e exige acesso autorizado.

**Mensagem e condição:** “Não foi possível carregar a informação “Paciente”.
Atualize esta seção. O dado registrado não pode ser alterado aqui.” —
SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-002-01 — Materiais

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Estado de consulta/revisão da tarefa; não herdar edição do
formulário de origem.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Descrição rotulada do registro específico, sem
input, identificador de transporte ou valor inventado. Autocomplete: NÃO
APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Estado de
consulta/revisão da tarefa; não herdar edição do formulário de origem.

**Ajuda/exemplo:** Informação do registro indicado, somente para consulta
nesta etapa. Ausência de dado histórico permanece explicitamente identificada.

**Mensagem e condição:** “Não foi possível carregar a informação “Materiais”.
Atualize esta seção. O dado registrado não pode ser alterado aqui.” —
SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-003-01 — Estoque observado

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Estado de consulta/revisão da tarefa; não herdar edição do
formulário de origem.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Quantidade decimal exata com unidade e precisão da
origem, sem input. Autocomplete: NÃO APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Estado de
consulta/revisão da tarefa; não herdar edição do formulário de origem.

**Ajuda/exemplo:** Quantidade registrada para a etapa indicada. Não é uma nova
declaração de quantidade e não movimenta material ao ser consultada.

**Mensagem e condição:** “Não foi possível carregar a informação “Estoque
observado”. Atualize esta seção. O dado registrado não pode ser alterado
aqui.” — SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-004-01 — Não sei informar

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Estado de consulta/revisão da tarefa; não herdar edição do
formulário de origem.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Descrição rotulada do registro específico, sem
input, identificador de transporte ou valor inventado. Autocomplete: NÃO
APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Estado de
consulta/revisão da tarefa; não herdar edição do formulário de origem.

**Ajuda/exemplo:** Informação do registro indicado, somente para consulta
nesta etapa. Ausência de dado histórico permanece explicitamente identificada.

**Mensagem e condição:** “Não foi possível carregar a informação “Não sei
informar”. Atualize esta seção. O dado registrado não pode ser alterado aqui.”
— SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-005-01 — Urgente

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Estado de consulta/revisão da tarefa; não herdar edição do
formulário de origem.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Descrição rotulada do registro específico, sem
input, identificador de transporte ou valor inventado. Autocomplete: NÃO
APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Estado de
consulta/revisão da tarefa; não herdar edição do formulário de origem.

**Ajuda/exemplo:** Informação do registro indicado, somente para consulta
nesta etapa. Ausência de dado histórico permanece explicitamente identificada.

**Mensagem e condição:** “Não foi possível carregar a informação “Urgente”.
Atualize esta seção. O dado registrado não pode ser alterado aqui.” —
SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-006-01 — Justificativa de repetição

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Estado de consulta/revisão da tarefa; não herdar edição do
formulário de origem.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Descrição rotulada do registro específico, sem
input, identificador de transporte ou valor inventado. Autocomplete: NÃO
APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Estado de
consulta/revisão da tarefa; não herdar edição do formulário de origem.

**Ajuda/exemplo:** Informação do registro indicado, somente para consulta
nesta etapa. Ausência de dado histórico permanece explicitamente identificada.

**Mensagem e condição:** “Não foi possível carregar a informação
“Justificativa de repetição”. Atualize esta seção. O dado registrado não pode
ser alterado aqui.” — SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-007-01 — Item extra

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Estado de consulta/revisão da tarefa; não herdar edição do
formulário de origem.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Descrição rotulada do registro específico, sem
input, identificador de transporte ou valor inventado. Autocomplete: NÃO
APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Estado de
consulta/revisão da tarefa; não herdar edição do formulário de origem.

**Ajuda/exemplo:** Informação do registro indicado, somente para consulta
nesta etapa. Ausência de dado histórico permanece explicitamente identificada.

**Mensagem e condição:** “Não foi possível carregar a informação “Item extra”.
Atualize esta seção. O dado registrado não pode ser alterado aqui.” —
SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-008-01 — Observação e urgência do item extra

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Estado de consulta/revisão da tarefa; não herdar edição do
formulário de origem.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Descrição rotulada do registro específico, sem
input, identificador de transporte ou valor inventado. Autocomplete: NÃO
APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Estado de
consulta/revisão da tarefa; não herdar edição do formulário de origem.

**Ajuda/exemplo:** Informação do registro indicado, somente para consulta
nesta etapa. Ausência de dado histórico permanece explicitamente identificada.

**Mensagem e condição:** “Não foi possível carregar a informação “Observação e
urgência do item extra”. Atualize esta seção. O dado registrado não pode ser
alterado aqui.” — SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-009-01 — Observações gerais

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Estado de consulta/revisão da tarefa; não herdar edição do
formulário de origem.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Descrição rotulada do registro específico, sem
input, identificador de transporte ou valor inventado. Autocomplete: NÃO
APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Estado de
consulta/revisão da tarefa; não herdar edição do formulário de origem.

**Ajuda/exemplo:** Informação do registro indicado, somente para consulta
nesta etapa. Ausência de dado histórico permanece explicitamente identificada.

**Mensagem e condição:** “Não foi possível carregar a informação “Observações
gerais”. Atualize esta seção. O dado registrado não pode ser alterado aqui.” —
SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-013-01 — Versão e intenção

**Modo/componente:** INTERNAL / NO_USER_CONTROL.

**Quando/ator:** Dado de comando/transporte; nunca input ou identificador
técnico exigido ao usuário.

**Obrigatoriedade/inicial:** Não renderizar controle.

**Máscara/apresentação:** NÃO APLICÁVEL. Autocomplete: NÃO APLICÁVEL.

**Validação:** Somente contrato interno, com validação no servidor; não expor
segredo/UUID como decisão do usuário.

**Ajuda/exemplo:** Não pedir UUID ao usuário.

**Acessibilidade:** Não inserir campo escondido na ordem de foco, texto
acessível ou mensagem para o usuário comum.

## 15–18. Hierarquia, ações, consequências e mensagens

Paciente/autor → lista completa de materiais/extras → modos de observação e
urgência → notas → consequência → Emitir requisição.

Página de revisão com cabeçalho de identidade e seções de conteúdo; links
Editar localizados junto à seção, primária após o resumo completo.

Primária: **Emitir requisição**. Secundárias: Voltar e editar; Salvar
rascunho.

Efeito: Só emissão confirmada cria documento oficial; não compra.

Sucesso/resultado: “Requisição emitida. A família poderá avaliar a
necessidade; nenhum material foi comprado ou movimentado.”

Vazio/inelegível: “O preenchimento não está disponível para revisão. Volte aos
materiais ou retome seu rascunho.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Paciente, conteúdo selecionado e estado de edição precisam estar disponíveis
para emitir. Save privado pode continuar parcial; indisponibilidade não emite
REQ com dados presumidos.

Resposta perdida consulta a mesma emissão. Confirmada, abre a REQ existente;
incerta, conserva revisão e bloqueia nova emissão com outra chave.

Leitura falha repete consulta da seção. Escrita incerta consulta a mesma
intenção antes de novo comando. Recusa comprovada, confirmado, conflito e
incerto têm resultados distintos; nenhuma mensagem presume que nada ocorreu.

Voltar conserva contexto/edição permitidos e devolve foco ao acionador. Depois
de resultado confirmado, abrir o alvo/resultado existente, sem repetir o ato.

## 21–24. Móvel, acessibilidade, referência e negócio

Cartões de leitura em uma coluna; unidade e modo observado junto ao valor;
ação alcançável sem cobrir última linha ou teclado.

Links Editar retornam ao campo correto; ao voltar à revisão, foco no título da
seção atual; resumo é texto sem aria-invalid.

Identidade aprovada: teal/papel claro, tipografia hierárquica, bordas suaves,
cards e barra de contexto. Prioridade da tarefa e regras de autorização
governam o layout; exemplos do protótipo não são controles obrigatórios.

Referência do protótipo: req/reqReview. Sem captura real ou aceite humano de
interface futura nesta C.

RECONSTRUIR resumo se herdar controles de edição ou ocultar
extras/observações; preservar contrato de emissão.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-025;C-AC-026;C-AC-036;C-AC-041;C-AC-049;C-AC-073;C-AC-089;C-AC-105;C-NEW-AC-003;C-NEW-AC-004;C-NEW-AC-024;C-NEW-AC-028;C7-AC-012;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
