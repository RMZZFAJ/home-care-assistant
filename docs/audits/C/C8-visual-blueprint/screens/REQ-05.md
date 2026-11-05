# REQ-05 — Usar lista frequente

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Seleção auxiliar em uma REQ privada; lista frequente pertence ao
usuário/paciente permitido.

Finalidade: Usar lista frequente.

Usuário autorizado a preparar REQ; lista não amplia acesso ao catálogo.

AS_IS/rota: Lista recorrente, novo painel do wizard.

## 4–14. Campos, modos de interação e validação

Descrição da lista e disponibilidade atual. Nenhuma contagem, urgência ou
justificativa antiga é copiada como declaração atual.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-010-01 — Nome da seleção recorrente

**Modo/componente:** EDITABLE / TEXT_INPUT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Se salvar seleção; vazio.

**Máscara/apresentação:** Texto legível sem máscara artificial;
contador/limite específico junto ao campo. Autocomplete: off.

**Validação:** Proposta: 2–80 caracteres; escopo paciente/usuário; Somente no
subestado de preparação autorizado indicado na ficha; resumo/decisão posterior
é leitura.

**Ajuda/exemplo:** “Materiais habituais do turno.”

**Mensagem e condição:** “Confira nome da seleção recorrente e o limite
indicado. Corrija somente esta informação; os demais valores preenchidos foram
preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

## 15–18. Hierarquia, ações, consequências e mensagens

Buscar lista → conferir materiais ainda elegíveis → selecionar → adicionar à
edição atual; salvar nome é ação separada.

Drawer de busca com resultados e seleção; prévia separada das ações do
documento consumidor.

Primária: **Adicionar materiais selecionados**. Secundárias: Voltar; Salvar
seleção como lista.

Efeito: Copia seleção, jamais contagem antiga.

Sucesso/resultado: “Materiais selecionados adicionados ao preenchimento.
Confira a observação e a urgência de cada item.”

Vazio/inelegível: “Você ainda não tem uma lista frequente neste paciente.
Selecione materiais na requisição para salvar uma lista.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Informação indisponível não recebe valor inventado; bloquear somente ação que
depende dela, preservando consultas e encaminhamentos autorizados.

Item já escolhido é identificado sem duplicar linha; item inativo é explicado
e fica fora da nova inclusão. Falha não apaga a seleção original.

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

Referência do protótipo: req/recurring. Sem captura real ou aceite humano de
interface futura nesta C.

NOVO PAINEL: preservar busca e retorno ao campo de material; não criar pedido
oficial pelo uso da lista.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-025;C-AC-026;C-AC-036;C-AC-041;C-AC-049;C-AC-073;C-AC-089;C-AC-105;C-NEW-AC-003;C-NEW-AC-004;C-NEW-AC-024;C-NEW-AC-028;C7-AC-012;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
