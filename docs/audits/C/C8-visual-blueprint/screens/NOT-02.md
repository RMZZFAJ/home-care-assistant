# NOT-02 — Preferências e aparelhos

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Preferências próprias por aparelho e por obrigação elegível; SCI-005 permanece
invariável em leitura.

Finalidade: Preferências e aparelhos.

Titular escolhe seus avisos e modalidades permitidas pela administração
familiar; não concede capacidade a si próprio.

AS_IS/rota: /perfil seção notificações, nova extensão.

## 4–14. Campos, modos de interação e validação

Permissão do navegador e regra SCI-005. Token/endpoint/segredos de inscrição
ficam internos, sem campo copiável ao usuário comum.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-135-01 — Ativar push neste aparelho

**Modo/componente:** EDITABLE / PUSH_PERMISSION_ACTION.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sem permissão presumida; ação explícita por
aparelho; negado não gera pedidos repetidos.

**Máscara/apresentação:** Ação Ativar neste aparelho abre a permissão oficial;
negada/indisponível/ativa têm estados separados. Autocomplete: off.

**Validação:** Após gesto do usuário, HTTPS e capacidade detectada; Somente no
subestado de preparação autorizado indicado na ficha; resumo/decisão posterior
é leitura.

**Ajuda/exemplo:** “Avisos podem aparecer na tela bloqueada.”

**Mensagem e condição:** “A permissão de notificações deste aparelho ainda não
foi confirmada. Consulte a permissão do navegador e tente Ativar novamente
quando ela estiver disponível. Seus avisos continuam acessíveis no
aplicativo.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-136-01 — Nome do aparelho

**Modo/componente:** EDITABLE / TEXT_INPUT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Não, descrição segura.

**Máscara/apresentação:** Texto legível sem máscara artificial;
contador/limite específico junto ao campo. Autocomplete: off.

**Validação:** Proposta 1–80; não provar identidade pelo user-agent; Somente
no subestado de preparação autorizado indicado na ficha; resumo/decisão
posterior é leitura.

**Ajuda/exemplo:** “Meu celular de trabalho.”

**Mensagem e condição:** “Confira nome do aparelho e o limite indicado.
Corrija somente esta informação; os demais valores preenchidos foram
preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-137-01 — Inscrição e permissão

**Modo/componente:** INTERNAL / NO_USER_CONTROL.

**Quando/ator:** Endpoint/chave/token de inscrição nunca renderizados ao
usuário comum.

**Obrigatoriedade/inicial:** Não renderizar controle.

**Máscara/apresentação:** NÃO APLICÁVEL. Autocomplete: NÃO APLICÁVEL.

**Validação:** Somente contrato interno, com validação no servidor; não expor
segredo/UUID como decisão do usuário.

**Ajuda/exemplo:** Permitida/negada/indisponível/expirada são estados
diferentes.

**Acessibilidade:** Não inserir campo escondido na ordem de foco, texto
acessível ou mensagem para o usuário comum.

### CTRL-138-01 — Conteúdo na tela bloqueada

**Modo/componente:** EDITABLE / RADIO_OR_SELECT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Default proposto genérico.

**Máscara/apresentação:** Opções do domínio rotuladas; escolha material
explícita, sem concordância presumida. Autocomplete: off.

**Validação:** Sem nome do paciente/material/quantidade no push inicial;
Somente no subestado de preparação autorizado indicado na ficha;
resumo/decisão posterior é leitura.

**Ajuda/exemplo:** “Há uma atualização no Home Care Assistant.”

**Mensagem e condição:** “Escolha uma opção válida para conteúdo na tela
bloqueada no escopo desta tarefa. Se a opção necessária não estiver
disponível, volte ou procure a administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-140-01 — Modalidade de ciência

**Modo/componente:** EDITABLE_SUBFORM / SCOPED_SCIENCE_PREFERENCES.

**Quando/ator:** Manual/dialogada/tácita só por obrigação elegível, com
consentimento prospectivo; nenhuma opção desliga SCI-005.

**Obrigatoriedade/inicial:** Manual/dialogada/tácita por obrigação elegível;
tácita sem opt-in implícito; SCI-005 fora das opções.

**Máscara/apresentação:** Por obrigação elegível: manual, diálogo antes de
abrir ou tácita por preferência expressa anterior; SCI-005 apenas aviso
invariável. Autocomplete: off.

