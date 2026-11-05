# GUI-04 — Recuperar serviço com segurança

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Runbook de recuperação; orientação e checkpoints não disparam restore ou envio
automaticamente.

Finalidade: Recuperar serviço com segurança.

Titular/substituto/operador previamente designados e autorizados à operação;
acesso restrito a detalhes de recuperação.

AS_IS/rota: Incidente/continuidade, runbook planejado.

## 4–14. Campos, modos de interação e validação

Titular/substituto/prazos aprovados e estado dos checkpoints; não são
configurações editáveis por quem apenas consulta o procedimento.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-173-01 — Incidente/correlação

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Estado de consulta/revisão da tarefa; não herdar edição do
formulário de origem.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Descrição rotulada do registro específico, sem
input, identificador de transporte ou valor inventado. Autocomplete: NÃO
APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Estado de
consulta/revisão da tarefa; não herdar edição do formulário de origem.

**Ajuda/exemplo:** Informação do registro indicado, somente para consulta
nesta etapa. Ausência de dado histórico permanece explicitamente identificada.

**Mensagem e condição:** “Não foi possível carregar a informação
“Incidente/correlação”. Atualize esta seção. O dado registrado não pode ser
alterado aqui.” — SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-174-01 — Titular

**Modo/componente:** READ_ONLY / RESPONSIBLE_DESCRIPTION.

**Quando/ator:** Titular designado previamente; consulta do runbook não altera
governança.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Nome da pessoa e papel no ato, conforme registro
histórico; sem token ou ID de sessão. Autocomplete: NÃO APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Titular designado
previamente; consulta do runbook não altera governança.

**Ajuda/exemplo:** Identifica a pessoa relacionada a este ato; não permite
transferir sua autoria para quem consulta.

**Mensagem e condição:** “Não foi possível carregar a informação “Titular”.
Atualize esta seção. O dado registrado não pode ser alterado aqui.” —
SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-174-02 — Substituto

**Modo/componente:** READ_ONLY / RESPONSIBLE_DESCRIPTION.

**Quando/ator:** Substituto designado; sem nome fictício ou herança de sessão.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Nome da pessoa e papel no ato, conforme registro
histórico; sem token ou ID de sessão. Autocomplete: NÃO APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Substituto designado;
sem nome fictício ou herança de sessão.

**Ajuda/exemplo:** Identifica a pessoa relacionada a este ato; não permite
transferir sua autoria para quem consulta.

**Mensagem e condição:** “Não foi possível carregar a informação “Substituto”.
Atualize esta seção. O dado registrado não pode ser alterado aqui.” —
SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-174-03 — Prazo de resposta

**Modo/componente:** READ_ONLY / SERVICE_TARGET_DESCRIPTION.

**Quando/ator:** Prazo aprovado ou A definir; não digitar SLA durante
incidente.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Descrição rotulada do registro específico, sem
input, identificador de transporte ou valor inventado. Autocomplete: NÃO
APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Prazo aprovado ou A
definir; não digitar SLA durante incidente.

**Ajuda/exemplo:** Informação do registro indicado, somente para consulta
nesta etapa. Ausência de dado histórico permanece explicitamente identificada.

**Mensagem e condição:** “Não foi possível carregar a informação “Prazo de
resposta”. Atualize esta seção. O dado registrado não pode ser alterado aqui.”
— SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

## 15–18. Hierarquia, ações, consequências e mensagens

Impacto/correlação → responsável → cópia válida/conjuntos → quarentena →
checkpoints de ensaio/restore autorizado → reconciliação → aceite de retomada.

Impacto, responsáveis e checkpoints em ordem de recuperação; evidência e
quarentena antes de retomada, sem botão automático genérico.

Primária: **Abrir procedimento autorizado**. Secundárias: Acionar substituto;
Usar contingência; Preservar evidência.

Efeito: Nenhum restore/envio automático por botão genérico.

Sucesso/resultado: “Procedimento aberto. Execute apenas as etapas autorizadas
e registre as evidências antes da retomada.”

Vazio/inelegível: “Procedimento ou responsável ainda não definido. Use a
contingência e acione a administração; não improvise restore.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Informação indisponível não recebe valor inventado; bloquear somente ação que
depende dela, preservando consultas e encaminhamentos autorizados.

Falha em checkpoint conserva evidência e quarentena; não prometer RPO/RTO ou
retomada só por existir backup/TOC. Contratação externa pertence ao
responsável.

Leitura falha repete consulta da seção. Escrita incerta consulta a mesma
intenção antes de novo comando. Recusa comprovada, confirmado, conflito e
incerto têm resultados distintos; nenhuma mensagem presume que nada ocorreu.

Voltar conserva contexto/edição permitidos e devolve foco ao acionador. Depois
de resultado confirmado, abrir o alvo/resultado existente, sem repetir o ato.

## 21–24. Móvel, acessibilidade, referência e negócio

Lista de passos com estado, responsável e bloqueio; telefone/canal legítimo
legível sem copiar segredos.

Procedimento navegável por headings/listas; checkpoints não são caixas
previamente marcadas; consulta não autoriza operação remota.

Identidade aprovada: teal/papel claro, tipografia hierárquica, bordas suaves,
cards e barra de contexto. Prioridade da tarefa e regras de autorização
governam o layout; exemplos do protótipo não são controles obrigatórios.

Referência do protótipo: SEM_EQUIVALENTE_NO_HTML. Sem captura real ou aceite
humano de interface futura nesta C.

NOVO RUNBOOK: sem botão genérico de recuperar que modifique ambientes ou
reative jobs.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-002;C-AC-003;C-AC-004;C-AC-006;C-AC-007;C-AC-008;C-AC-040;C-AC-062;C-AC-063;C-AC-112;C-AC-114;C-AC-115;C-AC-117;C-AC-118;C-AC-119;C-AC-120;C-AC-121;C-NEW-AC-026;C-NEW-AC-027;C7-AC-002;C7-AC-006;C7-AC-007;C7-AC-008;C7-AC-009;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025;C-FINAL-AC-026.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
