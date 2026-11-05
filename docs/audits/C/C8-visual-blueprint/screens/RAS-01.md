# RAS-01 — Continuar edição privada

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Resumo privado de edição encontrada; escolher continuar ou descartar e iniciar
nova.

Finalidade: Continuar edição privada.

Titular no paciente/tipo/intenção corretos; um draft de criação por
usuário/paciente/tipo.

AS_IS/rota: Retomada em cada formulário, novo contrato durável.

## 4–14. Campos, modos de interação e validação

Conteúdo, etapa e versões-base no diálogo. Continuar abre o formulário de
origem; não editar JSON ou texto serializado no resumo.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-125-01 — Tipo do rascunho

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

**Mensagem e condição:** “Não foi possível carregar a informação “Tipo do
rascunho”. Atualize esta seção. O dado registrado não pode ser alterado aqui.”
— SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-125-02 — Alvo e intenção

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

**Mensagem e condição:** “Não foi possível carregar a informação “Alvo e
intenção”. Atualize esta seção. O dado registrado não pode ser alterado aqui.”
— SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-126-01 — Conteúdo da edição

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Consulta do valor de origem; mudanças só no processo
legitimamente responsável.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Resumo estruturado por campo, sem JSON/payload
editável. Autocomplete: NÃO APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Consulta do valor de
origem; mudanças só no processo legitimamente responsável.

**Ajuda/exemplo:** Confira o conteúdo salvo; para alterá-lo, continue no
formulário de origem.

**Mensagem e condição:** “Não foi possível carregar a informação “Conteúdo da
edição”. Atualize esta seção. O dado registrado não pode ser alterado aqui.” —
SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-126-02 — Etapa atual

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Consulta do valor de origem; mudanças só no processo
legitimamente responsável.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Nome humano da etapa salva, com ação de continuar.
Autocomplete: NÃO APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Consulta do valor de
origem; mudanças só no processo legitimamente responsável.

**Ajuda/exemplo:** A etapa mostra onde continuar o preenchimento; ela não é um
texto para editar.

**Mensagem e condição:** “Não foi possível carregar a informação “Etapa
atual”. Atualize esta seção. O dado registrado não pode ser alterado aqui.” —
SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-127-01 — Versão documental base

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

**Mensagem e condição:** “Não foi possível carregar a informação “Versão
documental base”. Atualize esta seção. O dado registrado não pode ser alterado
aqui.” — SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-127-02 — Revisão do ledger base

**Modo/componente:** INTERNAL / NO_USER_CONTROL.

**Quando/ator:** Dado de comando/transporte; nunca input ou identificador
técnico exigido ao usuário.

**Obrigatoriedade/inicial:** Não renderizar controle.

**Máscara/apresentação:** NÃO APLICÁVEL. Autocomplete: NÃO APLICÁVEL.

**Validação:** Somente contrato interno, com validação no servidor; não expor
segredo/UUID como decisão do usuário.

**Ajuda/exemplo:** “A entrega mudou desde ontem. Revise antes de continuar.”

**Acessibilidade:** Não inserir campo escondido na ordem de foco, texto
acessível ou mensagem para o usuário comum.

### CTRL-127-03 — Versão da política base

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
política base”. Atualize esta seção. O dado registrado não pode ser alterado
aqui.” — SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-128-01 — Salvo em

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

**Mensagem e condição:** “Não foi possível carregar a informação “Salvo em”.
Atualize esta seção. O dado registrado não pode ser alterado aqui.” —
SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-128-02 — Revisão do rascunho

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

**Mensagem e condição:** “Não foi possível carregar a informação “Revisão do
rascunho”. Atualize esta seção. O dado registrado não pode ser alterado aqui.”
— SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-129-01 — Escolha na retomada

**Modo/componente:** EXPLICIT_ACTION / RESUME_OR_DISCARD_BUTTONS.

**Quando/ator:** Continuar, descartar e começar nova ou voltar; nenhuma
destrutiva preselecionada.

**Obrigatoriedade/inicial:** Sem concordância material inicial ou clique
automático.

**Máscara/apresentação:** Botão/ação com nome de consequência; sem campo
textual de aceite. Autocomplete: NÃO APLICÁVEL.

