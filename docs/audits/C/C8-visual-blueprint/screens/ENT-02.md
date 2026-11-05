# ENT-02 — Minhas tarefas de entrega

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Fila de receber, decidir cancelamento ou resolver diferença; filtros de
consulta separados de atos materiais.

Finalidade: Minhas tarefas de entrega.

Recebedor vê suas tarefas; demais leitores só o conjunto autorizado. Abrir
tarefa não transfere capacidade pessoal.

AS_IS/rota: /entregas, atual a alterar.

## 4–14. Campos, modos de interação e validação

Todos os dados da lista, quantidades e destinatário. Filtros não alteram a
entrega.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-157-01 — Estado

**Modo/componente:** FILTER / RADIO_OR_SELECT.

**Quando/ator:** Apenas consulta no escopo permitido; não altera documento,
movimento ou autoridade.

**Obrigatoriedade/inicial:** Sem restrição adicional inicialmente, salvo
filtro de tarefa explicitamente indicado no link; vazio limpa filtro, não cria
zero ou estado material.

**Máscara/apresentação:** Opções do domínio rotuladas; escolha material
explícita, sem concordância presumida. Autocomplete: off.

**Validação:** Tarefa de receber/decidir pedido/resolver diferença e estado
real da entrega; nunca selecionar outro recebedor como autorização; datas em
DD/MM/AAAA na apresentação e limites de consulta validados; manter filtros ao
voltar.

**Ajuda/exemplo:** “Pendentes sob minha responsabilidade.”

**Mensagem e condição:** “Confira o filtro e o período indicados. A consulta
pode ser atualizada sem alterar nenhum registro.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-157-02 — Tipo

**Modo/componente:** FILTER / RADIO_OR_SELECT.

**Quando/ator:** Apenas consulta no escopo permitido; não altera documento,
movimento ou autoridade.

**Obrigatoriedade/inicial:** Sem restrição adicional inicialmente, salvo
filtro de tarefa explicitamente indicado no link; vazio limpa filtro, não cria
zero ou estado material.

**Máscara/apresentação:** Opções do domínio rotuladas; escolha material
explícita, sem concordância presumida. Autocomplete: off.

**Validação:** Tarefa de receber/decidir pedido/resolver diferença e estado
real da entrega; nunca selecionar outro recebedor como autorização; datas em
DD/MM/AAAA na apresentação e limites de consulta validados; manter filtros ao
voltar.

**Ajuda/exemplo:** “Pendentes sob minha responsabilidade.”

**Mensagem e condição:** “Confira o filtro e o período indicados. A consulta
pode ser atualizada sem alterar nenhum registro.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-157-03 — Data inicial

**Modo/componente:** FILTER / DATE_INPUT.

**Quando/ator:** Apenas consulta no escopo permitido; não altera documento,
movimento ou autoridade.

**Obrigatoriedade/inicial:** Sem restrição adicional inicialmente, salvo
filtro de tarefa explicitamente indicado no link; vazio limpa filtro, não cria
zero ou estado material.

**Máscara/apresentação:** Data DD/MM/AAAA na apresentação, sem conversão
silenciosa de fuso; limites do período visíveis. Autocomplete: off.

**Validação:** Tarefa de receber/decidir pedido/resolver diferença e estado
real da entrega; nunca selecionar outro recebedor como autorização; datas em
DD/MM/AAAA na apresentação e limites de consulta validados; manter filtros ao
voltar.

**Ajuda/exemplo:** “Pendentes sob minha responsabilidade.”

**Mensagem e condição:** “Confira o filtro e o período indicados. A consulta
pode ser atualizada sem alterar nenhum registro.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-157-04 — Data final

**Modo/componente:** FILTER / DATE_INPUT.

**Quando/ator:** Apenas consulta no escopo permitido; não altera documento,
movimento ou autoridade.

**Obrigatoriedade/inicial:** Sem restrição adicional inicialmente, salvo
filtro de tarefa explicitamente indicado no link; vazio limpa filtro, não cria
zero ou estado material.

**Máscara/apresentação:** Data DD/MM/AAAA na apresentação, sem conversão
silenciosa de fuso; limites do período visíveis. Autocomplete: off.

**Validação:** Tarefa de receber/decidir pedido/resolver diferença e estado
real da entrega; nunca selecionar outro recebedor como autorização; datas em
DD/MM/AAAA na apresentação e limites de consulta validados; manter filtros ao
voltar.

**Ajuda/exemplo:** “Pendentes sob minha responsabilidade.”

**Mensagem e condição:** “Confira o filtro e o período indicados. A consulta
pode ser atualizada sem alterar nenhum registro.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-C8-006 — Buscar no conjunto autorizado

**Modo/componente:** FILTER / SEARCH_INPUT.

**Quando/ator:** Apenas consulta no escopo permitido; não altera documento,
movimento ou autoridade.

**Obrigatoriedade/inicial:** Sem restrição adicional inicialmente, salvo
filtro de tarefa explicitamente indicado no link; vazio limpa filtro, não cria
zero ou estado material.

**Máscara/apresentação:** Termo textual de busca no conjunto autorizado;
Limpar remove o filtro, sem alterar registros. Autocomplete: off.

**Validação:** Tarefa de receber/decidir pedido/resolver diferença e estado
real da entrega; nunca selecionar outro recebedor como autorização; datas em
DD/MM/AAAA na apresentação e limites de consulta validados; manter filtros ao
voltar.

**Ajuda/exemplo:** Busque pelo nome ou referência apresentados nesta tarefa.
Limpe a busca para voltar ao conjunto autorizado.

**Mensagem e condição:** “Confira o filtro e o período indicados. A consulta
pode ser atualizada sem alterar nenhum registro.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

## 15–18. Hierarquia, ações, consequências e mensagens

Filtros por tarefa/estado → protocolo/pessoa/pendência → próxima ação legítima
→ detalhe autorizado com retorno ao filtro.

Filtros no topo, tarefas com identidade/próxima pessoa/estado e ação por
linha; contadores identificam o conjunto consultado.

Primária: **Abrir tarefa**. Secundárias: Filtrar; Atualizar; Carregar
anteriores.

Efeito: Abertura leva ao alvo exato; não confirma.

Sucesso/resultado: “Tarefa aberta para consulta. Nenhum recebimento foi
confirmado.”

Vazio/inelegível: “Nenhuma tarefa corresponde aos filtros atuais. Limpe os
filtros ou consulte entregas anteriores.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Informação indisponível não recebe valor inventado; bloquear somente ação que
depende dela, preservando consultas e encaminhamentos autorizados.

Falha na fila não significa nenhuma entrega. Conservar filtro e última
consulta identificada; link direto busca alvo fora da página recente.

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

Referência do protótipo: ent. Sem captura real ou aceite humano de interface
futura nesta C.

EVOLUIR fila e paginação; incluir decisões/diferenças sem pressupor só
pending_receipt.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-010;C-AC-021;C-AC-028;C-AC-042;C-AC-043;C-AC-044;C-AC-048;C-AC-050;C-AC-074;C-AC-077;C-AC-079;C-AC-089;C-AC-096;C-AC-101;C-AC-103;C-AC-105;C-NEW-AC-006;C-NEW-AC-007;C-NEW-AC-009;C-NEW-AC-015;C-NEW-AC-016;C-NEW-AC-022;C-NEW-AC-028;C7-AC-002;C7-AC-010;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
