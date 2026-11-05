# GUI-03 — Regularizar contingência

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Dossiê de contingência e conciliação de fato físico já ocorrido, com dados
conhecidos e desconhecidos explícitos.

Finalidade: Regularizar contingência.

Família/admin competente e participantes legítimos; conciliador identificado
não se apresenta como recebedor ausente.

AS_IS/rota: Contingência física e conciliação, processo a homologar.

## 4–14. Campos, modos de interação e validação

Paciente do contexto, registro anterior e dados históricos. Autor de registro
digital e autor do fato físico são identidades distintas.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-166-01 — Fato físico

**Modo/componente:** EDITABLE / TEXTAREA.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sim em contingência.

**Máscara/apresentação:** Relato textual do fato físico com quebras de linha;
pessoas, data, material e quantidade possuem campos próprios. Autocomplete:
off.

**Validação:** REQ/COM/ENT/BAL/consumo não intercambiáveis; Somente no
subestado de preparação autorizado indicado na ficha; resumo/decisão posterior
é leitura.

**Ajuda/exemplo:** Descreva o fato físico conhecido, por exemplo entrega de
duas unidades. Diga o que permanece desconhecido sem presumir confirmação
alheia.

**Mensagem e condição:** “Confira fato físico e o limite indicado. Corrija
somente esta informação; os demais valores preenchidos foram preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-166-02 — Tipo de processo

**Modo/componente:** EDITABLE / RADIO_OR_SELECT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sim em contingência.

**Máscara/apresentação:** Opções do domínio rotuladas; escolha material
explícita, sem concordância presumida. Autocomplete: off.

**Validação:** REQ/COM/ENT/BAL/consumo não intercambiáveis; Somente no
subestado de preparação autorizado indicado na ficha; resumo/decisão posterior
é leitura.

**Ajuda/exemplo:** “Recebimento parcial de entrega.”

**Mensagem e condição:** “Escolha uma opção válida para tipo de processo no
escopo desta tarefa. Se a opção necessária não estiver disponível, volte ou
procure a administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-167-01 — Paciente

**Modo/componente:** READ_ONLY / PATIENT_DESCRIPTION.

**Quando/ator:** Paciente do contexto autorizado; trocar contexto é ação
própria fora do dossiê.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Nome da residência/paciente do contexto autorizado,
sem UUID digitável. Autocomplete: NÃO APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Paciente do contexto
autorizado; trocar contexto é ação própria fora do dossiê.

**Ajuda/exemplo:** Confira a residência desta tarefa. Trocar contexto é uma
ação separada e exige acesso autorizado.

**Mensagem e condição:** “Não foi possível carregar a informação “Paciente”.
Atualize esta seção. O dado registrado não pode ser alterado aqui.” —
SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-167-02 — Referência conhecida

**Modo/componente:** EDITABLE / TEXT_INPUT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sim quando conhecida.

**Máscara/apresentação:** Texto legível sem máscara artificial;
contador/limite específico junto ao campo. Autocomplete: off.

**Validação:** Desconhecido declarado; não criar UUID fictício; Somente no
subestado de preparação autorizado indicado na ficha; resumo/decisão posterior
é leitura.

**Ajuda/exemplo:** Protocolo do papel/documento relacionado.

**Mensagem e condição:** “Confira referência conhecida e o limite indicado.
Corrija somente esta informação; os demais valores preenchidos foram
preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-168-01 — Data do fato

**Modo/componente:** EDITABLE / DATE_INPUT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Conhecida ou desconhecido explícito.

**Máscara/apresentação:** Data DD/MM/AAAA na apresentação, sem conversão
silenciosa de fuso; limites do período visíveis. Autocomplete: off.

**Validação:** Não substituir pela data de digitação; Somente no subestado de
preparação autorizado indicado na ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Separar registro posterior de fato anterior.

**Mensagem e condição:** “Confira a data e o período desta tarefa. A data
final deve respeitar o início e o alcance apresentados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-168-02 — Hora do fato

**Modo/componente:** EDITABLE / TIME_INPUT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Conhecida ou desconhecido explícito.

