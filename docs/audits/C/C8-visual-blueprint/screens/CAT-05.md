# CAT-05 — Selecionar e conferir apresentação

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Seleção auxiliar de material/apresentação em formulário privado; câmera é
conveniência.

Finalidade: Selecionar e conferir apresentação.

Autor competente no formulário consumidor; código não concede acesso ou
registra movimento.

AS_IS/rota: Seleção/scan nos formulários, atual a alterar.

## 4–14. Campos, modos de interação e validação

Identidade encontrada e equivalência calculada; usuário confirma
correspondência física. Nunca copiar estoque observado da seleção antiga.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-090-01 — Código de barras

**Modo/componente:** EDITABLE / BARCODE_TEXT_WITH_SCAN.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Opcional se seleção manual; obrigatório ao
associar scan.

**Máscara/apresentação:** Código textual com zeros iniciais preservados;
câmera opcional e alternativa manual; nunca converter para número.
Autocomplete: off.

**Validação:** Preservar zeros; formato/check digit aplicável; unicidade
conforme catálogo; Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Não tratar código desconhecido como produto autorizado.

**Mensagem e condição:** “Confira o código completo, incluindo os zeros
iniciais, ou selecione o material manualmente.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-092-01 — Número de embalagens

**Modo/componente:** EDITABLE / DECIMAL_TEXT_INPUT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Quando apresentação usada.

**Máscara/apresentação:** Quantidade textual exata com unidade; vírgula/ponto,
inputmode decimal e precisão explícita antes da coerção. Autocomplete: off.

**Validação:** Produto do fator exato; não converter unidade incompatível;
Somente no subestado de preparação autorizado indicado na ficha;
resumo/decisão posterior é leitura.

**Ajuda/exemplo:** “2 pacotes = 20 unidades.”

**Mensagem e condição:** “Informe número de embalagens na unidade indicada e
com a precisão permitida. O campo precisa de correção antes de confirmar.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

## 15–18. Hierarquia, ações, consequências e mensagens

Busca manual ou câmera por gesto → material reconhecido → apresentação/fator →
embalagens → quantidade base calculada → usar na edição.

Drawer de busca com resultados e seleção; prévia separada das ações do
documento consumidor.

Primária: **Usar material e equivalência**. Secundárias: Digitar código; Usar
câmera; Selecionar manualmente.

Efeito: Scan auxilia, autor confirma material; não autoriza por código.

Sucesso/resultado: “Material e apresentação selecionados para conferência no
formulário. Nenhum documento foi emitido.”

Vazio/inelegível: “Código não encontrado. Busque o material pelo nome ou
digite o código de outra apresentação.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Informação indisponível não recebe valor inventado; bloquear somente ação que
depende dela, preservando consultas e encaminhamentos autorizados.

Câmera negada/sem suporte mantém entrada manual; fator ausente ou incompatível
não gera quantidade presumida.

Leitura falha repete consulta da seção. Escrita incerta consulta a mesma
intenção antes de novo comando. Recusa comprovada, confirmado, conflito e
incerto têm resultados distintos; nenhuma mensagem presume que nada ocorreu.

Voltar conserva contexto/edição permitidos e devolve foco ao acionador. Depois
de resultado confirmado, abrir o alvo/resultado existente, sem repetir o ato.

## 21–24. Móvel, acessibilidade, referência e negócio

Painel de uma coluna; busca permanece rotulada; seleção e retorno à tarefa sem
depender de hover.

Combobox setas/Enter/Escape; quantidade de resultados anunciada; fechar
devolve ao acionador do formulário.

Identidade aprovada: teal/papel claro, tipografia hierárquica, bordas suaves,
cards e barra de contexto. Prioridade da tarefa e regras de autorização
governam o layout; exemplos do protótipo não são controles obrigatórios.

Referência do protótipo: req. Sem captura real ou aceite humano de interface
futura nesta C.

EVOLUIR seleção e câmera; resultado exige confirmação humana e preservação dos
zeros do código.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-026;C-AC-028;C-AC-029;C-AC-044;C-AC-045;C-AC-067;C-AC-081;C-NEW-AC-008;C-NEW-AC-022;C-NEW-AC-024;C-NEW-AC-025;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025;C-FINAL-AC-019.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
