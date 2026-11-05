# BAL-03 — Consultar ou iniciar revisão

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Contagem registrada; consulta, início facultativo de revisão e decisão de
revisão vigente são subestados diferentes.

Finalidade: Consultar ou iniciar revisão.

Contador consulta seu ato; revisor autorizado deve ser distinto do contador
efetivo da versão. Grupo/autor não são digitados.

AS_IS/rota: Revisão etapa 2 e detalhe, atual a alterar.

## 4–14. Campos, modos de interação e validação

Contagem original, notas do contador, referência, diferença e autoria. Parecer
do revisor é campo próprio, sem sobrescrever as notas originais.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-047-01 — Material e unidade

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Consulta do valor de origem; mudanças só no processo
legitimamente responsável.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Nome completo e unidade da origem, com quebra de
linha sem corte. Autocomplete: NÃO APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Consulta do valor de
origem; mudanças só no processo legitimamente responsável.

**Ajuda/exemplo:** Identificação do item registrado. A consulta não substitui
o material ou reinterpreta sua unidade.

**Mensagem e condição:** “Não foi possível carregar a informação “Material e
unidade”. Atualize esta seção. O dado registrado não pode ser alterado aqui.”
— SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-049-01 — Referência de estoque

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Consulta do valor de origem; mudanças só no processo
legitimamente responsável.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Quantidade decimal exata com unidade e precisão da
origem, sem input. Autocomplete: NÃO APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Consulta do valor de
origem; mudanças só no processo legitimamente responsável.

**Ajuda/exemplo:** Quantidade registrada para a etapa indicada. Não é uma nova
declaração de quantidade e não movimenta material ao ser consultada.

**Mensagem e condição:** “Não foi possível carregar a informação “Referência
de estoque”. Atualize esta seção. O dado registrado não pode ser alterado
aqui.” — SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

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

### CTRL-051-01 — Observações

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Observações originais do contador; parecer do revisor tem
CTRL-C8-002 próprio.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Texto integral da observação original, com autor e
instante. Autocomplete: NÃO APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Observações originais do
contador; parecer do revisor tem CTRL-C8-002 próprio.

**Ajuda/exemplo:** Observação da pessoa que contou. O parecer de revisão tem
campo e autoria separados.

**Mensagem e condição:** “Não foi possível carregar a informação
“Observações”. Atualize esta seção. O dado registrado não pode ser alterado
aqui.” — SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-052-01 — Grupo e revisão

**Modo/componente:** READ_ONLY / REVIEW_STATUS_DESCRIPTION.

**Quando/ator:** Grupo/elegibilidade/autor da revisão resolvidos pelo
servidor; não digitados.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Descrição rotulada do registro específico, sem
input, identificador de transporte ou valor inventado. Autocomplete: NÃO
APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela.
Grupo/elegibilidade/autor da revisão resolvidos pelo servidor; não digitados.

**Ajuda/exemplo:** Informação do registro indicado, somente para consulta
nesta etapa. Ausência de dado histórico permanece explicitamente identificada.

**Mensagem e condição:** “Não foi possível carregar a informação “Grupo e
revisão”. Atualize esta seção. O dado registrado não pode ser alterado aqui.”
— SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-C8-002 — Parecer da revisão

**Modo/componente:** EDITABLE / TEXTAREA.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Somente em revisão legitimamente iniciada;
opcional e vazio; separado das notas do contador.

**Máscara/apresentação:** Parecer textual próprio de até 2.000 caracteres com
contador; observações originais separadas em leitura. Autocomplete: off.

**Validação:** Limite TO_BE de 2.000 caracteres, com contador; impor o mesmo
limite na UI/API/banco da revisão na D; nunca sobrescrever contagem ou notas
originais; Somente no subestado de preparação autorizado indicado na ficha;
resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Registre sua informação de revisão em até 2.000 caracteres.
As observações da contadora permanecem preservadas.

**Mensagem e condição:** “Confira parecer da revisão e o limite indicado.
Corrija somente esta informação; os demais valores preenchidos foram
preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

## 15–18. Hierarquia, ações, consequências e mensagens

Autor/versão/janela → contado/referência/diferença → efeito já aplicado ou
pendente → iniciar revisão facultativa → parecer próprio/decisão.

Comparação Atual/Proposto lado a lado com mesmas linhas, autor/motivo/alcance
acima e consequências antes das ações.

Primária: **Consultar contagem registrada**. Secundárias: Iniciar revisão;
Pedir esclarecimento; Solicitar reconto.

Efeito: Revisão iniciada tem autora/versão própria; não é fila universal.

Sucesso/resultado: “Resultado da revisão registrado na versão exibida. A
contagem e as revisões anteriores foram preservadas.”

Vazio/inelegível: “Não há revisão iniciada para esta versão. A consulta
continua disponível; revisão é facultativa no primeiro uso.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Sem versão contada e referência de ledger válidas, não aplicar/revisar como se
atuais. Consulta histórica permanece; reconto legítimo é alternativa, sem
inventar referência.

Ledger alterado impede aplicação da referência antiga; explicar mudança e
abrir reconto legítimo. Contador não se autoaprova por caminho legado.

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

Referência do protótipo: bal/balReview. Sem captura real ou aceite humano de
interface futura nesta C.

RECONSTRUIR composição se consulta obrigar revisão ou reutilizar observação do
contador como parecer alheio.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-001;C-AC-008;C-AC-009;C-AC-010;C-AC-015;C-AC-051;C-AC-054;C-AC-056;C-AC-057;C-AC-074;C-AC-077;C-AC-086;C-AC-089;C-AC-104;C-NEW-AC-007;C-NEW-AC-011;C-NEW-AC-012;C-NEW-AC-015;C7-AC-003;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025;C-FINAL-AC-016.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
