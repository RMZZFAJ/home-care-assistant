# REQ-03 — Consultar requisição

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

REQ emitida, em atendimento, concluída, arquivada ou cancelada; dimensões
apresentadas separadamente.

Finalidade: Consultar requisição.

Leitura por req.read; ciência pessoal somente por pessoa familiar habilitada.
Nova necessidade requer capacidade própria de requisitar.

AS_IS/rota: /historico/:id, atual a alterar.

## 4–14. Campos, modos de interação e validação

Conteúdo original, quantidades observadas, autores, atendimento e ciências.
Motivo só se abre o subfluxo de NOVA necessidade vinculada.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-001-01 — Paciente

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Consulta do valor de origem; mudanças só no processo
legitimamente responsável.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Nome da residência/paciente do contexto autorizado,
sem UUID digitável. Autocomplete: NÃO APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Consulta do valor de
origem; mudanças só no processo legitimamente responsável.

**Ajuda/exemplo:** Confira a residência desta tarefa. Trocar contexto é uma
ação separada e exige acesso autorizado.

**Mensagem e condição:** “Não foi possível carregar a informação “Paciente”.
Atualize esta seção. O dado registrado não pode ser alterado aqui.” —
SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-011-01 — Motivo de necessidade remanescente

**Modo/componente:** EDITABLE_SUBFORM / TEXTAREA.

**Quando/ator:** Somente ao preparar NOVA REQ remanescente vinculada; conteúdo
emitido permanece imutável.

**Obrigatoriedade/inicial:** Sim ao abrir nova necessidade vinculada.

**Máscara/apresentação:** Texto com quebras de linha; limite e contador do
campo visíveis, sem máscara de seleção. Autocomplete: off.

**Validação:** 3–1000; sem quantidade solicitada; Somente ao preparar NOVA REQ
remanescente vinculada; conteúdo emitido permanece imutável.

**Ajuda/exemplo:** “O material entregue não encerrou a necessidade.”

**Mensagem e condição:** “Confira motivo de necessidade remanescente e o
limite indicado. Corrija somente esta informação; os demais valores
preenchidos foram preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-013-01 — Versão e intenção

**Modo/componente:** INTERNAL / NO_USER_CONTROL.

**Quando/ator:** Dado de comando/transporte; nunca input ou identificador
técnico exigido ao usuário.

**Obrigatoriedade/inicial:** Não renderizar controle.

**Máscara/apresentação:** NÃO APLICÁVEL. Autocomplete: NÃO APLICÁVEL.

**Validação:** Somente contrato interno, com validação no servidor; não expor
segredo/UUID como decisão do usuário.

**Ajuda/exemplo:** Não pedir UUID ao usuário.

**Acessibilidade:** Não inserir campo escondido na ordem de foco, texto
acessível ou mensagem para o usuário comum.

### CTRL-C8-003 — Minha ciência

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Consulta do valor de origem; mudanças só no processo
legitimamente responsável.

**Obrigatoriedade/inicial:** Resultado pessoal da identidade autenticada para
o conteúdo material emitido.

**Máscara/apresentação:** Pendente ou registrada, com modalidade e instante da
própria pessoa. Autocomplete: NÃO APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Consulta do valor de
origem; mudanças só no processo legitimamente responsável.

**Ajuda/exemplo:** Outra pessoa pode ter satisfeito a obrigação familiar. Aqui
aparece somente a sua ciência pessoal.

**Mensagem e condição:** “Não foi possível carregar a informação “Minha
ciência”. Atualize esta seção. O dado registrado não pode ser alterado aqui.”
— SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-C8-004 — Ciência da família

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Consulta do valor de origem; mudanças só no processo
legitimamente responsável.

**Obrigatoriedade/inicial:** Agregado calculado; ANY entre pessoas familiares
autorizadas.

**Máscara/apresentação:** Família ciente ou Pendente, acompanhado do evento
que satisfaz a obrigação. Autocomplete: NÃO APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Consulta do valor de
origem; mudanças só no processo legitimamente responsável.

**Ajuda/exemplo:** Família ciente significa que uma pessoa habilitada já
registrou ciência válida deste conteúdo.

**Mensagem e condição:** “Não foi possível carregar a informação “Ciência da
família”. Atualize esta seção. O dado registrado não pode ser alterado aqui.”
— SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

## 15–18. Hierarquia, ações, consequências e mensagens

Identidade/estado → conteúdo emitido imutável → atendimento por linha → Minha
ciência/Família ciente → tarefas → história/anexos/emissões.

Identidade/estado no topo; conteúdo e atendimento no corpo principal; ciência,
tarefas e cronologia agrupadas por significado.

Primária: **Ver próxima ação autorizada**. Secundárias: Nova necessidade
remanescente; Histórico de emissões.

Efeito: Nova necessidade conserva vínculo e motivo; consulta não recebe
material.

Sucesso/resultado: “Documento consultado. Consultar não registra recebimento
nem altera o conteúdo da requisição.”

Vazio/inelegível: “Requisição não disponível neste acesso. Confira o endereço
ou volte ao histórico autorizado.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Informação indisponível não recebe valor inventado; bloquear somente ação que
depende dela, preservando consultas e encaminhamentos autorizados.

Falha de atendimento/ciência isola a seção; não transforma dados indisponíveis
em pendência nem apaga o conteúdo válido. Não reemitir para atualizar estado.

Leitura falha repete consulta da seção. Escrita incerta consulta a mesma
intenção antes de novo comando. Recusa comprovada, confirmado, conflito e
incerto têm resultados distintos; nenhuma mensagem presume que nada ocorreu.

Voltar conserva contexto/edição permitidos e devolve foco ao acionador. Depois
de resultado confirmado, abrir o alvo/resultado existente, sem repetir o ato.

## 21–24. Móvel, acessibilidade, referência e negócio

Seções na mesma ordem; indicadores pessoais/familiares separados; dados
extensos expandem sem perder o acionador.

Headings e listas descrevem documento; abas/expansores acessíveis; leitura não
recebe foco de erro de campo editável.

Identidade aprovada: teal/papel claro, tipografia hierárquica, bordas suaves,
cards e barra de contexto. Prioridade da tarefa e regras de autorização
governam o layout; exemplos do protótipo não são controles obrigatórios.

Referência do protótipo: docs. Sem captura real ou aceite humano de interface
futura nesta C.

RECONSTRUIR projeção para separar versão material, versão de eventos, ciência
familiar e atendimento.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-025;C-AC-026;C-AC-036;C-AC-041;C-AC-049;C-AC-073;C-AC-089;C-AC-105;C-NEW-AC-003;C-NEW-AC-004;C-NEW-AC-024;C-NEW-AC-028;C7-AC-012;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025;C-FINAL-AC-001;C-FINAL-AC-002;C-FINAL-AC-003;C-FINAL-AC-004;C-FINAL-AC-006;C-FINAL-AC-007;C-FINAL-AC-008;C-FINAL-AC-009;C-FINAL-AC-010;C-FINAL-AC-011;C-FINAL-AC-024.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
