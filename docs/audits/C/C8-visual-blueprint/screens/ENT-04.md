# ENT-04 — Informar divergência

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Declaração pessoal de recebimento com diferença, antes de confirmar o resumo
completo.

Finalidade: Informar divergência.

Somente recebedor designado vigente; não selecionar outra identidade como
assinatura.

AS_IS/rota: Diálogo de divergência, atual a alterar.

## 4–14. Campos, modos de interação e validação

Material, quantidade expedida/pendente e unidade. Linhas não marcadas aparecem
explicitamente como aceitas integralmente no resumo final.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-035-01 — Linhas com divergência

**Modo/componente:** EDITABLE / LINE_CHECKBOX_GROUP.

**Quando/ator:** Selecionar apenas linhas da ENT exibida; nenhuma busca de
produto novo.

**Obrigatoriedade/inicial:** Não, lista vazia significa aceite integral após
confirmação.

**Máscara/apresentação:** Uma caixa por linha expedida, com
material/unidade/quantidade; selecionada abre os campos próprios da
divergência. Autocomplete: off.

**Validação:** Revisão mostra também linhas não selecionadas; Selecionar
apenas linhas da ENT exibida; nenhuma busca de produto novo.

**Ajuda/exemplo:** Selecione as linhas com diferença. Antes de confirmar,
confira também as linhas indicadas como recebidas integralmente.

**Mensagem e condição:** “Escolha uma opção válida para linhas com divergência
no escopo desta tarefa. Se a opção necessária não estiver disponível, volte ou
procure a administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-036-01 — Quantidade aceita

**Modo/componente:** EDITABLE / DECIMAL_TEXT_INPUT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sim nessas linhas, sem aceite implícito.

**Máscara/apresentação:** Quantidade textual exata com unidade; vírgula/ponto,
inputmode decimal e precisão explícita antes da coerção. Autocomplete: off.

**Validação:** De 0 ao ainda expedido/pendente; precisão da unidade; Somente
no subestado de preparação autorizado indicado na ficha; resumo/decisão
posterior é leitura.

**Ajuda/exemplo:** “Recebi 2 de 3 unidades.”

**Mensagem e condição:** “Informe quantidade aceita na unidade indicada e com
a precisão permitida. O campo precisa de correção antes de confirmar.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-037-01 — Problema

**Modo/componente:** EDITABLE / TEXTAREA.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Condicional à divergência; vazio, sem copiar
ressalva de expedição.

**Máscara/apresentação:** Texto com quebras de linha; limite e contador do
campo visíveis, sem máscara de seleção. Autocomplete: off.

**Validação:** Problema da linha com diferença, até 500 caracteres;
obrigatório quando o fluxo exigir explicação da divergência; Somente no
subestado de preparação autorizado indicado na ficha; resumo/decisão posterior
é leitura.

**Ajuda/exemplo:** “Uma unidade não chegou”; não inferir consumo.

**Mensagem e condição:** “Confira problema e o limite indicado. Corrija
somente esta informação; os demais valores preenchidos foram preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-037-02 — Ressalva

**Modo/componente:** EDITABLE / TEXTAREA.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Opcional, salvo exigência específica do fato;
vazio.

**Máscara/apresentação:** Texto com quebras de linha; limite e contador do
campo visíveis, sem máscara de seleção. Autocomplete: off.

**Validação:** Ressalva própria do recebedor, até 1000 caracteres; não
substitui quantidade aceita; Somente no subestado de preparação autorizado
indicado na ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** “Uma unidade não chegou”; não inferir consumo.

**Mensagem e condição:** “Confira ressalva e o limite indicado. Corrija
somente esta informação; os demais valores preenchidos foram preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

## 15–18. Hierarquia, ações, consequências e mensagens

Marcar linhas divergentes → expedido em leitura → aceito real vazio por linha
marcada → problema/ressalva → revisar todas as linhas → confirmar.

Resumo de custódias e recebedor antes das linhas; expedido e aceito em colunas
identificadas; ação pessoal após todas as linhas.

Primária: **Registrar meu recebimento com ressalva**. Secundárias: Voltar e
conferir.

Efeito: Aceito positivo credita, restante continua em trânsito/divergência.

Sucesso/resultado: “Recebimento com ressalva registrado. Só a quantidade
aceita foi creditada; o restante continua pendente de solução.”

Vazio/inelegível: “Nenhuma linha com diferença selecionada. Volte para
confirmar o recebimento integral ou selecione a linha a conferir.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Sem linhas e pendência expedida confiáveis, bloquear confirmação de
divergência. Guardar edição permitida e consultar fonte; não preencher limite
ou aceito por adivinhação.

Erro de quantidade aponta a linha editável, sem pedir alteração do expedido.
Zero aceito não quita material; nunca preencher automaticamente o restante na
linha divergente.

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

Referência do protótipo: ent/entDivergence. Sem captura real ou aceite humano
de interface futura nesta C.

RECONSTRUIR editor por linha se busca de produto ou default de aceite permitir
mudar a expedição.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-010;C-AC-021;C-AC-028;C-AC-042;C-AC-043;C-AC-044;C-AC-048;C-AC-050;C-AC-074;C-AC-077;C-AC-079;C-AC-089;C-AC-096;C-AC-101;C-AC-103;C-AC-105;C-NEW-AC-006;C-NEW-AC-007;C-NEW-AC-009;C-NEW-AC-015;C-NEW-AC-016;C-NEW-AC-022;C-NEW-AC-028;C7-AC-002;C7-AC-010;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025;C-FINAL-AC-012;C-FINAL-AC-019.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
