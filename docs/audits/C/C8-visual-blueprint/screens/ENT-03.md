# ENT-03 — Conferir entrega pessoalmente

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Entrega expedida aguardando recebimento pessoal; após confirmação, somente
consulta e próximas ações próprias.

Finalidade: Conferir entrega pessoalmente.

Leitores consultam. Somente o recebedor efetivo designado e autorizado
confirma seu próprio recebimento; administração/global não assinam por ele.

AS_IS/rota: /fichas/:id, atual a alterar.

## 4–14. Campos, modos de interação e validação

Origem, destino, material, quantidade expedida, unidade e REQs vinculadas são
imutáveis nesta confirmação. Não renderizar seletores ou inputs para eles.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-028-01 — Origem

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Estado de consulta/revisão da tarefa; não herdar edição do
formulário de origem.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Nome da custódia de origem da emissão, por exemplo
Família; não seletor. Autocomplete: NÃO APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Estado de
consulta/revisão da tarefa; não herdar edição do formulário de origem.

**Ajuda/exemplo:** Mostra de onde os materiais desta entrega foram expedidos.

**Mensagem e condição:** “Não foi possível carregar a informação “Origem”.
Atualize esta seção. O dado registrado não pode ser alterado aqui.” —
SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-028-02 — Destino

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Estado de consulta/revisão da tarefa; não herdar edição do
formulário de origem.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Nome da custódia de destino da emissão, por exemplo
Equipe; não seletor. Autocomplete: NÃO APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Estado de
consulta/revisão da tarefa; não herdar edição do formulário de origem.

**Ajuda/exemplo:** Mostra o destino previsto. O crédito depende do recebimento
pessoal pertinente.

**Mensagem e condição:** “Não foi possível carregar a informação “Destino”.
Atualize esta seção. O dado registrado não pode ser alterado aqui.” —
SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-029-01 — Material

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Estado de consulta/revisão da tarefa; não herdar edição do
formulário de origem.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Nome completo e unidade da origem, com quebra de
linha sem corte. Autocomplete: NÃO APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Estado de
consulta/revisão da tarefa; não herdar edição do formulário de origem.

**Ajuda/exemplo:** Identificação do item registrado. A consulta não substitui
o material ou reinterpreta sua unidade.

**Mensagem e condição:** “Não foi possível carregar a informação “Material”.
Atualize esta seção. O dado registrado não pode ser alterado aqui.” —
SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-029-02 — Quantidade expedida

**Modo/componente:** READ_ONLY / QUANTITY_WITH_UNIT.

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

**Mensagem e condição:** “Não foi possível carregar a informação “Quantidade
expedida”. Atualize esta seção. O dado registrado não pode ser alterado aqui.”
— SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-030-01 — REQs atendidas

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Estado de consulta/revisão da tarefa; não herdar edição do
formulário de origem.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Lista de referências humanas das REQs vinculadas,
com acesso próprio. Autocomplete: NÃO APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Estado de
consulta/revisão da tarefa; não herdar edição do formulário de origem.

**Ajuda/exemplo:** Vínculos da expedição emitida; consultar uma REQ não altera
o material ou o crédito.

**Mensagem e condição:** “Não foi possível carregar a informação “REQs
atendidas”. Atualize esta seção. O dado registrado não pode ser alterado
aqui.” — SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-031-01 — Recebedor

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Estado de consulta/revisão da tarefa; não herdar edição do
formulário de origem.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Nome da pessoa e papel no ato, conforme registro
histórico; sem token ou ID de sessão. Autocomplete: NÃO APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Estado de
consulta/revisão da tarefa; não herdar edição do formulário de origem.

**Ajuda/exemplo:** Identifica a pessoa relacionada a este ato; não permite
transferir sua autoria para quem consulta.

**Mensagem e condição:** “Não foi possível carregar a informação “Recebedor”.
Atualize esta seção. O dado registrado não pode ser alterado aqui.” —
SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-034-01 — Conferência integral

**Modo/componente:** EXPLICIT_ACTION / EXPLICIT_CONFIRM_BUTTON.

**Quando/ator:** Somente recebedor; confirmação após resumo de TODAS as
linhas.

**Obrigatoriedade/inicial:** Sem concordância material inicial ou clique
automático.

**Máscara/apresentação:** Botão/ação com nome de consequência; sem campo
textual de aceite. Autocomplete: NÃO APLICÁVEL.