**Validação:** Descartar não elimina documento emitido ou ato confirmado;
Continuar, descartar e começar nova ou voltar; nenhuma destrutiva
preselecionada.

**Ajuda/exemplo:** Continuar rascunho ou Descartar e começar nova; um por
usuário/paciente/tipo de criação e por alvo contextual P12.

**Mensagem e condição:** “Esta ação não está disponível no estado atual.
Consulte o resultado ou volte à tarefa; nenhuma confirmação será presumida.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Botão com verbo/alvo/efeito; confirmação por
teclado/touch; foco retorna ao resumo, sem aria-invalid em texto de leitura.

### CTRL-C7-020 — Confirmar descarte somente do rascunho

**Modo/componente:** EXPLICIT_ACTION / SCOPED_DESTRUCTIVE_CONFIRMATION.

**Quando/ator:** Somente após escolha de descartar; confirma exatamente draft
privado/versão.

**Obrigatoriedade/inicial:** Sem concordância material inicial ou clique
automático.

**Máscara/apresentação:** Botão/ação com nome de consequência; sem campo
textual de aceite. Autocomplete: NÃO APLICÁVEL.

**Validação:** Escopo privado/tipo/alvo e versão; sem apagar documentos, ready
ou preservação obrigatória; Somente após escolha de descartar; confirma
exatamente draft privado/versão.

**Ajuda/exemplo:** Sem opção destrutiva default

**Mensagem e condição:** “Esta ação não está disponível no estado atual.
Consulte o resultado ou volte à tarefa; nenhuma confirmação será presumida.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Botão com verbo/alvo/efeito; confirmação por
teclado/touch; foco retorna ao resumo, sem aria-invalid em texto de leitura.

## 15–18. Hierarquia, ações, consequências e mensagens

Tipo/paciente/alvo → resumo e etapa salva → instante confirmado → Continuar /
Descartar e começar nova / Voltar.

Resumo ou comparação de versões com tipo/paciente/intenção e instantes; ações
não destrutivas antes do descarte.

Primária: **Continuar rascunho**. Secundárias: Descartar e começar nova;
Voltar.

Efeito: Descarta só edição elegível; nenhuma emissão oficial por save.

Sucesso/resultado: “Rascunho aberto no formulário de origem. Nenhum documento
foi emitido ou estoque alterado.”

Vazio/inelegível: “Nenhum rascunho deste tipo foi encontrado. Você pode
iniciar um novo preenchimento.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Informação indisponível não recebe valor inventado; bloquear somente ação que
depende dela, preservando consultas e encaminhamentos autorizados.

Descarte exige intenção/versão do draft e não apaga documento oficial, anexo
pronto ou prova preservada. Não confundir REQ ao iniciar BAL.

Leitura falha repete consulta da seção. Escrita incerta consulta a mesma
intenção antes de novo comando. Recusa comprovada, confirmado, conflito e
incerto têm resultados distintos; nenhuma mensagem presume que nada ocorreu.

Voltar conserva contexto/edição permitidos e devolve foco ao acionador. Depois
de resultado confirmado, abrir o alvo/resultado existente, sem repetir o ato.

## 21–24. Móvel, acessibilidade, referência e negócio

Versões empilhadas por campo; cópia manual mantém valor legível; descarte não
é ação primária preselecionada.

Diferenças em texto, escolha por teclado e foco de retorno ao formulário; não
expor JSON serializado como campo de edição.

Identidade aprovada: teal/papel claro, tipografia hierárquica, bordas suaves,
cards e barra de contexto. Prioridade da tarefa e regras de autorização
governam o layout; exemplos do protótipo não são controles obrigatórios.

Referência do protótipo: req/draft. Sem captura real ou aceite humano de
interface futura nesta C.

RECONSTRUIR resumo: conteúdo/etapa automáticos não são textareas editáveis.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-017;C-AC-032;C-AC-052;C-AC-070;C-AC-080;C-AC-107;C-AC-110;C-AC-116;C-NEW-AC-013;C-NEW-AC-014;C-NEW-AC-019;C7-AC-004;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025;C-FINAL-AC-005;C-FINAL-AC-017.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
