# ESC-01 — Consultar escala

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Consulta de escala em mês/semana/dia ou lista; seleção de datas é estado local
de navegação.

Finalidade: Consultar escala.

Profissional consulta seu alcance; gestor consulta equipe conforme capacidade,
sem revelar outro paciente em conflito.

AS_IS/rota: /escalas calendário/lista, atual a alterar.

## 4–14. Campos, modos de interação e validação

Fuso configurado, pessoas e intervalos publicados. Consulta não altera
preferência de fuso ou comprova presença.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-060-01 — Fuso

**Modo/componente:** READ_ONLY / TIMEZONE_DESCRIPTION.

**Quando/ator:** Fuso de referência configurado, não altera publicação ao
navegar.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Nome da zona IANA e horário/offset da proposta ou
período selecionado. Autocomplete: NÃO APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Fuso de referência
configurado, não altera publicação ao navegar.

**Ajuda/exemplo:** Fuso de referência dos horários exibidos; não muda porque
seu aparelho usa outro fuso.

**Mensagem e condição:** “Não foi possível carregar a informação “Fuso”.
Atualize esta seção. O dado registrado não pode ser alterado aqui.” —
SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-062-01 — Dias selecionados

**Modo/componente:** FILTER / MULTI_DATE_CALENDAR_WITH_LIST.

**Quando/ator:** Seleção local de dia/período; não publica nem altera série.

**Obrigatoriedade/inicial:** Sem restrição adicional inicialmente, salvo
filtro de tarefa explicitamente indicado no link; vazio limpa filtro, não cria
zero ou estado material.

**Máscara/apresentação:** Calendário de seleção múltipla e alternativa por
lista DD/MM/AAAA; seleções de vários meses preservadas. Autocomplete: off.

**Validação:** Filtro tipado da seção/tarefa, com valores permitidos e escopo
autorizados; não aceitar um enum universal para processos distintos; datas em
DD/MM/AAAA na apresentação e limites de consulta validados; manter filtros ao
voltar.

**Ajuda/exemplo:** Escolha dias em vários meses. A lista de datas selecionadas
permanece visível e permite remover um dia por vez.

**Mensagem e condição:** “Confira o filtro e o período indicados. A consulta
pode ser atualizada sem alterar nenhum registro.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

## 15–18. Hierarquia, ações, consequências e mensagens

Período e fuso de referência → grade e alternativa lista → plantão selecionado
→ pessoa/intervalo/estado → ação autorizada.

Mês/semana/dia com intervalo explícito; grade e lista acessível equivalentes;
seleção e detalhe sem trocar o contexto.

Primária: **Programar plantões**. Secundárias: Hoje; Período anterior/próximo;
Alternar lista.

Efeito: Consulta não comprova presença.

Sucesso/resultado: “Período consultado. Escala indica programação, não
presença ou recebimento de material.”

Vazio/inelegível: “Não há plantões no período selecionado. Mude o período ou
programe plantões se tiver autorização.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Informação indisponível não recebe valor inventado; bloquear somente ação que
depende dela, preservando consultas e encaminhamentos autorizados.

Erro não desenha mês vazio. Preservar período e seleção; buscar intervalo
longo por páginas sem mudar Mês para Dia silenciosamente.

Leitura falha repete consulta da seção. Escrita incerta consulta a mesma
intenção antes de novo comando. Recusa comprovada, confirmado, conflito e
incerto têm resultados distintos; nenhuma mensagem presume que nada ocorreu.

Voltar conserva contexto/edição permitidos e devolve foco ao acionador. Depois
de resultado confirmado, abrir o alvo/resultado existente, sem repetir o ato.

## 21–24. Móvel, acessibilidade, referência e negócio

Mês preserva intervalo ou seletor identifica a alternativa; lista permite
todas as tarefas; datas selecionadas continuam disponíveis entre meses.

Grade com navegação de teclado e nomes de datas completos; alternativa lista
obrigatória; seleção não pressupõe presença.

Identidade aprovada: teal/papel claro, tipografia hierárquica, bordas suaves,
cards e barra de contexto. Prioridade da tarefa e regras de autorização
governam o layout; exemplos do protótipo não são controles obrigatórios.

Referência do protótipo: schedule. Sem captura real ou aceite humano de
interface futura nesta C.

RECONSTRUIR calendário móvel se perder intervalo, seleção ou alternativa
acessível em lista.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-001;C-AC-009;C-AC-013;C-AC-039;C-AC-051;C-AC-057;C-AC-086;C-NEW-AC-011;C-NEW-AC-015;C-NEW-AC-021;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