**Validação:** Resumo de todas as linhas e quantidades; Somente recebedor;
confirmação após resumo de TODAS as linhas.

**Ajuda/exemplo:** “Confirmo que recebi os materiais listados.”

**Mensagem e condição:** “Esta ação não está disponível no estado atual.
Consulte o resultado ou volte à tarefa; nenhuma confirmação será presumida.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Botão com verbo/alvo/efeito; confirmação por
teclado/touch; foco retorna ao resumo, sem aria-invalid em texto de leitura.

### CTRL-038-01 — Resolução da diferença

**Modo/componente:** EDITABLE_SUBFORM / DOMAIN_ACTION_CHOICES.

**Quando/ator:** Painel Resolver pendência por capacidade específica; nunca
parte da confirmação pessoal comum.

**Obrigatoriedade/inicial:** Sim ao conciliar.

**Máscara/apresentação:** Ações distintas Recebido, Devolvido e Falta apurada,
com efeito e autoridade; cada ação abre seu próprio formulário. Autocomplete:
off.

**Validação:** Quantidade positiva até pendência; motivo 3–1000; Painel
Resolver pendência por capacidade específica; nunca parte da confirmação
pessoal comum.

**Ajuda/exemplo:** Recebido, devolvido e falta apurada têm efeitos diferentes.
Abra a ação permitida e confira quantidade, motivo e custódias.

**Mensagem e condição:** “Escolha uma opção válida para resolução da diferença
no escopo desta tarefa. Se a opção necessária não estiver disponível, volte ou
procure a administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

## 15–18. Hierarquia, ações, consequências e mensagens

Documento e recebedor → origem/trânsito/destino em leitura → TODAS as linhas
expedidas → confirmar integralmente ou abrir divergência → resultado.

Resumo de custódias e recebedor antes das linhas; expedido e aceito em colunas
identificadas; ação pessoal após todas as linhas.

Primária: **Confirmar meu recebimento**. Secundárias: Informar divergência;
Ver histórico; Resolver diferença quando autorizado.

Efeito: Credita somente aceito real uma vez.

Sucesso/resultado: “Seu recebimento foi confirmado para as quantidades
exibidas. Consulte o resultado por linha e eventuais pendências.”

Vazio/inelegível: “Esta entrega não tem recebimento pendente para você.
Consulte o resultado ou peça à família que confira o destinatário.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Sem origem/destino, recebedor, linhas/unidades e expedido confiáveis, não
oferecer confirmação integral. Atualizar a seção; não pedir ao recebedor que
digite os dados imutáveis ausentes.

Conflito mantém resumo e mostra decisão atual. Resposta perdida consulta o
aceite; nunca repetir crédito com nova chave. Conciliação é painel separado
por capacidade.

Leitura falha repete consulta da seção. Escrita incerta consulta a mesma
intenção antes de novo comando. Recusa comprovada, confirmado, conflito e
incerto têm resultados distintos; nenhuma mensagem presume que nada ocorreu.

Voltar conserva contexto/edição permitidos e devolve foco ao acionador. Depois
de resultado confirmado, abrir o alvo/resultado existente, sem repetir o ato.

## 21–24. Móvel, acessibilidade, referência e negócio

Cartões por material: expedido/unidade, aceito quando editável e restante
calculado; não cortar quantidade no viewport como a tabela do exemplo móvel.

Resumo integral anunciado antes da confirmação; erro foca quantidade
aceita/motivo editável, nunca origem/destino/expedido em leitura.

Identidade aprovada: teal/papel claro, tipografia hierárquica, bordas suaves,
cards e barra de contexto. Prioridade da tarefa e regras de autorização
governam o layout; exemplos do protótipo não são controles obrigatórios.

Referência do protótipo: ent. Sem captura real ou aceite humano de interface
futura nesta C.

RECONSTRUIR confirmador: a ficha atual descrevia campos da expedição como
editáveis e uma conferência como texto livre.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-010;C-AC-021;C-AC-028;C-AC-042;C-AC-043;C-AC-044;C-AC-048;C-AC-050;C-AC-074;C-AC-077;C-AC-079;C-AC-089;C-AC-096;C-AC-101;C-AC-103;C-AC-105;C-NEW-AC-006;C-NEW-AC-007;C-NEW-AC-009;C-NEW-AC-015;C-NEW-AC-016;C-NEW-AC-022;C-NEW-AC-028;C7-AC-002;C7-AC-010;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025;C-FINAL-AC-012;C-FINAL-AC-019.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