**Máscara/apresentação:** Horário HH:mm com data e fuso da tarefa; término no
dia seguinte explicitado quando aplicável. Autocomplete: off.

**Validação:** Não substituir pela data de digitação; Somente no subestado de
preparação autorizado indicado na ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Separar registro posterior de fato anterior.

**Mensagem e condição:** “Informe um horário válido e confira a data de
término, inclusive quando houver virada de dia.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-168-03 — Fuso do fato

**Modo/componente:** EDITABLE / SEARCHABLE_TIMEZONE.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Conhecida ou desconhecido explícito.

**Máscara/apresentação:** Nome da zona IANA, por exemplo America/Sao_Paulo;
offset do período quando relevante. Autocomplete: off.

**Validação:** Não substituir pela data de digitação; Somente no subestado de
preparação autorizado indicado na ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Separar registro posterior de fato anterior.

**Mensagem e condição:** “Escolha o fuso de referência da tarefa. O fuso do
aparelho não será adotado silenciosamente.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-169-01 — Pessoa que realizou

**Modo/componente:** EDITABLE / PERSON_REFERENCE_WITH_UNKNOWN.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Conforme fato.

**Máscara/apresentação:** Nome/vínculo da pessoa efetiva ou Desconhecido
explícito; declarar fato não atribui autoria digital ou aceite. Autocomplete:
off.

**Validação:** Pessoa real do fato quando conhecida; selecionar vínculo ou
informar referência histórica, sem transferir autoria digital; Somente no
subestado de preparação autorizado indicado na ficha; resumo/decisão posterior
é leitura.

**Ajuda/exemplo:** Assinatura física tem origem própria.

**Mensagem e condição:** “Escolha uma opção válida para pessoa que realizou no
escopo desta tarefa. Se a opção necessária não estiver disponível, volte ou
procure a administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-169-02 — Pessoa que recebeu

**Modo/componente:** EDITABLE / PERSON_REFERENCE_WITH_UNKNOWN.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Conforme fato.

**Máscara/apresentação:** Nome/vínculo da pessoa efetiva ou Desconhecido
explícito; declarar fato não atribui autoria digital ou aceite. Autocomplete:
off.

**Validação:** Recebedor efetivo quando conhecido; nome informado não equivale
a aceite pessoal no app; Somente no subestado de preparação autorizado
indicado na ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Assinatura física tem origem própria.

**Mensagem e condição:** “Escolha uma opção válida para pessoa que recebeu no
escopo desta tarefa. Se a opção necessária não estiver disponível, volte ou
procure a administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-170-01 — Material

**Modo/componente:** EDITABLE / SEARCHABLE_COMBOBOX.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Quando movimento/conferência.

**Máscara/apresentação:** Busca por nome/alias e seleção de resultado
autorizado; nenhum identificador técnico digitado. Autocomplete: off.

**Validação:** Distinguir zero, desconhecido, expedição e aceite; Somente no
subestado de preparação autorizado indicado na ficha; resumo/decisão posterior
é leitura.

**Ajuda/exemplo:** Não somar previsão ao saldo real.

**Mensagem e condição:** “Escolha uma opção válida para material no escopo
desta tarefa. Se a opção necessária não estiver disponível, volte ou procure a
administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-170-02 — Unidade

**Modo/componente:** READ_ONLY / UNIT_DESCRIPTION.

**Quando/ator:** Unidade do material selecionado; unidade desconhecida é fato
a esclarecer, não conversão livre.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Nome completo e unidade da origem, com quebra de
linha sem corte. Autocomplete: NÃO APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Unidade do material
selecionado; unidade desconhecida é fato a esclarecer, não conversão livre.

**Ajuda/exemplo:** Identificação do item registrado. A consulta não substitui
o material ou reinterpreta sua unidade.

**Mensagem e condição:** “Não foi possível carregar a informação “Unidade”.
Atualize esta seção. O dado registrado não pode ser alterado aqui.” —
SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-170-03 — Quantidade física

**Modo/componente:** EDITABLE / DECIMAL_TEXT_INPUT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Quando movimento/conferência.

