# COM-03 — Conferir parcela recebida

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Lista de parcelas; nova chegada declarada e decisão de uma parcela existente
são subestados separados.

Finalidade: Conferir parcela recebida.

Declarador de chegada informa nova parcela; validador autorizado decide
parcela exata/versão. A decisão não reescreve a quantidade declarada.

AS_IS/rota: Parcelas no detalhe, atual a alterar.

## 4–14. Campos, modos de interação e validação

Na decisão: parcela, autor, unidade e quantidade recebida declarada.
Quantidade só é input no subestado Nova chegada, inicialmente vazio.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-020-01 — Recebido nesta parcela

**Modo/componente:** EDITABLE_SUBFORM /
DECIMAL_TEXT_INPUT_OR_READ_ONLY_QUANTITY.

**Quando/ator:** Só NOVA_CHEGADA; na decisão VALIDAR/REJEITAR é READ_ONLY, sem
correção da declaração.

**Obrigatoriedade/inicial:** Sim ao informar chegada, vazio.

**Máscara/apresentação:** Quantidade exata com unidade e precisão no registro
da parcela; na decisão, apresentar somente leitura. Autocomplete: off.

**Validação:** Quantidade física desta parcela, sem preencher o restante
automaticamente; Só NOVA_CHEGADA; na decisão VALIDAR/REJEITAR é READ_ONLY, sem
correção da declaração.

**Ajuda/exemplo:** “Chegaram 2 unidades agora.”

**Mensagem e condição:** “Informe recebido nesta parcela na unidade indicada e
com a precisão permitida. O campo precisa de correção antes de confirmar.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-021-01 — Parcela e autor

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Consulta do valor de origem; mudanças só no processo
legitimamente responsável.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Nome da pessoa e papel no ato, conforme registro
histórico; sem token ou ID de sessão. Autocomplete: NÃO APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Consulta do valor de
origem; mudanças só no processo legitimamente responsável.

**Ajuda/exemplo:** Identifica a pessoa relacionada a este ato; não permite
transferir sua autoria para quem consulta.

**Mensagem e condição:** “Não foi possível carregar a informação “Parcela e
autor”. Atualize esta seção. O dado registrado não pode ser alterado aqui.” —
SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-022-01 — Validado/rejeitado

**Modo/componente:** EXPLICIT_ACTION / DECISION_BUTTONS.

**Quando/ator:** Parcela pendente/versão atual; dois botões com consequência
própria.

**Obrigatoriedade/inicial:** Sem concordância material inicial ou clique
automático.

**Máscara/apresentação:** Botão/ação com nome de consequência; sem campo
textual de aceite. Autocomplete: NÃO APLICÁVEL.

**Validação:** Boolean não nulo; capability/política aplicáveis; Parcela
pendente/versão atual; dois botões com consequência própria.

**Ajuda/exemplo:** Validar gera crédito; rejeitar não apaga a declaração.

**Mensagem e condição:** “Esta ação não está disponível no estado atual.
Consulte o resultado ou volte à tarefa; nenhuma confirmação será presumida.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Botão com verbo/alvo/efeito; confirmação por
teclado/touch; foco retorna ao resumo, sem aria-invalid em texto de leitura.

### CTRL-023-01 — Motivo de rejeição

**Modo/componente:** EDITABLE / TEXTAREA.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sim na rejeição.

**Máscara/apresentação:** Texto com quebras de linha; limite e contador do
campo visíveis, sem máscara de seleção. Autocomplete: off.

**Validação:** 3–1000 caracteres; Somente no subestado de preparação
autorizado indicado na ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** “Quantidade declarada ainda não conferida.”

**Mensagem e condição:** “Confira motivo de rejeição e o limite indicado.
Corrija somente esta informação; os demais valores preenchidos foram
preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

## 15–18. Hierarquia, ações, consequências e mensagens

Parcelas/estado → selecionar parcela → autor/instante/linhas em leitura →
validar ou rejeitar com motivo; Nova chegada abre formulário próprio.

Colunas com títulos estáveis para cada etapa e unidade em todas as linhas;
detalhe/ação da etapa selecionada ao lado ou abaixo.

Primária: **Validar a parcela exibida**. Secundárias: Rejeitar com motivo;
Informar nova chegada.

Efeito: Crédito exato uma vez ao validar a parcela.

Sucesso/resultado: “Decisão desta parcela registrada. Somente a parcela
validada acrescenta a quantidade correspondente ao estoque familiar.”

Vazio/inelegível: “Nenhuma chegada foi informada para esta aquisição. Registre
uma nova chegada quando houver material físico.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Sem parcela exata, versão e quantidade/unidade declaradas, não validar
chegada. Nova chegada é outro estado; não reparar dado ausente editando a
prova durante a decisão.

Se já validada, mostrar a decisão existente e seu movimento; não pedir nova
validação. Resposta perdida recupera a mesma parcela/decisão.

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

RECONSTRUIR estados de chegada/decisão para impedir alteração da prova ao
validá-la.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-015;C-AC-028;C-AC-035;C-AC-044;C-AC-058;C-AC-074;C-AC-077;C-AC-089;C-AC-109;C-NEW-AC-005;C-NEW-AC-022;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025;C-FINAL-AC-014.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
