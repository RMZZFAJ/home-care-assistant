# CON-02 — Registrar informação operacional

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Novo relato de falta/consumo; linhas estruturadas quando disponíveis, sem
confirmação de débito.

Finalidade: Registrar informação operacional.

Relator autorizado ao paciente/custódia; texto não concede poder de confirmar.

AS_IS/rota: Novo relato, atual a preservar/ampliar.

## 4–14. Campos, modos de interação e validação

Contexto e unidade. Nenhuma inferência automática de quantidade ou débito a
partir de texto livre.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-095-01 — Tipo

**Modo/componente:** EDITABLE / RADIO_GROUP.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sim, escolha explícita.

**Máscara/apresentação:** Grupo de opções finitas com legenda; sem opção
material preaceita. Autocomplete: off.

**Validação:** Falta nunca gera débito de consumo; Somente no subestado de
preparação autorizado indicado na ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** “Quero registrar uma informação para conferência.”

**Mensagem e condição:** “Escolha uma opção válida para tipo no escopo desta
tarefa. Se a opção necessária não estiver disponível, volte ou procure a
administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-096-01 — Custódia

**Modo/componente:** EDITABLE / SEARCHABLE_COMBOBOX.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sim.

**Máscara/apresentação:** Busca por nome/alias e seleção de resultado
autorizado; nenhum identificador técnico digitado. Autocomplete: off.

**Validação:** Não permite consultar saldo familiar geral à equipe; Somente no
subestado de preparação autorizado indicado na ficha; resumo/decisão posterior
é leitura.

**Ajuda/exemplo:** “Onde ocorreu?”

**Mensagem e condição:** “Escolha uma opção válida para custódia no escopo
desta tarefa. Se a opção necessária não estiver disponível, volte ou procure a
administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-097-01 — Relato original

**Modo/componente:** EDITABLE / TEXTAREA.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sim, vazio.

**Máscara/apresentação:** Texto com quebras de linha; limite e contador do
campo visíveis, sem máscara de seleção. Autocomplete: off.

**Validação:** 3–2000 caracteres; Somente no subestado de preparação
autorizado indicado na ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** “Foi usada uma unidade do material X.”

**Mensagem e condição:** “Confira relato original e o limite indicado. Corrija
somente esta informação; os demais valores preenchidos foram preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-098-01 — Material

**Modo/componente:** EDITABLE / SEARCHABLE_COMBOBOX.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Obrigatório para confirmar consumo.

**Máscara/apresentação:** Busca por nome/alias e seleção de resultado
autorizado; nenhum identificador técnico digitado. Autocomplete: off.

**Validação:** Mesmo paciente, elegibilidade e unidade; Somente no subestado
de preparação autorizado indicado na ficha; resumo/decisão posterior é
leitura.

**Ajuda/exemplo:** Não interpretar nome livre como correspondência certa.

**Mensagem e condição:** “Escolha uma opção válida para material no escopo
desta tarefa. Se a opção necessária não estiver disponível, volte ou procure a
administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-099-01 — Quantidade

**Modo/componente:** EDITABLE / DECIMAL_TEXT_INPUT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Obrigatória em linha estruturada de consumo.

**Máscara/apresentação:** Quantidade textual exata com unidade; vírgula/ponto,
inputmode decimal e precisão explícita antes da coerção. Autocomplete: off.

**Validação:** Positiva/exata, precisão vigente antes de coerção; Somente no
subestado de preparação autorizado indicado na ficha; resumo/decisão posterior
é leitura.

**Ajuda/exemplo:** “1 unidade.”

**Mensagem e condição:** “Informe quantidade na unidade indicada e com a
precisão permitida. O campo precisa de correção antes de confirmar.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

## 15–18. Hierarquia, ações, consequências e mensagens

Tipo → custódia → descrição do fato → material/quantidade se conhecidos →
revisão de autoria → registrar relato.

Original/contexto acima; texto do novo ato separado de linhas estruturadas e
resumo do efeito antes de salvar.

Primária: **Registrar relato**. Secundárias: Salvar rascunho; Voltar.

Efeito: Nenhum débito antes de confirmação competente.

Sucesso/resultado: “Relato registrado para conferência. Nenhum material foi
descontado.”

Vazio/inelegível: “Descreva o fato que precisa registrar. Se ainda não souber
a quantidade, não invente um valor.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Informação indisponível não recebe valor inventado; bloquear somente ação que
depende dela, preservando consultas e encaminhamentos autorizados.

Relato sem estrutura pode receber complemento posterior; conservar texto se
envio falha e recuperar mesma intenção quando incerto.

Leitura falha repete consulta da seção. Escrita incerta consulta a mesma
intenção antes de novo comando. Recusa comprovada, confirmado, conflito e
incerto têm resultados distintos; nenhuma mensagem presume que nada ocorreu.

Voltar conserva contexto/edição permitidos e devolve foco ao acionador. Depois
de resultado confirmado, abrir o alvo/resultado existente, sem repetir o ato.

## 21–24. Móvel, acessibilidade, referência e negócio

Texto e materiais em uma coluna; campos de quantidade por linha com unidade;
original recolhível continua rotulado.

Autor original e autor do novo ato distinguíveis por texto; resumo de erro
acessível; confirmação não infere consumo do texto.

Identidade aprovada: teal/papel claro, tipografia hierárquica, bordas suaves,
cards e barra de contexto. Prioridade da tarefa e regras de autorização
governam o layout; exemplos do protótipo não são controles obrigatórios.

Referência do protótipo: SEM_EQUIVALENTE_NO_HTML. Sem captura real ou aceite
humano de interface futura nesta C.

EVOLUIR relato e reconstruir estados para permitir complemento sem débito
automático.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-020;C-AC-035;C-AC-047;C-AC-050;C-AC-055;C-AC-059;C-AC-065;C-AC-089;C-AC-091;C-AC-095;C-AC-096;C-NEW-AC-010;C-NEW-AC-016;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