**Máscara/apresentação:** Quantidade textual exata com unidade; vírgula/ponto,
inputmode decimal e precisão explícita antes da coerção. Autocomplete: off.

**Validação:** Distinguir zero, desconhecido, expedição e aceite; Somente no
subestado de preparação autorizado indicado na ficha; resumo/decisão posterior
é leitura.

**Ajuda/exemplo:** Não somar previsão ao saldo real.

**Mensagem e condição:** “Informe quantidade física na unidade indicada e com
a precisão permitida. O campo precisa de correção antes de confirmar.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-170-04 — Custódia

**Modo/componente:** EDITABLE / CUSTODY_SELECT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Quando movimento/conferência.

**Máscara/apresentação:** Custódia por nome e tipo; escolha explícita entre as
permitidas para o fato informado. Autocomplete: off.

**Validação:** Custódia real permitida ao processo; origem/destino e trânsito
não são texto livre; Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Não somar previsão ao saldo real.

**Mensagem e condição:** “Escolha uma opção válida para custódia no escopo
desta tarefa. Se a opção necessária não estiver disponível, volte ou procure a
administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-171-01 — Ressalva

**Modo/componente:** EDITABLE / TEXTAREA.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Quando relevante.

**Máscara/apresentação:** Texto com quebras de linha; limite e contador do
campo visíveis, sem máscara de seleção. Autocomplete: off.

**Validação:** Preservar original/derivado e privacidade; Somente no subestado
de preparação autorizado indicado na ficha; resumo/decisão posterior é
leitura.

**Ajuda/exemplo:** A foto não prova sozinha que o fato ocorreu.

**Mensagem e condição:** “Confira ressalva e o limite indicado. Corrija
somente esta informação; os demais valores preenchidos foram preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-171-02 — Evidência física

**Modo/componente:** EDITABLE / FILE_PICKER.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Quando relevante.

**Máscara/apresentação:** Seletor de arquivo com MIME/tamanho permitido antes
do envio; nome legível, progresso e recuperação por tentativa. Autocomplete:
off.

**Validação:** Preservar original/derivado e privacidade; Somente no subestado
de preparação autorizado indicado na ficha; resumo/decisão posterior é
leitura.

**Ajuda/exemplo:** A foto não prova sozinha que o fato ocorreu.

**Mensagem e condição:** “Confira o formato e o limite de arquivo indicados.
Se já iniciou um envio sem resultado, consulte aquela tentativa antes de
escolher outro arquivo.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-172-01 — Conciliador

**Modo/componente:** AUTO_FILLED / ACTOR_DESCRIPTION.

**Quando/ator:** Conciliador é a sessão autenticada; não escolher outra pessoa
como autor digital.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Nome da pessoa e papel no ato, conforme registro
histórico; sem token ou ID de sessão. Autocomplete: NÃO APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Conciliador é a sessão
autenticada; não escolher outra pessoa como autor digital.

**Ajuda/exemplo:** Identifica quem realizou o ato e quando ele foi registrado.
Não permite escolher outra pessoa como autora.

**Mensagem e condição:** “Não foi possível carregar a informação
“Conciliador”. Atualize esta seção. O dado registrado não pode ser alterado
aqui.” — SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-172-02 — Decisão

**Modo/componente:** EDITABLE / RADIO_OR_SELECT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Ao retornar ao app.

**Máscara/apresentação:** Opções do domínio rotuladas; escolha material
explícita, sem concordância presumida. Autocomplete: off.

**Validação:** Dupla conferência conforme P05; chave do fato físico; Somente
no subestado de preparação autorizado indicado na ficha; resumo/decisão
posterior é leitura.

**Ajuda/exemplo:** Conciliador não se passa pelo recebedor.

**Mensagem e condição:** “Escolha uma opção válida para decisão no escopo
desta tarefa. Se a opção necessária não estiver disponível, volte ou procure a
administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-C7-017 — Motivo e base da regularização

**Modo/componente:** EDITABLE / TEXTAREA.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Motivo/base da regularização obrigatórios; pessoa
e fato conhecidos ou desconhecidos explicitamente separados.

