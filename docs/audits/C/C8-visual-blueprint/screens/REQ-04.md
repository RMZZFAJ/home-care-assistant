# REQ-04 — Declarar ciência

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Ciência pessoal elegível ainda não registrada para o conteúdo emitido; diálogo
antes de abrir somente na modalidade aprovada correspondente.

Finalidade: Declarar ciência.

Identidade autenticada habilitada pela administração familiar, vínculo e
req.science vigentes; nenhum cliente escolhe outra pessoa.

AS_IS/rota: Diálogo de ciência, novo contrato.

## 4–14. Campos, modos de interação e validação

Tipo, conteúdo de referência, modalidade e regra vigente. Alterar preferência
pertence ao perfil; o diálogo não edita policy nem a REQ.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-012-01 — Modalidade de ciência

**Modo/componente:** READ_ONLY / POLICY_DESCRIPTION.

**Quando/ator:** Modalidade/política aplicada ao diálogo; alteração de
preferência em ID-02/NOT-02.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Descrição rotulada do registro específico, sem
input, identificador de transporte ou valor inventado. Autocomplete: NÃO
APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Modalidade/política
aplicada ao diálogo; alteração de preferência em ID-02/NOT-02.

**Ajuda/exemplo:** Informação do registro indicado, somente para consulta
nesta etapa. Ausência de dado histórico permanece explicitamente identificada.

**Mensagem e condição:** “Não foi possível carregar a informação “Modalidade
de ciência”. Atualize esta seção. O dado registrado não pode ser alterado
aqui.” — SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

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

## 15–18. Hierarquia, ações, consequências e mensagens

Tipo/referência mínima autorizada → modalidade vigente em leitura → efeito da
declaração → Confirmar ciência e abrir / Voltar sem registrar.

Diálogo rotulado curto com identidade-alvo, efeito e ações específicas; não
reaproveitar formulário de criação.

Primária: **Confirmar ciência e abrir**. Secundárias: Voltar sem registrar;
Consultar política de ciência.

Efeito: Só confirmação elegível registra ciência; não comprova leitura
integral nem recebimento.

Sucesso/resultado: “Sua ciência foi registrada. Isso não confirma leitura
integral ou recebimento de materiais.”

Vazio/inelegível: “Sua ciência já consta para este conteúdo. Você pode
consultar o documento e seu histórico.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Sem referência material, modalidade/regra ou elegibilidade verificáveis, não
oferecer confirmar ciência. Voltar/cancelar permanece sem efeito; não adotar
modalidade default por falha de leitura.

Recusa/cancelamento não registra ciência ou acesso fictício. Se registro foi
confirmado e abertura falhou, informar ambas as etapas e oferecer Abrir
documento sem repetir ciência.

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

Referência do protótipo: notify/science. Sem captura real ou aceite humano de
interface futura nesta C.

RECONSTRUIR: substituir exibição do cabeçalho por confirmação anterior à
abertura; não reutilizar IntersectionObserver como aceite.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-025;C-AC-026;C-AC-036;C-AC-041;C-AC-049;C-AC-073;C-AC-089;C-AC-105;C-NEW-AC-003;C-NEW-AC-004;C-NEW-AC-024;C-NEW-AC-028;C7-AC-012;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025;C-FINAL-AC-001;C-FINAL-AC-002;C-FINAL-AC-003;C-FINAL-AC-009;C-FINAL-AC-010;C-FINAL-AC-024.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
