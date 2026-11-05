# REQ-01 — Selecionar materiais

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Criação privada; seleção/contexto antes da revisão. Nenhuma REQ emitida nesta
etapa.

Finalidade: Selecionar materiais.

Pessoa com capacidade de requisitar no paciente; catálogo autorizado. Nunca
pedir quantidade a comprar.

AS_IS/rota: /fichas/req, atual a alterar.

## 4–14. Campos, modos de interação e validação

Paciente e unidade; saldo calculado separado da declaração e somente quando
autorizado. Observação não vem do saldo nem da lista frequente.

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

**Modo/componente:** EDITABLE / SEARCHABLE_COMBOBOX.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Ao menos um material ou extra; vazio.

**Máscara/apresentação:** Busca por nome/alias e seleção de resultado
autorizado; nenhum identificador técnico digitado. Autocomplete: off.

**Validação:** IDs únicos, até 1000 linhas herdadas; alias busca; Somente no
subestado de preparação autorizado indicado na ficha; resumo/decisão posterior
é leitura.

**Ajuda/exemplo:** “Escolha os materiais de que precisa.”

**Mensagem e condição:** “Escolha uma opção válida para materiais no escopo
desta tarefa. Se a opção necessária não estiver disponível, volte ou procure a
administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-003-01 — Estoque observado

**Modo/componente:** EDITABLE / DECIMAL_TEXT_INPUT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Não, vazio.

**Máscara/apresentação:** Quantidade textual exata com unidade; vírgula/ponto,
inputmode decimal e precisão explícita antes da coerção. Autocomplete: off.

**Validação:** 0–100000, precisão da unidade até seis casas; valor original
exato; Somente no subestado de preparação autorizado indicado na ficha;
resumo/decisão posterior é leitura.

**Ajuda/exemplo:** “Quanto você contou agora? Ex.: 0 ou 1,5.”

**Mensagem e condição:** “Informe estoque observado na unidade indicada e com
a precisão permitida. O campo precisa de correção antes de confirmar.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-004-01 — Não sei informar

**Modo/componente:** EDITABLE / CHECKBOX_OR_SWITCH.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Não, desmarcado.

**Máscara/apresentação:** Escolha booleana com rótulo de efeito; vazio não
equivale a concordância. Autocomplete: off.

**Validação:** Exclusivo com valor observado; não altera ledger; Somente no
subestado de preparação autorizado indicado na ficha; resumo/decisão posterior
é leitura.

**Ajuda/exemplo:** “Use quando não puder contar.”

**Mensagem e condição:** “Escolha uma opção válida para não sei informar no
escopo desta tarefa. Se a opção necessária não estiver disponível, volte ou
procure a administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-005-01 — Urgente

**Modo/componente:** EDITABLE / CHECKBOX_OR_SWITCH.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sim como boolean, false.

**Máscara/apresentação:** Escolha booleana com rótulo de efeito; vazio não
equivale a concordância. Autocomplete: off.

**Validação:** Não inferir por saldo mínimo; Somente no subestado de
preparação autorizado indicado na ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** “Precisa de atenção mais rápida.”

**Mensagem e condição:** “Escolha uma opção válida para urgente no escopo
desta tarefa. Se a opção necessária não estiver disponível, volte ou procure a
administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-006-01 — Justificativa de repetição

**Modo/componente:** EDITABLE / TEXTAREA.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Condicional se necessidade anterior pendente;
vazio.

**Máscara/apresentação:** Texto com quebras de linha; limite e contador do
campo visíveis, sem máscara de seleção. Autocomplete: off.

**Validação:** 3–1000 caracteres, preserva vínculo anterior; Somente no
subestado de preparação autorizado indicado na ficha; resumo/decisão posterior
é leitura.

**Ajuda/exemplo:** “Ainda precisamos do material após atendimento parcial.”

**Mensagem e condição:** “Confira justificativa de repetição e o limite
indicado. Corrija somente esta informação; os demais valores preenchidos foram
preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-007-01 — Item extra

**Modo/componente:** EDITABLE / TEXT_INPUT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Nome se extra adicionado; vazio.

