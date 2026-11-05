# NOT-01 — Consultar avisos e tarefas

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Sino e central de avisos persistentes; visto no app é diferente do estado do
canal externo.

Finalidade: Consultar avisos e tarefas.

Destinatário autorizado ao aviso e, ao abrir, ao alvo correspondente.

AS_IS/rota: /notificacoes e sino, atuais a alterar.

## 4–14. Campos, modos de interação e validação

Última consulta, origem e estado. Nenhum visto, push ou mensagem lida registra
ciência ou recebimento.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-142-01 — Última consulta

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

**Mensagem e condição:** “Não foi possível carregar a informação “Última
consulta”. Atualize esta seção. O dado registrado não pode ser alterado aqui.”
— SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-157-01 — Estado

**Modo/componente:** FILTER / RADIO_OR_SELECT.

**Quando/ator:** Apenas consulta no escopo permitido; não altera documento,
movimento ou autoridade.

**Obrigatoriedade/inicial:** Sem restrição adicional inicialmente, salvo
filtro de tarefa explicitamente indicado no link; vazio limpa filtro, não cria
zero ou estado material.

**Máscara/apresentação:** Opções do domínio rotuladas; escolha material
explícita, sem concordância presumida. Autocomplete: off.

**Validação:** Visto/Não visto do aviso são distintos de obrigação resolvida;
tipo pelo catálogo de eventos, sem categoria essencial ou prazo P13
inventados; datas em DD/MM/AAAA na apresentação e limites de consulta
validados; manter filtros ao voltar.

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

**Validação:** Visto/Não visto do aviso são distintos de obrigação resolvida;
tipo pelo catálogo de eventos, sem categoria essencial ou prazo P13
inventados; datas em DD/MM/AAAA na apresentação e limites de consulta
validados; manter filtros ao voltar.

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

**Validação:** Visto/Não visto do aviso são distintos de obrigação resolvida;
tipo pelo catálogo de eventos, sem categoria essencial ou prazo P13
inventados; datas em DD/MM/AAAA na apresentação e limites de consulta
validados; manter filtros ao voltar.

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

**Validação:** Visto/Não visto do aviso são distintos de obrigação resolvida;
tipo pelo catálogo de eventos, sem categoria essencial ou prazo P13
inventados; datas em DD/MM/AAAA na apresentação e limites de consulta
validados; manter filtros ao voltar.

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

**Validação:** Visto/Não visto do aviso são distintos de obrigação resolvida;
tipo pelo catálogo de eventos, sem categoria essencial ou prazo P13
inventados; datas em DD/MM/AAAA na apresentação e limites de consulta
validados; manter filtros ao voltar.

**Ajuda/exemplo:** Busque pelo nome ou referência apresentados nesta tarefa.
Limpe a busca para voltar ao conjunto autorizado.

**Mensagem e condição:** “Confira o filtro e o período indicados. A consulta
pode ser atualizada sem alterar nenhum registro.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

## 15–18. Hierarquia, ações, consequências e mensagens

Pendências/filtros → tipo e situação do aviso → próxima tarefa → abrir alvo;
marcar aviso visto é ação de leitura separada.

Filtros no topo, tarefas com identidade/próxima pessoa/estado e ação por
linha; contadores identificam o conjunto consultado.

Primária: **Abrir tarefa**. Secundárias: Marcar aviso visto; Filtrar;
Atualizar.

Efeito: Visto não é ciência nem recebimento; abrir revalida acesso.

Sucesso/resultado: “Aviso aberto. Consulte a tarefa para decidir qualquer ação
operacional.”

Vazio/inelegível: “Nenhum aviso corresponde aos filtros. Isso não comprova que
todas as obrigações foram concluídas.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Informação indisponível não recebe valor inventado; bloquear somente ação que
depende dela, preservando consultas e encaminhamentos autorizados.

Erro do sino não zera pendências nem diz Você está em dia. Link resolvido abre
estado atual, sem refazer comando antigo.

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

Referência do protótipo: notify. Sem captura real ou aceite humano de
interface futura nesta C.

EVOLUIR central e CTA por tipo; separar visto de ciência e de confirmação
física.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-001;C-AC-003;C-AC-014;C-AC-020;C-AC-023;C-AC-049;C-AC-064;C-AC-073;C-AC-083;C-AC-084;C-AC-086;C-AC-087;C-AC-088;C-AC-089;C-AC-090;C-AC-091;C-AC-092;C-AC-093;C-AC-094;C-AC-095;C-AC-096;C-AC-097;C-AC-098;C-AC-099;C-AC-113;C-AC-115;C-NEW-AC-001;C-NEW-AC-002;C-NEW-AC-003;C-NEW-AC-026;C7-AC-008;C7-AC-012;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
