# BAL-01 — Organizar contagens por plantão

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Consulta de obrigações/atribuições; configuração e pedido de adiamento em
painéis próprios.

Finalidade: Organizar contagens por plantão.

Designado consulta sua tarefa; configuração e decisão por capacidade familiar
pertinente. Não converter revisão facultativa em fila obrigatória.

AS_IS/rota: /balancos, atual a alterar.

## 4–14. Campos, modos de interação e validação

Atribuição, janela, prazo vigente e histórico. Proposta pendente não muda
prazo ou gera contagem.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-043-01 — Habilitar regime

**Modo/componente:** EDITABLE_SUBFORM / SWITCH_WITH_LABEL.

**Quando/ator:** Configuração familiar autorizada; designado consulta valor em
leitura.

**Obrigatoriedade/inicial:** Sim na configuração, preserva atual.

**Máscara/apresentação:** Estado Ativado/Pausado com rótulo e consequência;
mudar exige confirmação autorizada. Autocomplete: off.

**Validação:** Não habilitar por migration; Configuração familiar autorizada;
designado consulta valor em leitura.

**Ajuda/exemplo:** “Processar BAL por plantão neste paciente.”

**Mensagem e condição:** “Escolha uma opção válida para habilitar regime no
escopo desta tarefa. Se a opção necessária não estiver disponível, volte ou
procure a administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-044-01 — Fuso

**Modo/componente:** EDITABLE_SUBFORM / SEARCHABLE_TIMEZONE.

**Quando/ator:** Configuração de novo regime; consulta da obrigação não edita
fuso.

**Obrigatoriedade/inicial:** Sim, sem inferência pelo navegador.

**Máscara/apresentação:** Nome da zona IANA, por exemplo America/Sao_Paulo;
offset do período quando relevante. Autocomplete: off.

**Validação:** Fuso válido, weekday 0–6, tipo ativo, versão; Configuração de
novo regime; consulta da obrigação não edita fuso.

**Ajuda/exemplo:** Mostrar prazo local e intervalo com data de fim.

**Mensagem e condição:** “Escolha o fuso de referência da tarefa. O fuso do
aparelho não será adotado silenciosamente.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-044-02 — Dia da semana

**Modo/componente:** EDITABLE_SUBFORM / WEEKDAY_SELECT.

**Quando/ator:** Configuração do regime.

**Obrigatoriedade/inicial:** Sim, sem inferência pelo navegador.

**Máscara/apresentação:** Seleção de dia da semana por nome; sem exigir número
de enum interno. Autocomplete: off.

**Validação:** Fuso válido, weekday 0–6, tipo ativo, versão; Configuração do
regime.

**Ajuda/exemplo:** Mostrar prazo local e intervalo com data de fim.

**Mensagem e condição:** “Escolha uma opção válida para dia da semana no
escopo desta tarefa. Se a opção necessária não estiver disponível, volte ou
procure a administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-044-03 — Tipo de plantão

**Modo/componente:** EDITABLE_SUBFORM / SHIFT_TYPE_SELECT.

**Quando/ator:** Configuração do regime.

**Obrigatoriedade/inicial:** Sim, sem inferência pelo navegador.

**Máscara/apresentação:** Tipos de plantão autorizados com nome, início e
duração; código interno não é rótulo. Autocomplete: off.

**Validação:** Fuso válido, weekday 0–6, tipo ativo, versão; Configuração do
regime.

**Ajuda/exemplo:** Mostrar prazo local e intervalo com data de fim.

**Mensagem e condição:** “Escolha uma opção válida para tipo de plantão no
escopo desta tarefa. Se a opção necessária não estiver disponível, volte ou
procure a administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-045-01 — Início do regime

**Modo/componente:** EDITABLE_SUBFORM / DATE_INPUT.

**Quando/ator:** Configuração do regime.

**Obrigatoriedade/inicial:** Sim, escolha explícita.

**Máscara/apresentação:** Data DD/MM/AAAA na apresentação, sem conversão
silenciosa de fuso; limites do período visíveis. Autocomplete: off.

**Validação:** Sem gerar contagem física retroativa; Configuração do regime.

**Ajuda/exemplo:** “A partir de 05/11/2026.”

**Mensagem e condição:** “Confira a data e o período desta tarefa. A data
final deve respeitar o início e o alcance apresentados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-046-01 — Profissional preferido

**Modo/componente:** EDITABLE_SUBFORM / PERSON_COMBOBOX.

**Quando/ator:** Preferência de atribuição; nunca comprovação de presença.

**Obrigatoriedade/inicial:** Não, política atual.

**Máscara/apresentação:** Nome da pessoa e vínculo habilitado; escolha
explícita sem atribuir consentimento ou ciência alheios. Autocomplete: off.

**Validação:** Vínculo elegível; não garante presença; Preferência de
atribuição; nunca comprovação de presença.

**Ajuda/exemplo:** Ambiguidade pede designação, não escolha arbitrária.

**Mensagem e condição:** “Escolha uma opção válida para profissional preferido
no escopo desta tarefa. Se a opção necessária não estiver disponível, volte ou
procure a administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-050-01 — Atribuição

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Consulta do valor de origem; mudanças só no processo
legitimamente responsável.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Descrição rotulada do registro específico, sem
input, identificador de transporte ou valor inventado. Autocomplete: NÃO
APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Consulta do valor de
origem; mudanças só no processo legitimamente responsável.