**Máscara/apresentação:** Texto legível sem máscara artificial;
contador/limite específico junto ao campo. Autocomplete: off.

**Validação:** 1–200 caracteres, até 20 extras, identidade própria; Somente no
subestado de preparação autorizado indicado na ficha; resumo/decisão posterior
é leitura.

**Ajuda/exemplo:** “Material não encontrado no catálogo.”

**Mensagem e condição:** “Confira item extra e o limite indicado. Corrija
somente esta informação; os demais valores preenchidos foram preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-008-01 — Observação e urgência do item extra

**Modo/componente:** EDITABLE / EXTRA_ITEM_CONTEXT_GROUP.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Conforme linha extra.

**Máscara/apresentação:** Observação textual e urgência booleana separadas e
rotuladas por item extra; nenhum aceite preselecionado. Autocomplete: off.

**Validação:** Reusar os três modos de observação e a urgência por extra; nome
preservado; não cria produto ou quantidade solicitada; Somente no subestado de
preparação autorizado indicado na ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** No item não encontrado, informe só o que observou agora;
Não sei informar continua sendo uma escolha própria.

**Mensagem e condição:** “Confira observação e urgência do item extra e o
limite indicado. Corrija somente esta informação; os demais valores
preenchidos foram preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-009-01 — Observações gerais

**Modo/componente:** EDITABLE / TEXTAREA.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Não, lista vazia.

**Máscara/apresentação:** Texto com quebras de linha; limite e contador do
campo visíveis, sem máscara de seleção. Autocomplete: off.

**Validação:** Até 50 entradas de 1–1000 caracteres; Somente no subestado de
preparação autorizado indicado na ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** “Embalagem encontrada aberta”, sem dado clínico
desnecessário.

**Mensagem e condição:** “Confira observações gerais e o limite indicado.
Corrija somente esta informação; os demais valores preenchidos foram
preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

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

Paciente fixo → busca de materiais → observação atual/Não sei
informar/urgência por item → extras e contexto → revisão.

Conteúdo em até duas colunas: editor principal flexível e ajuda lateral de
cerca de um terço; etapas no topo e resumo de itens antes do rodapé.

Primária: **Continuar: revisar**. Secundárias: Salvar rascunho; Usar lista
frequente; Voltar.

Efeito: Avançar não emite nem altera estoque.

Sucesso/resultado: “Preenchimento pronto para revisão. A requisição ainda não
foi emitida.”

Vazio/inelegível: “Nenhum material selecionado. Busque um material ou adicione
um item não encontrado.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Informação indisponível não recebe valor inventado; bloquear somente ação que
depende dela, preservando consultas e encaminhamentos autorizados.

Falha na busca preserva itens já escolhidos; repetir só a busca. Falha de save
mantém edição marcada como ainda não salva.

Leitura falha repete consulta da seção. Escrita incerta consulta a mesma
intenção antes de novo comando. Recusa comprovada, confirmado, conflito e
incerto têm resultados distintos; nenhuma mensagem presume que nada ocorreu.

Voltar conserva contexto/edição permitidos e devolve foco ao acionador. Depois
de resultado confirmado, abrir o alvo/resultado existente, sem repetir o ato.

## 21–24. Móvel, acessibilidade, referência e negócio

Uma coluna; cada material vira cartão com nome/unidade antes da quantidade;
contexto antes da ação. Não esconder quantidade em tabela horizontal.

Inserir item move foco ao campo da nova linha; remover devolve à linha
vizinha; etapas preservam valores e ordem de leitura.

Identidade aprovada: teal/papel claro, tipografia hierárquica, bordas suaves,
cards e barra de contexto. Prioridade da tarefa e regras de autorização
governam o layout; exemplos do protótipo não são controles obrigatórios.

Referência do protótipo: req. Sem captura real ou aceite humano de interface
futura nesta C.

EVOLUIR: manter busca/etapas; reconstruir editor de observação e recuperação
se impedir os três modos.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-025;C-AC-026;C-AC-036;C-AC-041;C-AC-049;C-AC-073;C-AC-089;C-AC-105;C-NEW-AC-003;C-NEW-AC-004;C-NEW-AC-024;C-NEW-AC-028;C7-AC-012;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