**Máscara/apresentação:** Texto com quebras de linha; limite e contador do
campo visíveis, sem máscara de seleção. Autocomplete: off.

**Validação:** Fato, motivo excepcional, autoridade, medidas, ressalvas e
evidências; Somente no subestado de preparação autorizado indicado na ficha;
resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Sem inventar declaração pessoal

**Mensagem e condição:** “Confira motivo e base da regularização e o limite
indicado. Corrija somente esta informação; os demais valores preenchidos foram
preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-C7-018 — Comunicar envolvidos com segurança

**Modo/componente:** EDITABLE / CHECKLIST.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Checklist de comunicações legítimas pertinentes
ao caso; registrar estado real, não marcar envio não realizado.

**Máscara/apresentação:** Uma comunicação legítima por linha, com pessoa/canal
e estado real; pendente/tentado/enviado/lido distintos. Autocomplete: off.

**Validação:** Pessoa/canal/base legítima; proporcional, inclusive desligado
quando cabível; Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Tentativa não comprova leitura/recebimento

**Mensagem e condição:** “Escolha uma opção válida para comunicar envolvidos
com segurança no escopo desta tarefa. Se a opção necessária não estiver
disponível, volte ou procure a administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

## 15–18. Hierarquia, ações, consequências e mensagens

Contexto fixo/tipo → fato físico/data/hora/fuso → pessoas efetivas →
material/unidade/quantidade/custódia → prova → comparar registro existente →
regularizar.

Seções de fato, pessoas, prova e conciliação com referências históricas ao
lado; desconhecidos visíveis antes de concluir.

Primária: **Revisar regularização**. Secundárias: Anexar registro físico;
Consultar origem; Voltar.

Efeito: Não duplica ledger nem atribui aceite a pessoa ausente.

Sucesso/resultado: “Regularização registrada com suas referências e autoria. O
procedimento não simula assinatura pessoal de quem não confirmou no
aplicativo.”

Vazio/inelegível: “Nenhum fato de contingência selecionado. Reúna o registro
físico e consulte possíveis documentos já existentes.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Pode guardar dossiê com desconhecidos explícitos, mas não postar
movimento/aceite com material, quantidade ou pessoa presumidos. Regularizar
exige os fatos/autoridade pertinentes.

Fato já digitalizado é vinculado sem novo crédito/débito. Informação
desconhecida permanece assim; exigir responsável e revisão proporcional P05
para o caso crítico.

Leitura falha repete consulta da seção. Escrita incerta consulta a mesma
intenção antes de novo comando. Recusa comprovada, confirmado, conflito e
incerto têm resultados distintos; nenhuma mensagem presume que nada ocorreu.

Voltar conserva contexto/edição permitidos e devolve foco ao acionador. Depois
de resultado confirmado, abrir o alvo/resultado existente, sem repetir o ato.

## 21–24. Móvel, acessibilidade, referência e negócio

Uma coluna por ordem cronológica; datas/fuso próximos; prova com descrição e
alternativa textual; resumo antes da decisão.

Agrupar fatos conhecidos/desconhecidos; anexos têm estado próprio; revisão
proporcional não solicita assinatura em nome de pessoa ausente.

Identidade aprovada: teal/papel claro, tipografia hierárquica, bordas suaves,
cards e barra de contexto. Prioridade da tarefa e regras de autorização
governam o layout; exemplos do protótipo não são controles obrigatórios.

Referência do protótipo: SEM_EQUIVALENTE_NO_HTML. Sem captura real ou aceite
humano de interface futura nesta C.

RECONSTRUIR conciliação/importação para distinguir declaração física,
conferência e registro posterior.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-002;C-AC-003;C-AC-004;C-AC-006;C-AC-007;C-AC-008;C-AC-040;C-AC-062;C-AC-063;C-AC-112;C-AC-114;C-AC-115;C-AC-117;C-AC-118;C-AC-119;C-AC-120;C-AC-121;C-NEW-AC-026;C-NEW-AC-027;C7-AC-002;C7-AC-006;C7-AC-007;C7-AC-008;C7-AC-009;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025;C-FINAL-AC-019.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
