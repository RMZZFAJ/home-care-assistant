# NOT-03 — Definir regras de avisos

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Regra administrativa de aviso por evento/categoria; proposta pendente não é
configuração vigente.

Finalidade: Definir regras de avisos.

Admin competente por paciente; destinatários precisam vínculo/capacidade e
canal habilitado legitimamente.

AS_IS/rota: /configuracoes regras, atual a alterar.

## 4–14. Campos, modos de interação e validação

Obrigação interna e regras obrigatórias de ciência. Prazo não contratado
aparece a definir, sem número de SLA inventado.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-131-01 — Categoria

**Modo/componente:** EDITABLE / EVENT_CATEGORY_SELECT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sim por evento.

**Máscara/apresentação:** Categorias humanas do catálogo de eventos e
destinatários; canal não altera obrigação ou ciência. Autocomplete: off.

**Validação:** Não elevar todo evento a essencial; Somente no subestado de
preparação autorizado indicado na ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** “Apoio: há uma conferência pendente.”

**Mensagem e condição:** “Escolha uma opção válida para categoria no escopo
desta tarefa. Se a opção necessária não estiver disponível, volte ou procure a
administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-132-01 — Tipo de obrigação

**Modo/componente:** EDITABLE / SEARCHABLE_COMBOBOX.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sim na regra.

**Máscara/apresentação:** Busca por nome/alias e seleção de resultado
autorizado; nenhum identificador técnico digitado. Autocomplete: off.

**Validação:** Matriz de eventos e ações autorizadas; Somente no subestado de
preparação autorizado indicado na ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Recebimento, decisão, prazo e informação têm consequências
diferentes.

**Mensagem e condição:** “Escolha uma opção válida para tipo de obrigação no
escopo desta tarefa. Se a opção necessária não estiver disponível, volte ou
procure a administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-133-01 — Destinatários

**Modo/componente:** EDITABLE / SEARCHABLE_COMBOBOX.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sim quando regra habilitada.

**Máscara/apresentação:** Busca por nome/alias e seleção de resultado
autorizado; nenhum identificador técnico digitado. Autocomplete: off.

**Validação:** Revalidar vínculo/capacidade; sem autoridade por
telefone/escala isolados; Somente no subestado de preparação autorizado
indicado na ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** “Pessoa que deve conferir esta entrega.”

**Mensagem e condição:** “Escolha uma opção válida para destinatários no
escopo desta tarefa. Se a opção necessária não estiver disponível, volte ou
procure a administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-134-01 — Canal interno

**Modo/componente:** INTERNAL / NO_USER_CONTROL.

**Quando/ator:** Dado de comando/transporte; nunca input ou identificador
técnico exigido ao usuário.

**Obrigatoriedade/inicial:** Não renderizar controle.

**Máscara/apresentação:** NÃO APLICÁVEL. Autocomplete: NÃO APLICÁVEL.

**Validação:** Somente contrato interno, com validação no servidor; não expor
segredo/UUID como decisão do usuário.

**Ajuda/exemplo:** “Consulte suas pendências no aplicativo.”

**Acessibilidade:** Não inserir campo escondido na ordem de foco, texto
acessível ou mensagem para o usuário comum.

### CTRL-139-01 — Prazo/escalonamento

**Modo/componente:** EDITABLE / DURATION_AND_ESCALATION_FIELDS.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Valor previamente aprovado/configurado ou A
definir; nenhum SLA/custo inventado.

**Máscara/apresentação:** Duração numérica com unidade, responsável e
escalonamento em campos separados; valor não aprovado aparece A definir.
Autocomplete: off.

**Validação:** Sem SLO inventado; considerar fuso e responsabilidade; Somente
no subestado de preparação autorizado indicado na ficha; resumo/decisão
posterior é leitura.

**Ajuda/exemplo:** Aviso essencial não garante chegada no prazo.

**Mensagem e condição:** “Confira a duração e sua unidade. Um prazo ainda não
aprovado permanece A definir; não substitua esse estado por um número
presumido.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

## 15–18. Hierarquia, ações, consequências e mensagens

Evento/finalidade → destinatários/canal permitido → prazo configurado quando
existente → impacto/antes-depois → salvar/propor.

Regras agrupadas por finalidade, atual/proposta lado a lado e invariáveis em
texto; editor tipado pelo tipo de regra.

Primária: **Salvar regra exibida**. Secundárias: Comparar proposta; Voltar.

Efeito: Regra não atribui ato físico nem autoridade de outro papel.

Sucesso/resultado: “Regra registrada no estado apresentado. Proposta que
aguarda aprovação ainda não substitui a regra vigente.”

Vazio/inelegível: “Selecione um evento para consultar sua regra. Ausência de
canal externo não elimina a tarefa interna.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Informação indisponível não recebe valor inventado; bloquear somente ação que
depende dela, preservando consultas e encaminhamentos autorizados.

Tipo desconhecido não aprova JSON opaco. Falha mantém regra anterior e
proposta distinta; Meta/Flows continuam postergados.

Leitura falha repete consulta da seção. Escrita incerta consulta a mesma
intenção antes de novo comando. Recusa comprovada, confirmado, conflito e
incerto têm resultados distintos; nenhuma mensagem presume que nada ocorreu.

Voltar conserva contexto/edição permitidos e devolve foco ao acionador. Depois
de resultado confirmado, abrir o alvo/resultado existente, sem repetir o ato.

## 21–24. Móvel, acessibilidade, referência e negócio

Blocos de regra com antes/depois empilhados; não exigir leitura de JSON;
resumo e próxima autoridade junto à ação.

Grupos e opções nomeados por obrigação; indisponível tem motivo; SCI-005 não
possui input desabilitado que sugira futura opção de desligamento.

Identidade aprovada: teal/papel claro, tipografia hierárquica, bordas suaves,
cards e barra de contexto. Prioridade da tarefa e regras de autorização
governam o layout; exemplos do protótipo não são controles obrigatórios.

Referência do protótipo: notify. Sem captura real ou aceite humano de
interface futura nesta C.

RECONSTRUIR matriz por finalidade se campos genéricos permitirem desligar
obrigação ou autoridade familiar.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-001;C-AC-003;C-AC-014;C-AC-020;C-AC-023;C-AC-049;C-AC-064;C-AC-073;C-AC-083;C-AC-084;C-AC-086;C-AC-087;C-AC-088;C-AC-089;C-AC-090;C-AC-091;C-AC-092;C-AC-093;C-AC-094;C-AC-095;C-AC-096;C-AC-097;C-AC-098;C-AC-099;C-AC-113;C-AC-115;C-NEW-AC-001;C-NEW-AC-002;C-NEW-AC-003;C-NEW-AC-026;C7-AC-008;C7-AC-012;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
