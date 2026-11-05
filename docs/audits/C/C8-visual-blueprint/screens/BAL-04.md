# BAL-04 — Designar substituta para reconto

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Designação de nova contagem para substituir tarefa indisponível, preservando a
anterior.

Finalidade: Designar substituta para reconto.

Designador familiar autorizado; substituta deve estar vinculada e elegível à
nova janela.

AS_IS/rota: Designação de reconto, atual a ampliar.

## 4–14. Campos, modos de interação e validação

Autor e valores da contagem anterior; não há troca do nome do ato já
registrado.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-054-01 — Substituta do reconto

**Modo/componente:** EDITABLE / SEARCHABLE_COMBOBOX.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sim ao redesignar.

**Máscara/apresentação:** Busca por nome/alias e seleção de resultado
autorizado; nenhum identificador técnico digitado. Autocomplete: off.

**Validação:** Vínculo/capacidade/janela; registro do designador; Somente no
subestado de preparação autorizado indicado na ficha; resumo/decisão posterior
é leitura.

**Ajuda/exemplo:** “Sheila fará novo reconto; Juliana permanece autora da
contagem anterior.”

**Mensagem e condição:** “Escolha uma opção válida para substituta do reconto
no escopo desta tarefa. Se a opção necessária não estiver disponível, volte ou
procure a administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-055-01 — Motivo da decisão

**Modo/componente:** EDITABLE / TEXTAREA.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sim em adiamento/reconto/configuração.

**Máscara/apresentação:** Texto com quebras de linha; limite e contador do
campo visíveis, sem máscara de seleção. Autocomplete: off.

**Validação:** 3–1000 caracteres; Somente no subestado de preparação
autorizado indicado na ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Explicar efeito e próxima pessoa.

**Mensagem e condição:** “Confira motivo da decisão e o limite indicado.
Corrija somente esta informação; os demais valores preenchidos foram
preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

## 15–18. Hierarquia, ações, consequências e mensagens

Contagem/atribuição anterior → nova pessoa e janela → motivo → prévia da nova
tarefa → designar reconto.

Diálogo rotulado curto com identidade-alvo, efeito e ações específicas; não
reaproveitar formulário de criação.

Primária: **Designar novo reconto**. Secundárias: Voltar; Ver contagem
anterior.

Efeito: Nova contagem/autoria; não reescreve original.

Sucesso/resultado: “Novo reconto designado. A contagem anterior permanece com
sua autora original.”

Vazio/inelegível: “Nenhuma pessoa elegível disponível. Mantenha a tarefa
pendente e peça à família que regularize a designação.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Informação indisponível não recebe valor inventado; bloquear somente ação que
depende dela, preservando consultas e encaminhamentos autorizados.

Conflito relê atribuição atual e conserva motivo; não redesigna a mesma
intenção para outra pessoa após resultado incerto.

Leitura falha repete consulta da seção. Escrita incerta consulta a mesma
intenção antes de novo comando. Recusa comprovada, confirmado, conflito e
incerto têm resultados distintos; nenhuma mensagem presume que nada ocorreu.

Voltar conserva contexto/edição permitidos e devolve foco ao acionador. Depois
de resultado confirmado, abrir o alvo/resultado existente, sem repetir o ato.

## 21–24. Móvel, acessibilidade, referência e negócio

Largura disponível; conteúdo longo vira página/painel rolável com título e
ações alcançáveis; nenhuma confirmação fora da tela.

Foco inicial no título/resumo seguro; trap no diálogo; Escape/Voltar não
decide e devolve foco ao acionador.

Identidade aprovada: teal/papel claro, tipografia hierárquica, bordas suaves,
cards e barra de contexto. Prioridade da tarefa e regras de autorização
governam o layout; exemplos do protótipo não são controles obrigatórios.

Referência do protótipo: bal/balReassign. Sem captura real ou aceite humano de
interface futura nesta C.

NOVO DRAWER: tornar autoria nova e alcance futuro verificáveis antes do
comando.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-001;C-AC-008;C-AC-009;C-AC-010;C-AC-015;C-AC-051;C-AC-054;C-AC-056;C-AC-057;C-AC-074;C-AC-077;C-AC-086;C-AC-089;C-AC-104;C-NEW-AC-007;C-NEW-AC-011;C-NEW-AC-012;C-NEW-AC-015;C7-AC-003;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025;C-FINAL-AC-016;C-FINAL-AC-024.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
