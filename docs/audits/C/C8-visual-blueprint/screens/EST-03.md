# EST-03 — Consultar origem de movimento

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Consulta de movimentos paginados e abertura da origem exata, sem reexecutar
atos.

Finalidade: Consultar origem de movimento.

Leitor autorizado à custódia e, separadamente, ao documento de origem; link
não concede nova leitura.

AS_IS/rota: Histórico de movimentos, atual a alterar.

## 4–14. Campos, modos de interação e validação

Quantidades, referências, nomes/unidades históricas. Filtros são os únicos
campos de consulta editáveis.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-080-01 — Tipo ou origem do movimento

**Modo/componente:** FILTER / FILTER_SELECT.

**Quando/ator:** Apenas consulta no escopo permitido; não altera documento,
movimento ou autoridade.

**Obrigatoriedade/inicial:** Sem restrição adicional inicialmente, salvo
filtro de tarefa explicitamente indicado no link; vazio limpa filtro, não cria
zero ou estado material.

**Máscara/apresentação:** Opções do domínio consultado e Todas quando
permitido; mudar filtro não é decisão material. Autocomplete: off.

**Validação:** Filtro tipado da seção/tarefa, com valores permitidos e escopo
autorizados; não aceitar um enum universal para processos distintos; datas em
DD/MM/AAAA na apresentação e limites de consulta validados; manter filtros ao
voltar.

**Ajuda/exemplo:** “Movimentos de novembro; há páginas anteriores.”

**Mensagem e condição:** “Confira o filtro e o período indicados. A consulta
pode ser atualizada sem alterar nenhum registro.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-080-02 — Data inicial

**Modo/componente:** FILTER / DATE_INPUT.

**Quando/ator:** Apenas consulta no escopo permitido; não altera documento,
movimento ou autoridade.

**Obrigatoriedade/inicial:** Sem restrição adicional inicialmente, salvo
filtro de tarefa explicitamente indicado no link; vazio limpa filtro, não cria
zero ou estado material.

**Máscara/apresentação:** Data DD/MM/AAAA na apresentação, sem conversão
silenciosa de fuso; limites do período visíveis. Autocomplete: off.

**Validação:** Filtro tipado da seção/tarefa, com valores permitidos e escopo
autorizados; não aceitar um enum universal para processos distintos; datas em
DD/MM/AAAA na apresentação e limites de consulta validados; manter filtros ao
voltar.

**Ajuda/exemplo:** “Movimentos de novembro; há páginas anteriores.”

**Mensagem e condição:** “Confira o filtro e o período indicados. A consulta
pode ser atualizada sem alterar nenhum registro.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-080-03 — Data final

**Modo/componente:** FILTER / DATE_INPUT.

**Quando/ator:** Apenas consulta no escopo permitido; não altera documento,
movimento ou autoridade.

**Obrigatoriedade/inicial:** Sem restrição adicional inicialmente, salvo
filtro de tarefa explicitamente indicado no link; vazio limpa filtro, não cria
zero ou estado material.

**Máscara/apresentação:** Data DD/MM/AAAA na apresentação, sem conversão
silenciosa de fuso; limites do período visíveis. Autocomplete: off.

**Validação:** Filtro tipado da seção/tarefa, com valores permitidos e escopo
autorizados; não aceitar um enum universal para processos distintos; datas em
DD/MM/AAAA na apresentação e limites de consulta validados; manter filtros ao
voltar.

**Ajuda/exemplo:** “Movimentos de novembro; há páginas anteriores.”

**Mensagem e condição:** “Confira o filtro e o período indicados. A consulta
pode ser atualizada sem alterar nenhum registro.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

## 15–18. Hierarquia, ações, consequências e mensagens

Filtro de tipo/data → movimentos com autor/quantidade/unidade → origem tipada
→ detalhe → retorno aos mesmos filtros.

Filtros por domínio e tabela/lista com tipo, instante, autor e origem; detalhe
com retorno à mesma consulta.

Primária: **Abrir origem autorizada**. Secundárias: Anterior/próxima página;
Limpar filtro.

Efeito: Link não concede acesso novo.

Sucesso/resultado: “Origem aberta no acesso permitido. Nenhum movimento foi
repetido.”

Vazio/inelegível: “Nenhum movimento neste filtro. Consulte outro período ou
limpe os filtros.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Informação indisponível não recebe valor inventado; bloquear somente ação que
depende dela, preservando consultas e encaminhamentos autorizados.

Origem restrita é explicada sem inventar outro documento. purchase_receipt
abre parcela correspondente, não usa seu ID como documentId.

Leitura falha repete consulta da seção. Escrita incerta consulta a mesma
intenção antes de novo comando. Recusa comprovada, confirmado, conflito e
incerto têm resultados distintos; nenhuma mensagem presume que nada ocorreu.

Voltar conserva contexto/edição permitidos e devolve foco ao acionador. Depois
de resultado confirmado, abrir o alvo/resultado existente, sem repetir o ato.

## 21–24. Móvel, acessibilidade, referência e negócio

Cartões com rótulos completos; paginação e busca de referência fora dos
recentes; nada depende de tooltip para interpretar origem.

Tabela semântica ou lista equivalente; carregar mais não perde foco; total
desconhecido não é anunciado como zero.

Identidade aprovada: teal/papel claro, tipografia hierárquica, bordas suaves,
cards e barra de contexto. Prioridade da tarefa e regras de autorização
governam o layout; exemplos do protótipo não são controles obrigatórios.

Referência do protótipo: stock/docs. Sem captura real ou aceite humano de
interface futura nesta C.

EVOLUIR navegação e paginação; reconstruir resolvedor tipado de origem em D.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-010;C-AC-021;C-AC-022;C-AC-045;C-AC-046;C-AC-053;C-AC-066;C-AC-068;C-AC-072;C-AC-074;C-AC-120;C-NEW-AC-008;C-NEW-AC-009;C-NEW-AC-015;C-NEW-AC-023;C-NEW-AC-025;C7-AC-010;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
