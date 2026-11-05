# ENT-05 — Resolver pedido de cancelamento

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Pedido vigente de cancelamento; solicitar, consentir, recusar e retirar têm
subestados e autoridades distintos.

Finalidade: Resolver pedido de cancelamento.

Solicitante retira seu pedido; recebedor/contraparte competente consente ou
recusa. Versão e fatos correntes são revalidados.

AS_IS/rota: Cancelamento/retirada/recusa, atual e novas ações.

## 4–14. Campos, modos de interação e validação

Expedido, já aceito, consumo já confirmado e pedido original. Consumo
existente é referência calculada, jamais input de novo débito.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-039-01 — Motivo do cancelamento

**Modo/componente:** EDITABLE_SUBFORM / TEXTAREA.

**Quando/ator:** Só SOLICITAR; ao decidir pedido existente o motivo original é
READ_ONLY.

**Obrigatoriedade/inicial:** Sim, vazio.

**Máscara/apresentação:** Texto com quebras de linha; limite e contador do
campo visíveis, sem máscara de seleção. Autocomplete: off.

**Validação:** 3–1000 e versão atual; Só SOLICITAR; ao decidir pedido
existente o motivo original é READ_ONLY.

**Ajuda/exemplo:** “Solicitar cancelamento”, não “Cancelar tudo” após aceite.

**Mensagem e condição:** “Confira motivo do cancelamento e o limite indicado.
Corrija somente esta informação; os demais valores preenchidos foram
preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-040-01 — Devolvido

**Modo/componente:** EDITABLE_SUBFORM / DECIMAL_TEXT_INPUT.

**Quando/ator:** Só consentimento que declara devolução física; limitado pelo
remanescente conciliável.

**Obrigatoriedade/inicial:** Sim no consentimento aplicável.

**Máscara/apresentação:** Quantidade textual exata com unidade; vírgula/ponto,
inputmode decimal e precisão explícita antes da coerção. Autocomplete: off.

**Validação:** Compatíveis com aceites e consumo já confirmado; Só
consentimento que declara devolução física; limitado pelo remanescente
conciliável.

**Ajuda/exemplo:** Consumido antes não é debitado outra vez.

**Mensagem e condição:** “Informe devolvido na unidade indicada e com a
precisão permitida. O campo precisa de correção antes de confirmar.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-040-02 — Consumo já confirmado

**Modo/componente:** CALCULATED / QUANTITY_WITH_REFERENCE.

**Quando/ator:** Consumo já confirmado com referência; nunca nova quantidade
debitável.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Quantidade/unidade e referência do consumo já
confirmado. Autocomplete: NÃO APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Consumo já confirmado
com referência; nunca nova quantidade debitável.

**Ajuda/exemplo:** Resultado calculado a partir dos fatos desta tarefa,
apresentado para conferência. Ele não pode ser digitado ou corrigido aqui.

**Mensagem e condição:** “Não foi possível carregar a informação “Consumo já
confirmado”. Atualize esta seção. O dado registrado não pode ser alterado
aqui.” — SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-041-01 — Motivo de retirada/recusa

**Modo/componente:** EDITABLE_SUBFORM / TEXTAREA.

**Quando/ator:** Só recusa do recebedor/retirada do solicitante em pedido
vigente.

**Obrigatoriedade/inicial:** Sim na nova ação.

**Máscara/apresentação:** Texto com quebras de linha; limite e contador do
campo visíveis, sem máscara de seleção. Autocomplete: off.

**Validação:** 3–1000; vínculo à solicitação vigente; Só recusa do
recebedor/retirada do solicitante em pedido vigente.

**Ajuda/exemplo:** “Discordo: estes materiais permanecem recebidos.”

**Mensagem e condição:** “Confira motivo de retirada/recusa e o limite
indicado. Corrija somente esta informação; os demais valores preenchidos foram
preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

## 15–18. Hierarquia, ações, consequências e mensagens

Pedido/autor/motivo → quantidades/fatos já confirmados → devolução física
declarada quando cabível → antes/depois → ação específica.

Comparação Atual/Proposto lado a lado com mesmas linhas, autor/motivo/alcance
acima e consequências antes das ações.

Primária: **Consentir com conciliação**. Secundárias: Recusar pedido; Retirar
meu pedido; Voltar.

Efeito: Só fato conciliado altera saldo; pedido/recusa/retirada não estornam.

Sucesso/resultado: “Decisão sobre o pedido registrada. Confira o resultado:
pedir, recusar ou retirar não estorna material por si só.”

Vazio/inelegível: “Não existe pedido de cancelamento vigente para esta ação.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Consentimento depende dos fatos de aceite/consumo/devolução correntes.
Ausência não vira zero; recusa/retirada seguem apenas o comando próprio
elegível, sem estorno presumido.

Decisão oposta posterior conflita e exibe a primeira; mesma decisão recupera.
Conciliação não reutiliza consumo anterior como novo débito.

Leitura falha repete consulta da seção. Escrita incerta consulta a mesma
intenção antes de novo comando. Recusa comprovada, confirmado, conflito e
incerto têm resultados distintos; nenhuma mensagem presume que nada ocorreu.

Voltar conserva contexto/edição permitidos e devolve foco ao acionador. Depois
de resultado confirmado, abrir o alvo/resultado existente, sem repetir o ato.

## 21–24. Móvel, acessibilidade, referência e negócio

Empilhar Atual e Proposto por atributo, preservando rótulos; motivo da decisão
abaixo da comparação, ações sem sobreposição.

Cabeçalhos e diferenças em texto; não depender de cor; proposta em leitura não
recebe validação de input; confirmação mantém a versão revista.

Identidade aprovada: teal/papel claro, tipografia hierárquica, bordas suaves,
cards e barra de contexto. Prioridade da tarefa e regras de autorização
governam o layout; exemplos do protótipo não são controles obrigatórios.

Referência do protótipo: ent. Sem captura real ou aceite humano de interface
futura nesta C.

RECONSTRUIR por ação/ator; retirar o consumo confirmado do formulário
editável.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-010;C-AC-021;C-AC-028;C-AC-042;C-AC-043;C-AC-044;C-AC-048;C-AC-050;C-AC-074;C-AC-077;C-AC-079;C-AC-089;C-AC-096;C-AC-101;C-AC-103;C-AC-105;C-NEW-AC-006;C-NEW-AC-007;C-NEW-AC-009;C-NEW-AC-015;C-NEW-AC-016;C-NEW-AC-022;C-NEW-AC-028;C7-AC-002;C7-AC-010;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025;C-FINAL-AC-015.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