**Ajuda/exemplo:** Informação do registro indicado, somente para consulta
nesta etapa. Ausência de dado histórico permanece explicitamente identificada.

**Mensagem e condição:** “Não foi possível carregar a informação “Atribuição”.
Atualize esta seção. O dado registrado não pode ser alterado aqui.” —
SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-050-02 — Início da janela

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Consulta do valor de origem; mudanças só no processo
legitimamente responsável.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Data/hora local com rótulo do fato e fuso;
desconhecido explícito. Autocomplete: NÃO APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Consulta do valor de
origem; mudanças só no processo legitimamente responsável.

**Ajuda/exemplo:** A data pertence ao fato identificado. Data de registro e de
emissão são mostradas separadamente quando forem diferentes.

**Mensagem e condição:** “Não foi possível carregar a informação “Início da
janela”. Atualize esta seção. O dado registrado não pode ser alterado aqui.” —
SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-050-03 — Fim da janela

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Consulta do valor de origem; mudanças só no processo
legitimamente responsável.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Data/hora local com rótulo do fato e fuso;
desconhecido explícito. Autocomplete: NÃO APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Consulta do valor de
origem; mudanças só no processo legitimamente responsável.

**Ajuda/exemplo:** A data pertence ao fato identificado. Data de registro e de
emissão são mostradas separadamente quando forem diferentes.

**Mensagem e condição:** “Não foi possível carregar a informação “Fim da
janela”. Atualize esta seção. O dado registrado não pode ser alterado aqui.” —
SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-050-04 — Versão da atribuição

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Consulta do valor de origem; mudanças só no processo
legitimamente responsável.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Descrição rotulada do registro específico, sem
input, identificador de transporte ou valor inventado. Autocomplete: NÃO
APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Consulta do valor de
origem; mudanças só no processo legitimamente responsável.

**Ajuda/exemplo:** Informação do registro indicado, somente para consulta
nesta etapa. Ausência de dado histórico permanece explicitamente identificada.

**Mensagem e condição:** “Não foi possível carregar a informação “Versão da
atribuição”. Atualize esta seção. O dado registrado não pode ser alterado
aqui.” — SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-055-01 — Motivo da decisão

**Modo/componente:** EDITABLE_SUBFORM / TEXTAREA.

**Quando/ator:** Somente comando autorizado de configuração/adiamento; não
aparece como nota na consulta.

**Obrigatoriedade/inicial:** Sim em adiamento/reconto/configuração.

**Máscara/apresentação:** Texto com quebras de linha; limite e contador do
campo visíveis, sem máscara de seleção. Autocomplete: off.

**Validação:** 3–1000 caracteres; Somente comando autorizado de
configuração/adiamento; não aparece como nota na consulta.

**Ajuda/exemplo:** Explicar efeito e próxima pessoa.

**Mensagem e condição:** “Confira motivo da decisão e o limite indicado.
Corrija somente esta informação; os demais valores preenchidos foram
preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

## 15–18. Hierarquia, ações, consequências e mensagens

Prazo original/efetivo → responsável e plantão → atraso/estado → contar, pedir
adiamento ou abrir configuração autorizada.

Filtros no topo, tarefas com identidade/próxima pessoa/estado e ação por
linha; contadores identificam o conjunto consultado.

Primária: **Revisar programação do BAL**. Secundárias: Solicitar adiamento;
Atualizar; Ver histórico.

Efeito: Configurar não faz contagem nem altera prazo por proposta pendente.

Sucesso/resultado: “Programação registrada. Consulte a obrigação e o
responsável; nenhuma contagem física foi criada.”

Vazio/inelegível: “Nenhuma obrigação neste período. Consulte a programação ou
peça orientação à administração familiar.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Informação indisponível não recebe valor inventado; bloquear somente ação que
depende dela, preservando consultas e encaminhamentos autorizados.

Falha de configuração preserva obrigações conhecidas. Pedido obsoleto pode ser
encerrado sem apagar atraso ou aprovar alvo antigo.

Leitura falha repete consulta da seção. Escrita incerta consulta a mesma
intenção antes de novo comando. Recusa comprovada, confirmado, conflito e
incerto têm resultados distintos; nenhuma mensagem presume que nada ocorreu.

Voltar conserva contexto/edição permitidos e devolve foco ao acionador. Depois
de resultado confirmado, abrir o alvo/resultado existente, sem repetir o ato.

## 21–24. Móvel, acessibilidade, referência e negócio

Cartões rotulados com alvo e próximo passo antes do botão; filtros podem
recolher preservando resumo e foco; paginação alcançável.

Lista e número de resultados anunciados sem flood; atualização conserva item
focado e não transforma carregamento em ausência.

Identidade aprovada: teal/papel claro, tipografia hierárquica, bordas suaves,
cards e barra de contexto. Prioridade da tarefa e regras de autorização
governam o layout; exemplos do protótipo não são controles obrigatórios.

Referência do protótipo: bal. Sem captura real ou aceite humano de interface
futura nesta C.

EVOLUIR consulta; separar drawers por comando para que designado não edite
regime familiar.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-001;C-AC-008;C-AC-009;C-AC-010;C-AC-015;C-AC-051;C-AC-054;C-AC-056;C-AC-057;C-AC-074;C-AC-077;C-AC-086;C-AC-089;C-AC-104;C-NEW-AC-007;C-NEW-AC-011;C-NEW-AC-012;C-NEW-AC-015;C7-AC-003;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025;C-FINAL-AC-024.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