**Validação:** Preferência anterior expressa e política permitem tácita; ANY
familiar permanente; escolha prospectiva com versão, nunca desativa SCI-005;
Manual/dialogada/tácita só por obrigação elegível, com consentimento
prospectivo; nenhuma opção desliga SCI-005.

**Ajuda/exemplo:** Tocar aviso só abre destino autenticado.

**Mensagem e condição:** “Escolha uma opção válida para modalidade de ciência
no escopo desta tarefa. Se a opção necessária não estiver disponível, volte ou
procure a administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-C8-005 — Ciência obrigatória pela expedição

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Consulta do valor de origem; mudanças só no processo
legitimamente responsável.

**Obrigatoriedade/inicial:** Regra permanente, independente de preferências;
nenhum toggle, checkbox de desligamento ou override.

**Máscara/apresentação:** Aviso permanente de regra, em texto, sem campo ou
controle de desativação. Autocomplete: NÃO APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Consulta do valor de
origem; mudanças só no processo legitimamente responsável.

**Ajuda/exemplo:** Expedir a entrega vinculada registra a ciência do
responsável familiar autorizado que realiza a expedição. Isso não confirma
recebimento ou consumo.

**Mensagem e condição:** “Não foi possível carregar a informação “Ciência
obrigatória pela expedição”. Atualize esta seção. O dado registrado não pode
ser alterado aqui.” — SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

## 15–18. Hierarquia, ações, consequências e mensagens

Aparelho/permissão → opt-in de push por gesto → privacidade de tela bloqueada
→ ciência por obrigação elegível → salvar escolha expressa prospectiva.

Seções independentes, cada uma com ação e feedback próprios;
segurança/contatos separados de preferências de transporte/ciência.

Primária: **Ativar avisos neste aparelho**. Secundárias: Desativar neste
aparelho; Abrir preferências de ciência.

Efeito: Permissão do navegador é transporte, não ato material.

Sucesso/resultado: “Preferência salva para o escopo indicado. Ela não altera
ciências anteriores nem permite desativar a ciência pela expedição.”

Vazio/inelegível: “Este aparelho ainda não recebe avisos. Você pode consultar
todas as tarefas dentro do aplicativo.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Informação indisponível não recebe valor inventado; bloquear somente ação que
depende dela, preservando consultas e encaminhamentos autorizados.

Permissão negada oferece orientação sem insistência. Tácita exige opção
anterior expressa; cancelar alteração conserva preferência anterior.

Leitura falha repete consulta da seção. Escrita incerta consulta a mesma
intenção antes de novo comando. Recusa comprovada, confirmado, conflito e
incerto têm resultados distintos; nenhuma mensagem presume que nada ocorreu.

Voltar conserva contexto/edição permitidos e devolve foco ao acionador. Depois
de resultado confirmado, abrir o alvo/resultado existente, sem repetir o ato.

## 21–24. Móvel, acessibilidade, referência e negócio

Uma coluna de seções; abrir uma não move o foco para outra; ações de
sessão/aparelho com alvo legível.

Feedback anunciado apenas para a seção acionada; OTP/senha não aparecem em
histórico/rascunho; estado validado não depende só de badge.

Identidade aprovada: teal/papel claro, tipografia hierárquica, bordas suaves,
cards e barra de contexto. Prioridade da tarefa e regras de autorização
governam o layout; exemplos do protótipo não são controles obrigatórios.

Referência do protótipo: notify/science. Sem captura real ou aceite humano de
interface futura nesta C.

RECONSTRUIR preferências por obrigação e separar transporte de ciência; nenhum
toggle SCI-005.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-001;C-AC-003;C-AC-014;C-AC-020;C-AC-023;C-AC-049;C-AC-064;C-AC-073;C-AC-083;C-AC-084;C-AC-086;C-AC-087;C-AC-088;C-AC-089;C-AC-090;C-AC-091;C-AC-092;C-AC-093;C-AC-094;C-AC-095;C-AC-096;C-AC-097;C-AC-098;C-AC-099;C-AC-113;C-AC-115;C-NEW-AC-001;C-NEW-AC-002;C-NEW-AC-003;C-NEW-AC-026;C7-AC-008;C7-AC-012;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025;C-FINAL-AC-001;C-FINAL-AC-002;C-FINAL-AC-003;C-FINAL-AC-011.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
