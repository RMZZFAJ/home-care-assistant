# COM-01 — Solicitar aquisição

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Rascunho de aquisição por compra ou doação; previsão anterior à emissão.

Finalidade: Solicitar aquisição.

Ator com capacidade de criar aquisição no paciente; origem e catálogo
autorizados.

AS_IS/rota: /fichas/com, atual a alterar.

## 4–14. Campos, modos de interação e validação

Unidade/fator exibidos junto à quantidade; identidade da residência e autor.
Não coletar recebimento ou validação nesta tela.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-014-01 — Origem

**Modo/componente:** EDITABLE / RADIO_OR_SELECT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sim, escolha explícita.

**Máscara/apresentação:** Opções do domínio rotuladas; escolha material
explícita, sem concordância presumida. Autocomplete: off.

**Validação:** `purchase`/`donation`; título correspondente; Somente no
subestado de preparação autorizado indicado na ficha; resumo/decisão posterior
é leitura.

**Ajuda/exemplo:** “Compra ou doação?”, sem chamar toda COM de compra.

**Mensagem e condição:** “Escolha uma opção válida para origem no escopo desta
tarefa. Se a opção necessária não estiver disponível, volte ou procure a
administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-015-01 — Material

**Modo/componente:** EDITABLE / SEARCHABLE_COMBOBOX.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Ao menos um, vazio.

**Máscara/apresentação:** Busca por nome/alias e seleção de resultado
autorizado; nenhum identificador técnico digitado. Autocomplete: off.

**Validação:** Único por linha, até 1000; Somente no subestado de preparação
autorizado indicado na ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Seleção manual e alias; sem produto implícito pelo scan.

**Mensagem e condição:** “Escolha uma opção válida para material no escopo
desta tarefa. Se a opção necessária não estiver disponível, volte ou procure a
administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-016-01 — Previsto

**Modo/componente:** EDITABLE / DECIMAL_TEXT_INPUT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sim por linha, vazio.

**Máscara/apresentação:** Quantidade textual exata com unidade; vírgula/ponto,
inputmode decimal e precisão explícita antes da coerção. Autocomplete: off.

**Validação:** Positivo, até 1 bilhão, até seis casas e precisão da unidade;
Somente no subestado de preparação autorizado indicado na ficha;
resumo/decisão posterior é leitura.

**Ajuda/exemplo:** “Quantidade que pretende adquirir: 10 unidades.”

**Mensagem e condição:** “Informe previsto na unidade indicada e com a
precisão permitida. O campo precisa de correção antes de confirmar.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-017-01 — Apresentação

**Modo/componente:** EDITABLE / SEARCHABLE_COMBOBOX.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Não, unidade base.

**Máscara/apresentação:** Busca por nome/alias e seleção de resultado
autorizado; nenhum identificador técnico digitado. Autocomplete: off.

**Validação:** Conversão finita/exata, snapshot do fator/código; Somente no
subestado de preparação autorizado indicado na ficha; resumo/decisão posterior
é leitura.

**Ajuda/exemplo:** “2 pacotes de 10 = 20 unidades.”

**Mensagem e condição:** “Escolha uma opção válida para apresentação no escopo
desta tarefa. Se a opção necessária não estiver disponível, volte ou procure a
administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-024-01 — Observações

**Modo/componente:** EDITABLE / TEXTAREA.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Não, vazio.

**Máscara/apresentação:** Texto com quebras de linha; limite e contador do
campo visíveis, sem máscara de seleção. Autocomplete: off.

**Validação:** Até 2000 na ficha; até 1000 na aquisição; Somente no subestado
de preparação autorizado indicado na ficha; resumo/decisão posterior é
leitura.

**Ajuda/exemplo:** Comprovante financeiro não é obrigatório.

**Mensagem e condição:** “Confira observações e o limite indicado. Corrija
somente esta informação; os demais valores preenchidos foram preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

## 15–18. Hierarquia, ações, consequências e mensagens

Compra/doação → materiais/unidade/apresentação → previsto por linha →
observações → resumo antes da emissão.

Conteúdo em até duas colunas: editor principal flexível e ajuda lateral de
cerca de um terço; etapas no topo e resumo de itens antes do rodapé.

Primária: **Revisar aquisição**. Secundárias: Salvar rascunho; Voltar.

Efeito: Previsão não credita estoque.

Sucesso/resultado: “Aquisição pronta para revisão. A previsão ainda não
acrescenta material ao estoque.”

Vazio/inelegível: “Adicione ao menos um material à aquisição e informe a
quantidade prevista.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Informação indisponível não recebe valor inventado; bloquear somente ação que
depende dela, preservando consultas e encaminhamentos autorizados.

Salvar rascunho é independente de emitir. Na falha de emissão, conservar a
revisão; informar save confirmado sem afirmar entrada de estoque.

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

Referência do protótipo: com/newPurchase. Sem captura real ou aceite humano de
interface futura nesta C.

EVOLUIR wizard por origem; reconstruir resumo se compra/doação tiverem rótulos
ou efeitos misturados.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-015;C-AC-028;C-AC-035;C-AC-044;C-AC-058;C-AC-074;C-AC-077;C-AC-089;C-AC-109;C-NEW-AC-005;C-NEW-AC-022;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
