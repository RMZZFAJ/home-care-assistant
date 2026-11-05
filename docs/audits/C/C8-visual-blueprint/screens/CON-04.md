# CON-04 — Decidir consumo

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Revisão de relato/complemento estruturado pendente; confirmar ou rejeitar são
decisões opostas.

Finalidade: Decidir consumo.

Confirmador autorizado à custódia, versão e capacidade pertinentes; nunca NULL
como decisão.

AS_IS/rota: Revisão e decisão, atual a alterar.

## 4–14. Campos, modos de interação e validação

Texto e quantidades declaradas; se insuficientes, pedir complemento em CON-03.
Não corrigir a prova silenciosamente na decisão.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-101-01 — Referência do relato

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

**Mensagem e condição:** “Não foi possível carregar a informação “Referência
do relato”. Atualize esta seção. O dado registrado não pode ser alterado
aqui.” — SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-102-01 — Decisão

**Modo/componente:** EXPLICIT_ACTION / DECISION_BUTTONS.

**Quando/ator:** Confirmar consumo ou rejeitar versão pendente; nenhum valor
NULL ou default.

**Obrigatoriedade/inicial:** Sem concordância material inicial ou clique
automático.

**Máscara/apresentação:** Botão/ação com nome de consequência; sem campo
textual de aceite. Autocomplete: NÃO APLICÁVEL.

**Validação:** Mesmo resultado recupera; oposto conflita; Confirmar consumo ou
rejeitar versão pendente; nenhum valor NULL ou default.

**Ajuda/exemplo:** “Confirmar consumo e descontar 1 unidade.”

**Mensagem e condição:** “Esta ação não está disponível no estado atual.
Consulte o resultado ou volte à tarefa; nenhuma confirmação será presumida.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Botão com verbo/alvo/efeito; confirmação por
teclado/touch; foco retorna ao resumo, sem aria-invalid em texto de leitura.

### CTRL-103-01 — Motivo de rejeição/correção

**Modo/componente:** EDITABLE / TEXTAREA.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Condicional à rejeição/correção.

**Máscara/apresentação:** Texto com quebras de linha; limite e contador do
campo visíveis, sem máscara de seleção. Autocomplete: off.

**Validação:** Proposta 3–1000, histórico imutável; Somente no subestado de
preparação autorizado indicado na ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Não chamar rejeição de confirmação sem efeito.

**Mensagem e condição:** “Confira motivo de rejeição/correção e o limite
indicado. Corrija somente esta informação; os demais valores preenchidos foram
preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

## 15–18. Hierarquia, ações, consequências e mensagens

Autor/original/complementos → material/quantidade/custódia → saldo
antes/depois → confirmar consumo ou rejeitar com motivo.

Comparação Atual/Proposto lado a lado com mesmas linhas, autor/motivo/alcance
acima e consequências antes das ações.

Primária: **Confirmar consumo e descontar**. Secundárias: Rejeitar com motivo;
Pedir complemento; Voltar.

Efeito: Débito único só de consumo estruturado confirmado.

Sucesso/resultado: “Decisão registrada. Só o consumo estruturado confirmado
produz o desconto mostrado no resumo.”

Vazio/inelegível: “Este relato não tem estrutura suficiente para confirmar
consumo. Peça ou registre um complemento autorizado.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Sem estrutura de produto/quantidade/custódia e versão suficientes, não
confirmar consumo. Solicitar complemento preserva original; nenhuma quantidade
inferida do texto livre.

Mesma decisão recupera resultado; oposta conflita e mostra a existente. Falha
não transforma ausência de decisão em rejeição.

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

Referência do protótipo: SEM_EQUIVALENTE_NO_HTML. Sem captura real ou aceite
humano de interface futura nesta C.

RECONSTRUIR confirmador com efeito por custódia e resultado tipado; retirar
edição do conteúdo original.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-020;C-AC-035;C-AC-047;C-AC-050;C-AC-055;C-AC-059;C-AC-065;C-AC-089;C-AC-091;C-AC-095;C-AC-096;C-NEW-AC-010;C-NEW-AC-016;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
