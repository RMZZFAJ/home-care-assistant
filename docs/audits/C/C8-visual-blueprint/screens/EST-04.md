# EST-04 — Transferir ou devolver material

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Preparação de transferência física/devolução; concordância e aceite pessoal
são etapas próprias.

Finalidade: Transferir ou devolver material.

Iniciador autorizado à origem, contraparte legítima e recebedor elegível; P07
condiciona substituição da UI antiga.

AS_IS/rota: Transferência simples, novo painel.

## 4–14. Campos, modos de interação e validação

Saldo de origem e efeitos previstos; nenhuma quantidade é creditada ao destino
ao salvar solicitação.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-071-01 — Material

**Modo/componente:** EDITABLE / SEARCHABLE_COMBOBOX.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sim ao movimentar.

**Máscara/apresentação:** Busca por nome/alias e seleção de resultado
autorizado; nenhum identificador técnico digitado. Autocomplete: off.

**Validação:** Ativo para nova operação normal; inativo tem caminho
específico; Somente no subestado de preparação autorizado indicado na ficha;
resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Unidade e precisão visíveis.

**Mensagem e condição:** “Escolha uma opção válida para material no escopo
desta tarefa. Se a opção necessária não estiver disponível, volte ou procure a
administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-073-01 — Quantidade

**Modo/componente:** EDITABLE / DECIMAL_TEXT_INPUT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sim, vazio.

**Máscara/apresentação:** Quantidade textual exata com unidade; vírgula/ponto,
inputmode decimal e precisão explícita antes da coerção. Autocomplete: off.

**Validação:** Positiva, finita, até 1 bilhão, até 6 casas e precisão do
produto antes de coerção; Somente no subestado de preparação autorizado
indicado na ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** 1,5 aceita apenas em unidade fracionável.

**Mensagem e condição:** “Informe quantidade na unidade indicada e com a
precisão permitida. O campo precisa de correção antes de confirmar.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-075-01 — Motivo

**Modo/componente:** EDITABLE / TEXTAREA.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sim.

**Máscara/apresentação:** Texto com quebras de linha; limite e contador do
campo visíveis, sem máscara de seleção. Autocomplete: off.

**Validação:** 3–1000 caracteres; Somente no subestado de preparação
autorizado indicado na ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** “Entrada registrada em quantidade maior que a conferida.”

**Mensagem e condição:** “Confira motivo e o limite indicado. Corrija somente
esta informação; os demais valores preenchidos foram preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-078-01 — Origem

**Modo/componente:** EDITABLE / SEARCHABLE_COMBOBOX.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sim no novo painel.

**Máscara/apresentação:** Busca por nome/alias e seleção de resultado
autorizado; nenhum identificador técnico digitado. Autocomplete: off.

**Validação:** Autorização, saldo e P07; Somente no subestado de preparação
autorizado indicado na ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Sem edição direta das duas colunas de saldo.

**Mensagem e condição:** “Escolha uma opção válida para origem no escopo desta
tarefa. Se a opção necessária não estiver disponível, volte ou procure a
administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-078-02 — Destino

**Modo/componente:** EDITABLE / SEARCHABLE_COMBOBOX.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sim no novo painel.

**Máscara/apresentação:** Busca por nome/alias e seleção de resultado
autorizado; nenhum identificador técnico digitado. Autocomplete: off.

**Validação:** Autorização, saldo e P07; Somente no subestado de preparação
autorizado indicado na ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Sem edição direta das duas colunas de saldo.

**Mensagem e condição:** “Escolha uma opção válida para destino no escopo
desta tarefa. Se a opção necessária não estiver disponível, volte ou procure a
administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-079-01 — Contraparte

**Modo/componente:** EDITABLE / SEARCHABLE_COMBOBOX.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sim conforme P07.

**Máscara/apresentação:** Busca por nome/alias e seleção de resultado
autorizado; nenhum identificador técnico digitado. Autocomplete: off.

**Validação:** Pessoa competente na contraparte; concordância não substitui
aceite pessoal do recebedor real; Somente no subestado de preparação
autorizado indicado na ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Identificar quem declara, valida e recebe.

**Mensagem e condição:** “Escolha uma opção válida para contraparte no escopo
desta tarefa. Se a opção necessária não estiver disponível, volte ou procure a
administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-079-02 — Recebedor físico

**Modo/componente:** EDITABLE / SEARCHABLE_COMBOBOX.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sim conforme P07.

**Máscara/apresentação:** Busca por nome/alias e seleção de resultado
autorizado; nenhum identificador técnico digitado. Autocomplete: off.

**Validação:** Contrassinatura distinta de aceite físico se pessoas
diferentes; Somente no subestado de preparação autorizado indicado na ficha;
resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Identificar quem declara, valida e recebe.

**Mensagem e condição:** “Escolha uma opção válida para recebedor físico no
escopo desta tarefa. Se a opção necessária não estiver disponível, volte ou
procure a administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

## 15–18. Hierarquia, ações, consequências e mensagens

Origem/destino → material/unidade/quantidade → contraparte/recebedor → motivo
→ resumo de custódias → solicitar/expedir conforme etapa.

Campos da intenção em uma área e prévia de custódia/quantidade ao lado; motivo
e referência antes da revisão final.

Primária: **Solicitar transferência**. Secundárias: Voltar; Ver saldo da
origem.

Efeito: Solicitação não simula recebimento; usa ENT/custódia.

Sucesso/resultado: “Transferência encaminhada para a próxima etapa indicada. O
destino só recebe crédito após o aceite pessoal pertinente.”

Vazio/inelegível: “Nenhuma transferência preparada. Escolha origem e destino
distintos e um material físico.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Informação indisponível não recebe valor inventado; bloquear somente ação que
depende dela, preservando consultas e encaminhamentos autorizados.

Falha mantém custódia atual; não criar compensação para simular transporte.
Enquanto equivalência P07 não for provada, preservar caminho antigo
autorizado.

Leitura falha repete consulta da seção. Escrita incerta consulta a mesma
intenção antes de novo comando. Recusa comprovada, confirmado, conflito e
incerto têm resultados distintos; nenhuma mensagem presume que nada ocorreu.

Voltar conserva contexto/edição permitidos e devolve foco ao acionador. Depois
de resultado confirmado, abrir o alvo/resultado existente, sem repetir o ato.

## 21–24. Móvel, acessibilidade, referência e negócio

Uma coluna com contexto e valores antes/depois próximos; unidade permanece
visível com teclado aberto.

Resumo de erro aponta só inputs editáveis; confirmação anuncia origem/destino
e efeito sem usar sinal negativo como rótulo.

Identidade aprovada: teal/papel claro, tipografia hierárquica, bordas suaves,
cards e barra de contexto. Prioridade da tarefa e regras de autorização
governam o layout; exemplos do protótipo não são controles obrigatórios.

Referência do protótipo: stock/transfer. Sem captura real ou aceite humano de
interface futura nesta C.

NOVA UI CONDICIONADA: demonstrar equivalência de fatos e ledger antes de
retirar devolução antiga.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-010;C-AC-021;C-AC-022;C-AC-045;C-AC-046;C-AC-053;C-AC-066;C-AC-068;C-AC-072;C-AC-074;C-AC-120;C-NEW-AC-008;C-NEW-AC-009;C-NEW-AC-015;C-NEW-AC-023;C-NEW-AC-025;C7-AC-010;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
